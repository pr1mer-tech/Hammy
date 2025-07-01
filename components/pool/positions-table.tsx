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
import type { TokenData, Position } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { useSetAtom } from "jotai";
import { selectPositionAtom } from "@/lib/store";

export function PositionsTable() {
  const { address, isConnected } = useAccount();
  const { setOpen } = useModal();
  const { tokens } = useTokenList();
  const setSelectedPosition = useSetAtom(selectPositionAtom);
  const [selectedPairAddress, setSelectedPairAddress] = useState<string | null>(
    null,
  );

  /* ---------------------------------------------------------------------- */
  /*                               Pairs set-up                             */
  /* ---------------------------------------------------------------------- */

  const USDC = tokens.slice(0, 8).find((token) => token.symbol === "USDC");

  // Generate all unique pairs out of the first 8 tokens
  const commonPairs = tokens.slice(0, 8).reduce<
    Array<{
      tokenA: TokenData & { address: `0x${string}` };
      tokenB: TokenData & { address: `0x${string}` };
    }>
  >((pairs, tokenA, indexA) => {
    const tokenBCandidates = tokens.slice(indexA + 1, 8);
    for (const tokenB of tokenBCandidates) {
      pairs.push({
        tokenA: { ...tokenA, address: tokenA.address as `0x${string}` },
        tokenB: { ...tokenB, address: tokenB.address as `0x${string}` },
      });
    }
    return pairs;
  }, []);

  // Helper function to sort tokens by address (Uniswap V2 convention)
  const sortTokens = (
    tokenA: { address: string },
    tokenB: { address: string },
  ): [typeof tokenA, typeof tokenB] => {
    return tokenA.address.toLowerCase() < tokenB.address.toLowerCase()
      ? [tokenA, tokenB]
      : [tokenB, tokenA];
  };

  /* ---------------------------------------------------------------------- */
  /*                  Batch contract reads (pairs, balances, reserves)      */
  /* ---------------------------------------------------------------------- */

  // Pair addresses
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
    query: { enabled: !!address },
  });

  // LP balances + total supplies
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

  // Reserves
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
      /* --------------------------- constants ----------------------------- */
      const DUST_THRESHOLD_USD = 0.01; // hide < 1 cent

      /* ---------------------- helper structures -------------------------- */
      const pairInfo = (pairData ?? []).map((p, i) => {
        const pair = commonPairs[i];
        // Sort tokens to match Uniswap V2 internal ordering
        const [token0, token1] = sortTokens(pair.tokenA, pair.tokenB);
        const isReversed = token0.address !== pair.tokenA.address;

        return {
          pairAddress: p.result as string,
          tokenA: pair.tokenA,
          tokenB: pair.tokenB,
          reserves: (reservesData?.[i]?.result ?? []) as bigint[],
          isReversed, // track if tokenA/tokenB are swapped relative to token0/token1
        };
      });

      /* ----------------------- price discovery --------------------------- */
      const price: Record<string, number> = {};
      if (USDC) price[USDC.address.toLowerCase()] = 1; // USDC ~ $1

      let updated = true;
      while (updated) {
        updated = false;
        for (const p of pairInfo) {
          if (!p.reserves.length) continue;

          // Apply correct decimals based on token order
          const [token0, token1] = sortTokens(p.tokenA, p.tokenB);
          const decimals0 = (token0 as TokenData).decimals ?? 18;
          const decimals1 = (token1 as TokenData).decimals ?? 18;

          const r0 = Number(formatUnits(p.reserves[0], decimals0));
          const r1 = Number(formatUnits(p.reserves[1], decimals1));

          if (!r0 || !r1) continue;

          // Map back to original token order for price calculation
          const rA = p.isReversed ? r1 : r0;
          const rB = p.isReversed ? r0 : r1;

          const a = p.tokenA.address.toLowerCase();
          const b = p.tokenB.address.toLowerCase();

          if (price[a] !== undefined && price[b] === undefined) {
            price[b] = (rA / rB) * price[a];
            updated = true;
          } else if (price[b] !== undefined && price[a] === undefined) {
            price[a] = (rB / rA) * price[b];
            updated = true;
          }
        }
      }

      /* --------------------- build user positions ------------------------ */
      const userPositions: Position[] = [];

      for (let i = 0; i < pairInfo.length; i++) {
        const { pairAddress, tokenA, tokenB, reserves, isReversed } =
          pairInfo[i];

        const balanceBig = balanceAndSupplyData?.[i * 2]?.result as
          | bigint
          | undefined;
        const totalSupply = balanceAndSupplyData?.[i * 2 + 1]?.result as
          | bigint
          | undefined;

        if (
          !pairAddress ||
          pairAddress === zeroAddress ||
          !balanceBig ||
          balanceBig === 0n ||
          !totalSupply ||
          totalSupply === 0n ||
          !reserves.length
        )
          continue;

        const share = Number(balanceBig) / Number(totalSupply);

        // Apply correct decimals based on token order
        const [token0, token1] = sortTokens(tokenA, tokenB);
        const decimals0 = (token0 as TokenData).decimals ?? 18;
        const decimals1 = (token1 as TokenData).decimals ?? 18;

        const reserve0 = Number(formatUnits(reserves[0], decimals0));
        const reserve1 = Number(formatUnits(reserves[1], decimals1));

        // Map reserves back to tokenA/tokenB order
        const balA = share * (isReversed ? reserve1 : reserve0);
        const balB = share * (isReversed ? reserve0 : reserve1);

        /* value in USD (if both tokens priced) */
        const pA = price[tokenA.address.toLowerCase()];
        const pB = price[tokenB.address.toLowerCase()];
        let valueUSD: number | undefined;

        if (pA !== undefined && pB !== undefined) {
          valueUSD = balA * pA + balB * pB;
          if (valueUSD < DUST_THRESHOLD_USD) continue; // dust filter
        }

        userPositions.push({
          pairAddress,
          tokenA: {
            address: tokenA.address,
            symbol: tokenA.symbol,
            balance: balA.toString(),
            logoURI: tokenA.logoURI,
          },
          tokenB: {
            address: tokenB.address,
            symbol: tokenB.symbol,
            balance: balB.toString(),
            logoURI: tokenB.logoURI,
          },
          lpTokens: formatUnits(balanceBig, 18),
          value:
            valueUSD !== undefined
              ? `$${valueUSD.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              : undefined,
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
                    className={`hover:bg-amber-50/50 cursor-pointer ${
                      position.pairAddress === selectedPairAddress
                        ? "bg-amber-100"
                        : ""
                    }`}
                    onClick={() => {
                      setSelectedPosition(position);
                      setSelectedPairAddress(position.pairAddress);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        setSelectedPosition(position);
                        setSelectedPairAddress(position.pairAddress);
                      }
                    }}
                    tabIndex={0}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          {position.tokenA.logoURI ? (
                            <Image
                              src={
                                position.tokenA.logoURI || "/placeholder.svg"
                              }
                              alt={position.tokenA.symbol}
                              width={24}
                              height={24}
                              className="rounded-full z-10 border-2 border-white"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full token-icon flex items-center justify-center z-10 border-2 border-white">
                              {position.tokenA.symbol.charAt(0)}
                            </div>
                          )}
                          {position.tokenB.logoURI ? (
                            <Image
                              src={
                                position.tokenB.logoURI || "/placeholder.svg"
                              }
                              alt={position.tokenB.symbol}
                              width={24}
                              height={24}
                              className="rounded-full border-2 border-white"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full token-icon flex items-center justify-center border-2 border-white">
                              {position.tokenB.symbol.charAt(0)}
                            </div>
                          )}
                        </div>
                        <span className="font-medium text-amber-800">
                          {position.tokenA.symbol}/{position.tokenB.symbol}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="text-amber-800 font-medium">
                        {Number(position.tokenA.balance).toFixed(6)}{" "}
                        {position.tokenA.symbol}
                      </div>
                      <div className="text-amber-800 font-medium">
                        {Number(position.tokenB.balance).toFixed(6)}{" "}
                        {position.tokenB.symbol}
                      </div>
                      <div className="text-xs text-amber-600">
                        {Number.parseFloat(position.lpTokens).toFixed(6)} LP
                        Tokens
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
