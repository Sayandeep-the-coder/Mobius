'use client';

import React from 'react';

interface CtaBannerProps {
  onOpenAnalyze: () => void;
}

export function CtaBanner({ onOpenAnalyze }: CtaBannerProps) {
  return (
    <>
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#836EF9_0%,#6E54FF_55%,#200052_100%)] text-white">
        {/* Subtle background glow */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(221,215,254,0.25),transparent_60%)]" />

        <div className="relative mx-auto flex w-full max-w-7xl flex-col items-start gap-4 border-white/10 border-x px-6 py-24 max-xl:border-none sm:px-8 sm:py-32">
          {/* Eyebrow pill */}
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1 text-xs font-semibold text-white backdrop-blur-md border border-white/20">
            <span className="size-2 rounded-full bg-white animate-pulse" />
            Mobius
          </div>

          {/* H2 */}
          <h2 className="flex-1 text-balance font-medium text-3xl/9 text-white tracking-tight lg:text-[2.5rem]/10">
            Your next move, rehearsed in seconds.
          </h2>

          {/* Sub */}
          <p className="text-balance font-medium text-white/80 text-lg/7">
            No wallet connection. No keys. Pick a position and run your first shock.
          </p>

          {/* Button */}
          <button
            type="button"
            onClick={onOpenAnalyze}
            className="mt-3 relative flex shrink-0 items-center justify-center font-semibold leading-none tracking-tight transition-all duration-150 active:scale-[0.97] outline-offset-2 focus-visible:outline-2 h-12 rounded-xl px-6 text-base bg-white text-gray-950 hover:bg-gray-100 shadow-xl cursor-pointer"
          >
            Analyze a position
          </button>
        </div>
      </section>
      <div className="grow bg-white" />
    </>
  );
}
