import { type PublicClient, type Address, type Hex } from "viem";
import type { StateSnapshot } from "@mobius/contracts-abi";

/**
 * Reads the latest block and creates a pinned StateSnapshot.
 * Records blockNumber, blockHash, observedAt, and dependency fingerprints.
 */
export async function createSnapshot(
  client: PublicClient,
  chainId: number,
  dependencies: Array<{ label: string; address?: Address; valueHash: string }>
): Promise<StateSnapshot> {
  const block = await client.getBlock();

  if (block.number === null || block.hash === null) {
    throw new Error("RPC did not return a canonical block number/hash");
  }

  return {
    chainId,
    blockNumber: block.number.toString(),
    blockHash: block.hash as `0x${string}`,
    observedAt: new Date().toISOString(),
    stateFingerprint: `fp_${block.number}_${block.hash}`,
    dependencies,
  };
}

/**
 * Computes a hash-like fingerprint from dependency values.
 * In production, use a proper hash function (e.g., SHA-256).
 */
export function computeFingerprint(
  dependencies: Array<{ label: string; valueHash: string }>
): string {
  const payload = dependencies
    .map((d) => `${d.label}:${d.valueHash}`)
    .join("|");
  return `fp_${Buffer.from(payload).toString("hex")}`;
}

/**
 * Compares two snapshots and returns the list of dependency labels that changed.
 */
export function getChangedDependencies(
  original: StateSnapshot,
  latest: StateSnapshot
): string[] {
    const originalMap = new Map(
      original.dependencies.map((d) => [d.label, d.valueHash])
    );
    const changed: string[] = [];

    for (const dep of latest.dependencies) {
      const originalValue = originalMap.get(dep.label);
      if (originalValue !== undefined && originalValue !== dep.valueHash) {
        changed.push(dep.label);
      }
    }

    return changed;
  }
