"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { TokenInput } from "@/components/swap/token-input";
import type { TokenData } from "@/types/token";
import { Plus, Info } from "lucide-react";
import { useAccount, useWriteContract } from "wagmi";
import {
	UNISWAP_V2_ROUTER,
	UNISWAP_V2_ROUTER_ABI,
	WETH_ADDRESS,
} from "@/lib/constants";
import { parseUnits, zeroAddress } from "viem";
import { useModal } from "connectkit";
import { useTokenAllowance } from "@/hooks/use-token-allowance";
import { usePoolExists } from "@/hooks/use-pool-exists";
import { useProportionalAmounts } from "@/hooks/use-proportional-amounts";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SwapIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

interface AddLiquidityFormProps {
	tokenA: TokenData | undefined;
	tokenB: TokenData | undefined;
	onTokenASelect: (token: TokenData) => void;
	onTokenBSelect: (token: TokenData) => void;
	onError: (error: string | null) => void;
}

export function AddLiquidityForm({
	tokenA,
	tokenB,
	onTokenASelect,
	onTokenBSelect,
	onError,
}: AddLiquidityFormProps) {
	const { address, isConnected } = useAccount();
	const { setOpen } = useModal();
	const [amountA, setAmountA] = useState("");
	const [amountB, setAmountB] = useState("");
	const [isAddingLiquidity, setIsAddingLiquidity] = useState(false);
	const [activeInput, setActiveInput] = useState<"a" | "b">("a");
	const [poolShare, setPoolShare] = useState<string>("0");
	const [isRateInverted, setIsRateInverted] = useState(false);

	// Check if pool exists
	const {
		poolExists,
		reserves,
		token0Address,
		isLoading: isPoolCheckLoading,
	} = usePoolExists(tokenA, tokenB);

	// For existing pools, calculate proportional amounts
	const {
		calculatedAmount: proportionalAmountB,
		isLoading: isProportionalAmountBLoading,
		error: proportionalAmountBError,
	} = useProportionalAmounts(
		tokenA,
		tokenB,
		reserves,
		token0Address,
		amountA,
		true,
	);

	const {
		calculatedAmount: proportionalAmountA,
		isLoading: isProportionalAmountALoading,
		error: proportionalAmountAError,
	} = useProportionalAmounts(
		tokenA,
		tokenB,
		reserves,
		token0Address,
		amountB,
		false,
	);

	const {
		needsApproval: needsApprovalA,
		isApproving: isApprovingA,
		approveToken: approveTokenA,
	} = useTokenAllowance(tokenA, amountA);

	const {
		needsApproval: needsApprovalB,
		isApproving: isApprovingB,
		approveToken: approveTokenB,
	} = useTokenAllowance(tokenB, amountB);

	const { writeContractAsync: writeContract } = useWriteContract();

	// Calculate pool share
	useEffect(() => {
		if (!amountA || !amountB) {
			setPoolShare("0");
			return;
		}

		try {
			// If pool doesn't exist, user will have 100% share
			if (!poolExists || !reserves) {
				setPoolShare("100");
				return;
			}

			const [reserve0, reserve1] = reserves;

			// Determine token order in the pair
			const effectiveTokenA =
				tokenA?.address === zeroAddress
					? WETH_ADDRESS
					: tokenA?.address;
			const isTokenAFirst =
				token0Address?.toLowerCase() === effectiveTokenA?.toLowerCase();

			const reserveA = isTokenAFirst ? reserve0 : reserve1;
			const reserveB = isTokenAFirst ? reserve1 : reserve0;

			const parsedAmountA = parseUnits(amountA, tokenA?.decimals ?? 18);
			const parsedAmountB = parseUnits(amountB, tokenB?.decimals ?? 18);

			// If pool is empty, user will have 100% share
			if (reserveA === 0n && reserveB === 0n) {
				setPoolShare("100");
				return;
			}

			// Calculate liquidity share
			// For an existing pool: min(amountA / (reserveA + amountA), amountB / (reserveB + amountB))
			const shareA =
				Number(parsedAmountA) /
				(Number(reserveA) + Number(parsedAmountA));
			const shareB =
				Number(parsedAmountB) /
				(Number(reserveB) + Number(parsedAmountB));

			const share = Math.min(shareA, shareB) * 100;
			setPoolShare(share.toFixed(4));
		} catch (error) {
			console.error("Error calculating pool share:", error);
			setPoolShare("0");
		}
	}, [amountA, amountB, reserves, tokenA, tokenB, token0Address, poolExists]);

	// Update amounts for existing pools only
	useEffect(() => {
		if (!poolExists) return;

		if (
			activeInput === "a" &&
			amountA &&
			proportionalAmountB &&
			!isProportionalAmountBLoading
		) {
			setAmountB(proportionalAmountB);
		}
	}, [
		activeInput,
		amountA,
		proportionalAmountB,
		isProportionalAmountBLoading,
		poolExists,
	]);

	useEffect(() => {
		if (!poolExists) return;

		if (
			activeInput === "b" &&
			amountB &&
			proportionalAmountA &&
			!isProportionalAmountALoading
		) {
			setAmountA(proportionalAmountA);
		}
	}, [
		activeInput,
		amountB,
		proportionalAmountA,
		isProportionalAmountALoading,
		poolExists,
	]);

	// Handle amount A change
	const handleAmountAChange = (value: string) => {
		setActiveInput("a");
		setAmountA(value);

		// For new pools, we don't auto-update the other field
		if (!poolExists) {
			return;
		}

		if (!value || Number.parseFloat(value) === 0) {
			setAmountB("");
		}
	};

	// Handle amount B change
	const handleAmountBChange = (value: string) => {
		setActiveInput("b");
		setAmountB(value);

		// For new pools, we don't auto-update the other field
		if (!poolExists) {
			return;
		}

		if (!value || Number.parseFloat(value) === 0) {
			setAmountA("");
		}
	};

	const needsApproval = () => {
		// Native ETH doesn't need approval
		if (
			tokenA?.address === zeroAddress &&
			tokenB?.address === zeroAddress
		) {
			return false;
		}

		// Check if tokenA needs approval (if it's not ETH)
		const needsApprovalForA =
			tokenA?.address !== zeroAddress && needsApprovalA;

		// Check if tokenB needs approval (if it's not ETH)
		const needsApprovalForB =
			tokenB?.address !== zeroAddress && needsApprovalB;

		return needsApprovalForA || needsApprovalForB;
	};

	const handleApprove = async () => {
		onError(null);

		try {
			if (tokenA?.address !== zeroAddress && needsApprovalA) {
				await approveTokenA();
			}

			if (tokenB?.address !== zeroAddress && needsApprovalB) {
				await approveTokenB();
			}
		} catch (err) {
			console.error("Error approving tokens:", err);
			onError("Failed to approve tokens. Please try again.");
		}
	};

	const handleAddLiquidity = async () => {
		if (!isConnected || !address) return;

		setIsAddingLiquidity(true);
		onError(null);

		try {
			const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20); // 20 minutes
			const slippageFactor = 0.995; // 0.5% slippage

			// Parse amounts
			const parsedAmountA = parseUnits(amountA, tokenA?.decimals ?? 18);
			const parsedAmountB = parseUnits(amountB, tokenB?.decimals ?? 18);

			// Calculate minimum amounts with slippage
			const amountAMin = BigInt(Number(parsedAmountA) * slippageFactor);
			const amountBMin = BigInt(Number(parsedAmountB) * slippageFactor);

			// ETH + Token
			if (
				tokenA?.address === zeroAddress ||
				tokenB?.address === zeroAddress
			) {
				const ethToken =
					tokenA?.address === zeroAddress ? tokenA : tokenB;
				const token = tokenA?.address === zeroAddress ? tokenB : tokenA;
				const ethAmount =
					tokenA?.address === zeroAddress
						? parsedAmountA
						: parsedAmountB;
				const tokenAmount =
					tokenA?.address === zeroAddress
						? parsedAmountB
						: parsedAmountA;
				const tokenAmountMin =
					tokenA?.address === zeroAddress ? amountBMin : amountAMin;
				const ethAmountMin =
					tokenA?.address === zeroAddress ? amountAMin : amountBMin;

				await writeContract({
					address: UNISWAP_V2_ROUTER as `0x${string}`,
					abi: UNISWAP_V2_ROUTER_ABI,
					functionName: "addLiquidityETH",
					args: [
						token?.address as `0x${string}`,
						tokenAmount,
						tokenAmountMin,
						ethAmountMin,
						address,
						deadline,
					],
					value: ethAmount,
				});
			}
			// Token + Token
			else {
				await writeContract({
					address: UNISWAP_V2_ROUTER as `0x${string}`,
					abi: UNISWAP_V2_ROUTER_ABI,
					functionName: "addLiquidity",
					args: [
						tokenA?.address as `0x${string}`,
						tokenB?.address as `0x${string}`,
						parsedAmountA,
						parsedAmountB,
						amountAMin,
						amountBMin,
						address,
						deadline,
					],
				});
			}

			// Reset form after successful addition
			setAmountA("");
			setAmountB("");
		} catch (err) {
			console.error("Error adding liquidity:", err);
			onError("Failed to add liquidity. Please try again.");
		} finally {
			setIsAddingLiquidity(false);
		}
	};

	const getAddButtonText = () => {
		if (!isConnected) return "Connect Wallet";
		if (!amountA || !amountB) return "Enter amounts";
		if (tokenA?.address === tokenB?.address) return "Cannot add same token";
		if (needsApproval()) return "Approve";

		if (!poolExists) {
			return "Create pool & add liquidity";
		}

		return "Add Liquidity";
	};

	const handleAddButtonClick = () => {
		if (!isConnected) {
			setOpen(true);
			return;
		}

		if (needsApproval()) {
			handleApprove();
		} else {
			handleAddLiquidity();
		}
	};

	const isAddButtonDisabled = () => {
		if (!isConnected) return false;
		if (!amountA || !amountB) return true;
		if (tokenA?.address === tokenB?.address) return true;
		if (
			isProportionalAmountALoading ||
			isProportionalAmountBLoading ||
			isApprovingA ||
			isApprovingB ||
			isAddingLiquidity
		)
			return true;
		return false;
	};

	// Combined error from calculations
	const error = proportionalAmountAError || proportionalAmountBError;
	useEffect(() => {
		if (error) {
			onError(error);
		} else {
			onError(null);
		}
	}, [error, onError]);

	// Toggle rate inversion
	const toggleRateInversion = () => setIsRateInverted(!isRateInverted);

	return (
		<div className="space-y-3">
			{!isPoolCheckLoading && !poolExists && (
				<Alert className="mb-4 bg-amber-50 border-amber-200">
					<Info className="h-4 w-4 text-amber-500" />
					<AlertDescription className="text-amber-800">
						This pool doesn't exist yet. Enter the amounts for both
						tokens to set the initial price.
					</AlertDescription>
				</Alert>
			)}

			<TokenInput
				value={amountA}
				onChange={handleAmountAChange}
				token={tokenA}
				onSelectToken={onTokenASelect}
				isLoading={
					activeInput === "b" &&
					isProportionalAmountALoading &&
					poolExists
				}
			/>

			<div className="flex justify-center my-1">
				<div className="rounded-full bg-amber-50 h-8 w-8 flex items-center justify-center">
					<Plus className="h-4 w-4 text-amber-600" />
				</div>
			</div>

			<TokenInput
				value={amountB}
				onChange={handleAmountBChange}
				token={tokenB}
				onSelectToken={onTokenBSelect}
				isLoading={
					activeInput === "a" &&
					isProportionalAmountBLoading &&
					poolExists
				}
			/>

			<div className="pt-3">
				<Button
					className="w-full swap-button text-amber-900 rounded-xl py-6 font-medium text-base"
					onClick={handleAddButtonClick}
					disabled={isAddButtonDisabled()}
				>
					{isApprovingA || isApprovingB
						? "Approving..."
						: isAddingLiquidity
							? "Adding Liquidity..."
							: getAddButtonText()}
				</Button>
			</div>

			{tokenA && tokenB && amountA && amountB && (
				<div className="mt-3 text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
					<div
						className="flex justify-between items-center cursor-pointer hover:bg-amber-100 p-1 -mx-1 rounded-md transition-colors"
						onClick={toggleRateInversion}
						title="Click to invert rate"
					>
						<div className="flex items-center gap-1.5 text-amber-700">
							<SwapIcon className="h-3.5 w-3.5" />
							<span>Pool Rate</span>
						</div>
						<span className="font-medium text-amber-800">
							{isRateInverted
								? `1 ${tokenB.symbol} = ${(Number.parseFloat(amountA) / Number.parseFloat(amountB)).toFixed(6)} ${tokenA.symbol}`
								: `1 ${tokenA.symbol} = ${(Number.parseFloat(amountB) / Number.parseFloat(amountA)).toFixed(6)} ${tokenB.symbol}`}
						</span>
					</div>
					<div className="flex justify-between mt-1">
						<span>Share of Pool</span>
						<span className="font-medium text-amber-800">
							{poolShare}%
						</span>
					</div>
				</div>
			)}
		</div>
	);
}
