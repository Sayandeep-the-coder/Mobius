  'use client';

import React from 'react';

const tokens = [
  { symbol: 'MON', name: 'Monad', icon: '/static/icons/token/monad.svg' },
  { symbol: 'AUSD', name: 'Agora USD', icon: '/static/icons/token/usdc.svg' },
  { symbol: 'USDC', name: 'USD Coin', icon: '/static/icons/token/usdc.svg' },
  { symbol: 'USDT0', name: 'Tether Zero', icon: '/static/icons/token/usdt.svg' },
  { symbol: 'GHO', name: 'GHO Stable', icon: '/static/icons/token/usdc.svg' },
  { symbol: 'mUSD', name: 'Monad USD', icon: '/static/icons/token/monad.svg' },
  { symbol: 'PT-AUSD', name: 'Pendle Principal Token', icon: '/static/icons/token/usdc.svg' },
  { symbol: 'AAVE', name: 'Aave V3', icon: '/static/icons/network/ethereum.svg' },
  { symbol: 'PENDLE', name: 'Pendle Finance', icon: '/static/icons/token/monad.svg' },
];

export function ConfidentialSection() {
  return (
    <section className="bg-gray-800">
      <div className="mx-auto w-full max-w-7xl border-white/11 border-x pt-24 max-xl:border-none sm:pt-32">
        {/* Header */}
        <header className="flex flex-col gap-4 px-6 pb-16 sm:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#836EF9]/30 bg-[#836EF9]/10 px-3.5 py-1 text-xs font-semibold text-[#DDD7FE] w-max">
            <span className="size-2 rounded-full bg-[#836EF9]" />
            Safety by Design
          </div>
          <h2 className="text-balance font-medium text-3xl/9 text-white tracking-tight lg:text-[2.5rem]/10">
            Keep control of your funds. Always.
          </h2>
          <p className="max-w-3xl text-balance font-medium text-gray-400 text-lg/7">
            Mobius reads. You decide. No keys, no signing, no custody, and no AI with authority over your money.
          </p>
        </header>

        {/* 3 Value Cards - Exact Replica Layout */}
        <div className="grid gap-px bg-white/11 py-px sm:grid-cols-3">
          {/* Card 1: No keys, no custody */}
          <div className="bg-gray-800">
            <div className="flex flex-col gap-12 p-6 sm:gap-16 sm:p-8">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#836EF9]/10">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" color="currentColor" viewBox="0 0 24 24" aria-hidden="true" className="size-6 text-[#836EF9]">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11 5h7m-8 5 4.5 4.5M5 11v7" opacity="0.4" />
                  <circle cx="6.444" cy="6.444" r="4.444" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="5" cy="20" r="2" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="16" cy="16" r="2" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="20" cy="5" r="2" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </div>
              <div className="flex flex-col gap-0.5">
                <h3 className="font-medium text-lg/7 text-white tracking-tight">No keys, no custody</h3>
                <p className="text-pretty font-medium text-gray-400 text-sm/5">
                  Paste a public address. Mobius never asks for a seed phrase, a private key or a signature.
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: Math you can check */}
          <div className="bg-gray-800">
            <div className="flex flex-col gap-12 p-6 sm:gap-16 sm:p-8">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#836EF9]/10">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" color="currentColor" viewBox="0 0 24 24" aria-hidden="true" className="size-6 text-[#836EF9]">
                  <path stroke="currentColor" strokeWidth="1.5" d="M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10Z" />
                  <path stroke="currentColor" strokeLinejoin="round" strokeWidth="1.5" d="M5 20 19 5" />
                  <path stroke="currentColor" strokeLinejoin="round" strokeWidth="1.5" d="m16 9 6 4.853m-9.587-1.447 6.947 5.957M8 15.667l7 5.833" opacity="0.4" />
                </svg>
              </div>
              <div className="flex flex-col gap-0.5">
                <h3 className="font-medium text-lg/7 text-white tracking-tight">Math you can check</h3>
                <p className="text-pretty font-medium text-gray-400 text-sm/5">
                  Health factor, yield and costs come from deterministic code and protocol data, not from an AI guess. Every result ships with its formulas and inputs.
                </p>
              </div>
            </div>
          </div>

          {/* Card 3: You approve every move */}
          <div className="bg-gray-800">
            <div className="flex flex-col gap-12 p-6 sm:gap-16 sm:p-8">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#836EF9]/10">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" color="currentColor" viewBox="0 0 24 24" aria-hidden="true" className="size-6 text-[#836EF9]">
                  <circle cx="12" cy="19" r="2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" opacity="0.4" />
                  <circle cx="4" cy="19" r="2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                  <circle cx="16" cy="12" r="2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                  <circle cx="8" cy="12" r="2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                  <circle cx="12" cy="5" r="2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" opacity="0.4" />
                  <circle cx="20" cy="19" r="2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                </svg>
              </div>
              <div className="flex flex-col gap-0.5">
                <h3 className="font-medium text-lg/7 text-white tracking-tight">You approve every move</h3>
                <p className="text-pretty font-medium text-gray-400 text-sm/5">
                  Mobius recommends. You open the protocol and act yourself. Stale or missing data? Mobius says &ldquo;not enough data&rdquo; instead of guessing.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Continuous Animated Token Ticker with Right-Half Frosted Glass Privacy Overlay */}
        <div aria-hidden="true" className="relative h-28 overflow-hidden">
          <div className="flex h-full items-center [mask-image:linear-gradient(to_right,rgba(0,0,0,0.02),black_5%,black_95%,rgba(0,0,0,0.02))]">
            <div className="flex w-max shrink-0 animate-ticker-right will-change-transform">
              <div className="flex shrink-0 items-center gap-14 px-7">
                {tokens.map((token, i) => (
                  <div key={i} className="relative inline-block shrink-0 rounded-full outline-1 outline-white/10 size-12">
                    <div className="relative flex size-full items-center justify-center overflow-hidden rounded-full">
                      <div className="absolute inset-px rounded-full bg-white" />
                      <img
                        src={token.icon}
                        alt={token.symbol}
                        className="-outline-offset-1 relative size-full rounded-full object-contain outline-1 outline-white/10"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex shrink-0 items-center gap-14 px-7" aria-hidden="true">
                {tokens.map((token, i) => (
                  <div key={`dup-${i}`} className="relative inline-block shrink-0 rounded-full outline-1 outline-white/10 size-12">
                    <div className="relative flex size-full items-center justify-center overflow-hidden rounded-full">
                      <div className="absolute inset-px rounded-full bg-white" />
                      <img
                        src={token.icon}
                        alt={token.symbol}
                        className="-outline-offset-1 relative size-full rounded-full object-contain outline-1 outline-white/10"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Frosted Glass Privacy Veil on Right 50% */}
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-1/2 overflow-hidden bg-gray-800/20 backdrop-blur-md backdrop-saturate-150">
            <div className="absolute inset-0 bg-gradient-to-br from-white/6 via-transparent to-white/2" />
            <div className="absolute inset-y-0 left-0 w-px bg-white/10 shadow-[0_0_24px_rgba(255,255,255,0.08)]" />
          </div>
        </div>

        {/* Signature Star Tile Pattern Divider */}
        <div className="border-white/11 border-y">
          <div className="near-star-tile-mask h-32 bg-white/10" />
        </div>
      </div>
    </section>
  );
}
