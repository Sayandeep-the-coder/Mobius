import {
  type Address,
  encodeFunctionData,
  isAddress,
  zeroAddress,
} from "viem";
import { AaveSepoliaClient } from "./aave-client.js";
import { aavePoolAbi, erc20Abi } from "./abis.js";

export type SimulationStatus = "SIMULATION_PASSED" | "NOT_READY" | "SIMULATION_REVERTED";

/**
 * Interest rate modes for Aave V3 borrow/repay.
 * 1 = stable, 2 = variable.
 */
export const INTEREST_RATE_MODE_VARIABLE = 2;

export interface RepayPreflightRequest {
  user: Address;
  asset: Address;
  amount: bigint | string;
  interestRateMode?: number;
  providerAddress?: Address;
}

export interface RepayPreflightResponse {
  chainId: number;
  status: SimulationStatus;
  approvalRequired: boolean;
  poolAddress: Address;
  assetMetadata: {
    address: Address;
    symbol: string;
    decimals: number;
    userBalance: string;
    userAllowance: string;
  };
  requestedAmount: string;
  blockNumber: string;
  gasEstimate?: string;
  preparedTransaction?: {
    to: Address;
    data: `0x${string}`;
    value: string;
    functionName: string;
  };
  approvalTransaction?: {
    to: Address;
    data: `0x${string}`;
    value: string;
    spender: Address;
    amount: string;
  };
  warnings?: string[];
  caveat: string;
}

/**
 * Simulate Pool.repay(asset, amount, interestRateMode, onBehalfOf).
 * Repays outstanding debt, reducing the user's Health Factor risk.
 *
 * Requires ERC-20 approval of the Pool as spender before repayment.
 */
export async function runRepayPreflight(
  client: AaveSepoliaClient,
  request: RepayPreflightRequest
): Promise<RepayPreflightResponse> {
  const chainId = await client.verifyChainId();

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

  const interestRateMode = request.interestRateMode ?? INTEREST_RATE_MODE_VARIABLE;

  // 1. Resolve Pool dynamically
  const { poolAddress, blockNumber } = await client.resolvePool();

  // 2. Read token balance and allowance
  const assetMeta = await client.getAssetMetadata(request.asset, request.user, poolAddress);

  // 3. Balance verification - user must have enough token to repay
  if (assetMeta.userBalance < amountBigInt) {
    return {
      chainId,
      status: "NOT_READY",
      approvalRequired: false,
      poolAddress,
      assetMetadata: {
        address: assetMeta.address,
        symbol: assetMeta.symbol,
        decimals: assetMeta.decimals,
        userBalance: assetMeta.userBalance.toString(),
        userAllowance: assetMeta.userAllowance.toString(),
      },
      requestedAmount: amountBigInt.toString(),
      blockNumber: blockNumber.toString(),
      warnings: [
        `Insufficient token balance: User owns ${assetMeta.userBalance.toString()} ${assetMeta.symbol}, requested repayment of ${amountBigInt.toString()}.`,
      ],
      caveat: "Simulation is snapshot-based at pinned block.",
    };
  }

  // 4. Allowance verification - Pool needs allowance to pull tokens from user
  if (assetMeta.userAllowance < amountBigInt) {
    const approvalCalldata = encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [poolAddress, amountBigInt],
    });

    return {
      chainId,
      status: "NOT_READY",
      approvalRequired: true,
      poolAddress,
      assetMetadata: {
        address: assetMeta.address,
        symbol: assetMeta.symbol,
        decimals: assetMeta.decimals,
        userBalance: assetMeta.userBalance.toString(),
        userAllowance: assetMeta.userAllowance.toString(),
      },
      requestedAmount: amountBigInt.toString(),
      blockNumber: blockNumber.toString(),
      approvalTransaction: {
        to: request.asset,
        data: approvalCalldata,
        value: "0",
        spender: poolAddress,
        amount: amountBigInt.toString(),
      },
      warnings: [
        `Approval required: Current allowance is ${assetMeta.userAllowance.toString()} ${assetMeta.symbol}, requested repayment of ${amountBigInt.toString()}. User must sign ERC-20 approval before repayment.`,
      ],
      caveat: "Approval is a distinct onchain transaction that must settle before repayment.",
    };
  }

  // 5. Simulate Pool.repay(asset, amount, interestRateMode, onBehalfOf)
  try {
    const simulation = await client.client.simulateContract({
      address: poolAddress,
      abi: aavePoolAbi,
      functionName: "repay",
      args: [request.asset, amountBigInt, interestRateMode, request.user],
      account: request.user,
    });

    const repayCalldata = encodeFunctionData({
      abi: aavePoolAbi,
      functionName: "repay",
      args: [request.asset, amountBigInt, interestRateMode, request.user],
    });

    const gasEstimate = simulation.request.gas ? simulation.request.gas.toString() : undefined;

    return {
      chainId,
      status: "SIMULATION_PASSED",
      approvalRequired: false,
      poolAddress,
      assetMetadata: {
        address: assetMeta.address,
        symbol: assetMeta.symbol,
        decimals: assetMeta.decimals,
        userBalance: assetMeta.userBalance.toString(),
        userAllowance: assetMeta.userAllowance.toString(),
      },
      requestedAmount: amountBigInt.toString(),
      blockNumber: blockNumber.toString(),
      gasEstimate,
      preparedTransaction: {
        to: poolAddress,
        data: repayCalldata,
        value: "0",
        functionName: "repay",
      },
      caveat: "Simulation verified against current snapshot state; repayment requires explicit wallet confirmation.",
    };
  } catch (error: any) {
    return {
      chainId,
      status: "SIMULATION_REVERTED",
      approvalRequired: false,
      poolAddress,
      assetMetadata: {
        address: assetMeta.address,
        symbol: assetMeta.symbol,
        decimals: assetMeta.decimals,
        userBalance: assetMeta.userBalance.toString(),
        userAllowance: assetMeta.userAllowance.toString(),
      },
      requestedAmount: amountBigInt.toString(),
      blockNumber: blockNumber.toString(),
      warnings: [`Simulation reverted: ${error?.shortMessage || error?.message || "Unknown error"}`],
      caveat: "EVM reverted during repay simulation against current snapshot state.",
    };
  }
}
