import "dotenv/config";
import express, { type Request, type Response, type NextFunction } from "express";
import { config as dotenvConfig } from "dotenv";
import { monadPublicClient, sepoliaPublicClient, assertChain } from "@mobius/chain-config";

dotenvConfig();
import { preflightRoutes } from "./routes/preflight";
import { agenticRoutes } from "./routes/agentic";
import { chainsRoutes } from "./routes/chains";
import { healthRoutes } from "./routes/health";
import { executionRoutes } from "./routes/execution";
import { aaveRoutes } from "./routes/aave";
import { SnapshotService } from "./services/snapshot-service";

const app = express();
const PORT = process.env.PORT ?? 8787;

// Enable CORS for frontend and external clients
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }
  next();
});

app.use(express.json());

// Initialize shared services
const snapshotService = new SnapshotService();

// Startup: verify RPC chain IDs (non-fatal — routes handle per-request errors)
async function startup() {
  let monadOk = false;
  let sepoliaOk = false;

  try {
    await assertChain(monadPublicClient, 10143);
    console.log("[Mobius] Monad Testnet chain ID verified: 10143");
    monadOk = true;
  } catch (err: unknown) {
    console.warn("[Mobius] Monad RPC unavailable:", err instanceof Error ? err.message : String(err));
  }

  try {
    await assertChain(sepoliaPublicClient, 11155111);
    console.log("[Mobius] Ethereum Sepolia chain ID verified: 11155111");
    sepoliaOk = true;
  } catch (err: unknown) {
    console.warn("[Mobius] Sepolia RPC unavailable:", err instanceof Error ? err.message : String(err));
  }

  if (!monadOk && !sepoliaOk) {
    console.error("[Mobius] No RPCs available — API will return errors on chain-dependent routes");
  }

  console.log("[Mobius] Services initialized: snapshotService");
}

// Health check
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "mobius-api", nodeEnv: process.env.NODE_ENV ?? "development" });
});

// Mount routes
app.use("/v1/health", healthRoutes);
app.use("/v1/chains", chainsRoutes);
app.use("/v1/preflight", preflightRoutes);
app.use("/v1/agentic", agenticRoutes);
app.use("/v1/execution", executionRoutes);
app.use("/v1/aave", aaveRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[Mobius] Unhandled error:", err);
  res.status(500).json({ error: "Internal server error", message: err.message });
});

startup().then(() => {
  app.listen(Number(PORT), () => {
    console.log(`[Mobius] API listening on port ${PORT}`);
  });
});

export default app;
export { snapshotService };
