/**
 * Mobius API Client
 * Connects frontend to Express backend (apps/api on port 8787).
 * Provides graceful deterministic fallbacks if backend is booting or in offline sandbox.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export interface ChainInfo {
  name: string;
  chainId: number;
  rpcUrl: string;
  purpose: string;
}

export interface AavePreflightResult {
  chainId: number;
  status: 'SIMULATION_PASSED' | 'NOT_READY' | 'REVERTED';
  approvalRequired: boolean;
  poolAddress?: string;
  gasEstimate?: string;
  currentAllowance?: string;
  warnings?: string[];
}

export interface RevalidationResult {
  status: 'SAFE_TO_EXECUTE' | 'REPLAN_REQUIRED';
  staleStateDetected: boolean;
  blockNumber: number;
  driftBps?: number;
}

export async function checkBackendHealth(): Promise<{ ok: boolean; service?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return { ok: false };
    const data = await res.json();
    return { ok: data.status === 'ok', service: data.service };
  } catch {
    return { ok: false };
  }
}

export async function fetchChains(): Promise<ChainInfo[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/v1/chains`, { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      const data = await res.json();
      return data.chains;
    }
  } catch {}
  return [
    {
      name: 'Monad Testnet',
      chainId: 10143,
      rpcUrl: 'https://testnet-rpc.monad.xyz',
      purpose: 'Mobius demo + Typewriter POC',
    },
    {
      name: 'Ethereum Sepolia',
      chainId: 11155111,
      rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
      purpose: 'Aave V3 protocol test',
    },
  ];
}

export async function runAavePreflight(
  userAddress: string,
  assetAddress: string,
  amount: string
): Promise<AavePreflightResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/v1/aave/sepolia/supply/preflight`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userAddress, assetAddress, amount }),
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      return (await res.json()) as AavePreflightResult;
    }
  } catch {}

  // Deterministic local simulation fallback
  return {
    chainId: 11155111,
    status: 'NOT_READY',
    approvalRequired: true,
    poolAddress: '0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951',
    warnings: [
      'Approval required: Current allowance is 0. User must sign ERC-20 approval before supply.',
    ],
  };
}

export async function revalidatePlan(
  planId: string,
  forceDrift: boolean = false
): Promise<RevalidationResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/v1/agentic/revalidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId, simulateDrift: forceDrift }),
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      return (await res.json()) as RevalidationResult;
    }
  } catch {}

  if (forceDrift) {
    return {
      status: 'REPLAN_REQUIRED',
      staleStateDetected: true,
      blockNumber: 82451201,
      driftBps: 185,
    };
  }

  return {
    status: 'SAFE_TO_EXECUTE',
    staleStateDetected: false,
    blockNumber: 82451200,
  };
}

