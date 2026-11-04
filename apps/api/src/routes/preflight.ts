import { Router } from "express";
import { z } from "zod";
import { monadPublicClient, sepoliaPublicClient, assertChain } from "@mobius/chain-config";
import type { PreflightRequest, PreflightResponse } from "@mobius/contracts-abi";
import { getAddress, type Address, type Hex } from "viem";
import { simulateCall } from "@mobius/simulation";
import { classifyError } from "../services/error-classifier";

const preflightSchema = z.object({
  chainId: z.number().refine((v) => v === 10143 || v === 11155111, {
    message: "Unsupported chainId. Supported: 10143 (Monad Testnet), 11155111 (Sepolia)",
  }),
  from: z.string().refine((v) => /^0x[0-9a-fA-F]{40}$/.test(v), {
    message: "Invalid 'from' address",
  }),
  to: z.string().refine((v) => /^0x[0-9a-fA-F]{40}$/.test(v), {
    message: "Invalid 'to' address",
  }),
  data: z.string().refine((v) => /^0x[0-9a-fA-F]*$/.test(v), {
    message: "Invalid 'data' hex",
  }),
  value: z.string().optional(),
});

export const preflightRoutes = Router();

preflightRoutes.post("/", async (req, res) => {
  const parse = preflightSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Validation failed", issues: parse.error.issues });
    return;
  }

  const input = parse.data as PreflightRequest;
  const client = input.chainId === 10143 ? monadPublicClient : sepoliaPublicClient;

  try {
    await assertChain(client, input.chainId);
  } catch (err) {
    res.status(400).json({ error: "RPC chain mismatch", message: String(err) });
    return;
  }

  let snapshot;
  try {
    snapshot = await client.getBlock();
  } catch (err) {
    res.status(500).json({ error: "Failed to read block", message: String(err) });
    return;
  }

  if (snapshot.number === null || snapshot.hash === null) {
    res.status(500).json({ error: "RPC did not return a canonical block number/hash" });
    return;
  }

  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const simResult = await simulateCall({
    client,
    from: input.from as Address,
    to: input.to as Address,
    data: input.data as Hex,
    value: input.value ? BigInt(input.value) : 0n,
    blockNumber: snapshot.number,
  });

  if (simResult.status === "SIMULATION_REVERTED") {
    const errorMsg = simResult.error?.message ?? "Unknown revert";
    const selectorMatch = errorMsg.match(/0x[0-9a-fA-F]{8}/);
    const selector = selectorMatch ? (selectorMatch[0] as `0x${string}`) : undefined;
    const classified = classifyError(errorMsg, selector);

    const response: PreflightResponse = {
      requestId,
      chainId: input.chainId,
      status: "SIMULATION_REVERTED",
      riskLevel: "BLOCKED",
      blockNumber: snapshot.number.toString(),
      blockHash: snapshot.hash as `0x${string}`,
      observedAt: new Date().toISOString(),
      error: {
        kind: classified.kind,
        selector: classified.selector,
        decodedName: classified.decodedName,
        message: classified.message,
      },
      recommendations: [classified.recommendation],
      caveat: "A failed simulation is evidence for the observed state, not a permanent verdict.",
    };
    res.json(response);
    return;
  }

  const response: PreflightResponse = {
    requestId,
    chainId: input.chainId,
    status: "SIMULATION_PASSED",
    riskLevel: "LOW",
    blockNumber: snapshot.number.toString(),
    blockHash: snapshot.hash as `0x${string}`,
    observedAt: new Date().toISOString(),
    gasEstimate: simResult.gasEstimate,
    warnings: simResult.gasWarning ? [simResult.gasWarning] : [],
    returnData: simResult.returnData,
    recommendations: [
      "Review the parameters and submit from the same account if still valid.",
    ],
    caveat: "Snapshot simulation only; state may change before inclusion.",
  };

  res.json(response);
});
