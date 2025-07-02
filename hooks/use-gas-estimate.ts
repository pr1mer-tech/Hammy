"use client";

import { useMemo } from "react";
import {
  type Address,
  parseUnits,
  zeroAddress,
  formatEther,
  formatUnits,
} from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import {
  UNISWAP_V2_ROUTER,
  UNISWAP_V2_ROUTER_ABI,
  WETH_ADDRESS,
} from "@/lib/constants";
import type { TokenData } from "@/types/token";
import { sortTokens } from "@/lib/utils/sort-tokens";

// Fix JSON bigint encoding
if (typeof BigInt !== "undefined") {
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };
}

interface GasEstimateResult {
  gasEstimate: string | null;
  isLoading: boolean;
  error: string | null;
  willSucceed: boolean;
}

export function useGasEstimate(
  tokenFrom: TokenData | undefined,
  tokenTo: TokenData | undefined,
  amountFrom: string,
  amountTo: string,
): GasEstimateResult {
  const { address } = useAccount();
  const publicClient = usePublicClient();

  // First, create the path and fetch quote
  const { data: quoteData, isLoading: isQuoteLoading } = useQuery({
    queryKey: ["swapQuote", tokenFrom?.address, tokenTo?.address, amountFrom],
    queryFn: async () => {
      if (
        !publicClient ||
        !tokenFrom ||
        !tokenTo ||
        !amountFrom ||
        Number.parseFloat(amountFrom) <= 0
      ) {
        return null;
      }

      try {
        const parsedAmountFrom = parseUnits(amountFrom, tokenFrom.decimals);
        const wethAddress = WETH_ADDRESS;

        // Determine the path
        let path: Address[];

        if (tokenFrom.address === zeroAddress) {
          // XRP -> Token
          path = [wethAddress, tokenTo.address as Address];
        } else if (tokenTo.address === zeroAddress) {
          // Token -> XRP
          path = [tokenFrom.address as Address, wethAddress];
        } else {
          // Token -> Token
          // First try direct path
          try {
            const directPath = [
              tokenFrom.address as Address,
              tokenTo.address as Address,
            ];
            const directAmounts = await publicClient.readContract({
              address: UNISWAP_V2_ROUTER,
              abi: UNISWAP_V2_ROUTER_ABI,
              functionName: "getAmountsOut",
              args: [parsedAmountFrom, directPath],
            });

            if (directAmounts && directAmounts.length > 0) {
              path = directPath;
              return {
                path,
                amountIn: parsedAmountFrom,
                expectedAmountOut: directAmounts[directAmounts.length - 1],
              };
            }
          } catch {
            // Direct path doesn't exist
          }

          // Try through WETH
          path = [
            tokenFrom.address as Address,
            wethAddress,
            tokenTo.address as Address,
          ];
        }

        // Get amounts out
        const amounts = await publicClient.readContract({
          address: UNISWAP_V2_ROUTER,
          abi: UNISWAP_V2_ROUTER_ABI,
          functionName: "getAmountsOut",
          args: [parsedAmountFrom, path],
        });

        if (!amounts || amounts.length === 0) {
          throw new Error("No route available");
        }

        return {
          path,
          amountIn: parsedAmountFrom,
          expectedAmountOut: amounts[amounts.length - 1],
        };
      } catch (err) {
        throw new Error("Cannot find a valid swap route");
      }
    },
    enabled:
      !!publicClient &&
      !!tokenFrom &&
      !!tokenTo &&
      !!amountFrom &&
      Number.parseFloat(amountFrom) > 0,
    staleTime: 5000, // 5 seconds for quotes
  });

  // Then simulate and estimate gas with the quote
  const {
    data,
    isLoading: isGasLoading,
    error: queryError,
  } = useQuery({
    queryKey: [
      "gasEstimate",
      tokenFrom?.address,
      tokenTo?.address,
      amountFrom,
      quoteData?.expectedAmountOut?.toString(),
    ],
    queryFn: async () => {
      if (!publicClient || !address || !quoteData || !tokenFrom || !tokenTo) {
        throw new Error("Missing requirements");
      }

      const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20);

      // Calculate minimum out with 5% slippage
      const amountOutMin = (quoteData.expectedAmountOut * 95n) / 100n;

      let contractCall: any;

      if (tokenFrom.address === zeroAddress) {
        // XRP to Token
        contractCall = {
          address: UNISWAP_V2_ROUTER,
          abi: UNISWAP_V2_ROUTER_ABI,
          functionName: "swapExactETHForTokens",
          args: [amountOutMin, quoteData.path, address, deadline],
          value: quoteData.amountIn,
          account: address,
          from: address,
        };
      } else if (tokenTo.address === zeroAddress) {
        // Token to XRP
        contractCall = {
          address: UNISWAP_V2_ROUTER,
          abi: UNISWAP_V2_ROUTER_ABI,
          functionName: "swapExactTokensForETH",
          args: [
            quoteData.amountIn,
            amountOutMin,
            quoteData.path,
            address,
            deadline,
          ],
          account: address,
          from: address,
        };
      } else {
        // Token to Token
        contractCall = {
          address: UNISWAP_V2_ROUTER,
          abi: UNISWAP_V2_ROUTER_ABI,
          functionName: "swapExactTokensForTokens",
          args: [
            quoteData.amountIn,
            amountOutMin,
            quoteData.path,
            address,
            deadline,
          ],
          account: address,
          from: address,
        };
      }

      try {
        // For non-ETH swaps, check token approval first
        if (tokenFrom.address !== zeroAddress) {
          const allowance = await publicClient.readContract({
            address: tokenFrom.address as Address,
            abi: [
              {
                name: "allowance",
                type: "function",
                stateMutability: "view",
                inputs: [
                  { name: "owner", type: "address" },
                  { name: "spender", type: "address" },
                ],
                outputs: [{ name: "", type: "uint256" }],
              },
            ],
            functionName: "allowance",
            args: [address, UNISWAP_V2_ROUTER],
          });

          if (allowance < quoteData.amountIn) {
            throw new Error(
              `Insufficient ${tokenFrom.symbol} allowance. Please approve tokens first.`,
            );
          }
        }

        // Simulate the transaction
        const { result: simulationResult } =
          await publicClient.simulateContract(contractCall);

        // If simulation succeeds, estimate gas
        const gasEstimate =
          await publicClient.estimateContractGas(contractCall);

        // Get current gas price
        const gasPrice = await publicClient.getGasPrice();

        // Add 10% buffer to gas estimate
        const gasLimit = (gasEstimate * 110n) / 100n;

        // Calculate cost
        const gasCostWei = gasLimit * gasPrice;
        const gasCostXrp = formatEther(gasCostWei);
        const gasCostUsd = Number(gasCostXrp) * 0.5; // Rough XRP price

        return {
          success: true,
          gasLimit,
          gasPrice,
          gasCostXrp,
          gasCostUsd,
          estimateString: `~$${gasCostUsd.toFixed(3)}`,
          expectedAmountOut: formatUnits(
            quoteData.expectedAmountOut,
            tokenTo.decimals,
          ),
          minimumAmountOut: formatUnits(amountOutMin, tokenTo.decimals),
          path: quoteData.path,
        };
      } catch (err: any) {
        const errorMessage = err?.message || err?.toString() || "Unknown error";

        // Parse specific errors
        if (
          errorMessage.includes("Insufficient") &&
          errorMessage.includes("allowance")
        ) {
          throw new Error(errorMessage); // Use our custom allowance error
        }
        if (errorMessage.includes("INSUFFICIENT_OUTPUT_AMOUNT")) {
          throw new Error("Price moved unfavorably. Try refreshing the quote.");
        }
        if (errorMessage.includes("INSUFFICIENT_LIQUIDITY")) {
          throw new Error("Insufficient liquidity for this trade");
        }
        if (errorMessage.includes("INSUFFICIENT_INPUT_AMOUNT")) {
          throw new Error("Input amount too small");
        }
        if (errorMessage.includes("EXCESSIVE_INPUT_AMOUNT")) {
          throw new Error("Input amount too large for available liquidity");
        }
        if (errorMessage.includes("K")) {
          throw new Error("This trade would cause too much price impact");
        }
        if (errorMessage.includes("EXPIRED")) {
          throw new Error("Transaction deadline exceeded");
        }
        if (
          errorMessage.includes("insufficient funds") ||
          errorMessage.includes("exceeds balance")
        ) {
          const tokenSymbol =
            tokenFrom.address === zeroAddress ? "XRP" : tokenFrom.symbol;
          throw new Error(`Insufficient ${tokenSymbol} balance`);
        }
        if (errorMessage.includes("INVALID_PATH")) {
          throw new Error("Invalid trading path");
        }

        // Generic swap error
        throw new Error(`Swap will fail: ${errorMessage}`);
      }
    },
    enabled: !!quoteData && !!publicClient && !!address && !isQuoteLoading,
    staleTime: 10000,
    gcTime: 30000,
    retry: false,
  });

  // Handle states
  if (
    !tokenFrom ||
    !tokenTo ||
    !amountFrom ||
    Number.parseFloat(amountFrom) <= 0
  ) {
    return {
      gasEstimate: null,
      isLoading: false,
      error: null,
      willSucceed: false,
    };
  }

  const isLoading = isQuoteLoading || isGasLoading;

  if (queryError) {
    return {
      gasEstimate: null,
      isLoading: false,
      error: (queryError as Error).message,
      willSucceed: false,
    };
  }

  if (!quoteData && !isQuoteLoading) {
    return {
      gasEstimate: null,
      isLoading: false,
      error: "Cannot find a valid swap route",
      willSucceed: false,
    };
  }

  return {
    gasEstimate: data?.estimateString || null,
    isLoading,
    error: null,
    willSucceed: data?.success || false,
  };
}
// Updated Add Liquidity Gas Estimate
export function useAddLiquidityGasEstimate(
  tokenA: TokenData | undefined,
  tokenB: TokenData | undefined,
  amountA: string,
  amountB: string,
): GasEstimateResult {
  const { address } = useAccount();
  const publicClient = usePublicClient();

  const contractCall = useMemo(() => {
    if (
      !tokenA ||
      !tokenB ||
      !amountA ||
      !amountB ||
      Number.parseFloat(amountA) <= 0 ||
      Number.parseFloat(amountB) <= 0 ||
      !address
    ) {
      return null;
    }

    const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20);

    try {
      // Handle ETH pairs separately (don't sort for addLiquidityETH)
      if (tokenA.address === zeroAddress || tokenB.address === zeroAddress) {
        const token = tokenA.address === zeroAddress ? tokenB : tokenA;
        const ethAmount = tokenA.address === zeroAddress ? amountA : amountB;
        const tokenAmount = tokenA.address === zeroAddress ? amountB : amountA;

        const parsedEthAmount = parseUnits(ethAmount, 18);
        const parsedTokenAmount = parseUnits(tokenAmount, token.decimals);

        // 0.5% slippage
        const ethAmountMin = (parsedEthAmount * 995n) / 1000n;
        const tokenAmountMin = (parsedTokenAmount * 995n) / 1000n;

        return {
          address: UNISWAP_V2_ROUTER,
          abi: UNISWAP_V2_ROUTER_ABI,
          functionName: "addLiquidityETH",
          args: [
            token.address as Address,
            parsedTokenAmount,
            tokenAmountMin,
            ethAmountMin,
            address,
            deadline,
          ],
          value: parsedEthAmount,
          account: address,
          from: address,
        } as const;
      }

      // For token-token pairs, sort them
      const { token0, token1, amount0, amount1 } = sortTokens(
        tokenA,
        tokenB,
        amountA,
        amountB,
      );

      if (!token0 || !token1 || !amount0 || !amount1) {
        return null;
      }

      const parsedAmount0 = parseUnits(amount0, token0.decimals);
      const parsedAmount1 = parseUnits(amount1, token1.decimals);

      // 0.5% slippage
      const amount0Min = (parsedAmount0 * 995n) / 1000n;
      const amount1Min = (parsedAmount1 * 995n) / 1000n;

      return {
        address: UNISWAP_V2_ROUTER,
        abi: UNISWAP_V2_ROUTER_ABI,
        functionName: "addLiquidity",
        args: [
          token0.address as Address,
          token1.address as Address,
          parsedAmount0,
          parsedAmount1,
          amount0Min,
          amount1Min,
          address,
          deadline,
        ],
        account: address,
        from: address,
      } as const;
    } catch (err) {
      console.error("Failed to create add liquidity params:", err);
      return null;
    }
  }, [tokenA, tokenB, amountA, amountB, address]);

  const {
    data,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: [
      "addLiquidityGasEstimate",
      tokenA?.address,
      tokenB?.address,
      amountA,
      amountB,
    ],
    queryFn: async () => {
      if (!publicClient || !contractCall || !tokenA || !tokenB) {
        throw new Error("Missing requirements");
      }

      try {
        // Check allowances for both tokens
        for (const [token, amount] of [
          [tokenA, amountA],
          [tokenB, amountB],
        ] as const) {
          if (token.address !== zeroAddress) {
            const parsedAmount = parseUnits(amount, token.decimals);
            const allowance = await publicClient.readContract({
              address: token.address as Address,
              abi: [
                {
                  name: "allowance",
                  type: "function",
                  stateMutability: "view",
                  inputs: [
                    { name: "owner", type: "address" },
                    { name: "spender", type: "address" },
                  ],
                  outputs: [{ name: "", type: "uint256" }],
                },
              ],
              functionName: "allowance",
              args: [address!, UNISWAP_V2_ROUTER],
            });

            if (allowance < parsedAmount) {
              throw new Error(
                `Insufficient ${token.symbol} allowance. Please approve tokens first.`,
              );
            }
          }
        }

        // Simulate first
        const { result: simulationResult } =
          await publicClient.simulateContract(contractCall as any);

        // Estimate gas
        const gasEstimate = await publicClient.estimateContractGas(
          contractCall as any,
        );
        const gasPrice = await publicClient.getGasPrice();
        const gasLimit = (gasEstimate * 110n) / 100n;
        const gasCostWei = gasLimit * gasPrice;
        const gasCostXrp = formatEther(gasCostWei);
        const gasCostUsd = Number(gasCostXrp) * 0.5;

        return {
          success: true,
          gasLimit,
          gasPrice,
          gasCostXrp,
          gasCostUsd,
          estimateString: `~$${gasCostUsd.toFixed(3)}`,
          simulationResult,
        };
      } catch (err: any) {
        const errorMessage = err?.message || err?.toString() || "Unknown error";

        if (errorMessage.includes("INSUFFICIENT_LIQUIDITY")) {
          throw new Error("One of the tokens has insufficient liquidity");
        }
        if (errorMessage.includes("insufficient allowance")) {
          throw new Error(errorMessage); // Use our custom allowance error
        }
        if (errorMessage.includes("INSUFFICIENT_A_AMOUNT")) {
          throw new Error("Insufficient amount for first token");
        }
        if (errorMessage.includes("INSUFFICIENT_B_AMOUNT")) {
          throw new Error("Insufficient amount for second token");
        }
        if (errorMessage.includes("INVALID_RATIO")) {
          throw new Error("Token amounts don't match the current pool ratio");
        }

        throw new Error(`Transaction will fail: ${errorMessage}`);
      }
    },
    enabled: !!contractCall && !!publicClient && !!address,
    staleTime: 10000,
    gcTime: 30000,
    retry: false,
  });

  if (!contractCall) {
    return {
      gasEstimate: null,
      isLoading: false,
      error: null,
      willSucceed: false,
    };
  }

  if (queryError) {
    return {
      gasEstimate: null,
      isLoading: false,
      error: (queryError as Error).message,
      willSucceed: false,
    };
  }

  return {
    gasEstimate: data?.estimateString || null,
    isLoading,
    error: null,
    willSucceed: data?.success || false,
  };
}

