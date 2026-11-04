'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MobiusLogo } from '@/components/common/MobiusLogo';

interface HeroMockAppProps {
  onOpenAnalyze?: () => void;
}

export function HeroMockApp({ onOpenAnalyze }: HeroMockAppProps) {
  const [activeTab, setActiveTab] = useState<'positions' | 'rehearse' | 'actions' | 'aave' | 'pendle' | 'stablecoins' | 'receipts' | 'settings'>('positions');
  const [modalType, setModalType] = useState<'receipt' | 'collateral' | 'debt' | 'liquidation' | 'carry' | null>(null);

  // Shock parameters for interactive live rehearsal (baseline 0 defaults to 1.03 HF, +12.4% APR, 290 bps)
  const [depegBps, setDepegBps] = useState(0);
  const [borrowRateSpike, setBorrowRateSpike] = useState(0);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [copiedReceipt, setCopiedReceipt] = useState(false);

  // Dynamic calculations based on shock sliders & simulated moves
  let currentHf = +(1.03 - (depegBps / 500) * 0.02 - (borrowRateSpike / 10) * 0.02).toFixed(2);
  let currentCarry = +(12.4 - (borrowRateSpike * 1.2) - (depegBps / 250) * 4.3).toFixed(1);
  let currentLiqDistance = Math.max(10, Math.round(290 - (depegBps / 250) * 250));

  if (selectedActionId === 'add-collateral') {
    currentHf = +(currentHf + 0.11).toFixed(2);
    currentLiqDistance += 180;
    currentCarry = +(currentCarry - 0.7).toFixed(1);
  } else if (selectedActionId === 'repay') {
    currentHf = +(currentHf + 0.15).toFixed(2);
    currentLiqDistance += 240;
    currentCarry = +(currentCarry - 1.2).toFixed(1);
  } else if (selectedActionId === 'reduce-leverage') {
    currentHf = +(currentHf + 0.22).toFixed(2);
    currentLiqDistance += 320;
    currentCarry = +(currentCarry - 2.8).toFixed(1);
  } else if (selectedActionId === 'roll') {
    currentHf = +(currentHf + 0.05).toFixed(2);
    currentCarry = +(currentCarry + 2.4).toFixed(1);
  }

  const handleCopyReceipt = () => {
    const data = {
      protocol: "Mobius Risk Engine v1.0",
      chain: "Monad",
      strategy: "PT-AUSD loop on Aave V3 (Monad)",
      block: 12345678,
      timestamp: new Date().toISOString(),
      position: {
        collateral_usd: 250000,
        debt_usd: 230000,
        health_factor: currentHf,
        liquidation_distance_bps: currentLiqDistance,
        net_carry_apr: `${currentCarry}%`
      },
      shock_parameters: {
        ausd_depeg_bps: depegBps,
        borrow_rate_spike: `+${borrowRateSpike}%`
      },
      verdict: currentHf <= 1.01 ? "reduce leverage" : "hold & monitor",
      receipt_hash: "0x89fcb3017a94029df4819aa0182491a6d71b3e9a"
    };

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    }
    setCopiedReceipt(true);
    setTimeout(() => setCopiedReceipt(false), 2000);
  };

  return (
    <>
      <figure aria-labelledby="landing-mock-app-description" className="relative w-full mx-auto">
        {/* Live demo top indicator positioned above mock app window */}
        <div
          className="absolute top-0 left-6 sm:left-8 z-0 origin-bottom"
          style={{ transform: "translateY(calc(-100% + 0.75rem))" }}
        >
          <div className="flex items-center justify-center gap-2 px-4 pt-2 pb-6">
            <div className="flex size-4 items-center justify-center rounded-full bg-[#836EF9]/30">
              <div className="size-2 rounded-full bg-[#836EF9] animate-pulse" />
            </div>
            <p id="landing-mock-app-description" className="font-medium text-base/6 text-gray-500">
              Live demo.{' '}
              <button
                type="button"
                onClick={() => setActiveTab('rehearse')}
                className="text-gray-900 underline hover:text-black cursor-pointer font-medium"
              >
                Try a shock
              </button>{' '}
              on a sample position.
            </p>
          </div>
        </div>

        {/* Horizontal scroll container for the mock app */}
        <div className="w-full overflow-x-auto pb-4">
          {/* Outer Mock App Window Container - Always side-by-side, single unified frame */}
          <div className="relative z-10 flex flex-row min-w-[780px] min-h-[580px] w-full overflow-hidden rounded-[20px] bg-gray-800 shadow-1.5xl border border-black/10">
            {/* Aside Sidebar */}
            <aside className="flex w-60 shrink-0 flex-col border-r border-white/10 bg-gray-800">
              {/* Logo header */}
              <div className="flex items-center gap-3 border-white/10 border-b px-6 py-5">
                <MobiusLogo className="size-6 shrink-0" />
                <span className="font-extrabold text-base tracking-tight text-white">MOBIUS</span>
                <span className="rounded bg-[#836EF9]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#DDD7FE] uppercase tracking-wider">
                  BETA
                </span>
              </div>

              {/* Sidebar Navigation */}
              <nav className="flex flex-col p-3 gap-0.5">
                {/* Positions */}
                <button
                  type="button"
                  onClick={() => setActiveTab('positions')}
                  className={`focus-visible:-outline-offset-2 flex w-full items-center gap-3 rounded-xl p-3 text-left transition cursor-pointer ${
                    activeTab === 'positions' ? 'bg-white/6 text-white' : 'text-gray-300 hover:bg-white/6 hover:text-white'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" color="currentColor" viewBox="0 0 24 24" aria-hidden="true" className="size-5 shrink-0">
                    <path d="M3 11.99v2.51c0 3.3 0 4.95 1.025 5.975S6.7 21.5 10 21.5h4c3.3 0 4.95 0 5.975-1.025S21 17.8 21 14.5v-2.51c0-1.682 0-2.522-.356-3.25s-1.02-1.244-2.346-2.276l-2-1.556C14.233 3.304 13.2 2.5 12 2.5s-2.233.803-4.298 2.409l-2 1.555C4.375 7.496 3.712 8.012 3.356 8.74S3 10.308 3 11.99M16 17H8" />
                  </svg>
                  <span className="flex-1 font-semibold text-sm/5">Positions</span>
                </button>

                {/* Rehearse */}
                <button
                  type="button"
                  onClick={() => setActiveTab('rehearse')}
                  className={`focus-visible:-outline-offset-2 flex w-full items-center gap-3 rounded-xl p-3 text-left transition cursor-pointer ${
                    activeTab === 'rehearse' ? 'bg-white/6 text-white' : 'text-gray-300 hover:bg-white/6 hover:text-white'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" color="currentColor" viewBox="0 0 24 24" aria-hidden="true" className="size-5 shrink-0">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 9H6.659c-1.006 0-1.51 0-1.634-.309-.125-.308.23-.672.941-1.398L8.211 5M5 15h12.341c1.006 0 1.51 0 1.634.309.125.308-.23.672-.941 1.398L15.789 19" />
                  </svg>
                  <span className="flex-1 font-semibold text-sm/5">Rehearse</span>
                </button>

                {/* Actions */}
                <button
                  type="button"
                  onClick={() => setActiveTab('actions')}
                  className={`focus-visible:-outline-offset-2 flex w-full items-center gap-3 rounded-xl p-3 text-left transition cursor-pointer ${
                    activeTab === 'actions' ? 'bg-white/6 text-white' : 'text-gray-300 hover:bg-white/6 hover:text-white'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" color="currentColor" viewBox="0 0 24 24" aria-hidden="true" className="size-5 shrink-0">
                    <path d="M10 9v6c0 .932 0 1.398-.152 1.765a2 2 0 0 1-1.083 1.083C8.398 18 7.932 18 7 18s-1.398 0-1.765-.152a2 2 0 0 1-1.083-1.083C4 16.398 4 15.932 4 15V9c0-.932 0-1.398.152-1.765a2 2 0 0 1 1.083-1.083C5.602 6 6.068 6 7 6s1.398 0 1.765.152a2 2 0 0 1 1.083 1.083C10 7.602 10 8.068 10 9m10 5v1c0 .932 0 1.398-.152 1.765a2 2 0 0 1-1.083 1.083C18.398 18 17.932 18 17 18s-1.398 0-1.765-.152a2 2 0 0 1-1.083-1.083C14 16.398 14 15.932 14 15v-1c0-.932 0-1.398.152-1.765a2 2 0 0 1 1.083-1.083C15.602 11 16.068 11 17 11s1.398 0 1.765.152a2 2 0 0 1 1.083 1.083C20 12.602 20 13.068 20 14m-3-3V3m0 15v3M7 6V3m0 15v3" />
                  </svg>
                  <span className="flex-1 font-semibold text-sm/5">Actions</span>
                </button>

                {/* Markets section header */}
                <div className="my-5 flex flex-col gap-1.5">
                  <div className="pl-3 font-semibold text-sm/5 text-white/50">Markets</div>
                  <div className="flex flex-col gap-0.5">
                    {/* Aave V3 */}
                    <button
                      type="button"
                      onClick={() => setActiveTab('aave')}
                      className={`focus-visible:-outline-offset-2 flex w-full items-center gap-3 rounded-xl p-3 text-left transition cursor-pointer ${
                        activeTab === 'aave' ? 'bg-white/6 text-white' : 'text-gray-300 hover:bg-white/6 hover:text-white'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="1.5" color="currentColor" viewBox="0 0 24 24" aria-hidden="true" className="size-5 shrink-0">
                        <ellipse cx="15.5" cy="11" rx="6.5" ry="2" />
                        <path d="M22 15.5c0 1.105-2.91 2-6.5 2s-6.5-.895-6.5-2" />
                        <path d="M22 11v8.8c0 1.215-2.91 2.2-6.5 2.2S9 21.015 9 19.8V11" />
                        <ellipse cx="8.5" cy="4" rx="6.5" ry="2" />
                        <path strokeLinecap="round" d="M6 11c-1.892-.23-3.63-.825-4-2m4 7c-1.892-.23-3.63-.825-4-2" />
                        <path strokeLinecap="round" d="M6 21c-1.892-.23-3.63-.825-4-2V4m13 2V4" />
                      </svg>
                      <span className="flex-1 font-semibold text-sm/5">Aave V3</span>
                    </button>

                    {/* Pendle PTs */}
                    <button
                      type="button"
                      onClick={() => setActiveTab('pendle')}
                      className={`focus-visible:-outline-offset-2 flex w-full items-center gap-3 rounded-xl p-3 text-left transition cursor-pointer ${
                        activeTab === 'pendle' ? 'bg-white/6 text-white' : 'text-gray-300 hover:bg-white/6 hover:text-white'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" color="currentColor" viewBox="0 0 24 24" aria-hidden="true" className="size-5 shrink-0">
                        <path d="M19.5 19h-15c-.279 0-.418 0-.534.023a1.2 1.2 0 0 0-.943.943C3 20.082 3 20.22 3 20.5s0 .418.023.534a1.2 1.2 0 0 0 .943.943C4.082 22 4.22 22 4.5 22h15c.279 0 .418 0 .534-.023a1.2 1.2 0 0 0 .943-.943C21 20.918 21 20.78 21 20.5s0-.418-.023-.534a1.2 1.2 0 0 0-.943-.943C19.918 19 19.78 19 19.5 19m1.186-12.184-7.755-4.562a1.84 1.84 0 0 0-1.862 0L3.314 6.816A.636.636 0 0 0 3.636 8h16.728a.636.636 0 0 0 .322-1.184M18 11v8m-4-8v8m-4-8v8m-4-8v8" />
                      </svg>
                      <span className="flex-1 font-semibold text-sm/5">Pendle PTs</span>
                    </button>

                    {/* Stablecoins */}
                    <button
                      type="button"
                      onClick={() => setActiveTab('stablecoins')}
                      className={`focus-visible:-outline-offset-2 flex w-full items-center gap-3 rounded-xl p-3 text-left transition cursor-pointer ${
                        activeTab === 'stablecoins' ? 'bg-white/6 text-white' : 'text-gray-300 hover:bg-white/6 hover:text-white'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true" className="size-5 shrink-0">
                        <path d="M7 19.5v-3c0-.466 0-.699-.076-.883a1 1 0 0 0-.541-.54C6.199 15 5.966 15 5.5 15s-.699 0-.883.076a1 1 0 0 0-.54.541C4 15.801 4 16.034 4 16.5v3c0 .466 0 .699.076.883a1 1 0 0 0 .541.54c.184.077.417.077.883.077s.699 0 .883-.076a1 1 0 0 0 .54-.541C7 20.199 7 19.966 7 19.5m6.5 0v-9c0-.466 0-.699-.076-.883a1 1 0 0 0-.541-.54C12.699 9 12.466 9 12 9s-.699 0-.883.076a1 1 0 0 0-.54.541c-.077.184-.077.417-.077.883v9c0 .466 0 .699.076.883a1 1 0 0 0 .541.54c.184.077.417.077.883.077s.699 0 .883-.076a1 1 0 0 0 .54-.541c.077-.184.077-.417.077-.883m6.5 0v-15c0-.466 0-.699-.076-.883a1 1 0 0 0-.541-.54C19.199 3 18.966 3 18.5 3s-.699 0-.883.076a1 1 0 0 0-.54.541C17 3.801 17 4.034 17 4.5v15c0 .466 0 .699.076.883a1 1 0 0 0 .541.54c.184.077.417.077.883.077s.699 0 .883-.076a1 1 0 0 0 .54-.541c.077-.184.077-.417.077-.883" />
                      </svg>
                      <span className="flex-1 font-semibold text-sm/5">Stablecoins</span>
                    </button>
                  </div>
                </div>

                {/* Receipts */}
                <button
                  type="button"
                  onClick={() => setActiveTab('receipts')}
                  className={`focus-visible:-outline-offset-2 flex w-full items-center gap-3 rounded-xl p-3 text-left transition cursor-pointer ${
                    activeTab === 'receipts' ? 'bg-white/6 text-white' : 'text-gray-300 hover:bg-white/6 hover:text-white'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" color="currentColor" viewBox="0 0 24 24" aria-hidden="true" className="size-5 shrink-0">
                    <path d="m5.048 8.607-2.51-.153C4.338 3.704 9.503 1 14.54 2.344c5.364 1.433 8.55 6.917 7.117 12.25-1.434 5.332-6.945 8.494-12.31 7.061A10.04 10.04 0 0 1 2 13.485" />
                    <path d="M12 8v4l2 2" />
                  </svg>
                  <span className="flex-1 font-semibold text-sm/5">Receipts</span>
                </button>

                {/* Settings */}
                <button
                  type="button"
                  onClick={() => setActiveTab('settings')}
                  className={`focus-visible:-outline-offset-2 flex w-full items-center gap-3 rounded-xl p-3 text-left transition cursor-pointer ${
                    activeTab === 'settings' ? 'bg-white/6 text-white' : 'text-gray-300 hover:bg-white/6 hover:text-white'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="1.5" color="currentColor" viewBox="0 0 24 24" aria-hidden="true" className="size-5 shrink-0">
                    <path d="M4.5 10c0-3.771 0-5.657 1.172-6.828S8.729 2 12.5 2H14c3.771 0 5.657 0 6.828 1.172S22 6.229 22 10v4c0 3.771 0 5.657-1.172 6.828S17.771 22 14 22h-1.5c-3.771 0-5.657 0-6.828-1.172S4.5 17.771 4.5 14z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 6H2m2.5 6H2m2.5 6H2m13.275-9.507a2 2 0 1 1-4 0 2 2 0 0 1 4 0M9.32 15.716c1.058-1.63 2.739-2.24 3.955-2.239s2.847.61 3.906 2.24c.068.105.087.234.025.344-.247.439-1.016 1.31-1.57 1.369-.638.067-2.307.077-2.36.077s-1.773-.01-2.41-.077c-.556-.06-1.324-.93-1.572-1.37-.061-.109-.043-.238.026-.344" />
                  </svg>
                  <span className="flex-1 font-semibold text-sm/5">Settings</span>
                </button>
              </nav>
            </aside>

            {/* Right Main Area */}
            <div className="min-w-0 flex-1 p-2 pl-0">
              <div className="h-full w-full overflow-hidden rounded-xl bg-white p-6 sm:p-8">
                <section className="h-full select-none">
                  <div className="relative w-full">
                    <div className="mx-auto w-full max-w-176">

                      {/* Header: Position Title + Health factor on left, Sample data badge + Buttons on right */}
                      <header className="pb-8">
                        <div className="flex items-end justify-between gap-6">
                          <div>
                            <h2 className="font-medium text-base/6 text-gray-500 whitespace-nowrap">
                              Position — PT-AUSD loop on Aave V3 (Monad)
                            </h2>
                            <div className="-tracking-[0.04em] mt-1 font-medium text-4xl text-gray-900">
                              Health factor {currentHf}
                            </div>
                          </div>

                          {/* Right column: Sample data badge positioned above the buttons, exactly where the red arrow pointed! */}
                          <div className="flex flex-col items-end gap-3">
                            <span className="rounded bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-[#836EF9] border border-[#836EF9]/25">
                              Sample data
                            </span>

                            {/* Action Buttons: Run shock and Export receipt */}
                            <div className="flex gap-2">
                              {/* Run shock Button */}
                              <button
                                type="button"
                                onClick={() => setActiveTab(activeTab === 'rehearse' ? 'positions' : 'rehearse')}
                                className="relative flex shrink-0 items-center font-medium leading-none tracking-tight transition-transform duration-100 active:scale-[0.97] outline-offset-2 focus-visible:outline-2 h-10 rounded-[10px] px-4 text-sm bg-gray-900 text-white outline-gray-900 hover:bg-gray-700 justify-center cursor-pointer shadow-xs"
                              >
                                <span className="flex items-center gap-2">
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4 shrink-0">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
                                  </svg>
                                  <span>{activeTab === 'rehearse' ? 'Overview' : 'Run shock'}</span>
                                </span>
                              </button>

                              {/* Export receipt Button */}
                              <button
                                type="button"
                                onClick={() => setModalType('receipt')}
                                className="relative flex shrink-0 items-center font-medium leading-none tracking-tight transition-transform duration-100 active:scale-[0.97] outline-offset-2 focus-visible:outline-2 h-10 rounded-[10px] px-4 text-sm bg-gray-900 text-white outline-gray-900 hover:bg-gray-700 justify-center cursor-pointer shadow-xs"
                              >
                                <span className="flex items-center gap-2">
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4 shrink-0">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                  </svg>
                                  <span>Export receipt</span>
                                </span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </header>

                      {/* View Switcher: Positions vs Other Tabs */}
                      <AnimatePresence mode="wait">
                        {/* TAB 1: Positions (Exact Balances Container) */}
                        {activeTab === 'positions' && (
                          <motion.div
                            key="positions-view"
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.15 }}
                          >
                            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-1 pb-1">
                              <div className="px-8 py-3">
                                <h3 className="font-semibold text-gray-900 text-sm/5">Position summary</h3>
                              </div>
                              <ul className="divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200 bg-white">
                                {/* Row 1: Collateral */}
                                <li
                                  onClick={() => setModalType('collateral')}
                                  className="bg-white transition hover:bg-gray-50 cursor-pointer"
                                >
                                  <div className="grid grid-cols-[1.2fr_1.2fr_1fr] px-8 py-5 items-center">
                                    <div className="flex flex-col">
                                      <h4 className="font-semibold text-base/6 text-gray-900 tracking-tight">Collateral</h4>
                                      <p className="font-medium text-gray-500 text-sm/5">PT-AUSD, 1 asset</p>
                                    </div>
                                    <div className="flex min-h-6 items-center">
                                      <div className="flex min-w-0 items-center gap-1.5">
                                        <div className="-space-x-1.5 flex items-center">
                                          <div className="relative inline-block rounded-full outline-2 outline-white size-6">
                                            <div className="relative flex size-full items-center justify-center overflow-hidden rounded-full bg-[#836EF9]/10">
                                              <span className="text-[9px] font-bold text-[#836EF9]">PT</span>
                                            </div>
                                          </div>
                                          <div className="relative inline-block rounded-full outline-2 outline-white size-6">
                                            <div className="relative flex size-full items-center justify-center overflow-hidden rounded-full bg-blue-100">
                                              <span className="text-[8px] font-bold text-blue-700">AU</span>
                                            </div>
                                          </div>
                                        </div>
                                        <span className="font-medium text-gray-500 text-sm/6">Pendle · Aave V3</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-end gap-8 text-right">
                                      <span className="font-semibold text-base/6 text-gray-900 tracking-tight">$250,000</span>
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="size-5 shrink-0 text-gray-900">
                                        <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                                      </svg>
                                    </div>
                                  </div>
                                </li>

                                {/* Row 2: Debt */}
                                <li
                                  onClick={() => setModalType('debt')}
                                  className="bg-white transition hover:bg-gray-50 cursor-pointer"
                                >
                                  <div className="grid grid-cols-[1.2fr_1.2fr_1fr] px-8 py-5 items-center">
                                    <div className="flex flex-col">
                                      <h4 className="font-semibold text-base/6 text-gray-900 tracking-tight">Debt</h4>
                                      <p className="font-medium text-gray-500 text-sm/5">USDC, 1 asset</p>
                                    </div>
                                    <div className="flex min-h-6 items-center">
                                      <div className="flex min-w-0 items-center gap-1.5">
                                        <div className="relative inline-block rounded-full outline-2 outline-white size-6">
                                          <div className="relative flex size-full items-center justify-center overflow-hidden rounded-full">
                                            <img src="/static/icons/token/usdc.svg" alt="USDC" className="size-full object-contain" />
                                          </div>
                                        </div>
                                        <span className="font-medium text-gray-500 text-sm/6">Variable borrow</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-end gap-8 text-right">
                                      <span className="font-semibold text-base/6 text-gray-900 tracking-tight">$230,000</span>
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="size-5 shrink-0 text-gray-900">
                                        <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                                      </svg>
                                    </div>
                                  </div>
                                </li>

                                {/* Row 3: Liquidation distance */}
                                <li
                                  onClick={() => setModalType('liquidation')}
                                  className="bg-white transition hover:bg-gray-50 cursor-pointer"
                                >
                                  <div className="grid grid-cols-[1.2fr_1.2fr_1fr] px-8 py-5 items-center">
                                    <div className="flex flex-col">
                                      <h4 className="font-semibold text-base/6 text-gray-900 tracking-tight">Liquidation distance</h4>
                                      <p className="font-medium text-gray-500 text-sm/5">before health factor hits 1</p>
                                    </div>
                                    <div className="flex min-h-6 items-center">
                                      <div className="flex items-center gap-1.5">
                                        <div className="flex items-center gap-0.5 rounded-md bg-amber-500/15 pr-2 pl-1.5 py-0.5 text-amber-800 text-xs font-semibold">
                                          Buffer zone
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-end gap-8 text-right">
                                      <span className="font-semibold text-base/6 text-gray-900 tracking-tight">
                                        ≈ {currentLiqDistance} bps
                                      </span>
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="size-5 shrink-0 text-gray-900">
                                        <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                                      </svg>
                                    </div>
                                  </div>
                                </li>

                                {/* Row 4: Net carry */}
                                <li
                                  onClick={() => setModalType('carry')}
                                  className="bg-white transition hover:bg-gray-50 cursor-pointer"
                                >
                                  <div className="grid grid-cols-[1.2fr_1.2fr_1fr] px-8 py-5 items-center">
                                    <div className="flex flex-col">
                                      <h4 className="font-semibold text-base/6 text-gray-900 tracking-tight">Net carry</h4>
                                      <p className="font-medium text-gray-500 text-sm/5">after borrow cost</p>
                                    </div>
                                    <div className="flex min-h-6 items-center">
                                      <div className="flex items-center gap-1.5">
                                        <div className="flex items-center gap-1 rounded-md bg-green-600/15 pr-2 pl-1.5 py-0.5 text-green-800 text-xs font-semibold">
                                          <span className="size-1.5 rounded-full bg-green-600" />
                                          Yield carry
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-end gap-8 text-right">
                                      <span className="font-semibold text-base/6 text-green-600 tracking-tight">
                                        +{currentCarry}% APR
                                      </span>
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="size-5 shrink-0 text-gray-900">
                                        <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                                      </svg>
                                    </div>
                                  </div>
                                </li>
                              </ul>
                            </div>

                            {/* Footer chip under the card */}
                            <div className="mt-4 flex items-center justify-between px-2 text-xs text-gray-500 font-medium">
                              <span className="inline-flex items-center gap-1.5">
                                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Data fresh · block 12,345,678 · 4s ago
                              </span>
                              <span className="text-[11px] text-gray-400">Sample data</span>
                            </div>
                          </motion.div>
                        )}

                        {/* TAB 2: Rehearse (Shock Laboratory View) */}
                        {activeTab === 'rehearse' && (
                          <motion.div
                            key="rehearse-view"
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.15 }}
                            className="rounded-2xl border border-gray-200 bg-gray-50 p-6"
                          >
                            <div className="flex items-center justify-between pb-3">
                              <span className="font-semibold text-gray-900 text-sm">Stress-Test Combined Shocks</span>
                              <button
                                type="button"
                                onClick={() => setActiveTab('positions')}
                                className="text-xs text-gray-500 hover:text-gray-900 font-medium cursor-pointer"
                              >
                                ✕ Close
                              </button>
                            </div>

                            {/* Slider 1: AUSD depeg */}
                            <div className="rounded-xl border border-gray-200 bg-white p-4 mb-2 shadow-xs">
                              <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>AUSD depeg shock</span>
                                <span className="font-semibold text-[#836EF9]">{depegBps} bps</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="500"
                                step="10"
                                value={depegBps}
                                onChange={(e) => setDepegBps(Number(e.target.value))}
                                className="w-full accent-[#836EF9] cursor-pointer"
                              />
                              <div className="flex justify-between text-[11px] text-gray-400 mt-1">
                                <span>0 bps</span>
                                <span>250 bps</span>
                                <span>500 bps</span>
                              </div>
                            </div>

                            {/* Slider 2: Borrow rate spike */}
                            <div className="rounded-xl border border-gray-200 bg-white p-4 mt-2 shadow-xs">
                              <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>USDC Borrow rate spike</span>
                                <span className="font-semibold text-[#836EF9]">+{borrowRateSpike}% APR</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="10"
                                step="0.5"
                                value={borrowRateSpike}
                                onChange={(e) => setBorrowRateSpike(Number(e.target.value))}
                                className="w-full accent-[#836EF9] cursor-pointer"
                              />
                              <div className="flex justify-between text-[11px] text-gray-400 mt-1">
                                <span>+0%</span>
                                <span>+5%</span>
                                <span>+10%</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => setActiveTab('actions')}
                              className="mt-4 w-full rounded-xl bg-gray-900 py-3 font-semibold text-sm text-white transition hover:bg-gray-800 cursor-pointer"
                            >
                              Compare your next move →
                            </button>
                          </motion.div>
                        )}

                        {/* TAB 3: Actions (Compare your next move) */}
                        {activeTab === 'actions' && (
                          <motion.div
                            key="actions-view"
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.15 }}
                            className="rounded-2xl border border-gray-200 bg-gray-50 p-6"
                          >
                            <div className="flex items-center justify-between pb-3">
                              <button
                                type="button"
                                onClick={() => setActiveTab('positions')}
                                className="text-xs font-medium text-gray-600 hover:text-black flex items-center gap-1 cursor-pointer"
                              >
                                ← Back to Position summary
                              </button>
                              <span className="font-semibold text-xs text-gray-900 uppercase tracking-wider">
                                Actions
                              </span>
                            </div>

                            <div className="space-y-2">
                              {[
                                { id: 'hold', name: '1. Hold & Monitor', desc: 'Maintain current positioning without rebalancing.', hf: currentHf, carry: `+${currentCarry}%` },
                                { id: 'add-collateral', name: '2. Add Collateral', desc: 'Supply +$20,000 PT-AUSD to widen liquidation buffer.', hf: +(currentHf + 0.11).toFixed(2), carry: `+${(currentCarry - 0.7).toFixed(1)}%` },
                                { id: 'repay', name: '3. Repay USDC Debt', desc: 'Repay $30,000 USDC debt to reduce variable borrow cost.', hf: +(currentHf + 0.15).toFixed(2), carry: `+${(currentCarry - 1.2).toFixed(1)}%` },
                                { id: 'reduce-leverage', name: '4. Reduce Leverage', desc: 'Flash-unwind 25% of the position in one block.', hf: +(currentHf + 0.22).toFixed(2), carry: `+${(currentCarry - 2.8).toFixed(1)}%` },
                                { id: 'roll', name: '5. Hold to Maturity or Roll?', desc: 'Roll PT to next maturity or wait for par redemption.', hf: +(currentHf + 0.05).toFixed(2), carry: `+${(currentCarry + 2.4).toFixed(1)}%` },
                              ].map((item) => (
                                <div
                                  key={item.id}
                                  onClick={() => setSelectedActionId(selectedActionId === item.id ? null : item.id)}
                                  className={`flex items-center justify-between rounded-xl border p-3.5 transition cursor-pointer ${
                                    selectedActionId === item.id ? 'border-[#836EF9] bg-white shadow-xs' : 'border-gray-200 bg-white hover:border-gray-300'
                                  }`}
                                >
                                  <div>
                                    <div className="font-semibold text-sm text-gray-900">{item.name}</div>
                                    <div className="text-xs text-gray-500">{item.desc}</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-semibold text-sm text-gray-900">HF {item.hf}</div>
                                    <div className="text-xs text-green-600 font-medium">{item.carry} APR</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}

                        {/* SUB-TABS: Markets (Aave, Pendle, Stablecoins) & Receipts / Settings */}
                        {(activeTab === 'aave' || activeTab === 'pendle' || activeTab === 'stablecoins' || activeTab === 'receipts' || activeTab === 'settings') && (
                          <motion.div
                            key="sub-view"
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.15 }}
                            className="rounded-2xl border border-gray-200 bg-gray-50 p-6"
                          >
                            <div className="flex items-center justify-between pb-3">
                              <button
                                type="button"
                                onClick={() => setActiveTab('positions')}
                                className="text-xs font-medium text-gray-600 hover:text-black flex items-center gap-1 cursor-pointer"
                              >
                                ← Back to Position summary
                              </button>
                              <span className="font-semibold text-xs text-gray-900 uppercase tracking-wider">
                                {activeTab.toUpperCase()} View
                              </span>
                            </div>

                            {activeTab === 'aave' && (
                              <div className="space-y-2">
                                {[
                                  { name: 'PT-AUSD Collateral Reserve', detail: 'Max LTV 92.5% · Liq. Threshold 95%', val: '$42,500,000' },
                                  { name: 'USDC Variable Debt Pool', detail: 'Variable Borrow 6.20% · Utilization 84.2%', val: '$38,200,000' },
                                ].map((item) => (
                                  <div key={item.name} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3.5">
                                    <div>
                                      <div className="font-semibold text-sm text-gray-900">{item.name}</div>
                                      <div className="text-xs text-gray-500">{item.detail}</div>
                                    </div>
                                    <div className="font-semibold text-sm text-gray-900">{item.val}</div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {activeTab === 'pendle' && (
                              <div className="space-y-2">
                                {[
                                  { name: 'PT-AUSD Maturity', detail: 'Matures 28 Dec 2026', val: '312 days' },
                                  { name: 'Fixed Implied Yield', detail: 'Locked at minting', val: '+18.6% APY' },
                                  { name: 'Par Redemption', detail: 'Redeem at maturity for underlying', val: '1 PT = 1 AUSD' },
                                ].map((item) => (
                                  <div key={item.name} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3.5">
                                    <div>
                                      <div className="font-semibold text-sm text-gray-900">{item.name}</div>
                                      <div className="text-xs text-gray-500">{item.detail}</div>
                                    </div>
                                    <div className="font-semibold text-sm text-gray-900">{item.val}</div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {activeTab === 'stablecoins' && (
                              <div className="space-y-2">
                                {[
                                  { symbol: 'AUSD', name: 'Agora USD', dev: '-0.2 bps', price: '$0.9998' },
                                  { symbol: 'USDC', name: 'USD Coin', dev: '+0.1 bps', price: '$1.0001' },
                                  { symbol: 'USDT0', name: 'Tether Zero', dev: '-0.1 bps', price: '$0.9999' },
                                  { symbol: 'GHO', name: 'GHO Stable', dev: '-6.0 bps', price: '$0.9994' },
                                  { symbol: 'mUSD', name: 'Monad USD', dev: '0.0 bps', price: '$1.0000' },
                                ].map((token) => (
                                  <div key={token.symbol} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3.5">
                                    <div>
                                      <div className="font-semibold text-sm text-gray-900">{token.symbol} ({token.name})</div>
                                      <div className="text-xs text-gray-500">Deviation: {token.dev}</div>
                                    </div>
                                    <div className="font-semibold text-sm text-gray-900">{token.price}</div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {activeTab === 'receipts' && (
                              <div className="space-y-2">
                                {[
                                  { block: '12,345,678', hf: currentHf, hash: '0x89fcb3017a94...1b3e9a' },
                                  { block: '12,345,420', hf: 1.04, hash: '0x43da1290e481...5c2f0b' },
                                  { block: '12,344,100', hf: 1.06, hash: '0x17ba93108c72...09e2fa' },
                                ].map((item) => (
                                  <div
                                    key={item.block}
                                    onClick={() => setModalType('receipt')}
                                    className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3.5 hover:border-gray-300 cursor-pointer"
                                  >
                                    <div>
                                      <div className="font-semibold text-sm text-gray-900">Block {item.block}</div>
                                      <div className="text-xs text-gray-500 font-mono">{item.hash}</div>
                                    </div>
                                    <div className="font-semibold text-sm text-gray-900">HF {item.hf}</div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {activeTab === 'settings' && (
                              <div className="space-y-2">
                                <div className="rounded-xl border border-gray-200 bg-white p-3.5">
                                  <div className="font-semibold text-sm text-gray-900">Health Factor Warning Threshold</div>
                                  <div className="text-xs text-gray-500">1.05 HF</div>
                                </div>
                                <div className="rounded-xl border border-gray-200 bg-white p-3.5">
                                  <div className="font-semibold text-sm text-gray-900">Monad Deterministic RPC</div>
                                  <div className="text-xs text-gray-500">https://testnet-rpc.monad.xyz (Connected)</div>
                                </div>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </figure>

      {/* Action & Drill-Down Modal (Exact near.com Modal Layout & Typography) */}
      <AnimatePresence>
        {modalType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalType(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', duration: 0.35, bounce: 0 }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-gray-900 p-6 text-white shadow-2xl"
            >
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="absolute top-5 right-5 rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white cursor-pointer"
              >
                ✕
              </button>

              {/* Receipt Modal */}
              {modalType === 'receipt' && (
                <div>
                  <div className="flex items-center gap-2.5 pb-4">
                    <MobiusLogo className="size-6 shrink-0" />
                    <div>
                      <h3 className="font-semibold text-lg text-white">Verifiable Decision Receipt</h3>
                      <p className="text-gray-400 text-xs">Block 12,345,678 · Deterministic arithmetic</p>
                    </div>
                  </div>

                  <div className="my-4 rounded-xl border border-white/10 bg-gray-850 p-4 font-mono text-[11px] text-gray-300 max-h-60 overflow-y-auto">
                    <pre>{JSON.stringify({
                      protocol: "Mobius Risk Engine v1.0",
                      strategy: "PT-AUSD loop on Aave V3 (Monad)",
                      block: 12345678,
                      position: {
                        collateral_usd: 250000,
                        debt_usd: 230000,
                        health_factor: currentHf,
                        liquidation_distance_bps: currentLiqDistance,
                        net_carry_apr: `+${currentCarry}%`
                      },
                      verdict: currentHf <= 1.01 ? "reduce leverage" : "hold & monitor",
                      receipt_hash: "0x89fcb3017a94029df4819aa0182491a6d71b3e9a"
                    }, null, 2)}</pre>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyReceipt}
                    className="w-full rounded-xl bg-white py-3 font-semibold text-sm text-gray-900 hover:bg-gray-100 transition cursor-pointer"
                  >
                    {copiedReceipt ? '✓ Copied to Clipboard!' : 'Copy Receipt JSON'}
                  </button>
                </div>
              )}

              {/* Collateral Breakdown Modal */}
              {modalType === 'collateral' && (
                <div>
                  <h3 className="font-semibold text-lg text-white mb-1">Collateral Breakdown</h3>
                  <p className="text-gray-400 text-xs mb-4">PT-AUSD on Aave V3 (Monad)</p>
                  <div className="rounded-xl border border-white/10 bg-gray-850 p-4 space-y-2 text-xs">
                    <div className="flex justify-between"><span className="text-gray-400">Total Supplied:</span><span className="font-semibold">$250,000</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Max LTV:</span><span className="font-semibold">92.5%</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Liquidation Threshold:</span><span className="font-semibold">95.0%</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Maturity:</span><span className="font-semibold">28 Dec 2026</span></div>
                  </div>
                </div>
              )}

              {/* Debt Breakdown Modal */}
              {modalType === 'debt' && (
                <div>
                  <h3 className="font-semibold text-lg text-white mb-1">Debt Breakdown</h3>
                  <p className="text-gray-400 text-xs mb-4">USDC Variable Debt on Monad</p>
                  <div className="rounded-xl border border-white/10 bg-gray-850 p-4 space-y-2 text-xs">
                    <div className="flex justify-between"><span className="text-gray-400">Total Borrowed:</span><span className="font-semibold">$230,000</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Variable Borrow Rate:</span><span className="font-semibold">6.20% APR</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Pool Utilization:</span><span className="font-semibold">84.2%</span></div>
                  </div>
                </div>
              )}

              {/* Liquidation Distance Modal */}
              {modalType === 'liquidation' && (
                <div>
                  <h3 className="font-semibold text-lg text-white mb-1">Liquidation Distance</h3>
                  <p className="text-gray-400 text-xs mb-4">Buffer before Health Factor hits 1.00</p>
                  <div className="rounded-xl border border-white/10 bg-gray-850 p-4 space-y-2 text-xs">
                    <div className="flex justify-between"><span className="text-gray-400">Current Distance:</span><span className="font-semibold">≈ {currentLiqDistance} bps</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Depeg Buffer:</span><span className="font-semibold">290 bps</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Rate Spike Buffer:</span><span className="font-semibold">+4.8% APR</span></div>
                  </div>
                </div>
              )}

              {/* Net Carry Modal */}
              {modalType === 'carry' && (
                <div>
                  <h3 className="font-semibold text-lg text-white mb-1">Net Carry Breakdown</h3>
                  <p className="text-gray-400 text-xs mb-4">Deterministic yield minus borrow drag</p>
                  <div className="rounded-xl border border-white/10 bg-gray-850 p-4 space-y-2 text-xs">
                    <div className="flex justify-between"><span className="text-gray-400">PT Fixed Implied Yield:</span><span className="font-semibold text-green-400">+18.60%</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">USDC Variable Borrow:</span><span className="font-semibold text-red-400">-6.20%</span></div>
                    <div className="flex justify-between border-t border-white/10 pt-1"><span className="text-gray-400">Net Carry:</span><span className="font-semibold text-green-400">+{currentCarry}% APR</span></div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
