import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { TokenData } from "@/types/token"
import { zeroAddress } from "viem"
import { WETH_ADDRESS } from "@/lib/constants"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Check if two tokens represent the same asset (XRP and WXRP)
 * This prevents creating invalid pools between XRP and WXRP
 * Note: Swaps are allowed as they use wrap/unwrap functionality
 */
export function areTokensSameAssetForPool(tokenA: TokenData | undefined, tokenB: TokenData | undefined): boolean {
  if (!tokenA || !tokenB) return false;

  // Check if one is XRP (zeroAddress) and the other is WXRP (WETH_ADDRESS)
  const isXRPAndWXRP =
    (tokenA.address === zeroAddress && tokenB.address === WETH_ADDRESS) ||
    (tokenA.address === WETH_ADDRESS && tokenB.address === zeroAddress);

  // Check if both are literally the same token
  const isSameAddress = tokenA.address === tokenB.address;

  return isXRPAndWXRP || isSameAddress;
}

/**
 * Check if two tokens are the exact same token (same address)
 * Used for swap validation - different from pool validation
 */
export function areTokensIdentical(tokenA: TokenData | undefined, tokenB: TokenData | undefined): boolean {
  if (!tokenA || !tokenB) return false;
  return tokenA.address === tokenB.address;
}

/**
 * Check if a swap is XRP ↔ WXRP (wrap/unwrap operation)
 */
export function isXRPWXRPSwap(tokenA: TokenData | undefined, tokenB: TokenData | undefined): boolean {
  if (!tokenA || !tokenB) return false;

  return (tokenA.address === zeroAddress && tokenB.address === WETH_ADDRESS) ||
    (tokenA.address === WETH_ADDRESS && tokenB.address === zeroAddress);
}

/**
 * Get a descriptive error message for invalid token pairs
 */
export function getTokenPairError(tokenA: TokenData | undefined, tokenB: TokenData | undefined, context: 'pool' | 'swap' = 'pool'): string | null {
  if (!tokenA || !tokenB) return null;

  if (tokenA.address === tokenB.address) {
    return context === 'pool' ? "Cannot create pool with the same token" : "Cannot swap the same token";
  }

  if (context === 'pool') {
    const isXRPAndWXRP =
      (tokenA.address === zeroAddress && tokenB.address === WETH_ADDRESS) ||
      (tokenA.address === WETH_ADDRESS && tokenB.address === zeroAddress);

    if (isXRPAndWXRP) {
      return "Cannot create pool between XRP and WXRP - they represent the same asset.";
    }
  }

  return null;
}

