'use client'

import { useState } from 'react'
import useSWR from 'swr'
import AppShell from '@/components/layout/AppShell'
import { useRouter } from 'next/navigation'
import { Phone, ArrowRight, DollarSign, Wallet, CreditCard, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import CollectPaymentModal from '@/components/bookings/CollectPaymentModal'
import BookingDetailsModal from '@/components/bookings/BookingDetailsModal'
import CheckInModal from '@/components/bookings/CheckInModal'
import CheckoutModal from '@/components/bookings/CheckoutModal'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function fmt(n: number) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`
}

function fmtDate(d: string | Date | null | undefined) {
  if (!d) return '—'
  return format(new Date(d), 'dd MMM')
}

export default function EarningsPage() {
  const router = useRouter()
  const { data, isLoading, mutate } = useSWR('/api/earnings', fetcher, { refreshInterval: 5000 })
  const [selectedBooking, setSelectedBooking] = useState<any>(null)
  const [collectBooking, setCollectBooking] = useState<any>(null)
  const [checkinBooking, setCheckinBooking] = useState<any>(null)
  const [checkoutBooking, setCheckoutBooking] = useState<any>(null)

  const bookedValue = data?.bookedValue || 0
  const collected = data?.collected || 0
  const balance = data?.balance || 0
  const collectionRate = bookedValue > 0 ? Math.round((collected / bookedValue) * 100) : 0

  return (
    <AppShell>
      <div className="earnings-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">Earnings &amp; Financials</h1>
            <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px' }}>
              Real-time revenue, collections, channel breakdown, and pending balances
            </div>
          </div>
        </div>

        {/* Top 3 KPI Cards */}
        <div className="earnings-kpi-grid">
          <div className="kpi-card">
            <div className="kpi-label">
              <Wallet size={14} color="var(--text-2)" /> Total Booked Value
            </div>
            <div className="kpi-value">{isLoading ? '—' : fmt(bookedValue)}</div>
            <div className="kpi-sub">Gross reservation charges</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-label" style={{ color: 'var(--green)' }}>
              <DollarSign size={14} color="var(--green)" /> Total Collected
            </div>
            <div className="kpi-value" style={{ color: 'var(--green)' }}>
              {isLoading ? '—' : fmt(collected)}
            </div>
            <div className="kpi-sub" style={{ color: 'var(--text-2)' }}>
              {isLoading ? '—' : `${collectionRate}% of booked value settled`}
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-label" style={{ color: 'var(--amber)' }}>
              <CreditCard size={14} color="var(--amber)" /> Balance to Collect
            </div>
            <div className="kpi-value" style={{ color: 'var(--amber)' }}>
              {isLoading ? '—' : fmt(balance)}
            </div>
            <div className="kpi-sub" style={{ color: 'var(--amber)' }}>
              {data?.outstanding?.length || 0} pending reservations
            </div>
          </div>
        </div>

        {/* Main Grid: Revenue by Channel & Outstanding Balances */}
        <div className="earnings-grid">
          {/* Revenue by Channel */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>Revenue by Channel</div>
                <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px' }}>
                  Distribution of collected revenue across booking sources
                </div>
              </div>
              <span className="badge badge-gray" style={{ fontSize: '11px' }}>
                {data?.channels?.length || 0} Sources
              </span>
            </div>

            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 36, marginBottom: 8 }} />
              ))
            ) : !data?.channels || data.channels.length === 0 ? (
              <div style={{ color: 'var(--text-2)', fontSize: '13px', padding: '24px 0', textAlign: 'center' }}>
                No channel revenue collected yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {data.channels.map((ch: any) => (
                  <div key={ch.name} className="channel-row">
                    <div className="channel-name">{ch.name}</div>
                    <div className="channel-bar-wrap">
                      <div className="channel-bar" style={{ width: `${Math.max(2, ch.percentage)}%` }} />
                    </div>
                    <div className="channel-amount">{fmt(ch.amount)}</div>
                    <div className="channel-pct">{ch.percentage}%</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Outstanding Balances List */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>Outstanding Balances</div>
                <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px' }}>
                  Click any booking to collect payment or inspect details
                </div>
              </div>
              <span className="badge badge-amber" style={{ fontSize: '11px' }}>
                {fmt(balance)} Due
              </span>
            </div>

            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 56, marginBottom: 8 }} />
              ))
            ) : !data?.outstanding || data.outstanding.length === 0 ? (
              <div style={{ color: 'var(--text-2)', fontSize: '13px', padding: '32px 0', textAlign: 'center' }}>
                🎉 All bookings are fully paid! No outstanding balances.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {data.outstanding.map((o: any) => (
                  <div
                    key={o.bookingId}
                    className="outstanding-card"
                    onClick={() => setSelectedBooking(o.booking)}
                    role="button"
                    tabIndex={0}
                    title="Click to view booking & collect payment"
                  >
                    <div className="outstanding-card-main">
                      <div className="outstanding-guest-name">{o.guestName}</div>
                      <div className="outstanding-meta-text">
                        {o.bookingRef} · {o.roomCategory} ({fmtDate(o.checkIn)} – {fmtDate(o.checkOut)})
                      </div>
                    </div>

                    <div className="outstanding-card-right">
                      <div className="outstanding-amount-text">{fmt(o.amount)}</div>
                      <button
                        className="btn btn-red btn-sm outstanding-collect-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          setCollectBooking(o.booking)
                        }}
                      >
                        Collect →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals for Direct Actions from Earnings */}
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
          onSuccess={mutate}
        />
      )}

      {collectBooking && (
        <CollectPaymentModal
          booking={collectBooking}
          onClose={() => setCollectBooking(null)}
          onSuccess={() => {
            mutate()
            setCollectBooking(null)
          }}
        />
      )}

      {checkinBooking && (
        <CheckInModal
          booking={checkinBooking}
          onClose={() => setCheckinBooking(null)}
          onSuccess={() => {
            mutate()
            setCheckinBooking(null)
          }}
        />
      )}

      {checkoutBooking && (
        <CheckoutModal
          booking={checkoutBooking}
          onClose={() => setCheckoutBooking(null)}
          onSuccess={() => {
            mutate()
            setCheckoutBooking(null)
          }}
        />
      )}
    </AppShell>
  )
}
