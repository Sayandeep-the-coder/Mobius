/**
 * Contract state reader abstraction.
 * Provides a uniform interface for reading on-chain contract state,
 * independent of the underlying RPC transport.
 */
import { type Address, type Hex } from "viem";

/**
 * Result of reading a single contract state value.
 */
export interface ContractReadResult<T = unknown> {
  value: T;
  blockNumber: bigint;
  blockHash: `0x${string}`;
}

/**
 * Configuration for a contract read operation.
 */
export interface ContractReadConfig {
  address: Address;
  abi: AbiItem[];
  functionName: string;
  args: unknown[];
}

/**
 * Minimal ABI item type.
 */
export interface AbiItem {
  type: string;
  name?: string;
  stateMutability?: string;
  inputs?: Array<{ name: string; type: string; internalType?: string }>;
  outputs?: Array<{ name: string; type: string; internalType?: string }>;
}

/**
 * Interface for reading contract state from the blockchain.
 */
export interface ContractReader {
  /**
   * Read a single contract state value using eth_call.
   */
  read<T = unknown>(config: ContractReadConfig): Promise<ContractReadResult<T>>;

  /**
   * Read multiple contract state values in batch.
   */
  readBatch(configs: ContractReadConfig[]): Promise<ContractReadResult[]>;

  /**
   * Read a contract using Viem's readContract (supports full ABI decoding).
   */
  readContract<T = unknown>(config: {
    address: Address;
    abi: AbiItem[];
    functionName: string;
    args: unknown[];
  }): Promise<ContractReadResult<T>>;

  /**
   * Get the current block number.
   */
  getBlockNumber(): Promise<bigint>;

  /**
   * Get the current block hash.
   */
  getBlockHash(): Promise<`0x${string}`>;
}
