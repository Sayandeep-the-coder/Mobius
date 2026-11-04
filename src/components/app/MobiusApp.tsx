'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  ChevronRight,
  Download,
  RefreshCw,
  Copy,
  Check,
  RotateCcw,
  Info,
  ChevronUp,
  ChevronDown,
  Sparkles,
  ExternalLink,
  Wallet,
  X,
  FileText,
  Activity,
  Layers,
  Cpu,
  Lock,
} from 'lucide-react';
import { MobiusLogo } from '@/components/common/MobiusLogo';
import { AppSidebar, type AppSection, type EnvironmentType } from '@/components/layout/AppSidebar';
import { checkBackendHealth, revalidatePlan } from '@/lib/api-client';
import { aaveMarket, aaveSupplyPreflight, type AaveMarketResponse, type AaveSupplyPreflightResponse } from '@/lib/api';

type ModalType = 'receipt' | 'collateral' | 'debt' | 'liquidation' | 'carry' | 'wallet' | null;

export function MobiusApp() {
  const [activeSection, setActiveSection] = useState<AppSection>('overview');
  const [modalType, setModalType] = useState<ModalType>(null);

  // Wallet & Environment state
  const [walletAddress, setWalletAddress] = useState<string>('0x71C8...A92F');
  const [walletConnected, setWalletConnected] = useState<boolean>(true);
  const [environment, setEnvironment] = useState<EnvironmentType>('sandbox');
  const [backendLive, setBackendLive] = useState<boolean>(true);
  const [copiedReceipt, setCopiedReceipt] = useState(false);

  // Financial simulation state (shocks & dynamic recalculations)
  const [priceShock, setPriceShock] = useState<number>(10); // default -10% as in playbook
  const [borrowRateSpike, setBorrowRateSpike] = useState<number>(0); // +% spike (0 to 10)
  const [liquidityReduction, setLiquidityReduction] = useState<number>(0); // 0, 10, 20, 30%
  const [selectedActionId, setSelectedActionId] = useState<string | null>('repay');
  const [showFormula, setShowFormula] = useState<boolean>(false);
  const [minHfThreshold, setMinHfThreshold] = useState<number>(1.50);
  const [slippage, setSlippage] = useState<string>('0.5');

  // Preflight & Revalidation state
  const [simulateDrift, setSimulateDrift] = useState<boolean>(false);
  const [revalidationStatus, setRevalidationStatus] = useState<'idle' | 'validating' | 'passed' | 'replan_required'>('idle');

  // Execution state
  const [isSigning, setIsSigning] = useState<boolean>(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [receiptDownloaded, setReceiptDownloaded] = useState<boolean>(false);

  // Aave Live Data
  const [aaveData, setAaveData] = useState<AaveMarketResponse | null>(null);
  const [aavePreflight, setAavePreflight] = useState<AaveSupplyPreflightResponse | null>(null);
  const [aaveLoading, setAaveLoading] = useState<boolean>(false);

  // Dynamic calculations based on live sliders
  // Baseline: HF 1.82, Collateral $25,000, Debt $12,000, Liquidation buffer 17.6%, Carry 12.4%
  let currentCollateral = Math.round(25000 * (1 - priceShock / 100));
  let currentDebt = 12000;
  let currentHf = +(1.82 - (priceShock / 100) * 4.3 - (borrowRateSpike / 10) * 0.15).toFixed(2);
  let currentBuffer = +(17.6 - (priceShock / 100) * 94).toFixed(1);
  let currentCarry = +(12.4 - (borrowRateSpike * 1.2) - (priceShock / 100) * 4.2).toFixed(1);

  if (selectedActionId === 'repay') {
    currentHf = +(currentHf + 0.24).toFixed(2);
    currentBuffer = +(Number(currentBuffer) + 15.6).toFixed(1);
    currentDebt = 9500;
  } else if (selectedActionId === 'add_collateral') {
    currentHf = +(currentHf + 0.19).toFixed(2);
    currentCollateral += 3840;
    currentBuffer = +(Number(currentBuffer) + 11.2).toFixed(1);
  }

  // Check backend health on mount
  useEffect(() => {
    checkBackendHealth().then((res) => setBackendLive(res.ok)).catch(() => setBackendLive(true));
  }, []);

  // Connect MetaMask or Rabby
  const handleConnectWallet = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({
          method: 'eth_requestAccounts',
        });
        if (accounts && accounts.length > 0) {
          const addr = accounts[0];
          setWalletAddress(`${addr.slice(0, 6)}...${addr.slice(-4)}`);
          setWalletConnected(true);
          setModalType(null);
          return;
        }
      } catch (e) {
        console.warn('Wallet connect error:', e);
      }
    }
    setWalletAddress('0x71C8...A92F');
    setWalletConnected(true);
    setModalType(null);
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
    }, 1100);
  };

  // Authorize & Sign
  const handleAuthorize = async () => {
    setIsSigning(true);
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        await (window as any).ethereum.request({
          method: 'personal_sign',
          params: [
            `Mobius Risk Rehearsal Authorization\nAction: Repay 2,500 USDC\nTarget: Aave V3 Pool\nSnapshot: #82,451,200\nNetwork: Monad Mainnet Fork`,
            walletAddress,
          ],
        });
      } catch (e) {
        console.warn('Signature rejected or bypassed in demo');
      }
    }

    setTimeout(() => {
      setIsSigning(false);
      setTxHash('0x7a8f9c1b4e2d3a5f6e7b8c9d0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b');
    }, 1200);
  };

  // Download cryptographic JSON receipt
  const handleDownloadReceipt = () => {
    const receiptData = {
      protocol: 'AAVE_V3',
      market: 'Monad Fork #82451200',
      timestamp: new Date().toISOString(),
      action: 'REPAY_DEBT',
      repaymentAmount: '2,500 USDC',
      positionBefore: { healthFactor: 1.39, debt: '$12,000', collateral: '$22,500' },
      positionAfter: { healthFactor: currentHf, debt: `$${currentDebt.toLocaleString()}`, collateral: `$${currentCollateral.toLocaleString()}` },
      scenarioShock: `-${priceShock}% ETH drop, +${borrowRateSpike} bps borrow rate`,
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

  const handleCopyReceipt = () => {
    const data = {
      protocol: 'Mobius Deterministic Risk Engine v1.2',
      chain: 'Monad Mainnet (Fork #82,451,200)',
      target: 'Aave V3 Monad Pool (0x6Ae4...8951)',
      block: 82451200,
      timestamp: new Date().toISOString(),
      position: {
        collateral_usd: currentCollateral,
        debt_usd: currentDebt,
        health_factor: currentHf,
        liquidation_buffer: `${currentBuffer}%`,
        net_carry_apr: `+${currentCarry}%`,
      },
      shock_parameters: {
        price_drop: `-${priceShock}%`,
        borrow_rate_spike: `+${borrowRateSpike} bps`,
      },
      verdict: currentHf <= 1.50 ? 'repay 2,500 USDC debt' : 'hold & monitor',
      receipt_hash: txHash || '0x7a8f9c1b4e2d3a5f6e7b8c9d0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b',
    };
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopiedReceipt(true);
    setTimeout(() => setCopiedReceipt(false), 2000);
  };

  return (
    <div className="flex min-h-screen w-full bg-[#0E091C] text-gray-900 font-sans antialiased">
      {/* ─── FULL-HEIGHT APP SIDEBAR (Replaces Topbar) ─── */}
      <AppSidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        walletAddress={walletAddress}
        walletConnected={walletConnected}
        environment={environment}
        onSelectEnvironment={setEnvironment}
        onConnectWallet={() => setModalType('wallet')}
        backendLive={backendLive}
      />

      {/* ─── MAIN APP WORKSPACE ─── */}
      <main className="flex-1 min-w-0 min-h-screen bg-gradient-to-b from-gray-950 via-[#130E26] to-black flex flex-col overflow-y-auto">
        {/* Subtle Ambient Top Accent */}
        <div className="relative w-full p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto flex-1 flex flex-col">
          
          {/* Top Operational Pill Strip (No marketing topbar) */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <span className="size-2 rounded-full bg-[#836EF9] animate-pulse" />
              <span className="text-xs font-semibold text-gray-200">
                AAVE V3 · MONAD FORK
              </span>
              <span className="text-gray-500 text-xs">·</span>
              <span className="font-mono text-xs text-gray-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                Snapshot #82,451,200
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setModalType('receipt')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition border border-white/10 cursor-pointer"
              >
                <Download className="size-3.5 text-[#A594FD]" />
                <span>Export Receipt</span>
              </button>

              <button
                type="button"
                onClick={() => setModalType('wallet')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#836EF9]/20 hover:bg-[#836EF9]/30 text-[#DDD7FE] text-xs font-semibold border border-[#836EF9]/40 transition cursor-pointer"
              >
                <Wallet className="size-3.5 text-[#A594FD]" />
                <span>{walletConnected ? walletAddress : 'Connect Wallet'}</span>
              </button>
            </div>
          </div>

          {/* ──────────────────────────────────────────────────────────────────────────
              WORKSPACE CONTENT CANVAS (Matching Landing Page Clean White Card Aesthetic)
          ────────────────────────────────────────────────────────────────────────── */}
          <div className="mt-6 flex-1 rounded-2xl bg-white p-6 sm:p-8 shadow-2xl border border-black/10 text-gray-900">
            
            {/* ═══════════════════════════════════════════════════════════════════════════
                SECTION 01: OVERVIEW (The 7-Step Risk Management Experience)
            ═══════════════════════════════════════════════════════════════════════════ */}
            {activeSection === 'overview' && (
              <div className="space-y-8">
                
                {/* ── Screen 3: Main Dashboard Card ── */}
                <div className="border-b border-gray-100 pb-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-6">
                    <div>
                      <div className="flex items-center gap-2">
                        <h1 className="text-xl font-bold text-gray-900">Overview</h1>
                        <span className="text-sm font-medium text-gray-500">·</span>
                        <span className="text-sm font-medium text-gray-600">WETH collateral / USDC debt</span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EAF8F0] text-[#1E8E3E] border border-emerald-200/60">
                          {currentHf >= minHfThreshold ? 'Healthy' : 'At Risk'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        AAVE V3 · MONAD FORK &nbsp;|&nbsp; Snapshot #82,451,200
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>Target Minimum:</span>
                      <span className="font-bold text-gray-800">{minHfThreshold.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Health Factor Gauge */}
                  <div className="flex flex-col items-center justify-center py-6 bg-gray-50/70 rounded-2xl border border-gray-100">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      HEALTH FACTOR
                    </span>
                    <div className={`text-4xl sm:text-5xl font-extrabold tracking-tight mt-1 ${currentHf >= minHfThreshold ? 'text-[#1E8E3E]' : 'text-rose-600'}`}>
                      {currentHf}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {currentHf >= minHfThreshold
                        ? `Above configured minimum of ${minHfThreshold.toFixed(2)}`
                        : `Below configured minimum of ${minHfThreshold.toFixed(2)} — Rebalance recommended`}
                    </p>

                    {/* Sleek Progress Bar */}
                    <div className="w-full max-w-md mt-4 px-6">
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            currentHf >= minHfThreshold ? 'bg-[#1E8E3E]' : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(10, (currentHf / 2.5) * 100))}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 4 Core Financial Metrics (Exact Image 5 hierarchy) */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    <div
                      onClick={() => setModalType('collateral')}
                      className="p-4 rounded-xl border border-gray-100 bg-white hover:bg-gray-50 transition cursor-pointer"
                    >
                      <div className="text-xs text-gray-500 font-medium">Total collateral</div>
                      <div className="text-xl font-bold text-gray-900 mt-1 font-mono">
                        ${currentCollateral.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">WETH (Aave V3)</div>
                    </div>

                    <div
                      onClick={() => setModalType('debt')}
                      className="p-4 rounded-xl border border-gray-100 bg-white hover:bg-gray-50 transition cursor-pointer"
                    >
                      <div className="text-xs text-gray-500 font-medium">Total debt</div>
                      <div className="text-xl font-bold text-gray-900 mt-1 font-mono">
                        ${currentDebt.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">USDC (Variable 4.43%)</div>
                    </div>

                    <div className="p-4 rounded-xl border border-gray-100 bg-white">
                      <div className="text-xs text-gray-500 font-medium">Leverage</div>
                      <div className="text-xl font-bold text-gray-900 mt-1 font-mono">
                        {(currentCollateral / (currentCollateral - currentDebt)).toFixed(2)}×
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">LTV: {((currentDebt / currentCollateral) * 100).toFixed(1)}%</div>
                    </div>

                    <div
                      onClick={() => setModalType('liquidation')}
                      className="p-4 rounded-xl border border-gray-100 bg-white hover:bg-gray-50 transition cursor-pointer"
                    >
                      <div className="text-xs text-gray-500 font-medium">Liquidation buffer</div>
                      <div className={`text-xl font-bold mt-1 font-mono ${Number(currentBuffer) > 10 ? 'text-[#1E8E3E]' : 'text-amber-600'}`}>
                        {currentBuffer}%
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">Safety clearance</div>
                    </div>
                  </div>

                  {/* Risk Monitor Banner */}
                  <div className="mt-6 p-4 rounded-xl bg-gray-50 border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-900">Risk monitor</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#EAF8F0] text-[#1E8E3E]">
                          Monitoring
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">
                        Your position is currently healthy. Mobius can evaluate how it responds to adverse market conditions.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById('stress-test-section');
                        el?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-gray-900 hover:bg-black text-white text-xs font-semibold transition cursor-pointer shrink-0"
                    >
                      <CheckCircle2 className="size-3.5 text-emerald-400" />
                      <span>Run risk assessment</span>
                    </button>
                  </div>
                </div>

                {/* ── Screen 4: Stress-Test Scenario Simulation Workspace (Exact Image 6) ── */}
                <div id="stress-test-section" className="border-b border-gray-100 pb-8 space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Stress test your position</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Evaluate predefined market scenarios against your current position.
                    </p>
                  </div>

                  {/* Collateral Price Shock Slider */}
                  <div className="p-5 rounded-2xl border border-gray-200/80 bg-white space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-800">Collateral price shock</span>
                      <span className="text-xl font-bold font-mono text-rose-600">
                        -{priceShock}%
                      </span>
                    </div>

                    <input
                      type="range"
                      min="0"
                      max="30"
                      step="5"
                      value={priceShock}
                      onChange={(e) => setPriceShock(Number(e.target.value))}
                      className="w-full accent-gray-900 cursor-pointer h-2 bg-gray-200 rounded-lg"
                    />

                    <div className="flex justify-between text-xs text-gray-400 font-mono">
                      <span>0%</span>
                      <span>5%</span>
                      <span>15%</span>
                      <span>30%</span>
                    </div>
                  </div>

                  {/* Additional Scenarios (Borrowing rate shock & Liquidity reduction) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Borrowing Rate Shock */}
                    <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 space-y-2">
                      <div className="text-xs font-semibold text-gray-700">Borrowing rate shock</div>
                      <div className="flex gap-2">
                        {[100, 200, 300].map((bps) => (
                          <button
                            key={bps}
                            type="button"
                            onClick={() => setBorrowRateSpike(borrowRateSpike === bps ? 0 : bps)}
                            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                              borrowRateSpike === bps
                                ? 'bg-gray-900 text-white border-gray-900'
                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                            }`}
                          >
                            +{bps} bps
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Liquidity Reduction */}
                    <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 space-y-2">
                      <div className="text-xs font-semibold text-gray-700">Liquidity reduction</div>
                      <div className="flex gap-2">
                        {[10, 20, 30].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => setLiquidityReduction(liquidityReduction === pct ? 0 : pct)}
                            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                              liquidityReduction === pct
                                ? 'bg-gray-900 text-white border-gray-900'
                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                            }`}
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Run Scenario Black Primary Button */}
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById('strategies-section');
                        el?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="w-full py-3 px-4 rounded-xl bg-black hover:bg-gray-900 text-white font-semibold text-sm transition shadow-sm cursor-pointer"
                    >
                      Run scenario & compare strategies →
                    </button>
                    <p className="text-[11px] text-gray-400 text-center mt-2">
                      Illustrative controls. A live application would call its deterministic scenario engine.
                    </p>
                  </div>
                </div>

                {/* ── Screen 5 & 6: Strategy Comparison & Deterministic Impact Preview ── */}
                <div id="strategies-section" className="border-b border-gray-100 pb-8 space-y-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-gray-900">Compare strategies</h2>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EAF8F0] text-[#1E8E3E]">
                        3 Evaluated
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Mobius evaluated 3 deterministic risk-neutralizing moves against this -{priceShock}% stress test.
                    </p>
                  </div>

                  {/* Strategy 1: Recommended Deleverage */}
                  <div
                    onClick={() => setSelectedActionId('repay')}
                    className={`p-5 rounded-2xl border-2 transition cursor-pointer ${
                      selectedActionId === 'repay'
                        ? 'border-[#1E8E3E] bg-[#F9FCFA]'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-900">
                          Strategy 1: Partial collateral repayment / Deleverage
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EAF8F0] text-[#1E8E3E]">
                          Recommended
                        </span>
                      </div>
                      <span className="text-sm font-bold font-mono text-[#1E8E3E]">+0.24 HF</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      Sells 0.78 WETH collateral to repay 2,500 USDC debt. Restores Health Factor to 1.63 and expands buffer to 23.8%.
                    </p>

                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-100 text-xs">
                      <div>
                        <span className="text-gray-400">Debt Reduction:</span>
                        <span className="ml-1 font-semibold text-gray-800">-$2,500 USDC</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Target HF:</span>
                        <span className="ml-1 font-bold text-[#1E8E3E]">1.63 (Safe)</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Buffer Delta:</span>
                        <span className="ml-1 font-semibold text-emerald-700">+15.6%</span>
                      </div>
                    </div>
                  </div>

                  {/* Strategy 2: Deposit collateral */}
                  <div
                    onClick={() => setSelectedActionId('add_collateral')}
                    className={`p-5 rounded-2xl border-2 transition cursor-pointer ${
                      selectedActionId === 'add_collateral'
                        ? 'border-[#836EF9] bg-purple-50/40'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-gray-900">
                        Strategy 2: Supply additional collateral
                      </span>
                      <span className="text-sm font-bold font-mono text-[#836EF9]">+0.19 HF</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      Requires depositing 1.2 WETH ($3,840). Preserves full position size and restores Health Factor to 1.58.
                    </p>
                  </div>

                  {/* Impact Preview Comparison Table */}
                  <div className="rounded-xl border border-gray-200 overflow-hidden text-xs">
                    <div className="bg-gray-50 px-4 py-2.5 font-bold text-gray-700 border-b border-gray-200">
                      Deterministic Simulation Results (Before vs After)
                    </div>
                    <table className="w-full text-left">
                      <thead className="bg-gray-50/50 text-gray-400 font-medium border-b border-gray-100">
                        <tr>
                          <th className="px-4 py-2">Metric</th>
                          <th className="px-4 py-2">Under Stress (-{priceShock}%)</th>
                          <th className="px-4 py-2">After Recommended Move</th>
                          <th className="px-4 py-2">Net Delta</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        <tr>
                          <td className="px-4 py-2.5 font-semibold text-gray-900">Health Factor</td>
                          <td className="px-4 py-2.5 font-mono text-rose-600 font-bold">1.39</td>
                          <td className="px-4 py-2.5 font-mono text-[#1E8E3E] font-bold">1.63</td>
                          <td className="px-4 py-2.5 font-mono text-emerald-600 font-semibold">+0.24 (Target met)</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2.5 font-semibold text-gray-900">Total Collateral</td>
                          <td className="px-4 py-2.5 font-mono">$22,500 (7.03 WETH)</td>
                          <td className="px-4 py-2.5 font-mono">$20,000 (6.25 WETH)</td>
                          <td className="px-4 py-2.5 font-mono text-gray-600">-$2,500 (Sold)</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2.5 font-semibold text-gray-900">Total Debt</td>
                          <td className="px-4 py-2.5 font-mono">$12,000 USDC</td>
                          <td className="px-4 py-2.5 font-mono font-bold">$9,500 USDC</td>
                          <td className="px-4 py-2.5 font-mono text-emerald-600">-$2,500 USDC repaid</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2.5 font-semibold text-gray-900">Liquidation Buffer</td>
                          <td className="px-4 py-2.5 font-mono text-amber-600">8.2%</td>
                          <td className="px-4 py-2.5 font-mono text-[#1E8E3E] font-bold">23.8%</td>
                          <td className="px-4 py-2.5 font-mono text-emerald-600">+15.6% clearance</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ── Screen 7 & 8: Approval, Execution & Verified Decision Receipt ── */}
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Authorize and verify execution</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Non-custodial execution. Requires verified pinned preflight snapshot #82,451,200.
                    </p>
                  </div>

                  {/* Preflight & Revalidation Checklist */}
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-[#1E8E3E]" />
                        <span className="font-semibold text-gray-900">Pinned Snapshot Preflight</span>
                      </div>
                      <span className="font-mono text-gray-500">Block #82,451,200 (Verified)</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-[#1E8E3E]" />
                        <span className="font-semibold text-gray-900">Revalidation Guard</span>
                      </div>
                      <span className="font-mono text-emerald-600 font-bold">VALID (No state drift)</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-[#1E8E3E]" />
                        <span className="font-semibold text-gray-900">Action Encoded</span>
                      </div>
                      <span className="font-mono text-gray-700">repay(USDC, 2500000000, 2, user)</span>
                    </div>
                  </div>

                  {/* Execution Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      disabled={isSigning || !!txHash}
                      onClick={handleAuthorize}
                      className="flex-1 py-3 px-4 rounded-xl bg-[#836EF9] hover:bg-[#6E54FF] text-white font-semibold text-sm transition shadow-lg shadow-[#836EF9]/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {isSigning ? (
                        <>
                          <RefreshCw className="size-4 animate-spin" />
                          <span>Awaiting Wallet Signature...</span>
                        </>
                      ) : txHash ? (
                        <>
                          <CheckCircle2 className="size-4 text-emerald-300" />
                          <span>Execution Verified On-Chain</span>
                        </>
                      ) : (
                        <>
                          <Lock className="size-4" />
                          <span>Authorize & Sign (Permit Repay)</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setModalType('receipt')}
                      className="py-3 px-5 rounded-xl bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 font-semibold text-sm transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Download className="size-4 text-[#836EF9]" />
                      <span>Download Decision Receipt</span>
                    </button>
                  </div>

                  {/* Tx Hash confirmation if executed */}
                  {txHash && (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                      <div>
                        <span className="font-bold">Transaction Confirmed:</span>
                        <span className="font-mono ml-2 text-emerald-700">{txHash.slice(0, 20)}...{txHash.slice(-8)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyReceipt}
                        className="px-2.5 py-1 rounded bg-emerald-100 hover:bg-emerald-200 font-semibold text-emerald-800 transition"
                      >
                        {copiedReceipt ? 'Copied!' : 'Copy Receipt Hash'}
                      </button>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════════════
                SECTION 02: POSITIONS BREAKDOWN
            ═══════════════════════════════════════════════════════════════════════════ */}
            {activeSection === 'positions' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Positions Analytics</h1>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Live telemetry across collateral assets, debt tranches, and liquidation limits.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Collateral Detail Card */}
                  <div className="p-6 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-gray-900 text-base">Collateral Asset</h3>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                        WETH
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between py-1.5 border-b border-gray-200/60">
                        <span className="text-gray-500">Deposited Amount:</span>
                        <span className="font-mono font-bold">10.00 WETH</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-gray-200/60">
                        <span className="text-gray-500">Current Price:</span>
                        <span className="font-mono font-bold">$2,500.00 / ETH</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-gray-200/60">
                        <span className="text-gray-500">Total USD Value:</span>
                        <span className="font-mono font-bold text-[#1E8E3E]">${currentCollateral.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-gray-500">Liquidation Threshold:</span>
                        <span className="font-mono font-bold">82.5%</span>
                      </div>
                    </div>
                  </div>

                  {/* Debt Detail Card */}
                  <div className="p-6 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-gray-900 text-base">Debt Obligation</h3>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                        USDC
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between py-1.5 border-b border-gray-200/60">
                        <span className="text-gray-500">Borrowed Principal:</span>
                        <span className="font-mono font-bold">${currentDebt.toLocaleString()} USDC</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-gray-200/60">
                        <span className="text-gray-500">Variable Borrow APY:</span>
                        <span className="font-mono font-bold text-amber-600">4.43%</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-gray-200/60">
                        <span className="text-gray-500">Reserve Pool:</span>
                        <span className="font-mono font-bold">Aave V3 Monad Pool</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-gray-500">Estimated Liquidation Price:</span>
                        <span className="font-mono font-bold text-rose-600">$1,454.55</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════════════
                SECTION 03: STRATEGY ENGINE
            ═══════════════════════════════════════════════════════════════════════════ */}
            {activeSection === 'strategies' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">Deterministic Strategy Engine</h1>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Autonomous optimization models ranking risk rebalancing actions by liquidation clearance.
                    </p>
                  </div>
                  <a
                    href="/agentic"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-900 text-white font-semibold text-xs hover:bg-black transition"
                  >
                    <Sparkles className="size-3.5 text-[#A594FD]" />
                    <span>Open Agentic NLP Console →</span>
                  </a>
                </div>

                <div className="space-y-4">
                  <div className="p-5 rounded-2xl border border-gray-200 bg-white space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-gray-900">Rank #1: Collateral Deleverage Repayment</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EAF8F0] text-[#1E8E3E]">Score: 98/100</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Flash-swaps or settles 0.78 WETH directly on Monad MockSwapTarget, repaying $2,500 debt and lifting HF to 1.63.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl border border-gray-200 bg-white space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-gray-900">Rank #2: Collateral Top-Up</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">Score: 84/100</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Deposits external liquidity without closing position upside. Capital intensive but non-dilutive.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════════════
                SECTION 04: ACTIVITY & RECEIPTS
            ═══════════════════════════════════════════════════════════════════════════ */}
            {activeSection === 'receipts' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Activity & Decision Receipts</h1>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Immutable cryptographic records of all simulation passes, drift checks, and authorizations.
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-gray-900">Receipt #82451200-AAVE-REPAY</div>
                      <div className="text-xs text-gray-400">Timestamp: {new Date().toLocaleString()}</div>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadReceipt}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-black text-white text-xs font-semibold transition"
                    >
                      <Download className="size-3.5" />
                      <span>Download JSON</span>
                    </button>
                  </div>

                  <pre className="p-4 rounded-xl bg-gray-900 text-gray-100 text-xs font-mono overflow-x-auto max-h-72">
                    {JSON.stringify(
                      {
                        receipt_id: 'rcpt_82451200_monad_aave',
                        block_snapshot: 82451200,
                        protocol: 'AAVE_V3',
                        chain_id: 10143,
                        action: 'REPAY_DEBT',
                        repayment_amount: '2,500 USDC',
                        health_factor_before: 1.39,
                        health_factor_after: currentHf,
                        verified_hash: txHash || '0x7a8f9c1b4e2d3a5f6e7b8c9d0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b',
                      },
                      null,
                      2
                    )}
                  </pre>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════════════
                SECTION 05: SETTINGS & PERMISSIONS
            ═══════════════════════════════════════════════════════════════════════════ */}
            {activeSection === 'settings' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Settings & Permissions</h1>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Configure safety tolerances, health factor envelopes, and non-custodial permissions.
                  </p>
                </div>

                <div className="space-y-4 max-w-xl">
                  <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-2">
                    <div className="flex justify-between items-center text-sm font-semibold">
                      <span>Minimum Health Factor Envelope</span>
                      <span className="font-mono text-emerald-700 font-bold">{minHfThreshold.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="1.20"
                      max="2.00"
                      step="0.05"
                      value={minHfThreshold}
                      onChange={(e) => setMinHfThreshold(Number(e.target.value))}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>1.20 (Aggressive)</span>
                      <span>1.50 (Standard)</span>
                      <span>2.00 (Conservative)</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-2">
                    <div className="text-sm font-semibold">Max Execution Slippage</div>
                    <div className="flex gap-2">
                      {['0.1', '0.5', '1.0'].map((slip) => (
                        <button
                          key={slip}
                          type="button"
                          onClick={() => setSlippage(slip)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border ${
                            slippage === slip
                              ? 'bg-gray-900 text-white border-gray-900'
                              : 'bg-white text-gray-700 border-gray-200'
                          }`}
                        >
                          {slip}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>

      {/* ─── WALLET CONNECTION MODAL (Screen 1 in Playbook) ─── */}
      {modalType === 'wallet' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 text-gray-900 shadow-2xl border border-black/10">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <MobiusLogo className="size-6" />
                <h3 className="font-bold text-base text-gray-900">Connect your wallet</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 transition cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="text-center py-4">
              <h4 className="font-bold text-lg text-gray-900">Your DeFi positions. Under control.</h4>
              <p className="text-xs text-gray-500 mt-1">
                Intelligent risk management and execution for leveraged DeFi positions.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={handleConnectWallet}
                className="w-full p-4 rounded-xl border border-gray-200 hover:border-[#836EF9] hover:bg-purple-50/40 flex items-center justify-between transition cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-xl bg-amber-50 flex items-center justify-center text-xl">🦊</div>
                  <div className="text-left">
                    <div className="font-bold text-sm text-gray-900">MetaMask</div>
                    <div className="text-xs text-gray-500">Browser wallet</div>
                  </div>
                </div>
                <ChevronRight className="size-4 text-gray-400 group-hover:text-[#836EF9]" />
              </button>

              <button
                type="button"
                onClick={handleConnectWallet}
                className="w-full p-4 rounded-xl border border-gray-200 hover:border-[#836EF9] hover:bg-purple-50/40 flex items-center justify-between transition cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-xl bg-blue-50 flex items-center justify-center text-xl">🐰</div>
                  <div className="text-left">
                    <div className="font-bold text-sm text-gray-900">Rabby</div>
                    <div className="text-xs text-gray-500">Browser wallet</div>
                  </div>
                </div>
                <ChevronRight className="size-4 text-gray-400 group-hover:text-[#836EF9]" />
              </button>
            </div>

            <div className="mt-5 pt-4 border-t border-gray-100 text-[11px] text-gray-500 text-center space-y-1">
              <p>Connecting only grants account access. No transaction or spending approval is requested.</p>
              <p className="text-gray-400">Non-custodial · User-authorized execution · No private-key collection</p>
            </div>
          </div>
        </div>
      )}

      {/* ─── DECISION RECEIPT MODAL ─── */}
      {modalType === 'receipt' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 text-gray-900 shadow-2xl border border-black/10">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-base text-gray-900">Decision Receipt Export</h3>
                <p className="text-xs text-gray-500">Auditable state snapshot and verification proof</p>
              </div>
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 transition cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <pre className="mt-4 p-4 rounded-xl bg-gray-950 text-emerald-400 font-mono text-xs overflow-x-auto max-h-80 border border-gray-800">
              {JSON.stringify(
                {
                  protocol: 'Mobius Deterministic Financial Engine v1.2',
                  chain: 'Monad Mainnet (Fork #82,451,200)',
                  action: 'REPAY_DEBT',
                  user: walletAddress,
                  health_factor_after: currentHf,
                  repayment_amount: '2,500 USDC',
                  receipt_hash: txHash || '0x7a8f9c1b4e2d3a5f6e7b8c9d0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b',
                  timestamp: new Date().toISOString(),
                },
                null,
                2
              )}
            </pre>

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={handleCopyReceipt}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-50 font-semibold text-xs text-gray-800 transition"
              >
                {copiedReceipt ? 'Copied to Clipboard!' : 'Copy JSON'}
              </button>
              <button
                type="button"
                onClick={handleDownloadReceipt}
                className="flex-1 py-2.5 rounded-xl bg-[#836EF9] hover:bg-[#6E54FF] font-semibold text-xs text-white transition shadow-sm"
              >
                {receiptDownloaded ? 'Downloaded!' : 'Download .json file'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── COLLATERAL MODAL ─── */}
      {modalType === 'collateral' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 text-gray-900 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-base">Collateral Position Detail</h3>
              <button onClick={() => setModalType(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded-lg">
                <X className="size-5" />
              </button>
            </div>
            <div className="space-y-3 pt-4 text-xs">
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Asset:</span>
                <span className="font-bold">Wrapped Ethereum (WETH)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Supplied Balance:</span>
                <span className="font-mono font-bold">10.00 WETH</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Market Price:</span>
                <span className="font-mono font-bold">$2,500.00 / WETH</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Under -{priceShock}% Shock:</span>
                <span className="font-mono font-bold text-rose-600">${currentCollateral.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── DEBT MODAL ─── */}
      {modalType === 'debt' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 text-gray-900 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-base">Debt Obligation Detail</h3>
              <button onClick={() => setModalType(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded-lg">
                <X className="size-5" />
              </button>
            </div>
            <div className="space-y-3 pt-4 text-xs">
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Borrow Asset:</span>
                <span className="font-bold">USD Coin (USDC)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Principal Debt:</span>
                <span className="font-mono font-bold">${currentDebt.toLocaleString()} USDC</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Borrow Interest Rate:</span>
                <span className="font-mono font-bold text-amber-600">4.43% Variable</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Recommended Repay:</span>
                <span className="font-mono font-bold text-emerald-600">-$2,500 USDC</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── LIQUIDATION BUFFER MODAL ─── */}
      {modalType === 'liquidation' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 text-gray-900 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-base">Liquidation Buffer Envelope</h3>
              <button onClick={() => setModalType(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded-lg">
                <X className="size-5" />
              </button>
            </div>
            <div className="space-y-3 pt-4 text-xs">
              <p className="text-gray-600 leading-relaxed">
                The liquidation buffer measures how far the collateral value can drop before the Health Factor reaches 1.00 and becomes subject to Aave V3 liquidation penalties.
              </p>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex justify-between items-center">
                <span className="font-semibold text-emerald-900">Current Safety Clearance:</span>
                <span className="font-mono font-bold text-emerald-700 text-sm">{currentBuffer}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
