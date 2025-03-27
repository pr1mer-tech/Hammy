import type React from "react";
import { Inter } from "next/font/google";
import { Providers } from "@/providers/providers";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import "@/app/globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
	title: "Hammy Swap - Uniswap V2 Interface",
	description: "An alternative interface for Uniswap V2 on Ethereum mainnet",
	generator: "v0.dev",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className={`${inter.className} gradient-bg min-h-screen`}>
				<Providers>
					<div className="flex flex-col min-h-screen">
						<Header />
						<main className="flex-1 container mx-auto px-4 py-6">
							{children}
						</main>
					</div>
				</Providers>
			</body>
		</html>
	);
}

import "./globals.css";
