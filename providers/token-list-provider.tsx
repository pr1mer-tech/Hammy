"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { TokenData } from "@/types/token"
import { fetchTokenList } from "@/lib/token-list"
import { ETH } from "@/lib/tokens"

interface TokenListContextType {
  tokens: TokenData[]
  popularTokens: TokenData[]
  isLoading: boolean
  error: string | null
}

const TokenListContext = createContext<TokenListContextType>({
  tokens: [],
  popularTokens: [],
  isLoading: true,
  error: null,
})

export function useTokenList() {
  return useContext(TokenListContext)
}

export function TokenListProvider({ children }: { children: ReactNode }) {
  const [tokens, setTokens] = useState<TokenData[]>([ETH])
  const [popularTokens, setPopularTokens] = useState<TokenData[]>([ETH])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadTokens() {
      try {
        setIsLoading(true)
        const tokenList = await fetchTokenList()

        // Add ETH at the beginning of the list
        const allTokens = [ETH, ...tokenList]
        setTokens(allTokens)

        // Set popular tokens (first 8 tokens including ETH)
        setPopularTokens(allTokens.slice(0, 8))

        setError(null)
      } catch (err) {
        console.error("Failed to load token list:", err)
        setError("Failed to load token list. Using default tokens instead.")
        // Fallback to default tokens from lib/tokens.ts
        import("@/lib/tokens").then(({ ETH, USDC, DAI, WBTC, WETH, LINK, UNI, AAVE }) => {
          const defaultTokens = [ETH, USDC, DAI, WBTC, WETH, LINK, UNI, AAVE]
          setTokens(defaultTokens)
          setPopularTokens(defaultTokens)
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadTokens()
  }, [])

  return (
    <TokenListContext.Provider value={{ tokens, popularTokens, isLoading, error }}>
      {children}
    </TokenListContext.Provider>
  )
}

