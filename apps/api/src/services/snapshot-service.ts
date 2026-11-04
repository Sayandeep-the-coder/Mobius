import { type PublicClient } from "viem";
import { createSnapshot, getChangedDependencies } from "@mobius/simulation";
import type { StateSnapshot } from "@mobius/contracts-abi";

/**
 * Service for managing snapshots: creation, comparison, freshness.
 * Used by preflight, agentic planning, and revalidation endpoints.
 *
 * Snapshots are stored by planId so revalidation can look up the exact
 * original state that a plan was created against.
 */
export class SnapshotService {
  private snapshots = new Map<string, StateSnapshot>();
  private byPlanId = new Map<string, StateSnapshot>();

  /**
   * Create a new pinned snapshot from the current chain state.
   * Returns the snapshot and stores it by block number.
   */
  async create(client: PublicClient, chainId: number): Promise<StateSnapshot> {
    const snapshot = await createSnapshot(client, chainId, [
      { label: "block", valueHash: String(Date.now()) },
    ]);
    this.snapshots.set(snapshot.blockNumber, snapshot);
    return snapshot;
  }

  /**
   * Store a snapshot keyed by planId for revalidation lookup.
   */
  storeByPlanId(planId: string, snapshot: StateSnapshot): void {
    this.byPlanId.set(planId, snapshot);
  }

  /**
   * Get a stored snapshot by planId.
   */
  getByPlanId(planId: string): StateSnapshot | undefined {
    return this.byPlanId.get(planId);
  }

  /**
   * Get a stored snapshot by block number.
   */
  get(blockNumber: string): StateSnapshot | undefined {
    return this.snapshots.get(blockNumber);
  }

  /**
   * Compare two snapshots and return changed dependency labels.
   */
  getChangedDependencies(
    original: StateSnapshot,
    latest: StateSnapshot
  ): string[] {
    return getChangedDependencies(original, latest);
  }

  /**
   * Check if a snapshot is stale based on block lag.
   * Returns true if the latest block is more than maxLagBlocks ahead.
   */
  isStale(
    snapshot: StateSnapshot,
    latestBlockNumber: bigint,
    maxLagBlocks: number
  ): boolean {
    const snapshotBlock = BigInt(snapshot.blockNumber);
    const lag = latestBlockNumber - snapshotBlock;
    return lag > BigInt(maxLagBlocks);
  }
}

export const snapshotService = new SnapshotService();
