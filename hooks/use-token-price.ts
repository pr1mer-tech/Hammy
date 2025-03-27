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
) {
	const [price, setPrice] = useState<string>("");
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	// Get amounts out from Uniswap V2 Router
	const { data: amountsOut, refetch } = useReadContract({
		address: UNISWAP_V2_ROUTER,
		abi: UNISWAP_V2_ROUTER_ABI,
		functionName: "getAmountsOut",
		args: [
			amount && Number.parseFloat(amount) > 0
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
				!!tokenFrom.address &&
				!!tokenTo.address &&
				tokenFrom.address !== tokenTo.address,
		},
	});

	// Force refetch when inputs change
	useEffect(() => {
		if (
			tokenFrom.address &&
			tokenTo.address &&
			tokenFrom.address !== tokenTo.address
		) {
			refetch();
		}
	}, [tokenFrom.address, tokenTo.address, refetch]);

	useEffect(() => {
		const calculatePrice = async () => {
			if (
				!amount ||
				Number.parseFloat(amount) === 0 ||
				tokenFrom.address === tokenTo.address
			) {
				setPrice("");
				return;
			}

			setIsLoading(true);
			setError(null);

			try {
				if (amountsOut && amountsOut.length >= 2) {
					const outputAmount = formatUnits(
						amountsOut[1] ?? 0n,
						tokenTo.decimals,
					);
					setPrice(outputAmount);
				} else {
					await refetch();
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
		tokenFrom.address,
		tokenTo.address,
		tokenTo.decimals,
		amountsOut,
		refetch,
	]);

	return { price, isLoading, error, refetch };
}
