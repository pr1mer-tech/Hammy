"use client"

import type { TokenData } from "@/types/token"
import { SwapIcon, SlippageIcon, GasIcon } from "@/components/ui/icons"

interface SwapDetailsProps {
  tokenFrom: TokenData
  tokenTo: TokenData
  amountFrom: string
  amountTo: string
  slippage: number
  gasEstimate: string | null
  isGasLoading: boolean
}

export function SwapDetails({
  tokenFrom,
  tokenTo,
  amountFrom,
  amountTo,
  slippage,
  gasEstimate,
  isGasLoading,
}: SwapDetailsProps) {
  // Calculate exchange rate
  const rate = Number.parseFloat(amountTo) / Number.parseFloat(amountFrom)

  return (
    <div className="mt-3 text-sm bg-amber-50 rounded-lg p-3 space-y-2">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-1.5 text-amber-700">
          <SwapIcon className="h-3.5 w-3.5" />
          <span>Rate</span>
        </div>
        <span className="font-medium text-amber-800">
          1 {tokenFrom.symbol} = {rate.toFixed(6)} {tokenTo.symbol}
        </span>
      </div>

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-1.5 text-amber-700">
          <SlippageIcon className="h-3.5 w-3.5" />
          <span>Slippage Tolerance</span>
        </div>
        <span className="font-medium text-amber-800">{slippage}%</span>
      </div>

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-1.5 text-amber-700">
          <GasIcon className="h-3.5 w-3.5" />
          <span>Network Fee</span>
        </div>
        <span className="font-medium text-amber-800">{isGasLoading ? "Calculating..." : gasEstimate || "Unknown"}</span>
      </div>
    </div>
  )
}

