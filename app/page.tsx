import { SwapContainer } from "@/components/swap/swap-container";
import { RefreshCw, Zap, Shield } from "lucide-react";
import Image from "next/image";

export default function Home() {
	return (
		<div className="flex flex-col items-center justify-center mx-auto w-full">
			<div className="max-w-7xl w-full mb-16 py-16">
				<div className="flex flex-col items-center text-center px-4 mx-auto mb-12 max-w-3xl">
					<h1 className="text-4xl md:text-5xl font-bold mb-6 text-amber-600">
						Shape the future of XRPL EVM
						<br className="hidden md:block" /> with Hammy
					</h1>
					<p className="text-gray-600 mb-8 max-w-xl">
						Swap tokens with low fees, provide liquidity and engage
						with the growing XRPL EVM ecosystem.
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-12">
					<div className="hidden md:flex items-start md:col-span-3">
						<Image
							src="/Hamster.png"
							alt="Hammy Mascot"
							width={320}
							height={320}
							className="object-contain"
						/>
					</div>

					<div className="flex flex-col items-center text-center px-4 mx-auto col-span-1 md:col-span-6">
						<div className="max-w-2xl w-full backdrop-blur-sm bg-white/80 p-2 rounded-3xl">
							<SwapContainer />
						</div>
					</div>

					<div className="hidden md:flex items-start md:col-span-3">
						<Image
							src="/Coins_3.png"
							alt="Decorative Coins"
							width={300}
							height={300}
							className="object-contain"
						/>
					</div>
				</div>
			</div>

			<section className="w-full max-w-4xl py-16 px-4">
				<div className="flex flex-col md:flex-row items-center mb-8">
					<div className="flex-1">
						<h2 className="text-2xl font-bold mb-8 text-center">
							How It Works
						</h2>
					</div>
					<div className="hidden md:block">
						<Image
							src="/Coins_1.png"
							alt="Decorative Coins"
							width={250}
							height={250}
							className="object-contain opacity-20"
						/>
					</div>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
					<div className="bg-orange-100 p-6 rounded-xl shadow-sm">
						<div className="flex justify-center mb-4">
							<RefreshCw className="h-10 w-10 text-amber-600" />
						</div>
						<h3 className="text-lg font-semibold mb-3 text-amber-700 text-center">
							Uniswap V2 Technology
						</h3>
						<p className="text-gray-700">
							Built on the battle-tested Uniswap v2 protocol,
							enabling token swaps on XRPL EVM via robust AMM
							mechanics.
						</p>
					</div>
					<div className="bg-orange-100 p-6 rounded-xl shadow-sm">
						<div className="flex justify-center mb-4">
							<Zap className="h-10 w-10 text-amber-600" />
						</div>
						<h3 className="text-lg font-semibold mb-3 text-amber-700 text-center">
							Oracles & Arbitrage
						</h3>
						<p className="text-gray-700">
							Enabling DeFi primitives such as oracles and
							arbitrage flows to enhance market efficiency on XRPL
							EVM.
						</p>
					</div>
					<div className="bg-orange-100 p-6 rounded-xl shadow-sm">
						<div className="flex justify-center mb-4">
							<Shield className="h-10 w-10 text-amber-600" />
						</div>
						<h3 className="text-lg font-semibold mb-3 text-amber-700 text-center">
							Liquidity Growth
						</h3>
						<p className="text-gray-700">
							Incentivizing liquidity providers to bring assets to
							XRPL EVM, strengthening the DeFi ecosystem across
							protocols.
						</p>
					</div>
				</div>
			</section>

			<section className="w-full bg-gradient-to-r from-amber-600 to-orange-500 py-16 px-4 overflow-hidden">
				<div className="max-w-4xl mx-auto text-white flex flex-col items-center">
					<div className="grid grid-cols-1 md:grid-cols-3 w-full mb-8">
						<div className="hidden md:flex justify-center">
							<Image
								src="/Coins_2.png"
								alt="Decorative Coins"
								width={400}
								height={400}
								className="object-contain opacity-10"
							/>
						</div>
						<div className="col-span-1 md:col-span-1 flex justify-center items-center">
							<h2 className="text-2xl font-bold text-center">
								Pioneer DEX of XRPL EVM
							</h2>
						</div>
						<div className="hidden md:flex justify-center">
							<Image
								src="/Coins_3.png"
								alt="Decorative Coins"
								width={300}
								height={300}
								className="object-contain opacity-10"
							/>
						</div>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-10 w-full">
						<div className="flex flex-col items-center">
							<h3 className="text-xl font-semibold mb-4">
								For Traders
							</h3>
							<ul className="list-disc pl-5 space-y-3">
								<li>Enjoy low transaction fees</li>
								<li>Access deep and growing liquidity</li>
								<li>Trade via proven AMM mechanics</li>
							</ul>
						</div>
						<div className="flex flex-col items-center">
							<h3 className="text-xl font-semibold mb-4">
								For Liquidity Providers
							</h3>
							<ul className="list-disc pl-5 space-y-3">
								<li>
									Earn attractive yields by supporting early
									liquidity
								</li>
								<li>
									Help grow and shape the XRPL EVM DeFi
									landscape
								</li>
								<li>Join the vibrant Hammy community</li>
							</ul>
						</div>
					</div>
				</div>
			</section>

			<section className="w-full max-w-4xl py-16 px-4 mx-auto">
				<div className="flex flex-row mb-6">
					<div className="mr-4 hidden md:block">
						<Image
							src="/Coins_3.png"
							alt="Decorative Coins"
							width={200}
							height={200}
							className="object-contain rotate-45 opacity-20"
						/>
					</div>
					<div className="flex-1">
						<h2 className="text-2xl font-bold mb-10 text-center">
							Powering the XRPL EVM DeFi ecosystem
						</h2>
					</div>
				</div>
				<div className="bg-gradient-to-br from-gray-50 to-gray-100 p-8 rounded-xl shadow-sm">
					<div className="flex flex-col md:flex-row gap-8 items-center">
						<div className="md:w-2/3">
							<p className="text-gray-700 mb-6">
								As the first DEX on XRPL EVM, Hammy is laying
								the foundation for DeFi infrastructure across
								the ecosystem. By leveraging the Uniswap v2
								protocol, we enable core primitives such as
								oracles and arbitrage flows.
							</p>
							<p className="text-gray-700 mb-6">
								Hammy empowers traders and liquidity providers,
								contributing to price efficiency and liquidity
								depth within XRPL EVM. Join us in shaping the
								future of DeFi on XRPL EVM.
							</p>
							<div className="flex justify-center md:justify-start mt-8">
								<a
									href="#"
									className="bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-700 hover:to-orange-600 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-200"
								>
									Read Our Documentation
								</a>
							</div>
						</div>
						<div className="md:w-1/3 flex justify-center">
							<div className="relative">
								<div className="w-40 h-40 bg-orange-100 rounded-full opacity-70 blur-xl -z-10" />
								<div className="relative mt-[-160px]">
									<Image
										src="/Coins_1.png"
										alt="Decorative Coins"
										width={200}
										height={200}
										className="object-contain"
									/>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}
