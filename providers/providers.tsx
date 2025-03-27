"use client"

import type React from "react"

import { WagmiProvider, createConfig } from "wagmi"
import { mainnet } from "wagmi/chains"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "@/components/ui/theme-provider"
import { ConnectKitProvider, getDefaultConfig } from "connectkit"
import { http } from "viem"
import { TokenListProvider } from "@/providers/token-list-provider"

const queryClient = new QueryClient()

// Create wagmi config with ConnectKit
const config = createConfig(
  getDefaultConfig({
    appName: "Hammy Swap",
    walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo",
    chains: [mainnet],
    transports: {
      [mainnet.id]: http(),
    },
  }),
)

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider
          theme="auto"
          mode="light"
          customTheme={{
            "--ck-connectbutton-background": "#f59e0b",
            "--ck-connectbutton-color": "white",
            "--ck-connectbutton-hover-background": "#d97706",
            "--ck-connectbutton-hover-color": "white",
            "--ck-connectbutton-border-radius": "0.75rem",
            "--ck-font-family": "Inter, sans-serif",
            "--ck-border-radius": "0.75rem",
            "--ck-primary-button-background": "#f59e0b",
            "--ck-primary-button-hover-background": "#d97706",
            "--ck-overlay-background": "rgba(255, 251, 235, 0.8)",
          }}
        >
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
            <TokenListProvider>{children}</TokenListProvider>
          </ThemeProvider>
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

