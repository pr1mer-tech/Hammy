import { PoolContainer } from "@/components/pool/pool-container";
import { PositionsTable } from "@/components/pool/positions-table";

export const metadata = {
	title: "Hammy Pools",
	description:
		"Earn high yields on your assets with Hammy Swap's liquidity pools. Enjoy a seamless experience with our user-friendly interface.",
};

export default function PoolPage() {
	return (
		<div className="flex flex-col max-w-6xl mx-auto">
			<h1 className="text-3xl font-bold mb-6 text-center bg-clip-text text-transparent bg-gradient-to-r from-amber-600 to-orange-500">
				Liquidity Pools
			</h1>

			<div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-6">
				<div>
					<PoolContainer />
				</div>
				<div>
					<PositionsTable />
				</div>
			</div>
		</div>
	);
}
