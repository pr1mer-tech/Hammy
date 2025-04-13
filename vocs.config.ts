import { defineConfig } from "vocs";

export default defineConfig({
	title: "Hammy Documentation",
	sidebar: [
		{
			text: "🐹 Introduction",
			link: "/introduction",
		},
		{
			text: "🌰 Swap",
			link: "/swap",
		},
		{
			text: "💧 Liquidity provision",
			link: "/liquidity",
		},
		{
			text: "✔️ Tokens supported",
			link: "/tokens",
		},
		{
			text: "⚙️ Smart contracts",
			link: "/contracts",
		},
	],
	topNav: [{ text: "Swap", link: "https://hammy.finance" }],
});
