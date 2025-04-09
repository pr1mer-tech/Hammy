"use client";

import { useState } from "react";
import type { TokenData } from "@/types/token";
import { SwapIcon, SlippageIcon, GasIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

interface SwapDetailsProps {
	tokenFrom: TokenData;
	tokenTo: TokenData;
	amountFrom: string;
	amountTo: string;
	slippage: number;
	gasEstimate: string | null;
	isGasLoading: boolean;
	priceImpact?: number;
}

export function SwapDetails({
	tokenFrom,
	tokenTo,
	amountFrom,
	amountTo,
	slippage,
	gasEstimate,
	isGasLoading,
	priceImpact = 0,
}: SwapDetailsProps) {
	// State to track if rate is inverted
	const [isRateInverted, setIsRateInverted] = useState(false);

	// Calculate normal and inverted rates
	const normalRate =
		Number.parseFloat(amountTo) / Number.parseFloat(amountFrom);
	const invertedRate =
		Number.parseFloat(amountFrom) / Number.parseFloat(amountTo);

	// Toggle rate inversion
	const toggleRateInversion = () => setIsRateInverted(!isRateInverted);

	// Get price impact color
	const getPriceImpactColor = (impact: number) => {
		if (impact < 1) return "text-green-600";
		if (impact < 3) return "text-amber-600";
		if (impact < 5) return "text-orange-600";
		return "text-red-600";
	};

	return (
		<div className="mt-3 text-sm bg-amber-50 rounded-lg p-3 space-y-2">
			<div
				className="flex justify-between items-center cursor-pointer hover:bg-amber-100 p-1 -mx-1 rounded-md transition-colors"
				onClick={toggleRateInversion}
				title="Click to invert rate"
			>
				<div className="flex items-center gap-1.5 text-amber-700">
					<SwapIcon className="h-3.5 w-3.5" />
					<span>Rate</span>
				</div>
				<span className="font-medium text-amber-800">
					{isRateInverted
						? `1 ${tokenTo.symbol} = ${invertedRate.toFixed(6)} ${tokenFrom.symbol}`
						: `1 ${tokenFrom.symbol} = ${normalRate.toFixed(6)} ${tokenTo.symbol}`}
				</span>
			</div>

			<div className="flex justify-between items-center">
				<div className="flex items-center gap-1.5 text-amber-700">
					<SlippageIcon className="h-3.5 w-3.5" />
					<span>Slippage Tolerance</span>
				</div>
				<span className="font-medium text-amber-800">{slippage}%</span>
			</div>

			<div className="flex justify-between items-center">
				<div className="flex items-center gap-1.5 text-amber-700">
					<GasIcon className="h-3.5 w-3.5" />
					<span>Network Fee</span>
				</div>
				<span className="font-medium text-amber-800">
					{isGasLoading ? "Calculating..." : gasEstimate || "Unknown"}
				</span>
			</div>

			<div className="flex justify-between items-center">
				<div className="flex items-center gap-1.5 text-amber-700">
					<svg
						className="h-3.5 w-3.5"
						viewBox="0 0 24 24"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
						<path
							d="M8 12L12 16L16 12"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
						<path
							d="M12 8V16"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
					<span>Price Impact</span>
				</div>
				<span
					className={cn(
						"font-medium",
						getPriceImpactColor(priceImpact),
					)}
				>
					{priceImpact < 0.01
						? "<0.01%"
						: `${priceImpact.toFixed(2)}%`}
				</span>
			</div>
		</div>
	);
}
