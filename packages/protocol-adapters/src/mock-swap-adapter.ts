/**
 * MockSwapTarget protocol adapter.
 * Handles swap actions on the MockSwapTarget contract.
 */
import { type Address, type Hex, encodeFunctionData } from "viem";
import type { ProtocolAdapter, ProtocolAction, ProtocolSimulationResult } from "./types";
import type { ContractReader } from "@mobius/contract-reader";

const MOCK_SWAP_ABI = [
  {
    type: "function",
    name: "swap",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "minOut", type: "uint256" },
    ],
    outputs: [{ name: "amountOut", type: "uint256" }],
  },
  {
    type: "function",
    name: "quote",
    stateMutability: "view",
    inputs: [{ name: "amountIn", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "rateWad",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const MOCK_SWAP_TARGET_ADDRESS: Address = "0xA64c3bA49910baa01515360278AA2542AaAD0219";

export class MockSwapAdapter implements ProtocolAdapter {
  readonly protocolId = "MockSwapTarget";

  supports(protocol: string): boolean {
    return protocol === "MockSwapTarget";
  }

  buildCandidates(
    planId: string,
    from: Address,
    parameters: Record<string, string>
  ): ProtocolAction[] {
    const amountIn = parameters.amountIn ?? "0";
    const minOut = parameters.minOut ?? "0";

    const swapData = encodeFunctionData({
      abi: MOCK_SWAP_ABI,
      functionName: "swap",
      args: [BigInt(amountIn), BigInt(minOut)],
    });

    return [
      {
        candidateId: `${planId}_swap`,
        strategy: "execute_swap",
        encodedCalls: [{ to: MOCK_SWAP_TARGET_ADDRESS, data: swapData as Hex, value: "0" }],
        constraints: { minAmountOut: minOut },
        assumptions: ["rateWad unchanged since snapshot"],
      },
      {
        candidateId: `${planId}_hold`,
        strategy: "hold_defer",
        encodedCalls: [],
        constraints: {},
        assumptions: ["No chain state change — hold/defer"],
      },
    ];
  }

  async simulate(
    client: ContractReader,
    from: Address,
    blockNumber: bigint,
    candidate: ProtocolAction
  ): Promise<ProtocolSimulationResult> {
    if (candidate.encodedCalls.length === 0) {
      return {
        status: "SIMULATION_PASSED",
        expectedStateDelta: {},
      };
    }

    const call = candidate.encodedCalls[0];
    if (!call) {
      return {
        status: "SIMULATION_REVERTED",
        error: { kind: "INVALID_CALL", message: "No call data" },
      };
    }

    try {
      const result = await client.readContract({
        address: call.to,
        abi: MOCK_SWAP_ABI as any,
        functionName: "swap",
        args: [BigInt(call.data.slice(2).slice(64, 128)), BigInt(call.data.slice(2).slice(128, 192))],
      });

      return {
        status: "SIMULATION_PASSED",
        returnData: `0x${(result as any).toString(16).padStart(64, "0")}`,
        expectedStateDelta: {},
      };
    } catch (error: any) {
      return {
        status: "SIMULATION_REVERTED",
        error: {
          kind: "SIMULATION_REVERTED",
          message: error?.message || "Unknown revert",
        },
      };
    }
  }

  getDependencies(): Address[] {
    return [MOCK_SWAP_TARGET_ADDRESS];
  }
}
