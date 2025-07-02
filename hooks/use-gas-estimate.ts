"use client";

import { useMemo } from "react";
import { type Address, parseEther, parseUnits, zeroAddress } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import {
  UNISWAP_V2_ROUTER,
  UNISWAP_V2_ROUTER_ABI,
  WETH_ADDRESS,
} from "@/lib/constants";
import type { TokenData } from "@/types/token";
import { useXRPPrice } from "@/hooks/use-xrp-price";

// Fix JSON bigint encoding
//@ts-expect-error - fix
BigInt.prototype.toJSON = function () {
  return this.toString();
};

const DEFAULT_GAS_ESTIMATE = "~$0.10";

export function useGasEstimate(
  tokenFrom: TokenData | undefined,
  tokenTo: TokenData | undefined,
  amountFrom: string,
  amountTo: string,
) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { priceUSD: xrpPriceUsd } = useXRPPrice();

  // Create memoized contract params to ensure they update when tokens change
  const contractParams = useMemo(() => {
    if (
      !tokenFrom ||
      !tokenTo ||
      !amountFrom ||
      Number.parseFloat(amountFrom) <= 0
    )
      return null;

    const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20); // 20 minutes deadline
    const wethAddress = WETH_ADDRESS; // WXRP

    // Calculate slippage-adjusted minimum output (5% slippage)
    const slippageFactor = 0.95; // 5% slippage tolerance
    const amountOutMin = amountTo
      ? BigInt(
          Math.floor(
            Number(amountTo) * slippageFactor * 10 ** tokenTo.decimals,
          ),
        )
      : 0n;

    // Parse input amount with correct decimals
    const parsedAmountFrom = parseUnits(amountFrom, tokenFrom.decimals);

    if (tokenFrom.address === zeroAddress) {
      // XRP to Token
      return {
        address: UNISWAP_V2_ROUTER,
        abi: UNISWAP_V2_ROUTER_ABI,
        functionName: "swapExactETHForTokens",
        args: [
          amountOutMin > 0n ? amountOutMin : 1n, // Use calculated amount or 1 as fallback
          [wethAddress, tokenTo.address as Address],
          address || zeroAddress,
          deadline,
        ],
        value: parsedAmountFrom, // Use actual XRP amount
        account: address,
      } as const;
    }

    if (tokenTo.address === zeroAddress) {
      // Token to XRP
      return {
        address: UNISWAP_V2_ROUTER,
        abi: UNISWAP_V2_ROUTER_ABI,
        functionName: "swapExactTokensForETH",
        args: [
          parsedAmountFrom, // Use actual token amount
          amountOutMin > 0n ? amountOutMin : 1n, // Use calculated amount or 1 as fallback
          [tokenFrom.address as Address, wethAddress],
          address || zeroAddress,
          deadline,
        ],
        account: address,
      } as const;
    }

    // Token to Token
    return {
      address: UNISWAP_V2_ROUTER,
      abi: UNISWAP_V2_ROUTER_ABI,
      functionName: "swapExactTokensForTokens",
      args: [
        parsedAmountFrom, // Use actual token amount
        amountOutMin > 0n ? amountOutMin : 1n, // Use calculated amount or 1 as fallback
        [tokenFrom.address as Address, tokenTo.address as Address],
        address || zeroAddress,
        deadline,
      ],
      account: address,
    } as const;
  }, [
    tokenFrom,
    tokenTo,
    tokenFrom?.address,
    tokenFrom?.decimals,
    tokenTo?.address,
    tokenTo?.decimals,
    address,
    amountFrom,
    amountTo,
  ]);

  // Use TanStack Query to estimate gas
  const {
    data: gasEstimate,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["gasEstimate", contractParams, amountFrom],
    queryFn: async () => {
      if (!publicClient) throw new Error("Public client not available");
      if (!contractParams) throw new Error("Contract parameters not available");

      try {
        // Create a mutable copy of contract params for gas estimation
        const gasParams = {
          ...contractParams,
          args: [...contractParams.args] as readonly [any, ...any[]],
        };

        // First, check if we need to simulate getAmountsOut to get a better amountOutMin
        if (!amountTo || Number(amountTo) <= 0) {
          // This is a fallback if amountTo isn't provided
          const pathIndex =
            gasParams.functionName === "swapExactETHForTokens" ? 1 : 2;
          const path = gasParams.args[pathIndex] as readonly `0x${string}`[];
          const amountIn =
            gasParams.functionName === "swapExactETHForTokens"
              ? gasParams.value
              : gasParams.args[0];

          if (path && amountIn) {
            const amounts = await publicClient.readContract({
              address: UNISWAP_V2_ROUTER,
              abi: UNISWAP_V2_ROUTER_ABI,
              functionName: "getAmountsOut",
              args: [amountIn, path],
            });

            // Update amountOutMin with slippage
            if (amounts && amounts.length > 1) {
              const expectedOut = amounts[amounts.length - 1];
              const slippageAdjusted = (expectedOut * 95n) / 100n; // 5% slippage

              // Update the amountOutMin in the args
              const argsIndex =
                gasParams.functionName === "swapExactETHForTokens" ? 0 : 1;
              //@ts-expect-error readonly override
              gasParams.args[argsIndex] = slippageAdjusted;
            }
          }
        }

        // Now estimate gas with proper values
        const gasData =
          //@ts-expect-error - fix
          await publicClient.estimateContractGas(gasParams);

        // Calculate gas cost
        const gasLimit = gasData * 2n; // Double the gas limit for safety
        const gasPrice = await publicClient.getGasPrice();
        const gasCostXrp = Number(
          parseEther(((gasLimit * gasPrice) / 10n ** 18n).toString()),
        );
        const gasCostUsd = gasCostXrp * (xrpPriceUsd || 0);

        return `~$${gasCostUsd.toFixed(2)}`;
      } catch (err) {
        console.error("Gas estimation error:", err);
        return DEFAULT_GAS_ESTIMATE;
      }
    },
    enabled:
      !!address &&
      !!publicClient &&
      !!amountFrom &&
      Number.parseFloat(amountFrom) > 0 &&
      !!tokenFrom?.address &&
      !!tokenTo?.address &&
      tokenFrom.address !== tokenTo.address &&
      !!contractParams,
    staleTime: 30000, // 30 seconds
    retry: 1,
  });

  if (
    !tokenFrom ||
    !tokenTo ||
    !amountFrom ||
    Number.parseFloat(amountFrom) <= 0
  ) {
    return {
      gasEstimate: null,
      error: null,
    };
  }

  return {
    gasEstimate: gasEstimate || DEFAULT_GAS_ESTIMATE,
    isLoading,
    error: error ? (error as Error).message : null,
  };
}

