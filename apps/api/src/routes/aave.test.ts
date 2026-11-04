import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import type { Server } from "node:http";
import { aaveRoutes } from "./aave";

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use("/v1/aave", aaveRoutes);

  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", () => {
      const addr = server.address() as any;
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
});

describe("Aave V3 Sepolia Routes", () => {
  it("rejects invalid user address on supply preflight with 400", async () => {
    const res = await fetch(`${baseUrl}/v1/aave/sepolia/supply/preflight`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user: "0xinvalid",
        amount: "1000",
      }),
    });

    expect(res.status).toBe(400);
    const body: any = await res.json();
    expect(body.error).toBe("Validation failed");
    expect(body.issues[0].message).toContain("Invalid Ethereum address");
  });

  it("rejects non-positive amounts on supply preflight with 400", async () => {
    const res = await fetch(`${baseUrl}/v1/aave/sepolia/supply/preflight`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user: "0x1111111111111111111111111111111111111111",
        amount: "0",
      }),
    });

    expect(res.status).toBe(400);
    const body: any = await res.json();
    expect(body.error).toBe("Validation failed");
    expect(body.issues[0].message).toContain("positive decimal string");
  });

  it("rejects invalid user address on user account endpoint with 400", async () => {
    const res = await fetch(`${baseUrl}/v1/aave/sepolia/account/not-an-address`);
    expect(res.status).toBe(400);
    const body: any = await res.json();
    expect(body.error).toBe("Invalid user address format");
  });
});
