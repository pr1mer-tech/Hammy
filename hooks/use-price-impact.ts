"use client";

import { useState, useEffect } from "react";
import { formatUnits, parseUnits } from "viem";
import type { TokenData } from "@/types/token";
import { usePoolExists } from "@/hooks/use-pool-exists";
import { WETH_ADDRESS } from "@/lib/constants";
import { isXRPWXRPSwap } from "@/lib/utils";

/**
 * Hook to calculate the price impact of a swap
 *
 * Price impact is calculated as:
 * (1 - executionPrice/spotPrice) * 100
 */
export function usePriceImpact(
	tokenFrom: TokenData | undefined,
	tokenTo: TokenData | undefined,
	amountFrom: string,
	amountTo: string,
) {
	const [priceImpact, setPriceImpact] = useState<number>(0);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	// Check if this is an XRP/WXRP swap (0% impact)
	const isWrapUnwrapSwap = isXRPWXRPSwap(tokenFrom, tokenTo);

	// Get pool data
	const {
		poolExists,
		reserves,
		token0Address,
		isLoading: isPoolLoading,
	} = usePoolExists(tokenFrom, tokenTo);

	useEffect(() => {
		if (!tokenFrom || !tokenTo) {
			setPriceImpact(0);
			setIsLoading(false);
			setError(null);
			return;
		}

		const calculatePriceImpact = async () => {
			// Reset state
			setError(null);
			setPriceImpact(0);

			// XRP/WXRP swaps have 0% price impact (1:1 conversion)
			if (isWrapUnwrapSwap) {
				setPriceImpact(0);
				setIsLoading(false);
				return;
			}

			// Skip calculation if inputs are invalid
			if (
				!amountFrom ||
				!amountTo ||
				Number.parseFloat(amountFrom) === 0 ||
				Number.parseFloat(amountTo) === 0 ||
				!poolExists ||
				!reserves ||
				isPoolLoading
			) {
				setIsLoading(false);
				return;
			}

			setIsLoading(true);

			try {
				// Determine token order in the pool
				const isTokenFromToken0 =
					token0Address?.toLowerCase() ===
					(tokenFrom.address === "0x0000000000000000000000000000000000000000"
						? WETH_ADDRESS // Use WXRP address instead of Ethereum WETH
						: tokenFrom.address
					).toLowerCase();

				// Get reserves based on token order
				const reserve0 = reserves[0];
				const reserve1 = reserves[1];

				// Get the reserves in the correct order
				const reserveFrom = isTokenFromToken0 ? reserve0 : reserve1;
				const reserveTo = isTokenFromToken0 ? reserve1 : reserve0;

				// Handle different decimal places
				const decimalsDiff = tokenTo.decimals - tokenFrom.decimals;

				// Calculate spot price using constant product formula: k = x * y
				// For small amount, simply use reserve ratio as spot price
				let spotPrice: number;
				if (decimalsDiff === 0) {
					// When decimals are the same, direct division works
					spotPrice = Number(reserveTo) / Number(reserveFrom);
				} else {
					// Apply decimal adjustment
					const adjustmentFactor = 10 ** Math.abs(decimalsDiff);
					spotPrice =
						decimalsDiff > 0
							? Number(reserveTo) /
							Number(reserveFrom) /
							adjustmentFactor
							: (Number(reserveTo) / Number(reserveFrom)) *
							adjustmentFactor;
				}

				// Calculate execution price
				const executionPrice =
					Number.parseFloat(amountTo) / Number.parseFloat(amountFrom);

				// Prevent division by zero
				if (spotPrice === 0 || !Number.isFinite(spotPrice)) {
					setPriceImpact(0);
					setIsLoading(false);
					return;
				}

				// Calculate impact using (1 - executionPrice/spotPrice) * 100
				// This handles both buying and selling correctly
				const ratio = executionPrice / spotPrice;
				let impact: number;

				if (!Number.isFinite(ratio)) {
					impact = 0; // Protect against Infinity
				} else {
					impact = Math.max(0, (1 - ratio) * 100);
				}

				// Cap impact at 99.99% to avoid confusion
				const cappedImpact = Math.min(impact - 0.3, 99.99);
				setPriceImpact(Number(cappedImpact.toFixed(2)));
			} catch (err) {
				console.error("Error calculating price impact:", err);
				setError("Failed to calculate price impact");
				setPriceImpact(0);
			} finally {
				setIsLoading(false);
			}
		};

		calculatePriceImpact();
	}, [
		amountFrom,
		amountTo,
		poolExists,
		reserves,
		token0Address,
		tokenFrom,
		tokenTo,
		isPoolLoading,
		isWrapUnwrapSwap,
	]);

	return { priceImpact, isLoading, error };
}
