import { Router } from "express";
import { monadPublicClient, sepoliaPublicClient } from "@mobius/chain-config";

export const chainsRoutes = Router();

chainsRoutes.get("/", async (_req, res) => {
  try {
    const [monadChainId, sepoliaChainId] = await Promise.all([
      monadPublicClient.getChainId(),
      sepoliaPublicClient.getChainId(),
    ]);

    res.json({
      chains: [
        {
          name: "Monad Testnet",
          chainId: monadChainId,
          rpcUrl: process.env.MONAD_RPC_URL ?? "https://testnet-rpc.monad.xyz",
          purpose: "Mobius demo + Typewriter POC",
        },
        {
          name: "Ethereum Sepolia",
          chainId: sepoliaChainId,
          rpcUrl: process.env.SEPOLIA_RPC_URL ?? "",
          purpose: "Aave V3 protocol test",
        },
      ],
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to read chain IDs", message: String(err) });
  }
});
