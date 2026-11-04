'use client';

import React from 'react';

const builtWithPartners = [
  { name: 'Monad', label: 'Monad', sub: 'High-speed EVM' },
  { name: 'Aave V3', label: 'Aave V3', sub: 'Liquidity & E-Mode' },
  { name: 'Pendle', label: 'Pendle', sub: 'PT Tokenization' },
  { name: 'TypeSafe Jev', label: 'TypeSafe Jev', sub: 'Constrained Model' },
  { name: 'viem', label: 'viem', sub: 'Deterministic RPC' },
  { name: 'Supabase', label: 'Supabase', sub: 'Verifiable Store' },
];

export function InfrastructureSection() {
  return (
    <section id="how-it-works" className="bg-gray-800">
      <div className="mx-auto w-full max-w-7xl border-white/11 border-x pt-24 max-xl:border-none sm:pt-32">
        {/* Header */}
        <header className="flex flex-col gap-4 px-6 pb-16 sm:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#836EF9]/30 bg-[#836EF9]/10 px-3.5 py-1 text-xs font-semibold text-[#DDD7FE] w-max">
            <span className="size-2 rounded-full bg-[#836EF9]" />
            How Mobius Works
          </div>
          <h2 className="text-balance font-medium text-3xl/9 text-white tracking-tight lg:text-[2.5rem]/10">
            Four steps from raw chain data to a decision you can defend.
          </h2>
          <p className="max-w-3xl text-balance font-medium text-gray-400 text-lg/7">
            Code does the math and enforces safety. An optional decision model helps rank only what code has already approved.
          </p>
        </header>

        {/* 4 Infrastructure Cards - Exact Replica 4-column layout */}
        <div className="grid gap-px bg-white/11 py-px sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Read the chain */}
          <div className="group relative bg-gray-800 focus-visible:outline-none">
            <div className="absolute inset-0 group-hover:bg-white/2 transition" />
            <div className="relative flex flex-col justify-between gap-12 p-6 sm:gap-16 sm:p-8 h-full">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 512 512" aria-hidden="true" className="size-10 shrink-0">
                <rect width="512" height="512" fill="#836EF9" rx="110" />
                <path fill="#fff" d="M128 160h256v32H128zm0 80h256v32H128zm0 80h256v32H128z" />
              </svg>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-lg/7 text-white tracking-tight">Read the chain</h3>
                  <span className="font-mono text-xs text-gray-500 font-bold">01</span>
                </div>
                <p className="text-pretty font-medium text-gray-400 text-sm/5">
                  Position, rates and oracle prices are read at a single block, with freshness shown. Mixed-block data is rejected.
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: Calculate and rehearse */}
          <div className="group relative bg-gray-800 focus-visible:outline-none">
            <div className="absolute inset-0 group-hover:bg-white/2 transition" />
            <div className="relative flex flex-col justify-between gap-12 p-6 sm:gap-16 sm:p-8 h-full">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 512 512" aria-hidden="true" className="size-10 shrink-0">
                <rect width="512" height="512" fill="#6E54FF" rx="110" />
                <path fill="#fff" d="M192 128h128v64H192zm-64 96h256v64H128zm32 96h192v64H160z" />
              </svg>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-lg/7 text-white tracking-tight">Calculate &amp; rehearse</h3>
                  <span className="font-mono text-xs text-gray-500 font-bold">02</span>
                </div>
                <p className="text-pretty font-medium text-gray-400 text-sm/5">
                  A deterministic risk engine computes health factor, net yield and combined-shock scenarios using the protocol&apos;s own rules.
                </p>
              </div>
            </div>
          </div>

          {/* Card 3: Filter for safety */}
          <div className="group relative bg-gray-800 focus-visible:outline-none">
            <div className="absolute inset-0 group-hover:bg-white/2 transition" />
            <div className="relative flex flex-col justify-between gap-12 p-6 sm:gap-16 sm:p-8 h-full">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 512 512" aria-hidden="true" className="size-10 shrink-0">
                <rect width="512" height="512" fill="#836EF9" fillOpacity="0.2" rx="110" />
                <path stroke="#DDD7FE" strokeWidth="28" strokeLinecap="round" strokeLinejoin="round" d="M140 180h232L292 284v100l-72-40V284L140 180z" />
              </svg>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-lg/7 text-white tracking-tight">Filter for safety</h3>
                  <span className="font-mono text-xs text-gray-500 font-bold">03</span>
                </div>
                <p className="text-pretty font-medium text-gray-400 text-sm/5">
                  Actions that are infeasible, rely on stale data or break your limits are removed before any AI is consulted.
                </p>
              </div>
            </div>
          </div>

          {/* Card 4: Decide and keep a receipt */}
          <div className="group relative bg-gray-800 focus-visible:outline-none">
            <div className="absolute inset-0 group-hover:bg-white/2 transition" />
            <div className="relative flex flex-col justify-between gap-12 p-6 sm:gap-16 sm:p-8 h-full">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 512 512" aria-hidden="true" className="size-10 shrink-0">
                <rect width="512" height="512" fill="#5432D3" rx="110" />
                <path fill="#DDD7FE" d="M160 128h192v256H160zm32 48h128v24H192zm0 48h128v24H192zm0 48h80v24H192z" />
              </svg>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-lg/7 text-white tracking-tight">Decide &amp; keep a receipt</h3>
                  <span className="font-mono text-xs text-gray-500 font-bold">04</span>
                </div>
                <p className="text-pretty font-medium text-gray-400 text-sm/5">
                  An optional Jev decision layer ranks the survivors or flags the case for review. Low confidence falls back to rules. You get a decision receipt.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Built with logo row & 3 Stats Row */}
        <div className="col-span-3 bg-white/11">
          {/* Partner Logos Row */}
          <div className="border-white/11 border-b bg-gray-800">
            {/* Desktop View */}
            <div className="hidden items-center justify-between px-8 py-12 lg:flex">
              {builtWithPartners.map((item) => (
                <div key={item.name} className="flex flex-col items-center justify-center opacity-70 hover:opacity-100 transition">
                  <span className="font-extrabold text-base tracking-tight text-white">{item.label}</span>
                  <span className="text-[11px] font-medium text-gray-400">{item.sub}</span>
                </div>
              ))}
            </div>

            {/* Mobile / Tablet Infinite Marquee */}
            <div className="overflow-hidden py-12 lg:hidden">
              <div className="flex w-max shrink-0 animate-ticker-left items-center gap-12 px-6">
                {[...builtWithPartners, ...builtWithPartners].map((item, index) => (
                  <div key={index} className="flex flex-col items-center justify-center opacity-70">
                    <span className="font-extrabold text-base tracking-tight text-white">{item.label}</span>
                    <span className="text-[11px] font-medium text-gray-400">{item.sub}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 3 Metrics (replacing 10,000 TPS / 1 Second / 100%) */}
          <div className="grid gap-px sm:grid-cols-3">
            <div className="flex flex-col bg-gray-800 px-6 pt-12 pb-6 sm:px-8 sm:pt-16 sm:pb-8">
              <span className="font-medium text-4xl/10 text-white tracking-tighter">0</span>
              <span className="font-medium text-base/6 text-gray-400">keys, signatures or custody</span>
            </div>
            <div className="flex flex-col bg-gray-800 px-6 pt-12 pb-6 sm:px-8 sm:pt-16 sm:pb-8">
              <span className="font-medium text-4xl/10 text-white tracking-tighter">5</span>
              <span className="font-medium text-base/6 text-gray-400">actions compared side by side</span>
            </div>
            <div className="flex flex-col bg-gray-800 px-6 pt-12 pb-6 sm:px-8 sm:pt-16 sm:pb-8">
              <span className="font-medium text-4xl/10 text-white tracking-tighter">1</span>
              <span className="font-medium text-base/6 text-gray-400">verifiable receipt per decision</span>
            </div>
          </div>
        </div>

        {/* Signature Star Tile Pattern Divider */}
        <div className="border-white/11 border-t">
          <div className="near-star-tile-mask h-32 bg-white/10" />
        </div>
      </div>
    </section>
  );
}
