"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { TokenInput } from "@/components/swap/token-input";
import type { TokenData } from "@/types/token";
import { Plus } from "lucide-react";
import { useAccount, useWriteContract } from "wagmi";
import { UNISWAP_V2_ROUTER, UNISWAP_V2_ROUTER_ABI } from "@/lib/constants";
import { parseUnits, zeroAddress } from "viem";
import { useModal } from "connectkit";
import { useTokenPrice } from "@/hooks/use-token-price";
import { useTokenAllowance } from "@/hooks/use-token-allowance";

interface AddLiquidityFormProps {
	tokenA: TokenData;
	tokenB: TokenData;
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

	// Custom hooks for price calculation
	// When user inputs token A amount, we calculate token B amount
	const {
		price: priceB,
		isLoading: isPriceBLoading,
		error: priceBError,
	} = useTokenPrice(tokenA, tokenB, amountA, "from");

	// When user inputs token B amount, we calculate token A amount
	const {
		price: priceA,
		isLoading: isPriceALoading,
		error: priceAError,
	} = useTokenPrice(tokenB, tokenA, amountB, "from");

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

	// Update amounts when price changes
	useEffect(() => {
		if (activeInput === "a" && amountA && priceB && !isPriceBLoading) {
			setAmountB(priceB);
		}
	}, [activeInput, amountA, priceB, isPriceBLoading]);

	useEffect(() => {
		if (activeInput === "b" && amountB && priceA && !isPriceALoading) {
			setAmountA(priceA);
		}
	}, [activeInput, amountB, priceA, isPriceALoading]);

	// Handle amount A change
	const handleAmountAChange = (value: string) => {
		setActiveInput("a");
		setAmountA(value);
		if (!value || Number.parseFloat(value) === 0) {
			setAmountB("");
		}
	};

	// Handle amount B change
	const handleAmountBChange = (value: string) => {
		setActiveInput("b");
		setAmountB(value);
		if (!value || Number.parseFloat(value) === 0) {
			setAmountA("");
		}
	};

	const needsApproval = () => {
		return needsApprovalA || needsApprovalB;
	};

	const handleApprove = async () => {
		onError(null);

		try {
			if (needsApprovalA) {
				await approveTokenA();
			}

			if (needsApprovalB) {
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
			const parsedAmountA = parseUnits(amountA, tokenA.decimals);
			const parsedAmountB = parseUnits(amountB, tokenB.decimals);

			// Calculate minimum amounts with slippage
			const amountAMin = BigInt(Number(parsedAmountA) * slippageFactor);
			const amountBMin = BigInt(Number(parsedAmountB) * slippageFactor);

			// ETH + Token
			if (
				tokenA.address === zeroAddress ||
				tokenB.address === zeroAddress
			) {
				const ethToken =
					tokenA.address === zeroAddress ? tokenA : tokenB;
				const token = tokenA.address === zeroAddress ? tokenB : tokenA;
				const ethAmount =
					tokenA.address === zeroAddress
						? parsedAmountA
						: parsedAmountB;
				const tokenAmount =
					tokenA.address === zeroAddress
						? parsedAmountB
						: parsedAmountA;
				const tokenAmountMin =
					tokenA.address === zeroAddress ? amountBMin : amountAMin;
				const ethAmountMin =
					tokenA.address === zeroAddress ? amountAMin : amountBMin;

				await writeContract({
					address: UNISWAP_V2_ROUTER,
					abi: UNISWAP_V2_ROUTER_ABI,
					functionName: "addLiquidityETH",
					args: [
						token.address,
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
					address: UNISWAP_V2_ROUTER,
					abi: UNISWAP_V2_ROUTER_ABI,
					functionName: "addLiquidity",
					args: [
						tokenA.address,
						tokenB.address,
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
		if (tokenA.address === tokenB.address) return "Cannot add same token";
		if (needsApproval()) return "Approve";
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
		if (tokenA.address === tokenB.address) return true;
		if (
			isPriceALoading ||
			isPriceBLoading ||
			isApprovingA ||
			isApprovingB ||
			isAddingLiquidity
		)
			return true;
		return false;
	};

	// Combined error from price calculations
	const error = priceAError || priceBError;
	useEffect(() => {
		if (error) {
			onError(error);
		}
	}, [error, onError]);

	return (
		<div className="space-y-3">
			<TokenInput
				value={amountA}
				onChange={handleAmountAChange}
				token={tokenA}
				onSelectToken={onTokenASelect}
				isLoading={activeInput === "b" && isPriceALoading}
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
				isLoading={activeInput === "a" && isPriceBLoading}
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
					<div className="flex justify-between">
						<span>Pool Rate</span>
						<span className="font-medium text-amber-800">
							1 {tokenA.symbol} ={" "}
							{(
								Number.parseFloat(amountB) /
								Number.parseFloat(amountA)
							).toFixed(6)}{" "}
							{tokenB.symbol}
						</span>
					</div>
					<div className="flex justify-between mt-1">
						<span>Share of Pool</span>
						<span className="font-medium text-amber-800">
							0.01%
						</span>
					</div>
				</div>
			)}
		</div>
	);
}
