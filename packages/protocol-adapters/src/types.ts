/**
 * Protocol adapter interface.
 * Allows adding new protocols (Aave, Uniswap, Morpho, etc.) without
 * touching the planner or simulation engine.
 */
import { type Address, type Hex } from "viem";
import type { StateSnapshot } from "@mobius/contracts-abi";
import type { ContractReader } from "@mobius/contract-reader";

/**
 * Result of simulating a protocol action.
 */
export interface ProtocolSimulationResult {
  status: "SIMULATION_PASSED" | "SIMULATION_REVERTED" | "BLOCKED_BY_POLICY";
  gasEstimate?: string;
  returnData?: `0x${string}`;
  error?: {
    kind: string;
    message: string;
  };
  expectedStateDelta?: Record<string, string>;
}

/**
 * Configuration for a protocol action.
 */
export interface ProtocolAction {
  candidateId: string;
  strategy: string;
  encodedCalls: Array<{ to: Address; data: Hex; value: string }>;
  constraints: Record<string, string>;
  assumptions: string[];
}

/**
 * Protocol adapter interface.
 * Each protocol (MockSwapTarget, AaveV3, etc.) implements this.
 */
export interface ProtocolAdapter {
  /**
   * Protocol identifier (e.g., "MockSwapTarget", "AaveV3").
   */
  readonly protocolId: string;

  /**
   * Check if this adapter supports the given protocol.
   */
  supports(protocol: string): boolean;

  /**
   * Build candidate actions for a given objective and constraints.
   */
  buildCandidates(
    planId: string,
    from: Address,
    parameters: Record<string, string>
  ): ProtocolAction[];

  /**
   * Simulate a candidate action against the given chain state.
   */
  simulate(
    client: ContractReader,
    from: Address,
    blockNumber: bigint,
    candidate: ProtocolAction
  ): Promise<ProtocolSimulationResult>;

  /**
   * Get the dependencies (contract addresses) this adapter reads.
   */
  getDependencies(): Address[];
}
