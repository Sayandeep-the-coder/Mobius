import { type PublicClient, type Address, type Hex } from "viem";

export interface SimulateCallInput {
  client: PublicClient;
  from: Address;
  to: Address;
  data: Hex;
  value?: bigint;
  blockNumber: bigint;
}

export interface SimulateCallResult {
  status: "SIMULATION_PASSED" | "SIMULATION_REVERTED";
  returnData?: `0x${string}`;
  gasEstimate?: string;
  gasWarning?: string;
  error?: {
    kind: string;
    selector?: `0x${string}`;
    decodedName?: string;
    message: string;
  };
}

/**
 * Simulates a single call against a pinned block snapshot.
 * Uses eth_call and estimateGas. Never persists state between calls.
 */
export async function simulateCall(input: SimulateCallInput): Promise<SimulateCallResult> {
  const { client, from, to, data, value, blockNumber } = input;

  let callResult;
  try {
    callResult = await client.call({
      account: from,
      to,
      data,
      value: value ?? 0n,
      blockNumber,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown call error";
    return {
      status: "SIMULATION_REVERTED",
      error: {
        kind: "CALL_REVERT",
        message,
      },
    };
  }

  let gasEstimate: string | undefined;
  let gasWarning: string | undefined;
  try {
    const estimated = await client.estimateGas({
      account: from,
      to,
      data,
      value: value ?? 0n,
      blockNumber,
    });
    gasEstimate = estimated.toString();
  } catch (error: unknown) {
    gasWarning = error instanceof Error ? error.message : "Gas estimation unavailable";
  }

  return {
    status: "SIMULATION_PASSED",
    returnData: callResult.data,
    gasEstimate,
    gasWarning,
  };
}
