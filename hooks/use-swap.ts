"use client";

import { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { UNISWAP_V2_ROUTER, UNISWAP_V2_ROUTER_ABI } from "@/lib/constants";
import { parseUnits, zeroAddress } from "viem";
import type { TokenData } from "@/types/token";

export function useSwap() {
	const { address, isConnected } = useAccount();
	const [isSwapping, setIsSwapping] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [txHash, setTxHash] = useState<string | null>(null);

	const { writeContractAsync: writeContract } = useWriteContract();

	const executeSwap = async (
		tokenFrom: TokenData,
		tokenTo: TokenData,
		amountFrom: string,
		amountTo: string,
		slippage: number,
	) => {
		if (!address) return;

		setIsSwapping(true);
		setError(null);
		setTxHash(null);

		try {
			const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20); // 20 minutes
			const parsedAmountIn = parseUnits(amountFrom, tokenFrom.decimals);
			const parsedAmountOutMin = parseUnits(
				(Number.parseFloat(amountTo) * (1 - slippage / 100)).toFixed(
					tokenTo.decimals,
				),
				tokenTo.decimals,
			);

			// ETH -> Token
			if (tokenFrom.address === zeroAddress) {
				const tx = await writeContract({
					address: UNISWAP_V2_ROUTER,
					abi: UNISWAP_V2_ROUTER_ABI,
					functionName: "swapExactETHForTokens",
					args: [
						parsedAmountOutMin,
						[
							"0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
							tokenTo.address,
						],
						address,
						deadline,
					],
					value: parsedAmountIn,
				});

				setTxHash(tx);
			}
			// Token -> ETH
			else if (tokenTo.address === zeroAddress) {
				const tx = await writeContract({
					address: UNISWAP_V2_ROUTER,
					abi: UNISWAP_V2_ROUTER_ABI,
					functionName: "swapExactTokensForETH",
					args: [
						parsedAmountIn,
						parsedAmountOutMin,
						[
							tokenFrom.address,
							"0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
						],
						address,
						deadline,
					],
				});

				setTxHash(tx);
			}
			// Token -> Token
			else {
				const tx = await writeContract({
					address: UNISWAP_V2_ROUTER,
					abi: UNISWAP_V2_ROUTER_ABI,
					functionName: "swapExactTokensForTokens",
					args: [
						parsedAmountIn,
						parsedAmountOutMin,
						[tokenFrom.address, tokenTo.address],
						address,
						deadline,
					],
				});

				setTxHash(tx);
			}
		} catch (err) {
			console.error("Error executing swap:", err);
			setError("Failed to execute swap. Please try again.");
		} finally {
			setIsSwapping(false);
		}
	};

	return { isSwapping, error, txHash, executeSwap };
}
