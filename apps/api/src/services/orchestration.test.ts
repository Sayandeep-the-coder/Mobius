import { describe, it, expect, vi } from "vitest";
import { OrchestrationService } from "./orchestration-service";
import type { PublicClient } from "viem";
import type { Hex } from "viem";
import type { AgenticPlanRequest, AgenticPlanResponse } from "@mobius/contracts-abi";

/**
 * Mock PublicClient for testing without RPC dependency.
 */
function createMockClient(options: {
  chainId: number;
  blockNumber: bigint;
  blockHash: `0x${string}`;
  callResult?: {
    status: "SIMULATION_PASSED" | "SIMULATION_REVERTED";
    returnData?: Hex;
    errorMessage?: string;
    gasEstimate?: string;
  };
}): PublicClient {
  return {
    chain: { id: options.chainId } as any,
    getBlock: vi.fn().mockResolvedValue({
      number: options.blockNumber,
      hash: options.blockHash,
    }),
    call: vi.fn().mockImplementation(async () => {
      if (options.callResult?.status === "SIMULATION_REVERTED") {
        throw new Error(options.callResult.errorMessage ?? "execution reverted");
      }
      return {
        data: options.callResult?.returnData ?? "0x",
      } as any;
    }),
    estimateGas: vi.fn().mockResolvedValue(
      options.callResult?.gasEstimate ? BigInt(options.callResult.gasEstimate) : 20000n
    ),
  } as unknown as PublicClient;
}

function createPlanRequest(overrides: Partial<AgenticPlanRequest> = {}): AgenticPlanRequest {
  return {
    chainId: 10143,
    account: "0x1234567890123456789012345678901234567890" as `0x${string}`,
    objective: { type: "execute_swap", description: "Execute swap with minOut constraint" },
    constraints: {},
    context: {
      protocol: "MockSwapTarget",
      actionFamily: "swap",
      parameters: {
        target: "0xabcdef123456789012345678901234567890abcdef" as `0x${string}`,
        amountIn: "100",
        minOut: "90",
        ...(overrides.context?.parameters as Record<string, string>),
      },
      ...overrides.context,
    },
    ...overrides,
  } as AgenticPlanRequest;
}

describe("OrchestrationService", () => {
  const targetAddress = "0xabcdef123456789012345678901234567890abcdef" as `0x${string}`;

  it("returns EXECUTE when swap candidate passes simulation and policy", async () => {
    const client = createMockClient({
      chainId: 10143,
      blockNumber: 1000n,
      blockHash: "0xabc123" as `0x${string}`,
      callResult: {
        status: "SIMULATION_PASSED",
        returnData: "0x0000000000000000000000000000000000000000000000000000000000000064",
        gasEstimate: "50000",
      },
    });

    const request = createPlanRequest({
      context: {
        protocol: "MockSwapTarget",
        actionFamily: "swap",
        parameters: {
          target: targetAddress,
          amountIn: "100",
          minOut: "90",
        },
      },
    });

    const orchestration = new OrchestrationService();
    const response = await orchestration.plan(client, request, targetAddress);

    expect(response.decision).toBe("EXECUTE");
    expect(response.candidates).toHaveLength(2);
    expect(response.candidates[0]!.strategy).toBe("execute_swap");
    expect(response.candidates[1]!.strategy).toBe("hold_defer");
    expect(response.snapshot.chainId).toBe(10143);
    expect(response.snapshot.blockNumber).toBe("1000");
    expect(response.caveat).toContain("Snapshot simulation only");
  });

  it("returns HOLD when swap reverts due to stale quote", async () => {
    const client = createMockClient({
      chainId: 10143,
      blockNumber: 1000n,
      blockHash: "0xabc123" as `0x${string}`,
      callResult: {
        status: "SIMULATION_REVERTED",
        errorMessage: "execution reverted: SlippageExceeded(0x0000000000000000000000000000000000000000000000000000000000000032, 0x000000000000000000000000000000000000000000000000000000000000005a)",
      },
    });

    const request = createPlanRequest({
      context: {
        protocol: "MockSwapTarget",
        actionFamily: "swap",
        parameters: {
          target: targetAddress,
          amountIn: "100",
          minOut: "90",
        },
      },
    });

    const orchestration = new OrchestrationService();
    const response = await orchestration.plan(client, request, targetAddress);

    expect(response.decision).toBe("HOLD");
    const swapCandidate = response.candidates.find((c: any) => c.strategy === "execute_swap");
    expect(swapCandidate?.status).toBe("SIMULATION_REVERTED");
    expect(swapCandidate?.explanation).toContain("SlippageExceeded");
  });

  it("blocks when minAmountOut constraint is violated", async () => {
    const client = createMockClient({
      chainId: 10143,
      blockNumber: 1000n,
      blockHash: "0xabc123" as `0x${string}`,
      callResult: {
        status: "SIMULATION_PASSED",
        returnData: "0x0000000000000000000000000000000000000000000000000000000000000032", // output = 50, below minOut 90
        gasEstimate: "50000",
      },
    });

    const request = createPlanRequest({
      context: {
        protocol: "MockSwapTarget",
        actionFamily: "swap",
        parameters: {
          target: targetAddress,
          amountIn: "100",
          minOut: "90",
        },
      },
    });

    const orchestration = new OrchestrationService();
    const response = await orchestration.plan(client, request, targetAddress);

    const swapCandidate = response.candidates.find((c: any) => c.strategy === "execute_swap");
    expect(swapCandidate?.status).toBe("BLOCKED_BY_POLICY");
    expect(swapCandidate?.constraintViolations).toContain(
      "Actual output 50 is below minimum 90"
    );
  });

  it("includes HOLD candidate as safe fallback", async () => {
    const client = createMockClient({
      chainId: 10143,
      blockNumber: 1000n,
      blockHash: "0xabc123" as `0x${string}`,
      callResult: {
        status: "SIMULATION_REVERTED",
        errorMessage: "execution reverted: InvalidAmount()",
      },
    });

    const request = createPlanRequest({
      context: {
        protocol: "MockSwapTarget",
        actionFamily: "swap",
        parameters: {
          target: targetAddress,
          amountIn: "0",
          minOut: "90",
        },
      },
    });

    const orchestration = new OrchestrationService();
    const response = await orchestration.plan(client, request, targetAddress);

    const holdCandidate = response.candidates.find((c: any) => c.strategy === "hold_defer");
    expect(holdCandidate).toBeDefined();
    expect(holdCandidate?.status).toBe("SIMULATION_PASSED");
    expect(holdCandidate?.encodedCalls).toHaveLength(0);
  });

  it("records snapshot with block number and hash", async () => {
    const client = createMockClient({
      chainId: 11155111,
      blockNumber: 5000n,
      blockHash: "0xdef456" as `0x${string}`,
      callResult: {
        status: "SIMULATION_PASSED",
        gasEstimate: "30000",
      },
    });

    const request = createPlanRequest({
      chainId: 11155111,
      context: {
        protocol: "MockSwapTarget",
        actionFamily: "swap",
        parameters: {
          target: targetAddress,
          amountIn: "100",
          minOut: "90",
        },
      },
    });

    const orchestration = new OrchestrationService();
    const response = await orchestration.plan(client, request, targetAddress);

    expect(response.snapshot.chainId).toBe(11155111);
    expect(response.snapshot.blockNumber).toBe("5000");
    expect(response.snapshot.blockHash).toBe("0xdef456");
    expect(response.snapshot.stateFingerprint).toContain("5000");
  });
});
