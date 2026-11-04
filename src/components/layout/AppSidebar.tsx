'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Layers,
  Cpu,
  FileText,
  Settings,
  Sparkles,
  ExternalLink,
  Home,
  Copy,
  Check,
  Wallet,
  Menu,
  X,
  Shield,
  Activity,
  ArrowUpRight,
} from 'lucide-react';
import { MobiusLogo } from '@/components/common/MobiusLogo';

export type AppSection = 'overview' | 'positions' | 'strategies' | 'receipts' | 'settings';
export type EnvironmentType = 'sandbox' | 'mainnet' | 'testnet';

interface AppSidebarProps {
  activeSection: AppSection;
  onSelectSection: (section: AppSection) => void;
  walletAddress: string;
  walletConnected: boolean;
  environment: EnvironmentType;
  onSelectEnvironment: (env: EnvironmentType) => void;
  onConnectWallet: () => void;
  backendLive?: boolean;
}

export function AppSidebar({
  activeSection,
  onSelectSection,
  walletAddress,
  walletConnected,
  environment,
  onSelectEnvironment,
  onConnectWallet,
  backendLive = true,
}: AppSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showEnvModal, setShowEnvModal] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const navItems: { id: AppSection; num: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'overview', num: '01', label: 'Overview', icon: LayoutDashboard },
    { id: 'positions', num: '02', label: 'Positions', icon: Layers },
    { id: 'strategies', num: '03', label: 'Strategy Engine', icon: Cpu },
    { id: 'receipts', num: '04', label: 'Activity & Receipts', icon: FileText },
    { id: 'settings', num: '05', label: 'Settings & Permissions', icon: Settings },
  ];

  const envLabels: Record<EnvironmentType, string> = {
    sandbox: 'Demo sandbox',
    mainnet: 'Monad Mainnet',
    testnet: 'Monad Testnet',
  };

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-gray-900 text-white border-r border-white/10 select-none">
      {/* ─── Top Brand Header ─── */}
      <div className="flex flex-col">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
          <Link href="/" className="group flex items-center gap-3 transition">
            <MobiusLogo className="size-7 shrink-0 transition-transform group-hover:scale-105" white />
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white">MOBIUS</span>
              <span className="rounded bg-[#836EF9]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#DDD7FE] uppercase tracking-wider">
                BETA
              </span>
            </div>
          </Link>
          <button
            type="button"
            onClick={onConnectWallet}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold border transition cursor-pointer ${
              walletConnected
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
            }`}
          >
            <span className={`size-1.5 rounded-full ${walletConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span>{walletConnected ? 'Connected' : 'Connect Wallet'}</span>
          </button>
        </div>

        {/* ─── Primary 5 Sections (Matching Playbook Architecture) ─── */}
        <div className="px-3 pt-4 pb-2">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Navigation
          </div>
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === '/app' && activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (pathname !== '/app') {
                      window.location.href = `/app?section=${item.id}`;
                    } else {
                      onSelectSection(item.id);
                    }
                    setMobileOpen(false);
                  }}
                  className={`group flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-left transition cursor-pointer ${
                    isActive
                      ? 'bg-white/10 text-white font-semibold shadow-xs'
                      : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`size-4.5 shrink-0 transition ${isActive ? 'text-[#A594FD]' : 'text-gray-400 group-hover:text-gray-200'}`} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  <span className={`font-mono text-xs ${isActive ? 'text-[#DDD7FE] font-bold' : 'text-gray-500 group-hover:text-gray-400'}`}>
                    {item.num}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* ─── Integrated Workspaces (NLP Agent & Sepolia Live) ─── */}
        <div className="px-3 pt-3 pb-2 border-t border-white/5 mx-2">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Engines & Tools
          </div>
          <div className="flex flex-col gap-1">
            <Link
              href="/agentic"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 transition cursor-pointer ${
                pathname === '/agentic'
                  ? 'bg-[#836EF9]/20 text-white font-semibold border border-[#836EF9]/30'
                  : 'text-gray-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Sparkles className="size-4 shrink-0 text-[#A594FD]" />
                <span className="text-sm font-medium">Agentic NLP Console</span>
              </div>
              <span className="text-[10px] font-semibold bg-[#836EF9]/30 text-[#DDD7FE] px-1.5 py-0.5 rounded">
                AI
              </span>
            </Link>

            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-between rounded-xl px-3.5 py-2.5 text-gray-400 hover:bg-white/5 hover:text-gray-200 transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Home className="size-4 shrink-0" />
                <span className="text-sm font-medium">Landing Page</span>
              </div>
              <ArrowUpRight className="size-3.5 text-gray-500" />
            </Link>
          </div>
        </div>
      </div>

      {/* ─── Bottom Status Area (Wallet & Environment as per Playbook) ─── */}
      <div className="border-t border-white/10 p-4 space-y-3 bg-gray-950/40">
        {/* Wallet Address */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-gray-400 font-medium">
            <Wallet className="size-3.5 text-gray-400" />
            <span className="uppercase tracking-wider text-[10px] font-bold">WALLET</span>
          </div>
          <button
            type="button"
            onClick={walletConnected ? handleCopy : onConnectWallet}
            className="group flex items-center gap-1.5 font-mono text-gray-200 bg-white/5 hover:bg-white/10 px-2 py-1 rounded-lg border border-white/5 transition cursor-pointer"
            title={walletConnected ? 'Click to copy address' : 'Click to connect wallet'}
          >
            <span>{walletConnected ? walletAddress : 'Connect'}</span>
            {walletConnected && (
              copied ? (
                <Check className="size-3 text-emerald-400" />
              ) : (
                <Copy className="size-3 text-gray-400 group-hover:text-white transition" />
              )
            )}
          </button>
        </div>

        {/* Environment Pill */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400 uppercase tracking-wider text-[10px] font-bold">
            ENVIRONMENT
          </span>
          <button
            type="button"
            onClick={() => setShowEnvModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#836EF9]/20 text-[#DDD7FE] border border-[#836EF9]/30 hover:bg-[#836EF9]/30 transition cursor-pointer"
          >
            <span className="size-1.5 rounded-full bg-[#836EF9]" />
            <span>{envLabels[environment]}</span>
          </button>
        </div>

        {/* Live Backend Connection Indicator */}
        <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px] font-mono">
          <span className="text-gray-500">Node API:</span>
          <span className="flex items-center gap-1 text-emerald-400 font-medium">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {backendLive ? ':8787 Connected' : 'Offline'}
          </span>
        </div>
      </div>

      {/* ─── Environment Selection Modal ─── */}
      {showEnvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 text-gray-900 shadow-2xl border border-black/10">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-base text-gray-900">Choose environment</h3>
                <p className="text-xs text-gray-500 mt-0.5">Select protocol target for state reads and execution</p>
              </div>
              <button
                type="button"
                onClick={() => setShowEnvModal(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 transition cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3 pt-4">
              {/* Option 1: Sandbox */}
              <div
                onClick={() => {
                  onSelectEnvironment('sandbox');
                  setShowEnvModal(false);
                }}
                className={`p-4 rounded-xl border-2 transition cursor-pointer ${
                  environment === 'sandbox'
                    ? 'border-emerald-500 bg-emerald-50/50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm text-gray-900">Demo sandbox</div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    Recommended
                  </span>
                </div>
                <div className="text-xs font-medium text-gray-600 mt-0.5">Local Anvil fork of Monad Mainnet</div>
                <p className="text-xs text-gray-500 mt-1">
                  Actual Aave contracts and forked protocol state. Local-only transactions and controlled demo accounts.
                </p>
              </div>

              {/* Option 2: Monad Mainnet */}
              <div
                onClick={() => {
                  onSelectEnvironment('mainnet');
                  setShowEnvModal(false);
                }}
                className={`p-4 rounded-xl border-2 transition cursor-pointer ${
                  environment === 'mainnet'
                    ? 'border-[#836EF9] bg-purple-50/50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="font-bold text-sm text-gray-900">Monad Mainnet</div>
                <div className="text-xs font-medium text-gray-600 mt-0.5">Chain ID 143 · Actual Aave market</div>
                <p className="text-xs text-gray-500 mt-1">
                  Read actual position data. Live execution requires explicit user authorization and safety checks.
                </p>
              </div>

              {/* Option 3: Monad Testnet */}
              <div
                onClick={() => {
                  onSelectEnvironment('testnet');
                  setShowEnvModal(false);
                }}
                className={`p-4 rounded-xl border-2 transition cursor-pointer ${
                  environment === 'testnet'
                    ? 'border-[#836EF9] bg-purple-50/50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="font-bold text-sm text-gray-900">Monad Testnet</div>
                <div className="text-xs font-medium text-gray-600 mt-0.5">Chain ID 10143 · Mobius test contracts</div>
                <p className="text-xs text-gray-500 mt-1">
                  Test Mobius&apos;s own contracts and controlled lending/swap fixtures, not actual Aave Testnet Mode.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar (Full Height, Left Side) */}
      <aside className="hidden md:flex w-64 lg:w-72 shrink-0 h-screen sticky top-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Top Header (Only on mobile screens < md) with Hamburger toggle */}
      <div className="flex md:hidden items-center justify-between border-b border-white/10 bg-gray-900 px-4 py-3 text-white sticky top-0 z-30">
        <Link href="/" className="flex items-center gap-2">
          <MobiusLogo className="size-6" white />
          <span className="font-extrabold text-sm tracking-tight text-white">MOBIUS</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowEnvModal(true)}
            className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#836EF9]/20 text-[#DDD7FE] border border-[#836EF9]/30"
          >
            {envLabels[environment]}
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1.5 rounded-lg text-gray-300 hover:bg-white/10 transition"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden bg-black/60 backdrop-blur-xs flex">
          <div className="w-72 h-full bg-gray-900 shadow-xl">
            {sidebarContent}
          </div>
          <div className="flex-1" onClick={() => setMobileOpen(false)} />
        </div>
      )}
    </>
  );
}

