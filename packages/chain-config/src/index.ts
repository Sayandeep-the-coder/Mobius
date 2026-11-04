import { createPublicClient, defineChain, http, type PublicClient } from "viem";
import { sepolia } from "viem/chains";

const RPC_TIMEOUT_MS = 10000; // 10 second timeout for RPC calls

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

/**
 * Creates a promise that rejects after the given timeout.
 */
function timeoutPromise(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`RPC call timed out after ${ms}ms`)), ms);
  });
}

/**
 * getChainId with a timeout to prevent hanging on unresponsive RPCs.
 * Uses Promise.race to wrap the RPC call with a timeout.
 */
export async function getChainIdWithTimeout(
  client: PublicClient,
  ms: number = RPC_TIMEOUT_MS
): Promise<number> {
  return Promise.race([client.getChainId(), timeoutPromise(ms)]);
}

export async function assertChain(
  client: PublicClient,
  expected: number,
  ms: number = RPC_TIMEOUT_MS
) {
  const actual = await getChainIdWithTimeout(client, ms);
  if (actual !== expected) {
    throw new Error(`RPC chain mismatch: expected ${expected}, received ${actual}`);
  }
}
