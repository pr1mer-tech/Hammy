"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
	useAccount,
	useBalance,
	useReadContract,
	useWriteContract,
} from "wagmi";
import { TokenInput } from "@/components/token-input";
import { ArrowDown, Settings, AlertCircle } from "lucide-react";
import type { TokenData } from "@/lib/types";
import { ETH, USDC } from "@/lib/tokens";
import {
	UNISWAP_V2_ROUTER_ABI,
	UNISWAP_V2_ROUTER,
	ERC20_ABI,
} from "@/lib/constants";
import { formatUnits, parseUnits, zeroAddress } from "viem";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

export function SwapCard() {
	const { address, isConnected } = useAccount();
	const [tokenFrom, setTokenFrom] = useState<TokenData>(ETH);
	const [tokenTo, setTokenTo] = useState<TokenData>(USDC);
	const [amountFrom, setAmountFrom] = useState("");
	const [amountTo, setAmountTo] = useState("");
	const [slippage, setSlippage] = useState(0.5);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [isCalculating, setIsCalculating] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isApproving, setIsApproving] = useState(false);
	const [isSwapping, setIsSwapping] = useState(false);
	const [swapPath, setSwapPath] = useState<string[]>([]);

	// WETH constant
	const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

	const { data: balanceData } = useBalance({
		address,
		token:
			tokenFrom.address === zeroAddress
				? undefined
				: (tokenFrom.address as `0x${string}`),
	});

	const { writeContractAsync: writeContract } = useWriteContract();

	// Get allowance for ERC20 tokens
	const { data: allowance, refetch: refetchAllowance } = useReadContract({
		address: tokenFrom.address as `0x${string}`,
		abi: ERC20_ABI,
		functionName: "allowance",
		args: [address || zeroAddress, UNISWAP_V2_ROUTER],
		query: {
			enabled:
				isConnected && tokenFrom.address !== zeroAddress && !!address,
		},
	});

	// Determine the correct path for the swap
	const getSwapPath = () => {
		// If either token is ETH, we need to use WETH in the path
		if (tokenFrom.address === zeroAddress) {
			return [
				WETH_ADDRESS,
				tokenTo.address === zeroAddress
					? WETH_ADDRESS
					: tokenTo.address,
			];
		}
		if (tokenTo.address === zeroAddress) {
			return [tokenFrom.address, WETH_ADDRESS];
		}

		// Try direct path first
		const directPath = [tokenFrom.address, tokenTo.address];

		// If direct path doesn't have liquidity, try through WETH
		const wethPath = [tokenFrom.address, WETH_ADDRESS, tokenTo.address];

		// For simplicity, we'll use the direct path for now
		// In a production app, you should check if the pair has liquidity
		return directPath;
	};

	// Update swap path when tokens change
	useEffect(() => {
		setSwapPath(getSwapPath());
	}, [tokenFrom.address, tokenTo.address]);

	// Get amounts out from Uniswap V2 Router
	const { data: amountsOut, refetch: refetchAmountsOut } = useReadContract({
		address: UNISWAP_V2_ROUTER,
		abi: UNISWAP_V2_ROUTER_ABI,
		functionName: "getAmountsOut",
		args: [
			amountFrom && Number.parseFloat(amountFrom) > 0
				? parseUnits(amountFrom, tokenFrom.decimals)
				: parseUnits("1", tokenFrom.decimals),
			swapPath,
		],
		query: {
			enabled:
				isConnected &&
				!!tokenFrom.address &&
				!!tokenTo.address &&
				tokenFrom.address !== tokenTo.address &&
				swapPath.length >= 2,
		},
	});

	// Calculate output amount based on Uniswap V2 quotes
	useEffect(() => {
		const calculateSwap = async () => {
			if (!amountFrom || Number.parseFloat(amountFrom) === 0) {
				setAmountTo("");
				return;
			}

			setIsCalculating(true);
			setError(null);

			try {
				if (amountsOut && amountsOut.length >= 2) {
					const outputAmount = formatUnits(
						amountsOut[amountsOut.length - 1],
						tokenTo.decimals,
					);
					setAmountTo(outputAmount);
				} else {
					await refetchAmountsOut();
				}
			} catch (err) {
				console.error("Error calculating swap:", err);
				setError("Failed to calculate swap. Please try again.");
				setAmountTo("");
			} finally {
				setIsCalculating(false);
			}
		};

		calculateSwap();
	}, [
		amountFrom,
		tokenFrom,
		tokenTo,
		amountsOut,
		refetchAmountsOut,
		swapPath,
	]);

	const handleSwapTokens = () => {
		setTokenFrom(tokenTo);
		setTokenTo(tokenFrom);
		setAmountFrom(amountTo);
		setAmountTo(amountFrom);
	};

	const needsApproval = () => {
		if (!isConnected || !address || tokenFrom.address === zeroAddress) {
			return false;
		}

		if (!allowance || !amountFrom) {
			return false;
		}

		try {
			const parsedAllowance = BigInt(allowance.toString());
			const parsedAmount = parseUnits(amountFrom, tokenFrom.decimals);
			return parsedAllowance < parsedAmount;
		} catch (err) {
			console.error("Error checking approval:", err);
			return false;
		}
	};

	const handleApprove = async () => {
		if (!isConnected || !address) return;

		setIsApproving(true);
		setError(null);

		try {
			const parsedAmount = parseUnits(amountFrom, tokenFrom.decimals);

			await writeContract({
				address: tokenFrom.address as `0x${string}`,
				abi: ERC20_ABI,
				functionName: "approve",
				args: [UNISWAP_V2_ROUTER, parsedAmount],
			});

			await refetchAllowance();
		} catch (err) {
			console.error("Error approving token:", err);
			setError("Failed to approve token. Please try again.");
		} finally {
			setIsApproving(false);
		}
	};

	const handleSwap = async () => {
		if (!isConnected || !address) return;

		setError(null);
		setIsSwapping(true);

		try {
			const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20); // 20 minutes
			const parsedAmountIn = parseUnits(amountFrom, tokenFrom.decimals);

			// Calculate minimum output with slippage
			const minOutputAmount =
				Number.parseFloat(amountTo) * (1 - slippage / 100);
			const parsedAmountOutMin = parseUnits(
				minOutputAmount.toFixed(tokenTo.decimals),
				tokenTo.decimals,
			);

			// ETH -> Token
			if (tokenFrom.address === zeroAddress) {
				await writeContract({
					address: UNISWAP_V2_ROUTER,
					abi: UNISWAP_V2_ROUTER_ABI,
					functionName: "swapExactETHForTokens",
					args: [
						parsedAmountOutMin,
						[WETH_ADDRESS, tokenTo.address],
						address,
						deadline,
					],
					value: parsedAmountIn,
				});
			}
			// Token -> ETH
			else if (tokenTo.address === zeroAddress) {
				await writeContract({
					address: UNISWAP_V2_ROUTER,
					abi: UNISWAP_V2_ROUTER_ABI,
					functionName: "swapExactTokensForETH",
					args: [
						parsedAmountIn,
						parsedAmountOutMin,
						[tokenFrom.address, WETH_ADDRESS],
						address,
						deadline,
					],
				});
			}
			// Token -> Token
			else {
				await writeContract({
					address: UNISWAP_V2_ROUTER,
					abi: UNISWAP_V2_ROUTER_ABI,
					functionName: "swapExactTokensForTokens",
					args: [
						parsedAmountIn,
						parsedAmountOutMin,
						swapPath,
						address,
						deadline,
					],
				});
			}

			// Reset form after successful swap
			setAmountFrom("");
			setAmountTo("");
		} catch (err) {
			console.error("Error executing swap:", err);

			// Provide more specific error messages
			if (err.message?.includes("INSUFFICIENT_OUTPUT_AMOUNT")) {
				setError(
					"Swap failed: Insufficient output amount. Try increasing slippage tolerance.",
				);
			} else if (err.message?.includes("EXCESSIVE_INPUT_AMOUNT")) {
				setError("Swap failed: Excessive input amount for this pool.");
			} else if (err.message?.includes("EXPIRED")) {
				setError(
					"Swap failed: Transaction deadline expired. Please try again.",
				);
			} else if (err.message?.includes("rejected")) {
				setError("Transaction rejected by user.");
			} else {
				setError("Failed to execute swap. Please try again.");
			}
		} finally {
			setIsSwapping(false);
		}
	};

	const getButtonText = () => {
		if (!isConnected) return "Connect Wallet";
		if (!amountFrom || !amountTo) return "Enter an amount";
		if (needsApproval()) return "Approve";
		if (isSwapping) return "Swapping...";
		return "Swap";
	};

	const handleButtonClick = () => {
		if (!isConnected) return;
		if (needsApproval()) {
			handleApprove();
		} else {
			handleSwap();
		}
	};

	const isButtonDisabled = () => {
		if (!isConnected) return false;
		if (!amountFrom || !amountTo) return true;
		if (isCalculating || isApproving || isSwapping) return true;

		// Check if user has sufficient balance
		if (balanceData) {
			const userBalance = parseFloat(balanceData.formatted);
			const inputAmount = parseFloat(amountFrom);
			if (inputAmount > userBalance) return true;
		}

		return false;
	};

	return (
		<Card className="card-gradient rounded-2xl border-0 overflow-hidden">
			<CardContent className="p-5">
				<div className="flex justify-between items-center mb-4">
					<h2 className="text-xl font-semibold text-blue-800">
						Swap
					</h2>
					<Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
						<PopoverTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
							>
								<Settings className="h-5 w-5" />
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-80 card-gradient border-0">
							<div className="space-y-4">
								<h3 className="font-medium text-blue-800">
									Transaction Settings
								</h3>
								<div className="space-y-2">
									<div className="flex justify-between">
										<Label
											htmlFor="slippage"
											className="text-blue-700"
										>
											Slippage Tolerance
										</Label>
										<span className="text-blue-600 font-medium">
											{slippage}%
										</span>
									</div>
									<Slider
										id="slippage"
										min={0.1}
										max={5}
										step={0.1}
										value={[slippage]}
										onValueChange={(value) =>
											setSlippage(value[0])
										}
										className="[&>span]:bg-blue-600"
									/>
								</div>
							</div>
						</PopoverContent>
					</Popover>
				</div>

				{error && (
					<Alert
						variant="destructive"
						className="mb-4 bg-red-50 border-red-200"
					>
						<AlertCircle className="h-4 w-4" />
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}

				<div className="space-y-3">
					<TokenInput
						value={amountFrom}
						onChange={setAmountFrom}
						token={tokenFrom}
						onSelectToken={setTokenFrom}
						label="From"
						balance={balanceData?.formatted}
						symbol={balanceData?.symbol}
					/>

					<div className="flex justify-center my-1">
						<Button
							variant="ghost"
							size="icon"
							onClick={handleSwapTokens}
							className="rounded-full bg-blue-50 hover:bg-blue-100 h-8 w-8 text-blue-600"
						>
							<ArrowDown className="h-4 w-4" />
						</Button>
					</div>

					<TokenInput
						value={amountTo}
						onChange={setAmountTo}
						token={tokenTo}
						onSelectToken={setTokenTo}
						label="To (estimated)"
						isLoading={isCalculating}
					/>

					<div className="pt-3">
						<Button
							className="w-full swap-button text-white rounded-xl py-6 font-medium text-base"
							onClick={handleButtonClick}
							disabled={isButtonDisabled()}
						>
							{getButtonText()}
						</Button>
					</div>

					{tokenFrom && tokenTo && amountFrom && amountTo && (
						<div className="mt-3 text-sm text-blue-700 bg-blue-50 rounded-lg p-3">
							<div className="flex justify-between">
								<span>Rate</span>
								<span className="font-medium">
									1 {tokenFrom.symbol} ≈{" "}
									{(
										Number.parseFloat(amountTo) /
										Number.parseFloat(amountFrom)
									).toFixed(6)}{" "}
									{tokenTo.symbol}
								</span>
							</div>
							<div className="flex justify-between mt-1">
								<span>Slippage Tolerance</span>
								<span className="font-medium">{slippage}%</span>
							</div>
							{swapPath.length > 2 && (
								<div className="flex justify-between mt-1">
									<span>Route</span>
									<span className="font-medium">
										{tokenFrom.symbol} → WETH →{" "}
										{tokenTo.symbol}
									</span>
								</div>
							)}
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
