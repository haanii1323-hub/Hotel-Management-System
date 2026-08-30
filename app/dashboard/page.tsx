'use client'

import useSWR, { useSWRConfig } from 'swr'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import { CalendarDays, Hotel, Percent, ArrowRight, CheckCircle2, BedDouble, Plus } from 'lucide-react'
import { useState } from 'react'
import NewBookingDrawer from '@/components/bookings/NewBookingDrawer'
import CheckInModal from '@/components/bookings/CheckInModal'
import CheckoutModal from '@/components/bookings/CheckoutModal'
import { format } from 'date-fns'
import { useProperty } from '@/context/PropertyContext'
import { useRealtimeSync } from '@/lib/realtime-sync'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

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
  const { currentProperty } = useProperty()
  const propertyId = currentProperty?.id || ''
  const currencySymbol = currentProperty?.currencySymbol || '₹'

  const formatMoney = (n: number) => `${currencySymbol}${Number(n || 0).toLocaleString('en-IN')}`

  const { mutate: globalMutate } = useSWRConfig()
  const [showNewBooking, setShowNewBooking] = useState(false)
  const [checkinBooking, setCheckinBooking] = useState<any>(null)
  const [checkoutBooking, setCheckoutBooking] = useState<any>(null)

  const { data, isLoading, mutate } = useSWR(
    propertyId ? `/api/dashboard?propertyId=${propertyId}` : '/api/dashboard',
    fetcher,
    {
      refreshInterval: 3000,
      revalidateOnFocus: true,
      revalidateOnMount: true,
      revalidateOnReconnect: true,
      dedupingInterval: 1000,
    }
  )

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

  useRealtimeSync(refreshAll)

  const kpis = data?.kpis || {
    totalRooms: 0,
    availableRooms: 0,
    occupiedRooms: 0,
    cleaningRooms: 0,
    maintenanceRooms: 0,
    outOfServiceRooms: 0,
    arrivingTodayCount: 0,
    inHouseCount: 0,
    departingTodayCount: 0,
    totalBookings: 0,
    occupancy: 0,
    totalRevenue: 0,
    collectedToday: 0,
  }

  const arrivingToday = data?.arrivingToday || []
  const departingToday = data?.departingToday || []

  return (
    <AppShell>
      <div className="dashboard-container">
        {/* Page Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">{currentProperty?.name || 'Growth Dashboard'}</h1>
            <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px' }}>
              {currentProperty?.code} · {currentProperty?.city}, {currentProperty?.country} · Tax: {currentProperty?.taxRate}%
            </div>
          </div>
          <button className="btn btn-red" onClick={() => setShowNewBooking(true)}>
            <Plus size={14} /> New Booking
          </button>
        </div>

        {/* Room Inventory Status Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '16px' }}>
          <div className="kpi-card" style={{ padding: '12px' }}>
            <div className="kpi-label">Total Rooms</div>
            <div className="kpi-value" style={{ fontSize: '20px' }}>{kpis.totalRooms}</div>
          </div>
          <div className="kpi-card" style={{ padding: '12px' }}>
            <div className="kpi-label">Available</div>
            <div className="kpi-value" style={{ fontSize: '20px', color: 'var(--text)' }}>{kpis.availableRooms}</div>
          </div>
          <div className="kpi-card" style={{ padding: '12px' }}>
            <div className="kpi-label">Occupied</div>
            <div className="kpi-value" style={{ fontSize: '20px', color: 'var(--green)' }}>{kpis.occupiedRooms}</div>
          </div>
          <div className="kpi-card" style={{ padding: '12px' }}>
            <div className="kpi-label">Cleaning</div>
            <div className="kpi-value" style={{ fontSize: '20px', color: 'var(--amber)' }}>{kpis.cleaningRooms}</div>
          </div>
          <div className="kpi-card" style={{ padding: '12px' }}>
            <div className="kpi-label">Occupancy</div>
            <div className="kpi-value" style={{ fontSize: '20px' }}>{kpis.occupancy}%</div>
          </div>
          <div className="kpi-card" style={{ padding: '12px' }}>
            <div className="kpi-label">Total Revenue</div>
            <div className="kpi-value" style={{ fontSize: '20px', color: 'var(--green)' }}>{formatMoney(kpis.totalRevenue)}</div>
          </div>
        </div>

        {/* Arriving & Departing Today Sections */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
          {/* Arriving Today */}
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ fontWeight: 700, fontSize: '14px' }}>Arriving Today ({arrivingToday.length})</div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => router.push('/bookings')}
                style={{ fontSize: '11px', padding: '4px 8px' }}
              >
                View all <ArrowRight size={12} />
              </button>
            </div>

            {isLoading && !data ? (
              <div className="skeleton" style={{ height: 60 }} />
            ) : arrivingToday.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px 0' }}>
                No arrivals scheduled for today.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {arrivingToday.map((b: any) => (
                  <div
                    key={b.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      background: 'var(--card-2)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13px' }}>{b.guest?.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                        {b.bookingRef} · {b.roomCategory} ({b.numRooms}R)
                      </div>
                    </div>
                    <button
                      className="btn btn-red btn-sm"
                      onClick={() => setCheckinBooking(b)}
                      style={{ fontSize: '11px', padding: '5px 10px' }}
                    >
                      Check-in
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Departing Today */}
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ fontWeight: 700, fontSize: '14px' }}>Departing Today ({departingToday.length})</div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => router.push('/bookings')}
                style={{ fontSize: '11px', padding: '4px 8px' }}
              >
                View all <ArrowRight size={12} />
              </button>
            </div>

            {isLoading && !data ? (
              <div className="skeleton" style={{ height: 60 }} />
            ) : departingToday.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px 0' }}>
                No departures due today.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {departingToday.map((b: any) => (
                  <div
                    key={b.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      background: 'var(--card-2)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13px' }}>{b.guest?.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                        {b.bookingRef} · {b.roomCategory}
                      </div>
                    </div>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setCheckoutBooking(b)}
                      style={{ fontSize: '11px', padding: '5px 10px' }}
                    >
                      Checkout
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
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
