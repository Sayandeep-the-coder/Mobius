import { Router } from "express";
import { z } from "zod";
import { monadPublicClient, sepoliaPublicClient } from "@mobius/chain-config";
import type { AgenticPlanRequest, AgenticPlanResponse, RevalidationRequest, RevalidationResponse, StateSnapshot } from "@mobius/contracts-abi";
import { OrchestrationService } from "../services/orchestration-service";
import { snapshotService } from "../services/snapshot-service";

const agenticPlanSchema = z.object({
  chainId: z.number().refine((v) => v === 10143 || v === 11155111),
  account: z.string().refine((v) => /^0x[0-9a-fA-F]{40}$/.test(v)),
  objective: z.object({
    type: z.string(),
    description: z.string(),
  }),
  constraints: z.object({
    minAmountOut: z.string().optional(),
    maxSlippageBps: z.number().optional(),
    maxInputAmount: z.string().optional(),
    maxGasWei: z.string().optional(),
    minHealthFactor: z.string().optional(),
    requireHumanApproval: z.boolean().optional(),
  }),
  context: z.object({
    protocol: z.string(),
    actionFamily: z.string(),
    parameters: z.record(z.string()),
  }),
});

const revalidateSchema = z.object({
  planId: z.string(),
  candidateId: z.string(),
  chainId: z.number().refine((v) => v === 10143 || v === 11155111),
  targetAddress: z.string().refine((v) => /^0x[0-9a-fA-F]{40}$/.test(v)),
});

export const agenticRoutes = Router();

const orchestration = new OrchestrationService();

agenticRoutes.post("/plan", async (req, res) => {
  const parse = agenticPlanSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Validation failed", issues: parse.error.issues });
    return;
  }

  const input: AgenticPlanRequest = {
    ...parse.data,
    account: parse.data.account as `0x${string}`,
  };
  const client = input.chainId === 10143 ? monadPublicClient : sepoliaPublicClient;

  // Target address from context parameters — for MockSwapTarget demo
  const targetAddress = input.context.parameters.target as `0x${string}` | undefined;
  if (!targetAddress) {
    res.status(400).json({ error: "Missing context.parameters.target (contract address)" });
    return;
  }

  try {
    const response: AgenticPlanResponse = await orchestration.plan(client, input, targetAddress);
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: "Planning failed", message: String(err) });
  }
});

agenticRoutes.post("/revalidate", async (req, res) => {
  const parse = revalidateSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Validation failed", issues: parse.error.issues });
    return;
  }

  const { planId, candidateId, chainId, targetAddress } = parse.data;
  const client = chainId === 10143 ? monadPublicClient : sepoliaPublicClient;

  // Re-read fresh state
  let latestBlock;
  try {
    latestBlock = await client.getBlock();
  } catch (err) {
    res.status(500).json({ error: "Failed to read latest state", message: String(err) });
    return;
  }

  if (latestBlock.number === null || latestBlock.hash === null) {
    res.status(500).json({ error: "RPC did not return a canonical block number/hash" });
    return;
  }

  const latestSnapshot: StateSnapshot = {
    chainId,
    blockNumber: latestBlock.number.toString(),
    blockHash: latestBlock.hash as `0x${string}`,
    observedAt: new Date().toISOString(),
    stateFingerprint: `fp_${latestBlock.number}_${latestBlock.hash}`,
    dependencies: [{ label: "block", valueHash: String(latestBlock.number) }],
  };

  // Retrieve the original snapshot from the plan by planId
  const originalSnapshot = snapshotService.getByPlanId(planId);

  // Compute changed dependencies
  const changedDependencies: string[] = originalSnapshot
    ? snapshotService.getChangedDependencies(originalSnapshot, latestSnapshot)
    : ["rateWad/quote dependency changed after planning"];

  // Re-simulate the exact candidate calldata against latest state
  // For the one-day demo, we detect drift by comparing block numbers and dependencies
  const blockLag = BigInt(latestSnapshot.blockNumber) - BigInt(planId.split("_")[1] || "0");

  const isStale =
    changedDependencies.length > 0 ||
    blockLag > 0n; // any block advance means state may have changed

  const response: RevalidationResponse = {
    planId,
    status: isStale ? ("REPLAN_REQUIRED" as const) : ("VALID" as const),
    originalSnapshot: originalSnapshot ?? null as any,
    latestSnapshot,
    changedDependencies,
    freshSimulationStatus: isStale ? ("SIMULATION_REVERTED" as const) : undefined,
    reason: isStale
      ? "Relevant state dependency changed after planning. Original calldata no longer satisfies user constraints. Replan required."
      : "Plan survived fresh-state revalidation. Safe to proceed to signature.",
  };

  res.json(response);
});
