"use client";

import { WagmiProvider, createConfig } from "wagmi";
import { mainnet } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme-provider";
import { ConnectKitProvider, getDefaultConfig } from "connectkit";
import { http } from "viem";

const queryClient = new QueryClient();

// Create wagmi config with ConnectKit
const config = createConfig(
	getDefaultConfig({
		appName: "Uniswap V2 Interface",
		walletConnectProjectId:
			process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo",
		chains: [mainnet],
		transports: {
			[mainnet.id]: http(),
		},
	}),
);

export function Providers({ children }: { children: React.ReactNode }) {
	return (
		<WagmiProvider config={config}>
			<QueryClientProvider client={queryClient}>
				<ConnectKitProvider
					theme="auto"
					mode="light"
					customTheme={{
						"--ck-connectbutton-background": "#4f7df9",
						"--ck-connectbutton-color": "white",
						"--ck-connectbutton-hover-background": "#3b5fe2",
						"--ck-connectbutton-hover-color": "white",
						"--ck-connectbutton-border-radius": "0.75rem",
					}}
				>
					<ThemeProvider
						attribute="class"
						defaultTheme="light"
						enableSystem={false}
						disableTransitionOnChange
					>
						{children}
					</ThemeProvider>
				</ConnectKitProvider>
			</QueryClientProvider>
		</WagmiProvider>
	);
}
