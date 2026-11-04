/**
 * Mobius Typewriter Lifecycle Demo
 *
 * End-to-end demonstration of the mutation lifecycle:
 *   received → accepted → included → safe → finalized
 *
 * This script runs locally without requiring a live Typewriter server.
 * It exercises the adapter's lifecycle tracking so the team can show
 * each state transition in the demo and explain what each status means.
 *
 * Usage:
 *   npx tsx src/run-lifecycle-demo.ts
 */

import {
  TypewriterAdapter,
  type MutationIntent,
  type MutationAuthorization,
  type MutationRecord,
} from "./typewriter-adapter.js";
import { MONAD_TESTNET_TYPEWRITER_CONFIG } from "./config.js";

function printRecord(label: string, record: MutationRecord): void {
  console.log(`\n─── ${label} ───`);
  console.log(`  ID:     ${record.id}`);
  console.log(`  Status: ${record.status}`);
  console.log(`  Intent: ${record.intent.name}(${JSON.stringify(record.intent.params)})`);
  if (record.txHash) console.log(`  TxHash: ${record.txHash}`);
  if (record.blockNumber !== undefined) console.log(`  Block:  ${record.blockNumber}`);
  if (record.executionIndex !== undefined) console.log(`  ExecIdx: ${record.executionIndex}`);
  console.log(`  Timestamps:`);
  for (const [status, ts] of Object.entries(record.timestamps)) {
    console.log(`    ${status.padEnd(12)} ${ts}`);
  }
}

async function main(): Promise<void> {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  Mobius × Typewriter — Mutation Lifecycle Demo          ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log();
  console.log(`Chain ID:   ${MONAD_TESTNET_TYPEWRITER_CONFIG.chainId}`);
  console.log(`RPC URL:    ${MONAD_TESTNET_TYPEWRITER_CONFIG.rpcUrl}`);
  console.log(`Sequencing: ${MONAD_TESTNET_TYPEWRITER_CONFIG.sequencing.order.toUpperCase()}`);
  console.log();

  const adapter = new TypewriterAdapter();

  // ── Step 1: Submit a mutation intent ──
  console.log("▶ Step 1: Agent submits a typed mutation intent");
  console.log("  Mobius has already validated the intent against policy,");
  console.log("  simulated it deterministically, and revalidated state.");

  const intent: MutationIntent = {
    name: "ReserveBudget",
    params: {
      accountId: "demo-user-001",
      amount: "500000000000000000", // 0.5 token (18 decimals)
      purpose: "agent-risk-rehearsal",
    },
    accountId: "demo-user-001",
  };

  const authorization: MutationAuthorization = {
    signature: "0xdead000000000000000000000000000000000000000000000000000000000001",
    signer: "0x1111111111111111111111111111111111111111",
    nonce: 1n,
    expiry: Math.floor(Date.now() / 1000) + 3600,
  };

  const record = await adapter.submitMutation(intent, authorization);
  printRecord("After submitMutation (received → accepted)", record);

  console.log();
  console.log("  ⚠ Note: 'ACCEPTED' = local EVM preconfirmation.");
  console.log("    It does NOT mean onchain inclusion or finality.");

  // ── Step 2: Simulate onchain inclusion ──
  console.log("\n▶ Step 2: Typewriter server batches and submits onchain");
  await sleep(200);

  const included = await adapter.advanceLifecycle(record.id, "INCLUDED", {
    txHash: "0xabc123def456789000000000000000000000000000000000000000000000cafe",
    blockNumber: 12345679n,
    executionIndex: 0,
  });
  printRecord("After onchain inclusion", included);

  // ── Step 3: Safe confirmation ──
  console.log("\n▶ Step 3: Block reaches safe depth (safeBlockDepth=1)");
  await sleep(150);

  const safe = await adapter.advanceLifecycle(record.id, "SAFE");
  printRecord("After safe confirmation", safe);

  // ── Step 4: Finalized ──
  console.log("\n▶ Step 4: Block reaches finalized depth (finalizedBlockDepth=5)");
  await sleep(300);

  const finalized = await adapter.advanceLifecycle(record.id, "FINALIZED");
  printRecord("After finalization", finalized);

  // ── Summary ──
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║  Lifecycle Complete                                     ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log();
  console.log("  RECEIVED   → Server received the signed mutation");
  console.log("  ACCEPTED   → Local EVM executed successfully (preconfirmation)");
  console.log("  INCLUDED   → Settlement tx included in a Monad block");
  console.log("  SAFE       → Block passed safe confirmation depth");
  console.log("  FINALIZED  → Block passed finalized confirmation depth");
  console.log();
  console.log("  Key takeaway: Typewriter 'accepted' ≠ onchain finality.");
  console.log("  Mobius revalidation occurs BEFORE mutation submission.");
  console.log("  Typewriter does NOT replace Mobius simulation or policy.");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error("Demo failed:", err);
  process.exit(1);
});

