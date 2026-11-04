/**
 * Mobius API Service Layer
 * Connects frontend clients to the agentic transaction intelligence Express backend.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:8787'
    : '');

let connectedAccount: string | undefined;

export function setConnectedAccount(address?: string) {
  connectedAccount = address;
  if (typeof window !== 'undefined') {
    if (address) {
      localStorage.setItem('mobius_wallet_address', address);
    } else {
      localStorage.removeItem('mobius_wallet_address');
    }
  }
}

export function getConnectedAccount(): string | undefined {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('mobius_wallet_address');
    if (stored) {
      connectedAccount = stored;
    }
  }
  return connectedAccount;
}

async function fetchJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
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
// Health & Chain Metadata
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

export async function getHealth(): Promise<HealthResponse> {
  return fetchJson<HealthResponse>('/health');
}

export async function getChains(): Promise<ChainConfig[]> {
  return fetchJson<ChainConfig[]>('/v1/chains');
}

// ─────────────────────────────────────────────────────────────────────────────
// Agentic Planning & Simulation
// ─────────────────────────────────────────────────────────────────────────────

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
  status: 'SIMULATION_PASSED' | 'SIMULATION_REVERTED' | 'POLICY_VIOLATED' | 'NOT_READY';
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
  decision: 'EXECUTE' | 'HOLD' | 'REJECT';
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

export async function agenticPlanNatural(data: NaturalPlanRequest): Promise<AgenticPlanResponse> {
  return fetchJson<AgenticPlanResponse>('/v1/agentic/plan/natural', {
    method: 'POST',
    body: JSON.stringify({
      chainId: data.chainId,
      account: data.account,
      objective: data.objective,
      constraints: data.constraints || {},
      context: data.context || {
        protocol: 'MockSwapTarget',
        actionFamily: 'swap',
        parameters: {},
      },
    }),
  });
}

export async function agenticPlan(data: {
  chainId: number;
  account: string;
  objective: { type: string; description: string };
  constraints: Record<string, unknown>;
  context: { protocol: string; actionFamily: string; parameters: Record<string, string> };
}): Promise<AgenticPlanResponse> {
  return fetchJson<AgenticPlanResponse>('/v1/agentic/plan', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Preflight & Revalidation
// ─────────────────────────────────────────────────────────────────────────────

export interface PreflightRequest {
  chainId: number;
  from: string;
  to: string;
  data: string;
  value?: string;
}

export interface PreflightResponse {
  status: 'SIMULATION_PASSED' | 'SIMULATION_REVERTED';
  chainId: number;
  blockNumber: string;
  blockHash: string;
  gasEstimate?: string;
  reason?: string;
}

export async function preflightCheck(data: PreflightRequest): Promise<PreflightResponse> {
  return fetchJson<PreflightResponse>('/v1/preflight', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export interface RevalidateRequest {
  planId: string;
  candidateId: string;
  chainId: number;
  targetAddress: string;
}

export interface RevalidateResponse {
  planId: string;
  status: 'VALID' | 'REPLAN_REQUIRED' | 'BLOCKED';
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

export async function agenticRevalidate(data: RevalidateRequest): Promise<RevalidateResponse> {
  return fetchJson<RevalidateResponse>('/v1/agentic/revalidate', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Execution Lifecycle
// ─────────────────────────────────────────────────────────────────────────────

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
  status: 'PREPARED';
  transaction: {
    chainId: number;
    from: string;
    to: string;
    data: string;
    value: string;
    note: string;
  };
}

export async function executionPrepare(data: ExecutionPrepareRequest): Promise<ExecutionPrepareResponse> {
  return fetchJson<ExecutionPrepareResponse>('/v1/execution/prepare', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function executionSubmit(
  id: string,
  data: { txHash: string; rawTransaction?: string }
): Promise<{ executionId: string; status: 'SUBMITTED'; txHash: string }> {
  return fetchJson<{ executionId: string; status: 'SUBMITTED'; txHash: string }>(
    `/v1/execution/${id}/submit`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  );
}

export async function getExecution(id: string): Promise<Record<string, unknown>> {
  return fetchJson<Record<string, unknown>>(`/v1/execution/${id}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Aave V3 Sepolia & Monad Fork Routes
// ─────────────────────────────────────────────────────────────────────────────

export interface AaveMarketResponse {
  chainId: number;
  network: string;
  poolAddressesProvider: string;
  pool: string;
  observedAtBlock: string;
  note: string;
}

export async function aaveMarket(): Promise<AaveMarketResponse> {
  return fetchJson<AaveMarketResponse>('/v1/aave/sepolia/market');
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
  simulationStatus: 'NOT_READY' | 'PASSED' | 'REVERTED';
  gasEstimate?: string;
  preparedTransaction?: {
    to: string;
    data: string;
    value: string;
  };
}

export async function aaveSupplyPreflight(
  data: AaveSupplyPreflightRequest
): Promise<AaveSupplyPreflightResponse> {
  return fetchJson<AaveSupplyPreflightResponse>('/v1/aave/sepolia/supply/preflight', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

