/**
 * Mobius API Service Layer
 * Connects frontend clients to the agentic transaction intelligence Express backend.
 */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:8787"
    : "");

let connectedAccount: string | undefined;

export function setConnectedAccount(address?: string) {
  connectedAccount = address;
  if (typeof window !== "undefined") {
    if (address) {
      localStorage.setItem("mobius_wallet_address", address);
    } else {
      localStorage.removeItem("mobius_wallet_address");
    }
  }
}

export function getConnectedAccount(): string | undefined {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("mobius_wallet_address");
    if (stored) {
      connectedAccount = stored;
    }
  }
  return connectedAccount;
}

async function fetchJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || errorBody.error || `HTTP error ${response.status}`);
  }

  return response.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// Type Definitions
// ─────────────────────────────────────────────────────────────────────────────

export interface HealthResponse {
  status: string;
  service: string;
  nodeEnv: string;
}

export interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  explorerUrl?: string;
}

export interface NaturalPlanRequest {
  chainId: number;
  account: string;
  objective: string;
  constraints?: {
    minAmountOut?: string;
    maxSlippageBps?: number;
    maxInputAmount?: string;
    maxGasWei?: string;
    minHealthFactor?: string;
    requireHumanApproval?: boolean;
  };
  context?: {
    protocol: string;
    actionFamily: string;
    parameters?: Record<string, string>;
  };
}

export interface CandidateCall {
  to: string;
  data: string;
  value: string;
}

export interface Candidate {
  candidateId: string;
  strategy: string;
  status: "SIMULATION_PASSED" | "SIMULATION_REVERTED" | "POLICY_VIOLATED" | "NOT_READY";
  encodedCalls: CandidateCall[];
  estimatedGas: string;
  expectedStateDelta: Record<string, unknown>;
  constraintViolations: string[];
  assumptions: string[];
  explanation: string;
}

export interface AgenticPlanResponse {
  planId: string;
  snapshot: {
    chainId: number;
    blockNumber: string;
    blockHash: string;
    observedAt: string;
    stateFingerprint: string;
    dependencies: Array<{ label: string; valueHash?: string; address?: string }>;
  };
  candidates: Candidate[];
  selectedCandidateId: string;
  decision: "EXECUTE" | "HOLD" | "REJECT";
  decisionReason: string;
  caveat: string;
  humanExplanation: string;
  llmUsed: boolean;
  llmProposedStrategies?: string[];
  llmParsedIntent?: {
    objective: { type: string; description: string };
    context: { protocol: string; actionFamily: string; parameters: Record<string, string> };
  };
}

export interface PreflightRequest {
  chainId: number;
  from: string;
  to: string;
  data: string;
  value?: string;
}

export interface PreflightResponse {
  status: "SIMULATION_PASSED" | "SIMULATION_REVERTED";
  chainId: number;
  blockNumber: string;
  blockHash: string;
  gasEstimate?: string;
  reason?: string;
}

export interface RevalidateRequest {
  planId: string;
  candidateId: string;
  chainId: number;
  targetAddress: string;
}

export interface RevalidateResponse {
  planId: string;
  status: "VALID" | "REPLAN_REQUIRED" | "BLOCKED";
  originalSnapshot?: unknown;
  latestSnapshot?: {
    chainId: number;
    blockNumber: string;
    blockHash: string;
    stateFingerprint: string;
  };
  changedDependencies?: string[];
  freshSimulationStatus?: string;
  reason: string;
  humanExplanation?: string;
  llmUsed?: boolean;
}

export interface ExecutionPrepareRequest {
  planId: string;
  candidateId: string;
  chainId: number;
  from: string;
  to: string;
  data: string;
  value?: string;
}

export interface ExecutionPrepareResponse {
  executionId: string;
  status: "PREPARED";
  transaction: {
    chainId: number;
    from: string;
    to: string;
    data: string;
    value: string;
    note: string;
  };
}

export interface AaveMarketResponse {
  chainId: number;
  network: string;
  poolAddressesProvider: string;
  pool: string;
  observedAtBlock: string;
  note: string;
}

