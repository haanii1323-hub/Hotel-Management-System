'use client'

import { useState } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import AppShell from '@/components/layout/AppShell'
import { DollarSign, Wallet, CreditCard } from 'lucide-react'
import { format } from 'date-fns'
import CollectPaymentModal from '@/components/bookings/CollectPaymentModal'
import BookingDetailsModal from '@/components/bookings/BookingDetailsModal'
import CheckInModal from '@/components/bookings/CheckInModal'
import CheckoutModal from '@/components/bookings/CheckoutModal'
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

export default function EarningsPage() {
  const { currentProperty } = useProperty()
  const propertyId = currentProperty?.id || ''
  const currencySymbol = currentProperty?.currencySymbol || '₹'

  const formatMoney = (n: number) => `${currencySymbol}${Number(n || 0).toLocaleString('en-IN')}`

  const { mutate: globalMutate } = useSWRConfig()
  const { data, isLoading, mutate } = useSWR(
    propertyId ? `/api/earnings?propertyId=${propertyId}` : '/api/earnings',
    fetcher,
    {
      refreshInterval: 3000,
      revalidateOnFocus: true,
      revalidateOnMount: true,
      revalidateOnReconnect: true,
      dedupingInterval: 1000,
    }
  )

  const [selectedBooking, setSelectedBooking] = useState<any>(null)
  const [collectBooking, setCollectBooking] = useState<any>(null)
  const [checkinBooking, setCheckinBooking] = useState<any>(null)
  const [checkoutBooking, setCheckoutBooking] = useState<any>(null)

  const mutateAll = async () => {
    await Promise.all([
      mutate(),
      globalMutate(
        (key) => typeof key === 'string' && key.startsWith('/api/'),
        undefined,
        { revalidate: true }
      ),
    ])
  }

  useRealtimeSync(mutateAll)

  const bookedValue = data?.bookedValue || 0
  const collected = data?.collected || 0
  const balanceToCollect = data?.balanceToCollect || 0
  const collectionRate = bookedValue > 0 ? Math.round((collected / bookedValue) * 100) : 0

  return (
    <AppShell>
      <div className="earnings-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">Earnings &amp; Financials · {currentProperty?.name}</h1>
            <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px' }}>
              {currentProperty?.code} · {currentProperty?.city} · Currency: {currentProperty?.currency} ({currencySymbol})
            </div>
          </div>
        </div>

        {/* Top 3 KPI Cards */}
        <div className="earnings-kpi-grid">
          <div className="kpi-card">
            <div className="kpi-label">
              <Wallet size={14} color="var(--text-2)" /> Total Booked Value
            </div>
            <div className="kpi-value">{isLoading ? '—' : formatMoney(bookedValue)}</div>
            <div className="kpi-sub">Gross reservation charges</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-label" style={{ color: 'var(--green)' }}>
              <DollarSign size={14} color="var(--green)" /> Total Collected
            </div>
            <div className="kpi-value" style={{ color: 'var(--green)' }}>
              {isLoading ? '—' : formatMoney(collected)}
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
              {isLoading ? '—' : formatMoney(balanceToCollect)}
            </div>
            <div className="kpi-sub" style={{ color: 'var(--amber)' }}>
              Outstanding customer dues
            </div>
          </div>
        </div>

        {/* Channels & Payment Modes Grid */}
        <div className="earnings-grid">
          {/* Revenue by Channel */}
          <div className="card">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
              }}
            >
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>Revenue by Channel</div>
                <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px' }}>
                  Distribution of booked revenue across booking sources
                </div>
              </div>
              <span className="badge badge-gray" style={{ fontSize: '11px' }}>
                {data?.channels?.length || 0} Channels
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {data.channels.map((ch: any) => (
                  <div key={ch.name} className="channel-row">
                    <div className="channel-name">{ch.name}</div>
                    <div className="channel-bar-wrap">
                      <div className="channel-bar" style={{ width: `${Math.max(2, ch.percentage)}%` }} />
                    </div>
                    <div className="channel-amount">{formatMoney(ch.amount)}</div>
                    <div className="channel-pct">{ch.percentage}%</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment Methods */}
          <div className="card">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
              }}
            >
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>Collections by Payment Mode</div>
                <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px' }}>
                  Distribution of settled payments
                </div>
              </div>
              <span className="badge badge-green" style={{ fontSize: '11px' }}>
                {formatMoney(collected)}
              </span>
            </div>

            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 36, marginBottom: 8 }} />
              ))
            ) : !data?.paymentModes || data.paymentModes.length === 0 ? (
              <div style={{ color: 'var(--text-2)', fontSize: '13px', padding: '24px 0', textAlign: 'center' }}>
                No payments collected yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {data.paymentModes.map((pm: any) => (
                  <div key={pm.mode} className="channel-row">
                    <div className="channel-name">{pm.mode}</div>
                    <div className="channel-bar-wrap">
                      <div className="channel-bar" style={{ width: `${Math.max(2, pm.percentage)}%`, background: 'var(--green)' }} />
                    </div>
                    <div className="channel-amount">{formatMoney(pm.amount)}</div>
                    <div className="channel-pct">{pm.percentage}%</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
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

      {checkinBooking && (
        <CheckInModal
          booking={checkinBooking}
          onClose={() => setCheckinBooking(null)}
          onSuccess={() => {
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
            mutateAll()
            setCheckoutBooking(null)
          }}
        />
      )}
    </AppShell>
  )
}