// Also update Remove Liquidity to use sorted tokens
export function useRemoveLiquidityGasEstimate(
  tokenA: TokenData | undefined,
  tokenB: TokenData | undefined,
  lpTokenAmount: string,
  pairAddress: Address | undefined,
): GasEstimateResult {
  const { address } = useAccount();
  const publicClient = usePublicClient();

  const contractCall = useMemo(() => {
    if (
      !tokenA ||
      !tokenB ||
      !lpTokenAmount ||
      Number.parseFloat(lpTokenAmount) <= 0 ||
      !pairAddress ||
      pairAddress === zeroAddress ||
      !address
    ) {
      return null;
    }

    const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20);

    try {
      const parsedLpAmount = parseUnits(lpTokenAmount, 18);

      // Handle ETH pairs
      if (tokenA.address === zeroAddress || tokenB.address === zeroAddress) {
        const token = tokenA.address === zeroAddress ? tokenB : tokenA;

        return {
          address: UNISWAP_V2_ROUTER,
          abi: UNISWAP_V2_ROUTER_ABI,
          functionName: "removeLiquidityETH",
          args: [
            token.address as Address,
            parsedLpAmount,
            0n, // Accept any amount of token
            0n, // Accept any amount of ETH
            address,
            deadline,
          ],
          account: address,
          from: address,
        } as const;
      }

      // For token-token pairs, sort them
      const { token0, token1 } = sortTokens(tokenA, tokenB, "0", "0");

      return {
        address: UNISWAP_V2_ROUTER,
        abi: UNISWAP_V2_ROUTER_ABI,
        functionName: "removeLiquidity",
        args: [
          token0?.address as Address,
          token1?.address as Address,
          parsedLpAmount,
          0n, // Accept any amount of token0
          0n, // Accept any amount of token1
          address,
          deadline,
        ],
        account: address,
        from: address,
      } as const;
    } catch (err) {
      console.error("Failed to create remove liquidity params:", err);
      return null;
    }
  }, [tokenA, tokenB, lpTokenAmount, pairAddress, address]);

  // Rest of the function remains the same...
  const {
    data,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: [
      "removeLiquidityGasEstimate",
      tokenA?.address,
      tokenB?.address,
      lpTokenAmount,
    ],
    queryFn: async () => {
      if (!publicClient || !contractCall) {
        throw new Error("Missing requirements");
      }

      try {
        // Check LP token allowance
        if (pairAddress) {
          const parsedLpAmount = parseUnits(lpTokenAmount, 18);
          const allowance = await publicClient.readContract({
            address: pairAddress,
            abi: [
              {
                name: "allowance",
                type: "function",
                stateMutability: "view",
                inputs: [
                  { name: "owner", type: "address" },
                  { name: "spender", type: "address" },
                ],
                outputs: [{ name: "", type: "uint256" }],
              },
            ],
            functionName: "allowance",
            args: [address!, UNISWAP_V2_ROUTER],
          });

          if (allowance < parsedLpAmount) {
            throw new Error(
              "Insufficient LP token allowance. Please approve LP tokens first.",
            );
          }
        }

        // Simulate first
        const { result: simulationResult } =
          await publicClient.simulateContract(contractCall as any);

        // Estimate gas
        const gasEstimate = await publicClient.estimateContractGas(
          contractCall as any,
        );
        const gasPrice = await publicClient.getGasPrice();
        const gasLimit = (gasEstimate * 110n) / 100n;
        const gasCostWei = gasLimit * gasPrice;
        const gasCostXrp = formatEther(gasCostWei);
        const gasCostUsd = Number(gasCostXrp) * 0.5;

        return {
          success: true,
          gasLimit,
          gasPrice,
          gasCostXrp,
          gasCostUsd,
          estimateString: `~$${gasCostUsd.toFixed(3)}`,
          simulationResult,
        };
      } catch (err: any) {
        const errorMessage = err?.message || err?.toString() || "Unknown error";

        if (errorMessage.includes("INSUFFICIENT_LIQUIDITY")) {
          throw new Error("Insufficient liquidity in the pool");
        }
        if (errorMessage.includes("insufficient allowance")) {
          throw new Error(errorMessage);
        }
        if (errorMessage.includes("INVALID_SIGNATURE")) {
          throw new Error("Invalid permit signature");
        }

        throw new Error(`Transaction will fail: ${errorMessage}`);
      }
    },
    enabled: !!contractCall && !!publicClient && !!address,
    staleTime: 10000,
    gcTime: 30000,
    retry: false,
  });

  if (!contractCall) {
    return {
      gasEstimate: null,
      isLoading: false,
      error: null,
      willSucceed: false,
    };
  }

  if (queryError) {
    return {
      gasEstimate: null,
      isLoading: false,
      error: (queryError as Error).message,
      willSucceed: false,
    };
  }

  return {
    gasEstimate: data?.estimateString || null,
    isLoading,
    error: null,
    willSucceed: data?.success || false,
  };
}
