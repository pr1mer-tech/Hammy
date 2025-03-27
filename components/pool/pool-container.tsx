"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAccount } from "wagmi";
import type { TokenData } from "@/types/token";
import { ETH, USDC } from "@/lib/tokens";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useModal } from "connectkit";
import { AddLiquidityForm } from "@/components/pool/add-liquidity-form";
import { RemoveLiquidityForm } from "@/components/pool/remove-liquidity-form";

export function PoolContainer() {
	const { isConnected } = useAccount();
	const { setOpen: openConnectModal } = useModal();
	const [tokenA, setTokenA] = useState<TokenData>(ETH);
	const [tokenB, setTokenB] = useState<TokenData>(USDC);
	const [activeTab, setActiveTab] = useState("add");
	const [error, setError] = useState<string | null>(null);

	// Handle token selection
	const handleTokenASelect = (token: TokenData) => {
		if (token.address === tokenB.address) {
			// Swap tokens if user selects the same token
			setTokenB(tokenA);
		}
		setTokenA(token);
	};

	const handleTokenBSelect = (token: TokenData) => {
		if (token.address === tokenA.address) {
			// Swap tokens if user selects the same token
			setTokenA(tokenB);
		}
		setTokenB(token);
	};

	return (
		<Card className="card-gradient rounded-2xl border-0 overflow-hidden h-full">
			<CardContent className="p-5">
				<Tabs
					defaultValue="add"
					onValueChange={setActiveTab}
					className="h-full"
				>
					<TabsList className="grid w-full grid-cols-2 mb-4 bg-amber-50">
						<TabsTrigger
							value="add"
							className="data-[state=active]:bg-amber-500 data-[state=active]:text-white"
						>
							Add Liquidity
						</TabsTrigger>
						<TabsTrigger
							value="remove"
							className="data-[state=active]:bg-amber-500 data-[state=active]:text-white"
						>
							Remove Liquidity
						</TabsTrigger>
					</TabsList>

					{error && (
						<Alert
							variant="destructive"
							className="mb-4 bg-red-50 border-red-200"
						>
							<AlertCircle className="h-4 w-4" />
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}

					<TabsContent value="add" className="h-full">
						<AddLiquidityForm
							tokenA={tokenA}
							tokenB={tokenB}
							onTokenASelect={handleTokenASelect}
							onTokenBSelect={handleTokenBSelect}
							onError={setError}
						/>
					</TabsContent>

					<TabsContent value="remove" className="h-full">
						<RemoveLiquidityForm
							tokenA={tokenA}
							tokenB={tokenB}
							onTokenASelect={handleTokenASelect}
							onTokenBSelect={handleTokenBSelect}
							onError={setError}
						/>
					</TabsContent>
				</Tabs>
			</CardContent>
		</Card>
	);
}
