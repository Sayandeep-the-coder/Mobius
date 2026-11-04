'use client';

import React, { useState } from 'react';
import { MobiusLogo } from '@/components/common/MobiusLogo';

export function Footer() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <>
      <footer className="relative overflow-hidden bg-gray-800">
        {/* Top subtle Monad purple ambient glow */}
        <div className="-top-4 -translate-x-1/2 pointer-events-none absolute left-1/2 flex h-8 w-[max(200%,100vw)] select-none items-center justify-center bg-[#836EF9] opacity-20 blur-xl" />

        <div className="mx-auto w-full max-w-7xl border-white/11 border-x max-xl:border-none">
          {/* Main Footer Content */}
          <div className="grid gap-y-16 px-6 py-24 sm:px-8 lg:grid-cols-2">
            <div>
              {/* MOBIUS symbol & wordmark */}
              <div className="flex items-center gap-3">
                <div className="flex size-7 items-center justify-center rounded-[7px] bg-[#836EF9] shadow-sm shadow-[#836EF9]/30">
                  <MobiusLogo className="size-4.5 shrink-0" white />
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-2xl tracking-tight text-white">MOBIUS</span>
                  <span className="rounded bg-[#836EF9]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#DDD7FE] uppercase tracking-wider">
                    BETA
                  </span>
                </div>
              </div>
              <p className="mt-5 max-w-md text-balance font-medium text-base/6 text-gray-400">
                Risk rehearsal for leveraged DeFi on Monad. Stress-test shocks, compare moves, keep verifiable receipts. Read-only by design.
              </p>
            </div>

            {/* Links Columns */}
            <div className="grid grid-cols-2 gap-y-16 sm:grid-cols-3">
              <div>
                <h3 className="font-medium text-base/6 text-white">Product</h3>
                <ul className="mt-6 space-y-4">
                  <li>
                    <a className="font-medium text-gray-400 text-base/6 hover:text-white hover:underline transition" href="/">
                      Dashboard
                    </a>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => setChatOpen(true)}
                      className="font-medium text-gray-400 text-base/6 hover:text-white hover:underline transition cursor-pointer text-left"
                    >
                      Support
                    </button>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium text-base/6 text-white">Social</h3>
                <ul className="mt-6 space-y-4">
                  <li>
                    <a
                      href="https://x.com/monad_xyz"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-gray-400 text-base/6 hover:text-white hover:underline transition"
                    >
                      X/Twitter
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://discord.gg/monad"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-gray-400 text-base/6 hover:text-white hover:underline transition"
                    >
                      Discord
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium text-base/6 text-white">Legal</h3>
                <ul className="mt-6 space-y-4">
                  <li>
                    <a className="font-medium text-gray-400 text-base/6 hover:text-white hover:underline transition" href="/terms">
                      Terms
                    </a>
                  </li>
                  <li>
                    <a className="font-medium text-gray-400 text-base/6 hover:text-white hover:underline transition" href="/privacy">
                      Privacy
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Gigantic MOBIUS Watermark Wordmark - Exact Near-type SVG architecture */}
          <div className="-mb-[calc(30%*314/1214)] sm:-mb-[calc(34%*314/1214)] lg:-mb-[calc(38%*314/1214)] w-full px-6 sm:px-8 select-none pointer-events-none">
            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 1214 314" className="w-full">
              <g clipPath="url(#a)">
                <text
                  x="607"
                  y="262"
                  textAnchor="middle"
                  fontFamily="inherit"
                  fontWeight="900"
                  fontSize="285"
                  letterSpacing="-0.04em"
                  fill="url(#b)"
                  stroke="url(#c)"
                  strokeWidth="2"
                  className="uppercase select-none"
                >
                  MOBIUS
                </text>
              </g>
              <defs>
                <linearGradient id="b" x1="-68.5" x2="1347.5" y1="-7.917" y2="222.083" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#fff" stopOpacity=".02" />
                  <stop offset="1" stopColor="#fff" stopOpacity=".01" />
                </linearGradient>
                <linearGradient id="c" x1="-85" x2="1347" y1="-17.417" y2="239.083" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#fff" stopOpacity=".05" />
                  <stop offset=".5" stopColor="#fff" stopOpacity=".04" />
                  <stop offset="1" stopColor="#fff" stopOpacity=".02" />
                </linearGradient>
                <clipPath id="a">
                  <path fill="#fff" d="M0 0h1214v314H0z" />
                </clipPath>
              </defs>
            </svg>
          </div>
        </div>
      </footer>

      {/* Floating Chat Support Widget Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          type="button"
          onClick={() => setChatOpen(!chatOpen)}
          className="relative flex size-14 items-center justify-center rounded-2xl bg-[#836EF9] text-white shadow-2xl shadow-purple-950/50 transition hover:bg-[#6E54FF] hover:scale-105 active:scale-95 cursor-pointer"
          title="Support Chat"
          aria-label="Open support chat"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-7">
            <path fillRule="evenodd" d="M4.804 21.644A6.707 6.707 0 0 0 8.9 19.5h8.6c2.485 0 4.5-2.015 4.5-4.5V7.5C22 5.015 19.985 3 17.5 3h-11C4.015 3 2 5.015 2 7.5v7.5c0 1.954 1.25 3.614 3.003 4.23-.134.786-.484 1.547-1.026 2.193a.75.75 0 0 0 .827 1.221ZM7 7.75A.75.75 0 0 1 7.75 7h8.5a.75.75 0 0 1 0 1.5h-8.5A.75.75 0 0 1 7 7.75Zm0 4a.75.75 0 0 1 .75-.75h5.5a.75.75 0 0 1 0 1.5h-5.5A.75.75 0 0 1 7 11.75Z" clipRule="evenodd" />
          </svg>
          <span className="absolute -top-1 -right-1 flex size-3">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#DDD7FE] opacity-75" />
            <span className="relative inline-flex size-3 rounded-full bg-[#836EF9]" />
          </span>
        </button>

        {/* Support Chat Modal */}
        {chatOpen && (
          <div className="absolute bottom-16 right-0 mb-3 w-80 rounded-2xl border border-white/10 bg-gray-900 p-5 shadow-2xl text-white">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-[#836EF9]" />
                <span className="font-semibold text-sm">Mobius Support Assistant</span>
              </div>
              <button
                type="button"
                onClick={() => setChatOpen(false)}
                className="text-gray-400 hover:text-white text-xs font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="mt-3 text-xs text-gray-300 leading-relaxed">
              Have questions about risk rehearsal, rate and peg shocks, or verified receipts on Monad?
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <a
                href="https://discord.gg/monad"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-medium text-white hover:bg-white/20 transition"
              >
                Join Monad Discord
              </a>
              <a
                href="https://docs.monad.xyz"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl bg-[#836EF9] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#6E54FF] shadow-sm shadow-[#836EF9]/25 transition"
              >
                Browse Documentation
              </a>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
