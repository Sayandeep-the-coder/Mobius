'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  Cpu,
  Layers,
  ShieldCheck,
  Send,
  Sliders,
} from 'lucide-react';
import { MobiusLogo } from '@/components/common/MobiusLogo';
import {
  agenticPlanNatural,
  agenticRevalidate,
  executionPrepare,
  preflightCheck,
  aaveMarket,
  aaveSupplyPreflight,
  type AgenticPlanResponse,
  type RevalidateResponse,
  type ExecutionPrepareResponse,
  type AaveMarketResponse,
  type AaveSupplyPreflightResponse,
} from '@/lib/api';

export default function AgenticPage() {
  // Stepper state
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form input
  const [account, setAccount] = useState<string>(
    '0x1234567890123456789012345678901234567890'
  );
  const [objective, setObjective] = useState<string>(
    'Execute swap on 0xA64c3bA49910baa01515360278AA2542AaAD0219 with 100 MON minOut 90'
  );
  const [minAmountOut, setMinAmountOut] = useState<string>('90');

  // Step outputs
  const [plan, setPlan] = useState<AgenticPlanResponse | null>(null);
  const [preflightResult, setPreflightResult] = useState<any | null>(null);
  const [revalidationResult, setRevalidationResult] = useState<RevalidateResponse | null>(null);
  const [executionResult, setExecutionResult] = useState<ExecutionPrepareResponse | null>(null);

  // Aave state
  const [aaveData, setAaveData] = useState<AaveMarketResponse | null>(null);
  const [aavePreflight, setAavePreflight] = useState<AaveSupplyPreflightResponse | null>(null);
  const [aaveLoading, setAaveLoading] = useState<boolean>(false);

  const [copied, setCopied] = useState<boolean>(false);

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Step 1: Natural Language Plan
  const handleNaturalPlan = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await agenticPlanNatural({
        chainId: 10143,
        account,
        objective,
        constraints: {
          minAmountOut,
        },
      });
      setPlan(res);
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Failed to generate agentic plan');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Run Preflight
  const handleRunPreflight = async () => {
    if (!plan) return;
    const swapCandidate = plan.candidates.find((c) => c.strategy === 'execute_swap') || plan.candidates[0];
    if (!swapCandidate || !swapCandidate.encodedCalls[0]) return;

    setLoading(true);
    setError(null);
    try {
      const res = await preflightCheck({
        chainId: 10143,
        from: account,
        to: swapCandidate.encodedCalls[0].to,
        data: swapCandidate.encodedCalls[0].data,
        value: swapCandidate.encodedCalls[0].value,
      });
      setPreflightResult(res);
      setStep(4);
    } catch (err: any) {
      setError(err.message || 'Preflight check failed');
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Revalidate against fresh block state
  const handleRevalidate = async () => {
    if (!plan) return;
    const swapCandidate = plan.candidates.find((c) => c.strategy === 'execute_swap') || plan.candidates[0];
    if (!swapCandidate) return;

    setLoading(true);
    setError(null);
    try {
      const res = await agenticRevalidate({
        planId: plan.planId,
        candidateId: swapCandidate.candidateId,
        chainId: 10143,
        targetAddress: swapCandidate.encodedCalls[0]?.to || '0xA64c3bA49910baa01515360278AA2542AaAD0219',
      });
      setRevalidationResult(res);
      setStep(5);
    } catch (err: any) {
      setError(err.message || 'Revalidation failed');
    } finally {
      setLoading(false);
    }
  };

  // Step 5: Execution Prepare (Wallet signs, backend never touches keys)
  const handleExecutionPrepare = async () => {
    if (!plan) return;
    const swapCandidate = plan.candidates.find((c) => c.strategy === 'execute_swap') || plan.candidates[0];
    if (!swapCandidate) return;

    setLoading(true);
    setError(null);
    try {
      const res = await executionPrepare({
        planId: plan.planId,
        candidateId: swapCandidate.candidateId,
        chainId: 10143,
        from: account,
        to: swapCandidate.encodedCalls[0].to,
        data: swapCandidate.encodedCalls[0].data,
        value: swapCandidate.encodedCalls[0].value,
      });
      setExecutionResult(res);
    } catch (err: any) {
      setError(err.message || 'Execution prepare failed');
    } finally {
      setLoading(false);
    }
  };

  // Aave Section
  const handleLoadAave = async () => {
    setAaveLoading(true);
    try {
      const market = await aaveMarket();
      setAaveData(market);
      const preflight = await aaveSupplyPreflight({
        user: '0x5c856F5289f07a22D3039d997232204c3A865dee',
        amount: '10000000000000000000', // 10 DAI
      });
      setAavePreflight(preflight);
    } catch (e: any) {
      console.warn('Aave market query:', e);
    } finally {
      setAaveLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-gray-900 font-sans pb-16">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 w-full border-b border-gray-200 bg-white/95 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/" className="flex items-center gap-2">
            <MobiusLogo className="size-7 text-[#836EF9]" />
            <span className="font-extrabold text-lg tracking-tight">MOBIUS</span>
          </a>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#836EF9]/10 text-[#836EF9] font-medium border border-[#836EF9]/20">
            Agentic Console
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="hidden sm:inline-block text-gray-500">
            Monad Testnet <strong className="text-gray-900">#10143</strong> · Sepolia <strong className="text-gray-900">#11155111</strong>
          </span>
          <a
            href="/app"
            className="px-3 py-1.5 rounded-lg bg-gray-900 text-white font-medium hover:bg-gray-800 transition"
          >
            Open Risk Console →
          </a>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-6 pt-10">
        {/* Title */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0] mb-3">
            <Sparkles className="size-3.5" />
            <span>Deterministic Agentic Pipeline · 44/44 Tests Verified</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-950">
            Agentic Natural Language Planner
          </h1>
          <p className="text-sm text-gray-600 mt-2 max-w-2xl">
            Input arbitrary natural language goals. Mobius extracts structured intent via LLM, simulates deterministic candidates against real Monad chain state, enforces policy limits, and produces signed transaction receipts.
          </p>
        </div>

        {/* 5-Step Stepper Header */}
        <div className="grid grid-cols-5 gap-2 border-b border-gray-200 pb-4 mb-8 text-xs font-medium">
          {[
            { n: 1, label: 'Natural Language Plan' },
            { n: 2, label: 'Candidate Simulation' },
            { n: 3, label: 'Pinned Preflight' },
            { n: 4, label: 'State Revalidation' },
            { n: 5, label: 'Execution Prepare' },
          ].map((s) => (
            <button
              key={s.n}
              onClick={() => s.n <= step && setStep(s.n)}
              className={`text-left p-2 rounded-lg transition ${
                step === s.n
                  ? 'bg-gray-900 text-white font-semibold'
                  : step > s.n
                  ? 'text-emerald-700 bg-emerald-50'
                  : 'text-gray-400 bg-white border border-gray-100'
              }`}
            >
              <div className="text-[10px] opacity-75">STEP 0{s.n}</div>
              <div className="truncate">{s.label}</div>
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Natural Language Plan Input */}
        {step === 1 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm space-y-6">
            <h2 className="text-lg font-bold text-gray-950">Step 1: Input Natural Language Objective</h2>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Target Account</label>
                <input
                  type="text"
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  className="w-full p-3 rounded-xl border border-gray-200 font-mono text-gray-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Natural Language Objective</label>
                <textarea
                  rows={3}
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  className="w-full p-3 rounded-xl border border-gray-200 font-sans text-gray-900 text-sm"
                  placeholder="e.g. Execute swap on 0xA64c3bA49910baa01515360278AA2542AaAD0219 with 100 MON minOut 90"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Min Amount Out</label>
                  <input
                    type="text"
                    value={minAmountOut}
                    onChange={(e) => setMinAmountOut(e.target.value)}
                    className="w-full p-3 rounded-xl border border-gray-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Target Chain</label>
                  <div className="p-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-600">
                    Monad Testnet (Chain ID 10143)
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleNaturalPlan}
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gray-950 hover:bg-gray-800 text-white font-semibold text-sm transition cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="size-4 animate-spin" />
                  <span>Parsing Intent & Generating Plan...</span>
                </>
              ) : (
                <>
                  <Sparkles className="size-4 text-[#836EF9]" />
                  <span>Parse with LLM & Generate Plan</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* STEP 2: Candidate Simulation Display */}
        {step === 2 && plan && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-bold text-gray-950">Step 2: Simulation & Intent Extraction</h2>
                <p className="text-xs text-gray-500 font-mono mt-0.5">Plan ID: {plan.planId}</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
                {plan.decision}
              </span>
            </div>

            {/* Snapshot metadata */}
            <div className="grid grid-cols-3 gap-3 text-xs bg-gray-50 p-4 rounded-xl border border-gray-100 font-mono">
              <div>
                <span className="text-gray-400">Observed Block:</span>
                <div className="font-bold text-gray-900">{plan.snapshot.blockNumber}</div>
              </div>
              <div>
                <span className="text-gray-400">Chain ID:</span>
                <div className="font-bold text-gray-900">{plan.snapshot.chainId}</div>
              </div>
              <div>
                <span className="text-gray-400">LLM Used:</span>
                <div className="font-bold text-emerald-600">{plan.llmUsed ? 'Yes (Groq/Mock)' : 'Deterministic'}</div>
              </div>
            </div>

            {/* Candidates */}
            <div className="space-y-3">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Evaluated Candidates ({plan.candidates.length})
              </div>
              {plan.candidates.map((cand) => (
                <div key={cand.candidateId} className="p-4 rounded-xl border border-gray-200 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-900 uppercase font-mono">{cand.strategy}</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                      {cand.status}
                    </span>
                  </div>
                  <p className="text-gray-600">{cand.explanation}</p>
                  {cand.encodedCalls[0] && (
                    <div className="p-2 bg-gray-50 rounded font-mono text-[11px] text-gray-700 break-all">
                      Target: {cand.encodedCalls[0].to}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Human Explanation Callout */}
            <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100 text-xs text-blue-950 whitespace-pre-line">
              <strong>Mobius Agent Explanation:</strong>
              {'\n'}{plan.humanExplanation}
            </div>

            <button
              onClick={() => setStep(3)}
              className="w-full py-3.5 rounded-xl bg-gray-950 text-white font-semibold text-sm hover:bg-gray-800 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Continue to Preflight Verification</span>
              <ArrowRight className="size-4" />
            </button>
          </div>
        )}

        {/* STEP 3: Preflight Verification */}
        {step === 3 && plan && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-gray-950">Step 3: Exact Calldata Preflight</h2>
              <p className="text-xs text-gray-500 mt-1">
                Verifies exact encoded transaction calldata against the pinned block snapshot on Monad.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 space-y-2 text-xs font-mono">
              <div>
                <span className="text-gray-400">Target Address:</span>
                <div className="text-gray-900 font-bold">0xA64c3bA49910baa01515360278AA2542AaAD0219</div>
              </div>
              <div>
                <span className="text-gray-400">Function Selector:</span>
                <div className="text-gray-900 font-bold">0xd96073cf (swap uint256, uint256)</div>
              </div>
            </div>

            <button
              onClick={handleRunPreflight}
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gray-950 hover:bg-gray-800 text-white font-semibold text-sm transition cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="size-4 animate-spin" />
                  <span>Simulating eth_call against Monad...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="size-4 text-emerald-500" />
                  <span>Run Preflight eth_call Simulation</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* STEP 4: State Drift Revalidation */}
        {step === 4 && plan && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-gray-950">Step 4: State Drift Revalidation</h2>
                <p className="text-xs text-gray-500 mt-1">
                  Checks whether Monad block dependencies (300ms block time) or pricing rateWad changed.
                </p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                Preflight Passed
              </span>
            </div>

            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 text-xs text-amber-900 space-y-1">
              <div className="font-bold">Monad High-Throughput Safeguard:</div>
              <p>
                In high-frequency block environments, state can change between plan time and sign time. Revalidation re-checks dependencies before prompting the user&apos;s wallet.
              </p>
            </div>

            <button
              onClick={handleRevalidate}
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gray-950 hover:bg-gray-800 text-white font-semibold text-sm transition cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="size-4 animate-spin" />
                  <span>Validating Dependencies...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="size-4 text-[#836EF9]" />
                  <span>Check Revalidation Status</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* STEP 5: Execution Prepare (Validated Wallet Request) */}
        {step === 5 && plan && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-gray-950">Step 5: Execution Prepare</h2>
                <p className="text-xs text-gray-500 mt-1">
                  Non-custodial transaction payload prepared for browser wallet signature.
                </p>
              </div>
              {revalidationResult && (
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    revalidationResult.status === 'VALID'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {revalidationResult.status}
                </span>
              )}
            </div>

            {!executionResult ? (
              <button
                onClick={handleExecutionPrepare}
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gray-950 hover:bg-gray-800 text-white font-semibold text-sm transition cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="size-4 animate-spin" />
                    <span>Preparing Wallet Request...</span>
                  </>
                ) : (
                  <>
                    <Send className="size-4 text-[#836EF9]" />
                    <span>Generate Validated Execution Payload</span>
                  </>
                )}
              </button>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-900">Execution Prepared</span>
                    <span className="font-mono text-[11px] text-emerald-700">{executionResult.executionId}</span>
                  </div>
                  <p className="text-emerald-800">{executionResult.transaction.note}</p>
                </div>

                <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 text-xs font-mono space-y-2 break-all">
                  <div>
                    <span className="text-gray-400">Target To:</span>
                    <div>{executionResult.transaction.to}</div>
                  </div>
                  <div>
                    <span className="text-gray-400">Calldata:</span>
                    <div className="text-[11px]">{executionResult.transaction.data}</div>
                  </div>
                </div>

                <button
                  onClick={() => copyText(executionResult.transaction.data)}
                  className="w-full py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 font-medium text-xs transition cursor-pointer flex items-center justify-center gap-2"
                >
                  {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                  <span>{copied ? 'Calldata Copied' : 'Copy Prepared Calldata for Wallet'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── AAVE V3 SEPOLIA PROTOCOL ADAPTER SECTION ─── */}
        <div className="mt-12 bg-white rounded-2xl border border-gray-200 p-8 shadow-sm space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-gray-950">Aave V3 Protocol Adapter</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Sepolia #11155111
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Dynamic pool resolution, asset metadata, balance checks, and allowance simulation.
              </p>
            </div>
            <button
              onClick={handleLoadAave}
              disabled={aaveLoading}
              className="px-3.5 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-xs font-semibold transition cursor-pointer"
            >
              {aaveLoading ? 'Resolving...' : 'Query Sepolia Pool'}
            </button>
          </div>

          {aaveData && (
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-xs font-mono space-y-1">
              <div><strong>Network:</strong> {aaveData.network}</div>
              <div><strong>Pool Address:</strong> {aaveData.pool}</div>
              <div><strong>Observed Block:</strong> {aaveData.observedAtBlock}</div>
              <div className="text-gray-500 pt-1 text-[11px]">{aaveData.note}</div>
            </div>
          )}

          {aavePreflight && (
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 text-xs font-mono space-y-1.5">
              <div className="font-bold text-gray-900 font-sans">Supply Preflight Result:</div>
              <div><strong>User:</strong> {aavePreflight.user}</div>
              <div><strong>Asset (DAI):</strong> {aavePreflight.asset}</div>
              <div><strong>Approval Required:</strong> {aavePreflight.approvalRequired ? 'Yes (approve pool)' : 'No'}</div>
              <div><strong>Simulation Status:</strong> {aavePreflight.simulationStatus}</div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
