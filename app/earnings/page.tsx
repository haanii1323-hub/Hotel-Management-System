'use client'

import { useState, useMemo } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import AppShell from '@/components/layout/AppShell'
import {
  DollarSign,
  Wallet,
  CreditCard,
  Calendar,
  CalendarDays,
  CalendarRange,
  Clock,
  Layers,
  Receipt,
  Filter,
} from 'lucide-react'
import { format, subDays, startOfMonth, endOfMonth, subMonths, isValid, parseISO } from 'date-fns'
import CollectPaymentModal from '@/components/bookings/CollectPaymentModal'
import BookingDetailsModal from '@/components/bookings/BookingDetailsModal'
import CheckInModal from '@/components/bookings/CheckInModal'
import CheckoutModal from '@/components/bookings/CheckoutModal'
import { useProperty } from '@/context/PropertyContext'
import { useRealtimeSync } from '@/lib/realtime-sync'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type FilterMode = 'daily' | 'monthly' | 'custom' | 'all'

export default function EarningsPage() {
  const { currentProperty } = useProperty()
  const propertyId = currentProperty?.id || ''
  const currencySymbol = currentProperty?.currencySymbol || '₹'

  const formatMoney = (n: number) => `${currencySymbol}${Number(n || 0).toLocaleString('en-IN')}`

  const today = useMemo(() => new Date(), [])
  const todayStr = useMemo(() => format(today, 'yyyy-MM-dd'), [today])
  const currentMonthStr = useMemo(() => format(today, 'yyyy-MM'), [today])

  // Filter state
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [selectedDay, setSelectedDay] = useState(todayStr)
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr)
  const [customFrom, setCustomFrom] = useState(format(subDays(today, 29), 'yyyy-MM-dd'))
  const [customTo, setCustomTo] = useState(todayStr)

  // Compute active from & to based on filterMode
  const { from, to, dateLabel } = useMemo(() => {
    if (filterMode === 'daily') {
      const isToday = selectedDay === todayStr
      const isYesterday = selectedDay === format(subDays(today, 1), 'yyyy-MM-dd')
      let dayText = selectedDay
      try {
        const parsed = parseISO(selectedDay)
        if (isValid(parsed)) {
          dayText = format(parsed, 'dd MMM yyyy')
        }
      } catch {}

      const labelPrefix = isToday ? 'Today · ' : isYesterday ? 'Yesterday · ' : ''
      return {
        from: selectedDay,
        to: selectedDay,
        dateLabel: `${labelPrefix}${dayText}`,
      }
    }

    if (filterMode === 'monthly') {
      let monthStart = `${selectedMonth}-01`
      let monthEnd = selectedMonth
      let label = selectedMonth
      try {
        const parsed = parseISO(`${selectedMonth}-01`)
        if (isValid(parsed)) {
          monthStart = format(startOfMonth(parsed), 'yyyy-MM-dd')
          monthEnd = format(endOfMonth(parsed), 'yyyy-MM-dd')
          label = format(parsed, 'MMMM yyyy')
        }
      } catch {}

      return {
        from: monthStart,
        to: monthEnd,
        dateLabel: label,
      }
    }

    if (filterMode === 'custom') {
      let fromText = customFrom
      let toText = customTo
      try {
        const pFrom = parseISO(customFrom)
        const pTo = parseISO(customTo)
        if (isValid(pFrom) && isValid(pTo)) {
          fromText = format(pFrom, 'dd MMM yyyy')
          toText = format(pTo, 'dd MMM yyyy')
        }
      } catch {}

      return {
        from: customFrom,
        to: customTo,
        dateLabel: `${fromText} → ${toText}`,
      }
    }

    // All Time
    return {
      from: null,
      to: null,
      dateLabel: 'All Time (Lifetime)',
    }
  }, [filterMode, selectedDay, selectedMonth, customFrom, customTo, today, todayStr])

  // Build query string
  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    if (propertyId) params.set('propertyId', propertyId)
    params.set('mode', filterMode)
    if (from && to) {
      params.set('from', from)
      params.set('to', to)
    }
    return params.toString()
  }, [propertyId, filterMode, from, to])

  const { mutate: globalMutate } = useSWRConfig()
  const { data, isLoading, mutate } = useSWR(
    `/api/earnings?${queryString}`,
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
  const totalBookings = data?.totalBookings ?? 0
  const totalPayments = data?.totalPayments ?? 0
  const collectionRate = bookedValue > 0 ? Math.round((collected / bookedValue) * 100) : 0

  return (
    <AppShell>
      <div className="earnings-container">
        {/* Header */}
        <div className="page-header" style={{ marginBottom: '16px' }}>
          <div>
            <h1 className="page-title">Earnings &amp; Financials · {currentProperty?.name}</h1>
            <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px' }}>
              {currentProperty?.code} · {currentProperty?.city} · Currency: {currentProperty?.currency} ({currencySymbol})
            </div>
          </div>
        </div>

        {/* Date Filter & Range Selection Toolbar */}
        <div className="earnings-filter-toolbar">
          <div className="earnings-filter-modes">
            <button
              type="button"
              className={`filter-mode-pill ${filterMode === 'all' ? 'active' : ''}`}
              onClick={() => setFilterMode('all')}
            >
              <Clock size={14} />
              All Time
            </button>
            <button
              type="button"
              className={`filter-mode-pill ${filterMode === 'daily' ? 'active' : ''}`}
              onClick={() => {
                setFilterMode('daily')
                if (!selectedDay) setSelectedDay(todayStr)
              }}
            >
              <Calendar size={14} />
              Daily
            </button>
            <button
              type="button"
              className={`filter-mode-pill ${filterMode === 'monthly' ? 'active' : ''}`}
              onClick={() => {
                setFilterMode('monthly')
                if (!selectedMonth) setSelectedMonth(currentMonthStr)
              }}
            >
              <CalendarDays size={14} />
              Monthly
            </button>
            <button
              type="button"
              className={`filter-mode-pill ${filterMode === 'custom' ? 'active' : ''}`}
              onClick={() => setFilterMode('custom')}
            >
              <CalendarRange size={14} />
              Custom Date
            </button>
          </div>

          {/* Contextual Sub-controls for Selected Mode */}
          <div className="earnings-filter-controls">
            {filterMode === 'daily' && (
              <div className="earnings-sub-controls">
                <div className="reports-presets">
                  <button
                    type="button"
                    className={`preset-btn ${selectedDay === todayStr ? 'active' : ''}`}
                    onClick={() => setSelectedDay(todayStr)}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    className={`preset-btn ${selectedDay === format(subDays(today, 1), 'yyyy-MM-dd') ? 'active' : ''}`}
                    onClick={() => setSelectedDay(format(subDays(today, 1), 'yyyy-MM-dd'))}
                  >
                    Yesterday
                  </button>
                </div>
                <div className="date-input-group">
                  <label>Select Day</label>
                  <input
                    type="date"
                    value={selectedDay}
                    max={todayStr}
                    onChange={(e) => setSelectedDay(e.target.value)}
                  />
                </div>
              </div>
            )}

            {filterMode === 'monthly' && (
              <div className="earnings-sub-controls">
                <div className="reports-presets">
                  <button
                    type="button"
                    className={`preset-btn ${selectedMonth === currentMonthStr ? 'active' : ''}`}
                    onClick={() => setSelectedMonth(currentMonthStr)}
                  >
                    This Month
                  </button>
                  <button
                    type="button"
                    className={`preset-btn ${selectedMonth === format(subMonths(today, 1), 'yyyy-MM') ? 'active' : ''}`}
                    onClick={() => setSelectedMonth(format(subMonths(today, 1), 'yyyy-MM'))}
                  >
                    Last Month
                  </button>
                </div>
                <div className="date-input-group">
                  <label>Select Month</label>
                  <input
                    type="month"
                    value={selectedMonth}
                    max={currentMonthStr}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                  />
                </div>
              </div>
            )}

            {filterMode === 'custom' && (
              <div className="earnings-sub-controls">
                <div className="reports-presets">
                  <button
                    type="button"
                    className={`preset-btn ${customFrom === format(subDays(today, 6), 'yyyy-MM-dd') && customTo === todayStr ? 'active' : ''}`}
                    onClick={() => {
                      setCustomFrom(format(subDays(today, 6), 'yyyy-MM-dd'))
                      setCustomTo(todayStr)
                    }}
                  >
                    7D
                  </button>
                  <button
                    type="button"
                    className={`preset-btn ${customFrom === format(subDays(today, 29), 'yyyy-MM-dd') && customTo === todayStr ? 'active' : ''}`}
                    onClick={() => {
                      setCustomFrom(format(subDays(today, 29), 'yyyy-MM-dd'))
                      setCustomTo(todayStr)
                    }}
                  >
                    30D
                  </button>
                </div>
                <div className="reports-date-inputs">
                  <div className="date-input-group">
                    <label>From</label>
                    <input
                      type="date"
                      value={customFrom}
                      max={customTo}
                      onChange={(e) => setCustomFrom(e.target.value)}
                    />
                  </div>
                  <div className="date-input-group">
                    <label>To</label>
                    <input
                      type="date"
                      value={customTo}
                      min={customFrom}
                      onChange={(e) => setCustomTo(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Active Range Badge */}
            <div className="earnings-active-range-badge">
              <Filter size={12} color="var(--red)" />
              <span>{dateLabel}</span>
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
            <div className="kpi-sub">
              {isLoading ? '—' : `${totalBookings} reservation${totalBookings === 1 ? '' : 's'} in selected period`}
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-label" style={{ color: 'var(--green)' }}>
              <DollarSign size={14} color="var(--green)" /> Total Collected
            </div>
            <div className="kpi-value" style={{ color: 'var(--green)' }}>
              {isLoading ? '—' : formatMoney(collected)}
            </div>
            <div className="kpi-sub" style={{ color: 'var(--text-2)' }}>
              {isLoading ? '—' : `${collectionRate}% of booked value settled (${totalPayments} payments)`}
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
              Outstanding dues on filtered bookings
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
                  Distribution of booked revenue across booking sources ({dateLabel})
                </div>
              </div>
              <span className="badge badge-gray" style={{ fontSize: '11px' }}>
                {data?.channels?.length || 0} Channels
              </span>
            </div>

            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 36, marginBottom: 8 }} />
              ))
            ) : !data?.channels || data.channels.length === 0 ? (
              <div style={{ color: 'var(--text-2)', fontSize: '13px', padding: '32px 0', textAlign: 'center' }}>
                No channel revenue recorded for this period.
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
                  Distribution of settled payments ({dateLabel})
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
              <div style={{ color: 'var(--text-2)', fontSize: '13px', padding: '32px 0', textAlign: 'center' }}>
                No payments collected during this period.
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
