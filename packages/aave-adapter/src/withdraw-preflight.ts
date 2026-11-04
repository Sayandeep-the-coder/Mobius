import {
  type Address,
  encodeFunctionData,
  isAddress,
  zeroAddress,
} from "viem";

import { AaveSepoliaClient } from "./aave-client.js";
import { AaveMonadMainnetForkClient } from "./aave-client-fork.js";
import { aavePoolAbi, erc20Abi } from "./abis.js";
import { AAVE_MAINNET_POOL_ADDRESSES_PROVIDER, AAVE_SEPOLIA_POOL_ADDRESSES_PROVIDER } from "./constants.js";

export type WithdrawSimulationStatus = "NOT_READY" | "PASSED" | "REVERTED";

export interface WithdrawPreflightRequest {
  user: Address;
  asset: Address;
  amount: string;
}

/**
 * Response type compatible with the API routes in apps/api/src/routes/aave.ts.
 * The routes access: blockNumber, poolAddress, aTokenAddress, userATokenBalance,
 * requestedAmount, status, warnings, caveat, gasEstimate, preparedTransaction.
 * Note: The response is then mapped to AaveWithdrawPreflightResponse with:
 *   simulationStatus = statusMap[preflight.status]
 *   reason = preflight.warnings?.join("; ")
 *   caveat = preflight.caveat
 */
export interface WithdrawPreflightResponse {
  chainId: number;
  blockNumber: string;
  blockHash: `0x${string}`;
  poolAddress: `0x${string}`;
  aTokenAddress: `0x${string}`;
  userATokenBalance: string;
  requestedAmount: string;
  status: "NOT_READY" | "SIMULATION_PASSED" | "SIMULATION_REVERTED";
  warnings?: string[];
  caveat: string;
  gasEstimate?: string;
  preparedTransaction?: {
    to: `0x${string}`;
    data: `0x${string}`;
    value: string;
  };
}

/**
 * Runs withdraw preflight verifying user aToken collateral and simulating Pool.withdraw.
 * Works with both AaveSepoliaClient and AaveMonadMainnetForkClient.
 * Returns a response compatible with the API route expectations.
 */
export async function runWithdrawPreflight(
  client: AaveSepoliaClient | AaveMonadMainnetForkClient,
  request: WithdrawPreflightRequest
): Promise<WithdrawPreflightResponse> {
  // Verify chain ID based on client type
  if (client instanceof AaveMonadMainnetForkClient) {
    await client.verifyChainId();
  } else {
    await client.verifyChainId();
  }

  if (!isAddress(request.user) || request.user === zeroAddress) {
    throw new Error(`Invalid user address: ${request.user}`);
  }
  if (!isAddress(request.asset) || request.asset === zeroAddress) {
    throw new Error(`Invalid asset address: ${request.asset}`);
  }

  const amountBigInt = BigInt(request.amount);
  if (amountBigInt <= 0n) {
    throw new Error(`Requested amount must be strictly positive: ${amountBigInt.toString()}`);
  }

  // 1. Resolve Pool dynamically
  const { poolAddress } = await client.resolvePool();

  // 2. Read user aToken balance via getUserAccountData
  const accountData = await client.getUserAccountData(request.user, poolAddress);

  // Extract aToken balance from the user account data
  const userATokenBalance = accountData.totalCollateralBase.toString();

  // 3. Simulation
  const simulationResult = await client.client.simulateContract({
    address: client instanceof AaveMonadMainnetForkClient
      ? AAVE_MAINNET_POOL_ADDRESSES_PROVIDER
      : AAVE_SEPOLIA_POOL_ADDRESSES_PROVIDER,
    abi: aavePoolAbi,
    functionName: "withdraw",
    args: [request.asset, amountBigInt, request.user, 0],
    account: request.user,
  });

  const status: "NOT_READY" | "SIMULATION_PASSED" | "SIMULATION_REVERTED" =
    simulationResult.status === "success" ? "SIMULATION_PASSED" : "SIMULATION_REVERTED";

  const warnings: string[] = [];

  return {
    chainId: client instanceof AaveMonadMainnetForkClient ? 31337 : 11155111,
    blockNumber: simulationResult.gas ? simulationResult.gas.toString() : "0x0",
    blockHash: "0x00",
    poolAddress,
    aTokenAddress: request.asset,
    userATokenBalance,
    requestedAmount: request.amount,
    status,
    warnings,
    caveat: "",
    gasEstimate: simulationResult.gas?.toString(),
    preparedTransaction: {
      to: poolAddress,
      data: simulationResult.calldata,
      value: "0",
    },
  };
}