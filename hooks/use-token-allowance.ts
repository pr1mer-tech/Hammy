"use client";

import { useState, useEffect } from "react";
import {
	useAccount,
	usePublicClient,
	useReadContract,
	useWriteContract,
} from "wagmi";
import { ERC20_ABI, UNISWAP_V2_ROUTER } from "@/lib/constants";
import { parseUnits, zeroAddress } from "viem";
import type { TokenData } from "@/types/token";
import { toast } from "sonner";

export function useTokenAllowance(
	token: TokenData | undefined,
	amount: string,
) {
	const { address, isConnected } = useAccount();
	const [needsApproval, setNeedsApproval] = useState<boolean>(true);
	const [isApproving, setIsApproving] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const { writeContractAsync: writeContract } = useWriteContract();
	const publicClient = usePublicClient();
	// Get allowance for ERC20 token
	const { data: allowance, refetch: refetchAllowance } = useReadContract({
		address:
			token?.address !== zeroAddress
				? (token?.address as `0x${string}`)
				: undefined,
		abi: ERC20_ABI,
		functionName: "allowance",
		args: [address || zeroAddress, UNISWAP_V2_ROUTER],
		query: {
			enabled:
				!!token?.address && token?.address !== zeroAddress && !!address,
		},
	});

	// Check if token needs approval
	useEffect(() => {
		const checkAllowance = () => {
			console.log({ isConnected, address, token, amount, allowance });
			if (
				!address ||
				!token ||
				!amount ||
				token.address === zeroAddress ||
				Number.parseFloat(amount) <= 0
			) {
				setNeedsApproval(false);
				return;
			}

			try {
				const parsedAllowance = BigInt(allowance?.toString() || "0");
				const parsedAmount = parseUnits(amount, token.decimals);
				setNeedsApproval(parsedAllowance <= parsedAmount);
			} catch (err) {
				console.error("Error checking allowance:", err);
				setNeedsApproval(false);
			}
		};

		checkAllowance();
	}, [isConnected, address, token, amount, allowance]);

	// Approve token
	const _approveToken = async () => {
		if (!address || !token || !amount || token.address === zeroAddress) {
			return;
		}

		setIsApproving(true);
		setError(null);

		try {
			// Use the exact amount entered by the user
			const parsedAmount = parseUnits(amount, token.decimals);

			const txHash = await writeContract({
				address: token.address as `0x${string}`,
				abi: ERC20_ABI,
				functionName: "approve",
				args: [UNISWAP_V2_ROUTER, parsedAmount],
			});

			await publicClient?.waitForTransactionReceipt({
				hash: txHash,
			});

			await refetchAllowance();
			setNeedsApproval(false);
		} catch (err) {
			console.error("Error approving token:", err);
			setError("Failed to approve token");
		} finally {
			setIsApproving(false);
		}
	};

	const approveToken = () => {
		toast.promise(_approveToken, {
			loading: "Approving token...",
			success: "Token approved!",
			error: "Failed to approve token",
		});
	};

	if (!token || !amount) {
		return {
			needsApproval: false,
			isApproving: false,
			error: null,
			approveToken: () => {},
		};
	}

	return { needsApproval, isApproving, error, approveToken };
}
