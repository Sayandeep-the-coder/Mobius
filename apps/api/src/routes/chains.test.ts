import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
import * as chainConfig from "@mobius/chain-config";
import { chainsRoutes } from "./chains";

describe("Chains Routes", () => {
  let app: express.Express;
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use("/v1/chains", chainsRoutes);

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

  it("GET /v1/chains returns chains info when RPC calls succeed", async () => {
    vi.spyOn(chainConfig.monadPublicClient, "getChainId").mockResolvedValue(10143);
    vi.spyOn(chainConfig.sepoliaPublicClient, "getChainId").mockResolvedValue(11155111);

    const res = await fetch(`${baseUrl}/v1/chains`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.chains).toHaveLength(2);
    expect(body.chains[0].name).toBe("Monad Testnet");
    expect(body.chains[0].chainId).toBe(10143);
    expect(body.chains[1].name).toBe("Ethereum Sepolia");
    expect(body.chains[1].chainId).toBe(11155111);
  });

  it("GET /v1/chains returns 500 when RPC calls fail", async () => {
    vi.spyOn(chainConfig.monadPublicClient, "getChainId").mockRejectedValue(new Error("RPC network error"));

    const res = await fetch(`${baseUrl}/v1/chains`);
    expect(res.status).toBe(500);
    const body = (await res.json()) as any;
    expect(body.error).toBe("Failed to read chain IDs");
  });
});
