/**
 * ForkRunner — isolated Anvil fork for multi-step candidate execution.
 *
 * Multiple remote eth_call requests do NOT persist state between calls.
 * For stateful multi-step candidates (e.g., supply + setUserReserveCollateral),
 * each candidate runs on its own isolated Anvil fork where calls execute
 * sequentially against the same snapshot state.
 *
 * Usage:
 *   const runner = new ForkRunner({
 *     forkUrl: "https://testnet-rpc.monad.xyz",
 *     forkBlockNumber: 76872485,
 *     chainId: 10143,
 *   });
 *   await runner.start();
 *   const results = await runner.executeCalls([{ to, data, value }]);
 *   await runner.stop();
 */
import { execFile, type ChildProcess } from "child_process";
import { createPublicClient, http, type PublicClient } from "viem";

export interface ForkRunnerConfig {
  forkUrl: string;
  forkBlockNumber: number | bigint;
  chainId: number;
  port?: number;
}

export interface ForkRunResult {
  status: "PASSED" | "REVERTED";
  error?: string;
  gasUsed?: string;
  returnData?: `0x${string}`;
}

export interface ForkRunner {
  start(): Promise<void>;
  stop(): Promise<void>;
  executeCalls(
    calls: Array<{ to: `0x${string}`; data: `0x${string}`; value?: bigint }>
  ): Promise<Array<ForkRunResult>>;
  reset(): Promise<void>;
}

/**
 * AnvilForkRunner spawns a local Anvil fork process and executes candidate
 * calls sequentially against it. Each fork is isolated — state changes from
 * one candidate do not leak to another.
 */
export class AnvilForkRunner implements ForkRunner {
  private config: ForkRunnerConfig;
  private process: ChildProcess | null = null;
  private client: PublicClient | null = null;
  private port: number;
  private started = false;

  constructor(config: ForkRunnerConfig) {
    this.config = config;
    this.port = config.port ?? 8545;
  }

  async start(): Promise<void> {
    if (this.started) return;

    const forkBlockNumber =
      typeof this.config.forkBlockNumber === "bigint"
        ? this.config.forkBlockNumber.toString()
        : String(this.config.forkBlockNumber);

    const args: string[] = [
      "--fork-url",
      this.config.forkUrl,
      "--fork-block-number",
      forkBlockNumber,
      "--chain-id",
      String(this.config.chainId),
      "--port",
      String(this.port),
    ];

    this.process = execFile("anvil", args, {
      stdio: ["ignore", "pipe", "pipe"],
    } as any);

    // Wait for Anvil to start
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Anvil fork failed to start within 10 seconds"));
      }, 10000);

      const stdoutHandler = (data: Buffer) => {
        const output = data.toString();
        if (output.includes("Listening on")) {
          clearTimeout(timeout);
          resolve();
        }
      };

      this.process!.stdout?.on("data", stdoutHandler);
      this.process!.stderr?.on("data", stdoutHandler);

      this.process!.on("error", (err: Error) => {
        clearTimeout(timeout);
        reject(err);
      });

      this.process!.on("exit", (code: number | null) => {
        if (code !== 0 && code !== null) {
          clearTimeout(timeout);
          reject(new Error(`Anvil fork exited with code ${code}`));
        }
      });
    });

    // Create Viem client connected to the fork
    this.client = createPublicClient({
      chain: {
        id: this.config.chainId,
        name: "Anvil Fork",
        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        rpcUrls: {
          default: { http: [`http://127.0.0.1:${this.port}`] },
        },
      },
      transport: http(`http://127.0.0.1:${this.port}`),
    });

    this.started = true;
  }

  async stop(): Promise<void> {
    if (this.process) {
      this.process.kill("SIGTERM");
      await new Promise<void>((resolve) => {
        this.process!.on("exit", () => resolve());
        setTimeout(() => resolve(), 2000);
      });
      this.process = null;
    }
    this.client = null;
    this.started = false;
  }

  /**
   * Execute calls sequentially against the fork. State from earlier calls
   * persists for later calls in the same candidate.
   */
  async executeCalls(
    calls: Array<{ to: `0x${string}`; data: `0x${string}`; value?: bigint }>
  ): Promise<Array<ForkRunResult>> {
    if (!this.client || !this.started) {
      throw new Error("ForkRunner not started. Call start() first.");
    }

    const results: Array<ForkRunResult> = [];

    for (const call of calls) {
      try {
        const result = await this.client.call({
          to: call.to,
          data: call.data,
          value: call.value,
        });

        results.push({
          status: "PASSED",
          returnData: result.data,
        });
      } catch (error: any) {
        results.push({
          status: "REVERTED",
          error: error?.message || "Unknown revert",
        });
      }
    }

    return results;
  }

  /**
   * Reset the fork to the snapshot block. This discards all state changes
   * from previous candidate executions.
   */
  async reset(): Promise<void> {
    if (!this.process || !this.client) {
      throw new Error("ForkRunner not started. Call start() first.");
    }

    // Restart the fork to reset state
    await this.stop();
    await this.start();
  }

  /**
   * Get the fork's RPC URL for external access.
   */
  getRpcUrl(): string {
    return `http://127.0.0.1:${this.port}`;
  }
}

export { AnvilForkRunner as ForkRunnerImpl };
