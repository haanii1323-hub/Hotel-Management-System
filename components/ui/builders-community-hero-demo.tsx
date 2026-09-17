'use client';

import React from 'react';
import { KeyRound, CreditCard, TrendingUp, Database, ShieldCheck, Zap } from 'lucide-react';
import CommunityOrbit, {
  type OrbitItem,
  type OrbitStat,
  type OrbitTag,
} from '@/components/ui/builders-community-hero';

const items: OrbitItem[] = [
  // Outer ring
  { kind: 'status', ring: 'outer', angle: 132, label: 'Instant Check-In' },
  { kind: 'card', ring: 'outer', angle: 112.6, emoji: '🛎️', badge: 'Fast' },
  { kind: 'pill', ring: 'outer', angle: 90, icon: <Zap size={14} className="text-amber-500" />, label: 'Live Sync Engine' },
  { kind: 'pill', ring: 'outer', angle: 67.6, icon: '🧾', label: 'GST Tax Invoicing' },
  { kind: 'card', ring: 'outer', angle: 50.9, emoji: '💳', badge: 'UPI QR' },
  { kind: 'pill', ring: 'outer', angle: 35.2, icon: <ShieldCheck size={13} className="text-emerald-500" />, label: '100% Isolated' },
  // Inner ring
  { kind: 'card', ring: 'inner', angle: 137.2, emoji: '🏨' },
  { kind: 'pill', ring: 'inner', angle: 116.6, icon: '📊', label: 'Occupancy Analytics' },
  { kind: 'card', ring: 'inner', angle: 90, emoji: '🖨️', badge: 'Thermal' },
  { kind: 'card', ring: 'inner', angle: 63.3, emoji: '🔒' },
  { kind: 'check', ring: 'inner', angle: 41.8 },
];

const stats: OrbitStat[] = [
  { value: '99.99%', label: 'Cloud Uptime' },
  { value: '0ms', label: 'In-Memory Latency' },
  { value: '100%', label: 'Tenant Isolation' },
];

const tags: OrbitTag[] = [
  { icon: <KeyRound size={15} />, label: 'Front Desk Check-In', href: '/auth' },
  { icon: <CreditCard size={15} />, label: 'UPI QR & Split Folio', href: '/auth' },
  { icon: <TrendingUp size={15} />, label: 'Occupancy Analytics', href: '/auth' },
  { icon: <Database size={15} />, label: '1-Click JSON Backup', href: '/auth' },
];

export default function CommunityOrbitDemo() {
  return (
    <div className="w-full">
      <CommunityOrbit
        items={items}
        stats={stats}
        headline={
          <>
            The Modern Hotel PMS Built for
            <br className="hidden sm:block" /> Scalable Operations
          </>
        }
        subheadline="Real-time front desk reservation engine, dynamic UPI payment QR codes, and multi-tenant data privacy."
        tags={tags}
      />
    </div>
  );
}
