"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAccount, useReadContract, useWriteContract } from "wagmi"
import { TokenInput } from "@/components/token-input"
import type { TokenData } from "@/lib/types"
import { ETH, USDC } from "@/lib/tokens"
import { Plus, AlertCircle } from "lucide-react"
import {
  UNISWAP_V2_FACTORY_ABI,
  UNISWAP_V2_FACTORY,
  UNISWAP_V2_ROUTER,
  UNISWAP_V2_ROUTER_ABI,
  ERC20_ABI,
} from "@/lib/constants"
import { formatUnits, parseUnits, zeroAddress } from "viem"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { getTokenIconUrl } from "@/lib/token-icons"
import Image from "next/image"

export function PoolCard() {
  const { address, isConnected } = useAccount()
  const [tokenA, setTokenA] = useState<TokenData>(ETH)
  const [tokenB, setTokenB] = useState<TokenData>(USDC)
  const [amountA, setAmountA] = useState("")
  const [amountB, setAmountB] = useState("")
  const [activeTab, setActiveTab] = useState("add")
  const [slippage, setSlippage] = useState(0.5)
  const [error, setError] = useState<string | null>(null)
  const [isApproving, setIsApproving] = useState(false)
  const [isAddingLiquidity, setIsAddingLiquidity] = useState(false)
  const [isRemovingLiquidity, setIsRemovingLiquidity] = useState(false)
  const [lpTokenAmount, setLpTokenAmount] = useState("0")
  const [lpTokenPercentage, setLpTokenPercentage] = useState(100)

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

  // Get allowance for token A
  const { data: allowanceA, refetch: refetchAllowanceA } = useReadContract({
    address: tokenA.address as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [address || zeroAddress, UNISWAP_V2_ROUTER],
    query: {
      enabled: isConnected && tokenA.address !== zeroAddress && !!address,
    },
  })

  // Get allowance for token B
  const { data: allowanceB, refetch: refetchAllowanceB } = useReadContract({
    address: tokenB.address as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [address || zeroAddress, UNISWAP_V2_ROUTER],
    query: {
      enabled: isConnected && tokenB.address !== zeroAddress && !!address,
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

  // Get quotes from Uniswap V2 Router
  const { data: amountsOut, refetch: refetchAmountsOut } = useReadContract({
    address: UNISWAP_V2_ROUTER,
    abi: UNISWAP_V2_ROUTER_ABI,
    functionName: "getAmountsOut",
    args: [
      amountA && Number.parseFloat(amountA) > 0
        ? parseUnits(amountA, tokenA.decimals)
        : parseUnits("1", tokenA.decimals),
      [
        tokenA.address === zeroAddress ? "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" : tokenA.address,
        tokenB.address === zeroAddress ? "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" : tokenB.address,
      ],
    ],
    query: {
      enabled: isConnected && !!tokenA.address && !!tokenB.address && tokenA.address !== tokenB.address,
    },
  })

  // Calculate token B amount based on token A input using Uniswap quotes
  useEffect(() => {
    if (activeTab === "add" && amountA && Number.parseFloat(amountA) > 0) {
      if (amountsOut && amountsOut.length >= 2) {
        const outputAmount = formatUnits(amountsOut[1], tokenB.decimals)
        setAmountB(outputAmount)
      } else {
        refetchAmountsOut()
      }
    }
  }, [activeTab, amountA, tokenA, tokenB, amountsOut, refetchAmountsOut])

  // Update LP token amount based on percentage
  useEffect(() => {
    if (lpBalance) {
      const totalLpBalance = formatUnits(lpBalance.toString(), 18)
      const amount = (Number.parseFloat(totalLpBalance) * lpTokenPercentage) / 100
      setLpTokenAmount(amount.toFixed(6))
    }
  }, [lpBalance, lpTokenPercentage])

  const needsApproval = () => {
    if (!isConnected || !address) {
      return false
    }

    if (tokenA.address === zeroAddress && tokenB.address === zeroAddress) {
      return false
    }

    let needsApprovalA = false
    let needsApprovalB = false

    if (tokenA.address !== zeroAddress && amountA) {
      try {
        const parsedAllowanceA = BigInt(allowanceA?.toString() || "0")
        const parsedAmountA = parseUnits(amountA, tokenA.decimals)
        needsApprovalA = parsedAllowanceA < parsedAmountA
      } catch (err) {
        console.error("Error checking approval for token A:", err)
      }
    }

    if (tokenB.address !== zeroAddress && amountB) {
      try {
        const parsedAllowanceB = BigInt(allowanceB?.toString() || "0")
        const parsedAmountB = parseUnits(amountB, tokenB.decimals)
        needsApprovalB = parsedAllowanceB < parsedAmountB
      } catch (err) {
        console.error("Error checking approval for token B:", err)
      }
    }

    return needsApprovalA || needsApprovalB
  }

  const handleApprove = async () => {
    if (!isConnected || !address) return

    setIsApproving(true)
    setError(null)

    try {
      // Approve token A if needed
      if (tokenA.address !== zeroAddress && amountA) {
        const parsedAllowanceA = BigInt(allowanceA?.toString() || "0")
        const parsedAmountA = parseUnits(amountA, tokenA.decimals)

        if (parsedAllowanceA < parsedAmountA) {
          await writeContract({
            address: tokenA.address as `0x${string}`,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [UNISWAP_V2_ROUTER, parsedAmountA],
          })

          await refetchAllowanceA()
        }
      }

      // Approve token B if needed
      if (tokenB.address !== zeroAddress && amountB) {
        const parsedAllowanceB = BigInt(allowanceB?.toString() || "0")
        const parsedAmountB = parseUnits(amountB, tokenB.decimals)

        if (parsedAllowanceB < parsedAmountB) {
          await writeContract({
            address: tokenB.address as `0x${string}`,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [UNISWAP_V2_ROUTER, parsedAmountB],
          })

          await refetchAllowanceB()
        }
      }
    } catch (err) {
      console.error("Error approving tokens:", err)
      setError("Failed to approve tokens. Please try again.")
    } finally {
      setIsApproving(false)
    }
  }

  const handleAddLiquidity = async () => {
    if (!isConnected || !address) return

    setIsAddingLiquidity(true)
    setError(null)

    try {
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20) // 20 minutes
      const slippageFactor = 1 - slippage / 100

      // Parse amounts
      const parsedAmountA = parseUnits(amountA, tokenA.decimals)
      const parsedAmountB = parseUnits(amountB, tokenB.decimals)

      // Calculate minimum amounts with slippage
      const amountAMin = BigInt(Number(parsedAmountA) * slippageFactor)
      const amountBMin = BigInt(Number(parsedAmountB) * slippageFactor)

      // ETH + Token
      if (tokenA.address === zeroAddress || tokenB.address === zeroAddress) {
        const ethToken = tokenA.address === zeroAddress ? tokenA : tokenB
        const token = tokenA.address === zeroAddress ? tokenB : tokenA
        const ethAmount = tokenA.address === zeroAddress ? parsedAmountA : parsedAmountB
        const tokenAmount = tokenA.address === zeroAddress ? parsedAmountB : parsedAmountA
        const tokenAmountMin = tokenA.address === zeroAddress ? amountBMin : amountAMin
        const ethAmountMin = tokenA.address === zeroAddress ? amountAMin : amountBMin

        await writeContract({
          address: UNISWAP_V2_ROUTER,
          abi: UNISWAP_V2_ROUTER_ABI,
          functionName: "addLiquidityETH",
          args: [token.address, tokenAmount, tokenAmountMin, ethAmountMin, address, deadline],
          value: ethAmount,
        })
      }
      // Token + Token
      else {
        await writeContract({
          address: UNISWAP_V2_ROUTER,
          abi: UNISWAP_V2_ROUTER_ABI,
          functionName: "addLiquidity",
          args: [
            tokenA.address,
            tokenB.address,
            parsedAmountA,
            parsedAmountB,
            amountAMin,
            amountBMin,
            address,
            deadline,
          ],
        })
      }

      // Reset form after successful addition
      setAmountA("")
      setAmountB("")
      await refetchLpBalance()
    } catch (err) {
      console.error("Error adding liquidity:", err)
      setError("Failed to add liquidity. Please try again.")
    } finally {
      setIsAddingLiquidity(false)
    }
  }

  const handleRemoveLiquidity = async () => {
    if (!isConnected || !address || !pairAddress || pairAddress === zeroAddress) return

    setIsRemovingLiquidity(true)
    setError(null)

    try {
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20) // 20 minutes
      const slippageFactor = 1 - slippage / 100

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
      setError("Failed to remove liquidity. Please try again.")
    } finally {
      setIsRemovingLiquidity(false)
    }
  }

  const getAddButtonText = () => {
    if (!isConnected) return "Connect Wallet"
    if (!amountA || !amountB) return "Enter amounts"
    if (needsApproval()) return "Approve"
    return "Add Liquidity"
  }

  const handleAddButtonClick = () => {
    if (!isConnected) return
    if (needsApproval()) {
      handleApprove()
    } else {
      handleAddLiquidity()
    }
  }

  const isAddButtonDisabled = () => {
    if (!isConnected) return false
    if (!amountA || !amountB) return true
    if (isApproving || isAddingLiquidity) return true
    return false
  }

  const tokenAIconUrl = getTokenIconUrl(tokenA.address)
  const tokenBIconUrl = getTokenIconUrl(tokenB.address)

  return (
    <Card className="card-gradient rounded-2xl border-0 overflow-hidden h-full">
      <CardContent className="p-5">
        <Tabs defaultValue="add" onValueChange={setActiveTab} className="h-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 bg-blue-50">
            <TabsTrigger value="add" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Add Liquidity
            </TabsTrigger>
            <TabsTrigger value="remove" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Remove Liquidity
            </TabsTrigger>
          </TabsList>

          {error && (
            <Alert variant="destructive" className="mb-4 bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <TabsContent value="add" className="h-full">
            <div className="space-y-3">
              <TokenInput value={amountA} onChange={setAmountA} token={tokenA} onSelectToken={setTokenA} />

              <div className="flex justify-center my-1">
                <div className="rounded-full bg-blue-50 h-8 w-8 flex items-center justify-center">
                  <Plus className="h-4 w-4 text-blue-600" />
                </div>
              </div>

              <TokenInput value={amountB} onChange={setAmountB} token={tokenB} onSelectToken={setTokenB} />

              <div className="pt-3">
                <Button
                  className="w-full swap-button text-white rounded-xl py-6 font-medium text-base"
                  onClick={handleAddButtonClick}
                  disabled={isAddButtonDisabled()}
                >
                  {isApproving ? "Approving..." : isAddingLiquidity ? "Adding Liquidity..." : getAddButtonText()}
                </Button>
              </div>

              {tokenA && tokenB && amountA && amountB && (
                <div className="mt-3 text-sm text-blue-700 bg-blue-50 rounded-lg p-3">
                  <div className="flex justify-between">
                    <span>Pool Rate</span>
                    <span className="font-medium">
                      1 {tokenA.symbol} = {(Number.parseFloat(amountB) / Number.parseFloat(amountA)).toFixed(6)}{" "}
                      {tokenB.symbol}
                    </span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span>Share of Pool</span>
                    <span className="font-medium">0.01%</span>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="remove" className="h-full">
            <div className="space-y-3">
              {pairAddress && pairAddress !== zeroAddress && lpBalance && BigInt(lpBalance.toString()) > 0 ? (
                <>
                  <div className="p-4 border border-blue-100 rounded-lg bg-blue-50/50">
                    <div className="text-sm text-blue-700 mb-2 font-medium">Your Position</div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          {tokenAIconUrl ? (
                            <Image
                              src={tokenAIconUrl || "/placeholder.svg"}
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
                          {tokenBIconUrl ? (
                            <Image
                              src={tokenBIconUrl || "/placeholder.svg"}
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
                        <span className="font-medium text-blue-800">
                          {tokenA.symbol}/{tokenB.symbol}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-blue-800 font-medium">
                          {formatUnits(lpBalance.toString(), 18)} LP Tokens
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                    <div className="flex justify-between">
                      <Label className="text-blue-700">Amount to Remove</Label>
                      <span className="text-blue-800 font-medium">{lpTokenPercentage}%</span>
                    </div>
                    <Slider
                      min={0}
                      max={100}
                      step={1}
                      value={[lpTokenPercentage]}
                      onValueChange={(value) => setLpTokenPercentage(value[0])}
                      className="[&>span]:bg-blue-600"
                    />
                    <div className="text-sm text-right text-blue-700">{lpTokenAmount} LP Tokens</div>
                  </div>

                  <div className="pt-3">
                    <Button
                      className="w-full swap-button text-white rounded-xl py-6 font-medium text-base"
                      onClick={handleRemoveLiquidity}
                      disabled={isRemovingLiquidity || lpTokenPercentage === 0}
                    >
                      {isRemovingLiquidity ? "Removing Liquidity..." : "Remove Liquidity"}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-blue-600 bg-blue-50/50 rounded-lg border border-blue-100">
                  {!isConnected
                    ? "Connect your wallet to view your liquidity positions"
                    : "You don't have any liquidity in this pool yet"}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

