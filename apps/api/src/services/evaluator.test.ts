import { describe, it, expect } from "vitest";
import { evaluateCandidate } from "@mobius/policies";
import type { CandidateStatus } from "@mobius/contracts-abi";
import type { CandidateConstraints } from "@mobius/policies";

describe("policies/evaluator", () => {
  const baseCandidate = {
    status: "SIMULATION_PASSED" as CandidateStatus,
    encodedCalls: [],
    constraintViolations: [],
    estimatedGas: "100000",
  };

  const baseConstraints: CandidateConstraints = {};

  it("passes a candidate with no violations", () => {
    const result = evaluateCandidate(baseCandidate, baseConstraints, "500");
    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it("blocks a reverted simulation", () => {
    const result = evaluateCandidate(
      { ...baseCandidate, status: "SIMULATION_REVERTED" },
      baseConstraints,
      "0"
    );
    expect(result.passed).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.violations[0]!.severity).toBe("HARD");
    expect(result.violations[0]!.constraint).toBe("simulation");
  });

  it("blocks when minAmountOut is not met", () => {
    const result = evaluateCandidate(
      baseCandidate,
      { minAmountOut: "1000" },
      "500"
    );
    expect(result.passed).toBe(false);
    expect(result.violations[0]!.constraint).toBe("minAmountOut");
    expect(result.violations[0]!.severity).toBe("HARD");
  });

  it("passes when minAmountOut is met", () => {
    const result = evaluateCandidate(
      baseCandidate,
      { minAmountOut: "100" },
      "500"
    );
    expect(result.passed).toBe(true);
  });

  it("blocks when estimated gas exceeds maxGasWei", () => {
    const result = evaluateCandidate(
      { ...baseCandidate, estimatedGas: "200000" },
      { maxGasWei: "100000" },
      "500"
    );
    expect(result.passed).toBe(false);
    expect(result.violations[0]!.constraint).toBe("maxGasWei");
  });

  it("blocks when already BLOCKED_BY_POLICY", () => {
    const result = evaluateCandidate(
      { ...baseCandidate, status: "BLOCKED_BY_POLICY" },
      baseConstraints,
      "500"
    );
    expect(result.passed).toBe(false);
    expect(result.violations[0]!.constraint).toBe("policy");
  });

  it("propagates pre-existing constraint violations from planning", () => {
    const result = evaluateCandidate(
      { ...baseCandidate, constraintViolations: ["Slippage tolerance exceeded"] },
      baseConstraints,
      "500"
    );
    expect(result.passed).toBe(false);
    expect(result.violations[0]!.constraint).toBe("planning");
    expect(result.violations[0]!.message).toBe("Slippage tolerance exceeded");
  });
});
