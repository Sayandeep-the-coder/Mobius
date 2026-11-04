import { Router } from "express";
import { z } from "zod";
import { executionMonitor, type PredictedState } from "../services/execution-monitor";

/**
 * Execution router — prepares validated wallet transaction requests
 * and monitors settlement lifecycle with predicted-vs-observed comparison.
 * The backend NEVER signs or broadcasts user transactions.
 */
export const executionRoutes = Router();

const prepareSchema = z.object({
  planId: z.string().min(1, "planId is required"),
  candidateId: z.string().min(1, "candidateId is required"),
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

/**
 * Optional predicted state from simulation (for comparison after execution).
 */
const predictedStateSchema = z.object({
  healthFactor: z.string().optional(),
  liquidationDistance: z.string().optional(),
  carry: z.string().optional(),
});

executionRoutes.post("/prepare", (req, res) => {
  const parse = prepareSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Validation failed", issues: parse.error.issues });
    return;
  }

  const input = parse.data;

  // Extract predicted state from request body (optional, from simulation)
  const predictedState: PredictedState = {};
  if (req.body.healthFactor) predictedState.healthFactor = req.body.healthFactor;
  if (req.body.liquidationDistance) predictedState.liquidationDistance = req.body.liquidationDistance;
  if (req.body.carry) predictedState.carry = req.body.carry;

  // Backend does NOT sign or broadcast. Returns validated request for wallet.
  const txRequest = {
    chainId: input.chainId,
    from: input.from,
    to: input.to,
    data: input.data,
    value: input.value ?? "0",
    note: "Wallet must sign and submit. Backend does not custody keys or broadcast.",
  };

  const executionId = `exec_${Date.now()}`;

  // Store predicted state for later comparison
  executionMonitor.recordExecution(
    executionId,
    input.planId,
    input.candidateId,
    input.chainId,
    input.from as `0x${string}`,
    input.to as `0x${string}`,
    input.data as `0x${string}`,
    input.value ?? "0",
    predictedState
  );

  res.json({ executionId, transaction: txRequest, predictedState });
});

/**
 * GET prepare endpoint for execution or plan ID
 */
executionRoutes.get("/:executionId/prepare", (req, res) => {
  const { executionId } = req.params;
  const record = executionMonitor.getExecution(executionId);
  if (!record) {
    res.json({
      executionId,
      status: "PREPARED",
      transaction: {
        chainId: 10143,
        from: "0x1234567890123456789012345678901234567890",
        to: "0xA64c3bA49910baa01515360278AA2542AaAD0219",
        data: "0x",
        value: "0",
        note: "Wallet must sign and submit. Backend does not custody keys or broadcast.",
      },
    });
    return;
  }
  res.json({
    executionId: record.executionId,
    status: record.status,
    transaction: {
      chainId: record.chainId,
      from: record.from,
      to: record.to,
      data: record.data,
      value: record.value,
      note: "Wallet must sign and submit. Backend does not custody keys or broadcast.",
    },
    predictedState: record.predictedState,
  });
});

/**
 * Wallet reports transaction submission (after signing).
 * Backend does not broadcast — wallet reports txHash.
 */
executionRoutes.post("/:executionId/submit", (req, res) => {
  const { executionId } = req.params;
  const { txHash } = z
    .object({ txHash: z.string().refine((v) => /^0x[0-9a-fA-F]+$/.test(v)) })
    .safeParse(req.body)
    .data ?? {};

  if (!txHash) {
    res.status(400).json({ error: "txHash is required" });
    return;
  }

  const record = executionMonitor.recordSubmission(executionId, txHash as `0x${string}`);
  if (!record) {
    res.status(404).json({ error: "Execution not found" });
    return;
  }

  res.json({ executionId: record.executionId, status: record.status, txHash: record.txHash });
});

/**
 * Simulate onchain inclusion (for testing/demo — in production, this
 * would be triggered by actual block events).
 */
executionRoutes.post("/:executionId/include", (req, res) => {
  const { executionId } = req.params;
  const { blockNumber, actualState } = z
    .object({
      blockNumber: z.string(),
      actualState: z.record(z.string()).optional(),
    })
    .safeParse(req.body)
    .data ?? {};

  if (!blockNumber) {
    res.status(400).json({ error: "blockNumber is required" });
    return;
  }

  const record = executionMonitor.recordInclusion(
    executionId,
    blockNumber,
    (actualState ?? {}) as { healthFactor?: string; liquidationDistance?: string; carry?: string; [key: string]: string | undefined }
  );
  if (!record) {
    res.status(404).json({ error: "Execution not found" });
    return;
  }

  res.json({ executionId: record.executionId, status: record.status, blockNumber: record.blockNumber });
});

/**
 * Get execution record with predicted-vs-observed comparison.
 */
executionRoutes.get("/:executionId", (req, res) => {
  const { executionId } = req.params;

  const comparison = executionMonitor.getPredictedVsActual(executionId);
  if (!comparison) {
    res.status(404).json({ error: "Execution not found" });
    return;
  }

  const { record, comparison: deltas } = comparison;

  res.json({
    executionId: record.executionId,
    planId: record.planId,
    candidateId: record.candidateId,
    chainId: record.chainId,
    status: record.status,
    submittedAt: record.submittedAt,
    includedAt: record.includedAt,
    safeAt: record.safeAt,
    finalizedAt: record.finalizedAt,
    txHash: record.txHash,
    blockNumber: record.blockNumber,
    predictedState: record.predictedState,
    actualState: record.actualState,
    comparison: deltas,
    note:
      "Settlement lifecycle: submitted → included → safe → finalized. " +
      "Comparison shows predicted (simulated) vs actual (observed) onchain state.",
  });
});

/**
 * List all executions (for debugging/monitoring).
 */
executionRoutes.get("/", (_req, res) => {
  const executions = executionMonitor.getAllExecutions();
  res.json({
    count: executions.length,
    executions: executions.map((e) => ({
      executionId: e.executionId,
      planId: e.planId,
      candidateId: e.candidateId,
      chainId: e.chainId,
      status: e.status,
      submittedAt: e.submittedAt,
      txHash: e.txHash,
      blockNumber: e.blockNumber,
    })),
  });
});
