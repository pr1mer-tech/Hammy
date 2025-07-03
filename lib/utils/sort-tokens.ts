import { TokenData } from "@/types/token";
import { WETH_ADDRESS } from "../constants";
import { zeroAddress } from "viem";

// Helper function to sort tokens consistently
export const sortTokens = <T>(
  tokenA: TokenData | undefined,
  tokenB: TokenData | undefined,
  amountA: T,
  amountB: T,
) => {
  if (!tokenA || !tokenB) {
    return {
      token0: undefined,
      token1: undefined,
      amount0: undefined,
      amount1: undefined,
    };
  }

  // Normalize addresses - handle zero address case
  const addressA = (
    tokenA.address === zeroAddress ? WETH_ADDRESS : tokenA.address
  ).toLowerCase();
  const addressB = (
    tokenB.address === zeroAddress ? WETH_ADDRESS : tokenB.address
  ).toLowerCase();

  // Check if addresses are the same (this would be an error)
  if (addressA === addressB) {
    throw new Error("Cannot sort identical tokens");
  }

  // Sort by address
  const isAFirst = addressA < addressB;

  return {
    token0: isAFirst ? tokenA : tokenB,
    token1: isAFirst ? tokenB : tokenA,
    amount0: isAFirst ? amountA : amountB,
    amount1: isAFirst ? amountB : amountA,
  };
};
