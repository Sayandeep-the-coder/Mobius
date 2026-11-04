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
  gasEstimate?: string;
  preparedTransaction?: {
    to: `0x${string}`;
    data: `0x${string}`;
    value: string;
  };
  approvalTransaction?: {
    to: `0x${string}`;
    data: `0x${string}`;
    value: string;
    spender: `0x${string}`;
    amount: string;
  };
  caveat?: string;
}

export interface AaveWithdrawPreflightRequest {
  user: `0x${string}`;
  asset: `0x${string}`;
  amount: string;
}

export interface AaveWithdrawPreflightResponse {
  chainId: 11155111;
  blockNumber: string;
  blockHash: `0x${string}`;
  pool: `0x${string}`;
  aTokenAddress: `0x${string}`;
  userATokenBalance: string;
  requestedAmount: string;
  simulationStatus: "NOT_READY" | "PASSED" | "REVERTED";
  gasEstimate?: string;
  preparedTransaction?: {
    to: `0x${string}`;
    data: `0x${string}`;
    value: string;
  };
  reason?: string;
  caveat: string;
}
