"use client";

import { useState, useEffect } from "react";
import { useReadContract } from "wagmi";
import { UNISWAP_V2_ROUTER, UNISWAP_V2_ROUTER_ABI, WETH_ADDRESS } from "@/lib/constants";
import { type Address, formatUnits, parseUnits, zeroAddress } from "viem";
import type { TokenData } from "@/types/token";
import { isXRPWXRPSwap } from "@/lib/utils";

export function useTokenPrice(
	tokenFrom: TokenData | undefined,
	tokenTo: TokenData | undefined,
	amount: string,
	direction: "from" | "to",
) {
	const [price, setPrice] = useState<string>("");
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	// Check if this is an XRP/WXRP swap (1:1 conversion)
	const isWrapUnwrapSwap = isXRPWXRPSwap(tokenFrom, tokenTo);

	// Get amounts out from Uniswap V2 Router (when direction is 'from')
	const { data: amountsOut, refetch: refetchAmountsOut } = useReadContract({
		address: UNISWAP_V2_ROUTER as Address,
		abi: UNISWAP_V2_ROUTER_ABI,
		functionName: "getAmountsOut",
		args: [
			amount && Number.parseFloat(amount) > 0 && direction === "from"
				? parseUnits(amount, tokenFrom?.decimals ?? 18)
				: parseUnits("1", tokenFrom?.decimals ?? 18),
			[
				tokenFrom?.address === zeroAddress
					? WETH_ADDRESS
					: (tokenFrom?.address as Address),
				tokenTo?.address === zeroAddress
					? WETH_ADDRESS
					: (tokenTo?.address as Address),
			],
		],
		query: {
			enabled:
				!isWrapUnwrapSwap &&
				direction === "from" &&
				!!tokenFrom?.address &&
				!!tokenTo?.address &&
				tokenFrom?.address !== tokenTo?.address &&
				!!amount &&
				Number.parseFloat(amount) > 0,
		},
	});

	// Get amounts in from Uniswap V2 Router (when direction is 'to')
	const { data: amountsIn, refetch: refetchAmountsIn } = useReadContract({
		address: UNISWAP_V2_ROUTER as Address,
		abi: UNISWAP_V2_ROUTER_ABI,
		functionName: "getAmountsIn",
		args: [
			amount && Number.parseFloat(amount) > 0 && direction === "to"
				? parseUnits(amount, tokenTo?.decimals ?? 18)
				: parseUnits("1", tokenTo?.decimals ?? 18),
			[
				tokenFrom?.address === zeroAddress
					? WETH_ADDRESS
					: (tokenFrom?.address as Address),
				tokenTo?.address === zeroAddress
					? WETH_ADDRESS
					: (tokenTo?.address as Address),
			],
		],
		query: {
			enabled:
				!isWrapUnwrapSwap &&
				direction === "to" &&
				!!tokenFrom?.address &&
				!!tokenTo?.address &&
				tokenFrom?.address !== tokenTo?.address &&
				!!amount &&
				Number.parseFloat(amount) > 0,
		},
	});

	// Force refetch when inputs change
	useEffect(() => {
		if (
			tokenFrom?.address &&
			tokenTo?.address &&
			tokenFrom.address !== tokenTo.address &&
			amount &&
			Number.parseFloat(amount) > 0
		) {
			setIsLoading(true);

			// For XRP/WXRP swaps, return 1:1 ratio immediately
			if (isWrapUnwrapSwap) {
				setPrice(amount);
				setIsLoading(false);
				return;
			}

			if (direction === "from") {
				refetchAmountsOut();
			} else {
				refetchAmountsIn();
			}
		} else {
			setPrice("");
		}
	}, [
		tokenFrom?.address,
		tokenTo?.address,
		amount,
		direction,
		isWrapUnwrapSwap,
		refetchAmountsOut,
		refetchAmountsIn,
	]);

	useEffect(() => {
		const calculatePrice = async () => {
			if (
				!tokenFrom ||
				!tokenTo ||
				!amount ||
				Number.parseFloat(amount) === 0 ||
				tokenFrom.address === tokenTo.address
			) {
				setPrice("");
				setIsLoading(false);
				setError(tokenFrom && tokenTo ? null : "Tokens not selected");
				return;
			}

			setError(null);

			// Handle XRP/WXRP swaps with 1:1 ratio
			if (isWrapUnwrapSwap) {
				setPrice(amount);
				setIsLoading(false);
				return;
			}

			try {
				if (direction === "from") {
					if (amountsOut && amountsOut.length >= 2) {
						const outputAmount = formatUnits(
							amountsOut[1] ?? 0n,
							tokenTo.decimals,
						);
						setPrice(outputAmount);
					} else {
						setPrice("");
					}
				} else if (direction === "to") {
					if (amountsIn && amountsIn.length >= 2) {
						const inputAmount = formatUnits(
							amountsIn[0] ?? 0n,
							tokenFrom.decimals,
						);
						setPrice(inputAmount);
					} else {
						setPrice("");
					}
				}
			} catch (err) {
				console.error("Error calculating price:", err);
				setError("Failed to calculate price");
				setPrice("");
			} finally {
				setIsLoading(false);
			}
		};

		calculatePrice();
	}, [amount, direction, tokenFrom, tokenTo, amountsOut, amountsIn, isWrapUnwrapSwap]);

	const refetch = direction === "from" ? refetchAmountsOut : refetchAmountsIn;
	return { price, isLoading, error, refetch };
}
