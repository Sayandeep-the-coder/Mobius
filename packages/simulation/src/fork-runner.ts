/**
 * Interface for running multi-step candidate plans on an isolated Anvil fork.
 *
 * For the one-day MVP, this is a stub interface. Full multi-step orchestration
 * is a stretch goal. Multiple remote eth_call requests do NOT persist state
 * between calls — stateful candidates require an isolated Anvil fork per candidate.
 *
 * Usage example (run locally, not in this package):
 *   anvil --fork-url "$MONAD_RPC_URL" --fork-block-number "$SNAPSHOT_BLOCK" --chain-id 10143 --port 8545
 */
export interface ForkRunnerConfig {
  forkUrl: string;
  forkBlockNumber: number | bigint;
  chainId: number;
  port?: number;
}

export interface ForkRunner {
  start(): Promise<void>;
  stop(): Promise<void>;
  executeCalls(calls: Array<{ to: `0x${string}`; data: `0x${string}`; value?: bigint }>): Promise<Array<{ status: "PASSED" | "REVERTED"; error?: string }>>;
  reset(): Promise<void>;
}

export class StubForkRunner implements ForkRunner {
  async start(): Promise<void> {
    // Stub: no-op for one-day MVP
  }
  async stop(): Promise<void> {
    // Stub: no-op for one-day MVP
  }
  async executeCalls(): Promise<Array<{ status: "PASSED" | "REVERTED"; error?: string }>> {
    throw new Error("Multi-step fork execution not implemented in one-day MVP");
  }
  async reset(): Promise<void> {
    // Stub: no-op for one-day MVP
  }
}
