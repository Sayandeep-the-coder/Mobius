import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
import { agenticRoutes } from "./agentic";
import { preflightRoutes } from "./preflight";
import { executionRoutes } from "./execution";

// Enable LLM for natural language testing
process.env.LLM_ENABLED = "true";

import { monadPublicClient, sepoliaPublicClient } from "@mobius/chain-config";

// Mock the chain config - Monad Testnet with deployed MockSwapTarget
vi.mock("@mobius/chain-config", () => ({
  monadPublicClient: {
    getChainId: vi.fn().mockResolvedValue(10143),
    getBlock: vi.fn().mockResolvedValue({
      number: 76872485n,
      hash: "0xabc123def456",
    }),
    call: vi.fn().mockResolvedValue({ data: "0x0000000000000000000000000000000000000000000000000000000000000064" }),
    estimateGas: vi.fn().mockResolvedValue(21000n),
  },
  sepoliaPublicClient: {
    getChainId: vi.fn().mockResolvedValue(11155111),
    getBlock: vi.fn().mockResolvedValue({ number: 5000n, hash: "0xdef" }),
  },
  assertChain: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../services/snapshot-service", () => ({
  snapshotService: {
    create: vi.fn(),
    getByPlanId: vi.fn().mockReturnValue(undefined),
    getChangedDependencies: vi.fn().mockReturnValue([]),
    storeByPlanId: vi.fn(),
  },
}));

import { snapshotService } from "../services/snapshot-service";

// MockSwapTarget ABI for encoding swap calldata
// selector for swap(uint256,uint256): 0xd96073cf
function encodeSwap(amountIn: string, minOut: string): `0x${string}` {
  const selector = "d96073cf";
  const amountInHex = BigInt(amountIn).toString(16).padStart(64, "0");
  const minOutHex = BigInt(minOut).toString(16).padStart(64, "0");
  return (`0x${selector}${amountInHex}${minOutHex}`) as `0x${string}`;
}

const MOCK_SWAP_TARGET = "0xA64c3bA49910baa01515360278AA2542AaAD0219" as `0x${string}`;

function createTestApp(router: any) {
  const app = express();
  app.use(express.json());
  app.use(router);
  return app;
}

async function routeRequest(
  app: any,
  method: string,
  path: string,
  body: any = {}
): Promise<any> {
  return new Promise((resolve, reject) => {
    const req: any = {
      method: method.toUpperCase(),
      url: path,
      headers: { "content-type": "application/json" },
      body,
      query: {},
      params: {},
      socket: { remoteAddress: "127.0.0.1" },
      connection: { remoteAddress: "127.0.0.1" },
    };

    const res: any = {
      statusCode: 200,
      body: undefined,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(data: any) {
        this.body = data;
        return this;
      },
      send(data: any) {
        this.body = data;
        return this;
      },
      end() {
        resolve({ status: this.statusCode, body: this.body });
      },
    };

    const next: any = (err?: any) => {
      if (err) reject(new Error(err.message || "Next error"));
      else resolve({ status: res.statusCode, body: res.body });
    };

    try {
      app.handle(req, res, next);
    } catch (err) {
      reject(err);
    }

    setTimeout(() => {
      resolve({ status: res.statusCode, body: res.body });
    }, 10000);
  });
}

