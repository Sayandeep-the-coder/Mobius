import {
  type PublicClient,
  type Address,
  type Hex,
  encodeFunctionData,
} from "viem";
import { simulateCall } from "@mobius/simulation";
import { evaluateCandidate, rankCandidates } from "@mobius/policies";
import type {
  AgenticPlanRequest,
  AgenticPlanResponse,
  CandidateResult,
  CandidateStatus,
  PlanDecision,
  StateSnapshot,
} from "@mobius/contracts-abi";
import { classifyError } from "./error-classifier";
import { snapshotService } from "./snapshot-service";

/**
 * MockSwapTarget ABI for encoding swap calldata.
 * swap(uint256 amountIn, uint256 minOut) external returns (uint256 amountOut)
 */
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
] as const;

/**
 * Aave V3 Pool ABI subset for repay and supply.
 */
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

/**
 * Interest rate mode for Aave V3: 2 = variable.
 */
const INTEREST_RATE_MODE_VARIABLE = 2n;

/**
 * Orchestrates the agentic planning pipeline:
 * 1. Read pinned snapshot
 * 2. Generate typed candidates
 * 3. Simulate each candidate via eth_call
 * 4. Evaluate against hard policy constraints
 * 5. Rank feasible candidates
 * 6. Return EXECUTE / HOLD / HUMAN_REVIEW decision
 */
export class OrchestrationService {
  /**
   * Build MockSwapTarget candidates: swap + hold.
   */
  static buildMockSwapCandidates(
    planId: string,
    from: `0x${string}`,
    target: `0x${string}`,
    amountIn: string,
    minOut: string
  ): Array<{
    candidateId: string;
    strategy: string;
    encodedCalls: Array<{ to: `0x${string}`; data: `0x${string}`; value: string }>;
    constraints: { minAmountOut?: string };
  }> {
    const swapData = encodeFunctionData({
      abi: MOCK_SWAP_ABI,
      functionName: "swap",
      args: [BigInt(amountIn), BigInt(minOut)],
    });

    return [
      {
        candidateId: `${planId}_swap`,
        strategy: "execute_swap",
        encodedCalls: [{ to: target, data: swapData as Hex, value: "0" }],
        constraints: { minAmountOut: minOut },
      },
      {
        candidateId: `${planId}_hold`,
        strategy: "hold_defer",
        encodedCalls: [],
        constraints: {},
      },
    ];
  }

