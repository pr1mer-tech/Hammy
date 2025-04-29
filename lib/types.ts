export interface TokenData {
	name: string;
	symbol: string;
	address: string;
	decimals: number;
	logoURI?: string;
}

export interface Position {
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