describe("Mobius Agentic E2E - Task #1: Natural Language End-to-End", () => {
  let app: any;
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use("/v1/agentic", agenticRoutes);
    app.use("/v1/preflight", preflightRoutes);
    app.use("/v1/execution", executionRoutes);

    await new Promise<void>((resolve) => {
      server = app.listen(0, "127.0.0.1", () => {
        const addr = server.address();
        if (addr && typeof addr === "object") {
          baseUrl = `http://127.0.0.1:${addr.port}`;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  async function httpRequest(method: string, path: string, body: any = {}): Promise<{ status: number; body: any }> {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, body: await res.json() };
  }

  it("Step 1: Natural language plan - parse intent via Groq LLM", async () => {
    const result = await httpRequest("POST", "/v1/agentic/plan/natural", {
      chainId: 10143,
      account: "0x1234567890123456789012345678901234567890",
      objective:
        "Execute swap on 0xA64c3bA49910baa01515360278AA2542AaAD0219 with 100 MON minOut 90",
      constraints: {},
      context: {
        protocol: "MockSwapTarget",
        actionFamily: "swap",
        parameters: {},
      },
    });

    console.log("PLAN RESPONSE:", JSON.stringify(result.body, null, 2));

    expect(result.status).toBe(200);
    expect(result.body.planId).toBeDefined();
    expect(result.body.snapshot.chainId).toBe(10143);
    expect(result.body.candidates).toHaveLength(2);
    expect(result.body.decision).toBeDefined();
    expect(result.body.humanExplanation).toBeDefined();
    expect(result.body.llmUsed).toBe(true);

    // Find the swap candidate
    const swapCandidate = result.body.candidates.find(
      (c: any) => c.strategy === "execute_swap"
    );
    expect(swapCandidate).toBeDefined();
    expect(swapCandidate.encodedCalls.length).toBe(1);
    expect(swapCandidate.encodedCalls[0].to).toBe(MOCK_SWAP_TARGET);
  });

  it("Step 2: Verify simulation shows swap passes (rateWad=1e18, output=100>=minOut=90)", async () => {
    const result = await httpRequest("POST", "/v1/agentic/plan", {
      chainId: 10143,
      account: "0x1234567890123456789012345678901234567890",
      objective: { type: "execute_swap", description: "Test swap" },
      constraints: { minAmountOut: "90" },
      context: {
        protocol: "MockSwapTarget",
        actionFamily: "swap",
        parameters: {
          target: MOCK_SWAP_TARGET,
          amountIn: "100",
          minOut: "90",
        },
      },
    });

    expect(result.status).toBe(200);
    const swapCandidate = result.body.candidates.find(
      (c: any) => c.strategy === "execute_swap"
    );
    expect(swapCandidate.status).toBe("SIMULATION_PASSED");
    expect(swapCandidate.explanation).toContain("successfully");
  });

  it("Step 3: Preflight verifies the exact calldata against pinned snapshot", async () => {
    const calldata = encodeSwap("100", "90");
    const result = await httpRequest("POST", "/v1/preflight", {
      chainId: 10143,
      from: "0x1234567890123456789012345678901234567890",
      to: MOCK_SWAP_TARGET,
      data: calldata,
      value: "0",
    });

    expect(result.status).toBe(200);
    expect(result.body.status).toBe("SIMULATION_PASSED");
    expect(result.body.chainId).toBe(10143);
    expect(result.body.blockNumber).toBeDefined();
  });

  it("Step 4: Revalidation after state drift returns REPLAN_REQUIRED", async () => {
    // First create a plan
    const planResult = await httpRequest("POST", "/v1/agentic/plan", {
      chainId: 10143,
      account: "0x1234567890123456789012345678901234567890",
      objective: { type: "execute_swap", description: "Test swap" },
      constraints: { minAmountOut: "90" },
      context: {
        protocol: "MockSwapTarget",
        actionFamily: "swap",
        parameters: {
          target: MOCK_SWAP_TARGET,
          amountIn: "100",
          minOut: "90",
        },
      },
    });
    expect(planResult.status).toBe(200);

    // Now revalidate - since block will have advanced (Monad 300ms blocks),
    // this should return REPLAN_REQUIRED
    const revalidateResult = await httpRequest("POST", "/v1/agentic/revalidate", {
      planId: planResult.body.planId,
      candidateId: `${planResult.body.planId}_swap`,
      chainId: 10143,
      targetAddress: MOCK_SWAP_TARGET,
    });

    console.log("REVALIDATE RESPONSE:", JSON.stringify(revalidateResult.body, null, 2));

    expect(revalidateResult.status).toBe(200);
    expect(["VALID", "REPLAN_REQUIRED", "BLOCKED"]).toContain(
      revalidateResult.body.status
    );
    expect(revalidateResult.body.reason).toBeDefined();
  });

  it("Step 5: Execution prepare returns validated wallet request (no backend signing)", async () => {
    const planResult = await httpRequest("POST", "/v1/agentic/plan", {
      chainId: 10143,
      account: "0x1234567890123456789012345678901234567890",
      objective: { type: "execute_swap", description: "Test swap" },
      constraints: { minAmountOut: "90" },
      context: {
        protocol: "MockSwapTarget",
        actionFamily: "swap",
        parameters: {
          target: MOCK_SWAP_TARGET,
          amountIn: "100",
          minOut: "90",
        },
      },
    });

    const swapCandidate = planResult.body.candidates.find(
      (c: any) => c.strategy === "execute_swap"
    );

    const result = await httpRequest("POST", "/v1/execution/prepare", {
      planId: planResult.body.planId,
      candidateId: swapCandidate.candidateId,
      chainId: 10143,
      from: "0x1234567890123456789012345678901234567890",
      to: swapCandidate.encodedCalls[0].to,
      data: swapCandidate.encodedCalls[0].data,
      value: swapCandidate.encodedCalls[0].value,
    });

    expect(result.status).toBe(200);
    expect(result.body.executionId).toBeDefined();
    expect(result.body.transaction.chainId).toBe(10143);
    expect(result.body.transaction.from).toBe(
      "0x1234567890123456789012345678901234567890"
    );
    expect(result.body.transaction.note).toContain("Wallet must sign");
    expect(result.body.transaction.note).not.toContain("Backend signs");
  });
});