export interface AaveSupplyPreflightRequest {
  user: string;
  asset?: string;
  amount: string; // decimal base units
}

export interface AaveSupplyPreflightResponse {
  chainId: number;
  blockNumber: string;
  pool: string;
  asset: string;
  user: string;
  balance: string;
  allowance: string;
  approvalRequired: boolean;
  canSimulateSupply: boolean;
  simulationStatus: "NOT_READY" | "PASSED" | "REVERTED";
  gasEstimate?: string;
  preparedTransaction?: {
    to: string;
    data: string;
    value: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Unified API Client Object (As requested in Specification)
// ─────────────────────────────────────────────────────────────────────────────

export const api = {
  // Health
  health: (): Promise<HealthResponse> =>
    fetch(`${API_BASE}/health`).then((r) => r.json()),

  // Chains
  chains: (): Promise<ChainConfig[]> =>
    fetch(`${API_BASE}/v1/chains`).then((r) => r.json()),

  // Preflight check
  preflight: (data: PreflightRequest): Promise<PreflightResponse> =>
    fetch(`${API_BASE}/v1/preflight`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => r.json()),

  // Agentic - typed plan
  agenticPlan: (data: {
    chainId: number;
    account: string;
    objective: { type: string; description: string };
    constraints: Record<string, unknown>;
    context: { protocol: string; actionFamily: string; parameters: Record<string, string> };
  }): Promise<AgenticPlanResponse> =>
    fetch(`${API_BASE}/v1/agentic/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => r.json()),

  // Agentic - natural language plan
  agenticPlanNatural: (data: NaturalPlanRequest): Promise<AgenticPlanResponse> =>
    fetch(`${API_BASE}/v1/agentic/plan/natural`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chainId: data.chainId,
        account: data.account,
        objective: data.objective,
        constraints: data.constraints || {},
        context: data.context || {
          protocol: "MockSwapTarget",
          actionFamily: "swap",
          parameters: {},
        },
      }),
    }).then((r) => r.json()),

  // Agentic - revalidate
  agenticRevalidate: (data: RevalidateRequest): Promise<RevalidateResponse> =>
    fetch(`${API_BASE}/v1/agentic/revalidate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => r.json()),

  // Execution prepare (handles either string executionId or full request object)
  executionPrepare: (idOrData: string | ExecutionPrepareRequest): Promise<ExecutionPrepareResponse> => {
    if (typeof idOrData === "string") {
      return fetch(`${API_BASE}/v1/execution/${idOrData}/prepare`).then((r) => r.json());
    }
    return fetch(`${API_BASE}/v1/execution/prepare`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(idOrData),
    }).then((r) => r.json());
  },

  // Execution submit
  executionSubmit: (
    id: string,
    signedData: { txHash: string; rawTransaction?: string }
  ): Promise<{ executionId: string; status: "SUBMITTED"; txHash: string }> =>
    fetch(`${API_BASE}/v1/execution/${id}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(signedData),
    }).then((r) => r.json()),

  // Aave market
  aaveMarket: (): Promise<AaveMarketResponse> =>
    fetch(`${API_BASE}/v1/aave/sepolia/market`).then((r) => r.json()),

  // Aave supply preflight
  aaveSupplyPreflight: (data: AaveSupplyPreflightRequest): Promise<AaveSupplyPreflightResponse> =>
    fetch(`${API_BASE}/v1/aave/sepolia/supply/preflight`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => r.json()),
};

// Also export standalone functions for existing direct imports
export const getHealth = api.health;
export const getChains = api.chains;
export const preflightCheck = api.preflight;
export const agenticPlan = api.agenticPlan;
export const agenticPlanNatural = api.agenticPlanNatural;
export const agenticRevalidate = api.agenticRevalidate;
export const executionPrepare = api.executionPrepare;
export const executionSubmit = api.executionSubmit;
export const aaveMarket = api.aaveMarket;
export const aaveSupplyPreflight = api.aaveSupplyPreflight;

export default api;
