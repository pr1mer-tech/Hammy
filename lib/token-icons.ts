import { zeroAddress } from "viem"

// Map token addresses to their TrustWallet asset URLs
const tokenIconMap: Record<string, string> = {
  [zeroAddress]:
    "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png", // ETH (using WETH icon)
  "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2":
    "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png", // WETH
  "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48":
    "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png", // USDC
  "0x6B175474E89094C44Da98b954EedeAC495271d0F":
    "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6B175474E89094C44Da98b954EedeAC495271d0F/logo.png", // DAI
  "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599":
    "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599/logo.png", // WBTC
  "0x514910771AF9Ca656af840dff83E8264EcF986CA":
    "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x514910771AF9Ca656af840dff83E8264EcF986CA/logo.png", // LINK
  "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984":
    "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984/logo.png", // UNI
  "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9":
    "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9/logo.png", // AAVE
}

export function getTokenIconUrl(address: string): string | null {
  return tokenIconMap[address] || null
}

