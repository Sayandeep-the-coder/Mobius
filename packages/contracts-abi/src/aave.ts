export interface AaveSupplyPreflightRequest {
  user: `0x${string}`;
  asset: `0x${string}`;
  amount: string; // base units, decimal string
}

export interface AaveSupplyPreflightResponse {
  chainId: 11155111;
  blockNumber: string;
  blockHash: `0x${string}`;
  pool: `0x${string}`;
  asset: `0x${string}`;
  user: `0x${string}`;
  balance: string;
  allowance: string;
  approvalRequired: boolean;
  canSimulateSupply: boolean;
  simulationStatus: "NOT_READY" | "PASSED" | "REVERTED";
  reason?: string;
}
