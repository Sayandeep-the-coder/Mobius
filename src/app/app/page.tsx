import React from 'react';
import { MobiusApp } from '@/components/app/MobiusApp';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mobius | Autonomous Risk Engine for Leveraged DeFi',
  description:
    'Rehearse the risk before it happens. Real-time stress testing, deterministic strategy optimization, and verified execution on Aave V3 and Monad.',
};

export default function AppPage() {
  return <MobiusApp />;
}
