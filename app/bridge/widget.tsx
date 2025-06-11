"use client";
import { SquidWidget } from "@0xsquid/widget";

export function BridgeComponent() {
	return (
		<SquidWidget
			config={{
				integratorId: "hammy-swap-e7cfdb7c-d4f0-44bb-8833-0add71ffb75d",
				apiUrl: "https://v2.api.squidrouter.com",
				// Add other configuration options here
			}}
		/>
	);
}
