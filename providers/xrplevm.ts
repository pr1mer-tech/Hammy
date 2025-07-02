import { defineChain } from "viem";

export const xrplevmMainnet = /*#__PURE__*/ defineChain({
  id: 1440000,
  name: "XRPL EVM",
  nativeCurrency: {
    name: "XRP",
    symbol: "XRP",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_LOCALFORK === "true"
          ? "http://localhost:8545"
          : "https://rpc.xrplevm.org",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "blockscout",
      url: "https://explorer-mainnet.aws.peersyst.tech",
      apiUrl: "https://explorer-mainnet.aws.peersyst.tech/api/v2",
    },
  },
  contracts: {
    multicall3: {
      address: "0xA7f3d2dEa7a53E7A9FEbBdE5Cf7C69d39D065030",
      blockCreated: 856568,
    },
  },
  testnet: false,
});
