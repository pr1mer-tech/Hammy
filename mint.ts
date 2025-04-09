import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { xrplevmTestnet } from "viem/chains"; // Change to the network you're using
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Replace with your contract's ABI - this is a minimal example for an ERC20 with mint function
const erc20ABI = [
	{
		inputs: [
			{ name: "to", type: "address" },
			{ name: "amount", type: "uint256" },
		],
		name: "mint",
		outputs: [{ name: "", type: "bool" }],
		stateMutability: "nonpayable",
		type: "function",
	},
	{
		inputs: [],
		name: "decimals",
		outputs: [{ name: "", type: "uint8" }],
		stateMutability: "view",
		type: "function",
	},
] as const;

async function mintERC20(contractAddress: string) {
	// Get private key from environment variables
	const privateKey = process.env.PRIVATE_KEY;
	if (!privateKey) {
		throw new Error("Private key not found in environment variables");
	}

	if (!contractAddress) {
		throw new Error(
			"Contract address must be provided as command line argument",
		);
	}

	// Create account from private key
	const account = privateKeyToAccount(privateKey as `0x${string}`);

	// Create public client
	const publicClient = createPublicClient({
		chain: xrplevmTestnet, // Change to your desired network
		transport: http(),
	});

	// Create wallet client
	const walletClient = createWalletClient({
		account,
		chain: xrplevmTestnet, // Change to your desired network
		transport: http(),
	});

	// Address to receive the minted tokens
	const toAddress = process.env.RECIPIENT_ADDRESS || account.address;

	// Get token decimals
	const decimals = await publicClient.readContract({
		address: contractAddress as `0x${string}`,
		abi: erc20ABI,
		functionName: "decimals",
	});

	// Amount to mint (100 tokens with the correct number of decimals)
	const amountToMint = 100n * 10n ** BigInt(decimals);

	console.log(`Minting ${amountToMint} tokens to ${toAddress}...`);

	try {
		// Send the mint transaction
		const hash = await walletClient.writeContract({
			address: contractAddress as `0x${string}`,
			abi: erc20ABI,
			functionName: "mint",
			args: [toAddress as `0x${string}`, amountToMint],
		});

		console.log(`Transaction hash: ${hash}`);

		// Wait for transaction to be mined
		const receipt = await publicClient.waitForTransactionReceipt({ hash });
		console.log("Transaction mined!");
		console.log(`Status: ${receipt.status}`);
	} catch (error) {
		console.error("Error minting tokens:", error);
	}
}

// Execute the function
const contractAddress = process.argv[process.argv.length - 1];
mintERC20(contractAddress).catch(console.error);