  /**
   * Build Aave V3 candidates: repay_debt, add_collateral, hold_defer.
   */
  static buildAaveCandidates(
    planId: string,
    from: `0x${string}`,
    poolAddress: `0x${string}`,
    asset: `0x${string}`,
    amount: string
  ): Array<{
    candidateId: string;
    strategy: string;
    encodedCalls: Array<{ to: `0x${string}`; data: `0x${string}`; value: string }>;
    constraints: { maxAmount?: string };
  }> {
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
        encodedCalls: [{ to: poolAddress, data: repayData as Hex, value: "0" }],
        constraints: { maxAmount: amount },
      },
      {
        candidateId: `${planId}_add_collateral`,
        strategy: "add_collateral",
        encodedCalls: [
          { to: poolAddress, data: supplyData as Hex, value: "0" },
          { to: poolAddress, data: enableCollateralData as Hex, value: "0" },
        ],
        constraints: { maxAmount: amount },
      },
      {
        candidateId: `${planId}_hold`,
        strategy: "hold_defer",
        encodedCalls: [],
        constraints: {},
      },
    ];
  }

  /**
   * Run the full planning pipeline.
   */
  async plan(
    client: PublicClient,
    request: AgenticPlanRequest,
    targetAddress?: `0x${string}`
  ): Promise<AgenticPlanResponse> {
    const block = await client.getBlock();
    if (block.number === null || block.hash === null) {
      throw new Error("RPC did not return a canonical block number/hash");
    }

    const planId = `plan_${Date.now()}`;

    const snapshot: StateSnapshot = {
      chainId: request.chainId,
      blockNumber: block.number.toString(),
      blockHash: block.hash as `0x${string}`,
      observedAt: new Date().toISOString(),
      stateFingerprint: `fp_${block.number}_${block.hash}`,
      dependencies: [
        { label: "block", valueHash: block.number.toString() },
        ...(targetAddress
          ? [{ label: "target", address: targetAddress, valueHash: "mockswap-target" }]
          : []),
        ...(request.context.parameters.asset
          ? [
              {
                label: "asset",
                address: request.context.parameters.asset as `0x${string}`,
                valueHash: "aave-asset",
              },
            ]
          : []),
      ],
    };

    // Store snapshot for revalidation lookup by planId
    snapshotService.storeByPlanId(planId, snapshot);

    // Build candidates based on protocol
    const protocol = request.context.protocol;
    const isAave = protocol === "AaveV3" || protocol === "aave";

    let rawCalls: Array<{
      candidateId: string;
      strategy: string;
      encodedCalls: Array<{ to: `0x${string}`; data: `0x${string}`; value: string }>;
      constraints: { minAmountOut?: string; maxAmount?: string };
    }>;

    if (isAave) {
      const asset = request.context.parameters.asset as `0x${string}`;
      const amount = request.context.parameters.amount ?? "0";
      rawCalls = OrchestrationService.buildAaveCandidates(
        planId,
        request.account as `0x${string}`,
        targetAddress as `0x${string}`,
        asset,
        amount
      );
    } else {
      // Default: MockSwapTarget
      const amountIn = request.context.parameters.amountIn ?? "0";
      const minOut = request.context.parameters.minOut ?? "0";
      rawCalls = OrchestrationService.buildMockSwapCandidates(
        planId,
        request.account as `0x${string}`,
        targetAddress as `0x${string}`,
        amountIn,
        minOut
      );
    }

    // Simulate each candidate against the same snapshot via eth_call
    const candidates: CandidateResult[] = [];

    for (const raw of rawCalls) {
      if (raw.encodedCalls.length === 0) {
        // HOLD candidate — no call to simulate
        candidates.push({
          candidateId: raw.candidateId,
          strategy: raw.strategy,
          status: "SIMULATION_PASSED" as CandidateStatus,
          encodedCalls: [],
          estimatedGas: undefined,
          expectedStateDelta: {},
          constraintViolations: [],
          assumptions: ["No chain state change — hold/defer"],
          explanation: "Hold/defer — no transaction submitted. Safe default.",
        });
        continue;
      }

      // Simulate the first call via eth_call
      const call = raw.encodedCalls[0];
      if (!call) continue;

      const simResult = await simulateCall({
        client,
        from: request.account as `0x${string}`,
        to: call.to,
        data: call.data,
        value: BigInt(call.value),
        blockNumber: block.number,
      });

      let status: CandidateStatus = "SIMULATION_PASSED";
      let gasEstimate: string | undefined;
      let errorMessage: string | undefined;
      let selector: `0x${string}` | undefined;

      if (simResult.status === "SIMULATION_REVERTED") {
        status = "SIMULATION_REVERTED";
        errorMessage = simResult.error?.message ?? "Unknown revert";
        const selectorMatch = errorMessage.match(/0x[0-9a-fA-F]{8}/);
        if (selectorMatch) {
          selector = selectorMatch[0] as `0x${string}`;
        }
      } else {
        gasEstimate = simResult.gasEstimate;
      }

      // Evaluate against hard policy constraints.
      let constraintViolations: string[] = [];
      if (status !== "SIMULATION_REVERTED") {
        const policyResult = evaluateCandidate(
          {
            status,
            encodedCalls: raw.encodedCalls,
            constraintViolations: [],
            estimatedGas: gasEstimate,
          },
          raw.constraints,
          simResult.returnData
        );

        constraintViolations = policyResult.violations.map((v) => v.message);

        if (!policyResult.passed) {
          status = "BLOCKED_BY_POLICY" as CandidateStatus;
        }
      }

      // Build error classification if reverted
      let classifiedError;
      if (status === "SIMULATION_REVERTED" && errorMessage) {
        classifiedError = classifyError(errorMessage, selector);
      }

      candidates.push({
        candidateId: raw.candidateId,
        strategy: raw.strategy,
        status,
        encodedCalls: raw.encodedCalls,
        estimatedGas: gasEstimate ?? undefined,
        expectedStateDelta: {},
        constraintViolations,
        assumptions: ["State unchanged since snapshot"],
        explanation: classifiedError
          ? `${classifiedError.decodedName}: ${classifiedError.message}. ${classifiedError.recommendation}`
          : `Candidate simulated successfully against block ${block.number}.`,
      });
    }

    // Rank feasible candidates (only action candidates, not HOLD)
    const actionCandidates = candidates.filter((c) => c.strategy !== "hold_defer");
    const ranked = rankCandidates(
      actionCandidates.map((c) => ({
        candidateId: c.candidateId,
        status: c.status,
        estimatedGas: c.estimatedGas,
      }))
    );

    const selectedCandidateId = ranked[0];
    const selected = candidates.find((c) => c.candidateId === selectedCandidateId);

    const decision: PlanDecision =
      selected?.status === "SIMULATION_PASSED"
        ? "EXECUTE"
        : "HOLD";

    const response: AgenticPlanResponse = {
      planId,
      snapshot,
      candidates,
      selectedCandidateId,
      decision,
      decisionReason:
        decision === "EXECUTE"
          ? `Candidate ${selectedCandidateId} passed simulation and policy constraints.`
          : "No candidate satisfied all hard constraints. Holding.",
      caveat: "Snapshot simulation only. Revalidate before signature; state may drift.",
    };

    return response;
  }
}
