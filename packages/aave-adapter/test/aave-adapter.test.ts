import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  SEPOLIA_CHAIN_ID,
  MONAD_TESTNET_CHAIN_ID,
  AAVE_SEPOLIA_POOL_ADDRESSES_PROVIDER,
  AAVE_SEPOLIA_DAI,
  AAVE_SEPOLIA_POOL_PROXY_SNAPSHOT,
} from "../src/constants.js";
import { AaveSepoliaClient } from "../src/aave-client.js";
import { runSupplyPreflight } from "../src/supply-preflight.js";

describe("Aave V3 Sepolia Adapter Acceptance Tests", () => {
  it("enforces chain ID separation: Sepolia (11155111) vs Monad (10143)", () => {
    assert.equal(SEPOLIA_CHAIN_ID, 11155111);
    assert.equal(MONAD_TESTNET_CHAIN_ID, 10143);
    assert.notEqual(SEPOLIA_CHAIN_ID, MONAD_TESTNET_CHAIN_ID);
  });

  it("holds verified official Aave V3 Sepolia registry and asset addresses", () => {
    assert.match(AAVE_SEPOLIA_POOL_ADDRESSES_PROVIDER, /^0x[0-9a-fA-F]{40}$/);
    assert.match(AAVE_SEPOLIA_DAI, /^0x[0-9a-fA-F]{40}$/);
    assert.match(AAVE_SEPOLIA_POOL_PROXY_SNAPSHOT, /^0x[0-9a-fA-F]{40}$/);
  });

  it("rejects zero or malformed user and asset addresses", async () => {
    const client = new AaveSepoliaClient();

    // Mock verifyChainId to pass
    client.verifyChainId = async () => SEPOLIA_CHAIN_ID;

    await assert.rejects(
      async () => {
        await runSupplyPreflight(client, {
          user: "0x0000000000000000000000000000000000000000",
          asset: AAVE_SEPOLIA_DAI,
          amount: 1000n,
        });
      },
      {
        message: /Invalid user address/,
      }
    );

    await assert.rejects(
      async () => {
        await runSupplyPreflight(client, {
          user: "0x1111111111111111111111111111111111111111",
          asset: "0x0000000000000000000000000000000000000000",
          amount: 1000n,
        });
      },
      {
        message: /Invalid asset address/,
      }
    );
  });

  it("rejects zero or negative amounts", async () => {
    const client = new AaveSepoliaClient();
    client.verifyChainId = async () => SEPOLIA_CHAIN_ID;

    await assert.rejects(
      async () => {
        await runSupplyPreflight(client, {
          user: "0x1111111111111111111111111111111111111111",
          asset: AAVE_SEPOLIA_DAI,
          amount: 0n,
        });
      },
      {
        message: /Requested amount must be strictly positive/,
      }
    );
  });

  it("returns NOT_READY and approvalRequired=true when allowance is insufficient", async () => {
    const client = new AaveSepoliaClient();

    // Mock chain verification and pool resolution
    client.verifyChainId = async () => SEPOLIA_CHAIN_ID;
    client.resolvePool = async () => ({
      poolAddress: AAVE_SEPOLIA_POOL_PROXY_SNAPSHOT,
      blockNumber: 7000000n,
    });

    // Mock user having 100 DAI balance but 0 allowance
    client.getAssetMetadata = async () => ({
      address: AAVE_SEPOLIA_DAI,
      symbol: "DAI",
      decimals: 18,
      userBalance: 100000000000000000000n, // 100 DAI
      userAllowance: 0n,                     // 0 allowance
      observedAtBlock: 7000000n,
    });

    const preflight = await runSupplyPreflight(client, {
      user: "0x1111111111111111111111111111111111111111",
      asset: AAVE_SEPOLIA_DAI,
      amount: 10000000000000000000n, // 10 DAI
    });

    assert.equal(preflight.status, "NOT_READY");
    assert.equal(preflight.approvalRequired, true);
    assert.ok(preflight.approvalTransaction);
    assert.equal(preflight.approvalTransaction.spender, AAVE_SEPOLIA_POOL_PROXY_SNAPSHOT);
    assert.equal(preflight.approvalTransaction.amount, "10000000000000000000");
  });

  it("proceeds to simulation when allowance is sufficient", async () => {
    const client = new AaveSepoliaClient();

    client.verifyChainId = async () => SEPOLIA_CHAIN_ID;
    client.resolvePool = async () => ({
      poolAddress: AAVE_SEPOLIA_POOL_PROXY_SNAPSHOT,
      blockNumber: 7000005n,
    });

    // Mock user having 100 DAI balance and 50 DAI allowance
    client.getAssetMetadata = async () => ({
      address: AAVE_SEPOLIA_DAI,
      symbol: "DAI",
      decimals: 18,
      userBalance: 100000000000000000000n,
      userAllowance: 50000000000000000000n,
      observedAtBlock: 7000005n,
    });

    // Mock successful simulateContract
    (client.client as any).simulateContract = async () => ({
      request: { gas: 210000n },
      result: undefined,
    });

    const preflight = await runSupplyPreflight(client, {
      user: "0x1111111111111111111111111111111111111111",
      asset: AAVE_SEPOLIA_DAI,
      amount: 10000000000000000000n, // 10 DAI
    });

    assert.equal(preflight.status, "SIMULATION_PASSED");
    assert.equal(preflight.approvalRequired, false);
    assert.ok(preflight.preparedTransaction);
    assert.equal(preflight.preparedTransaction.to, AAVE_SEPOLIA_POOL_PROXY_SNAPSHOT);
    assert.equal(preflight.preparedTransaction.functionName, "supply");
  });
});

