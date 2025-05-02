"use client";

import { useMemo } from "react";
import { type Address, parseEther, parseUnits, zeroAddress } from "viem";
import { useAccount, useBalance, usePublicClient } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import {
	UNISWAP_V2_ROUTER,
	UNISWAP_V2_ROUTER_ABI,
	WETH_ADDRESS,
} from "@/lib/constants";
import type { TokenData } from "@/types/token";

// Fix JSON bigint encoding
//@ts-expect-error - fix
BigInt.prototype.toJSON = function () {
	return this.toString();
};

export function useGasEstimate(
	tokenFrom: TokenData | undefined,
	tokenTo: TokenData | undefined,
	amountFrom: string,
	amountTo: string,
) {
	const { address, isConnected } = useAccount();
	const publicClient = usePublicClient();

	// Get ETH price in USD (simplified for demo)
	const ethPriceUsd = 3000; // In a real app, fetch this from an API

	// Get gas price
	const { data: ethBalance } = useBalance({
		address,
	});

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
		const wethAddress = WETH_ADDRESS; // WETH

		// Calculate slippage-adjusted minimum output (5% slippage)
		const slippageFactor = 0.95; // 5% slippage tolerance
		const amountOutMin = amountTo
			? BigInt(
					Math.floor(
						Number(amountTo) *
							slippageFactor *
							10 ** tokenTo.decimals,
					),
				)
			: 0n;

		// Parse input amount with correct decimals
		const parsedAmountFrom = parseUnits(amountFrom, tokenFrom.decimals);

		if (tokenFrom.address === zeroAddress) {
			// ETH to Token
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
				value: parsedAmountFrom, // Use actual ETH amount
				account: address,
			} as const;
		}

		if (tokenTo.address === zeroAddress) {
			// Token to ETH
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
			if (!contractParams)
				throw new Error("Contract parameters not available");

			try {
				// First, check if we need to simulate getAmountsOut to get a better amountOutMin
				if (!amountTo || Number(amountTo) <= 0) {
					// This is a fallback if amountTo isn't provided
					const path = contractParams.args[
						contractParams.functionName === "swapExactETHForTokens"
							? 1
							: 2
					] as readonly `0x${string}`[];
					const amountIn =
						contractParams.functionName === "swapExactETHForTokens"
							? contractParams.value
							: contractParams.args[0];

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
							contractParams.functionName ===
							"swapExactETHForTokens"
								? 0
								: 1;
						contractParams.args[argsIndex] = slippageAdjusted;
					}
				}

				// Now estimate gas with proper values
				const gasData =
					await publicClient.estimateContractGas(contractParams);

				// Calculate gas cost
				const gasLimit = gasData * 2n; // Double the gas limit for safety
				const gasPrice = await publicClient.getGasPrice();
				const gasCostEth = Number(
					parseEther(((gasLimit * gasPrice) / 10n ** 18n).toString()),
				);
				const gasCostUsd = gasCostEth * ethPriceUsd;

				return `~$${gasCostUsd.toFixed(2)}`;
			} catch (err) {
				console.error("Gas estimation error:", err);
				throw err;
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
		gasEstimate: gasEstimate || null,
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
	const { address, isConnected } = useAccount();
	const publicClient = usePublicClient();
	const ethPriceUsd = 3000;

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
			const ethToken = tokenA.address === zeroAddress ? tokenA : tokenB;
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
					address,
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
				address,
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
			if (!contractParams)
				throw new Error("Contract parameters not available");

			try {
				// Estimate gas with proper values
				const gasData =
					await publicClient.estimateContractGas(contractParams);

				// Calculate gas cost - use a lower multiplier for more accurate estimation
				const gasLimit = (gasData * 12n) / 10n; // Add 20% buffer instead of doubling
				const gasPrice = await publicClient.getGasPrice();
				const gasCostEth = Number(
					parseEther(((gasLimit * gasPrice) / 10n ** 18n).toString()),
				);
				const gasCostUsd = gasCostEth * ethPriceUsd;

				return `~$${gasCostUsd.toFixed(2)}`;
			} catch (err) {
				console.error("Gas estimation error:", err);
				return "-";
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
		gasEstimate: gasEstimate || null,
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
	const ethPriceUsd = 3000;

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
		const slippageFactor = 0.995; // 0.5% slippage

		// Parse LP token amount
		const parsedLpAmount = parseUnits(lpTokenAmount, 18);

		// Get the expected token amounts from the pool (this would ideally be from a query)
		// In a real implementation, we'd query the reserves and total supply
		// and calculate the expected amounts based on the user's LP token share

		// For simplicity, assuming we have some expected amounts
		// These would come from a query to the pair contract in a real implementation
		const expectedAmountA = parseUnits("10", tokenA.decimals); // Placeholder
		const expectedAmountB = parseUnits("10", tokenB.decimals); // Placeholder

		// Apply slippage factor to determine minimum amounts
		const amountAMin = BigInt(
			Math.floor(Number(expectedAmountA) * slippageFactor),
		);
		const amountBMin = BigInt(
			Math.floor(Number(expectedAmountB) * slippageFactor),
		);

		// ETH + Token
		if (tokenA.address === zeroAddress || tokenB.address === zeroAddress) {
			const token = tokenA.address === zeroAddress ? tokenB : tokenA;
			const isTokenA = token === tokenA;

			// Set minimum amounts based on which token is ETH
			const amountTokenMin = isTokenA ? amountAMin : amountBMin;
			const amountETHMin = isTokenA ? amountBMin : amountAMin;

			return {
				address: UNISWAP_V2_ROUTER as `0x${string}`,
				abi: UNISWAP_V2_ROUTER_ABI,
				functionName: "removeLiquidityETH",
				args: [
					token.address as `0x${string}`,
					parsedLpAmount,
					0n, // amountTokenMin (with slippage)
					0n, // amountETHMin (with slippage)
					address,
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
				address,
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
			if (!contractParams)
				throw new Error("Contract parameters not available");

			try {
				// Estimate gas with proper values
				const gasData =
					await publicClient.estimateContractGas(contractParams);

				// Calculate gas cost - use a lower multiplier for more accurate estimation
				const gasLimit = (gasData * 12n) / 10n; // Add 20% buffer instead of doubling
				const gasPrice = await publicClient.getGasPrice();
				const gasCostEth = Number(
					parseEther(((gasLimit * gasPrice) / 10n ** 18n).toString()),
				);
				const gasCostUsd = gasCostEth * ethPriceUsd;

				return `~$${gasCostUsd.toFixed(2)}`;
			} catch (err) {
				console.error("Gas estimation error:", err);
				return "-";
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
		gasEstimate: gasEstimate || null,
		isLoading,
		error: error ? (error as Error).message : null,
	};
}
