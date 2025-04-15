"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAccount, useReadContracts } from "wagmi";
import {
	UNISWAP_V2_FACTORY_ABI,
	UNISWAP_V2_FACTORY,
	UNISWAP_V2_PAIR_ABI,
} from "@/lib/constants";
import { erc20Abi, formatUnits, zeroAddress } from "viem";
import Image from "next/image";
import { useTokenList } from "@/providers/token-list-provider";
import { Button } from "@/components/ui/button";
import { useModal } from "connectkit";
import type { TokenData } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";

interface Position {
	pairAddress: string;
	tokenA: {
		address: string;
		symbol: string;
		balance: string;
		logoURI?: string;
	};
	tokenB: {
		address: string;
		symbol: string;
		balance: string;
		logoURI?: string;
	};
	lpTokens: string;
	value?: string;
}

export function PositionsTable() {
	const { address, isConnected } = useAccount();
	const { setOpen } = useModal();
	const { tokens } = useTokenList();

	const USDC = tokens.slice(0, 8).find((token) => token.symbol === "USDC");

	// Generate pairs from first 8 tokens without duplicates
	const commonPairs = tokens.slice(0, 8).reduce<
		Array<{
			tokenA: TokenData & { address: `0x${string}` };
			tokenB: TokenData & { address: `0x${string}` };
		}>
	>((pairs, tokenA, indexA) => {
		// Only consider tokens after the current token to avoid duplicates
		const tokenBCandidates = tokens.slice(indexA + 1, 8);

		const tokenPairs = tokenBCandidates.map((tokenB) => {
			return {
				tokenA: {
					...tokenA,
					address: tokenA.address as `0x${string}`,
				},
				tokenB: {
					...tokenB,
					address: tokenB.address as `0x${string}`,
				},
			};
		});

		pairs.push(...tokenPairs);
		return pairs;
	}, []);

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

	// Get LP token balances and total supply for each pair
	const { data: balanceAndSupplyData } = useReadContracts({
		contracts:
			pairData?.flatMap((pair) => [
				{
					address: pair.result as `0x${string}`,
					abi: erc20Abi,
					functionName: "balanceOf",
					args: [address || zeroAddress],
				},
				{
					address: pair.result as `0x${string}`,
					abi: erc20Abi,
					functionName: "totalSupply",
				},
			]) || [],
		query: {
			enabled: !!address && !!pairData && pairData.length > 0,
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
			enabled: !!address && !!pairData && pairData.length > 0,
		},
	});

	const { data: positions, isLoading } = useQuery({
		queryKey: [
			"positions",
			address,
			pairData,
			balanceAndSupplyData,
			reservesData,
		],
		enabled:
			!!address && !!pairData && !!balanceAndSupplyData && !!reservesData,
		queryFn: async () => {
			const userPositions: Position[] = [];

			for (let i = 0; i < (pairData?.length ?? 0); i++) {
				const pairAddress = pairData?.[i].result as string;
				const balance = balanceAndSupplyData?.[i * 2]
					?.result as unknown as bigint;
				const totalSupply = balanceAndSupplyData?.[i * 2 + 1]
					?.result as unknown as bigint;
				const reserves = reservesData?.[i]
					?.result as unknown as bigint[];

				if (
					!pairAddress ||
					pairAddress === zeroAddress ||
					!balance ||
					BigInt(balance.toString()) === BigInt(0) ||
					!reserves ||
					!totalSupply
				) {
					continue;
				}

				const pair = commonPairs[i];
				const lpTokens = formatUnits(BigInt(balance.toString()), 18);

				const shareOfPool = Number(balance) / Number(totalSupply);
				const tokenABalance = formatUnits(
					(BigInt(reserves[0].toString()) *
						BigInt(balance.toString())) /
						totalSupply,
					pair.tokenA.decimals || 18,
				);
				const tokenBBalance = formatUnits(
					(BigInt(reserves[1].toString()) *
						BigInt(balance.toString())) /
						totalSupply,
					pair.tokenB.decimals || 18,
				);

				let value: string | undefined;
				if (
					USDC &&
					(pair.tokenA.address === USDC.address ||
						pair.tokenB.address === USDC.address)
				) {
					// If one token is USDC, use the USDC balance directly to calculate value
					const usdcBalance =
						pair.tokenA.address === USDC.address
							? Number.parseFloat(tokenABalance)
							: Number.parseFloat(tokenBBalance);

					// Calculate the approximate position value (2x the USDC amount)
					const positionValue = usdcBalance * 2;
					value = `$${positionValue.toLocaleString(undefined, {
						minimumFractionDigits: 2,
						maximumFractionDigits: 2,
					})}`;
				}

				userPositions.push({
					pairAddress,
					tokenA: {
						address: pair.tokenA.address,
						symbol: pair.tokenA.symbol,
						balance: tokenABalance,
						logoURI: pair.tokenA.logoURI,
					},
					tokenB: {
						address: pair.tokenB.address,
						symbol: pair.tokenB.symbol,
						balance: tokenBBalance,
						logoURI: pair.tokenB.logoURI,
					},
					lpTokens,
					value,
				});
			}

			return userPositions;
		},
	});

	return (
		<Card className="card-gradient rounded-2xl border-0 overflow-hidden h-full">
			<CardHeader className="pb-2">
				<CardTitle className="text-xl text-amber-800">
					Your Liquidity Positions
				</CardTitle>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<div className="text-center py-8 text-amber-600">
						Loading your positions...
					</div>
				) : !isConnected ? (
					<div className="text-center py-8 text-amber-600 bg-amber-50/50 rounded-lg border border-amber-100">
						<p className="mb-4">
							Connect your wallet to view your liquidity positions
						</p>
						<Button
							className="swap-button text-amber-900 rounded-xl py-5 px-6 font-medium"
							onClick={() => setOpen(true)}
						>
							Connect Wallet
						</Button>
					</div>
				) : positions?.length === 0 ? (
					<div className="text-center py-8 text-amber-600 bg-amber-50/50 rounded-lg border border-amber-100">
						You don't have any liquidity positions yet
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full positions-table">
							<thead>
								<tr className="bg-amber-50">
									<th className="text-left py-3 px-4 text-amber-700 font-medium">
										Pool
									</th>
									<th className="text-right py-3 px-4 text-amber-700 font-medium">
										My Liquidity
									</th>
									<th className="text-right py-3 px-4 text-amber-700 font-medium">
										Value
									</th>
								</tr>
							</thead>
							<tbody>
								{positions?.map((position) => (
									<tr
										key={position.pairAddress}
										className="hover:bg-amber-50/50"
									>
										<td className="py-4 px-4">
											<div className="flex items-center gap-2">
												<div className="flex -space-x-2">
													{position.tokenA.logoURI ? (
														<Image
															src={
																position.tokenA
																	.logoURI ||
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
													{position.tokenB.logoURI ? (
														<Image
															src={
																position.tokenB
																	.logoURI ||
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
												<span className="font-medium text-amber-800">
													{position.tokenA.symbol}/
													{position.tokenB.symbol}
												</span>
											</div>
										</td>
										<td className="py-4 px-4 text-right">
											<div className="text-amber-800 font-medium">
												{Number(
													position.tokenA.balance,
												).toFixed(6)}{" "}
												{position.tokenA.symbol}
											</div>
											<div className="text-amber-800 font-medium">
												{Number(
													position.tokenB.balance,
												).toFixed(6)}{" "}
												{position.tokenB.symbol}
											</div>
											<div className="text-xs text-amber-600">
												{Number.parseFloat(
													position.lpTokens,
												).toFixed(6)}{" "}
												LP Tokens
											</div>
										</td>
										<td className="py-4 px-4 text-right font-medium text-amber-800">
											{position.value || "-"}
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
