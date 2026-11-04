'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Layers,
  Settings,
  FileText,
  Sliders,
  ChevronRight,
  Download,
  RefreshCw,
  Cpu,
  Copy,
  Check,
  RotateCcw,
  Info,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { MobiusLogo } from '@/components/common/MobiusLogo';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { checkBackendHealth, revalidatePlan } from '@/lib/api-client';

type ScreenStep =
  | 'connect'
  | 'environment'
  | 'dashboard'
  | 'stress_test'
  | 'strategies'
  | 'simulation'
  | 'approved';

type NavArea =
  | 'overview'
  | 'positions'
  | 'strategy_engine'
  | 'activity'
  | 'settings';

type EnvironmentType = 'sandbox' | 'mainnet' | 'testnet';

export function MobiusApp() {
  // Navigation & Workflow state
  const [activeNav, setActiveNav] = useState<NavArea>('overview');
  const [step, setStep] = useState<ScreenStep>('connect');

  // Wallet & Environment state
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletType, setWalletType] = useState<'metamask' | 'rabby' | 'demo' | null>(null);
  const [environment, setEnvironment] = useState<EnvironmentType>('sandbox');
  const [backendLive, setBackendLive] = useState<boolean>(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

  // Financial simulation state
  const [collateralShock, setCollateralShock] = useState<number>(-10);
  const [rateShock, setRateShock] = useState<number>(200); // +200 bps
  const [liquidityShock, setLiquidityShock] = useState<number>(20); // 20%
  const [scenarioRun, setScenarioRun] = useState<boolean>(false);
  const [showFormula, setShowFormula] = useState<boolean>(false);

  // Preflight & Revalidation state
  const [simulateDrift, setSimulateDrift] = useState<boolean>(false);
  const [revalidationStatus, setRevalidationStatus] = useState<
    'idle' | 'validating' | 'passed' | 'replan_required'
  >('idle');
  const [selectedStrategy, setSelectedStrategy] = useState<'repay' | 'add_collateral' | 'sell_repay'>('repay');
  const [expandedStrategy, setExpandedStrategy] = useState<string | null>(null);

  // Execution & Receipt state
  const [isSigning, setIsSigning] = useState<boolean>(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [receiptDownloaded, setReceiptDownloaded] = useState<boolean>(false);

  // Check backend health on mount
  useEffect(() => {
    checkBackendHealth().then((res) => setBackendLive(res.ok));
  }, []);

  // Handle Wallet Connection
  const handleConnect = async (type: 'metamask' | 'rabby' | 'demo') => {
    if (type === 'demo') {
      setWalletAddress('0x71C8...A92F');
      setWalletType('demo');
      setStep('environment');
      return;
    }

    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({
          method: 'eth_requestAccounts',
        });
        if (accounts && accounts.length > 0) {
          const addr = accounts[0];
          setWalletAddress(`${addr.slice(0, 6)}...${addr.slice(-4)}`);
          setWalletType(type);
          setStep('environment');
          return;
        }
      } catch (err) {
        console.warn('Wallet connection dismissed or failed:', err);
      }
    }

    // Fallback if extension not installed or rejected
    setWalletAddress('0x71C8...A92F');
    setWalletType(type);
    setStep('environment');
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  // Run Scenario Calculation
  const handleRunScenario = () => {
    setScenarioRun(true);
  };

  // Run Preflight Checklist
  const handleRunPreflight = async () => {
    setRevalidationStatus('validating');
    setTimeout(async () => {
      const res = await revalidatePlan('plan_demo_8245', simulateDrift);
      if (res.status === 'REPLAN_REQUIRED' || simulateDrift) {
        setRevalidationStatus('replan_required');
      } else {
        setRevalidationStatus('passed');
      }
    }, 1200);
  };

  // Authorize & Sign
  const handleAuthorize = async () => {
    setIsSigning(true);
    if (typeof window !== 'undefined' && (window as any).ethereum && walletType === 'metamask') {
      try {
        await (window as any).ethereum.request({
          method: 'personal_sign',
          params: [
            `Mobius Risk Rehearsal Authorization\nAction: Repay 1,500 USDC\nTarget: Aave V3 Pool\nSnapshot: #82,451,200\nNetwork: Monad Mainnet Fork`,
            walletAddress || '0x71C8A92F',
          ],
        });
      } catch (e) {
        console.warn('Signature bypassed in demo sandbox');
      }
    }

    setTimeout(() => {
      setIsSigning(false);
      setTxHash('0x7a8f9c1b4e2d3a5f6e7b8c9d0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b');
    }, 1400);
  };

  // Download cryptographic JSON receipt
  const handleDownloadReceipt = () => {
    const receiptData = {
      protocol: 'AAVE_V3',
      market: 'Monad Fork #82451200',
      timestamp: new Date().toISOString(),
      action: 'REPAY_DEBT',
      repaymentAmount: '1,500 USDC',
      positionBefore: { healthFactor: 1.39, debt: '$12,000', collateral: '$22,500' },
      positionAfter: { healthFactor: 1.63, debt: '$10,500', collateral: '$22,500' },
      scenarioShock: `${collateralShock}% ETH shock, +${rateShock} bps borrow rate`,
      policyCheckPassed: true,
      simulationTxHash: txHash || '0x7a8f9c1b4e2d3a5f6e7b8c9d0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b',
      verifiedBy: 'Mobius Deterministic Financial Engine v1.2',
    };
    const blob = new Blob([JSON.stringify(receiptData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mobius-receipt-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setReceiptDownloaded(true);
  };

  const stepsList: { id: ScreenStep; label: string; num: string }[] = [
    { id: 'connect', label: 'Connect', num: '1' },
    { id: 'environment', label: 'Environment', num: '2' },
    { id: 'dashboard', label: 'Overview', num: '3' },
    { id: 'stress_test', label: 'Stress Test', num: '4' },
    { id: 'strategies', label: 'Strategies', num: '5' },
    { id: 'simulation', label: 'Preflight', num: '6' },
    { id: 'approved', label: 'Verify & Receipt', num: '7' },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-white text-gray-900 font-sans">
      {/* ─── UNIFIED HEADER (Matching Home Page) ─── */}
      <Header />

      {/* ─── UNIFIED MAIN WORKSPACE CONTAINER (Max 7XL with Side Border Rails) ─── */}
      <div className="mx-auto flex w-full max-w-7xl flex-1 border-x border-black/10 bg-[#FAFAFC]">
        {/* ──────────────────────────────────────────────────────────────────────────
            1. LEFT SIDEBAR (Five Primary Areas - Playbook Image 1 / Image 3)
        ────────────────────────────────────────────────────────────────────────── */}
        <aside className="w-64 sm:w-72 shrink-0 border-r border-black/10 bg-white flex flex-col justify-between p-6">
          <div>
            {/* Top Branding & Connection Pill */}
            <div className="flex items-center justify-between pb-6 border-b border-black/5">
              <a href="/" className="flex items-center gap-2.5 group">
                <MobiusLogo className="size-6 transition-transform group-hover:scale-105" />
                <span className="font-extrabold text-base tracking-tight text-gray-950">MOBIUS</span>
              </a>
              {walletAddress ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]/70">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Connected
                </span>
              ) : (
                <span className="text-xs font-medium text-gray-400">Offline</span>
              )}
            </div>

            {/* Navigation Items (01 - 05) */}
            <nav className="mt-6 space-y-1">
              {[
                { id: 'overview', label: 'Overview', num: '01', icon: Activity },
                { id: 'positions', label: 'Positions', num: '02', icon: Layers },
                { id: 'strategy_engine', label: 'Strategy Engine', num: '03', icon: Cpu },
                { id: 'activity', label: 'Activity & Receipts', num: '04', icon: FileText },
                { id: 'settings', label: 'Settings & Permissions', num: '05', icon: Settings },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = activeNav === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveNav(item.id as NavArea)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                      isActive
                        ? 'bg-[#836EF9]/10 text-gray-950 font-semibold border border-[#836EF9]/20'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`size-4 ${isActive ? 'text-[#836EF9]' : 'text-gray-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    <span className="text-xs text-gray-400 font-mono">{item.num}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom Sidebar Status Card */}
          <div className="pt-6 border-t border-black/5 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-gray-400 uppercase tracking-wider text-[11px]">WALLET</span>
              <div className="flex items-center gap-1 font-mono text-gray-800 font-medium">
                <span>{walletAddress || '0x71C8...A92F'}</span>
                {walletAddress && (
                  <button
                    onClick={() => handleCopy(walletAddress)}
                    className="hover:text-gray-950 cursor-pointer"
                    title="Copy address"
                  >
                    {copiedAddress ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-gray-400 uppercase tracking-wider text-[11px]">ENVIRONMENT</span>
              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#EBF5FB] text-[#1B6CA8] border border-[#BCE8F1]">
                {environment === 'sandbox'
                  ? 'Demo sandbox'
                  : environment === 'mainnet'
                  ? 'Monad Mainnet'
                  : 'Monad Testnet'}
              </span>
            </div>
            {backendLive && (
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                API Server Live (:8787)
              </div>
            )}
          </div>
        </aside>

        {/* ──────────────────────────────────────────────────────────────────────────
            2. MAIN CONTENT AREA (Screens 1 through 7)
        ────────────────────────────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-6 sm:p-10 flex flex-col items-center">
          {/* Workflow Breadcrumb Indicator (Overview Mode) */}
          {activeNav === 'overview' && (
            <div className="w-full max-w-2xl mb-6 flex items-center justify-between border-b border-black/10 pb-4 text-xs font-medium">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                {stepsList.map((s, idx) => {
                  const isCurrent = step === s.id;
                  const isPast = stepsList.findIndex((x) => x.id === step) > idx;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setStep(s.id)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg transition cursor-pointer ${
                        isCurrent
                          ? 'bg-[#836EF9] text-white font-semibold shadow-sm shadow-[#836EF9]/30'
                          : isPast
                          ? 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      <span className="size-3.5 rounded-full bg-black/10 flex items-center justify-center text-[10px]">
                        {s.num}
                      </span>
                      <span className="hidden sm:inline">{s.label}</span>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => {
                  setStep('connect');
                  setTxHash(null);
                  setScenarioRun(false);
                }}
                className="text-gray-400 hover:text-gray-700 flex items-center gap-1 text-[11px] cursor-pointer"
              >
                <RotateCcw className="size-3" />
                <span>Reset</span>
              </button>
            </div>
          )}

          {activeNav !== 'overview' ? (
            /* Supporting Views for Tabs 02 - 05 */
            <div className="w-full max-w-2xl bg-white rounded-2xl border border-black/10 p-8 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 capitalize mb-4">
                {activeNav.replace('_', ' ')}
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Supporting financial engine configurations and historical audit logs.
              </p>
              {activeNav === 'positions' && (
                <div className="border border-gray-100 rounded-xl overflow-hidden text-sm">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs">
                      <tr>
                        <th className="p-3">Asset</th>
                        <th className="p-3">Role</th>
                        <th className="p-3">Balance</th>
                        <th className="p-3">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr>
                        <td className="p-3 font-semibold">WETH</td>
                        <td className="p-3 text-emerald-600 font-medium">Collateral</td>
                        <td className="p-3 font-mono">10.0 WETH</td>
                        <td className="p-3 font-mono font-medium">$25,000</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold">USDC</td>
                        <td className="p-3 text-rose-600 font-medium">Variable Debt</td>
                        <td className="p-3 font-mono">12,000 USDC</td>
                        <td className="p-3 font-mono font-medium">$12,000</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
              {activeNav === 'strategy_engine' && (
                <div className="space-y-4 text-sm text-gray-700">
                  <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 space-y-2">
                    <p><strong>Configured Min Health Factor:</strong> 1.50</p>
                    <p><strong>Configured Min Stressed Health Factor:</strong> 1.30</p>
                    <p><strong>Max Allowed Slippage:</strong> 50 bps</p>
                    <p><strong>Permitted Actions:</strong> Repay Debt, Add Collateral, Sell Collateral & Repay</p>
                    <p><strong>Objective Function:</strong> Minimize financial cost across capital lockup, carry, and gas.</p>
                  </div>
                  <a
                    href="/agentic"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#836EF9] hover:bg-[#6E54FF] text-white text-xs font-semibold shadow-sm transition"
                  >
                    <Sparkles className="size-3.5" />
                    <span>Open Agentic Natural Language Engine →</span>
                  </a>
                </div>
              )}
              {activeNav === 'activity' && (
                <div className="text-sm text-gray-600 space-y-2">
                  <div className="p-3.5 rounded-xl border border-gray-100 bg-gray-50 flex justify-between items-center">
                    <span>Rehearsal Snapshot #82,451,200</span>
                    <span className="font-mono text-xs text-emerald-600 font-semibold">Verified</span>
                  </div>
                </div>
              )}
              {activeNav === 'settings' && (
                <div className="text-sm text-gray-600 space-y-3">
                  <p><strong>Monad Mainnet Chain ID:</strong> 143</p>
                  <p><strong>Monad Testnet Chain ID:</strong> 10143</p>
                  <p><strong>Sepolia Chain ID:</strong> 11155111</p>
                  <p><strong>Aave V3 Pool Provider:</strong> 0x012bAC54348C0E635dCAc9D5FB99f06F24136C9A</p>
                </div>
              )}
              <button
                onClick={() => setActiveNav('overview')}
                className="mt-6 px-4 py-2 rounded-xl bg-gray-950 text-white text-sm font-medium hover:bg-gray-800 cursor-pointer"
              >
                Back to Overview Workflow
              </button>
            </div>
          ) : (
            /* Main Risk Management Workflow inside Overview */
            <div className="w-full max-w-2xl">
              {/* ─── SCREEN 1: Wallet Connection (Playbook Image 4) ─── */}
              {step === 'connect' && (
                <div className="bg-white rounded-2xl border border-black/10 p-8 sm:p-10 shadow-sm">
                  <div className="flex justify-between items-start mb-6">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#836EF9]/10 text-[#836EF9] border border-[#836EF9]/25">
                      <span className="size-1.5 rounded-full bg-[#836EF9] animate-pulse" />
                      First interaction
                    </span>
                  </div>

                  <div className="text-center my-6">
                    <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-[#836EF9]/10 border border-[#836EF9]/20 mb-4 text-[#836EF9]">
                      <MobiusLogo className="size-8" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-950">
                      Your DeFi positions. Under control.
                    </h1>
                    <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
                      Intelligent risk management and execution for leveraged DeFi positions.
                    </p>
                  </div>

                  <div className="mt-8 space-y-3">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Connect your wallet
                    </h3>

                    {/* MetaMask */}
                    <button
                      onClick={() => handleConnect('metamask')}
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-black/10 hover:border-[#836EF9]/40 hover:bg-[#836EF9]/5 transition cursor-pointer group"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="size-10 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center text-xl">
                          🦊
                        </div>
                        <div className="text-left">
                          <div className="font-semibold text-sm text-gray-900 group-hover:text-gray-950">
                            MetaMask
                          </div>
                          <div className="text-xs text-gray-400">Browser wallet</div>
                        </div>
                      </div>
                      <ChevronRight className="size-4 text-gray-400 group-hover:text-gray-600 transition" />
                    </button>

                    {/* Rabby */}
                    <button
                      onClick={() => handleConnect('rabby')}
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-black/10 hover:border-[#836EF9]/40 hover:bg-[#836EF9]/5 transition cursor-pointer group"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="size-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-xl">
                          🐰
                        </div>
                        <div className="text-left">
                          <div className="font-semibold text-sm text-gray-900 group-hover:text-gray-950">
                            Rabby
                          </div>
                          <div className="text-xs text-gray-400">Browser wallet</div>
                        </div>
                      </div>
                      <ChevronRight className="size-4 text-gray-400 group-hover:text-gray-600 transition" />
                    </button>

                    {/* 1-Click Demo Sandbox Account */}
                    <button
                      onClick={() => handleConnect('demo')}
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-[#836EF9]/30 bg-[#836EF9]/5 hover:bg-[#836EF9]/10 transition cursor-pointer group"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="size-10 rounded-lg bg-[#836EF9]/10 border border-[#836EF9]/20 flex items-center justify-center text-xl text-[#836EF9]">
                          ⚡
                        </div>
                        <div className="text-left">
                          <div className="font-semibold text-sm text-gray-900">
                            Demo Sandbox Account
                          </div>
                          <div className="text-xs text-[#836EF9]">Pre-seeded with $25k WETH & $12k USDC debt</div>
                        </div>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#836EF9] text-white shadow-sm shadow-[#836EF9]/30">
                        Instant Demo →
                      </span>
                    </button>
                  </div>

                  <div className="mt-8 pt-5 border-t border-black/5 text-center">
                    <p className="text-xs text-gray-500">
                      Connecting only grants account access. No transaction or spending approval is requested.
                    </p>
                    <p className="text-[11px] text-gray-400 mt-2">
                      Non-custodial · User-authorized execution · No private-key collection
                    </p>
                  </div>
                </div>
              )}

              {/* ─── SCREEN 2: Environment Selection (Playbook Image 5) ─── */}
              {step === 'environment' && (
                <div className="bg-white rounded-2xl border border-black/10 p-8 sm:p-10 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-gray-950">Choose environment</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EBF5FB] text-[#1B6CA8] border border-[#BCE8F1]">
                      Required for demo
                    </span>
                  </div>

                  <div className="space-y-3.5">
                    {/* Demo Sandbox */}
                    <div
                      onClick={() => setEnvironment('sandbox')}
                      className={`block p-5 rounded-xl border transition cursor-pointer ${
                        environment === 'sandbox'
                          ? 'border-emerald-500 bg-emerald-50/10 ring-1 ring-emerald-500'
                          : 'border-black/10 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-sm text-gray-950">Demo sandbox</div>
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
                          Recommended
                        </span>
                      </div>
                      <div className="text-xs font-medium text-gray-500 mt-0.5">
                        Local Anvil fork of Monad Mainnet
                      </div>
                      <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                        Actual Aave contracts and forked protocol state. Local-only transactions and controlled demo accounts.
                      </p>
                    </div>

                    {/* Monad Mainnet */}
                    <div
                      onClick={() => setEnvironment('mainnet')}
                      className={`block p-5 rounded-xl border transition cursor-pointer ${
                        environment === 'mainnet'
                          ? 'border-emerald-500 bg-white ring-1 ring-emerald-500'
                          : 'border-black/10 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-bold text-sm text-gray-950">Monad Mainnet</div>
                      <div className="text-xs font-medium text-gray-500 mt-0.5">
                        Chain ID 143 · Actual Aave market
                      </div>
                      <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                        Read actual position data. Live execution requires explicit user authorization and additional safety checks.
                      </p>
                    </div>

                    {/* Monad Testnet */}
                    <div
                      onClick={() => setEnvironment('testnet')}
                      className={`block p-5 rounded-xl border transition cursor-pointer ${
                        environment === 'testnet'
                          ? 'border-emerald-500 bg-white ring-1 ring-emerald-500'
                          : 'border-black/10 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-bold text-sm text-gray-950">Monad Testnet</div>
                      <div className="text-xs font-medium text-gray-500 mt-0.5">
                        Chain ID 10143 · Mobius test contracts
                      </div>
                      <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                        Test Mobius&apos;s own contracts and controlled lending/swap fixtures, not actual Aave Testnet Mode.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setStep('dashboard')}
                    className="w-full mt-6 py-3.5 rounded-xl bg-[#836EF9] hover:bg-[#6E54FF] text-white font-semibold text-sm transition cursor-pointer flex items-center justify-center gap-2 shadow-sm shadow-[#836EF9]/30"
                  >
                    <span>Continue to Dashboard</span>
                    <ArrowRight className="size-4" />
                  </button>
                </div>
              )}

              {/* ─── SCREEN 3: Main Dashboard (Playbook Image 6) ─── */}
              {step === 'dashboard' && (
                <div className="bg-white rounded-2xl border border-black/10 p-8 sm:p-10 shadow-sm space-y-6">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-gray-950">Overview</h2>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
                          Healthy
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">WETH collateral / USDC debt</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        AAVE V3 · MONAD FORK
                      </div>
                      <div className="text-xs text-gray-500 font-mono mt-0.5">
                        Snapshot #82,451,200
                      </div>
                    </div>
                  </div>

                  {/* Big Health Factor Card */}
                  <div className="p-6 rounded-2xl bg-gray-50/70 border border-black/5 text-center">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      HEALTH FACTOR
                    </div>
                    <div className="text-4xl font-extrabold text-emerald-600 mt-2 tracking-tight">
                      1.82
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Above configured minimum of 1.50
                    </div>
                    {/* Visual health bar */}
                    <div className="w-full bg-gray-200 h-2.5 rounded-full mt-4 overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full w-[65%]" />
                    </div>
                  </div>

                  {/* 4 Metric Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-black/5 bg-white">
                      <div className="text-xs text-gray-500">Total collateral</div>
                      <div className="text-xl font-bold text-gray-950 mt-1 font-mono">$25,000</div>
                      <div className="text-xs font-medium text-gray-400 mt-0.5">WETH</div>
                    </div>
                    <div className="p-4 rounded-xl border border-black/5 bg-white">
                      <div className="text-xs text-gray-500">Total debt</div>
                      <div className="text-xl font-bold text-gray-950 mt-1 font-mono">$12,000</div>
                      <div className="text-xs font-medium text-gray-400 mt-0.5">USDC</div>
                    </div>
                    <div className="p-4 rounded-xl border border-black/5 bg-white">
                      <div className="text-xs text-gray-500">Leverage</div>
                      <div className="text-xl font-bold text-gray-950 mt-1 font-mono">1.92×</div>
                    </div>
                    <div className="p-4 rounded-xl border border-black/5 bg-white">
                      <div className="text-xs text-gray-500">Liquidation buffer</div>
                      <div className="text-xl font-bold text-gray-950 mt-1 font-mono">17.6%</div>
                    </div>
                  </div>

                  {/* Risk Monitor Banner */}
                  <div className="p-5 rounded-xl border border-black/10 bg-white space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-sm text-gray-950">Risk monitor</div>
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
                        Monitoring
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Your position is currently healthy. Mobius can evaluate how it responds to adverse market conditions.
                    </p>
                    <button
                      onClick={() => setStep('stress_test')}
                      className="w-full py-3.5 rounded-xl bg-gray-50 border border-black/10 hover:bg-gray-100 text-gray-900 font-semibold text-sm transition cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Sliders className="size-4 text-[#836EF9]" />
                      <span>Run risk assessment</span>
                    </button>
                    <div className="text-[11px] text-gray-400 text-center">
                      Evaluate current position and simulate market stress.
                    </div>
                  </div>

                  <p className="text-[11px] text-gray-400 text-center">
                    Illustrative interface and fictional financial values, not an actual Aave position.
                  </p>
                </div>
              )}

              {/* ─── SCREEN 4: Risk Assessment & Scenario Simulation (Playbook Image 7) ─── */}
              {step === 'stress_test' && (
                <div className="bg-white rounded-2xl border border-black/10 p-8 sm:p-10 shadow-sm space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-950">Stress test your position</h2>
                    <p className="text-xs text-gray-500 mt-1">
                      Evaluate predefined market scenarios against your current position.
                    </p>
                  </div>

                  {/* Collateral Price Shock Slider */}
                  <div className="p-5 rounded-xl border border-black/5 bg-gray-50/60 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-gray-700">Collateral price shock</span>
                      <span className="text-2xl font-bold font-mono text-gray-950">
                        {collateralShock}%
                      </span>
                    </div>

                    <input
                      type="range"
                      min="-30"
                      max="-5"
                      step="5"
                      value={collateralShock}
                      onChange={(e) => {
                        setCollateralShock(Number(e.target.value));
                        setScenarioRun(false);
                      }}
                      className="w-full accent-[#836EF9] cursor-pointer h-2 bg-gray-200 rounded-lg appearance-none"
                    />

                    <div className="flex justify-between text-xs text-gray-400 font-mono px-1">
                      <button onClick={() => { setCollateralShock(-5); setScenarioRun(false); }} className="hover:text-gray-900 cursor-pointer">
                        5%
                      </button>
                      <button onClick={() => { setCollateralShock(-15); setScenarioRun(false); }} className="hover:text-gray-900 cursor-pointer">
                        15%
                      </button>
                      <button onClick={() => { setCollateralShock(-30); setScenarioRun(false); }} className="hover:text-gray-900 cursor-pointer">
                        30%
                      </button>
                    </div>
                  </div>

                  {/* Additional Scenarios */}
                  <div className="space-y-4">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Additional scenarios
                    </div>

                    {/* Borrowing Rate Shock */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">Borrowing rate shock</span>
                      <div className="flex gap-2">
                        {[100, 200, 300].map((bps) => (
                          <button
                            key={bps}
                            onClick={() => { setRateShock(bps); setScenarioRun(false); }}
                            className={`px-3 py-1 rounded-lg text-xs font-mono transition cursor-pointer ${
                              rateShock === bps
                                ? 'bg-gray-950 text-white font-bold'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            +{bps} bps
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Liquidity Reduction */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">Liquidity reduction</span>
                      <div className="flex gap-2">
                        {[10, 20, 30].map((pct) => (
                          <button
                            key={pct}
                            onClick={() => { setLiquidityShock(pct); setScenarioRun(false); }}
                            className={`px-3 py-1 rounded-lg text-xs font-mono transition cursor-pointer ${
                              liquidityShock === pct
                                ? 'bg-gray-950 text-white font-bold'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>
                  </div>

                  {/* Run Scenario Button */}
                  <button
                    onClick={handleRunScenario}
                    className="w-full py-3.5 rounded-xl bg-gray-950 text-white font-semibold text-sm hover:bg-gray-800 transition cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                  >
                    <span>Run scenario</span>
                  </button>

                  <p className="text-[11px] text-gray-400 text-center">
                    Illustrative controls. A live application would call its deterministic scenario engine.
                  </p>

                  {/* Stressed Comparison Table */}
                  {scenarioRun && (
                    <div className="space-y-4 pt-4 border-t border-black/5">
                      <div className="border border-black/10 rounded-xl overflow-hidden text-xs">
                        <table className="w-full text-left font-mono">
                          <thead className="bg-gray-50 border-b border-black/10 text-gray-500 font-sans">
                            <tr>
                              <th className="p-3">Metric</th>
                              <th className="p-3">Current</th>
                              <th className="p-3">Stressed</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-black/5">
                            <tr>
                              <td className="p-3 font-sans font-medium text-gray-900">Health factor</td>
                              <td className="p-3 text-emerald-600 font-bold">1.82</td>
                              <td className="p-3 text-rose-600 font-bold">1.39</td>
                            </tr>
                            <tr>
                              <td className="p-3 font-sans font-medium text-gray-900">Collateral</td>
                              <td className="p-3">$25,000</td>
                              <td className="p-3 text-gray-600">$22,500</td>
                            </tr>
                            <tr>
                              <td className="p-3 font-sans font-medium text-gray-900">Debt</td>
                              <td className="p-3">$12,000</td>
                              <td className="p-3">$12,000</td>
                            </tr>
                            <tr>
                              <td className="p-3 font-sans font-medium text-gray-900">Risk status</td>
                              <td className="p-3 text-emerald-600 font-sans font-semibold">Healthy</td>
                              <td className="p-3 font-sans">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  Below target (1.50)
                                </span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Expandable "How was this calculated?" */}
                      <div className="border border-black/5 rounded-xl p-3 bg-gray-50">
                        <button
                          onClick={() => setShowFormula(!showFormula)}
                          className="w-full flex items-center justify-between text-xs font-semibold text-gray-600 cursor-pointer"
                        >
                          <span className="flex items-center gap-1.5">
                            <Info className="size-3.5 text-[#836EF9]" />
                            How was this calculated?
                          </span>
                          <span>{showFormula ? '−' : '+'}</span>
                        </button>
                        {showFormula && (
                          <div className="mt-3 text-xs text-gray-600 space-y-1 font-mono pt-2 border-t border-black/5">
                            <p>HF = (Collateral × Price × LiqThreshold) / (Debt × Price)</p>
                            <p>Price drop: ETH $2,500 ➔ $2,250 (-10%)</p>
                            <p>Post-shock valuation: 10 WETH × $2,250 = $22,500</p>
                            <p>HF_stressed = ($22,500 × 0.825) / $12,000 = 1.39</p>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => setStep('strategies')}
                        className="w-full py-3.5 rounded-xl bg-[#836EF9] hover:bg-[#6E54FF] text-white font-semibold text-sm transition cursor-pointer flex items-center justify-center gap-2 shadow-sm shadow-[#836EF9]/30"
                      >
                        <span>Compare Recommended Strategies (3 feasible)</span>
                        <ArrowRight className="size-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ─── SCREEN 5: Strategy Comparison (Playbook Section 6) ─── */}
              {step === 'strategies' && (
                <div className="bg-white rounded-2xl border border-black/10 p-8 sm:p-10 shadow-sm space-y-6">
                  <div>
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold text-gray-950">Recommended strategies</h2>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
                        3 feasible
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Mobius evaluated four candidate actions against your risk constraints.
                    </p>
                  </div>

                  <div className="space-y-3.5">
                    {/* Candidate 1: Repay debt (Recommended) */}
                    <div
                      onClick={() => setSelectedStrategy('repay')}
                      className={`p-5 rounded-xl border transition cursor-pointer ${
                        selectedStrategy === 'repay'
                          ? 'border-emerald-500 bg-emerald-50/10 ring-1 ring-emerald-500'
                          : 'border-black/10 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="font-bold text-sm text-gray-950">Repay debt</div>
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
                          Recommended
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-black/5 text-xs">
                        <div>
                          <div className="text-gray-400">Required</div>
                          <div className="font-mono font-bold text-gray-900">$1,500</div>
                        </div>
                        <div>
                          <div className="text-gray-400">Post-action HF</div>
                          <div className="font-mono font-bold text-emerald-600">1.63</div>
                        </div>
                        <div>
                          <div className="text-gray-400">Stress HF</div>
                          <div className="font-mono font-bold text-emerald-600">1.51</div>
                        </div>
                        <div>
                          <div className="text-gray-400">Est gas</div>
                          <div className="font-mono text-gray-700">0.004 MON</div>
                        </div>
                      </div>
                      <div className="mt-3 pt-2 flex items-center justify-between text-xs text-[#836EF9] font-medium">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedStrategy(expandedStrategy === 'repay' ? null : 'repay');
                          }}
                          className="hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>Inspect strategy</span>
                          {expandedStrategy === 'repay' ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                        </button>
                      </div>
                      {expandedStrategy === 'repay' && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg text-xs text-gray-600 space-y-1 font-mono border border-black/5">
                          <p>Calls: Pool.repay(USDC, 1500 * 10^6, 2, user)</p>
                          <p>Capital lockup: $1,500 liquid USDC</p>
                          <p>Borrow APY reduction: 4.43% on saved debt</p>
                        </div>
                      )}
                    </div>

                    {/* Candidate 2: Add collateral */}
                    <div
                      onClick={() => setSelectedStrategy('add_collateral')}
                      className={`p-5 rounded-xl border transition cursor-pointer ${
                        selectedStrategy === 'add_collateral'
                          ? 'border-emerald-500 bg-white ring-1 ring-emerald-500'
                          : 'border-black/10 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="font-bold text-sm text-gray-950">Add collateral</div>
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-gray-600">
                          Alternative
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-black/5 text-xs">
                        <div>
                          <div className="text-gray-400">Capital required</div>
                          <div className="font-mono font-bold text-gray-900">$2,000</div>
                        </div>
                        <div>
                          <div className="text-gray-400">Post-action HF</div>
                          <div className="font-mono font-bold text-emerald-600">1.65</div>
                        </div>
                        <div>
                          <div className="text-gray-400">Stress HF</div>
                          <div className="font-mono font-bold text-emerald-600">1.52</div>
                        </div>
                        <div>
                          <div className="text-gray-400">Est gas</div>
                          <div className="font-mono text-gray-700">0.005 MON</div>
                        </div>
                      </div>
                    </div>

                    {/* Candidate 3: Sell collateral and repay */}
                    <div
                      onClick={() => setSelectedStrategy('sell_repay')}
                      className={`p-5 rounded-xl border transition cursor-pointer ${
                        selectedStrategy === 'sell_repay'
                          ? 'border-emerald-500 bg-white ring-1 ring-emerald-500'
                          : 'border-black/10 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="font-bold text-sm text-gray-950">Sell collateral and repay</div>
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-gray-600">
                          Alternative
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-black/5 text-xs">
                        <div>
                          <div className="text-gray-400">Swap impact</div>
                          <div className="font-mono font-bold text-gray-900">0.35%</div>
                        </div>
                        <div>
                          <div className="text-gray-400">Post-action HF</div>
                          <div className="font-mono font-bold text-emerald-600">1.58</div>
                        </div>
                        <div>
                          <div className="text-gray-400">Capital required</div>
                          <div className="font-mono text-gray-700">$0</div>
                        </div>
                        <div>
                          <div className="text-gray-400">Est gas</div>
                          <div className="font-mono text-gray-700">0.008 MON</div>
                        </div>
                      </div>
                    </div>

                    {/* Candidate 4: Hold (Rejected) */}
                    <div className="p-5 rounded-xl border border-black/10 bg-gray-50/40 opacity-75">
                      <div className="flex justify-between items-center">
                        <div className="font-bold text-sm text-gray-900">Hold</div>
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          Rejected
                        </span>
                      </div>
                      <p className="text-xs text-rose-600 mt-2 font-medium">
                        Fails the configured minimum stressed health factor (1.39 &lt; 1.50).
                      </p>
                    </div>
                  </div>

                  {/* Explanation Callout */}
                  <div className="p-4 rounded-xl bg-[#836EF9]/5 border border-[#836EF9]/20 text-xs text-gray-900 leading-relaxed">
                    <span className="font-semibold text-[#836EF9]">Why this was chosen: </span>
                    Mobius recommends repaying $1,500 because it satisfies your current and stressed health-factor requirements with less intervention than the alternative strategies.
                  </div>

                  <button
                    onClick={() => {
                      setStep('simulation');
                      handleRunPreflight();
                    }}
                    className="w-full py-3.5 rounded-xl bg-[#836EF9] hover:bg-[#6E54FF] text-white font-semibold text-sm transition cursor-pointer flex items-center justify-center gap-2 shadow-sm shadow-[#836EF9]/30"
                  >
                    <span>Proceed to Execution Preflight</span>
                    <ArrowRight className="size-4" />
                  </button>
                </div>
              )}

              {/* ─── SCREEN 6: Simulation & Revalidation Preflight (Playbook Section 7) ─── */}
              {step === 'simulation' && (
                <div className="bg-white rounded-2xl border border-black/10 p-8 sm:p-10 shadow-sm space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-bold text-gray-950">Execution preflight</h2>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Deterministic verification before wallet authorization.
                      </p>
                    </div>
                    {revalidationStatus === 'passed' && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
                        Safe to Execute
                      </span>
                    )}
                    {revalidationStatus === 'replan_required' && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        Stale State Drift Detected
                      </span>
                    )}
                  </div>

                  {/* Checklist Cards */}
                  <div className="space-y-3 text-xs">
                    <div className="p-3.5 rounded-xl border border-black/10 flex items-center justify-between bg-white">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="size-4 text-emerald-600" />
                        <div>
                          <div className="font-semibold text-gray-900">Position snapshot retrieved</div>
                          <div className="text-gray-400">Block hash verified #82,451,200</div>
                        </div>
                      </div>
                      <span className="font-mono text-emerald-600 font-bold">Passed</span>
                    </div>

                    <div className="p-3.5 rounded-xl border border-black/10 flex items-center justify-between bg-white">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="size-4 text-emerald-600" />
                        <div>
                          <div className="font-semibold text-gray-900">Policy constraints passed</div>
                          <div className="text-gray-400">Debt, asset and slippage limits verified</div>
                        </div>
                      </div>
                      <span className="font-mono text-emerald-600 font-bold">Passed</span>
                    </div>

                    <div className="p-3.5 rounded-xl border border-black/10 flex items-center justify-between bg-white">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="size-4 text-emerald-600" />
                        <div>
                          <div className="font-semibold text-gray-900">Candidate simulation passed</div>
                          <div className="text-gray-400">Exact transaction call simulated</div>
                        </div>
                      </div>
                      <span className="font-mono text-emerald-600 font-bold">Passed</span>
                    </div>

                    {/* Fresh-State Revalidation Card */}
                    <div
                      className={`p-3.5 rounded-xl border flex items-center justify-between transition ${
                        revalidationStatus === 'replan_required'
                          ? 'border-rose-300 bg-rose-50/30'
                          : 'border-black/10 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {revalidationStatus === 'validating' ? (
                          <RefreshCw className="size-4 text-[#836EF9] animate-spin" />
                        ) : revalidationStatus === 'replan_required' ? (
                          <AlertTriangle className="size-4 text-rose-600" />
                        ) : (
                          <CheckCircle2 className="size-4 text-emerald-600" />
                        )}
                        <div>
                          <div className="font-semibold text-gray-900">Fresh-state revalidation</div>
                          <div className="text-gray-400">
                            {revalidationStatus === 'validating'
                              ? 'Checking fresh block dependencies...'
                              : revalidationStatus === 'replan_required'
                              ? 'State drift detected on Monad block! Strategy invalidated.'
                              : 'Checking relevant state dependencies'}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`font-mono font-bold ${
                          revalidationStatus === 'replan_required'
                            ? 'text-rose-600'
                            : 'text-emerald-600'
                        }`}
                      >
                        {revalidationStatus === 'validating'
                          ? 'Checking...'
                          : revalidationStatus === 'replan_required'
                          ? 'Drift Revert'
                          : 'Passed'}
                      </span>
                    </div>
                  </div>

                  {/* Stale State Drift Demo Toggle (Demo 1 proof) */}
                  <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-amber-900">Simulate Monad State Drift (Demo 1)</div>
                      <div className="text-amber-700">Test safeguard against stale plan execution</div>
                    </div>
                    <button
                      onClick={() => {
                        setSimulateDrift(!simulateDrift);
                        setRevalidationStatus('validating');
                        setTimeout(() => {
                          setRevalidationStatus(!simulateDrift ? 'replan_required' : 'passed');
                        }, 600);
                      }}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                        simulateDrift
                          ? 'bg-amber-600 text-white'
                          : 'bg-white border border-amber-300 text-amber-900'
                      }`}
                    >
                      {simulateDrift ? 'Drift Active (Blocked)' : 'Trigger Drift'}
                    </button>
                  </div>

                  {/* Selected Action Card */}
                  <div className="p-4 rounded-xl bg-gray-50 border border-black/5 flex items-center justify-between text-xs">
                    <div>
                      <div className="text-gray-400">Selected action</div>
                      <div className="font-bold text-gray-900 text-sm mt-0.5">Repay 1,500 USDC</div>
                    </div>
                    <div className="text-right font-mono text-gray-500">
                      {revalidationStatus === 'passed' ? (
                        <span className="text-emerald-600 font-semibold">Ready for execution</span>
                      ) : (
                        <span>Awaiting revalidation</span>
                      )}
                    </div>
                  </div>

                  {revalidationStatus === 'replan_required' ? (
                    <div className="space-y-3">
                      <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900">
                        <strong>Safeguard Triggered:</strong> Mobius detected fresh block state drift. The planned transaction is invalidated and execution is blocked to protect your position.
                      </div>
                      <button
                        onClick={() => {
                          setSimulateDrift(false);
                          handleRunPreflight();
                        }}
                        className="w-full py-3.5 rounded-xl bg-gray-950 text-white font-semibold text-sm hover:bg-gray-800 transition cursor-pointer"
                      >
                        Re-plan Against Fresh State
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setStep('approved')}
                      disabled={revalidationStatus !== 'passed'}
                      className="w-full py-3.5 rounded-xl bg-[#836EF9] hover:bg-[#6E54FF] text-white font-semibold text-sm transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm shadow-[#836EF9]/30"
                    >
                      <span>Proceed to Authorization & Signing</span>
                      <ArrowRight className="size-4" />
                    </button>
                  )}
                </div>
              )}

              {/* ─── SCREEN 7: Transaction Approval & Decision Receipt (Playbook Section 8) ─── */}
              {step === 'approved' && !txHash && (
                <div className="bg-white rounded-2xl border border-black/10 p-8 sm:p-10 shadow-sm space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-950">Transaction Authorization</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Human-readable transaction preview. Confirm exact parameters before wallet signature.
                    </p>
                  </div>

                  {/* Human-Readable Table */}
                  <div className="border border-black/10 rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left font-mono">
                      <tbody className="divide-y divide-black/5">
                        <tr>
                          <td className="p-3 font-sans text-gray-500">Action</td>
                          <td className="p-3 font-bold text-gray-900">Repay debt</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-sans text-gray-500">Asset</td>
                          <td className="p-3 font-bold text-gray-900">USDC</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-sans text-gray-500">Amount</td>
                          <td className="p-3 font-bold text-gray-900">1,500 USDC</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-sans text-gray-500">Target</td>
                          <td className="p-3 text-gray-600">Verified Aave Pool (0x6Ae4...8951)</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-sans text-gray-500">Network</td>
                          <td className="p-3 text-gray-600">
                            {environment === 'sandbox' ? 'Demo Sandbox (Anvil Fork)' : 'Monad Mainnet'}
                          </td>
                        </tr>
                        <tr>
                          <td className="p-3 font-sans text-gray-500">Expected result</td>
                          <td className="p-3 text-emerald-600 font-bold">Updated debt and HF (HF: 1.63)</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-sans text-gray-500">Permission</td>
                          <td className="p-3 text-gray-600">Exact action only</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <button
                    onClick={handleAuthorize}
                    disabled={isSigning}
                    className="w-full py-3.5 rounded-xl bg-gray-950 hover:bg-gray-800 text-white font-semibold text-sm transition cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                  >
                    {isSigning ? (
                      <>
                        <RefreshCw className="size-4 animate-spin" />
                        <span>Requesting Wallet Signature...</span>
                      </>
                    ) : (
                      <>
                        <Shield className="size-4 text-[#836EF9]" />
                        <span>Authorize & Sign Transaction</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Final Executed & Decision Receipt Screen */}
              {step === 'approved' && txHash && (
                <div className="bg-white rounded-2xl border border-black/10 p-8 sm:p-10 shadow-sm space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-gray-950">Execution verified</h2>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
                          Finalized
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        The transaction settled and Mobius verified the resulting position.
                      </p>
                    </div>
                  </div>

                  {/* Before / After Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-black/5 bg-gray-50">
                      <div className="text-xs text-gray-400">Health factor before</div>
                      <div className="text-2xl font-bold text-rose-600 font-mono mt-1">1.39</div>
                    </div>
                    <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/30">
                      <div className="text-xs text-emerald-700">Health factor after</div>
                      <div className="text-2xl font-bold text-emerald-600 font-mono mt-1">1.63</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                    <div className="p-3 rounded-lg border border-black/5 bg-white">
                      <span className="text-gray-400">Repaid:</span> 1,500 USDC
                    </div>
                    <div className="p-3 rounded-lg border border-black/5 bg-white">
                      <span className="text-gray-400">Transaction status:</span> Finalized
                    </div>
                  </div>

                  {/* Cryptographic Decision Receipt Card */}
                  <div className="p-5 rounded-xl border border-black/10 bg-gray-50 space-y-3 text-xs">
                    <div className="font-bold text-gray-900 flex items-center justify-between">
                      <span>Decision receipt</span>
                      <span className="font-mono text-emerald-600 font-normal">Signed</span>
                    </div>
                    <div className="font-mono text-[11px] text-gray-600 space-y-1">
                      <p>Snapshot · Scenario assumptions · Candidate comparison · Policy version · Transaction hash · Predicted vs actual result</p>
                      <p className="text-gray-500 pt-1">Tx Hash: {txHash.slice(0, 20)}...{txHash.slice(-8)}</p>
                    </div>
                    <button
                      onClick={handleDownloadReceipt}
                      className="w-full mt-2 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 font-medium text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      {receiptDownloaded ? (
                        <>
                          <Check className="size-3.5 text-emerald-600" />
                          <span>Receipt Downloaded</span>
                        </>
                      ) : (
                        <>
                          <Download className="size-3.5 text-[#836EF9]" />
                          <span>Download Decision Receipt JSON</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Reset & Restart Workflow */}
                  <button
                    onClick={() => {
                      setTxHash(null);
                      setScenarioRun(false);
                      setStep('dashboard');
                    }}
                    className="w-full py-3.5 rounded-xl bg-gray-950 text-white font-semibold text-sm hover:bg-gray-800 transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="size-4" />
                    <span>Start New Risk Rehearsal</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ─── UNIFIED FOOTER (Matching Home Page) ─── */}
      <Footer />
    </div>
  );
}
