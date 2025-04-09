import type { Address } from "viem";

export interface TokenData {
	name: string;
	symbol: string;
	address: Address;
	decimals: number;
	logoURI?: string;
}
