"use client";

import { useState, useEffect } from "react";
import { useReadContract } from "wagmi";
import { UNISWAP_V2_ROUTER, UNISWAP_V2_ROUTER_ABI } from "@/lib/constants";
import { type Address, formatUnits, parseUnits, zeroAddress } from "viem";
import type { TokenData } from "@/types/token";

export function useTokenPrice(
	tokenFrom: TokenData,
	tokenTo: TokenData,
	amount: string,
	direction: "from" | "to",
) {
	const [price, setPrice] = useState<string>("");
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	// Get amounts out from Uniswap V2 Router (when direction is 'from')
	const { data: amountsOut, refetch: refetchAmountsOut } = useReadContract({
		address: UNISWAP_V2_ROUTER,
		abi: UNISWAP_V2_ROUTER_ABI,
		functionName: "getAmountsOut",
		args: [
			amount && Number.parseFloat(amount) > 0 && direction === "from"
				? parseUnits(amount, tokenFrom.decimals)
				: parseUnits("1", tokenFrom.decimals),
			[
				tokenFrom.address === zeroAddress
					? "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
					: (tokenFrom.address as Address),
				tokenTo.address === zeroAddress
					? "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
					: (tokenTo.address as Address),
			],
		],
		query: {
			enabled:
				direction === "from" &&
				!!tokenFrom.address &&
				!!tokenTo.address &&
				tokenFrom.address !== tokenTo.address &&
				!!amount &&
				Number.parseFloat(amount) > 0,
		},
	});

	// Get amounts in from Uniswap V2 Router (when direction is 'to')
	const { data: amountsIn, refetch: refetchAmountsIn } = useReadContract({
		address: UNISWAP_V2_ROUTER,
		abi: UNISWAP_V2_ROUTER_ABI,
		functionName: "getAmountsIn",
		args: [
			amount && Number.parseFloat(amount) > 0 && direction === "to"
				? parseUnits(amount, tokenTo.decimals)
				: parseUnits("1", tokenTo.decimals),
			[
				tokenFrom.address === zeroAddress
					? "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
					: (tokenFrom.address as Address),
				tokenTo.address === zeroAddress
					? "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
					: (tokenTo.address as Address),
			],
		],
		query: {
			enabled:
				direction === "to" &&
				!!tokenFrom.address &&
				!!tokenTo.address &&
				tokenFrom.address !== tokenTo.address &&
				!!amount &&
				Number.parseFloat(amount) > 0,
		},
	});

	// Force refetch when inputs change
	useEffect(() => {
		if (
			tokenFrom.address &&
			tokenTo.address &&
			tokenFrom.address !== tokenTo.address &&
			amount &&
			Number.parseFloat(amount) > 0
		) {
			setIsLoading(true);
			if (direction === "from") {
				refetchAmountsOut();
			} else {
				refetchAmountsIn();
			}
		} else {
			setPrice("");
		}
	}, [
		tokenFrom.address,
		tokenTo.address,
		amount,
		direction,
		refetchAmountsOut,
		refetchAmountsIn,
	]);

	useEffect(() => {
		const calculatePrice = async () => {
			if (
				!amount ||
				Number.parseFloat(amount) === 0 ||
				tokenFrom.address === tokenTo.address
			) {
				setPrice("");
				setIsLoading(false);
				return;
			}

			setError(null);

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
	}, [
		amount,
		direction,
		tokenFrom.address,
		tokenFrom.decimals,
		tokenTo.address,
		tokenTo.decimals,
		amountsOut,
		amountsIn,
	]);

	const refetch = direction === "from" ? refetchAmountsOut : refetchAmountsIn;
	return { price, isLoading, error, refetch };
}
