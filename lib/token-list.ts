import type { TokenData } from "@/types/token";

// Default token list URL (Uniswap)
const DEFAULT_TOKEN_LIST_URL = "/token-list.json";

export async function fetchTokenList(): Promise<TokenData[]> {
	try {
		const response = await fetch(DEFAULT_TOKEN_LIST_URL);
		if (!response.ok) {
			throw new Error(
				`Failed to fetch token list: ${response.statusText}`,
			);
		}

		const data = await response.json();

		// Filter for Ethereum mainnet tokens only
		const ethereumTokens = data.tokens.filter(
			(token: any) => token.chainId === 1,
		);

		// Map to our TokenData format
		return ethereumTokens.map((token: any) => ({
			name: token.name,
			symbol: token.symbol,
			address: token.address,
			decimals: token.decimals,
			logoURI: token.logoURI,
		}));
	} catch (error) {
		console.error("Error fetching token list:", error);
		throw error;
	}
}
