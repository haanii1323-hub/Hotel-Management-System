'use client'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import { CalendarDays, Hotel, Percent, IndianRupee, ArrowRight, Phone } from 'lucide-react'
import { useState } from 'react'
import NewBookingDrawer from '@/components/bookings/NewBookingDrawer'
import CheckInModal from '@/components/bookings/CheckInModal'
import { format } from 'date-fns'

const fetcher = (url: string) => fetch(url).then(r => r.json())

function fmt(n: number) { return `₹${Number(n).toLocaleString('en-IN')}` }
function fmtDate(d: string | Date) { return format(new Date(d), 'dd MMM') }

export default function DashboardPage() {
  const router = useRouter()
  const [showNewBooking, setShowNewBooking] = useState(false)
  const [checkinBooking, setCheckinBooking] = useState<any>(null)
  const { data, error, isLoading, mutate } = useSWR('/api/dashboard', fetcher, { refreshInterval: 5000 })

  const kpis = data?.kpis || {}

  return (
    <AppShell>
      <div className="page-header">
        <h1 className="page-title">Growth</h1>
        <button className="btn btn-red" onClick={() => setShowNewBooking(true)}>
          + New Booking
        </button>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Arriving today <CalendarDays size={14} /></div>
          <div className="kpi-value">{isLoading ? '—' : kpis.arrivingTodayCount ?? 0}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">In-house guests <Hotel size={14} /></div>
          <div className="kpi-value">{isLoading ? '—' : kpis.inHouseCount ?? 0}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Occupancy <Percent size={14} /></div>
          <div className="kpi-value">{isLoading ? '—' : `${kpis.occupancy ?? 0}%`}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Balance to collect <IndianRupee size={14} /></div>
          <div className="kpi-value">{isLoading ? '—' : fmt(kpis.balanceToCollect ?? 0)}</div>
        </div>
      </div>

      {/* Arriving / Departing */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        {/* Arriving today */}
        <div className="card">
          <div className="section-title" style={{ marginBottom: '12px' }}>Arriving today</div>
          {isLoading ? (
            <div className="skeleton" style={{ height: 40 }} />
          ) : data?.arrivingToday?.length === 0 ? (
            <div style={{ color: 'var(--text-2)', fontSize: '13px' }}>No arrivals left for today.</div>
          ) : (
            data?.arrivingToday?.map((b: any) => {
              const collected = b.payments?.reduce((s: number, p: any) => s + (p.status !== 'Pending' ? p.amount : 0), 0) || 0
              const balance = b.totalAmount - collected
              return (
                <div key={b.id} className="booking-row" style={{ gridTemplateColumns: '1fr 1fr 1fr 80px', marginBottom: 0 }}>
                  <div className="booking-guest">
                    <div className="name">{b.guest.name}</div>
                    <div className="ref">{b.bookingRef} · {b.source}</div>
                  </div>
                  <div className="booking-meta">
                    <div>{Math.ceil((new Date(b.checkOut).getTime() - new Date(b.checkIn).getTime()) / 86400000)} Night</div>
                    <div className="sub">{fmtDate(b.checkIn)} – {fmtDate(b.checkOut)}</div>
                  </div>
                  <div className="booking-amount">
                    <div className="total">{fmt(b.totalAmount)}</div>
                    <div className={`balance ${balance > 0 ? 'pending' : 'paid'}`}>
                      {balance > 0 ? `Collect at hotel: ${fmt(balance)}` : 'Paid'}
                    </div>
                  </div>
                  <div className="booking-actions">
                    <button className="btn btn-red btn-sm" onClick={() => setCheckinBooking(b)}>Check-in</button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Departing today */}
        <div className="card">
          <div className="section-title" style={{ marginBottom: '12px' }}>Departing today</div>
          {isLoading ? (
            <div className="skeleton" style={{ height: 40 }} />
          ) : data?.departingToday?.length === 0 ? (
            <div style={{ color: 'var(--text-2)', fontSize: '13px' }}>No checkouts due today.</div>
          ) : (
            data?.departingToday?.map((b: any) => {
              const collected = b.payments?.reduce((s: number, p: any) => s + (p.status !== 'Pending' ? p.amount : 0), 0) || 0
              const balance = b.totalAmount - collected
              return (
                <div key={b.id} style={{ fontSize: '13px', color: 'var(--text)' }}>
                  <div style={{ fontWeight: 600 }}>{b.guest.name}</div>
                  <div style={{ color: 'var(--text-2)' }}>{b.bookingRef} · {b.roomCategory}</div>
                  {balance > 0 && <div style={{ color: 'var(--amber)' }}>Balance: {fmt(balance)}</div>}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Revenue card */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 700 }}>
            Collected around today: {fmt(kpis.collectedToday ?? 0)}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-2)', marginTop: '4px' }}>
            Tune nightly rates to lift occupancy on soft dates.
          </div>
        </div>
        <button className="btn btn-red" onClick={() => router.push('/pricing')}>
          Open pricing <ArrowRight size={14} />
        </button>
      </div>

      {showNewBooking && (
        <NewBookingDrawer
          onClose={() => setShowNewBooking(false)}
          onSuccess={() => { mutate(); setShowNewBooking(false) }}
        />
      )}

      {checkinBooking && (
        <CheckInModal
          booking={checkinBooking}
          onClose={() => setCheckinBooking(null)}
          onSuccess={() => { mutate(); setCheckinBooking(null) }}
        />
      )}
    </AppShell>
  )
}
