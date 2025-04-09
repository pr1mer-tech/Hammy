"use client";

import { useState, useEffect } from "react";
import { formatUnits, parseUnits, zeroAddress } from "viem";
import type { TokenData } from "@/types/token";
import { WETH_ADDRESS } from "@/lib/constants";

/**
 * Hook to calculate proportional amounts for liquidity provision in existing pools
 * Uses the constant product formula x * y = k
 */
export function useProportionalAmounts(
	tokenA: TokenData | undefined,
	tokenB: TokenData | undefined,
	reserves: [bigint, bigint, number] | undefined,
	token0Address: `0x${string}` | undefined,
	amount: string,
	isTokenA: boolean, // true if amount is for tokenA, false if for tokenB
) {
	const [calculatedAmount, setCalculatedAmount] = useState<string>("");
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const calculateProportionalAmount = () => {
			// Reset if no amount provided or no reserves
			if (
				!amount ||
				Number.parseFloat(amount) === 0 ||
				!reserves ||
				tokenA?.address === tokenB?.address
			) {
				setCalculatedAmount("");
				return;
			}

			setIsLoading(true);
			setError(null);

			try {
				const [reserve0, reserve1] = reserves;

				// Determine token order in the pair
				const effectiveTokenA =
					tokenA?.address === zeroAddress
						? WETH_ADDRESS
						: tokenA?.address;
				const isTokenAFirst =
					token0Address?.toLowerCase() ===
					effectiveTokenA?.toLowerCase();

				const reserveA = isTokenAFirst ? reserve0 : reserve1;
				const reserveB = isTokenAFirst ? reserve1 : reserve0;

				// If either reserve is zero, cannot calculate proportional amount
				if (reserveA === 0n || reserveB === 0n) {
					setCalculatedAmount("");
					setError("Pool has no liquidity");
					return;
				}

				// Calculate based on current pool ratio
				// If providing TokenA, calculate TokenB amount as: amountA * reserveB / reserveA
				// If providing TokenB, calculate TokenA amount as: amountB * reserveA / reserveB
				const parsedAmount = parseUnits(
					amount,
					isTokenA
						? (tokenA?.decimals ?? 18)
						: (tokenB?.decimals ?? 18),
				);

				let calculatedBigInt: bigint;
				if (isTokenA) {
					// amountB = amountA * reserveB / reserveA
					calculatedBigInt = (parsedAmount * reserveB) / reserveA;
					setCalculatedAmount(
						formatUnits(calculatedBigInt, tokenB?.decimals ?? 18),
					);
				} else {
					// amountA = amountB * reserveA / reserveB
					calculatedBigInt = (parsedAmount * reserveA) / reserveB;
					setCalculatedAmount(
						formatUnits(calculatedBigInt, tokenA?.decimals ?? 18),
					);
				}
			} catch (err) {
				console.error("Error calculating proportional amount:", err);
				setError("Failed to calculate amount");
				setCalculatedAmount("");
			} finally {
				setIsLoading(false);
			}
		};

		calculateProportionalAmount();
	}, [
		amount,
		isTokenA,
		tokenA?.address,
		tokenA?.decimals,
		tokenB?.address,
		tokenB?.decimals,
		reserves,
		token0Address,
	]);

	return { calculatedAmount, isLoading, error };
}
