import { SwapContainer } from "@/components/swap/swap-container";
import { RefreshCw, Zap, Shield } from "lucide-react";

export default function Home() {
	return (
		<div className="flex flex-col items-center justify-center mx-auto w-full">
			<div className="max-w-md w-full mb-16">
				<h1 className="text-3xl font-bold mb-6 text-center bg-clip-text text-transparent bg-gradient-to-r from-amber-600 to-orange-500">
					First DEX on XRPL EVM
				</h1>
				<SwapContainer />
			</div>

			<section className="w-full max-w-4xl py-16 px-4">
				<h2 className="text-2xl font-bold mb-8 text-center">
					How It Works
				</h2>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
					<div className="bg-orange-100 p-6 rounded-xl shadow-sm">
						<div className="flex justify-center mb-4">
							<RefreshCw className="h-10 w-10 text-amber-600" />
						</div>
						<h3 className="text-lg font-semibold mb-3 text-amber-700 text-center">
							Uniswap V2 Technology
						</h3>
						<p className="text-gray-700">
							Built on battle-tested Uniswap V2 protocol, enabling
							robust token swaps and proven AMM mechanics on XRPL
							EVM.
						</p>
					</div>
					<div className="bg-orange-100 p-6 rounded-xl shadow-sm">
						<div className="flex justify-center mb-4">
							<Zap className="h-10 w-10 text-amber-600" />
						</div>
						<h3 className="text-lg font-semibold mb-3 text-amber-700 text-center">
							Flash Loans & Arbitrage
						</h3>
						<p className="text-gray-700">
							Enabling DeFi primitives like flash loans and
							arbitrage opportunities that help balance the entire
							XRPL EVM ecosystem.
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
							XRPL EVM, fostering a deeper DeFi ecosystem for all
							protocols.
						</p>
					</div>
				</div>
			</section>

			<section className="w-full bg-gradient-to-r from-amber-600 to-orange-500 py-16 px-4">
				<div className="max-w-4xl mx-auto text-white flex flex-col items-center">
					<h2 className="text-2xl font-bold mb-8 text-center">
						Pioneer of XRPL EVM DeFi
					</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-10 w-full">
						<div className="flex flex-col items-center">
							<h3 className="text-xl font-semibold mb-4">
								For Traders
							</h3>
							<ul className="list-disc pl-5 space-y-3">
								<li>First DEX on XRPL EVM chain</li>
								<li>Proven Uniswap V2 mechanics</li>
								<li>Arbitrage opportunities across pairs</li>
							</ul>
						</div>
						<div className="flex flex-col items-center">
							<h3 className="text-xl font-semibold mb-4">
								For Liquidity Providers
							</h3>
							<ul className="list-disc pl-5 space-y-3">
								<li>
									First-mover advantage in liquidity provision
								</li>
								<li>Support the growing XRPL EVM ecosystem</li>
								<li>Enable flash loans for other protocols</li>
							</ul>
						</div>
					</div>
				</div>
			</section>

			<section className="w-full max-w-4xl py-16 px-4 mx-auto">
				<h2 className="text-2xl font-bold mb-10 text-center">
					Powering XRPL EVM DeFi
				</h2>
				<div className="bg-gradient-to-br from-gray-50 to-gray-100 p-8 rounded-xl shadow-sm">
					<p className="text-gray-700 mb-6">
						As the first DEX on XRPL EVM, we're building crucial
						infrastructure for the entire ecosystem. By implementing
						Uniswap V2's proven mechanics, we enable essential DeFi
						primitives like flash loans and arbitrage.
					</p>
					<p className="text-gray-700 mb-6">
						Our protocol creates opportunities for traders and
						liquidity providers while helping maintain price
						equilibrium across the network. Join us in building the
						foundation of XRPL EVM DeFi.
					</p>
					<div className="flex justify-center mt-8">
						<a
							href="#"
							className="bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-700 hover:to-orange-600 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-200"
						>
							Read Our Documentation
						</a>
					</div>
				</div>
			</section>
		</div>
	);
}
