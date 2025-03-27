"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronDown } from "lucide-react"
import type { TokenData } from "@/lib/types"
import { TokenSelector } from "@/components/token-selector"
import { Skeleton } from "@/components/ui/skeleton"
import { getTokenIconUrl } from "@/lib/token-icons"
import Image from "next/image"

interface TokenInputProps {
  value: string
  onChange: (value: string) => void
  token: TokenData
  onSelectToken: (token: TokenData) => void
  label?: string
  balance?: string
  symbol?: string
  isLoading?: boolean
}

export function TokenInput({
  value,
  onChange,
  token,
  onSelectToken,
  label,
  balance,
  symbol,
  isLoading = false,
}: TokenInputProps) {
  const [open, setOpen] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Only allow numbers and decimals
    if (value === "" || /^[0-9]*[.,]?[0-9]*$/.test(value)) {
      onChange(value)
    }
  }

  const handleMaxClick = () => {
    if (balance) {
      onChange(balance)
    }
  }

  const tokenIconUrl = getTokenIconUrl(token.address)

  return (
    <div className="rounded-xl card-gradient p-4 border border-blue-100">
      <div className="flex justify-between mb-2">
        {label && <div className="text-sm text-blue-700">{label}</div>}
        {balance && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-blue-600">
              Balance: {Number.parseFloat(balance).toFixed(6)} {symbol}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 text-xs px-2 py-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
              onClick={handleMaxClick}
            >
              MAX
            </Button>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          className="flex items-center gap-2 px-3 h-10 border-blue-100 hover:border-blue-200 hover:bg-blue-50"
          onClick={() => setOpen(true)}
        >
          {tokenIconUrl ? (
            <Image
              src={tokenIconUrl || "/placeholder.svg"}
              alt={token.symbol}
              width={24}
              height={24}
              className="rounded-full"
            />
          ) : (
            <div className="w-6 h-6 rounded-full token-icon flex items-center justify-center">
              {token.symbol.charAt(0)}
            </div>
          )}
          <span className="font-medium text-blue-800">{token.symbol}</span>
          <ChevronDown className="h-4 w-4 text-blue-400" />
        </Button>
        {isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <Input
            type="text"
            value={value}
            onChange={handleChange}
            className="border-0 bg-transparent text-right text-xl focus-visible:ring-0 focus-visible:ring-offset-0 text-blue-900 font-medium"
            placeholder="0.0"
          />
        )}
      </div>
      <TokenSelector open={open} onOpenChange={setOpen} onSelect={onSelectToken} selectedToken={token} />
    </div>
  )
}

