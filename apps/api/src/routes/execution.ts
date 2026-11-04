import { Router } from "express";
import { z } from "zod";

/**
 * Execution router — prepares validated wallet transaction requests.
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

executionRoutes.post("/prepare", (req, res) => {
  const parse = prepareSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Validation failed", issues: parse.error.issues });
    return;
  }

  const input = parse.data;

  // Backend does NOT sign or broadcast. Returns validated request for wallet.
  const txRequest = {
    chainId: input.chainId,
    from: input.from,
    to: input.to,
    data: input.data,
    value: input.value ?? "0",
    note: "Wallet must sign and submit. Backend does not custody keys or broadcast.",
  };

  res.json({ executionId: `exec_${Date.now()}`, transaction: txRequest });
});

executionRoutes.get("/:id", (req, res) => {
  const { id } = req.params;
  res.json({
    executionId: id,
    status: "submitted",
    note: "Settlement lifecycle: submitted -> included -> safe -> finalized",
  });
});
