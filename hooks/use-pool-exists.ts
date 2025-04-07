"use client";

import { useState, useEffect } from "react";
import { useReadContract } from "wagmi";
import { UNISWAP_V2_FACTORY, UNISWAP_V2_FACTORY_ABI, UNISWAP_V2_PAIR_ABI, WETH_ADDRESS } from "@/lib/constants";
import { zeroAddress } from "viem";
import type { TokenData } from "@/types/token";

/**
 * Hook to check if a pool exists and get reserve data if it does
 */
export function usePoolExists(
  tokenA: TokenData,
  tokenB: TokenData,
) {
  const [poolExists, setPoolExists] = useState<boolean>(false);
  const [reserves, setReserves] = useState<[bigint, bigint, number] | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Get effective addresses for pair lookup (replace ETH with WETH)
  const effectiveTokenAAddress = tokenA.address === zeroAddress ? WETH_ADDRESS : tokenA.address as `0x${string}`;
  const effectiveTokenBAddress = tokenB.address === zeroAddress ? WETH_ADDRESS : tokenB.address as `0x${string}`;

  // Get pair address
  const { data: pairAddress, isLoading: isPairLoading } = useReadContract({
    address: UNISWAP_V2_FACTORY,
    abi: UNISWAP_V2_FACTORY_ABI,
    functionName: "getPair",
    args: [effectiveTokenAAddress, effectiveTokenBAddress],
  });

  // Get reserves
  const { data: reservesData, isLoading: isReservesLoading } = useReadContract({
    address: pairAddress,
    abi: UNISWAP_V2_PAIR_ABI,
    functionName: "getReserves",
    query: {
      enabled: !!pairAddress && pairAddress !== zeroAddress,
    }
  });

  // Get token0 for determining token order
  const { data: token0Address } = useReadContract({
    address: pairAddress,
    abi: UNISWAP_V2_PAIR_ABI,
    functionName: "token0",
    query: {
      enabled: !!pairAddress && pairAddress !== zeroAddress,
    }
  });

  useEffect(() => {
    // Reset state when tokens change
    setIsLoading(true);
    
    // Check if pool exists and has reserves
    if (!isPairLoading && !isReservesLoading) {
      const exists = !!pairAddress && pairAddress !== zeroAddress && !!reservesData;
      setPoolExists(exists);
      
      if (exists && reservesData) {
        const typedReserves = reservesData as [bigint, bigint, number];
        
        // Check if reserves are non-zero
        if (typedReserves[0] > 0n && typedReserves[1] > 0n) {
          setReserves(typedReserves);
        } else {
          // If reserves are zero, treat as new pool
          setPoolExists(false);
        }
      }
      
      setIsLoading(false);
    }
  }, [pairAddress, reservesData, isPairLoading, isReservesLoading]);

  return { 
    poolExists, 
    reserves,
    token0Address,
    pairAddress,
    isLoading
  };
}