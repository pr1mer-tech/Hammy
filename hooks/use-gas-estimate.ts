"use client";

import { useMemo } from "react";
import { Address, parseEther, parseUnits, zeroAddress } from "viem";
import { useAccount, useBalance, usePublicClient } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { UNISWAP_V2_ROUTER, UNISWAP_V2_ROUTER_ABI } from "@/lib/constants";
import type { TokenData } from "@/types/token";

// Fix JSON bigint encoding
//@ts-expect-error - fix
BigInt.prototype.toJSON = function () {
	return this.toString();
};

export function useGasEstimate(
	tokenFrom: TokenData,
	tokenTo: TokenData,
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
		if (!amountFrom || Number.parseFloat(amountFrom) <= 0) return null;

		const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20); // 20 minutes deadline
		const wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"; // WETH

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
		tokenFrom.address,
		tokenFrom.decimals,
		tokenTo.address,
		tokenTo.decimals,
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
					const path =
						contractParams.args[
							contractParams.functionName ===
							"swapExactETHForTokens"
								? 1
								: 2
						];
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
				const gasLimit = gasData;
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
			!!tokenFrom.address &&
			!!tokenTo.address &&
			tokenFrom.address !== tokenTo.address &&
			!!contractParams,
		staleTime: 30000, // 30 seconds
		retry: 1,
	});

	return {
		gasEstimate: gasEstimate || null,
		isLoading,
		error: error ? (error as Error).message : null,
	};
}
