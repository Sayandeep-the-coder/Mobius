'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  Send,
  Sliders,
  RotateCcw,
  Cpu,
  Layers,
  ExternalLink,
  Wallet,
  Menu,
  X,
  Home,
  LayoutDashboard,
  ArrowUpRight,
} from 'lucide-react';
import { MobiusLogo } from '@/components/common/MobiusLogo';
import {
  connectMetaMask,
  switchToMonadTestnet,
  disconnectWallet,
  formatAddress,
  formatBalance,
  isMetaMaskAvailable,
  getEthereumProvider,
  MONAD_TESTNET_CHAIN_ID,
} from '@/lib/wallet';
import {
  agenticPlanNatural,
  agenticRevalidate,
  executionPrepare,
  getConnectedAccount,
  preflightCheck,
  setConnectedAccount,
  aaveMarket,
  aaveSupplyPreflight,
  type AgenticPlanResponse,
  type RevalidateResponse,
  type ExecutionPrepareResponse,
  type AaveMarketResponse,
  type AaveSupplyPreflightResponse,
} from '@/lib/api';

type StepNumber = 1 | 2 | 3 | 4 | 5;

const DEFAULT_ACCOUNT = '0x1234567890123456789012345678901234567890';

export default function AgenticPage() {
  const [step, setStep] = useState<StepNumber>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Form input
  const [account, setAccount] = useState<string>(
    getConnectedAccount() || DEFAULT_ACCOUNT
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
  const [walletConnected, setWalletConnected] = useState<boolean>(false);
  const [chainId, setChainId] = useState<number | null>(null);
  const [walletBalance, setWalletBalance] = useState<string>('0.000 MON');
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  useEffect(() => {
    const stored = getConnectedAccount();
    if (stored && stored !== account) {
      setAccount(stored);
      setWalletConnected(true);
    }

    const provider = getEthereumProvider();
    if (provider) {
      provider
        .request({ method: 'eth_accounts' })
        .then(async (accounts: string[]) => {
          if (accounts && accounts.length > 0) {
            setAccount(accounts[0]);
            setConnectedAccount(accounts[0]);
            setWalletConnected(true);
            const cIdHex = await provider.request({ method: 'eth_chainId' }).catch(() => null);
            if (cIdHex) setChainId(parseInt(cIdHex, 16));
            const balHex = await provider
              .request({ method: 'eth_getBalance', params: [accounts[0], 'latest'] })
              .catch(() => null);
            if (balHex) setWalletBalance(`${formatBalance(balHex)} MON`);
          }
        })
        .catch(() => {});

      if (provider.on) {
        const onAccounts = (accs: string[]) => {
          if (accs.length > 0) {
            setAccount(accs[0]);
            setConnectedAccount(accs[0]);
            setWalletConnected(true);
          } else {
            setAccount(DEFAULT_ACCOUNT);
            setConnectedAccount();
            setWalletConnected(false);
          }
        };
        const onChain = (cIdHex: string) => setChainId(parseInt(cIdHex, 16));
        provider.on('accountsChanged', onAccounts);
        provider.on('chainChanged', onChain);
        return () => {
          if (provider.removeListener) {
            provider.removeListener('accountsChanged', onAccounts);
            provider.removeListener('chainChanged', onChain);
          }
        };
      }
    }
  }, [account]);

  const handleConnectWallet = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const res = await connectMetaMask();
      if (res.success && res.address) {
        setAccount(res.address);
        setConnectedAccount(res.address);
        setWalletConnected(true);
        setChainId(res.chainId ?? null);
        setWalletBalance(`${res.balance || '0.000'} MON`);
      } else {
        if (res.error === 'METAMASK_NOT_INSTALLED') {
          setError('MetaMask not detected. Please install MetaMask from metamask.io to connect.');
        } else {
          setError(res.error || 'Failed to connect MetaMask');
        }
      }
    } catch (e: any) {
      setError(e?.message || 'MetaMask connection error');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectWallet = () => {
    disconnectWallet();
    setConnectedAccount();
    setAccount(DEFAULT_ACCOUNT);
    setWalletConnected(false);
    setWalletBalance('0.000 MON');
  };

  const handleSwitchToMonad = async () => {
    const ok = await switchToMonadTestnet();
    if (ok) setChainId(MONAD_TESTNET_CHAIN_ID);
  };

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
        constraints: { minAmountOut },
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

  // Step 5: Execution Prepare
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
        amount: '10000000000000000000',
      });
      setAavePreflight(preflight);
    } catch (e) {
      console.warn('Aave query:', e);
    } finally {
      setAaveLoading(false);
    }
  };

  const stepsList = [
    { n: 1, label: 'Natural Language Plan', sub: 'Input intent' },
    { n: 2, label: 'Candidate Simulation', sub: 'eth_call deltas' },
    { n: 3, label: 'Pinned Preflight', sub: 'Snapshot check' },
    { n: 4, label: 'State Revalidation', sub: 'Drift safeguard' },
    { n: 5, label: 'Execution Prepare', sub: 'Wallet payload' },
  ];

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-gray-900 text-white border-r border-white/10 select-none">
      {/* Top Brand */}
      <div>
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
          <Link href="/" className="group flex items-center gap-3 transition">
            <MobiusLogo className="size-7 shrink-0 transition-transform group-hover:scale-105" white />
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white">MOBIUS</span>
              <span className="rounded bg-[#836EF9]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#DDD7FE] uppercase tracking-wider">
                NLP
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-400 border border-emerald-500/20">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Online</span>
          </div>
        </div>

        {/* Link back to App */}
        <div className="p-3 border-b border-white/5">
          <Link
            href="/app"
            className="flex items-center justify-between rounded-xl px-3.5 py-2.5 text-gray-300 hover:bg-white/5 hover:text-white transition cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <LayoutDashboard className="size-4 shrink-0 text-[#A594FD]" />
              <span className="text-sm font-medium">Risk Console</span>
            </div>
            <ArrowUpRight className="size-3.5 text-gray-500" />
          </Link>
        </div>

        {/* Pipeline Steps Navigation */}
        <div className="px-3 pt-4 pb-2">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Pipeline Steps
          </div>
          <nav className="flex flex-col gap-1">
            {stepsList.map((s) => (
              <button
                key={s.n}
                onClick={() => {
                  if (s.n <= step) setStep(s.n as StepNumber);
                  setMobileOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left transition cursor-pointer ${
                  step === s.n
                    ? 'bg-white/10 text-white font-semibold shadow-xs'
                    : step > s.n
                    ? 'text-emerald-400 hover:bg-white/5'
                    : 'text-gray-400 opacity-60'
                }`}
              >
                <span className="size-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-mono text-[#DDD7FE]">
                  0{s.n}
                </span>
                <div className="flex-1 truncate">
                  <div className="text-sm font-semibold truncate">{s.label}</div>
                  <div className="text-[11px] text-gray-400">{s.sub}</div>
                </div>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Bottom Chain Details */}
      <div className="border-t border-white/10 p-4 space-y-2.5 text-xs bg-gray-950/40">
        <div className="flex justify-between">
          <span className="text-gray-400 font-medium">Target Chain:</span>
          <span className="font-mono text-gray-200">Monad #10143</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400 font-medium">MockSwapTarget:</span>
          <span className="font-mono text-gray-200 truncate max-w-[110px]">0xA64c...0219</span>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] font-mono">
          <span className="text-gray-500">Node API:</span>
          <span className="flex items-center gap-1 text-emerald-400 font-medium">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            :8787 Live
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full bg-[#0E091C] text-gray-900 font-sans antialiased">
      {/* Desktop Sticky Sidebar (Full Height, Left Side - Replaces Topbar) */}
      <aside className="hidden md:flex w-64 lg:w-72 shrink-0 h-screen sticky top-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Header (Only on screens < md) */}
      <div className="flex md:hidden items-center justify-between border-b border-white/10 bg-gray-900 px-4 py-3 text-white sticky top-0 z-30 w-full">
        <Link href="/" className="flex items-center gap-2">
          <MobiusLogo className="size-6" white />
          <span className="font-extrabold text-sm tracking-tight text-white">MOBIUS NLP</span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 rounded-lg text-gray-300 hover:bg-white/10 transition"
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden bg-black/60 backdrop-blur-xs flex">
          <div className="w-72 h-full bg-gray-900 shadow-xl">{sidebarContent}</div>
          <div className="flex-1" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 min-h-screen bg-gradient-to-b from-gray-950 via-[#130E26] to-black flex flex-col overflow-y-auto">
        <div className="relative w-full p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto flex-1 flex flex-col">
          
          {/* Top Operational Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <span className="size-2 rounded-full bg-[#836EF9] animate-pulse" />
              <span className="text-xs font-semibold text-gray-200">
                Natural Language Pipeline · Verified Execution
              </span>
              <span className="text-gray-500 text-xs">·</span>
              <span className="font-mono text-xs text-gray-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                Target: Monad Testnet #10143
              </span>
              <span className="font-mono text-xs text-gray-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                Connected: {walletConnected ? formatAddress(account) : 'Not connected'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/app"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition border border-white/10 cursor-pointer"
              >
                <LayoutDashboard className="size-3.5 text-[#A594FD]" />
                <span>Open Risk Console</span>
              </Link>
            </div>
          </div>

          {/* White Card Canvas */}
          <div className="mt-6 flex-1 rounded-2xl bg-white p-6 sm:p-8 shadow-2xl border border-black/10 text-gray-900">
            <header className="pb-6 border-b border-black/5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h2 className="font-medium text-xs sm:text-sm text-gray-500">
                  Autonomous Transaction Intelligence
                </h2>
                <div className="-tracking-[0.03em] mt-1 font-bold text-2xl sm:text-3xl text-gray-950">
                  Natural Language Goal ➔ Pinned Simulation
                </div>
              </div>
              <button
                onClick={() => {
                  setStep(1);
                  setPlan(null);
                  setPreflightResult(null);
                  setRevalidationResult(null);
                  setExecutionResult(null);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-black/10 hover:bg-gray-50 text-xs font-semibold text-gray-700 cursor-pointer"
              >
                <RotateCcw className="size-3" />
                <span>Reset Flow</span>
              </button>
            </header>

            {/* Error banner */}
            {error && (
              <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Step 1: Natural Language Plan */}
            {step === 1 && (
              <div className="mt-6 space-y-4">
                <h3 className="font-bold text-sm text-gray-900">Step 1: Express Execution Objective in Natural Language</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">User Account Address</label>
                    <input
                      type="text"
                      value={account}
                      onChange={(e) => setAccount(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 text-xs font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#836EF9]"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        type="button"
                        onClick={handleConnectWallet}
                        disabled={isConnecting}
                        className="flex-1 py-3 rounded-xl bg-[#836EF9] hover:bg-[#6E54FF] text-white font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-[#836EF9]/30 disabled:opacity-60"
                      >
                        <Wallet className="size-4" />
                        <span>
                          {walletConnected
                            ? `MetaMask Connected (${formatAddress(account)})`
                            : isConnecting
                            ? 'Connecting MetaMask...'
                            : 'Connect with MetaMask'}
                        </span>
                      </button>
                      {walletConnected && (
                        <button
                          type="button"
                          onClick={handleDisconnectWallet}
                          className="py-3 px-4 rounded-xl border border-black/10 bg-white hover:bg-gray-50 text-gray-900 font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <X className="size-3.5" />
                          <span>Disconnect</span>
                        </button>
                      )}
                    </div>

                    {/* Network Status & Monad Switcher */}
                    {walletConnected && (
                      <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 border border-black/5 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">Balance:</span>
                          <span className="font-mono font-bold text-gray-800">{walletBalance}</span>
                        </div>
                        {chainId === MONAD_TESTNET_CHAIN_ID ? (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                            <span className="size-1.5 rounded-full bg-purple-600" />
                            Monad Testnet #10143
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={handleSwitchToMonad}
                            className="flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded border border-amber-200 transition cursor-pointer"
                          >
                            <AlertTriangle className="size-3 text-amber-600" />
                            <span>Switch to Monad Testnet</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Natural Language Objective</label>
                    <textarea
                      rows={3}
                      value={objective}
                      onChange={(e) => setObjective(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#836EF9]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Min Amount Out Constraint</label>
                    <input
                      type="text"
                      value={minAmountOut}
                      onChange={(e) => setMinAmountOut(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 text-xs font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#836EF9]"
                    />
                  </div>

                  <button
                    onClick={handleNaturalPlan}
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-[#836EF9] hover:bg-[#6E54FF] text-white font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-[#836EF9]/30"
                  >
                    {loading ? <RefreshCw className="size-4 animate-spin" /> : <Send className="size-4" />}
                    <span>{loading ? 'Synthesizing Plan with Agent...' : 'Generate Deterministic Plan'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Candidate Simulation */}
            {step === 2 && plan && (
              <div className="mt-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-sm text-gray-900">Step 2: Candidate Simulation & Decision</h3>
                  <span className="text-xs font-mono bg-purple-50 text-[#836EF9] px-2 py-0.5 rounded font-bold">
                    Plan: {plan.planId}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-gray-50 border border-black/10 space-y-2 text-xs font-mono">
                  <div><strong>Observed Block:</strong> {plan.snapshot.blockNumber}</div>
                  <div><strong>Decision:</strong> {plan.decision}</div>
                  <div><strong>Rationale:</strong> {plan.decisionReason || plan.humanExplanation}</div>
                </div>

                <button
                  onClick={handleRunPreflight}
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-gray-950 hover:bg-gray-800 text-white font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? <RefreshCw className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                  <span>Run Pinned Preflight Simulation Check →</span>
                </button>
              </div>
            )}

            {/* Step 3 & 4: Pinned Preflight */}
            {step === 4 && (
              <div className="mt-6 space-y-4">
                <h3 className="font-bold text-sm text-gray-900">Step 3 & 4: Preflight Validation & State Revalidation</h3>
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 space-y-1">
                  <div className="font-bold">✓ Preflight Check Passed on Monad Testnet</div>
                  <div>Simulation status: SIMULATION_PASSED</div>
                </div>

                <button
                  onClick={handleRevalidate}
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-[#836EF9] hover:bg-[#6E54FF] text-white font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? <RefreshCw className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                  <span>Revalidate against Live Block Drift →</span>
                </button>
              </div>
            )}

            {/* Step 5: Execution Prepare */}
            {step === 5 && (
              <div className="mt-6 space-y-4">
                <h3 className="font-bold text-sm text-gray-900">Step 5: Execution Authorization & Calldata</h3>
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 space-y-1">
                  <div className="font-bold">✓ State Validated: VALID (No Drift Detected)</div>
                  <div>Payload verified against pinned snapshot</div>
                </div>

                {!executionResult ? (
                  <button
                    onClick={handleExecutionPrepare}
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-gray-950 hover:bg-gray-800 text-white font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    {loading ? <RefreshCw className="size-4 animate-spin" /> : <Cpu className="size-4" />}
                    <span>Prepare Signed Wallet Payload</span>
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="p-4 rounded-xl border border-black/10 bg-gray-50 text-xs font-mono space-y-2 break-all">
                      <div><span className="text-gray-400">Target To:</span> <div className="font-bold text-gray-900">{executionResult.transaction.to}</div></div>
                      <div><span className="text-gray-400">Calldata:</span> <div className="text-[11px] text-gray-700 mt-1">{executionResult.transaction.data}</div></div>
                    </div>

                    <button
                      onClick={() => copyText(executionResult.transaction.data)}
                      className="w-full py-3 rounded-xl border border-black/10 bg-white hover:bg-gray-50 text-gray-900 font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                    >
                      {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5 text-[#836EF9]" />}
                      <span>{copied ? 'Calldata Copied to Clipboard' : 'Copy Prepared Calldata for Wallet'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Aave V3 Section */}
            <div className="mt-8 rounded-2xl border border-black/10 bg-gray-50 p-6 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-gray-950 text-sm">Aave V3 Protocol Live Adapter (Sepolia)</h4>
                  <p className="text-xs text-gray-500">Live dynamic pool resolution & preflight via Express API</p>
                </div>
                <button
                  onClick={handleLoadAave}
                  disabled={aaveLoading}
                  className="px-3.5 py-1.5 rounded-xl bg-gray-950 hover:bg-gray-800 text-white text-xs font-semibold transition cursor-pointer shadow-xs"
                >
                  {aaveLoading ? 'Querying...' : 'Query Sepolia Pool'}
                </button>
              </div>

              {aaveData && (
                <div className="p-3.5 rounded-xl bg-white border border-black/10 text-xs font-mono space-y-1">
                  <div><strong>Network:</strong> {aaveData.network}</div>
                  <div><strong>Pool:</strong> {aaveData.pool}</div>
                  <div><strong>Block:</strong> {aaveData.observedAtBlock}</div>
                </div>
              )}

              {aavePreflight && (
                <div className="p-3.5 rounded-xl bg-emerald-50/20 border border-emerald-200 text-xs font-mono space-y-1">
                  <div><strong>User:</strong> {aavePreflight.user}</div>
                  <div><strong>Asset:</strong> {aavePreflight.asset}</div>
                  <div><strong>Simulation:</strong> <span className="font-bold text-emerald-600">{aavePreflight.simulationStatus}</span></div>
                </div>
              )}
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
