"use client";
import { SquidWidget } from "@0xsquid/widget";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

export function BridgeComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <SquidWidget
        config={{
          integratorId: "hammy-swap-e7cfdb7c-d4f0-44bb-8833-0add71ffb75d",
          apiUrl: "https://v2.api.squidrouter.com",
          // Add other configuration options here
        }}
      />
    </QueryClientProvider>
  );
}
