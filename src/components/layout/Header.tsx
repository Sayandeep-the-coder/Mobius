'use client';

import React from 'react';
import { MobiusLogo } from '@/components/common/MobiusLogo';

interface HeaderProps {
  onOpenAuth: (tab: 'login' | 'signup') => void;
  onOpenAnalyze?: () => void;
}

export function Header({ onOpenAuth, onOpenAnalyze }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-black/10 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between border-x px-6 py-3.5 sm:px-8 border-transparent">
        {/* Left: Mobius Logo */}
        <a className="group flex items-center gap-2.5 transition-opacity hover:opacity-90" href="/">
          <MobiusLogo className="size-8 shrink-0 transition-transform duration-200 group-hover:scale-105" />
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-xl tracking-tight text-gray-900">
              MOBIUS
            </span>
            <span className="rounded-md bg-[#836EF9]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#836EF9] border border-[#836EF9]/25 uppercase tracking-wider">
              BETA
            </span>
          </div>
          <span className="sr-only">Mobius Home</span>
        </a>

        {/* Center: Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
          <a href="/app" className="transition hover:text-gray-950 font-semibold text-[#836EF9]">
            Risk Console
          </a>
          <a href="/agentic" className="transition hover:text-gray-950">
            Agentic Planner
          </a>
          <a href="/#how-it-works" className="transition hover:text-gray-950">
            How it works
          </a>
          <a href="/#faq" className="transition hover:text-gray-950">
            FAQ
          </a>
        </nav>

        {/* Right: Actions */}
        <div className="flex min-h-8 items-center gap-3">
          <button
            type="button"
            onClick={() => onOpenAuth('login')}
            className="text-sm font-medium text-gray-700 hover:text-gray-950 px-2 py-1.5 transition cursor-pointer"
          >
            Log in
          </button>
          <a
            href="/app"
            className="relative flex shrink-0 items-center justify-center font-semibold leading-none tracking-tight transition-all duration-150 active:scale-[0.97] h-9 rounded-lg px-4 text-sm bg-[#836EF9] text-white hover:bg-[#6E54FF] shadow-sm shadow-[#836EF9]/30 cursor-pointer"
          >
            Launch app
          </a>
        </div>
      </div>
    </header>
  );
}
