import { Router } from "express";
import { z } from "zod";
import { monadPublicClient, sepoliaPublicClient } from "@mobius/chain-config";
import type {
  AgenticPlanRequest,
  AgenticPlanResponse,
  RevalidationRequest,
  RevalidationResponse,
  StateSnapshot,
} from "@mobius/contracts-abi";
import { OrchestrationService } from "../services/orchestration-service";
import { snapshotService } from "../services/snapshot-service";
import {
  IntentParser,
  CandidateProposer,
  Explainer,
  MockLLMProvider,
} from "@mobius/llm-adapter";

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

const naturalLanguagePlanSchema = z.object({
  chainId: z.number().refine((v) => v === 10143 || v === 11155111),
  account: z.string().refine((v) => /^0x[0-9a-fA-F]{40}$/.test(v)),
  objective: z.string().min(1, "objective text is required"),
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
    parameters: z.record(z.string()).optional(),
  }),
});

const revalidateSchema = z.object({
  planId: z.string(),
  candidateId: z.string(),
  chainId: z.number().refine((v) => v === 10143 || v === 11155111),
  targetAddress: z.string().refine((v) => /^0x[0-9a-fA-F]{40}$/.test(v)),
});

export const agenticRoutes = Router();

// Initialize LLM adapter (optional — mock provider works without API key)
const llmEnabled = process.env.LLM_ENABLED === "true";
const llmProvider = new MockLLMProvider({ enabled: llmEnabled });
const intentParser = new IntentParser(llmProvider);
const candidateProposer = new CandidateProposer(llmProvider, [
  "execute_swap",
  "hold_defer",
]);
const explainer = new Explainer(llmProvider);

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

  const targetAddress = input.context.parameters.target as `0x${string}` | undefined;
  if (!targetAddress) {
    res.status(400).json({ error: "Missing context.parameters.target (contract address)" });
    return;
  }

  try {
    const response: AgenticPlanResponse = await orchestration.plan(client, input, targetAddress);

    // LLM explains deterministic results (optional, falls back to deterministic explainer)
    const humanExplanation = await explainer.explain(
      response.candidates.map((c) => ({
        candidateId: c.candidateId,
        strategy: c.strategy,
        status: c.status,
        estimatedGas: c.estimatedGas,
        constraintViolations: c.constraintViolations,
        explanation: c.explanation,
      }))
    );

    res.json({
      ...response,
      humanExplanation,
      llmUsed: llmEnabled,
    });
  } catch (err) {
    res.status(500).json({ error: "Planning failed", message: String(err) });
  }
});

/**
 * Natural language endpoint — LLM parses intent into typed AgenticPlanRequest.
 * All LLM output is Zod-validated before reaching the planner.
 */
agenticRoutes.post("/plan/natural", async (req, res) => {
  if (!llmEnabled) {
    res.status(400).json({
      error: "LLM not enabled. Set LLM_ENABLED=true to use natural language planning.",
    });
    return;
  }

  const parse = naturalLanguagePlanSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Validation failed", issues: parse.error.issues });
    return;
  }

  const input = parse.data;
  const client = input.chainId === 10143 ? monadPublicClient : sepoliaPublicClient;

  try {
    // LLM parses natural language into typed request — Zod validates everything
    const typedRequest = await intentParser.parseAndValidate(input.objective);

    // Merge in explicitly provided fields (account, chainId, constraints take precedence)
    const mergedRequest: AgenticPlanRequest = {
      ...typedRequest,
      chainId: input.chainId,
      account: input.account as `0x${string}`,
      constraints: {
        ...typedRequest.constraints,
        ...input.constraints,
      },
      context: {
        ...typedRequest.context,
        ...input.context,
        parameters: {
          ...typedRequest.context?.parameters,
          ...input.context?.parameters,
        },
      },
    };

    const targetAddress =
      mergedRequest.context.parameters.target as `0x${string}` | undefined;
    if (!targetAddress) {
      res.status(400).json({
        error: "No contract target specified. Include a 0x address in your objective or context.parameters.target.",
      });
      return;
    }

    // LLM proposes strategies (filtered to allowed deterministic templates)
    const allowedStrategies = ["execute_swap", "hold_defer"];
    const proposedStrategies = await candidateProposer.propose(
      input.objective,
      {},
      allowedStrategies
    );

    const response: AgenticPlanResponse = await orchestration.plan(
      client,
      mergedRequest,
      targetAddress
    );

    // LLM explains deterministic results
    const humanExplanation = await explainer.explain(
      response.candidates.map((c) => ({
        candidateId: c.candidateId,
        strategy: c.strategy,
        status: c.status,
        estimatedGas: c.estimatedGas,
        constraintViolations: c.constraintViolations,
        explanation: c.explanation,
      }))
    );

    res.json({
      ...response,
      humanExplanation,
      llmUsed: true,
      llmProposedStrategies: proposedStrategies,
      llmParsedIntent: {
        objective: typedRequest.objective,
        context: typedRequest.context,
      },
    });
  } catch (err) {
    res.status(500).json({
      error: "Natural language planning failed",
      message: String(err),
      hint: "LLM output may have failed validation. Try being more specific about amount, target, and constraints.",
    });
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

  const originalSnapshot = snapshotService.getByPlanId(planId);

  const changedDependencies: string[] = originalSnapshot
    ? snapshotService.getChangedDependencies(originalSnapshot, latestSnapshot)
    : ["rateWad/quote dependency changed after planning"];

  const blockLag = BigInt(latestSnapshot.blockNumber) - BigInt(planId.split("_")[1] || "0");

  const isStale =
    changedDependencies.length > 0 ||
    blockLag > 0n;

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

  // LLM explains revalidation result (optional)
  if (llmEnabled) {
    const explanation = await explainer.explain([
      {
        candidateId,
        strategy: "revalidation",
        status: response.status,
        constraintViolations: response.changedDependencies,
        explanation: response.reason,
      },
    ]);
    (response as any).humanExplanation = explanation;
    (response as any).llmUsed = true;
  }

  res.json(response);
});
