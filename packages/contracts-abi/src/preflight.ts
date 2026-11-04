export type PreflightStatus = "SIMULATION_PASSED" | "SIMULATION_REVERTED" | "UNSUPPORTED";

export type RiskLevel = "LOW" | "REVIEW" | "BLOCKED";

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
