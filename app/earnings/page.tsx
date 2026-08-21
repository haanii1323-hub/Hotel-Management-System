'use client'
import useSWR from 'swr'
import AppShell from '@/components/layout/AppShell'
import { useRouter } from 'next/navigation'

const fetcher = (url: string) => fetch(url).then(r => r.json())
function fmt(n: number) { return `₹${Number(n).toLocaleString('en-IN')}` }

export default function EarningsPage() {
  const router = useRouter()
  const { data, isLoading } = useSWR('/api/earnings', fetcher, { refreshInterval: 5000 })

  return (
    <AppShell>
      <div className="page-header">
        <h1 className="page-title">Earnings</h1>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Booked value</div>
          <div className="kpi-value">{isLoading ? '—' : fmt(data?.bookedValue || 0)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label" style={{ color: 'var(--green)' }}>Collected</div>
          <div className="kpi-value" style={{ color: 'var(--green)' }}>{isLoading ? '—' : fmt(data?.collected || 0)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label" style={{ color: 'var(--amber)' }}>Balance due</div>
          <div className="kpi-value" style={{ color: 'var(--amber)' }}>{isLoading ? '—' : fmt(data?.balance || 0)}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Revenue by Channel */}
        <div className="card">
          <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Revenue by channel</div>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 32, marginBottom: 8 }} />)
          ) : data?.channels?.length === 0 ? (
            <div style={{ color: 'var(--text-2)', fontSize: '13px' }}>No revenue data yet.</div>
          ) : (
            data?.channels?.map((ch: any) => (
              <div key={ch.name} className="channel-row">
                <div className="channel-name">{ch.name}</div>
                <div className="channel-bar-wrap">
                  <div className="channel-bar" style={{ width: `${ch.percentage}%` }} />
                </div>
                <div className="channel-amount">{fmt(ch.amount)}</div>
                <div className="channel-pct">{ch.percentage}%</div>
              </div>
            ))
          )}
        </div>

        {/* Outstanding Balances */}
        <div className="card">
          <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Outstanding balances</div>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 52, marginBottom: 6 }} />)
          ) : data?.outstanding?.length === 0 ? (
            <div style={{ color: 'var(--text-2)', fontSize: '13px' }}>No outstanding balances.</div>
          ) : (
            data?.outstanding?.map((o: any) => (
              <div key={o.bookingId} className="outstanding-row" onClick={() => router.push('/bookings')}>
                <div>
                  <div className="outstanding-guest">{o.guestName}</div>
                  <div className="outstanding-meta">{o.bookingRef}</div>
                </div>
                <div className="outstanding-amount">{fmt(o.amount)}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  )
}
