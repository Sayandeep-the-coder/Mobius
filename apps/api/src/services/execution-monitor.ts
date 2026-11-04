/**
 * Execution Monitor Service
 * Tracks transaction lifecycle from submission to finalization.
 * Compares predicted (simulated) vs actual (observed) onchain state.
 */
import type { CandidateResult } from "@mobius/contracts-abi";

export type ExecutionStatus =
  | "submitted"
  | "included"
  | "safe"
  | "finalized"
  | "failed";

export interface PredictedState {
  healthFactor?: string;
  liquidationDistance?: string;
  carry?: string;
  [key: string]: string | undefined;
}

export interface ActualState {
  healthFactor?: string;
  liquidationDistance?: string;
  carry?: string;
  [key: string]: string | undefined;
}

export interface ExecutionRecord {
  executionId: string;
  planId: string;
  candidateId: string;
  chainId: number;
  from: `0x${string}`;
  to: `0x${string}`;
  data: `0x${string}`;
  value: string;
  status: ExecutionStatus;
  predictedState: PredictedState;
  actualState: ActualState | null;
  submittedAt: string;
  includedAt: string | null;
  safeAt: string | null;
  finalizedAt: string | null;
  txHash: string | null;
  blockNumber: string | null;
}

/**
 * Comparison between predicted and actual state.
 */
export interface DeltaComparison {
  field: string;
  predicted: string | undefined;
  actual: string | undefined;
  delta: string | undefined;
  withinTolerance: boolean;
}

/**
 * ExecutionMonitorService — tracks execution lifecycle and compares
 * predicted vs observed onchain state.
 */
export class ExecutionMonitorService {
  private executions = new Map<string, ExecutionRecord>();

  /**
   * Register a new execution from a prepared transaction.
   * Stores the predicted state from simulation.
   */
  recordExecution(
    executionId: string,
    planId: string,
    candidateId: string,
    chainId: number,
    from: `0x${string}`,
    to: `0x${string}`,
    data: `0x${string}`,
    value: string,
    predictedState: PredictedState
  ): ExecutionRecord {
    const record: ExecutionRecord = {
      executionId,
      planId,
      candidateId,
      chainId,
      from,
      to,
      data,
      value,
      status: "submitted",
      predictedState,
      actualState: null,
      submittedAt: new Date().toISOString(),
      includedAt: null,
      safeAt: null,
      finalizedAt: null,
      txHash: null,
      blockNumber: null,
    };
    this.executions.set(executionId, record);
    return record;
  }

  /**
   * Update execution status when a transaction is submitted/signed by the wallet.
   * Called when the user reports a txHash after signing.
   */
  recordSubmission(
    executionId: string,
    txHash: `0x${string}`
  ): ExecutionRecord | null {
    const record = this.executions.get(executionId);
    if (!record) return null;
    record.status = "submitted";
    record.txHash = txHash;
    this.executions.set(executionId, record);
    return record;
  }

  /**
   * Update execution when transaction is included in a block.
   */
  recordInclusion(
    executionId: string,
    blockNumber: string,
    actualState: ActualState
  ): ExecutionRecord | null {
    const record = this.executions.get(executionId);
    if (!record) return null;
    record.status = "included";
    record.includedAt = new Date().toISOString();
    record.blockNumber = blockNumber;
    record.actualState = actualState;
    this.executions.set(executionId, record);
    return record;
  }

  /**
   * Update execution when transaction is safe (sufficient block depth).
   */
  recordSafe(executionId: string): ExecutionRecord | null {
    const record = this.executions.get(executionId);
    if (!record) return null;
    record.status = "safe";
    record.safeAt = new Date().toISOString();
    this.executions.set(executionId, record);
    return record;
  }

  /**
   * Update execution when transaction is finalized.
   */
  recordFinalized(executionId: string): ExecutionRecord | null {
    const record = this.executions.get(executionId);
    if (!record) return null;
    record.status = "finalized";
    record.finalizedAt = new Date().toISOString();
    this.executions.set(executionId, record);
    return record;
  }

  /**
   * Mark execution as failed (reverted onchain).
   */
  recordFailed(executionId: string): ExecutionRecord | null {
    const record = this.executions.get(executionId);
    if (!record) return null;
    record.status = "failed";
    this.executions.set(executionId, record);
    return record;
  }

  /**
   * Get execution record with predicted-vs-observed comparison.
   */
  getExecution(executionId: string): ExecutionRecord | null {
    return this.executions.get(executionId) ?? null;
  }

  /**
   * Compare predicted vs actual state and compute deltas.
   */
  getPredictedVsActual(executionId: string): {
    record: ExecutionRecord;
    comparison: DeltaComparison[];
  } | null {
    const record = this.executions.get(executionId);
    if (!record) return null;

    const comparison: DeltaComparison[] = [];
    const predicted = record.predictedState;
    const actual = record.actualState;

    const allKeys = new Set([
      ...Object.keys(predicted),
      ...(actual ? Object.keys(actual) : []),
    ]);

    for (const key of allKeys) {
      const predVal = predicted[key];
      const actualVal = actual?.[key];
      const withinTolerance = this.isWithinTolerance(key, predVal, actualVal);

      comparison.push({
        field: key,
        predicted: predVal,
        actual: actualVal,
        delta: this.computeDelta(predVal, actualVal),
        withinTolerance,
      });
    }

    return { record, comparison };
  }

  private isWithinTolerance(
    field: string,
    predicted: string | undefined,
    actual: string | undefined
  ): boolean {
    if (predicted === undefined && actual === undefined) return true;
    if (predicted === undefined || actual === undefined) return false;

    const predNum = parseFloat(predicted);
    const actualNum = parseFloat(actual);

    if (isNaN(predNum) || isNaN(actualNum)) {
      return predicted === actual;
    }

    // 5% tolerance for numeric values
    const tolerance = 0.05;
    const diff = Math.abs(predNum - actualNum);
    const relativeDiff = predNum === 0 ? diff : diff / Math.abs(predNum);
    return relativeDiff <= tolerance;
  }

  private computeDelta(
    predicted: string | undefined,
    actual: string | undefined
  ): string | undefined {
    if (predicted === undefined || actual === undefined) return undefined;
    const predNum = parseFloat(predicted);
    const actualNum = parseFloat(actual);
    if (isNaN(predNum) || isNaN(actualNum)) {
      return predicted === actual ? "0" : "changed";
    }
    const diff = actualNum - predNum;
    return diff.toFixed(4);
  }

  /**
   * Get all executions (for debugging/monitoring).
   */
  getAllExecutions(): ExecutionRecord[] {
    return Array.from(this.executions.values());
  }
}

export const executionMonitor = new ExecutionMonitorService();
