'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { MobiusLogo } from '@/components/common/MobiusLogo';
import { connectMetaMask, formatAddress, checkExistingConnection } from '@/lib/wallet';
import { Wallet, ArrowRight, RefreshCw } from 'lucide-react';

interface HeaderProps {
  onOpenAuth?: (tab: 'login' | 'signup' | 'wallet') => void;
  onOpenAnalyze?: () => void;
}

export function Header({ onOpenAuth, onOpenAnalyze }: HeaderProps) {
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    checkExistingConnection().then((addr) => {
      if (addr) setConnectedAddress(addr);
    });
  }, []);

  const handleWalletSignIn = async () => {
    setIsConnecting(true);
    try {
      const res = await connectMetaMask();
      if (res.success && res.address) {
        setConnectedAddress(res.address);
        // Redirect to dashboard immediately after signing in with wallet
        window.location.href = '/dashboard';
        return;
      } else if (onOpenAuth) {
        onOpenAuth('login');
      }
    } catch {
      if (onOpenAuth) onOpenAuth('login');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-black/10 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between border-x px-6 py-3.5 sm:px-8 border-transparent">
        {/* Left: Mobius Logo */}
        <Link className="group flex items-center gap-2.5 transition-opacity hover:opacity-90" href="/">
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
        </Link>

        {/* Center: Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
          <Link href="/dashboard" className="transition hover:text-gray-950 font-semibold text-[#836EF9]">
            Risk Console
          </Link>
          <Link href="/agentic" className="transition hover:text-gray-950">
            Agentic Planner
          </Link>
          <Link href="/#how-it-works" className="transition hover:text-gray-950">
            How it works
          </Link>
          <Link href="/#faq" className="transition hover:text-gray-950">
            FAQ
          </Link>
        </nav>

        {/* Right: Actions */}
        <div className="flex min-h-8 items-center gap-3">
          {connectedAddress ? (
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-block font-mono text-xs font-semibold text-gray-700 bg-gray-100 px-2.5 py-1.5 rounded-lg border border-gray-200">
                🦊 {formatAddress(connectedAddress)}
              </span>
              <Link
                href="/dashboard"
                className="relative flex shrink-0 items-center justify-center font-semibold leading-none tracking-tight transition-all duration-150 active:scale-[0.97] h-9 rounded-lg px-4 text-sm bg-[#836EF9] text-white hover:bg-[#6E54FF] shadow-sm shadow-[#836EF9]/30 cursor-pointer gap-1.5"
              >
                <span>Dashboard</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={handleWalletSignIn}
                disabled={isConnecting}
                className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-gray-700 hover:text-gray-950 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition cursor-pointer"
              >
                {isConnecting ? (
                  <RefreshCw className="size-3.5 animate-spin text-[#836EF9]" />
                ) : (
                  <span>🦊</span>
                )}
                <span>{isConnecting ? 'Connecting...' : 'Sign in with Wallet'}</span>
              </button>

              <Link
                href="/dashboard"
                className="relative flex shrink-0 items-center justify-center font-semibold leading-none tracking-tight transition-all duration-150 active:scale-[0.97] h-9 rounded-lg px-4 text-sm bg-[#836EF9] text-white hover:bg-[#6E54FF] shadow-sm shadow-[#836EF9]/30 cursor-pointer"
              >
                Launch app
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
