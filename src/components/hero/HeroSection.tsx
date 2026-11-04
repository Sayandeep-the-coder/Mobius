'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { HeroMockApp } from './HeroMockApp';

interface HeroSectionProps {
  onOpenAnalyze: () => void;
}

export function HeroSection({ onOpenAnalyze }: HeroSectionProps) {
  return (
    <section id="product" className="relative flex flex-col">
      {/* Background side borders */}
      <div className="pointer-events-none absolute inset-0 z-1 mx-auto w-full max-w-7xl border-black/10 border-x max-xl:border-none" />

      {/* Hero Headline and CTA */}
      <div className="mx-auto flex w-full max-w-7xl flex-col">
        <div className="flex flex-col items-start gap-6 px-6 pt-16 sm:px-8 sm:pt-24 sm:pb-16">
          {/* Eyebrow Pill */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 rounded-full border border-[#836EF9]/30 bg-[#836EF9]/10 px-3.5 py-1.5 text-xs font-semibold text-[#836EF9]"
          >
            <span className="size-2 rounded-full bg-[#836EF9] animate-pulse" />
            Built on Monad · Read-only · Non-custodial
          </motion.div>

          {/* H1 Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="flex-1 text-balance font-medium text-4xl/10 text-gray-900 tracking-tight lg:text-6xl/15"
          >
            <span>
              <span className="inline-block">Rehearse the risk</span>{' '}
              <br />
            </span>
            <span>
              <span className="inline-block text-[#836EF9]">before it happens.</span>
            </span>
          </motion.h1>

          {/* Sub-headline */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
          >
            <p className="max-w-3xl text-balance font-medium text-gray-600 text-lg/7 sm:text-xl/8">
              Mobius turns a leveraged DeFi position into a decision you can rehearse. See how far you are from liquidation, stress-test rate and price shocks, and compare your next move, with the math to prove it.
            </p>
          </motion.div>

          {/* CTA Group */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
          >
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <a
                href="/dashboard"
                className="relative flex shrink-0 items-center justify-center font-semibold leading-none tracking-tight transition-all duration-150 active:scale-[0.97] outline-offset-2 focus-visible:outline-2 h-12 rounded-xl px-6 text-base bg-[#836EF9] text-white hover:bg-[#6E54FF] shadow-lg shadow-[#836EF9]/30 cursor-pointer"
              >
                Launch Dashboard →
              </a>
              <button
                type="button"
                onClick={onOpenAnalyze}
                className="relative flex shrink-0 items-center justify-center font-semibold leading-none tracking-tight transition-all duration-150 active:scale-[0.97] outline-offset-2 focus-visible:outline-2 h-12 rounded-xl px-6 text-base bg-white border border-gray-300 text-gray-800 hover:bg-gray-50 shadow-sm cursor-pointer"
              >
                Analyze a position
              </button>
              <p className="font-medium text-sm sm:text-base text-gray-500">
                Non-custodial · User-authorized · Verified execution
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Hero Mockup with signature Monad Purple gradient backdrop */}
      <div className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0)_10%,#DDD7FE_28%,#C4B5FD_46%,#A594FD_63%,#836EF9_81%,#6E54FF_100%)] opacity-100"
        />

        <div className="mx-auto w-full max-w-7xl overflow-visible px-0 max-xl:px-4 pt-16 pb-12 sm:pt-20 sm:pb-24">
          <HeroMockApp onOpenAnalyze={onOpenAnalyze} />
        </div>
      </div>
    </section>
  );
}
