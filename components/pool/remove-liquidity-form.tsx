"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import type { TokenData } from "@/types/token";
import {
	useAccount,
	usePublicClient,
	useReadContract,
	useWriteContract,
} from "wagmi";
import { useAtomValue } from "jotai";
import { selectedPositionAtom } from "@/lib/store";
import {
	UNISWAP_V2_FACTORY_ABI,
	UNISWAP_V2_FACTORY,
	UNISWAP_V2_ROUTER,
	UNISWAP_V2_ROUTER_ABI,
	ERC20_ABI,
	UNISWAP_V2_PAIR_ABI,
	WETH_ADDRESS,
} from "@/lib/constants";
import { erc20Abi, formatUnits, parseUnits, zeroAddress } from "viem";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { useModal } from "connectkit";
import { useRemoveLiquidityGasEstimate } from "@/hooks/use-gas-estimate";
import { useQueryClient } from "@tanstack/react-query";
import { GasIcon } from "../ui/icons";

interface RemoveLiquidityFormProps {
	tokenA: TokenData | undefined;
	tokenB: TokenData | undefined;
	onTokenASelect: (token: TokenData) => void;
	onTokenBSelect: (token: TokenData) => void;
	onError: (error: string | null) => void;
}

export function RemoveLiquidityForm({
	tokenA,
	tokenB,
	onTokenASelect,
	onTokenBSelect,
	onError,
}: RemoveLiquidityFormProps) {
	const { address, isConnected } = useAccount();
	const publicClient = usePublicClient();
	const { setOpen } = useModal();
	const [lpTokenAmount, setLpTokenAmount] = useState("0");
	const [lpTokenPercentage, setLpTokenPercentage] = useState(100);
	const [isRemovingLiquidity, setIsRemovingLiquidity] = useState(false);
	const [isApproving, setIsApproving] = useState(false);

	// Get the selected position from Jotai store
	const selectedPosition = useAtomValue(selectedPositionAtom);

	// Reset the LP token percentage to 100% when a position is selected
	useEffect(() => {
		if (selectedPosition) {
			setLpTokenPercentage(100);
		}
	}, [selectedPosition]);

	const { writeContractAsync: writeContract } = useWriteContract();

	// Get pair address
	const { data: pairAddress } = useReadContract({
		address: UNISWAP_V2_FACTORY,
		abi: UNISWAP_V2_FACTORY_ABI,
		functionName: "getPair",
		args: [
			!tokenA || tokenA?.address === zeroAddress
				? WETH_ADDRESS
				: tokenA?.address,
			!tokenB || tokenB?.address === zeroAddress
				? WETH_ADDRESS
				: tokenB?.address,
		],
		query: {
			enabled: !!tokenA?.address && !!tokenB?.address,
		},
	});

	// Get LP token balance
	const { data: lpBalance, refetch: refetchLpBalance } = useReadContract({
		address: pairAddress as `0x${string}`,
		abi: ERC20_ABI,
		functionName: "balanceOf",
		args: [address || zeroAddress],
		query: {
			enabled: !!pairAddress && pairAddress !== zeroAddress && !!address,
		},
	});

	// Get LP token allowance
	const { data: lpAllowance, refetch: refetchLpAllowance } = useReadContract({
		address: pairAddress as `0x${string}`,
		abi: ERC20_ABI,
		functionName: "allowance",
		args: [address || zeroAddress, UNISWAP_V2_ROUTER],
		query: {
			enabled: !!pairAddress && pairAddress !== zeroAddress && !!address,
		},
	});

	// Get reserves for the pair
	const { data: reserves } = useReadContract({
		address: pairAddress as `0x${string}`,
		abi: UNISWAP_V2_PAIR_ABI,
		functionName: "getReserves",
		query: {
			enabled: !!pairAddress && pairAddress !== zeroAddress && !!address,
		},
	});

	// Get token0 for the pair (to determine token order)
	const { data: token0Address } = useReadContract({
		address: pairAddress as `0x${string}`,
		abi: UNISWAP_V2_PAIR_ABI,
		functionName: "token0",
		query: {
			enabled: !!pairAddress && pairAddress !== zeroAddress,
		},
	});

	// Get total supply of LP tokens
	const { data: totalSupply } = useReadContract({
		address: pairAddress as `0x${string}`,
		abi: erc20Abi,
		functionName: "totalSupply",
		query: {
			enabled: !!pairAddress && pairAddress !== zeroAddress,
		},
	});

	// Check if approval is needed
	const [needsApproval, setNeedsApproval] = useState(false);

	useEffect(() => {
		if (lpAllowance && lpTokenAmount) {
			const parsedLpAmount = parseUnits(lpTokenAmount, 18);
			setNeedsApproval(
				BigInt(lpAllowance.toString() || "0") < parsedLpAmount,
			);
		} else if (lpTokenAmount && Number.parseFloat(lpTokenAmount) > 0) {
			// If we have an amount but no allowance data yet, assume approval is needed
			setNeedsApproval(true);
		} else {
			setNeedsApproval(false);
		}
	}, [lpAllowance, lpTokenAmount]);

	// Use the gas estimate hook
	const queryClient = useQueryClient();
	const { gasEstimate, isLoading: isGasEstimateLoading } =
		useRemoveLiquidityGasEstimate(
			tokenA,
			tokenB,
			lpTokenAmount,
			pairAddress as `0x${string}`,
		);

	// Update LP token amount based on percentage
	useEffect(() => {
		if (lpBalance) {
			const totalLpBalance = formatUnits(
				BigInt(lpBalance.toString()),
				18,
			);
			const amount =
				(Number.parseFloat(totalLpBalance) * lpTokenPercentage) / 100;
			setLpTokenAmount(amount.toFixed(6));
		}
	}, [lpBalance, lpTokenPercentage]);

	// Handle approving LP tokens
	const handleApprove = async () => {
		if (!address || !pairAddress || pairAddress === zeroAddress) return;

		setIsApproving(true);
		onError(null);

		try {
			const parsedLpAmount = parseUnits(lpTokenAmount, 18);

			const txHash = await writeContract({
				address: pairAddress as `0x${string}`,
				abi: ERC20_ABI,
				functionName: "approve",
				args: [UNISWAP_V2_ROUTER, parsedLpAmount],
			});

			// Wait for transaction receipt before refetching
			await publicClient?.waitForTransactionReceipt({
				hash: txHash,
			});

			// Now that the transaction is confirmed, refetch allowance
			await refetchLpAllowance();
		} catch (err) {
			console.error("Error approving LP tokens:", err);
			onError("Failed to approve LP tokens. Please try again.");
		} finally {
			setIsApproving(false);
		}
	};

	const handleRemoveLiquidity = async () => {
		if (
			!address ||
			!pairAddress ||
			pairAddress === zeroAddress ||
			!reserves ||
			!token0Address ||
			!totalSupply
		)
			return;

		// Double-check if approval is needed before proceeding
		if (needsApproval) {
			await handleApprove();
			return;
		}

		setIsRemovingLiquidity(true);
		onError(null);

		try {
			const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20); // 20 minutes
			const slippageFactor = 0.995; // 0.5% slippage
			const [reserve0, reserve1] = reserves;

			// Parse LP token amount
			const parsedLpAmount = parseUnits(lpTokenAmount, 18);

			// Calculate minimum amounts based on reserves and LP token share
			const lpShare = Number(parsedLpAmount) / Number(totalSupply);

			// Determine which token is token0 and which is token1
			const effectiveTokenA =
				tokenA?.address === zeroAddress
					? WETH_ADDRESS
					: tokenA?.address;
			const effectiveTokenB =
				tokenB?.address === zeroAddress
					? WETH_ADDRESS
					: tokenB?.address;

			const isTokenAToken0 =
				effectiveTokenA?.toLowerCase() === token0Address?.toLowerCase();

			// Calculate expected output amounts
			const expectedAmountA = isTokenAToken0
				? BigInt(Math.floor(Number(reserve0) * lpShare))
				: BigInt(Math.floor(Number(reserve1) * lpShare));

			const expectedAmountB = isTokenAToken0
				? BigInt(Math.floor(Number(reserve1) * lpShare))
				: BigInt(Math.floor(Number(reserve0) * lpShare));

			// Apply slippage to get minimum amounts
			const amountAMin = BigInt(
				Math.floor(Number(expectedAmountA) * slippageFactor),
			);
			const amountBMin = BigInt(
				Math.floor(Number(expectedAmountB) * slippageFactor),
			);

			// ETH + Token
			let txHash: `0x${string}`;
			if (
				tokenA?.address === zeroAddress ||
				tokenB?.address === zeroAddress
			) {
				const token = tokenA?.address === zeroAddress ? tokenB : tokenA;
				const tokenMin =
					tokenA?.address === zeroAddress ? amountBMin : amountAMin;
				const ethMin =
					tokenA?.address === zeroAddress ? amountAMin : amountBMin;

				txHash = await writeContract({
					address: UNISWAP_V2_ROUTER,
					abi: UNISWAP_V2_ROUTER_ABI,
					functionName: "removeLiquidityETH",
					args: [
						token?.address ?? zeroAddress,
						parsedLpAmount,
						tokenMin, // amountTokenMin (with slippage)
						ethMin, // amountETHMin (with slippage)
						address,
						deadline,
					],
				});
			}
			// Token + Token
			else {
				txHash = await writeContract({
					address: UNISWAP_V2_ROUTER,
					abi: UNISWAP_V2_ROUTER_ABI,
					functionName: "removeLiquidity",
					args: [
						tokenA?.address ?? zeroAddress,
						tokenB?.address ?? zeroAddress,
						parsedLpAmount,
						amountAMin, // amountAMin (with slippage)
						amountBMin, // amountBMin (with slippage)
						address,
						deadline,
					],
				});
			}

			await publicClient?.waitForTransactionReceipt({
				hash: txHash,
			});

			await refetchLpBalance();

			// Invalidate related queries to refresh data
			queryClient.invalidateQueries({ queryKey: ["positions"] });
		} catch (err) {
			console.error("Error removing liquidity:", err);
			onError("Failed to remove liquidity. Please try again.");
		} finally {
			setIsRemovingLiquidity(false);
		}
	};

	const getButtonText = () => {
		if (!isConnected) return "Connect Wallet";
		if (needsApproval) return "Approve LP Token";
		return "Remove Liquidity";
	};

	const handleButtonClick = () => {
		if (!isConnected) {
			setOpen(true);
			return;
		}

		if (needsApproval) {
			handleApprove();
		} else {
			handleRemoveLiquidity();
		}
	};

	return (
		<div className="space-y-3">
			{pairAddress &&
			pairAddress !== zeroAddress &&
			lpBalance &&
			BigInt(lpBalance.toString()) > 0 ? (
				<>
					<div
						className={`p-4 border ${selectedPosition ? "border-amber-300" : "border-amber-100"} rounded-lg ${selectedPosition ? "bg-amber-50" : "bg-amber-50/50"}`}
					>
						<div className="text-sm text-amber-700 mb-2 font-medium flex items-center">
							Your Position
							{!selectedPosition && (
								<span className="ml-2 px-2 py-0.5 text-xs bg-amber-200 text-amber-800 rounded-full">
									Select from Position Table
								</span>
							)}
						</div>
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<div className="flex -space-x-2">
									{tokenA?.logoURI ? (
										<Image
											src={
												tokenA?.logoURI ||
												"/placeholder.svg"
											}
											alt={tokenA?.symbol}
											width={24}
											height={24}
											className="rounded-full z-10 border-2 border-white"
										/>
									) : (
										<div className="w-6 h-6 rounded-full token-icon flex items-center justify-center z-10 border-2 border-white">
											{tokenA?.symbol.charAt(0)}
										</div>
									)}
									{tokenB?.logoURI ? (
										<Image
											src={
												tokenB.logoURI ||
												"/placeholder.svg"
											}
											alt={tokenB.symbol}
											width={24}
											height={24}
											className="rounded-full border-2 border-white"
										/>
									) : (
										<div className="w-6 h-6 rounded-full token-icon flex items-center justify-center border-2 border-white">
											{tokenB?.symbol.charAt(0)}
										</div>
									)}
								</div>
								<span className="font-medium text-amber-800">
									{tokenA?.symbol}/{tokenB?.symbol}
								</span>
							</div>
							<div className="text-right">
								<div className="text-amber-800 font-medium">
									{formatUnits(
										BigInt(lpBalance.toString()),
										18,
									)}{" "}
									LP Tokens
								</div>
							</div>
						</div>
					</div>

					<div className="space-y-2 bg-amber-50/50 p-4 rounded-lg border border-amber-100">
						<div className="flex justify-between">
							<Label className="text-amber-700">
								Amount to Remove
							</Label>
							<span className="text-amber-800 font-medium">
								{lpTokenPercentage}%
							</span>
						</div>
						<Slider
							min={0}
							max={100}
							step={1}
							value={[lpTokenPercentage]}
							onValueChange={(value) =>
								setLpTokenPercentage(value[0])
							}
						/>
						<div className="text-sm text-right text-amber-700">
							{lpTokenAmount} LP Tokens
						</div>
					</div>

					{gasEstimate && (
						<div className="flex justify-between p-3 bg-amber-50/70 rounded-lg border border-amber-100">
							<div className="flex items-center gap-1.5 text-amber-700">
								<GasIcon className="h-3.5 w-3.5" />
								<span>Estimated Gas</span>
							</div>
							<span className="font-medium text-amber-800">
								{isGasEstimateLoading
									? "Calculating..."
									: gasEstimate}
							</span>
						</div>
					)}

					<div className="pt-3">
						<Button
							className="w-full swap-button text-amber-900 rounded-xl py-6 font-medium text-base"
							onClick={handleButtonClick}
							disabled={
								isRemovingLiquidity ||
								isApproving ||
								lpTokenPercentage === 0
							}
						>
							{isApproving
								? "Approving..."
								: isRemovingLiquidity
									? "Removing Liquidity..."
									: getButtonText()}
						</Button>
					</div>
				</>
			) : (
				<div className="text-center py-12 text-amber-600 bg-amber-50/50 rounded-lg border border-amber-100">
					{!isConnected ? (
						<>
							<p className="mb-4">
								Connect your wallet to view your liquidity
								positions
							</p>
							<Button
								className="swap-button text-amber-900 rounded-xl py-5 px-6 font-medium"
								onClick={() => setOpen(true)}
							>
								Connect Wallet
							</Button>
						</>
					) : (
						"You don't have any liquidity in this pool yet"
					)}
				</div>
			)}
		</div>
	);
}
