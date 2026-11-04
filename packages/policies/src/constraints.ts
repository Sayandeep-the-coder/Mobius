/**
 * Constraint types for evaluating candidate actions.
 * All amounts are decimal strings (base units) — no floating point.
 */
export interface CandidateConstraints {
  minAmountOut?: string;
  maxSlippageBps?: number;
  maxInputAmount?: string;
  maxGasWei?: string;
  minHealthFactor?: string;
  requireHumanApproval?: boolean;
}

export interface ConstraintViolation {
  constraint: string;
  message: string;
  severity: "HARD" | "SOFT";
}

export interface PolicyResult {
  passed: boolean;
  violations: ConstraintViolation[];
}

/**
 * Hard constraints that cannot be relaxed by an LLM or agent.
 * If any hard constraint is violated, the candidate is BLOCKED_BY_POLICY.
 */
export const HARD_CONSTRAINTS = [
  "minAmountOut",
  "maxSlippageBps",
  "maxInputAmount",
  "maxGasWei",
  "minHealthFactor",
] as const;
