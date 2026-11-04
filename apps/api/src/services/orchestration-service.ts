import { type PublicClient, type Address, type Hex, encodeFunctionData, parseAbiParameters } from "viem";
import { simulateCall } from "@mobius/simulation";
import { evaluateCandidate, rankCandidates } from "@mobius/policies";
import type { AgenticPlanRequest, AgenticPlanResponse, CandidateResult, CandidateStatus, PlanDecision, StateSnapshot } from "@mobius/contracts-abi";
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
 * Orchestrates the agentic planning pipeline:
 * 1. Read pinned snapshot
 * 2. Generate typed candidates
 * 3. Simulate each candidate
 * 4. Evaluate against hard policy constraints
 * 5. Rank feasible candidates
 * 6. Return EXECUTE / HOLD / HUMAN_REVIEW decision
 */
export class OrchestrationService {
  /**
   * Build candidates for the one-day MockSwapTarget demo.
   * Reads amountIn and minOut from context.parameters.
   * Returns deterministic templates — LLM may assist intent but not supply trusted state.
   */
  static buildCandidates(
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
    // Encode swap(amountIn, minOut) calldata using viem
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
   * Run the full planning pipeline.
   * Stores the snapshot so revalidation can compare against it later.
   */
  async plan(
    client: PublicClient,
    request: AgenticPlanRequest,
    targetAddress: `0x${string}`
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
        { label: "target", address: targetAddress, valueHash: "mockswap-target" },
      ],
    };

    // Store snapshot for revalidation lookup by planId
    snapshotService.storeByPlanId(planId, snapshot);

    // Parse amountIn and minOut from context parameters
    const amountIn = request.context.parameters.amountIn ?? "0";
    const minOut = request.context.parameters.minOut ?? "0";

    // Build deterministic candidates from real parameters
    const rawCalls = OrchestrationService.buildCandidates(
      planId,
      request.account as `0x${string}`,
      targetAddress,
      amountIn,
      minOut
    );

    // Simulate each candidate against the same snapshot
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
      // Preserve SIMULATION_REVERTED — don't downgrade it to BLOCKED_BY_POLICY.
      let constraintViolations: string[] = [];
      if (status !== "SIMULATION_REVERTED") {
        const policyResult = evaluateCandidate(
          { status, encodedCalls: raw.encodedCalls, constraintViolations: [], estimatedGas: gasEstimate },
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
        assumptions: ["rateWad unchanged since snapshot"],
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
