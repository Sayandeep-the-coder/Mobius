import {
  type Address,
  encodeFunctionData,
  isAddress,
  zeroAddress,
} from "viem";
import { AaveSepoliaClient, type AssetMetadata } from "./aave-client.js";
import { aavePoolAbi, erc20Abi } from "./abis.js";

export type SimulationStatus = "SIMULATION_PASSED" | "NOT_READY" | "SIMULATION_REVERTED";

export interface SupplyPreflightRequest {
  user: Address;
  asset: Address;
  amount: bigint | string;
  providerAddress?: Address;
}

export interface SupplyPreflightResponse {
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

export async function runSupplyPreflight(
  client: AaveSepoliaClient,
  request: SupplyPreflightRequest
): Promise<SupplyPreflightResponse> {
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

  // 1. Resolve Pool dynamically
  const { poolAddress, blockNumber } = await client.resolvePool();

  // 2. Read token balance and allowance
  const assetMeta: AssetMetadata = await client.getAssetMetadata(
    request.asset,
    request.user,
    poolAddress
  );

  // 3. Balance verification
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
        `Insufficient token balance: User owns ${assetMeta.userBalance.toString()} ${assetMeta.symbol}, requested ${amountBigInt.toString()}.`,
      ],
      caveat: "Simulation is snapshot-based and reflects state at pinned block.",
    };
  }

  // 4. Allowance verification gate
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
        `Approval required: Current allowance is ${assetMeta.userAllowance.toString()} ${assetMeta.symbol}, requested ${amountBigInt.toString()}. User must sign ERC-20 approval before supply.`,
      ],
      caveat: "Approval is a distinct onchain transaction that must settle before supply preflight can pass.",
    };
  }

  // 5. Simulate Pool.supply(asset, amount, user, 0)
  try {
    const simulation = await client.client.simulateContract({
      address: poolAddress,
      abi: aavePoolAbi,
      functionName: "supply",
      args: [request.asset, amountBigInt, request.user, 0],
      account: request.user,
    });

    const supplyCalldata = encodeFunctionData({
      abi: aavePoolAbi,
      functionName: "supply",
      args: [request.asset, amountBigInt, request.user, 0],
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
        data: supplyCalldata,
        value: "0",
        functionName: "supply",
      },
      caveat: "Simulation is snapshot-based at pinned block; execution requires explicit wallet authorization.",
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
      caveat: "EVM reverted during supply simulation against current snapshot state.",
    };
  }
}
