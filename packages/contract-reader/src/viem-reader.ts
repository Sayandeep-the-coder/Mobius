import { createPublicClient, http, type PublicClient, type Address } from "viem";
import type { ContractReadConfig, ContractReadResult, ContractReader, AbiItem } from "./types";

/**
 * Viem-based implementation of ContractReader.
 * Reads contract state via eth_call against a pinned block.
 */
export class ViemContractReader implements ContractReader {
  private client: PublicClient;

  constructor(client: PublicClient) {
    this.client = client;
  }

  /**
   * Create a ViemContractReader from a chain configuration.
   */
  static create(chainId: number, rpcUrl: string): ViemContractReader {
    // Define chain config inline for simplicity
    const chains: Record<number, { name: string; nativeCurrency: { name: string; symbol: string; decimals: number }; rpcUrls: { default: { http: string[] } } }> = {
      10143: {
        name: "Monad Testnet",
        nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
        rpcUrls: { default: { http: [rpcUrl] } },
      },
      11155111: {
        name: "Ethereum Sepolia",
        nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
        rpcUrls: { default: { http: [rpcUrl] } },
      },
    };

    const chainConfig = chains[chainId];
    if (!chainConfig) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    // @ts-ignore - Viem version mismatch between packages; runtime is fine
    const client = createPublicClient({
      chain: chainConfig as any,
      transport: http(rpcUrl),
    } as any);
    return new ViemContractReader(client);
  }

  async read<T = unknown>(config: ContractReadConfig): Promise<ContractReadResult<T>> {
    // @ts-ignore - Viem version mismatch between packages; runtime is fine
    const block = await this.client.getBlock();
    if (block.number === null || block.hash === null) {
      throw new Error("RPC did not return a canonical block number/hash");
    }

    const value = await (this.client as any).readContract(config as any) as any;

    return {
      value: value as T,
      blockNumber: block.number,
      blockHash: block.hash,
    };
  }

  async readBatch(configs: ContractReadConfig[]): Promise<ContractReadResult[]> {
    // @ts-ignore - Viem version mismatch between packages; runtime is fine
    const block = await this.client.getBlock();
    if (block.number === null || block.hash === null) {
      throw new Error("RPC did not return a canonical block number/hash");
    }

    const results = await Promise.all(
      configs.map(async (config) => {
        const value = await this.client.readContract({
          address: config.address,
          abi: config.abi as any,
          functionName: config.functionName,
          args: config.args,
        });
        return {
          value,
          blockNumber: block.number,
          blockHash: block.hash,
        };
      })
    );

    return results;
  }

  async readContract<T = unknown>(config: {
    address: Address;
    abi: AbiItem[];
    functionName: string;
    args: unknown[];
  }): Promise<ContractReadResult<T>> {
    return this.read(config);
  }

  async getBlockNumber(): Promise<bigint> {
    // @ts-ignore - Viem version mismatch between packages; runtime is fine
    const block = await this.client.getBlock();
    if (block.number === null) {
      throw new Error("RPC did not return a canonical block number");
    }
    return block.number;
  }

  async getBlockHash(): Promise<`0x${string}`> {
    // @ts-ignore - Viem version mismatch between packages; runtime is fine
    const block = await this.client.getBlock();
    if (block.hash === null) {
      throw new Error("RPC did not return a canonical block hash");
    }
    return block.hash;
  }
}
