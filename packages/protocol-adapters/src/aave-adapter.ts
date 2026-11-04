/**
 * Aave V3 protocol adapter.
 * Handles repay_debt and add_collateral actions on Aave V3 Pool.
 */
import { type Address, type Hex, encodeFunctionData } from "viem";
import type { ProtocolAdapter, ProtocolAction, ProtocolSimulationResult } from "./types";
import type { ContractReader } from "@mobius/contract-reader";

const AAVE_POOL_ABI = [
  {
    type: "function",
    name: "repay",
    stateMutability: "nonpayable",
    inputs: [
      { name: "asset", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "interestRateMode", type: "uint256" },
      { name: "onBehalfOf", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "supply",
    stateMutability: "nonpayable",
    inputs: [
      { name: "asset", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "onBehalfOf", type: "address" },
      { name: "referralCode", type: "uint16" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setUserReserveCollateral",
    stateMutability: "nonpayable",
    inputs: [
      { name: "asset", type: "address" },
      { name: "useAsCollateral", type: "bool" },
    ],
    outputs: [],
  },
] as const;

const INTEREST_RATE_MODE_VARIABLE = 2n;

export class AaveAdapter implements ProtocolAdapter {
  readonly protocolId = "AaveV3";

  supports(protocol: string): boolean {
    return protocol === "AaveV3" || protocol === "aave";
  }

  buildCandidates(
    planId: string,
    from: Address,
    parameters: Record<string, string>
  ): ProtocolAction[] {
    const asset = parameters.asset as Address;
    const amount = parameters.amount ?? "0";
    const amountBigInt = BigInt(amount);

    // repay: Pool.repay(asset, amount, 2 /* variable */, user)
    const repayData = encodeFunctionData({
      abi: AAVE_POOL_ABI,
      functionName: "repay",
      args: [asset, amountBigInt, INTEREST_RATE_MODE_VARIABLE, from],
    });

    // addCollateral: Pool.supply(asset, amount, user, 0) + setUserReserveCollateral(asset, true)
    const supplyData = encodeFunctionData({
      abi: AAVE_POOL_ABI,
      functionName: "supply",
      args: [asset, amountBigInt, from, 0],
    });
    const enableCollateralData = encodeFunctionData({
      abi: AAVE_POOL_ABI,
      functionName: "setUserReserveCollateral",
      args: [asset, true],
    });

    return [
      {
        candidateId: `${planId}_repay_debt`,
        strategy: "repay_debt",
        encodedCalls: [{ to: asset, data: repayData as Hex, value: "0" }],
        constraints: { maxAmount: amount },
        assumptions: ["asset address is valid", "user has sufficient balance"],
      },
      {
        candidateId: `${planId}_add_collateral`,
        strategy: "add_collateral",
        encodedCalls: [
          { to: asset, data: supplyData as Hex, value: "0" },
          { to: asset, data: enableCollateralData as Hex, value: "0" },
        ],
        constraints: { maxAmount: amount },
        assumptions: ["asset is enabled as collateral", "user has sufficient balance"],
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
        abi: AAVE_POOL_ABI as any,
        functionName: "repay",
        args: [],
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
    return [];
  }
}
