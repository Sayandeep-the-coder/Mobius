import { createPublicClient, defineChain, http, type PublicClient } from "viem";
import { sepolia } from "viem/chains";

const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.MONAD_RPC_URL ?? "https://testnet-rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: { name: "Monadscan", url: "https://testnet.monadscan.com" },
  },
});

export const monadPublicClient: PublicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(process.env.MONAD_RPC_URL ?? "https://testnet-rpc.monad.xyz"),
});

export const sepoliaPublicClient: PublicClient = createPublicClient({
  chain: sepolia,
  transport: http(process.env.SEPOLIA_RPC_URL!),
});

export async function assertChain(
  client: { getChainId: () => Promise<number> },
  expected: number
) {
  const actual = await client.getChainId();
  if (actual !== expected) {
    throw new Error(`RPC chain mismatch: expected ${expected}, received ${actual}`);
  }
}
