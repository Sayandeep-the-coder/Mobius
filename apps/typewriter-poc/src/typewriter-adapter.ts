/**
 * Mobius Typewriter Adapter
 *
 * Thin integration layer between Mobius policy engine and Typewriter execution.
 * Typewriter sits AFTER Mobius planning, simulation, policy evaluation, and revalidation.
 *
 * Key boundaries:
 * - Typewriter is for compatible Monad application mutations ONLY.
 * - "accepted" = local EVM preconfirmation, NOT onchain inclusion or finality.
 * - Never route external Aave calls through Typewriter on day one.
 * - Never treat Typewriter accepted as a substitute for Mobius simulation.
 */

export type MutationLifecycleStatus =
  | "PENDING"
  | "RECEIVED"
  | "ACCEPTED"
  | "INCLUDED"
  | "SAFE"
  | "FINALIZED"
  | "REJECTED"
  | "FAILED";

export interface MutationIntent {
  name: string;
  params: Record<string, unknown>;
  accountId?: string;
}

export interface MutationAuthorization {
  signature: `0x${string}`;
  signer: `0x${string}`;
  nonce: bigint;
  expiry?: number;
}

export interface MutationRecord {
  id: string;
  intent: MutationIntent;
  status: MutationLifecycleStatus;
  timestamps: Partial<Record<MutationLifecycleStatus, string>>;
  executionIndex?: number;
  txHash?: `0x${string}`;
  blockNumber?: bigint;
  error?: string;
}

export interface TypewriterManifest {
  appName: string;
  contractAddress: `0x${string}`;
  chainId: number;
  mutations: string[];
  version: string;
}

/**
 * Adapter for the Typewriter mutation lifecycle.
 *
 * In the real integration this wraps the upstream Typewriter SDK's
 * `createTypewriter()` instance. For the one-day POC we track the
 * lifecycle states manually so the demo can show the full
 * received → accepted → included → safe → finalized progression.
 */
export class TypewriterAdapter {
  private mutations: Map<string, MutationRecord> = new Map();
  private nextId = 1;

  /**
   * Submit a mutation after Mobius policy gate has approved it.
   * In production this calls `typewriter.execute(...)`.
   */
  async submitMutation(
    intent: MutationIntent,
    _authorization: MutationAuthorization
  ): Promise<MutationRecord> {
    const id = `mut_${Date.now()}_${this.nextId++}`;
    const now = new Date().toISOString();

    const record: MutationRecord = {
      id,
      intent,
      status: "RECEIVED",
      timestamps: { RECEIVED: now },
    };

    this.mutations.set(id, record);

    // Simulate local EVM acceptance (in real integration this is
    // the Typewriter server's embedded EVM execution result)
    await this.simulateLocalAcceptance(record);

    return { ...record };
  }

  /**
   * Query the current status of a mutation by ID.
   * In production this reads from Typewriter events/status endpoint.
   */
  async getMutationStatus(mutationId: string): Promise<MutationRecord | null> {
    const record = this.mutations.get(mutationId);
    return record ? { ...record } : null;
  }

  /**
   * List all tracked mutations.
   */
  async listMutations(): Promise<MutationRecord[]> {
    return Array.from(this.mutations.values()).map((r) => ({ ...r }));
  }

  /**
   * Advance a mutation through its lifecycle for demo purposes.
   * In real integration, Typewriter emits these state transitions.
   */
  async advanceLifecycle(
    mutationId: string,
    toStatus: MutationLifecycleStatus,
    extra?: { txHash?: `0x${string}`; blockNumber?: bigint; executionIndex?: number }
  ): Promise<MutationRecord> {
    const record = this.mutations.get(mutationId);
    if (!record) {
      throw new Error(`Mutation ${mutationId} not found`);
    }

    record.status = toStatus;
    record.timestamps[toStatus] = new Date().toISOString();

    if (extra?.txHash) record.txHash = extra.txHash;
    if (extra?.blockNumber) record.blockNumber = extra.blockNumber;
    if (extra?.executionIndex !== undefined)
      record.executionIndex = extra.executionIndex;

    return { ...record };
  }

  /**
   * Simulates local EVM acceptance.
   * In the real Typewriter server this runs the mutation against
   * the embedded local EVM copy of the app state.
   */
  private async simulateLocalAcceptance(record: MutationRecord): Promise<void> {
    // Simulate ~50ms local EVM execution time
    await new Promise((resolve) => setTimeout(resolve, 50));

    record.status = "ACCEPTED";
    record.timestamps.ACCEPTED = new Date().toISOString();
  }
}
