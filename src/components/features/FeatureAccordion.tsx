'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FeatureItem {
  id: number;
  title: string;
  badge?: string;
  subtitle: string;
}

const features: FeatureItem[] = [
  {
    id: 0,
    title: 'See your real position',
    subtitle:
      'Paste a public address and read collateral, debt, rates and oracle prices from one block.',
  },
  {
    id: 1,
    title: 'Stress-test combined shocks',
    subtitle:
      'Move borrow rate, collateral price, stablecoin peg and exit liquidity together, not one at a time.',
  },
  {
    id: 2,
    title: 'Know your distance to liquidation',
    subtitle:
      'Health factor is one number. Mobius translates it into what you can act on: how many basis points of depeg or how many points of borrow rate separate you from liquidation or negative carry.',
  },
  {
    id: 3,
    title: 'Compare your next move',
    subtitle:
      'Hold, add collateral, repay, reduce leverage, roll, or exit, each with post-action risk, cost and yield side by side.',
  },
  {
    id: 4,
    title: 'Hold to maturity, or roll?',
    subtitle:
      'See what happens if you simply wait for the PT to mature, and what a roll to the next maturity would cost.',
  },
  {
    id: 5,
    title: 'Telegram alerts',
    badge: 'Coming soon',
    subtitle:
      'One-line verdicts when your distance to liquidation or net carry crosses your line.',
  },
  {
    id: 6,
    title: 'Overlay on Aave & Pendle',
    badge: 'Coming soon',
    subtitle:
      'See "after this action" risk before you click confirm.',
  },
];

