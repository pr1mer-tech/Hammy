"use client";

import { useState, useEffect } from "react"; // Add useEffect import
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAccount } from "wagmi";
import { TokenInput } from "@/components/swap/token-input";
import { ArrowDown, Settings, AlertCircle } from "lucide-react";
import type { TokenData } from "@/types/token";
import { ETH, USDC } from "@/lib/tokens";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SlippageSettings } from "@/components/swap/slippage-settings";
import { SwapDetails } from "@/components/swap/swap-details";
import { useTokenPrice } from "@/hooks/use-token-price";
import { useTokenAllowance } from "@/hooks/use-token-allowance";
import { useSwap } from "@/hooks/use-swap";
import { useGasEstimate } from "@/hooks/use-gas-estimate";
import { usePriceImpact } from "@/hooks/use-price-impact";
import { useModal } from "connectkit";

export function SwapContainer() {
	const { address } = useAccount();
	const isConnected = address !== undefined;
	const { setOpen } = useModal();
	const [tokenFrom, setTokenFrom] = useState<TokenData>(ETH);
	const [tokenTo, setTokenTo] = useState<TokenData>(USDC);
	const [amountFrom, setAmountFrom] = useState("");
	const [amountTo, setAmountTo] = useState("");
	const [slippage, setSlippage] = useState(0.5);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [activeInput, setActiveInput] = useState<"from" | "to">("from");

	// Custom hooks
	const {
		price,
		isLoading: isPriceLoading,
		error: priceError,
	} = useTokenPrice(
		tokenFrom,
		tokenTo,
		activeInput === "from" ? amountFrom : amountTo,
		activeInput,
	);
	const {
		needsApproval,
		isApproving,
		error: approvalError,
		approveToken,
	} = useTokenAllowance(tokenFrom, amountFrom);
	const { isSwapping, error: swapError, executeSwap } = useSwap();
	const { gasEstimate, isLoading: isGasLoading } = useGasEstimate(
		tokenFrom,
		tokenTo,
		amountFrom,
		amountTo,
	);
	const { priceImpact, error: priceImpactError } = usePriceImpact(
		tokenFrom,
		tokenTo,
		amountFrom,
		amountTo,
	);

	// Combine all errors
	const error = priceError || approvalError || swapError || priceImpactError;

	// Update amounts when price changes
	useEffect(() => {
		// Skip updates while loading
		if (isPriceLoading) {
			return;
		}

		// When "from" input is active and we have values
		if (activeInput === "from" && amountFrom && price) {
			setAmountTo(price);
		}
		// When "to" input is active and we have values
		else if (activeInput === "to" && amountTo && price) {
			setAmountFrom(price);
		}
		// When "from" is active but price can't be calculated
		else if (activeInput === "from" && amountFrom && (!price || priceError)) {
			setAmountTo("");
		}
		// When "to" is active but price can't be calculated
		else if (activeInput === "to" && amountTo && (!price || priceError)) {
			setAmountFrom("");
		}
	}, [activeInput, amountFrom, amountTo, price, isPriceLoading, priceError]);

	// Handle amount from change
	const handleAmountFromChange = (value: string) => {
		setActiveInput("from");
		setAmountFrom(value);
		if (!value || Number.parseFloat(value) === 0) {
			setAmountTo("");
		}
	};

	// Handle amount to change
	const handleAmountToChange = (value: string) => {
		setActiveInput("to");
		setAmountTo(value);
		if (!value || Number.parseFloat(value) === 0) {
			setAmountFrom("");
		}
	};

	// Handle token selection
	const handleTokenFromSelect = (token: TokenData) => {
		if (token.address === tokenTo.address) {
			// Swap tokens if user selects the same token
			setTokenTo(tokenFrom);
		}
		setTokenFrom(token);
	};

	const handleTokenToSelect = (token: TokenData) => {
		if (token.address === tokenFrom.address) {
			// Swap tokens if user selects the same token
			setTokenFrom(tokenTo);
		}
		setTokenTo(token);
	};

	const handleSwapTokens = () => {
		setTokenFrom(tokenTo);
		setTokenTo(tokenFrom);
		setAmountFrom(amountTo);
		setAmountTo(amountFrom);
	};

	const handleButtonClick = () => {
		if (!isConnected) {
			setOpen(true);
			return;
		}

		if (needsApproval) {
			approveToken();
		} else {
			executeSwap(tokenFrom, tokenTo, amountFrom, amountTo, slippage);
		}
	};

	const getButtonText = () => {
		if (!isConnected) return "Connect Wallet";
		if (!amountFrom || !amountTo) return "Enter an amount";
		if (tokenFrom.address === tokenTo.address)
			return "Cannot swap same token";
		if (needsApproval) return "Approve";
		return "Swap";
	};

	const isButtonDisabled = () => {
		if (!isConnected) return false;
		if (!amountFrom || !amountTo) return true;
		if (tokenFrom.address === tokenTo.address) return true;
		if (isPriceLoading || isApproving || isSwapping) return true;
		return false;
	};

	return (
		<Card className="card-gradient rounded-2xl border-0 overflow-hidden">
			<CardContent className="p-5">
				<div className="flex justify-between items-center mb-4">
					<h2 className="text-xl font-semibold text-amber-800">
						Swap
					</h2>
					<Button
						variant="ghost"
						size="icon"
						className="text-amber-600 hover:text-amber-800 hover:bg-amber-50"
						onClick={() => setSettingsOpen(true)}
					>
						<Settings className="h-5 w-5" />
					</Button>
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
						onChange={handleAmountFromChange}
						token={tokenFrom}
						onSelectToken={handleTokenFromSelect}
						label="From"
						isLoading={activeInput === "to" && isPriceLoading}
					/>

					<div className="flex justify-center my-1">
						<Button
							variant="ghost"
							size="icon"
							onClick={handleSwapTokens}
							className="rounded-full bg-amber-50 hover:bg-amber-100 h-8 w-8 text-amber-600"
						>
							<ArrowDown className="h-4 w-4" />
						</Button>
					</div>

					<TokenInput
						value={amountTo}
						onChange={handleAmountToChange}
						token={tokenTo}
						onSelectToken={handleTokenToSelect}
						label="To (estimated)"
						isLoading={activeInput === "from" && isPriceLoading}
					/>

					<div className="pt-3">
						<Button
							className="w-full swap-button text-amber-900 rounded-xl py-6 font-medium text-base"
							onClick={handleButtonClick}
							disabled={isButtonDisabled()}
						>
							{isApproving
								? "Approving..."
								: isSwapping
									? "Swapping..."
									: getButtonText()}
						</Button>
					</div>

					{tokenFrom && tokenTo && amountFrom && amountTo && (
						<SwapDetails
							tokenFrom={tokenFrom}
							tokenTo={tokenTo}
							amountFrom={amountFrom}
							amountTo={amountTo}
							slippage={slippage}
							gasEstimate={gasEstimate}
							isGasLoading={isGasLoading}
							priceImpact={priceImpact}
						/>
					)}
				</div>
			</CardContent>

			<SlippageSettings
				open={settingsOpen}
				onOpenChangeAction={setSettingsOpen}
				slippage={slippage}
				onSlippageChangeAction={setSlippage}
			/>
		</Card>
	);
}
