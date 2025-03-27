"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import type { TokenData } from "@/types/token"
import { useAccount, useReadContract, useWriteContract } from "wagmi"
import {
  UNISWAP_V2_FACTORY_ABI,
  UNISWAP_V2_FACTORY,
  UNISWAP_V2_ROUTER,
  UNISWAP_V2_ROUTER_ABI,
  ERC20_ABI,
} from "@/lib/constants"
import { formatUnits, parseUnits, zeroAddress } from "viem"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import Image from "next/image"
import { useModal } from "connectkit"

interface RemoveLiquidityFormProps {
  tokenA: TokenData
  tokenB: TokenData
  onTokenASelect: (token: TokenData) => void
  onTokenBSelect: (token: TokenData) => void
  onError: (error: string | null) => void
}

export function RemoveLiquidityForm({
  tokenA,
  tokenB,
  onTokenASelect,
  onTokenBSelect,
  onError,
}: RemoveLiquidityFormProps) {
  const { address, isConnected } = useAccount()
  const { setOpen } = useModal()
  const [lpTokenAmount, setLpTokenAmount] = useState("0")
  const [lpTokenPercentage, setLpTokenPercentage] = useState(100)
  const [isRemovingLiquidity, setIsRemovingLiquidity] = useState(false)

  const { writeContractAsync: writeContract } = useWriteContract()

  // Get pair address
  const { data: pairAddress } = useReadContract({
    address: UNISWAP_V2_FACTORY,
    abi: UNISWAP_V2_FACTORY_ABI,
    functionName: "getPair",
    args: [
      tokenA.address === zeroAddress ? "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" : tokenA.address,
      tokenB.address === zeroAddress ? "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" : tokenB.address,
    ],
    query: {
      enabled: isConnected && !!tokenA.address && !!tokenB.address,
    },
  })

  // Get LP token balance
  const { data: lpBalance, refetch: refetchLpBalance } = useReadContract({
    address: pairAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address || zeroAddress],
    query: {
      enabled: isConnected && !!pairAddress && pairAddress !== zeroAddress && !!address,
    },
  })

  // Update LP token amount based on percentage
  useEffect(() => {
    if (lpBalance) {
      const totalLpBalance = formatUnits(lpBalance.toString(), 18)
      const amount = (Number.parseFloat(totalLpBalance) * lpTokenPercentage) / 100
      setLpTokenAmount(amount.toFixed(6))
    }
  }, [lpBalance, lpTokenPercentage])

  const handleRemoveLiquidity = async () => {
    if (!isConnected || !address || !pairAddress || pairAddress === zeroAddress) return

    setIsRemovingLiquidity(true)
    onError(null)

    try {
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20) // 20 minutes
      const slippageFactor = 0.995 // 0.5% slippage

      // Parse LP token amount
      const parsedLpAmount = parseUnits(lpTokenAmount, 18)

      // Need to approve LP token first
      const { data: lpAllowance } = await useReadContract.fetch({
        address: pairAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [address, UNISWAP_V2_ROUTER],
      })

      if (BigInt(lpAllowance?.toString() || "0") < parsedLpAmount) {
        await writeContract({
          address: pairAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [UNISWAP_V2_ROUTER, parsedLpAmount],
        })
      }

      // ETH + Token
      if (tokenA.address === zeroAddress || tokenB.address === zeroAddress) {
        const token = tokenA.address === zeroAddress ? tokenB : tokenA

        await writeContract({
          address: UNISWAP_V2_ROUTER,
          abi: UNISWAP_V2_ROUTER_ABI,
          functionName: "removeLiquidityETH",
          args: [
            token.address,
            parsedLpAmount,
            0, // amountTokenMin (with slippage)
            0, // amountETHMin (with slippage)
            address,
            deadline,
          ],
        })
      }
      // Token + Token
      else {
        await writeContract({
          address: UNISWAP_V2_ROUTER,
          abi: UNISWAP_V2_ROUTER_ABI,
          functionName: "removeLiquidity",
          args: [
            tokenA.address,
            tokenB.address,
            parsedLpAmount,
            0, // amountAMin (with slippage)
            0, // amountBMin (with slippage)
            address,
            deadline,
          ],
        })
      }

      await refetchLpBalance()
    } catch (err) {
      console.error("Error removing liquidity:", err)
      onError("Failed to remove liquidity. Please try again.")
    } finally {
      setIsRemovingLiquidity(false)
    }
  }

  return (
    <div className="space-y-3">
      {pairAddress && pairAddress !== zeroAddress && lpBalance && BigInt(lpBalance.toString()) > 0 ? (
        <>
          <div className="p-4 border border-amber-100 rounded-lg bg-amber-50/50">
            <div className="text-sm text-amber-700 mb-2 font-medium">Your Position</div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {tokenA.logoURI ? (
                    <Image
                      src={tokenA.logoURI || "/placeholder.svg"}
                      alt={tokenA.symbol}
                      width={24}
                      height={24}
                      className="rounded-full z-10 border-2 border-white"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full token-icon flex items-center justify-center z-10 border-2 border-white">
                      {tokenA.symbol.charAt(0)}
                    </div>
                  )}
                  {tokenB.logoURI ? (
                    <Image
                      src={tokenB.logoURI || "/placeholder.svg"}
                      alt={tokenB.symbol}
                      width={24}
                      height={24}
                      className="rounded-full border-2 border-white"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full token-icon flex items-center justify-center border-2 border-white">
                      {tokenB.symbol.charAt(0)}
                    </div>
                  )}
                </div>
                <span className="font-medium text-amber-800">
                  {tokenA.symbol}/{tokenB.symbol}
                </span>
              </div>
              <div className="text-right">
                <div className="text-amber-800 font-medium">{formatUnits(lpBalance.toString(), 18)} LP Tokens</div>
              </div>
            </div>
          </div>

          <div className="space-y-2 bg-amber-50/50 p-4 rounded-lg border border-amber-100">
            <div className="flex justify-between">
              <Label className="text-amber-700">Amount to Remove</Label>
              <span className="text-amber-800 font-medium">{lpTokenPercentage}%</span>
            </div>
            <Slider
              min={0}
              max={100}
              step={1}
              value={[lpTokenPercentage]}
              onValueChange={(value) => setLpTokenPercentage(value[0])}
              className="[&>span]:bg-amber-500"
            />
            <div className="text-sm text-right text-amber-700">{lpTokenAmount} LP Tokens</div>
          </div>

          <div className="pt-3">
            <Button
              className="w-full swap-button text-amber-900 rounded-xl py-6 font-medium text-base"
              onClick={handleRemoveLiquidity}
              disabled={isRemovingLiquidity || lpTokenPercentage === 0}
            >
              {isRemovingLiquidity ? "Removing Liquidity..." : "Remove Liquidity"}
            </Button>
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-amber-600 bg-amber-50/50 rounded-lg border border-amber-100">
          {!isConnected ? (
            <>
              <p className="mb-4">Connect your wallet to view your liquidity positions</p>
              <Button
                className="swap-button text-amber-900 rounded-xl py-5 px-6 font-medium"
                onClick={() => setOpen(true)}
              >
                Connect Wallet
              </Button>
            </>
          ) : (
            "You don't have any liquidity in this pool yet"
          )}
        </div>
      )}
    </div>
  )
}

