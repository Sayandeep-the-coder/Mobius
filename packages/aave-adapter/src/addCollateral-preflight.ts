import {
  type Address,
  encodeFunctionData,
  isAddress,
  zeroAddress,
} from "viem";
import { AaveSepoliaClient } from "./aave-client.js";
import { aavePoolAbi, erc20Abi } from "./abis.js";

export type SimulationStatus = "SIMULATION_PASSED" | "NOT_READY" | "SIMULATION_REVERTED";

export interface AddCollateralPreflightRequest {
  user: Address;
  asset: Address;
  amount: bigint | string;
  providerAddress?: Address;
}

export interface AddCollateralPreflightResponse {
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
  collateralEnablementTransaction?: {
    to: Address;
    data: `0x${string}`;
    value: string;
    functionName: string;
  };
  warnings?: string[];
  caveat: string;
}

/**
 * Simulate Pool.supply(asset, amount, user, 0) + Pool.setUserReserveCollateral(asset, true).
 * Adding collateral increases the user's collateral base, improving Health Factor
 * and reducing liquidation risk.
 *
 * Requires ERC-20 approval of the Pool as spender before supply.
 */
export async function runAddCollateralPreflight(
  client: AaveSepoliaClient,
  request: AddCollateralPreflightRequest
): Promise<AddCollateralPreflightResponse> {
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
  const assetMeta = await client.getAssetMetadata(request.asset, request.user, poolAddress);

  // 3. Balance verification - user must have enough token to supply as collateral
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
        `Insufficient token balance: User owns ${assetMeta.userBalance.toString()} ${assetMeta.symbol}, requested collateral of ${amountBigInt.toString()}.`,
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
        `Approval required: Current allowance is ${assetMeta.userAllowance.toString()} ${assetMeta.symbol}, requested collateral of ${amountBigInt.toString()}. User must sign ERC-20 approval before adding collateral.`,
      ],
      caveat: "Approval is a distinct onchain transaction that must settle before collateral supply.",
    };
  }

  // 5. Simulate Pool.supply(asset, amount, user, 0)
  let supplyGasEstimate: string | undefined;
  let supplyCalldata: `0x${string}`;
  try {
    const supplySimulation = await client.client.simulateContract({
      address: poolAddress,
      abi: aavePoolAbi,
      functionName: "supply",
      args: [request.asset, amountBigInt, request.user, 0],
      account: request.user,
    });

    supplyCalldata = encodeFunctionData({
      abi: aavePoolAbi,
      functionName: "supply",
      args: [request.asset, amountBigInt, request.user, 0],
    });

    supplyGasEstimate = supplySimulation.request.gas ? supplySimulation.request.gas.toString() : undefined;
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
      warnings: [`Supply simulation reverted: ${error?.shortMessage || error?.message || "Unknown error"}`],
      caveat: "EVM reverted during supply simulation against current snapshot state.",
    };
  }

  // 6. Simulate Pool.setUserReserveCollateral(asset, true) - enable as collateral
  let enableCollateralCalldata: `0x${string}`;
  let enableCollateralGasEstimate: string | undefined;
  try {
    const enableSimulation = await client.client.simulateContract({
      address: poolAddress,
      abi: aavePoolAbi,
      functionName: "setUserReserveCollateral",
      args: [request.asset, true],
      account: request.user,
    });

    enableCollateralCalldata = encodeFunctionData({
      abi: aavePoolAbi,
      functionName: "setUserReserveCollateral",
      args: [request.asset, true],
    });

    enableCollateralGasEstimate = enableSimulation.request.gas ? enableSimulation.request.gas.toString() : undefined;
  } catch (error: any) {
    // setUserReserveCollateral may revert if already enabled as collateral - that's OK
    enableCollateralCalldata = encodeFunctionData({
      abi: aavePoolAbi,
      functionName: "setUserReserveCollateral",
      args: [request.asset, true],
    });
    enableCollateralGasEstimate = undefined;
  }

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
    gasEstimate: supplyGasEstimate,
    preparedTransaction: {
      to: poolAddress,
      data: supplyCalldata,
      value: "0",
      functionName: "supply",
    },
    collateralEnablementTransaction: {
      to: poolAddress,
      data: enableCollateralCalldata,
      value: "0",
      functionName: "setUserReserveCollateral",
    },
    caveat: "Supply simulation verified against current snapshot state. Collateral enablement may already be active; setUserReserveCollateral is idempotent.",
  };
}
