import type { TokenData } from "@/types/token"
import { zeroAddress } from "viem"

export const ETH: TokenData = {
  name: "Ethereum",
  symbol: "ETH",
  address: zeroAddress, // Special address for ETH
  decimals: 18,
  logoURI:
    "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png",
}

export const WETH: TokenData = {
  name: "Wrapped Ethereum",
  symbol: "WETH",
  address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  decimals: 18,
  logoURI:
    "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png",
}

export const USDC: TokenData = {
  name: "USD Coin",
  symbol: "USDC",
  address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  decimals: 6,
  logoURI:
    "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png",
}

export const DAI: TokenData = {
  name: "Dai Stablecoin",
  symbol: "DAI",
  address: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
  decimals: 18,
  logoURI:
    "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6B175474E89094C44Da98b954EedeAC495271d0F/logo.png",
}

export const WBTC: TokenData = {
  name: "Wrapped Bitcoin",
  symbol: "WBTC",
  address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
  decimals: 8,
  logoURI:
    "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599/logo.png",
}

export const LINK: TokenData = {
  name: "Chainlink",
  symbol: "LINK",
  address: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
  decimals: 18,
  logoURI:
    "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x514910771AF9Ca656af840dff83E8264EcF986CA/logo.png",
}

export const UNI: TokenData = {
  name: "Uniswap",
  symbol: "UNI",
  address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
  decimals: 18,
  logoURI:
    "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984/logo.png",
}

export const AAVE: TokenData = {
  name: "Aave",
  symbol: "AAVE",
  address: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9",
  decimals: 18,
  logoURI:
    "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9/logo.png",
}

