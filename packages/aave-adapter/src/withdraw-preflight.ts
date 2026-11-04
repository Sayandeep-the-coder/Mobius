import {
  type Address,
  encodeFunctionData,
  isAddress,
  zeroAddress,
} from "viem";
import { AaveSepoliaClient } from "./aave-client.js";
import { aavePoolAbi, erc20Abi, protocolDataProviderAbi } from "./abis.js";
import { AAVE_SEPOLIA_PROTOCOL_DATA_PROVIDER } from "./constants.js";
import type { SimulationStatus } from "./supply-preflight.js";

export interface WithdrawPreflightRequest {
  user: Address;
  asset: Address;
  amount: bigint | string;
  protocolDataProviderAddress?: Address;
}

export interface WithdrawPreflightResponse {
  chainId: number;
  status: SimulationStatus;
  poolAddress: Address;
  aTokenAddress: Address;
  userATokenBalance: string;
  requestedAmount: string;
  blockNumber: string;
  gasEstimate?: string;
  preparedTransaction?: {
    to: Address;
    data: `0x${string}`;
    value: string;
    functionName: string;
  };
  warnings?: string[];
  caveat: string;
}

export async function runWithdrawPreflight(
  client: AaveSepoliaClient,
  request: WithdrawPreflightRequest
): Promise<WithdrawPreflightResponse> {
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

  const { poolAddress, blockNumber } = await client.resolvePool();
  const dataProvider =
    request.protocolDataProviderAddress || AAVE_SEPOLIA_PROTOCOL_DATA_PROVIDER;

  // Query reserve token addresses to find aToken
  const [aTokenAddress] = await client.client.readContract({
    address: dataProvider,
    abi: protocolDataProviderAbi,
    functionName: "getReserveTokensAddresses",
    args: [request.asset],
  });

  const aTokenBalance = await client.client.readContract({
    address: aTokenAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [request.user],
  });

  if (aTokenBalance < amountBigInt) {
    return {
      chainId,
      status: "NOT_READY",
      poolAddress,
      aTokenAddress,
      userATokenBalance: aTokenBalance.toString(),
      requestedAmount: amountBigInt.toString(),
      blockNumber: blockNumber.toString(),
      warnings: [
        `Insufficient collateral: User holds ${aTokenBalance.toString()} aTokens, requested withdrawal of ${amountBigInt.toString()}.`,
      ],
      caveat: "Simulation is snapshot-based at pinned block.",
    };
  }

  // Simulate Pool.withdraw(asset, amount, user)
  try {
    const simulation = await client.client.simulateContract({
      address: poolAddress,
      abi: aavePoolAbi,
      functionName: "withdraw",
      args: [request.asset, amountBigInt, request.user],
      account: request.user,
    });

    const withdrawCalldata = encodeFunctionData({
      abi: aavePoolAbi,
      functionName: "withdraw",
      args: [request.asset, amountBigInt, request.user],
    });

    const gasEstimate = simulation.request.gas ? simulation.request.gas.toString() : undefined;

    return {
      chainId,
      status: "SIMULATION_PASSED",
      poolAddress,
      aTokenAddress,
      userATokenBalance: aTokenBalance.toString(),
      requestedAmount: amountBigInt.toString(),
      blockNumber: blockNumber.toString(),
      gasEstimate,
      preparedTransaction: {
        to: poolAddress,
        data: withdrawCalldata,
        value: "0",
        functionName: "withdraw",
      },
      caveat: "Simulation verified against current snapshot state; withdrawal requires explicit wallet confirmation.",
    };
  } catch (error: any) {
    return {
      chainId,
      status: "SIMULATION_REVERTED",
      poolAddress,
      aTokenAddress,
      userATokenBalance: aTokenBalance.toString(),
      requestedAmount: amountBigInt.toString(),
      blockNumber: blockNumber.toString(),
      warnings: [`Simulation reverted: ${error?.shortMessage || error?.message || "Unknown error"}`],
      caveat: "EVM reverted during withdraw simulation against current snapshot state.",
    };
  }
}
