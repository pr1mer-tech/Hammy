"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown } from "lucide-react";
import type { TokenData } from "@/types/token";
import { TokenSelector } from "@/components/swap/token-selector";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import { useAccount, useBalance } from "wagmi";
import { zeroAddress } from "viem";

interface TokenInputProps {
	value: string;
	onChange: (value: string) => void;
	token: TokenData | undefined;
	onSelectToken: (token: TokenData) => void;
	label?: string;
	isLoading?: boolean;
}

export function TokenInput({
	value,
	onChange,
	token,
	onSelectToken,
	label,
	isLoading = false,
}: TokenInputProps) {
	const [open, setOpen] = useState(false);
	const { address, isConnected } = useAccount();

	// Get token balance
	const { data: balanceData } = useBalance({
		address,
		token:
			token?.address === zeroAddress
				? undefined
				: (token?.address as `0x${string}`),
		query: {
			enabled: isConnected && !!address,
		},
	});

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		// Only allow numbers and decimals
		if (value === "" || /^[0-9]*[.,]?[0-9]*$/.test(value)) {
			onChange(value);
		}
	};

	const handleMaxClick = () => {
		if (balanceData?.formatted) {
			onChange(balanceData.formatted);
		}
	};

	return (
		<div className="rounded-xl card-gradient p-4 border border-amber-100">
			<div className="flex justify-between mb-2">
				{label && <div className="text-sm text-amber-700">{label}</div>}
				{isConnected && balanceData && (
					<div className="flex items-center gap-1">
						<span className="text-xs text-amber-600">
							Balance:{" "}
							{Number.parseFloat(balanceData.formatted).toFixed(
								6,
							)}{" "}
							{balanceData.symbol}
						</span>
						<Button
							variant="ghost"
							size="sm"
							className="h-5 text-xs px-2 py-0 text-amber-600 hover:text-amber-800 hover:bg-amber-50"
							onClick={handleMaxClick}
						>
							MAX
						</Button>
					</div>
				)}
			</div>
			<div className="flex items-center gap-2">
				<Button
					variant="outline"
					className="flex items-center gap-2 px-3 h-10 border-amber-100 hover:border-amber-200 hover:bg-amber-50"
					onClick={() => setOpen(true)}
				>
					{token?.logoURI ? (
						<Image
							src={token.logoURI || "/placeholder.svg"}
							alt={token.symbol}
							width={24}
							height={24}
							className="rounded-full ml-2"
						/>
					) : (
						<div className="w-6 h-6 rounded-full token-icon flex items-center justify-center">
							{token?.symbol.charAt(0)}
						</div>
					)}
					<span className="font-medium text-amber-800">
						{token?.symbol}
					</span>
					<ChevronDown className="h-4 w-4 text-amber-400 mr-2" />
				</Button>
				{isLoading ? (
					<Skeleton className="h-10 w-full" />
				) : (
					<Input
						type="text"
						value={value}
						onChange={handleChange}
						className="border-0 bg-transparent text-right text-xl focus-visible:ring-0 focus-visible:ring-offset-0 text-amber-900 font-medium"
						placeholder="0.0"
					/>
				)}
			</div>
			<TokenSelector
				open={open}
				onOpenChange={setOpen}
				onSelect={onSelectToken}
				selectedToken={token}
			/>
		</div>
	);
}
