import { BridgeComponent } from "./widget";

export const metadata = {
	title: "Hammy Bridge",
	description:
		"Bridge your assets across chains with Hammy Bridge. Enjoy a seamless experience with our user-friendly interface powered by Squid.",
};

export default function BridgePage() {
	return (
		<div className="flex flex-col max-w-6xl mx-auto">
			<h1 className="text-3xl font-bold mb-6 text-center bg-clip-text text-transparent bg-gradient-to-r from-amber-600 to-orange-500">
				Bridge
			</h1>

			<div className="flex flex-col items-center text-center px-4 mx-auto col-span-1 md:col-span-6">
				<div className="max-w-2xl w-full backdrop-blur-sm bg-white/80 p-2 rounded-3xl">
					<BridgeComponent />
				</div>
			</div>
		</div>
	);
}
