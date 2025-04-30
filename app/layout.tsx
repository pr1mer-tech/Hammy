import type React from "react";
import { Inter } from "next/font/google";
import { Providers } from "@/providers/providers";
import { PostHogProvider } from "@/components/PostHogProvider";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Toaster } from "@/components/ui/sonner";
import "@/app/globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
	title: "Hammy Swap",
	description: "An XRPL EVM decentrlaized exchange based on Uniswap V2",
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
					<PostHogProvider>
						<div className="flex flex-col min-h-screen">
							<Header />
							<main className="flex-1 mx-auto w-full px-0 py-6">
								{children}
							</main>
							<Footer />
						</div>
					</PostHogProvider>
				</Providers>
				<Toaster richColors />
			</body>
		</html>
	);
}

import "./globals.css";
import { Toast } from "@radix-ui/react-toast";
