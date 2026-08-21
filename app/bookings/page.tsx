'use client'

import { useState } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import AppShell from '@/components/layout/AppShell'
import { format } from 'date-fns'
import { Phone, Search, ArrowRight } from 'lucide-react'
import NewBookingDrawer from '@/components/bookings/NewBookingDrawer'
import CheckInModal from '@/components/bookings/CheckInModal'
import CheckoutModal from '@/components/bookings/CheckoutModal'
import BookingDetailsModal from '@/components/bookings/BookingDetailsModal'
import CollectPaymentModal from '@/components/bookings/CollectPaymentModal'

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

function getDateString(d: string | Date | null | undefined): string {
  if (!d) return ''
  if (typeof d === 'string') {
    const match = d.match(/^(\d{4}-\d{2}-\d{2})/)
    if (match) return match[1]
  }
  const dt = new Date(d)
  return format(dt, 'yyyy-MM-dd')
}

function nights(checkIn: string, checkOut: string) {
  if (!checkIn || !checkOut) return 1
  const d1 = parseBookingDate(checkIn)
  const d2 = parseBookingDate(checkOut)
  if (!d1 || !d2) return 1
  return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000))
}

function BookingCard({
  b,
  onSelect,
  onCheckin,
  onCheckout,
}: {
  b: any
  onSelect: (b: any) => void
  onCheckin: (b: any) => void
  onCheckout: (b: any) => void
}) {
  const collected =
    b.payments?.reduce(
      (s: number, p: any) => s + (p.status !== 'Pending' ? p.amount : 0),
      0
    ) || 0
  const balance = Math.max(0, (b.totalAmount || 0) - collected)
  const n = nights(b.checkIn, b.checkOut)

  const statusBadge = () => {
    if (b.status === 'Upcoming') return <span className="badge badge-amber">Upcoming</span>
    if (b.status === 'CheckedIn') return <span className="badge badge-green">In-house</span>
    if (b.status === 'CheckedOut') return <span className="badge badge-green">Checked out</span>
    if (b.status === 'NoShow') return <span className="badge badge-gray">No show</span>
    if (b.status === 'Cancelled') return <span className="badge badge-red">Cancelled</span>
    return <span className="badge badge-gray">{b.status}</span>
  }

  return (
    <div
      className="booking-row"
      onClick={() => onSelect(b)}
      role="button"
      tabIndex={0}
      title="Click to view full booking details"
    >
      {/* Desktop Columns View */}
      <div className="booking-desktop-view">
        <div className="booking-guest">
          <div className="name">{b.guest?.name || 'Guest'}</div>
          <div className="ref">
            {b.bookingRef} · {b.source}
          </div>
        </div>
        <div className="booking-meta">
          <div>
            {n} Night{n !== 1 ? 's' : ''}
          </div>
          <div className="sub">
            {fmtDate(b.checkIn)} – {fmtDate(b.checkOut)}
          </div>
        </div>
        <div className="booking-meta">
          <div>
            {b.numRooms} Room{b.numRooms !== 1 ? 's' : ''}
          </div>
          <div className="sub">{b.roomCategory}</div>
        </div>
        <div className="booking-amount">
          <div className="total">{fmt(b.totalAmount)}</div>
          <div
            className={`balance ${
              balance > 0 ? (collected > 0 ? 'partial' : 'pending') : 'paid'
            }`}
          >
            {balance > 0 ? `Collect at hotel: ${fmt(balance)}` : 'Paid'}
          </div>
        </div>
        <div className="booking-actions">
          {b.guest?.phone && (
            <a
              href={`tel:${b.guest.phone}`}
              className="btn-icon"
              title={`Call ${b.guest.name}`}
              onClick={(e) => e.stopPropagation()}
            >
              <Phone size={14} />
            </a>
          )}
          {b.status === 'Upcoming' && (
            <button
              className="btn btn-red btn-sm"
              onClick={(e) => {
                e.stopPropagation()
                onCheckin(b)
              }}
            >
              Check-in
            </button>
          )}
          {b.status === 'CheckedIn' && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={(e) => {
                e.stopPropagation()
                onCheckout(b)
              }}
            >
              Checkout
            </button>
          )}
          {b.status === 'CheckedOut' && (
            <span className="badge badge-green">Checked out</span>
          )}
          {b.status === 'NoShow' && (
            <span className="badge badge-gray">No show</span>
          )}
          {b.status === 'Cancelled' && (
            <span className="badge badge-red">Cancelled</span>
          )}
        </div>
      </div>

      {/* Mobile Vertical Card View */}
      <div className="booking-mobile-view">
        <div className="booking-card-top">
          <div>
            <div className="booking-card-name">{b.guest?.name || 'Guest'}</div>
            <div className="booking-card-ref">
              {b.bookingRef} · {b.source}
            </div>
          </div>
          <div>{statusBadge()}</div>
        </div>

        <div className="booking-card-body">
          <div className="booking-card-body-item">
            <div>
              {n} Night{n !== 1 ? 's' : ''}
            </div>
            <div className="sub">
              {fmtDate(b.checkIn)} – {fmtDate(b.checkOut)}
            </div>
          </div>
          <div className="booking-card-body-item">
            <div>
              {b.numRooms} Room{b.numRooms !== 1 ? 's' : ''}
            </div>
            <div className="sub">{b.roomCategory}</div>
          </div>
        </div>

        <div className="booking-card-amount-row">
          <div>
            <div className="booking-card-total">{fmt(b.totalAmount)}</div>
          </div>
          <div
            className={`booking-card-balance ${
              balance > 0 ? (collected > 0 ? 'partial' : 'pending') : 'paid'
            }`}
          >
            {balance > 0 ? `Collect at hotel: ${fmt(balance)}` : 'Paid'}
          </div>
        </div>

        <div className="booking-card-actions">
          {b.guest?.phone ? (
            <a
              href={`tel:${b.guest.phone}`}
              className="btn btn-ghost btn-sm"
              style={{ padding: '8px 14px', gap: '6px' }}
              title={`Call ${b.guest.name}`}
              onClick={(e) => e.stopPropagation()}
            >
              <Phone size={14} /> Call
            </a>
          ) : (
            <div />
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {b.status === 'Upcoming' && (
              <button
                className="btn btn-red btn-sm"
                style={{ padding: '8px 16px', fontWeight: 600 }}
                onClick={(e) => {
                  e.stopPropagation()
                  onCheckin(b)
                }}
              >
                Check-in
              </button>
            )}
            {b.status === 'CheckedIn' && (
              <button
                className="btn btn-ghost btn-sm"
                style={{ padding: '8px 16px', fontWeight: 600 }}
                onClick={(e) => {
                  e.stopPropagation()
                  onCheckout(b)
                }}
              >
                Checkout
              </button>
            )}
            {b.status === 'CheckedOut' && (
              <span className="badge badge-green" style={{ padding: '6px 12px' }}>
                Checked out
              </span>
            )}
            {b.status === 'NoShow' && (
              <span className="badge badge-gray" style={{ padding: '6px 12px' }}>
                No show
              </span>
            )}
            {b.status === 'Cancelled' && (
              <span className="badge badge-red" style={{ padding: '6px 12px' }}>
                Cancelled
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function BookingsPage() {
  const [tab, setTab] = useState<'Upcoming' | 'InHouse' | 'Completed'>('Upcoming')
  const [search, setSearch] = useState('')
  const [showNewBooking, setShowNewBooking] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<any>(null)
  const [checkinBooking, setCheckinBooking] = useState<any>(null)
  const [checkoutBooking, setCheckoutBooking] = useState<any>(null)
  const [collectBooking, setCollectBooking] = useState<any>(null)

  const { mutate: globalMutate } = useSWRConfig()

  const q = search ? `&search=${encodeURIComponent(search)}` : ''
  const swrConfig = {
    refreshInterval: 3000,
    revalidateOnFocus: true,
    revalidateOnMount: true,
    revalidateOnReconnect: true,
    dedupingInterval: 1000,
  }

  const { data: upcoming, mutate: mutateUpcoming } = useSWR(
    `/api/bookings?status=Upcoming${q}`,
    fetcher,
    swrConfig
  )
  const { data: inhouse, mutate: mutateInhouse } = useSWR(
    `/api/bookings?status=InHouse${q}`,
    fetcher,
    swrConfig
  )
  const { data: completed, mutate: mutateCompleted } = useSWR(
    `/api/bookings?status=Completed${q}`,
    fetcher,
    swrConfig
  )

  const mutateAll = async () => {
    await Promise.all([
      mutateUpcoming(),
      mutateInhouse(),
      mutateCompleted(),
      globalMutate(
        (key) => typeof key === 'string' && (key.startsWith('/api/bookings') || key.startsWith('/api/dashboard') || key.startsWith('/api/earnings') || key.startsWith('/api/guests') || key.startsWith('/api/rooms')),
        undefined,
        { revalidate: true }
      ),
    ])
  }

  const now = new Date()
  const todayDateStr = format(now, 'yyyy-MM-dd')

  // Upcoming: arriving today or overdue vs arriving later
  const arrivingToday = (upcoming || []).filter((b: any) => {
    const ciStr = getDateString(b.checkIn)
    return ciStr <= todayDateStr
  })
  const arrivingLater = (upcoming || []).filter((b: any) => {
    const ciStr = getDateString(b.checkIn)
    return ciStr > todayDateStr
  })

  // Inhouse: departing today or earlier vs staying on
  const departingTodayEarlier = (inhouse || []).filter((b: any) => {
    const coStr = getDateString(b.checkOut)
    return coStr <= todayDateStr
  })
  const stayingOn = (inhouse || []).filter((b: any) => {
    const coStr = getDateString(b.checkOut)
    return coStr > todayDateStr
  })


  // Completed sub-sections
  const checkedOut = (completed || []).filter((b: any) => b.status === 'CheckedOut')
  const noShow = (completed || []).filter((b: any) => b.status === 'NoShow')
  const cancelled = (completed || []).filter((b: any) => b.status === 'Cancelled')

  function roomNights(list: any[]) {
    return list.reduce(
      (s: number, b: any) => s + nights(b.checkIn, b.checkOut) * (b.numRooms || 1),
      0
    )
  }

  return (
    <AppShell>
      <div className="bookings-container">
        {/* Page Header */}
        <div className="page-header">
          <h1 className="page-title">Bookings</h1>
          <button className="btn btn-red" onClick={() => setShowNewBooking(true)}>
            + New Booking
          </button>
        </div>

        {/* Tabs + Search Toolbar */}
        <div className="bookings-toolbar">
          <div className="tabs">
            {(
              [
                { key: 'Upcoming', label: 'Upcoming', count: (upcoming || []).length },
                { key: 'InHouse', label: 'In-house', count: (inhouse || []).length },
                { key: 'Completed', label: 'Completed', count: (completed || []).length },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                className={`tab${tab === t.key ? ' active' : ''}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
                <span className="tab-count">{t.count}</span>
              </button>
            ))}
          </div>

          <div className="bookings-search-box">
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-3)',
              }}
            />
            <input
              className="bookings-search-input"
              placeholder="Search name, ID or phone"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="bookings-divider" />

        {/* UPCOMING TAB */}
        {tab === 'Upcoming' && (
          <>
            <div className="section-header">
              <div className="section-title">Arriving today ({arrivingToday.length})</div>
              <div className="section-meta">Booked room nights: {roomNights(arrivingToday)}</div>
            </div>
            {arrivingToday.length === 0 ? (
              <div className="empty-state">No arrivals left for today.</div>
            ) : (
              arrivingToday.map((b: any) => (
                <BookingCard
                  key={b.id}
                  b={b}
                  onSelect={setSelectedBooking}
                  onCheckin={setCheckinBooking}
                  onCheckout={setCheckoutBooking}
                />
              ))
            )}

            <div className="section-header">
              <div className="section-title">Arriving later ({arrivingLater.length})</div>
              <div className="section-meta">Booked room nights: {roomNights(arrivingLater)}</div>
            </div>
            {arrivingLater.length === 0 ? (
              <div className="empty-state">No bookings here.</div>
            ) : (
              arrivingLater.map((b: any) => (
                <BookingCard
                  key={b.id}
                  b={b}
                  onSelect={setSelectedBooking}
                  onCheckin={setCheckinBooking}
                  onCheckout={setCheckoutBooking}
                />
              ))
            )}
          </>
        )}

        {/* IN-HOUSE TAB */}
        {tab === 'InHouse' && (
          <>
            <div className="section-header">
              <div className="section-title">
                Departing today or earlier ({departingTodayEarlier.length})
              </div>
              <div className="section-meta">
                Booked room nights: {roomNights(departingTodayEarlier)}
              </div>
            </div>
            {departingTodayEarlier.length === 0 ? (
              <div className="empty-state">No bookings here.</div>
            ) : (
              departingTodayEarlier.map((b: any) => (
                <BookingCard
                  key={b.id}
                  b={b}
                  onSelect={setSelectedBooking}
                  onCheckin={setCheckinBooking}
                  onCheckout={setCheckoutBooking}
                />
              ))
            )}

            <div className="section-header">
              <div className="section-title">Staying on ({stayingOn.length})</div>
              <div className="section-meta">Booked room nights: {roomNights(stayingOn)}</div>
            </div>
            {stayingOn.length === 0 ? (
              <div className="empty-state">No bookings here.</div>
            ) : (
              stayingOn.map((b: any) => (
                <BookingCard
                  key={b.id}
                  b={b}
                  onSelect={setSelectedBooking}
                  onCheckin={setCheckinBooking}
                  onCheckout={setCheckoutBooking}
                />
              ))
            )}
          </>
        )}

        {/* COMPLETED TAB */}
        {tab === 'Completed' && (
          <>
            <div className="section-header">
              <div className="section-title">Checked out ({checkedOut.length})</div>
              <div className="section-meta">Booked room nights: {roomNights(checkedOut)}</div>
            </div>
            {checkedOut.length === 0 ? (
              <div className="empty-state">No bookings here.</div>
            ) : (
              checkedOut.map((b: any) => (
                <BookingCard
                  key={b.id}
                  b={b}
                  onSelect={setSelectedBooking}
                  onCheckin={setCheckinBooking}
                  onCheckout={setCheckoutBooking}
                />
              ))
            )}

            <div className="section-header">
              <div className="section-title">No show ({noShow.length})</div>
            </div>
            {noShow.length === 0 ? (
              <div className="empty-state">No bookings here.</div>
            ) : (
              noShow.map((b: any) => (
                <BookingCard
                  key={b.id}
                  b={b}
                  onSelect={setSelectedBooking}
                  onCheckin={setCheckinBooking}
                  onCheckout={setCheckoutBooking}
                />
              ))
            )}

            <div className="section-header">
              <div className="section-title">Cancelled ({cancelled.length})</div>
            </div>
            {cancelled.length === 0 ? (
              <div className="empty-state">No bookings here.</div>
            ) : (
              cancelled.map((b: any) => (
                <BookingCard
                  key={b.id}
                  b={b}
                  onSelect={setSelectedBooking}
                  onCheckin={setCheckinBooking}
                  onCheckout={setCheckoutBooking}
                />
              ))
            )}
          </>
        )}
      </div>

      {/* Modals & Drawers */}
      {selectedBooking && (
        <BookingDetailsModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onCheckin={(b) => {
            setSelectedBooking(null)
            setCheckinBooking(b)
          }}
          onCheckout={(b) => {
            setSelectedBooking(null)
            setCheckoutBooking(b)
          }}
          onCollectPayment={(b) => {
            setSelectedBooking(null)
            setCollectBooking(b)
          }}
          onSuccess={mutateAll}
        />
      )}

      {showNewBooking && (
        <NewBookingDrawer
          onClose={() => setShowNewBooking(false)}
          onSuccess={(newB) => {
            setTab('Upcoming')
            mutateAll()
            setShowNewBooking(false)
            if (newB) setSelectedBooking(newB)
          }}
        />
      )}

      {checkinBooking && (
        <CheckInModal
          booking={checkinBooking}
          onClose={() => setCheckinBooking(null)}
          onSuccess={() => {
            setTab('InHouse')
            mutateAll()
            setCheckinBooking(null)
          }}
        />
      )}

      {checkoutBooking && (
        <CheckoutModal
          booking={checkoutBooking}
          onClose={() => setCheckoutBooking(null)}
          onSuccess={() => {
            setTab('Completed')
            mutateAll()
            setCheckoutBooking(null)
          }}
        />
      )}

      {collectBooking && (
        <CollectPaymentModal
          booking={collectBooking}
          onClose={() => setCollectBooking(null)}
          onSuccess={() => {
            mutateAll()
            setCollectBooking(null)
          }}
        />
      )}
    </AppShell>
  )
}
