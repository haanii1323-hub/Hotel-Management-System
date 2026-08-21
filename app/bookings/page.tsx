'use client'
import { useState } from 'react'
import useSWR from 'swr'
import AppShell from '@/components/layout/AppShell'
import { format } from 'date-fns'
import { Phone, Search } from 'lucide-react'
import NewBookingDrawer from '@/components/bookings/NewBookingDrawer'
import CheckInModal from '@/components/bookings/CheckInModal'
import CheckoutModal from '@/components/bookings/CheckoutModal'

const fetcher = (url: string) => fetch(url).then(r => r.json())

function fmt(n: number) { return `₹${Number(n).toLocaleString('en-IN')}` }
function fmtDate(d: string | Date) { return format(new Date(d), 'dd MMM') }
function nights(checkIn: string, checkOut: string) {
  return Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)
}

function BookingCard({ b, onCheckin, onCheckout }: { b: any; onCheckin: (b: any) => void; onCheckout: (b: any) => void }) {
  const collected = b.payments?.reduce((s: number, p: any) => s + (p.status !== 'Pending' ? p.amount : 0), 0) || 0
  const balance = b.totalAmount - collected
  const n = nights(b.checkIn, b.checkOut)

  return (
    <div className="booking-row">
      <div className="booking-guest">
        <div className="name">{b.guest.name}</div>
        <div className="ref">{b.bookingRef} · {b.source}</div>
      </div>
      <div className="booking-meta">
        <div>{n} Night{n !== 1 ? 's' : ''}</div>
        <div className="sub">{fmtDate(b.checkIn)} – {fmtDate(b.checkOut)}</div>
      </div>
      <div className="booking-meta">
        <div>{b.numRooms} Room{b.numRooms !== 1 ? 's' : ''}</div>
        <div className="sub">{b.roomCategory}</div>
      </div>
      <div className="booking-amount">
        <div className="total">{fmt(b.totalAmount)}</div>
        <div className={`balance ${balance > 0 ? (collected > 0 ? 'partial' : 'pending') : 'paid'}`}>
          {balance > 0 ? `Collect at hotel: ${fmt(balance)}` : 'Paid'}
        </div>
      </div>
      <div className="booking-actions">
        {b.guest.phone && (
          <a href={`tel:${b.guest.phone}`} className="btn-icon" title={`Call ${b.guest.name}`}>
            <Phone size={14} />
          </a>
        )}
        {b.status === 'Upcoming' && (
          <button className="btn btn-red btn-sm" onClick={() => onCheckin(b)}>Check-in</button>
        )}
        {b.status === 'CheckedIn' && (
          <button className="btn btn-ghost btn-sm" onClick={() => onCheckout(b)}>Checkout</button>
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
  )
}

export default function BookingsPage() {
  const [tab, setTab] = useState<'Upcoming' | 'InHouse' | 'Completed'>('Upcoming')
  const [search, setSearch] = useState('')
  const [showNewBooking, setShowNewBooking] = useState(false)
  const [checkinBooking, setCheckinBooking] = useState<any>(null)
  const [checkoutBooking, setCheckoutBooking] = useState<any>(null)

  const q = search ? `&search=${encodeURIComponent(search)}` : ''
  const { data: upcoming, mutate: mutateUpcoming } = useSWR(`/api/bookings?status=Upcoming${q}`, fetcher, { refreshInterval: 5000 })
  const { data: inhouse, mutate: mutateInhouse } = useSWR(`/api/bookings?status=InHouse${q}`, fetcher, { refreshInterval: 5000 })
  const { data: completed, mutate: mutateCompleted } = useSWR(`/api/bookings?status=Completed${q}`, fetcher, { refreshInterval: 5000 })

  const mutateAll = () => { mutateUpcoming(); mutateInhouse(); mutateCompleted() }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today.getTime() + 86400000)

  // Upcoming: arriving today vs later
  const arrivingToday = (upcoming || []).filter((b: any) => {
    const ci = new Date(b.checkIn); ci.setHours(0,0,0,0)
    return ci.getTime() === today.getTime()
  })
  const arrivingLater = (upcoming || []).filter((b: any) => {
    const ci = new Date(b.checkIn); ci.setHours(0,0,0,0)
    return ci.getTime() > today.getTime()
  })

  // Inhouse: departing today/earlier vs staying on
  const departingTodayEarlier = (inhouse || []).filter((b: any) => {
    const co = new Date(b.checkOut); co.setHours(0,0,0,0)
    return co.getTime() <= today.getTime()
  })
  const stayingOn = (inhouse || []).filter((b: any) => {
    const co = new Date(b.checkOut); co.setHours(0,0,0,0)
    return co.getTime() > today.getTime()
  })

  // Completed sub-sections
  const checkedOut = (completed || []).filter((b: any) => b.status === 'CheckedOut')
  const noShow = (completed || []).filter((b: any) => b.status === 'NoShow')
  const cancelled = (completed || []).filter((b: any) => b.status === 'Cancelled')

  function roomNights(list: any[]) {
    return list.reduce((s: number, b: any) => s + nights(b.checkIn, b.checkOut) * b.numRooms, 0)
  }

  return (
    <AppShell>
      <div className="page-header">
        <h1 className="page-title">Bookings</h1>
        <button className="btn btn-red" onClick={() => setShowNewBooking(true)}>+ New Booking</button>
      </div>

      {/* Tabs + Search */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0' }}>
        <div className="tabs" style={{ marginBottom: 0, borderBottom: 'none' }}>
          {([
            { key: 'Upcoming', label: 'Upcoming', count: (upcoming || []).length },
            { key: 'InHouse', label: 'In-house', count: (inhouse || []).length },
            { key: 'Completed', label: 'Completed', count: (completed || []).length },
          ] as const).map(t => (
            <button key={t.key} className={`tab${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
              {t.label}
              <span className="tab-count">{t.count}</span>
            </button>
          ))}
        </div>
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
          <input
            style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '7px 10px 7px 30px', color: 'var(--text)', fontSize: '13px', outline: 'none', width: '220px' }}
            placeholder="Search name, ID or phone"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div style={{ height: '1px', background: 'var(--border)', marginBottom: '20px' }} />

      {/* UPCOMING */}
      {tab === 'Upcoming' && (
        <>
          <div className="section-header">
            <div className="section-title">Arriving today ({arrivingToday.length})</div>
            <div className="section-meta">Booked room nights: {roomNights(arrivingToday)}</div>
          </div>
          {arrivingToday.length === 0
            ? <div className="empty-state">No arrivals left for today.</div>
            : arrivingToday.map((b: any) => (
                <BookingCard key={b.id} b={b} onCheckin={setCheckinBooking} onCheckout={setCheckoutBooking} />
              ))
          }

          <div className="section-header">
            <div className="section-title">Arriving later ({arrivingLater.length})</div>
            <div className="section-meta">Booked room nights: {roomNights(arrivingLater)}</div>
          </div>
          {arrivingLater.length === 0
            ? <div className="empty-state">No bookings here.</div>
            : arrivingLater.map((b: any) => (
                <BookingCard key={b.id} b={b} onCheckin={setCheckinBooking} onCheckout={setCheckoutBooking} />
              ))
          }
        </>
      )}

      {/* IN-HOUSE */}
      {tab === 'InHouse' && (
        <>
          <div className="section-header">
            <div className="section-title">Departing today or earlier ({departingTodayEarlier.length})</div>
            <div className="section-meta">Booked room nights: {roomNights(departingTodayEarlier)}</div>
          </div>
          {departingTodayEarlier.length === 0
            ? <div className="empty-state">No bookings here.</div>
            : departingTodayEarlier.map((b: any) => (
                <BookingCard key={b.id} b={b} onCheckin={setCheckinBooking} onCheckout={setCheckoutBooking} />
              ))
          }

          <div className="section-header">
            <div className="section-title">Staying on ({stayingOn.length})</div>
            <div className="section-meta">Booked room nights: {roomNights(stayingOn)}</div>
          </div>
          {stayingOn.length === 0
            ? <div className="empty-state">No bookings here.</div>
            : stayingOn.map((b: any) => (
                <BookingCard key={b.id} b={b} onCheckin={setCheckinBooking} onCheckout={setCheckoutBooking} />
              ))
          }
        </>
      )}

      {/* COMPLETED */}
      {tab === 'Completed' && (
        <>
          <div className="section-header">
            <div className="section-title">Checked out ({checkedOut.length})</div>
            <div className="section-meta">Booked room nights: {roomNights(checkedOut)}</div>
          </div>
          {checkedOut.length === 0
            ? <div className="empty-state">No bookings here.</div>
            : checkedOut.map((b: any) => (
                <BookingCard key={b.id} b={b} onCheckin={setCheckinBooking} onCheckout={setCheckoutBooking} />
              ))
          }

          <div className="section-header">
            <div className="section-title">No show ({noShow.length})</div>
          </div>
          <div className="empty-state">{noShow.length === 0 ? 'No bookings here.' : noShow.map((b: any) => (
            <BookingCard key={b.id} b={b} onCheckin={setCheckinBooking} onCheckout={setCheckoutBooking} />
          ))}</div>

          <div className="section-header">
            <div className="section-title">Cancelled ({cancelled.length})</div>
          </div>
          <div className="empty-state">{cancelled.length === 0 ? 'No bookings here.' : cancelled.map((b: any) => (
            <BookingCard key={b.id} b={b} onCheckin={setCheckinBooking} onCheckout={setCheckoutBooking} />
          ))}</div>
        </>
      )}

      {showNewBooking && (
        <NewBookingDrawer onClose={() => setShowNewBooking(false)} onSuccess={() => { mutateAll(); setShowNewBooking(false) }} />
      )}
      {checkinBooking && (
        <CheckInModal booking={checkinBooking} onClose={() => setCheckinBooking(null)} onSuccess={() => { mutateAll(); setCheckinBooking(null) }} />
      )}
      {checkoutBooking && (
        <CheckoutModal booking={checkoutBooking} onClose={() => setCheckoutBooking(null)} onSuccess={() => { mutateAll(); setCheckoutBooking(null) }} />
      )}
    </AppShell>
  )
}
