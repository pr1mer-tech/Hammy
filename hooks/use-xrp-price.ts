"use client";

import { useReadContract } from "wagmi";
import { UNISWAP_V2_ROUTER, UNISWAP_V2_ROUTER_ABI, WETH_ADDRESS, USDC_ADDRESS } from "@/lib/constants";
import { type Address, formatUnits, parseUnits } from "viem";
import { useQuery } from "@tanstack/react-query";

/**
 * Hook to get real-time XRP price in USD from the XRP/USDC pool
 * Uses Uniswap V2 getAmountsOut to calculate 1 XRP = ? USDC
 */
export function useXRPPrice() {
    // Get the price by checking how much USDC we get for 1 XRP (WXRP)
    const { data: amountsOut, refetch } = useReadContract({
        address: UNISWAP_V2_ROUTER as Address,
        abi: UNISWAP_V2_ROUTER_ABI,
        functionName: "getAmountsOut",
        args: [
            parseUnits("1", 18), // 1 XRP (18 decimals)
            [
                WETH_ADDRESS, // WXRP address (represents XRP in pools)
                USDC_ADDRESS, // USDC address
            ],
        ],
        query: {
            enabled: true,
            staleTime: 30000, // 30 seconds
            refetchInterval: 60000, // Refetch every minute
        },
    });

    const { data: priceUSD, isLoading, error } = useQuery({
        queryKey: ["xrpPrice", amountsOut],
        queryFn: async () => {
            if (!amountsOut || amountsOut.length < 2) {
                // Fallback to a reasonable default if pool doesn't exist
                return 2.0;
            }

            // amountsOut[1] is the USDC amount we get for 1 XRP
            const usdcAmount = formatUnits(amountsOut[1], 18); // USDC has 18 decimals in this testnet
            const priceInUSD = Number.parseFloat(usdcAmount);

            // Sanity check: if price is unrealistic, use fallback
            if (priceInUSD <= 0 || priceInUSD > 100) {
                console.warn(`Unrealistic XRP price detected: $${priceInUSD}, using fallback`);
                return 2.0;
            }

            return priceInUSD;
        },
        enabled: true,
        staleTime: 30000, // 30 seconds
        refetchInterval: 60000, // Refetch every minute
    });

    return {
        priceUSD: priceUSD ?? 2.0, // Fallback to $2.0 if no data
        isLoading,
        error: error ? (error as Error).message : null,
        refetch,
    };
} 