export function FeatureAccordion() {
  // Default to index 2 (item 3: Know your distance to liquidation) as specified
  const [activeIdx, setActiveIdx] = useState(2);

  // Card 1: Combined shock sliders
  const [shockRate, setShockRate] = useState(3.5);
  const [shockDepeg, setShockDepeg] = useState(200);

  // Card 2: AUSD depeg slider
  const [depegSlider, setDepegSlider] = useState(250);
  const hfCurrent = (1.03 - (depegSlider / 500) * 0.02).toFixed(2);
  const netCarryCurrent = (12.4 - (depegSlider / 250) * 4.3).toFixed(1);
  const liqDistanceCurrent = Math.max(10, Math.round(290 - (depegSlider / 250) * 250));

  // Card 3: Action selection
  const [selectedMove, setSelectedMove] = useState<'hold' | 'repay' | 'unwind' | 'roll'>('unwind');

  return (
    <section id="product" className="mx-auto w-full max-w-7xl border-black/11 border-x pt-24 max-xl:border-none sm:pt-32">
      {/* Header */}
      <header className="flex flex-col gap-4 px-6 pb-16 sm:px-8">
        <h2 className="text-balance font-medium text-3xl/9 text-gray-900 tracking-tight lg:text-[2.5rem]/10">
          Your position always had more to tell you. Now it can.
        </h2>
        <p className="text-balance font-medium text-gray-500 text-lg/7">
          See the risk, test the shocks, and choose your next move, without giving anything control of your funds.
        </p>
      </header>

      {/* 2-Column Layout */}
      <div className="lg:grid lg:grid-cols-2 lg:items-stretch">
        {/* Accordion List (Left Column) */}
        <div className="divide-y divide-black/11 border-black/11 border-y">
          {features.map((item, index) => {
            const isOpen = activeIdx === index;
            return (
              <div
                key={item.id}
                className={`transition-colors duration-150 ${isOpen ? 'bg-gray-50' : 'hover:bg-gray-50/50'}`}
              >
                <button
                  type="button"
                  onClick={() => setActiveIdx(index)}
                  className="flex w-full flex-wrap items-baseline justify-between gap-x-4 gap-y-2 px-6 py-6 text-left transition-[padding] duration-150 focus-visible:outline-none sm:px-8 cursor-pointer"
                >
                  <span className="font-medium text-gray-900 text-xl/7 tracking-tight">
                    {item.title}
                  </span>
                  {item.badge && (
                    <span className="whitespace-nowrap font-semibold text-[#836EF9] text-xs rounded-full bg-[#836EF9]/10 border border-[#836EF9]/25 px-2 py-0.5">
                      {item.badge}
                    </span>
                  )}
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      className="overflow-hidden"
                    >
                      <p className="text-pretty px-6 pb-6 font-medium text-base/6 text-gray-500 sm:px-8">
                        {item.subtitle}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Dynamic Interactive Card (Right Column) with signature Monad Purple gradient */}
        <div className="relative flex min-h-[480px] items-center justify-center bg-[linear-gradient(180deg,#836EF9_0%,#6E54FF_50%,#200052_100%)] p-6 sm:p-10 lg:min-h-0">
          <AnimatePresence mode="wait">
            {/* Card 0: See your real position (Exact Near Swap-style UI with White Background) */}
            {activeIdx === 0 && (
              <motion.div
                key="card-position"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-[min(85vw,26rem)] space-y-2 rounded-2xl bg-white p-2.5 text-gray-900 shadow-2xl border border-black/5"
              >
                {/* Panel 1: Position Collateral & Debt (Exact Near Swap Style) */}
                <div className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-gray-50/90 p-4">
                  {/* Collateral Asset */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative inline-block size-11">
                        <div className="relative flex size-full items-center justify-center overflow-hidden rounded-full bg-white shadow-xs border border-gray-200">
                          <div className="-space-x-1 flex items-center">
                            <span className="size-5 rounded-full bg-[#836EF9]/15 flex items-center justify-center text-[8px] font-bold text-[#836EF9]">PT</span>
                            <span className="size-5 rounded-full bg-blue-100 flex items-center justify-center text-[7px] font-bold text-blue-700">AU</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <div className="font-semibold text-base/5 text-gray-900 tracking-tight">250,000 PT-AUSD</div>
                        <div className="font-medium text-gray-500 text-xs">Collateral · Pendle (Aave V3)</div>
                      </div>
                    </div>
                    <div className="font-semibold text-base/5 text-gray-900 text-right">
                      $250,000
                    </div>
                  </div>

                  {/* Looping / Borrowing Connector */}
                  <div className="flex items-center justify-between px-2">
                    <div className="h-px flex-1 bg-gray-200" />
                    <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white border border-gray-200 text-[11px] font-medium text-gray-500 shadow-2xs">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-3 text-[#836EF9]">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" />
                      </svg>
                      <span>Variable borrow</span>
                    </div>
                    <div className="h-px flex-1 bg-gray-200" />
                  </div>

                  {/* Debt Asset */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative inline-block size-11">
                        <div className="relative flex size-full items-center justify-center overflow-hidden rounded-full bg-white shadow-xs border border-gray-200 p-1">
                          <img
                            src="/static/icons/token/usdc.svg"
                            alt="USDC"
                            className="size-full object-contain"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <div className="font-semibold text-base/5 text-gray-900 tracking-tight">230,000 USDC</div>
                        <div className="font-medium text-gray-500 text-xs">Debt · 6.20% Variable APR</div>
                      </div>
                    </div>
                    <div className="font-semibold text-base/5 text-gray-900 text-right">
                      $230,000
                    </div>
                  </div>
                </div>

                {/* Panel 2: Verified Position Metrics (Exact Near Rate/Slippage Style) */}
                <div className="flex flex-col gap-2 rounded-xl border border-gray-100 bg-gray-50/90 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-gray-500 text-xs">Oracle price</div>
                    <div className="text-right font-semibold text-xs text-gray-900 font-mono">1 PT-AUSD = 0.9998 USD</div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-gray-500 text-xs">Health factor</div>
                    <div className="text-right font-semibold text-xs text-[#836EF9] font-mono">1.03 (Safe)</div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-gray-500 text-xs">Liquidation distance</div>
                    <div className="text-right font-semibold text-xs text-gray-900 font-mono">≈ 290 bps</div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-gray-500 text-xs">Net carry</div>
                    <div className="text-right font-semibold text-xs text-emerald-600 font-mono">+12.4% APR</div>
                  </div>
                </div>

                {/* Panel 3: Single-Block Guarantee (Exact Near Swap successful footer Style) */}
                <div className="flex items-center justify-between rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-3.5 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xs">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-3">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="whitespace-nowrap font-semibold text-xs text-emerald-950">
                      Single-block sync · Block 12,345,678
                    </p>
                  </div>
                  <span className="text-[10px] font-medium text-emerald-700/80">Sample data</span>
                </div>
              </motion.div>
            )}

            {/* Card 1: Stress-test combined shocks */}
            {activeIdx === 1 && (
              <motion.div
                key="card-shocks"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-[min(85vw,26rem)] space-y-3 rounded-2xl bg-white p-5 text-gray-900 shadow-2xl border border-black/5"
              >
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <span className="font-semibold text-sm text-gray-900">Combined Shock Stress-Test</span>
                  <span className="rounded bg-[#836EF9]/10 px-2 py-0.5 text-xs font-semibold text-[#836EF9] border border-[#836EF9]/20">
                    Multi-Variable
                  </span>
                </div>

                {/* Slider 1: Borrow rate */}
                <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3.5 space-y-2">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span className="font-medium">Borrow Rate Spike</span>
                    <span className="font-bold text-[#836EF9]">+{shockRate}% APR</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.5"
                    value={shockRate}
                    onChange={(e) => setShockRate(Number(e.target.value))}
                    className="w-full accent-[#836EF9] cursor-pointer"
                  />
                </div>

                {/* Slider 2: Depeg */}
                <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3.5 space-y-2">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span className="font-medium">AUSD Depeg Shock</span>
                    <span className="font-bold text-[#836EF9]">{shockDepeg} bps</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="500"
                    step="25"
                    value={shockDepeg}
                    onChange={(e) => setShockDepeg(Number(e.target.value))}
                    className="w-full accent-[#836EF9] cursor-pointer"
                  />
                </div>

                {/* Combined Impact Results */}
                <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3.5 text-xs space-y-2 font-mono">
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-sans">Post-shock HF:</span>
                    <span className="font-bold text-amber-600">
                      1.03 → {(1.03 - (shockRate * 0.01) - (shockDepeg * 0.00008)).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-sans">Post-shock Net Carry:</span>
                    <span className="font-bold text-emerald-600">
                      +12.4% → +{(12.4 - (shockRate * 1.2) - (shockDepeg * 0.012)).toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="text-[10px] text-gray-400 text-right">
                  Sample data
                </div>
              </motion.div>
            )}

            {/* Card 2: Know your distance to liquidation (The primary specified card) */}
            {activeIdx === 2 && (
              <motion.div
                key="card-distance"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-[min(85vw,26rem)] space-y-3.5 rounded-2xl bg-white p-5 text-gray-900 shadow-2xl border border-black/5"
              >
                {/* Card Header: PT-AUSD loop · Rehearsal + status chip Sample */}
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <span className="font-semibold text-sm text-gray-900">PT-AUSD loop · Rehearsal</span>
                  <span className="rounded bg-purple-50 px-2 py-0.5 text-xs font-semibold text-[#836EF9] border border-[#836EF9]/25">
                    Sample
                  </span>
                </div>

                {/* Slider: AUSD depeg (0 bps ... 500 bps, current 250 bps) */}
                <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-4 space-y-3">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span className="font-medium">AUSD depeg</span>
                    <span className="font-bold text-[#836EF9]">{depegSlider} bps</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="500"
                    step="25"
                    value={depegSlider}
                    onChange={(e) => setDepegSlider(Number(e.target.value))}
                    className="w-full accent-[#836EF9] cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-gray-400">
                    <span>0 bps</span>
                    <span>250 bps</span>
                    <span>500 bps</span>
                  </div>
                </div>

                {/* Rows */}
                <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-4 space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Health factor:</span>
                    <span className="font-semibold text-gray-900 font-mono">
                      1.03 → <strong className={+hfCurrent <= 1.01 ? 'text-red-500 font-bold' : 'text-[#836EF9] font-bold'}>{hfCurrent}</strong> <span className="text-[10px] text-gray-400 font-normal">[SAMPLE]</span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Net carry:</span>
                    <span className="font-semibold text-gray-900 font-mono">
                      +12.4% → <strong className="text-emerald-600 font-bold">+{netCarryCurrent}%</strong> <span className="text-[10px] text-gray-400 font-normal">[SAMPLE]</span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Liquidation distance:</span>
                    <span className="font-semibold text-gray-900 font-mono">
                      290 bps → <strong className={liqDistanceCurrent <= 50 ? 'text-red-500 font-bold' : 'text-[#836EF9] font-bold'}>{liqDistanceCurrent} bps</strong> <span className="text-[10px] text-gray-400 font-normal">[SAMPLE]</span>
                    </span>
                  </div>
                </div>

                {/* Footer line */}
                <div className="rounded-xl border border-[#836EF9]/20 bg-purple-50/80 p-3 text-xs space-y-1">
                  <div className="flex justify-between font-medium">
                    <span className="text-gray-600">Recommended:</span>
                    <span className="font-semibold text-[#836EF9]">reduce leverage</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">Confidence:</span>
                    <span className="text-amber-700 font-medium">escalate to review</span>
                  </div>
                  <div className="text-[10px] text-gray-400 text-right pt-0.5">
                    Sample data
                  </div>
                </div>
              </motion.div>
            )}

            {/* Card 3: Compare your next move */}
            {activeIdx === 3 && (
              <motion.div
                key="card-moves"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-[min(85vw,26rem)] space-y-3 rounded-2xl bg-white p-5 text-gray-900 shadow-2xl border border-black/5"
              >
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <span className="font-semibold text-sm text-gray-900">Action Decision Matrix</span>
                  <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
                    Side by Side
                  </span>
                </div>

                <div className="space-y-2">
                  {[
                    { id: 'hold', label: 'Hold & Monitor', postHf: '1.01', carry: '+8.1%', cost: '$0', risk: 'Elevated' },
                    { id: 'repay', label: 'Repay Debt ($30k)', postHf: '1.16', carry: '+6.9%', cost: '$0.22', risk: 'Low' },
                    { id: 'unwind', label: 'Reduce Leverage (25%)', postHf: '1.24', carry: '+5.2%', cost: '8 bps', risk: 'Minimal' },
                    { id: 'roll', label: 'Roll to Dec 27', postHf: '1.06', carry: '+11.2%', cost: '12 bps', risk: 'Moderate' },
                  ].map((move) => (
                    <div
                      key={move.id}
                      onClick={() => setSelectedMove(move.id as any)}
                      className={`flex items-center justify-between rounded-xl p-3 text-xs transition cursor-pointer ${
                        selectedMove === move.id ? 'border-2 border-[#836EF9] bg-purple-50/50 shadow-xs' : 'border border-gray-200 bg-gray-50/80 hover:bg-gray-100'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-gray-900">{move.label}</div>
                        <div className="text-[11px] text-gray-500">Cost: {move.cost} · Risk: {move.risk}</div>
                      </div>
                      <div className="text-right font-mono">
                        <div className="font-semibold text-gray-900">HF {move.postHf}</div>
                        <div className="text-emerald-600 font-semibold text-[11px]">{move.carry}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-[#836EF9]/25 bg-purple-50 p-2.5 text-xs text-center font-medium text-[#836EF9]">
                  Jev Rank #1: Reduce leverage (flash-unwind 25% of position)
                </div>

                <div className="text-[10px] text-gray-400 text-right">
                  Sample data
                </div>
              </motion.div>
            )}

            {/* Card 4: Hold to maturity, or roll? */}
            {activeIdx === 4 && (
              <motion.div
                key="card-maturity"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-[min(85vw,26rem)] space-y-4 rounded-2xl bg-white p-5 text-gray-900 shadow-2xl border border-black/5"
              >
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <span className="font-semibold text-sm text-gray-900">PT Maturity &amp; Roll Calculator</span>
                  <span className="rounded bg-purple-50 px-2 py-0.5 text-xs font-semibold text-[#836EF9] border border-[#836EF9]/20">
                    Tenor Analysis
                  </span>
                </div>

                {/* Option A: Hold to Maturity */}
                <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3.5 space-y-1.5 text-xs">
                  <div className="flex justify-between font-semibold text-gray-900">
                    <span>Option A: Hold to Maturity</span>
                    <span className="text-emerald-600 font-bold">Zero Price Risk</span>
                  </div>
                  <div className="text-gray-500 text-[11px]">
                    Wait for PT to mature on 28 Dec 2026. Redeem at 1:1 par for $250,000 AUSD.
                  </div>
                  <div className="flex justify-between font-mono pt-1 text-[11px]">
                    <span className="text-gray-500 font-sans">Days to maturity:</span>
                    <span className="text-gray-900 font-semibold">312 days</span>
                  </div>
                </div>

                {/* Option B: Roll */}
                <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3.5 space-y-1.5 text-xs">
                  <div className="flex justify-between font-semibold text-gray-900">
                    <span>Option B: Roll to Dec 2027</span>
                    <span className="text-[#836EF9] font-bold">Extend Tenor</span>
                  </div>
                  <div className="text-gray-500 text-[11px]">
                    Roll PT into the next maturity pool to lock in extended yield carry.
                  </div>
                  <div className="flex justify-between font-mono pt-1 text-[11px]">
                    <span className="text-gray-500 font-sans">Roll friction:</span>
                    <span className="text-gray-900 font-semibold">≈ 12 bps execution</span>
                  </div>
                </div>

                <div className="text-[10px] text-gray-400 text-right">
                  Sample data
                </div>
              </motion.div>
            )}

            {/* Card 5: Telegram alerts */}
            {activeIdx === 5 && (
              <motion.div
                key="card-telegram"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-[min(85vw,26rem)] space-y-4 rounded-2xl bg-white p-5 text-gray-900 shadow-2xl border border-black/5"
              >
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <span className="font-semibold text-sm text-gray-900">Telegram Alert Verdicts</span>
                  <span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
                    Coming soon
                  </span>
                </div>

                <div className="rounded-xl bg-gray-50 p-4 text-xs space-y-2 border border-gray-200">
                  <div className="flex items-center justify-between text-gray-500 text-[11px]">
                    <span className="font-bold text-[#836EF9]">Mobius Risk Sentinel</span>
                    <span>Just now</span>
                  </div>
                  <div className="font-semibold text-gray-900">
                    ⚠️ Liquidation Buffer Warning (Monad)
                  </div>
                  <p className="text-gray-600 text-[11px] leading-relaxed">
                    Distance to liquidation for <strong>PT-AUSD loop</strong> dropped to <strong>40 bps</strong> (Health factor: 1.01).
                  </p>
                  <div className="rounded bg-amber-50 border border-amber-200 p-2 font-mono text-[10px] text-amber-800">
                    Recommendation: Reduce leverage or add $15k collateral.
                  </div>
                </div>

                <p className="text-center text-[11px] text-gray-500">
                  Instant one-line verdicts delivered before onchain liquidation occurs.
                </p>
              </motion.div>
            )}

            {/* Card 6: Overlay on Aave & Pendle */}
            {activeIdx === 6 && (
              <motion.div
                key="card-overlay"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-[min(85vw,26rem)] space-y-4 rounded-2xl bg-white p-5 text-gray-900 shadow-2xl border border-black/5"
              >
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <span className="font-semibold text-sm text-gray-900">Protocol Overlay Extension</span>
                  <span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
                    Coming soon
                  </span>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3 text-xs">
                  <div className="flex justify-between items-center text-gray-500 text-[11px]">
                    <span className="font-medium">Aave V3 Monad Deposit Modal</span>
                    <span className="text-[#836EF9] font-bold">Mobius Active</span>
                  </div>
                  <div className="space-y-1.5 font-mono">
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-sans">Current Health Factor:</span>
                      <span className="text-gray-900 font-semibold">1.15</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-sans">Post-Action Health Factor:</span>
                      <span className="text-amber-600 font-bold">1.03 (⚠️ Buffer shrinks)</span>
                    </div>
                  </div>
                  <div className="rounded bg-amber-50 border border-amber-200 p-2 text-[11px] text-amber-800">
                    See post-action risk before you sign the transaction.
                  </div>
                </div>

                <p className="text-center text-[11px] text-gray-500">
                  Seamless browser extension HUD injected directly into protocol interfaces.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Star tile separator mask */}
      <div className="near-star-tile-mask mask-repeat mask-size-[21px_21px] h-32 bg-black/9" />
    </section>
  );
}