// Specialized hook for estimating gas for add liquidity operations
export function useAddLiquidityGasEstimate(
  tokenA: TokenData | undefined,
  tokenB: TokenData | undefined,
  amountA: string,
  amountB: string,
) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { priceUSD: xrpPriceUsd } = useXRPPrice();

  const contractParams = useMemo(() => {
    if (
      !tokenA ||
      !tokenB ||
      !amountA ||
      !amountB ||
      Number.parseFloat(amountA) <= 0 ||
      Number.parseFloat(amountB) <= 0
    )
      return null;

    const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20); // 20 minutes
    const slippageFactor = 0.995; // 0.5% slippage

    // Parse amounts
    const parsedAmountA = parseUnits(amountA, tokenA.decimals ?? 18);
    const parsedAmountB = parseUnits(amountB, tokenB.decimals ?? 18);

    // Calculate minimum amounts with slippage
    const amountAMin = BigInt(
      Math.floor(Number(parsedAmountA) * slippageFactor),
    );
    const amountBMin = BigInt(
      Math.floor(Number(parsedAmountB) * slippageFactor),
    );

    // ETH + Token
    if (tokenA.address === zeroAddress || tokenB.address === zeroAddress) {
      const token = tokenA.address === zeroAddress ? tokenB : tokenA;
      const ethAmount =
        tokenA.address === zeroAddress ? parsedAmountA : parsedAmountB;
      const tokenAmount =
        tokenA.address === zeroAddress ? parsedAmountB : parsedAmountA;
      const tokenAmountMin =
        tokenA.address === zeroAddress ? amountBMin : amountAMin;
      const ethAmountMin =
        tokenA.address === zeroAddress ? amountAMin : amountBMin;

      return {
        address: UNISWAP_V2_ROUTER as `0x${string}`,
        abi: UNISWAP_V2_ROUTER_ABI,
        functionName: "addLiquidityETH",
        args: [
          token.address as `0x${string}`,
          tokenAmount,
          tokenAmountMin,
          ethAmountMin,
          address ?? zeroAddress,
          deadline,
        ],
        value: ethAmount,
        account: address,
      } as const;
    }
    // Token + Token

    return {
      address: UNISWAP_V2_ROUTER as `0x${string}`,
      abi: UNISWAP_V2_ROUTER_ABI,
      functionName: "addLiquidity",
      args: [
        tokenA.address as `0x${string}`,
        tokenB.address as `0x${string}`,
        parsedAmountA,
        parsedAmountB,
        amountAMin,
        amountBMin,
        address ?? zeroAddress,
        deadline,
      ],
      account: address,
    } as const;
  }, [tokenA, tokenB, amountA, amountB, address]);

  const {
    data: gasEstimate,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["addLiquidityGasEstimate", contractParams, amountA, amountB],
    queryFn: async () => {
      if (!publicClient) throw new Error("Public client not available");
      if (!contractParams) throw new Error("Contract parameters not available");

      try {
        // Estimate gas with proper values
        const gasData =
          //@ts-expect-error - fix
          await publicClient.estimateContractGas(contractParams);

        // Calculate gas cost - use a lower multiplier for more accurate estimation
        const gasLimit = (gasData * 12n) / 10n; // Add 20% buffer instead of doubling
        const gasPrice = await publicClient.getGasPrice();
        const gasCostXrp = Number(
          parseEther(((gasLimit * gasPrice) / 10n ** 18n).toString()),
        );
        const gasCostUsd = gasCostXrp * (xrpPriceUsd || 0);

        return `~$${gasCostUsd.toFixed(2)}`;
      } catch (err) {
        console.error("Gas estimation error:", err);
        return DEFAULT_GAS_ESTIMATE;
      }
    },
    enabled:
      !!address &&
      !!publicClient &&
      !!amountA &&
      !!amountB &&
      Number.parseFloat(amountA) > 0 &&
      Number.parseFloat(amountB) > 0 &&
      !!tokenA?.address &&
      !!tokenB?.address &&
      tokenA.address !== tokenB.address &&
      !!contractParams,
    staleTime: 30000, // 30 seconds
    retry: 1,
  });

  if (
    !tokenA ||
    !tokenB ||
    !amountA ||
    !amountB ||
    Number.parseFloat(amountA) <= 0 ||
    Number.parseFloat(amountB) <= 0
  ) {
    return {
      gasEstimate: null,
      isLoading: false,
      error: null,
    };
  }

  return {
    gasEstimate: gasEstimate || DEFAULT_GAS_ESTIMATE,
    isLoading,
    error: error ? (error as Error).message : null,
  };
}

