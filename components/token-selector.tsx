"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import type { TokenData } from "@/lib/types"
import { ETH, USDC, DAI, WBTC, WETH, LINK, UNI, AAVE } from "@/lib/tokens"
import { Check, Search } from "lucide-react"
import { useAccount, useBalance } from "wagmi"
import { getTokenIconUrl } from "@/lib/token-icons"
import Image from "next/image"

interface TokenSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (token: TokenData) => void
  selectedToken: TokenData
}

export function TokenSelector({ open, onOpenChange, onSelect, selectedToken }: TokenSelectorProps) {
  const [search, setSearch] = useState("")
  const { address } = useAccount()

  const tokens = [ETH, USDC, DAI, WBTC, WETH, LINK, UNI, AAVE]

  const filteredTokens = tokens.filter(
    (token) =>
      token.name.toLowerCase().includes(search.toLowerCase()) ||
      token.symbol.toLowerCase().includes(search.toLowerCase()),
  )

  const handleSelect = (token: TokenData) => {
    onSelect(token)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md card-gradient border-0">
        <DialogHeader>
          <DialogTitle className="text-blue-800">Select a token</DialogTitle>
        </DialogHeader>
        <div className="flex items-center border border-blue-100 rounded-lg px-3 py-2 mb-4 bg-white">
          <Search className="h-4 w-4 mr-2 text-blue-400" />
          <Input
            placeholder="Search by name or symbol"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
        <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
          {filteredTokens.map((token) => (
            <TokenRow
              key={token.address}
              token={token}
              selectedToken={selectedToken}
              onSelect={handleSelect}
              userAddress={address}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface TokenRowProps {
  token: TokenData
  selectedToken: TokenData
  onSelect: (token: TokenData) => void
  userAddress?: `0x${string}`
}

function TokenRow({ token, selectedToken, onSelect, userAddress }: TokenRowProps) {
  const { data: balance } = useBalance({
    address: userAddress,
    token:
      token.address === "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" ? undefined : (token.address as `0x${string}`),
    query: {
      enabled: !!userAddress,
    },
  })

  const tokenIconUrl = getTokenIconUrl(token.address)

  return (
    <div
      className="flex items-center justify-between p-3 rounded-lg hover:bg-blue-50 cursor-pointer token-selector-item"
      onClick={() => onSelect(token)}
    >
      <div className="flex items-center gap-3">
        {tokenIconUrl ? (
          <Image
            src={tokenIconUrl || "/placeholder.svg"}
            alt={token.symbol}
            width={32}
            height={32}
            className="rounded-full"
          />
        ) : (
          <div className="w-8 h-8 rounded-full token-icon flex items-center justify-center">
            {token.symbol.charAt(0)}
          </div>
        )}
        <div>
          <div className="font-medium text-blue-800">{token.symbol}</div>
          <div className="text-sm text-blue-600">{token.name}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {balance && (
          <div className="text-sm text-right text-blue-700 font-medium">
            {Number.parseFloat(balance.formatted).toFixed(4)}
          </div>
        )}
        {selectedToken.address === token.address && <Check className="h-4 w-4 text-blue-600" />}
      </div>
    </div>
  )
}

