'use client'

import useSWR, { useSWRConfig } from 'swr'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import { CalendarDays, Hotel, Percent, ArrowRight, CheckCircle2, BedDouble, Plus, Building2, Sparkles, Layers, DollarSign, AlertTriangle } from 'lucide-react'
import { useState } from 'react'
import NewBookingDrawer from '@/components/bookings/NewBookingDrawer'
import CheckInModal from '@/components/bookings/CheckInModal'
import CheckoutModal from '@/components/bookings/CheckoutModal'
import AddPropertyModal from '@/components/properties/AddPropertyModal'
import { format } from 'date-fns'
import { useProperty } from '@/context/PropertyContext'
import SourceBadge from '@/components/ui/SourceBadge'
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
  const { currentProperty, hasProperties, reloadProperties } = useProperty()
  const propertyId = currentProperty?.id || ''
  const currencySymbol = currentProperty?.currencySymbol || '₹'

  const formatMoney = (n: number) => `${currencySymbol}${Number(n || 0).toLocaleString('en-IN')}`

  const { mutate: globalMutate } = useSWRConfig()
  const [showNewBooking, setShowNewBooking] = useState(false)
  const [showAddProperty, setShowAddProperty] = useState(false)
  const [checkinBooking, setCheckinBooking] = useState<any>(null)
  const [checkoutBooking, setCheckoutBooking] = useState<any>(null)

  const { data, isLoading, mutate } = useSWR(
    propertyId ? `/api/dashboard?propertyId=${propertyId}` : '/api/dashboard',
    fetcher,
    {
      refreshInterval: 60000,
      revalidateOnFocus: true,
      revalidateOnMount: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
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
            key.startsWith('/api/guests') ||
            key.startsWith('/api/properties')),
        undefined,
        { revalidate: true }
      ),
    ])
  }

  useRealtimeSync(refreshAll)

  const kpis = data?.kpis || {
    totalProperties: 0,
    totalPhysicalRooms: 0,
    totalRooms: 0,
    sellableRooms: 0,
    bookedRoomsToday: 0,
    availableRooms: 0,
    occupiedRooms: 0,
    cleaningRooms: 0,
    maintenanceRooms: 0,
    outOfServiceRooms: 0,
    overbookedRooms: 0,
    isOverbooked: false,
    overbookingStatus: 'OPTIMAL',
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
      {/* If tenant has 0 properties, show clean onboarding empty state */}
      {!hasProperties && !isLoading ? (
        <div style={{ maxWidth: '820px', margin: '40px auto', padding: '0 16px' }}>
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '40px',
              textAlign: 'center',
              boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                background: 'rgba(212, 175, 55, 0.12)',
                border: '1px solid rgba(212, 175, 55, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                color: '#e5c06e',
              }}
            >
              <Building2 size={32} />
            </div>

            <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text)', marginBottom: '8px' }}>
              Welcome to Your Hotel PMS
            </h1>
            <p style={{ color: 'var(--text-2)', fontSize: '14px', maxWidth: '520px', margin: '0 auto 24px', lineHeight: '1.6' }}>
              Your private hotel organization is created and ready. Add your first hotel property to start configuring room categories, rates, rooms, and accepting bookings.
            </p>

            <button
              className="btn btn-red"
              onClick={() => setShowAddProperty(true)}
              style={{ padding: '12px 24px', fontSize: '15px', gap: '8px', margin: '0 auto' }}
            >
              <Plus size={18} /> Add Your First Property
            </button>

            {/* Guided steps */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '16px',
                marginTop: '40px',
                textAlign: 'left',
              }}
            >
              <div style={{ padding: '16px', background: 'var(--card-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--red)', marginBottom: '4px' }}>STEP 1</div>
                <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>Add Property</div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>Enter property name, address &amp; check-in times.</div>
              </div>
              <div style={{ padding: '16px', background: 'var(--card-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#e5c06e', marginBottom: '4px' }}>STEP 2</div>
                <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>Room Types &amp; Rates</div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>Configure Standard, Deluxe, Superior and pricing.</div>
              </div>
              <div style={{ padding: '16px', background: 'var(--card-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--green)', marginBottom: '4px' }}>STEP 3</div>
                <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>Add Rooms</div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>Assign room numbers to your property inventory.</div>
              </div>
              <div style={{ padding: '16px', background: 'var(--card-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--blue)', marginBottom: '4px' }}>STEP 4</div>
                <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>Bookings &amp; Check-In</div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>Create reservations and manage front desk operations.</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="dashboard-container">
          {/* Page Header */}
          <div className="page-header">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h1 className="page-title">{currentProperty?.name || 'Hotel Dashboard'}</h1>
                {kpis.isOverbooked && (
                  <span className="badge badge-red" style={{ fontSize: '11.5px', fontWeight: 800, letterSpacing: '0.4px' }}>
                    OVERBOOKED (+{kpis.overbookedRooms})
                  </span>
                )}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px' }}>
                {currentProperty?.code} · {currentProperty?.city}, {currentProperty?.country}
              </div>
            </div>
            <button className="btn btn-red" onClick={() => setShowNewBooking(true)}>
              <Plus size={14} /> New Booking
            </button>
          </div>

          {/* Overbooking Alert Banner if overbooked */}
          {kpis.isOverbooked && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 18px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '16px',
                color: 'var(--text)',
                fontSize: '13px',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
                <span>
                  <strong>Overbooking Notice:</strong> {kpis.bookedRoomsToday} rooms booked against {kpis.sellableRooms || kpis.totalRooms} sellable rooms ({kpis.occupancy}% Occupancy). Overbooked by <strong style={{ color: '#ef4444' }}>{kpis.overbookedRooms} room{kpis.overbookedRooms > 1 ? 's' : ''}</strong>.
                </span>
              </div>
              <span className="badge badge-red" style={{ fontWeight: 800 }}>
                Status: {kpis.overbookingStatus}
              </span>
            </div>
          )}

          {/* Room Inventory & Demand Status Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '16px' }}>
            <div className="kpi-card" style={{ padding: '12px' }}>
              <div className="kpi-label">Physical Rooms</div>
              <div className="kpi-value" style={{ fontSize: '20px' }}>{kpis.totalPhysicalRooms || kpis.totalRooms}</div>
            </div>
            <div className="kpi-card" style={{ padding: '12px' }}>
              <div className="kpi-label">Sellable Rooms</div>
              <div className="kpi-value" style={{ fontSize: '20px' }}>{kpis.sellableRooms || kpis.totalRooms}</div>
            </div>
            <div className="kpi-card" style={{ padding: '12px' }}>
              <div className="kpi-label">Booked Tonight</div>
              <div className="kpi-value" style={{ fontSize: '20px', color: kpis.isOverbooked ? '#ef4444' : 'var(--text)' }}>
                {kpis.bookedRoomsToday ?? kpis.occupiedRooms}
              </div>
            </div>
            <div className="kpi-card" style={{ padding: '12px' }}>
              <div className="kpi-label">Available</div>
              <div
                className="kpi-value"
                style={{
                  fontSize: '20px',
                  color: kpis.availableRooms < 0 ? '#ef4444' : 'var(--text)',
                  fontWeight: 800,
                }}
              >
                {kpis.availableRooms}
              </div>
            </div>
            <div className="kpi-card" style={{ padding: '12px' }}>
              <div className="kpi-label">Occupancy</div>
              <div
                className="kpi-value"
                style={{
                  fontSize: '20px',
                  color: kpis.occupancy > 100 ? '#ef4444' : kpis.occupancy >= 80 ? 'var(--green)' : 'var(--text)',
                }}
              >
                {kpis.occupancy}%
              </div>
            </div>
            {kpis.overbookedRooms > 0 && (
              <div className="kpi-card" style={{ padding: '12px', border: '1px solid rgba(239, 68, 68, 0.35)', background: 'rgba(239, 68, 68, 0.08)' }}>
                <div className="kpi-label" style={{ color: '#ef4444' }}>Overbooked</div>
                <div className="kpi-value" style={{ fontSize: '20px', color: '#ef4444' }}>+{kpis.overbookedRooms}</div>
              </div>
            )}
            <div className="kpi-card" style={{ padding: '12px' }}>
              <div className="kpi-label">Cleaning</div>
              <div className="kpi-value" style={{ fontSize: '20px', color: 'var(--amber)' }}>{kpis.cleaningRooms}</div>
            </div>
            <div className="kpi-card" style={{ padding: '12px' }}>
              <div className="kpi-label">Total Revenue</div>
              <div className="kpi-value" style={{ fontSize: '20px', color: 'var(--green)' }}>{formatMoney(kpis.totalRevenue)}</div>
            </div>
          </div>

          {/* Arriving & Departing Today Sections */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }} className="dash-grid-2col">
            {/* Arriving Today */}
            <div className="card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>
                  Arriving Today ({arrivingToday.reduce((sum: number, b: any) => sum + (b.bookingRooms?.length || b.numRooms || 1), 0)})
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => router.push('/bookings')}
                  style={{ fontSize: '11px', padding: '4px 8px' }}
                >
                  View all <ArrowRight size={12} />
                </button>
              </div>

              {arrivingToday.length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>
                  No arrivals scheduled for today.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {arrivingToday.slice(0, 5).map((b: any) => (
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
                        <div style={{ fontSize: '11px', color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px', flexWrap: 'wrap' }}>
                          <span>{b.bookingRef}</span>
                          <span>·</span>
                          <SourceBadge source={b.source} size="xs" />
                          <span>·</span>
                          <span>{b.roomCategory}</span>
                        </div>
                      </div>
                      <button
                        className="btn btn-green btn-sm"
                        onClick={() => setCheckinBooking(b)}
                        style={{ fontSize: '11px', padding: '4px 10px' }}
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
                <div style={{ fontWeight: 700, fontSize: '14px' }}>
                  Departing Today ({departingToday.reduce((sum: number, b: any) => sum + (b.bookingRooms?.length || b.numRooms || 1), 0)})
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => router.push('/bookings')}
                  style={{ fontSize: '11px', padding: '4px 8px' }}
                >
                  View all <ArrowRight size={12} />
                </button>
              </div>

              {departingToday.length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>
                  No departures scheduled for today.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {departingToday.slice(0, 5).map((b: any) => (
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
                        <div style={{ fontSize: '11px', color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px', flexWrap: 'wrap' }}>
                          <span>{b.bookingRef}</span>
                          <span>·</span>
                          <SourceBadge source={b.source} size="xs" />
                          <span>·</span>
                          <span>{b.roomCategory}</span>
                        </div>
                      </div>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setCheckoutBooking(b)}
                        style={{ fontSize: '11px', padding: '4px 10px' }}
                      >
                        Check-out
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Booking Drawer */}
      {showNewBooking && (
        <NewBookingDrawer
          onClose={() => setShowNewBooking(false)}
          onSuccess={() => {
            setShowNewBooking(false)
            refreshAll()
          }}
        />
      )}

      {/* Check In Modal */}
      {checkinBooking && (
        <CheckInModal
          booking={checkinBooking}
          onClose={() => setCheckinBooking(null)}
          onSuccess={() => {
            setCheckinBooking(null)
            refreshAll()
          }}
        />
      )}

      {/* Checkout Modal */}
      {checkoutBooking && (
        <CheckoutModal
          booking={checkoutBooking}
          onClose={() => setCheckoutBooking(null)}
          onSuccess={() => {
            setCheckoutBooking(null)
            refreshAll()
          }}
        />
      )}

      {/* Add Property Modal */}
      {showAddProperty && (
        <AddPropertyModal
          onClose={() => setShowAddProperty(false)}
          onSuccess={async () => {
            setShowAddProperty(false)
            await reloadProperties()
            await refreshAll()
          }}
        />
      )}
    </AppShell>
  )
}
