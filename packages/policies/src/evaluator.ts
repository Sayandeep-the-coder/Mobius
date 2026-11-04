import type { CandidateResult, CandidateStatus } from "@mobius/contracts-abi";
import type { CandidateConstraints, ConstraintViolation, PolicyResult } from "./constraints";

/**
 * Evaluates a candidate simulation result against user constraints.
 * Returns a PolicyResult with any violations.
 *
 * This is deterministic — the LLM/agent cannot override hard constraints.
 */
export function evaluateCandidate(
  candidate: Pick<CandidateResult, "status" | "encodedCalls" | "constraintViolations" | "estimatedGas">,
  constraints: CandidateConstraints,
  simulationOutput?: string
): PolicyResult {
  const violations: ConstraintViolation[] = [];

  // If simulation already reverted, it's blocked
  if (candidate.status === "SIMULATION_REVERTED") {
    violations.push({
      constraint: "simulation",
      message: "Candidate call reverted against the pinned snapshot",
      severity: "HARD",
    });
    return { passed: false, violations };
  }

  // If already blocked by policy, propagate
  if (candidate.status === "BLOCKED_BY_POLICY") {
    violations.push({
      constraint: "policy",
      message: "Candidate already blocked by policy",
      severity: "HARD",
    });
    return { passed: false, violations };
  }

  // Check minAmountOut against simulation output
  if (
    constraints.minAmountOut &&
    simulationOutput !== undefined &&
    simulationOutput !== "0x" &&
    simulationOutput.length > 2
  ) {
    const minOut = BigInt(constraints.minAmountOut);
    const actualOut = BigInt(simulationOutput);
    if (actualOut < minOut) {
      violations.push({
        constraint: "minAmountOut",
        message: `Actual output ${actualOut.toString()} is below minimum ${minOut.toString()}`,
        severity: "HARD",
      });
    }
  }

  // Check maxGasWei against estimated gas
  if (constraints.maxGasWei && candidate.estimatedGas) {
    const maxGas = BigInt(constraints.maxGasWei);
    const estGas = BigInt(candidate.estimatedGas);
    if (estGas > maxGas) {
      violations.push({
        constraint: "maxGasWei",
        message: `Estimated gas ${estGas.toString()} exceeds max ${maxGas.toString()}`,
        severity: "HARD",
      });
    }
  }

  // Propagate any pre-existing constraint violations from planning
  for (const v of candidate.constraintViolations) {
    violations.push({
      constraint: "planning",
      message: v,
      severity: "HARD",
    });
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}

/**
 * Ranks feasible candidates deterministically.
 * Priority: objective satisfaction > lower gas cost > lower risk.
 */
export function rankCandidates(
  candidates: Array<{ candidateId: string; status: CandidateStatus; estimatedGas?: string }>
): string[] {
  const feasible = candidates.filter((c) => c.status === "SIMULATION_PASSED");

  // Sort: passed candidates first, then by lowest estimated gas
  return feasible
    .sort((a, b) => {
      const aGas = a.estimatedGas ? BigInt(a.estimatedGas) : 0n;
      const bGas = b.estimatedGas ? BigInt(b.estimatedGas) : 0n;
      if (aGas < bGas) return -1;
      if (aGas > bGas) return 1;
      return 0;
    })
    .map((c) => c.candidateId);
}
