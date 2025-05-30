"use client";

import { useState, useEffect } from "react"; // Add useEffect import
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAccount } from "wagmi";
import { TokenInput } from "@/components/swap/token-input";
import { ArrowDown, Settings, AlertCircle, AlertTriangle } from "lucide-react";
import type { TokenData } from "@/types/token";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SlippageSettings } from "@/components/swap/slippage-settings";
import { SwapDetails } from "@/components/swap/swap-details";
import { useTokenPrice } from "@/hooks/use-token-price";
import { useTokenAllowance } from "@/hooks/use-token-allowance";
import { useSwap } from "@/hooks/use-swap";
import { useGasEstimate } from "@/hooks/use-gas-estimate";
import { usePriceImpact } from "@/hooks/use-price-impact";
import { useModal } from "connectkit";
import { useTokenList } from "@/providers/token-list-provider";
import { areTokensIdentical, getTokenPairError, isXRPWXRPSwap } from "@/lib/utils";
import { zeroAddress } from "viem";

export function SwapContainer() {
	const { address } = useAccount();
	const isConnected = address !== undefined;
	const { setOpen } = useModal();
	const { tokens } = useTokenList();
	const [tokenFrom, setTokenFrom] = useState<TokenData | undefined>(
		tokens[0],
	);
	const [tokenTo, setTokenTo] = useState<TokenData | undefined>(tokens[1]);
	const [amountFrom, setAmountFrom] = useState("");
	const [amountTo, setAmountTo] = useState("");
	const [slippage, setSlippage] = useState(0.5);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [activeInput, setActiveInput] = useState<"from" | "to">("from");

	useEffect(() => {
		setTokenFrom(tokens[0]);
		setTokenTo(tokens[1]);
	}, [tokens[0], tokens[1]]);

	// Check for invalid token pairs
	const tokenPairError = getTokenPairError(tokenFrom, tokenTo, 'swap');
	const isInvalidPair = areTokensIdentical(tokenFrom, tokenTo);
	const isWrapUnwrapSwap = isXRPWXRPSwap(tokenFrom, tokenTo);

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
	const error = priceError || approvalError || swapError || priceImpactError || tokenPairError;

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
		else if (
			activeInput === "from" &&
			amountFrom &&
			(!price || priceError)
		) {
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
		if (token.address === tokenTo?.address) {
			// Swap tokens if user selects the same token
			setTokenTo(tokenFrom);
		}
		setTokenFrom(token);
	};

	const handleTokenToSelect = (token: TokenData) => {
		if (token.address === tokenFrom?.address) {
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

	// Handle swap execution
	const handleSwap = () => {
		if (!isConnected) {
			setOpen(true);
			return;
		}

		if (isInvalidPair) {
			return; // Do nothing for invalid pairs
		}

		// For XRP/WXRP swaps, no approval needed
		if (isWrapUnwrapSwap) {
			if (amountFrom && amountTo && tokenFrom && tokenTo) {
				executeSwap(tokenFrom, tokenTo, amountFrom, amountTo, slippage);
			}
			return;
		}

		if (needsApproval) {
			approveToken();
			return;
		}

		if (amountFrom && amountTo && tokenFrom && tokenTo) {
			executeSwap(tokenFrom, tokenTo, amountFrom, amountTo, slippage);
		}
	};

	const getSwapButtonText = () => {
		if (!isConnected) return "Connect Wallet";
		if (!tokenFrom || !tokenTo) return "Select tokens";
		if (isInvalidPair) return tokenPairError || "Invalid token pair";
		if (!amountFrom || Number.parseFloat(amountFrom) === 0)
			return "Enter amount";
		if (needsApproval && !isWrapUnwrapSwap) return `Approve ${tokenFrom.symbol}`;
		if (isWrapUnwrapSwap) {
			return tokenFrom.address === zeroAddress ? "Wrap XRP" : "Unwrap WXRP";
		}
		return "Swap";
	};

	const isSwapDisabled = () => {
		return (
			!amountFrom ||
			Number.parseFloat(amountFrom) === 0 ||
			!tokenFrom ||
			!tokenTo ||
			isInvalidPair ||
			isSwapping ||
			(isApproving && !isWrapUnwrapSwap) ||
			(!!priceError && !isWrapUnwrapSwap)
		);
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

				{/* Settings panel */}
				{settingsOpen && (
					<SlippageSettings
						open={settingsOpen}
						onOpenChangeAction={setSettingsOpen}
						slippage={slippage}
						onSlippageChangeAction={setSlippage}
					/>
				)}

				{/* XRP/WXRP wrap info */}
				{isWrapUnwrapSwap && (
					<Alert className="bg-blue-50 border-blue-200">
						<AlertCircle className="h-4 w-4 text-blue-500" />
						<AlertDescription className="text-blue-800">
							<strong>Wrap/Unwrap:</strong> {tokenFrom?.symbol} → {tokenTo?.symbol}
							<br />
							<span className="text-blue-600 text-sm mt-1 block">
								💡 This will directly {tokenFrom?.address === zeroAddress ? 'wrap XRP to WXRP' : 'unwrap WXRP to XRP'} at 1:1 ratio.
							</span>
						</AlertDescription>
					</Alert>
				)}

				{/* Invalid pair warning - only for identical tokens */}
				{isInvalidPair && (
					<Alert className="bg-red-50 border-red-200">
						<AlertTriangle className="h-4 w-4 text-red-500" />
						<AlertDescription className="text-red-800">
							<strong>Invalid Swap:</strong> {tokenPairError}
						</AlertDescription>
					</Alert>
				)}

				{/* Error alert */}
				{error && !isInvalidPair && !isWrapUnwrapSwap && (
					<Alert className="bg-red-50 border-red-200">
						<AlertCircle className="h-4 w-4 text-red-500" />
						<AlertDescription className="text-red-800">
							{error}
						</AlertDescription>
					</Alert>
				)}

				{/* Token inputs */}
				<TokenInput
					value={amountFrom}
					onChange={handleAmountFromChange}
					token={tokenFrom}
					onSelectToken={handleTokenFromSelect}
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
					isLoading={activeInput === "from" && isPriceLoading}
				/>

				{/* Swap details */}
				{tokenFrom &&
					tokenTo &&
					amountFrom &&
					amountTo &&
					!isPriceLoading &&
					!isInvalidPair && (
						<SwapDetails
							tokenFrom={tokenFrom}
							tokenTo={tokenTo}
							amountFrom={amountFrom}
							amountTo={amountTo}
							slippage={slippage}
							gasEstimate={gasEstimate}
							isGasLoading={isGasLoading || false}
							priceImpact={priceImpact}
						/>
					)}

				{/* Swap button */}
				<Button
					className="w-full swap-button text-amber-900 rounded-xl py-6 font-medium text-base"
					onClick={handleSwap}
					disabled={isSwapDisabled()}
				>
					{isApproving
						? "Approving..."
						: isSwapping
							? "Swapping..."
							: getSwapButtonText()}
				</Button>
			</CardContent>
		</Card>
	);
}
