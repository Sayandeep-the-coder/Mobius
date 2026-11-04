import { Router } from "express";
import { z } from "zod";
import { sepoliaPublicClient } from "@mobius/chain-config";
import type { AaveSupplyPreflightRequest, AaveSupplyPreflightResponse } from "@mobius/contracts-abi";

export const aaveRoutes = Router();

const supplyPreflightSchema = z.object({
  user: z.string().refine((v) => /^0x[0-9a-fA-F]{40}$/.test(v), {
    message: "Invalid 'user' address",
  }),
  asset: z.string().refine((v) => /^0x[0-9a-fA-F]{40}$/.test(v), {
    message: "Invalid 'asset' address",
  }),
  amount: z.string().refine((v) => /^\d+$/.test(v), {
    message: "Amount must be a positive decimal string (base units)",
  }),
});

aaveRoutes.get("/sepolia/market", async (_req, res) => {
  try {
    const POOL_ADDRESSES_PROVIDER =
      "0x012bAC54348C0E635dCAc9D5FB99f06F24136C9A";

    const pool = await sepoliaPublicClient.readContract({
      address: POOL_ADDRESSES_PROVIDER,
      abi: [
        {
          type: "function",
          name: "getPool",
          stateMutability: "view",
          inputs: [],
          outputs: [{ name: "", type: "address" }],
        },
      ],
      functionName: "getPool",
    });

    res.json({
      chainId: 11155111,
      network: "Ethereum Sepolia",
      poolAddressesProvider: POOL_ADDRESSES_PROVIDER,
      pool,
      note: "Pool resolved dynamically from PoolAddressesProvider.getPool()",
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to resolve Aave Pool", message: String(err) });
  }
});

aaveRoutes.post("/sepolia/supply/preflight", async (req, res) => {
  const parse = supplyPreflightSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Validation failed", issues: parse.error.issues });
    return;
  }

  const input: AaveSupplyPreflightRequest = {
    ...parse.data,
    user: parse.data.user as `0x${string}`,
    asset: parse.data.asset as `0x${string}`,
  };

  // TODO: Implement balance/allowance reads and supply simulation
  // This is a stub for the one-day MVP
  const response: AaveSupplyPreflightResponse = {
    chainId: 11155111,
    blockNumber: "0",
    blockHash: "0x00",
    pool: "0x0000000000000000000000000000000000000000",
    asset: input.asset,
    user: input.user,
    balance: "0",
    allowance: "0",
    approvalRequired: true,
    canSimulateSupply: false,
    simulationStatus: "NOT_READY",
    reason: "Aave adapter not yet implemented — balance/allowance reads pending",
  };

  res.json(response);
});
