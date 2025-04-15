"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAccount, useReadContracts } from "wagmi";
import {
	UNISWAP_V2_FACTORY_ABI,
	UNISWAP_V2_FACTORY,
	ERC20_ABI,
	UNISWAP_V2_PAIR_ABI,
} from "@/lib/constants";
import { formatUnits, zeroAddress } from "viem";
import { getTokenIconUrl } from "@/lib/token-icons";
import Image from "next/image";
import { ETH, USDC, DAI, WBTC, WETH, LINK, UNI, AAVE } from "@/lib/tokens";

interface Position {
	pairAddress: string;
	tokenA: {
		address: string;
		symbol: string;
		balance: string;
	};
	tokenB: {
		address: string;
		symbol: string;
		balance: string;
	};
	lpTokens: string;
	value: string;
}

export function PositionsTable() {
	const { address, isConnected } = useAccount();
	const [positions, setPositions] = useState<Position[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	// Common token pairs to check
	const commonPairs = [
		{ tokenA: ETH, tokenB: USDC },
		{ tokenA: ETH, tokenB: DAI },
		{ tokenA: ETH, tokenB: WBTC },
		{ tokenA: USDC, tokenB: DAI },
		{ tokenA: WETH, tokenB: LINK },
		{ tokenA: WETH, tokenB: UNI },
		{ tokenA: WETH, tokenB: AAVE },
	];

	// Get pair addresses for common pairs
	const { data: pairData } = useReadContracts({
		contracts: commonPairs.map((pair) => ({
			address: UNISWAP_V2_FACTORY,
			abi: UNISWAP_V2_FACTORY_ABI,
			functionName: "getPair",
			args: [
				pair.tokenA.address === zeroAddress
					? "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
					: pair.tokenA.address,
				pair.tokenB.address === zeroAddress
					? "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
					: pair.tokenB.address,
			],
		})),
		query: {
			enabled: !!address,
		},
	});

	// Get LP token balances for each pair
	const { data: balanceData } = useReadContracts({
		contracts:
			pairData?.map((pair) => ({
				address: pair.result as `0x${string}`,
				abi: ERC20_ABI,
				functionName: "balanceOf",
				args: [address || zeroAddress],
			})) || [],
		query: {
			enabled:
				isConnected && !!address && !!pairData && pairData.length > 0,
		},
	});

	// Get reserves for each pair
	const { data: reservesData } = useReadContracts({
		contracts:
			pairData?.map((pair) => ({
				address: pair.result as `0x${string}`,
				abi: UNISWAP_V2_PAIR_ABI,
				functionName: "getReserves",
			})) || [],
		query: {
			enabled:
				isConnected && !!address && !!pairData && pairData.length > 0,
		},
	});

	// Process data to create positions
	useEffect(() => {
		const fetchPositions = async () => {
			if (
				!isConnected ||
				!address ||
				!pairData ||
				!balanceData ||
				!reservesData
			) {
				setIsLoading(false);
				return;
			}

			try {
				const userPositions: Position[] = [];

				for (let i = 0; i < pairData.length; i++) {
					const pairAddress = pairData[i].result as string;
					const balance = balanceData[i]?.result;
					const reserves = reservesData[i]?.result;

					// Skip if pair doesn't exist or user has no balance
					if (
						!pairAddress ||
						pairAddress === zeroAddress ||
						!balance ||
						BigInt(balance.toString()) === BigInt(0) ||
						!reserves
					) {
						continue;
					}

					const pair = commonPairs[i];
					const lpTokens = formatUnits(balance.toString(), 18);

					// Calculate token balances based on LP share
					// This is a simplified calculation for demo purposes
					const tokenABalance = "10.5"; // In a real app, calculate based on reserves and LP share
					const tokenBBalance = "18900"; // In a real app, calculate based on reserves and LP share

					userPositions.push({
						pairAddress,
						tokenA: {
							address: pair.tokenA.address,
							symbol: pair.tokenA.symbol,
							balance: tokenABalance,
						},
						tokenB: {
							address: pair.tokenB.address,
							symbol: pair.tokenB.symbol,
							balance: tokenBBalance,
						},
						lpTokens,
						value: "$37,800", // In a real app, calculate based on token prices
					});
				}

				setPositions(userPositions);
			} catch (error) {
				console.error("Error fetching positions:", error);
			} finally {
				setIsLoading(false);
			}
		};

		fetchPositions();
	}, [isConnected, address, pairData, balanceData, reservesData]);

	return (
		<Card className="card-gradient rounded-2xl border-0 overflow-hidden h-full">
			<CardHeader className="pb-2">
				<CardTitle className="text-xl text-blue-800">
					Your Liquidity Positions
				</CardTitle>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<div className="text-center py-8 text-blue-600">
						Loading your positions...
					</div>
				) : !isConnected ? (
					<div className="text-center py-8 text-blue-600 bg-blue-50/50 rounded-lg border border-blue-100">
						Connect your wallet to view your liquidity positions
					</div>
				) : positions.length === 0 ? (
					<div className="text-center py-8 text-blue-600 bg-blue-50/50 rounded-lg border border-blue-100">
						You don't have any liquidity positions yet
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full positions-table">
							<thead>
								<tr className="bg-blue-50">
									<th className="text-left py-3 px-4 text-blue-700 font-medium">
										Pool
									</th>
									<th className="text-right py-3 px-4 text-blue-700 font-medium">
										My Liquidity
									</th>
									<th className="text-right py-3 px-4 text-blue-700 font-medium">
										Value
									</th>
								</tr>
							</thead>
							<tbody>
								{positions.map((position) => (
									<tr
										key={position.pairAddress}
										className="hover:bg-blue-50/50"
									>
										<td className="py-4 px-4">
											<div className="flex items-center gap-2">
												<div className="flex -space-x-2">
													{getTokenIconUrl(
														position.tokenA.address,
													) ? (
														<Image
															src={
																getTokenIconUrl(
																	position
																		.tokenA
																		.address,
																) ||
																"/placeholder.svg"
															}
															alt={
																position.tokenA
																	.symbol
															}
															width={24}
															height={24}
															className="rounded-full z-10 border-2 border-white"
														/>
													) : (
														<div className="w-6 h-6 rounded-full token-icon flex items-center justify-center z-10 border-2 border-white">
															{position.tokenA.symbol.charAt(
																0,
															)}
														</div>
													)}
													{getTokenIconUrl(
														position.tokenB.address,
													) ? (
														<Image
															src={
																getTokenIconUrl(
																	position
																		.tokenB
																		.address,
																) ||
																"/placeholder.svg"
															}
															alt={
																position.tokenB
																	.symbol
															}
															width={24}
															height={24}
															className="rounded-full border-2 border-white"
														/>
													) : (
														<div className="w-6 h-6 rounded-full token-icon flex items-center justify-center border-2 border-white">
															{position.tokenB.symbol.charAt(
																0,
															)}
														</div>
													)}
												</div>
												<span className="font-medium text-blue-800">
													{position.tokenA.symbol}/
													{position.tokenB.symbol}
												</span>
											</div>
										</td>
										<td className="py-4 px-4 text-right">
											<div className="text-blue-800 font-medium">
												{position.tokenA.balance}{" "}
												{position.tokenA.symbol}
											</div>
											<div className="text-blue-800 font-medium">
												{position.tokenB.balance}{" "}
												{position.tokenB.symbol}
											</div>
											<div className="text-xs text-blue-600">
												{Number.parseFloat(
													position.lpTokens,
												).toFixed(6)}{" "}
												LP Tokens
											</div>
										</td>
										<td className="py-4 px-4 text-right font-medium text-blue-800">
											{position.value}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
