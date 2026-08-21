'use client'
import { useState } from 'react'
import useSWR from 'swr'
import AppShell from '@/components/layout/AppShell'
import { format } from 'date-fns'
import { Search, ChevronDown, ChevronUp } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())
function fmt(n: number) { return `₹${Number(n).toLocaleString('en-IN')}` }

export default function GuestsPage() {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const q = search ? `?search=${encodeURIComponent(search)}` : ''
  const { data: guests, isLoading } = useSWR(`/api/guests${q}`, fetcher, { refreshInterval: 5000 })

  return (
    <AppShell>
      <div className="page-header">
        <h1 className="page-title">Guest Directory</h1>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '20px', maxWidth: '360px' }}>
        <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
        <input
          style={{ width: '100%', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px 12px 8px 32px', color: 'var(--text)', fontSize: '13px', outline: 'none' }}
          placeholder="Search by name, phone, email or booking ID"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table Header */}
      <div className="guest-th">
        <span>Guest</span>
        <span>Phone</span>
        <span>Email</span>
        <span>Stays</span>
        <span>Nights</span>
        <span>Total spent</span>
        <span>Balance</span>
      </div>

      {isLoading ? (
        Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 48, marginBottom: 6 }} />
        ))
      ) : guests?.length === 0 ? (
        <div className="empty-state">No guests found.</div>
      ) : (
        guests?.map((g: any) => (
          <div key={g.id}>
            <div
              className="guest-row"
              onClick={() => setExpanded(expanded === g.id ? null : g.id)}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>{g.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-2)' }}>{g.sources?.join(', ')}</div>
              </div>
              <div style={{ fontSize: '13px' }}>{g.phone}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>{g.email || '—'}</div>
              <div style={{ fontSize: '13px' }}>{g.totalStays}</div>
              <div style={{ fontSize: '13px' }}>{g.totalNights}</div>
              <div style={{ fontSize: '13px', fontWeight: 600 }}>{fmt(g.totalSpent)}</div>
              <div style={{ fontSize: '13px', color: g.balance > 0 ? 'var(--amber)' : 'var(--text-2)', fontWeight: g.balance > 0 ? 600 : 400 }}>
                {g.balance > 0 ? fmt(g.balance) : '—'}
              </div>
            </div>

            {/* Expanded guest history */}
            {expanded === g.id && (
              <div style={{ background: 'var(--card-2)', border: '1px solid var(--border)', borderTop: 'none', borderRadius: '0 0 var(--radius-sm) var(--radius-sm)', padding: '16px', marginBottom: '6px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Booking history · {g.lastStay ? `Last stay: ${format(new Date(g.lastStay), 'dd MMM yyyy')}` : 'No stays yet'}
                </div>
                {g.bookings?.map((b: any) => {
                  const collected = b.payments?.reduce((s: number, p: any) => s + (p.status !== 'Pending' ? p.amount : 0), 0) || 0
                  const balance = b.totalAmount - collected
                  const n = Math.ceil((new Date(b.checkOut).getTime() - new Date(b.checkIn).getTime()) / 86400000)
                  return (
                    <div key={b.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '13px' }}>
                      <div>
                        <span style={{ fontWeight: 600 }}>{b.bookingRef}</span>
                        <span style={{ color: 'var(--text-2)', marginLeft: '8px' }}>{b.source}</span>
                        <span style={{ color: 'var(--text-3)', marginLeft: '8px' }}>{format(new Date(b.checkIn), 'dd MMM')} – {format(new Date(b.checkOut), 'dd MMM yyyy')}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <span>{b.roomCategory} · {n}N</span>
                        <span style={{ fontWeight: 600 }}>{fmt(b.totalAmount)}</span>
                        <span className={`badge ${b.status === 'CheckedOut' ? 'badge-green' : b.status === 'CheckedIn' ? 'badge-amber' : 'badge-gray'}`}>
                          {b.status}
                        </span>
                        {balance > 0 && <span style={{ color: 'var(--amber)' }}>Balance: {fmt(balance)}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))
      )}
    </AppShell>
  )
}
