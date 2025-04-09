"use client";

import { createContext, useContext, Suspense, type ReactNode } from "react";
import type { TokenData } from "@/types/token";
import { fetchTokenList } from "@/lib/token-list";
import { useAccount, useChains } from "wagmi";
import { useQuery } from "@tanstack/react-query";

interface TokenListContextType {
	tokens: TokenData[];
	popularTokens: TokenData[];
	isLoading: boolean;
	error: string | null;
}

const TokenListContext = createContext<TokenListContextType>({
	tokens: [],
	popularTokens: [],
	isLoading: true,
	error: null,
});

export function useTokenList() {
	return useContext(TokenListContext);
}

export function TokenListProvider({ children }: { children: ReactNode }) {
	const account = useAccount();
	const chains = useChains();

	const {
		data: tokenList,
		error,
		isLoading,
	} = useQuery({
		queryKey: ["tokenList", account.chainId],
		queryFn: () => fetchTokenList(account.chainId ?? chains[0].id),
	});

	const tokens = tokenList ?? [];
	const popularTokens = tokens.slice(0, 8);

	return (
		<Suspense fallback={<div>Loading tokens...</div>}>
			<TokenListContext.Provider
				value={{
					tokens,
					popularTokens,
					isLoading,
					error: error
						? "Failed to load token list. Using default tokens instead."
						: null,
				}}
			>
				{children}
			</TokenListContext.Provider>
		</Suspense>
	);
}
