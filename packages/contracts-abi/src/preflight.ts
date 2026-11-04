export type PreflightStatus = 'SIMULATION_PASSED' | 'SIMULATION_REVERTED' | 'UNSUPPORTED';
export type RiskLevel = 'LOW' | 'REVIEW' | 'BLOCKED';

export interface PreflightRequest {
  chainId: number;
  from: `0x${string}`;
  to: `0x${string}`;
  data: `0x${string}`;
  value?: string; // decimal wei string, not JS floating point
}

export interface PreflightResponse {
  requestId: string;
  chainId: number;
  status: PreflightStatus;
  riskLevel: RiskLevel;
  blockNumber: string;
  blockHash: `0x${string}`;
  observedAt: string;
  gasEstimate?: string;
  warnings?: string[];
  returnData?: `0x${string}`;
  error?: {
    kind: string;
    selector?: `0x${string}`;
    decodedName?: string;
    message: string;
  };
  recommendations: string[];
  caveat: string;
}

export type PlanDecision = 'EXECUTE' | 'HOLD' | 'HUMAN_REVIEW';
export type CandidateStatus = 'SIMULATION_PASSED' | 'SIMULATION_REVERTED' | 'BLOCKED_BY_POLICY' | 'UNSUPPORTED';
export type RevalidationStatus = 'VALID' | 'REPLAN_REQUIRED' | 'BLOCKED';

export interface StateSnapshot {
  chainId: number;
  blockNumber: string;
  blockHash: `0x${string}`;
  observedAt: string;
  stateFingerprint: string;
  dependencies: Array<{ label: string; address?: `0x${string}`; valueHash: string }>;
}

export interface AgenticPlanRequest {
  chainId: number;
  account: `0x${string}`;
  objective: { type: string; description: string };
  constraints: {
    minAmountOut?: string;
    maxSlippageBps?: number;
    maxInputAmount?: string;
    maxGasWei?: string;
    minHealthFactor?: string;
    requireHumanApproval?: boolean;
  };
  context: { protocol: string; actionFamily: string; parameters: Record<string, string> };
}

export interface CandidateResult {
  candidateId: string;
  strategy: string;
  status: CandidateStatus;
  encodedCalls: Array<{ to: `0x${string}`; data: `0x${string}`; value: string }>;
  estimatedGas?: string;
  expectedStateDelta: Record<string, string>;
  constraintViolations: string[];
  assumptions: string[];
  explanation: string;
}

export interface AgenticPlanResponse {
  planId: string;
  snapshot: StateSnapshot;
  candidates: CandidateResult[];
  selectedCandidateId?: string;
  decision: PlanDecision;
  decisionReason: string;
  caveat: string;
}

export interface RevalidationRequest {
  planId: string;
  candidateId: string;
}

export interface RevalidationResponse {
  planId: string;
  status: RevalidationStatus;
  originalSnapshot: StateSnapshot;
  latestSnapshot: StateSnapshot;
  changedDependencies: string[];
  freshSimulationStatus?: CandidateStatus;
  reason: string;
}
