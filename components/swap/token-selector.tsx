"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton"; // Add this import
import { useState, useRef, useEffect } from "react";
import type { TokenData } from "@/types/token";
import { Check } from "lucide-react";
import {
  useAccount,
  useBalance,
  useChainId,
  usePublicClient,
  useWriteContract,
} from "wagmi";
import Image from "next/image";
import { useTokenList } from "@/providers/token-list-provider";
import { zeroAddress, parseEther, formatUnits } from "viem";
import { xrplevmTestnet } from "viem/chains";
import { WXRP_ABI } from "@/lib/constants";
import { env } from "@/lib/utils/env";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TokenSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (token: TokenData) => void;
  selectedToken: TokenData | undefined;
}

export function TokenSelector({
  open,
  onOpenChange,
  onSelect,
  selectedToken,
}: TokenSelectorProps) {
  const { tokens, isLoading } = useTokenList();

  const handleSelect = (token: TokenData) => {
    onSelect(token);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md card-gradient border-0 fade-in p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-amber-800">Select a token</DialogTitle>
        </DialogHeader>
        <Command className="rounded-lg border-0 bg-inherit">
          <CommandInput
            placeholder="Search by name or symbol..."
            className="border-amber-100 text-amber-800 placeholder:text-amber-500"
          />
          <CommandList className="max-h-[300px]">
            <CommandEmpty className="py-6 text-center text-amber-600">
              {isLoading ? "Loading tokens..." : "No tokens found"}
            </CommandEmpty>
            <CommandGroup>
              {tokens.map((token) => (
                <CommandItem
                  key={token.address}
                  value={`${token.name} ${token.symbol}`}
                  onSelect={() => handleSelect(token)}
                  className="cursor-pointer token-selector-item"
                >
                  <TokenRow
                    token={token}
                    selectedToken={selectedToken}
                    onSelect={handleSelect}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

interface TokenRowProps {
  token: TokenData;
  selectedToken: TokenData | undefined;
  onSelect: (token: TokenData) => void;
}

function TokenRow({ token, selectedToken, onSelect }: TokenRowProps) {
  const { address: userAddress } = useAccount();
  const chainId = useChainId();
  const isXrplEvmTestnet = chainId === xrplevmTestnet.id;
  const [isVisible, setIsVisible] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);

  // Intersection Observer to detect when the row is visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!isVisible) setIsVisible(entry.isIntersecting);
      },
      {
        root: null,
        rootMargin: "50px", // Start loading 50px before the element comes into view
        threshold: 0,
      },
    );

    if (rowRef.current) {
      observer.observe(rowRef.current);
    }

    return () => {
      if (rowRef.current) {
        observer.unobserve(rowRef.current);
      }
    };
  }, [isVisible]);

  // Only fetch balance when visible and user is connected
  const {
    data: balance,
    refetch,
    error,
  } = useBalance({
    address: userAddress,
    token:
      token.address === zeroAddress
        ? undefined
        : (token.address as `0x${string}`),
    query: {
      enabled: !!userAddress && isVisible,
    },
  });

  const { writeContractAsync, isPending } = useWriteContract();
  const publicClient = usePublicClient();

  const handleMint = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent token selection when clicking mint button

    if (!userAddress || token.address === zeroAddress) return;

    try {
      const isWXRP = token.address === env.NEXT_PUBLIC_WETH_ADDRESS;

      if (isWXRP) {
        const txHash = await writeContractAsync({
          address: token.address as `0x${string}`,
          abi: WXRP_ABI,
          functionName: "deposit",
          args: [],
          value: parseEther("10"),
        });

        await publicClient?.waitForTransactionReceipt({
          hash: txHash,
        });
      } else {
        const txHash = await writeContractAsync({
          address: token.address as `0x${string}`,
          abi: [
            {
              inputs: [
                {
                  internalType: "address",
                  name: "to",
                  type: "address",
                },
                {
                  internalType: "uint256",
                  name: "amount",
                  type: "uint256",
                },
              ],
              name: "mint",
              outputs: [],
              stateMutability: "nonpayable",
              type: "function",
            },
          ],
          functionName: "mint",
          args: [userAddress, parseEther("100")],
        });

        await publicClient?.waitForTransactionReceipt({
          hash: txHash,
        });
      }

      await refetch();
    } catch (error) {
      console.error("Failed to mint/deposit tokens:", error);
    }
  };

  return (
    <div ref={rowRef} className="w-full flex items-center justify-between">
      <div className="flex items-center gap-3">
        {token.logoURI ? (
          <Image
            src={token.logoURI || "/placeholder.svg"}
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
          <div className="font-medium text-amber-800">{token.symbol}</div>
          <div className="text-sm text-amber-600">{token.name}</div>
        </div>
        {isXrplEvmTestnet &&
          token.address !== zeroAddress &&
          token.address !== "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" && (
            <Button
              variant="outline"
              size="sm"
              className="ml-2 text-xs bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-800"
              onClick={handleMint}
              disabled={isPending || !userAddress}
            >
              {isPending
                ? token.symbol === "WXRP"
                  ? "Depositing..."
                  : "Minting..."
                : token.symbol === "WXRP"
                  ? "Deposit"
                  : "Mint"}
            </Button>
          )}
      </div>
      <div className="flex items-center gap-2">
        {userAddress && (
          <div className="text-sm text-right text-amber-700 font-medium min-w-[60px] flex justify-end">
            {!isVisible ? (
              <Skeleton className="h-4 w-12 bg-amber-200" />
            ) : error ? (
              <Tooltip>
                <TooltipTrigger>
                  <span className="text-red-600">Error</span>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p className="max-w-60 text-left">{error.message}</p>
                </TooltipContent>
              </Tooltip>
            ) : balance ? (
              <>
                {Number.parseFloat(
                  formatUnits(balance.value, balance.decimals),
                ).toFixed(4)}{" "}
                {token.symbol}
              </>
            ) : (
              <Skeleton className="h-4 w-12 bg-amber-200" />
            )}
          </div>
        )}

        <Check
          className={`h-4 w-4 text-amber-600 ${selectedToken?.address === token.address ? "" : "opacity-0"}`}
        />
      </div>
    </div>
  );
}
