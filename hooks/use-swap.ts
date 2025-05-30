"use client";

import { useState } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { UNISWAP_V2_ROUTER, UNISWAP_V2_ROUTER_ABI, WETH_ADDRESS, WXRP_ABI } from "@/lib/constants";
import { parseUnits, zeroAddress } from "viem";
import type { TokenData } from "@/types/token";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { isXRPWXRPSwap } from "@/lib/utils";

export function useSwap() {
	const { address, isConnected } = useAccount();
	const publicClient = usePublicClient();
	const [isSwapping, setIsSwapping] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [txHash, setTxHash] = useState<string | null>(null);
	const queryClient = useQueryClient();
	const { writeContractAsync: writeContract } = useWriteContract();

	const _executeSwap = async (
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

			// Handle XRP ↔ WXRP swaps with wrap/unwrap functions
			if (isXRPWXRPSwap(tokenFrom, tokenTo)) {
				// XRP -> WXRP (wrap)
				if (tokenFrom.address === zeroAddress && tokenTo.address === WETH_ADDRESS) {
					const tx = await writeContract({
						address: WETH_ADDRESS,
						abi: WXRP_ABI,
						functionName: "deposit",
						args: [],
						value: parsedAmountIn,
					});

					setTxHash(tx);

					await publicClient?.waitForTransactionReceipt({
						hash: tx,
					});
				}
				// WXRP -> XRP (unwrap)
				else if (tokenFrom.address === WETH_ADDRESS && tokenTo.address === zeroAddress) {
					const tx = await writeContract({
						address: WETH_ADDRESS,
						abi: WXRP_ABI,
						functionName: "withdraw",
						args: [parsedAmountIn],
					});

					setTxHash(tx);

					await publicClient?.waitForTransactionReceipt({
						hash: tx,
					});
				}
			}
			// XRP -> Token (native XRP to token)
			else if (tokenFrom.address === zeroAddress) {
				const tx = await writeContract({
					address: UNISWAP_V2_ROUTER,
					abi: UNISWAP_V2_ROUTER_ABI,
					functionName: "swapExactETHForTokens",
					args: [
						parsedAmountOutMin,
						[
							WETH_ADDRESS, // WXRP address
							tokenTo.address,
						],
						address,
						deadline,
					],
					value: parsedAmountIn,
				});

				setTxHash(tx);

				await publicClient?.waitForTransactionReceipt({
					hash: tx,
				});
			}
			// Token -> XRP (token to native XRP)
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
							WETH_ADDRESS, // WXRP address
						],
						address,
						deadline,
					],
				});

				setTxHash(tx);

				await publicClient?.waitForTransactionReceipt({
					hash: tx,
				});
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

				await publicClient?.waitForTransactionReceipt({
					hash: tx,
				});
			}
			queryClient.invalidateQueries();
		} catch (err) {
			console.error("Error executing swap:", err);
			setError("Failed to execute swap. Please try again.");
			setIsSwapping(false);
			throw new Error("Failed to execute swap. Please try again.");
		} finally {
			setIsSwapping(false);
		}
	};

	const executeSwap = async (
		tokenFrom: TokenData,
		tokenTo: TokenData,
		amountFrom: string,
		amountTo: string,
		slippage: number,
	) => {
		toast.promise(
			async () => {
				await _executeSwap(
					tokenFrom,
					tokenTo,
					amountFrom,
					amountTo,
					slippage,
				);
			},
			{
				loading: "Swapping...",
				success: "Swap successful!",
				error: "Swap failed. Please try again.",
			},
		);
	};
	return { isSwapping, error, txHash, executeSwap };
}
