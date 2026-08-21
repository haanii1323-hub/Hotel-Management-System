'use client'

import useSWR, { useSWRConfig } from 'swr'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import { CalendarDays, Hotel, Percent, IndianRupee, ArrowRight, CheckCircle2, BedDouble } from 'lucide-react'
import { useState } from 'react'
import NewBookingDrawer from '@/components/bookings/NewBookingDrawer'
import CheckInModal from '@/components/bookings/CheckInModal'
import CheckoutModal from '@/components/bookings/CheckoutModal'
import { format } from 'date-fns'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function fmt(n: number) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`
}

function parseBookingDate(d: string | Date | null | undefined): Date | null {
  if (!d) return null
  if (typeof d === 'string') {
    const match = d.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) {
      const year = parseInt(match[1], 10)
      const month = parseInt(match[2], 10) - 1
      const day = parseInt(match[3], 10)
      return new Date(year, month, day, 12, 0, 0)
    }
  }
  const dt = new Date(d)
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 12, 0, 0)
}

function fmtDate(d: string | Date | null | undefined) {
  const parsed = parseBookingDate(d)
  if (!parsed) return '—'
  return format(parsed, 'dd MMM')
}

export default function DashboardPage() {
  const router = useRouter()
  const { mutate: globalMutate } = useSWRConfig()
  const [showNewBooking, setShowNewBooking] = useState(false)
  const [checkinBooking, setCheckinBooking] = useState<any>(null)
  const [checkoutBooking, setCheckoutBooking] = useState<any>(null)

  const { data, error, isLoading, mutate } = useSWR('/api/dashboard', fetcher, {
    refreshInterval: 3000,
    revalidateOnFocus: true,
    revalidateOnMount: true,
    revalidateOnReconnect: true,
    dedupingInterval: 1000,
  })

  const refreshAll = async () => {
    await Promise.all([
      mutate(),
      globalMutate(
        (key) =>
          typeof key === 'string' &&
          (key.startsWith('/api/dashboard') ||
            key.startsWith('/api/bookings') ||
            key.startsWith('/api/rooms') ||
            key.startsWith('/api/earnings') ||
            key.startsWith('/api/guests')),
        undefined,
        { revalidate: true }
      ),
    ])
  }

  const kpis = data?.kpis || {}

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">Growth &amp; Overview</h1>
          <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px' }}>
            Real-time front desk status, arrivals, departures and occupancy
          </div>
        </div>
        <button className="btn btn-red" onClick={() => setShowNewBooking(true)}>
          + New Booking
        </button>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">
            Arriving today <CalendarDays size={14} />
          </div>
          <div className="kpi-value">{isLoading ? '—' : kpis.arrivingTodayCount ?? 0}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">
            In-house guests <Hotel size={14} />
          </div>
          <div className="kpi-value">{isLoading ? '—' : kpis.inHouseCount ?? 0}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">
            Occupancy <Percent size={14} />
          </div>
          <div className="kpi-value">{isLoading ? '—' : `${kpis.occupancy ?? 0}%`}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">
            Balance to collect <IndianRupee size={14} />
          </div>
          <div className="kpi-value">{isLoading ? '—' : fmt(kpis.balanceToCollect ?? 0)}</div>
        </div>
      </div>

      {/* Arriving / Departing */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '16px',
          marginBottom: '16px',
        }}
      >
        {/* Arriving today */}
        <div className="card">
          <div className="section-title" style={{ marginBottom: '12px' }}>
            Arriving today ({data?.arrivingToday?.length || 0})
          </div>
          {isLoading && !data ? (
            <div className="skeleton" style={{ height: 60 }} />
          ) : data?.arrivingToday?.length === 0 ? (
            <div style={{ color: 'var(--text-2)', fontSize: '13px', padding: '12px 0' }}>
              No arrivals left for today.
            </div>
          ) : (
            data?.arrivingToday?.map((b: any) => {
              const collected =
                b.payments?.reduce(
                  (s: number, p: any) => s + (p.status !== 'Pending' ? p.amount : 0),
                  0
                ) || 0
              const balance = Math.max(0, (b.totalAmount || 0) - collected)
              return (
                <div
                  key={b.id}
                  className="booking-row"
                  style={{
                    gridTemplateColumns: '1fr 1fr 1fr auto',
                    marginBottom: '8px',
                    padding: '10px 12px',
                  }}
                >
                  <div className="booking-guest">
                    <div className="name">{b.guest?.name || 'Guest'}</div>
                    <div className="ref">
                      {b.bookingRef} · {b.source}
                    </div>
                  </div>
                  <div className="booking-meta">
                    <div>
                      {Math.ceil(
                        (new Date(b.checkOut).getTime() - new Date(b.checkIn).getTime()) / 86400000
                      )}{' '}
                      Night
                    </div>
                    <div className="sub">
                      {fmtDate(b.checkIn)} – {fmtDate(b.checkOut)}
                    </div>
                  </div>
                  <div className="booking-amount">
                    <div className="total">{fmt(b.totalAmount)}</div>
                    <div className={`balance ${balance > 0 ? 'pending' : 'paid'}`}>
                      {balance > 0 ? `Collect: ${fmt(balance)}` : 'Paid'}
                    </div>
                  </div>
                  <div className="booking-actions">
                    <button className="btn btn-red btn-sm" onClick={() => setCheckinBooking(b)}>
                      Check-in
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Departing today */}
        <div className="card">
          <div className="section-title" style={{ marginBottom: '12px' }}>
            Departing today ({data?.departingToday?.length || 0})
          </div>
          {isLoading && !data ? (
            <div className="skeleton" style={{ height: 60 }} />
          ) : data?.departingToday?.length === 0 ? (
            <div style={{ color: 'var(--text-2)', fontSize: '13px', padding: '12px 0' }}>
              No checkouts due today.
            </div>
          ) : (
            data?.departingToday?.map((b: any) => {
              const collected =
                b.payments?.reduce(
                  (s: number, p: any) => s + (p.status !== 'Pending' ? p.amount : 0),
                  0
                ) || 0
              const balance = Math.max(0, (b.totalAmount || 0) - collected)
              return (
                <div
                  key={b.id}
                  className="booking-row"
                  style={{
                    gridTemplateColumns: '1fr 1fr 1fr auto',
                    marginBottom: '8px',
                    padding: '10px 12px',
                  }}
                >
                  <div className="booking-guest">
                    <div className="name">{b.guest?.name || 'Guest'}</div>
                    <div className="ref">
                      {b.bookingRef} · {b.roomCategory}
                    </div>
                  </div>
                  <div className="booking-meta">
                    <div>{b.roomCategory}</div>
                    <div className="sub">
                      {fmtDate(b.checkIn)} – {fmtDate(b.checkOut)}
                    </div>
                  </div>
                  <div className="booking-amount">
                    <div className="total">{fmt(b.totalAmount)}</div>
                    <div className={`balance ${balance > 0 ? 'pending' : 'paid'}`}>
                      {balance > 0 ? `Balance: ${fmt(balance)}` : 'Paid'}
                    </div>
                  </div>
                  <div className="booking-actions">
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setCheckoutBooking(b)}
                    >
                      Checkout
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Revenue & Rooms Shortcut Banner */}
      <div
        className="card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <div style={{ fontSize: '15px', fontWeight: 700 }}>
            Collected around today: {fmt(kpis.collectedToday ?? 0)} · {kpis.occupiedRooms ?? 0} of {kpis.sellableRooms ?? 15} Rooms Occupied
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-2)', marginTop: '4px' }}>
            Adjust nightly rates to lift occupancy and maximize RevPAR across room types.
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-ghost" onClick={() => router.push('/bookings')}>
            View All Bookings
          </button>
          <button className="btn btn-red" onClick={() => router.push('/pricing')}>
            Open Pricing &amp; Rooms <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {showNewBooking && (
        <NewBookingDrawer
          onClose={() => setShowNewBooking(false)}
          onSuccess={() => {
            refreshAll()
            setShowNewBooking(false)
          }}
        />
      )}

      {checkinBooking && (
        <CheckInModal
          booking={checkinBooking}
          onClose={() => setCheckinBooking(null)}
          onSuccess={() => {
            refreshAll()
            setCheckinBooking(null)
          }}
        />
      )}

      {checkoutBooking && (
        <CheckoutModal
          booking={checkoutBooking}
          onClose={() => setCheckoutBooking(null)}
          onSuccess={() => {
            refreshAll()
            setCheckoutBooking(null)
          }}
        />
      )}
    </AppShell>
  )
}
