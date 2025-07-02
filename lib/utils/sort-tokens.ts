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
  if (!tokenA || !tokenB)
    return {
      token0: undefined,
      token1: undefined,
      amount0: undefined,
      amount1: undefined,
    };

  const addressA =
    tokenA.address === zeroAddress ? WETH_ADDRESS : tokenA.address;
  const addressB =
    tokenB.address === zeroAddress ? WETH_ADDRESS : tokenB.address;

  const isAFirst = addressA.toLowerCase() < addressB.toLowerCase();

  if (isAFirst) {
    return {
      token0: tokenA,
      token1: tokenB,
      amount0: amountA,
      amount1: amountB,
    };
  } else {
    return {
      token0: tokenB,
      token1: tokenA,
      amount0: amountB,
      amount1: amountA,
    };
  }
};
