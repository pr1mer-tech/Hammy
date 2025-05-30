"use client";

import { useState } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { WXRP_ABI, WETH_ADDRESS } from "@/lib/constants";
import { parseUnits } from "viem";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export function useWXRP() {
    const { address } = useAccount();
    const publicClient = usePublicClient();
    const [isWrapping, setIsWrapping] = useState<boolean>(false);
    const [isUnwrapping, setIsUnwrapping] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const queryClient = useQueryClient();
    const { writeContractAsync: writeContract } = useWriteContract();

    // Wrap XRP to WXRP
    const _wrapXRP = async (amount: string) => {
        if (!address) return;

        setIsWrapping(true);
        setError(null);

        try {
            const parsedAmount = parseUnits(amount, 18);

            const txHash = await writeContract({
                address: WETH_ADDRESS, // This will be WXRP address
                abi: WXRP_ABI,
                functionName: "deposit",
                args: [],
                value: parsedAmount,
            });

            await publicClient?.waitForTransactionReceipt({
                hash: txHash,
            });

            // Invalidate queries to refresh balances
            queryClient.invalidateQueries();
        } catch (err) {
            console.error("Error wrapping XRP:", err);
            setError("Failed to wrap XRP. Please try again.");
            setIsWrapping(false);
            throw new Error("Failed to wrap XRP. Please try again.");
        } finally {
            setIsWrapping(false);
        }
    };

    // Unwrap WXRP to XRP
    const _unwrapXRP = async (amount: string) => {
        if (!address) return;

        setIsUnwrapping(true);
        setError(null);

        try {
            const parsedAmount = parseUnits(amount, 18);

            const txHash = await writeContract({
                address: WETH_ADDRESS, // This will be WXRP address
                abi: WXRP_ABI,
                functionName: "withdraw",
                args: [parsedAmount],
            });

            await publicClient?.waitForTransactionReceipt({
                hash: txHash,
            });

            // Invalidate queries to refresh balances
            queryClient.invalidateQueries();
        } catch (err) {
            console.error("Error unwrapping WXRP:", err);
            setError("Failed to unwrap WXRP. Please try again.");
            setIsUnwrapping(false);
            throw new Error("Failed to unwrap WXRP. Please try again.");
        } finally {
            setIsUnwrapping(false);
        }
    };

    const wrapXRP = async (amount: string) => {
        toast.promise(
            async () => {
                await _wrapXRP(amount);
            },
            {
                loading: "Wrapping XRP...",
                success: "XRP wrapped successfully!",
                error: "Wrapping failed. Please try again.",
            },
        );
    };

    const unwrapXRP = async (amount: string) => {
        toast.promise(
            async () => {
                await _unwrapXRP(amount);
            },
            {
                loading: "Unwrapping WXRP...",
                success: "WXRP unwrapped successfully!",
                error: "Unwrapping failed. Please try again.",
            },
        );
    };

    return {
        isWrapping,
        isUnwrapping,
        error,
        wrapXRP,
        unwrapXRP,
    };
} 