// Specialized hook for estimating gas for remove liquidity operations
export function useRemoveLiquidityGasEstimate(
  tokenA: TokenData | undefined,
  tokenB: TokenData | undefined,
  lpTokenAmount: string,
  pairAddress: `0x${string}` | undefined,
) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { priceUSD: xrpPriceUsd } = useXRPPrice();

  const contractParams = useMemo(() => {
    if (
      !tokenA ||
      !tokenB ||
      !lpTokenAmount ||
      Number.parseFloat(lpTokenAmount) <= 0 ||
      !pairAddress ||
      pairAddress === zeroAddress
    )
      return null;

    const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20); // 20 minutes

    // Parse LP token amount
    const parsedLpAmount = parseUnits(lpTokenAmount, 18);

    // ETH + Token
    if (tokenA.address === zeroAddress || tokenB.address === zeroAddress) {
      const token = tokenA.address === zeroAddress ? tokenB : tokenA;

      return {
        address: UNISWAP_V2_ROUTER as `0x${string}`,
        abi: UNISWAP_V2_ROUTER_ABI,
        functionName: "removeLiquidityETH",
        args: [
          token.address as `0x${string}`,
          parsedLpAmount,
          0n, // amountTokenMin (with slippage)
          0n, // amountETHMin (with slippage)
          address ?? zeroAddress,
          deadline,
        ],
        account: address,
      } as const;
    }
    // Token + Token

    return {
      address: UNISWAP_V2_ROUTER as `0x${string}`,
      abi: UNISWAP_V2_ROUTER_ABI,
      functionName: "removeLiquidity",
      args: [
        tokenA.address as `0x${string}`,
        tokenB.address as `0x${string}`,
        parsedLpAmount,
        0n, // amountAMin (with slippage)
        0n, // amountBMin (with slippage)
        address ?? zeroAddress,
        deadline,
      ],
      account: address,
    } as const;
  }, [tokenA, tokenB, lpTokenAmount, pairAddress, address]);

  const {
    data: gasEstimate,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["removeLiquidityGasEstimate", contractParams, lpTokenAmount],
    queryFn: async () => {
      if (!publicClient) throw new Error("Public client not available");
      if (!contractParams) throw new Error("Contract parameters not available");

      try {
        // Estimate gas with proper values
        const gasData =
          //@ts-expect-error - fix
          await publicClient.estimateContractGas(contractParams);

        // Calculate gas cost - use a lower multiplier for more accurate estimation
        const gasLimit = (gasData * 12n) / 10n; // Add 20% buffer instead of doubling
        const gasPrice = await publicClient.getGasPrice();
        const gasCostXrp = Number(
          parseEther(((gasLimit * gasPrice) / 10n ** 18n).toString()),
        );
        const gasCostUsd = gasCostXrp * (xrpPriceUsd || 0);

        return `~$${gasCostUsd.toFixed(2)}`;
      } catch (err) {
        console.error("Gas estimation error:", err);
        return DEFAULT_GAS_ESTIMATE;
      }
    },
    enabled:
      !!address &&
      !!publicClient &&
      !!lpTokenAmount &&
      Number.parseFloat(lpTokenAmount) > 0 &&
      !!tokenA?.address &&
      !!tokenB?.address &&
      tokenA.address !== tokenB.address &&
      !!pairAddress &&
      pairAddress !== zeroAddress &&
      !!contractParams,
    staleTime: 30000, // 30 seconds
    retry: 1,
  });

  if (
    !tokenA ||
    !tokenB ||
    !lpTokenAmount ||
    Number.parseFloat(lpTokenAmount) <= 0 ||
    !pairAddress ||
    pairAddress === zeroAddress
  ) {
    return {
      gasEstimate: null,
      isLoading: false,
      error: null,
    };
  }

  return {
    gasEstimate: gasEstimate || DEFAULT_GAS_ESTIMATE,
    isLoading,
    error: error ? (error as Error).message : null,
  };
}
