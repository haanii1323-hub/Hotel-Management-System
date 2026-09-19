'use client'

import { useState, useEffect, Suspense } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import { useSearchParams } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import {
  Phone,
  Search,
  CheckCircle2,
  Clock,
  Calendar,
  CalendarDays,
  Filter,
  Plus,
  RefreshCw,
  X,
  Pencil,
  DollarSign,
  Layers,
  ArrowRight,
} from 'lucide-react'
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isValid, parseISO } from 'date-fns'
import NewBookingDrawer from '@/components/bookings/NewBookingDrawer'
import BookingDetailsModal from '@/components/bookings/BookingDetailsModal'
import CheckInModal from '@/components/bookings/CheckInModal'
import CheckoutModal from '@/components/bookings/CheckoutModal'
import CollectPaymentModal from '@/components/bookings/CollectPaymentModal'
import { useToast } from '@/components/ui/Toast'
import SourceBadge from '@/components/ui/SourceBadge'
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

function getDateString(d: string | Date | null | undefined): string {
  const parsed = parseBookingDate(d)
  if (!parsed) return ''
  return format(parsed, 'yyyy-MM-dd')
}

function nights(checkIn: string, checkOut: string) {
  if (!checkIn || !checkOut) return 1
  const d1 = parseBookingDate(checkIn)
  const d2 = parseBookingDate(checkOut)
  if (!d1 || !d2) return 1
  return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000))
}

const SOURCES = [
  'All',
  'GOMMT',
  'OYO',
  'B.COM',
  'AIRBNB',
  'BREVISTAY',
  'B2B',
  'CLEARTRIP',
  'YATRA',
  'EXPEDIA',
  'AGODA',
  'Fab',
  'Corporate',
  'Walk inn',
]

function BookingCard({
  b,
  currencySymbol = '₹',
  onSelect,
  onCheckin,
  onCheckout,
}: {
  b: any
  currencySymbol?: string
  onSelect: (b: any) => void
  onCheckin: (b: any) => void
  onCheckout: (b: any) => void
}) {
  const formatMoney = (n: number) => `${currencySymbol}${Number(n || 0).toLocaleString('en-IN')}`
  const collected =
    b.payments?.reduce(
      (s: number, p: any) => s + (p.status !== 'Pending' ? p.amount : 0),
      0
    ) || 0
  const balance = Math.max(0, (b.totalAmount || 0) - collected)
  const n = nights(b.checkIn, b.checkOut)

  const statusBadge = () => {
    if (b.status === 'Upcoming') return <span className="badge badge-amber">Upcoming</span>
    if (b.status === 'CheckedIn') return <span className="badge badge-blue">In-house</span>
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
          <div className="ref" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span>{b.bookingRef}</span>
            <SourceBadge source={b.source} size="xs" />
          </div>
        </div>
        <div className="booking-meta">
          <div>
            {fmtDate(b.checkIn) === fmtDate(b.checkOut) ? 'Same-day (1D)' : `${n} Night${n !== 1 ? 's' : ''}`}
          </div>
          <div className="sub">
            {fmtDate(b.checkIn)} – {fmtDate(b.checkOut)}
          </div>
        </div>
        <div className="booking-meta">
          <div>
            {b.bookingRooms && b.bookingRooms.length > 0
              ? `Room ${b.bookingRooms.map((br: any) => br.room?.number).filter(Boolean).join(', ')}`
              : `${b.numRooms} Room${b.numRooms !== 1 ? 's' : ''}`}
          </div>
          <div className="sub">{b.roomCategory}</div>
        </div>
        <div className="booking-amount">
          <div className="total">{formatMoney(b.totalAmount)}</div>
          <div
            className={`balance ${
              balance > 0 ? (collected > 0 ? 'partial' : 'pending') : 'paid'
            }`}
          >
            {balance > 0 ? `Collect: ${formatMoney(balance)}` : 'Paid'}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="badge badge-green">Checked out</span>
              <button
                className="btn btn-ghost btn-sm"
                style={{ padding: '4px 8px', fontSize: '11px', gap: '4px' }}
                onClick={(e) => {
                  e.stopPropagation()
                  onSelect(b)
                }}
                title="View / Edit Booking"
              >
                <Pencil size={12} /> Edit
              </button>
            </div>
          )}
          {b.status === 'NoShow' && (
            <span className="badge badge-gray">No show</span>
          )}
          {b.status === 'Cancelled' && (
            <span className="badge badge-red">Cancelled</span>
          )}
        </div>
      </div>

      {/* Mobile View */}
      <div className="booking-mobile-view">
        <div className="booking-card-top">
          <div>
            <div className="booking-card-name">{b.guest?.name || 'Guest'}</div>
            <div className="booking-card-ref" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
              <span>{b.bookingRef}</span>
              <SourceBadge source={b.source} size="xs" />
            </div>
          </div>
          <div>{statusBadge()}</div>
        </div>

        <div className="booking-card-body">
          <div className="booking-card-body-item">
            <div>
              {fmtDate(b.checkIn) === fmtDate(b.checkOut) ? 'Same-day (1D)' : `${n} Night${n !== 1 ? 's' : ''}`}
            </div>
            <div className="sub">
              {fmtDate(b.checkIn)} – {fmtDate(b.checkOut)}
            </div>
          </div>
          <div className="booking-card-body-item">
            <div>
              {b.bookingRooms && b.bookingRooms.length > 0
                ? `Room ${b.bookingRooms.map((br: any) => br.room?.number).filter(Boolean).join(', ')}`
                : `${b.numRooms} Room${b.numRooms !== 1 ? 's' : ''}`}
            </div>
            <div className="sub">{b.roomCategory}</div>
          </div>
        </div>

        <div className="booking-card-amount-row">
          <div>
            <div className="booking-card-total">{formatMoney(b.totalAmount)}</div>
          </div>
          <div
            className={`booking-card-balance ${
              balance > 0 ? (collected > 0 ? 'partial' : 'pending') : 'paid'
            }`}
          >
            {balance > 0 ? `Collect: ${formatMoney(balance)}` : 'Paid'}
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
              <button
                className="btn btn-ghost btn-sm"
                style={{ padding: '8px 14px', gap: '6px' }}
                onClick={(e) => {
                  e.stopPropagation()
                  onSelect(b)
                }}
              >
                <Pencil size={13} /> Edit / Manage
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function BookingsContent() {
  const searchParams = useSearchParams()
  const selectedParam = searchParams.get('selected')

  const { currentProperty } = useProperty()
  const propertyId = currentProperty?.id || ''
  const currencySymbol = currentProperty?.currencySymbol || '₹'

  const { data: categoriesData } = useSWR(
    propertyId ? `/api/categories?propertyId=${propertyId}` : '/api/categories',
    fetcher
  )
  const categoryOptions = ['All', ...(categoriesData || []).map((c: any) => c.name)]

  const [tab, setTab] = useState<'Upcoming' | 'InHouse' | 'Completed'>('Upcoming')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [sourceFilter, setSourceFilter] = useState('All')

  // Date Filter State for Checkouts & Completed
  type DatePreset = 'all' | 'today' | 'yesterday' | 'thisWeek' | 'thisMonth' | 'custom'
  type CompletedSubFilter = 'all' | 'checkedOut' | 'noShow' | 'cancelled'

  const [datePreset, setDatePreset] = useState<DatePreset>('all')
  const [customFrom, setCustomFrom] = useState(format(subDays(new Date(), 29), 'yyyy-MM-dd'))
  const [customTo, setCustomTo] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [completedSubFilter, setCompletedSubFilter] = useState<CompletedSubFilter>('all')

  const [showNewBooking, setShowNewBooking] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<any>(null)
  const [checkinBooking, setCheckinBooking] = useState<any>(null)
  const [checkoutBooking, setCheckoutBooking] = useState<any>(null)
  const [collectBooking, setCollectBooking] = useState<any>(null)

  const { mutate: globalMutate } = useSWRConfig()

  let q = propertyId ? `&propertyId=${propertyId}` : ''
  if (search.trim()) q += `&search=${encodeURIComponent(search.trim())}`
  if (categoryFilter !== 'All') q += `&category=${encodeURIComponent(categoryFilter)}`
  if (sourceFilter !== 'All') q += `&source=${encodeURIComponent(sourceFilter)}`

  const swrConfig = {
    refreshInterval: 60000,
    revalidateOnFocus: true,
    revalidateOnMount: true,
    revalidateOnReconnect: true,
    dedupingInterval: 2000,
  }

  const { data: upcoming, mutate: mutateUpcoming, isLoading: loadingUpcoming } = useSWR(
    `/api/bookings?status=Upcoming${q}`,
    fetcher,
    swrConfig
  )
  const { data: inhouse, mutate: mutateInhouse, isLoading: loadingInhouse } = useSWR(
    `/api/bookings?status=InHouse${q}`,
    fetcher,
    swrConfig
  )
  const { data: completed, mutate: mutateCompleted, isLoading: loadingCompleted } = useSWR(
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
        (key) =>
          typeof key === 'string' &&
          (key.startsWith('/api/bookings') ||
            key.startsWith('/api/dashboard') ||
            key.startsWith('/api/earnings') ||
            key.startsWith('/api/guests') ||
            key.startsWith('/api/rooms')),
        undefined,
        { revalidate: true }
      ),
    ])
  }

  useRealtimeSync(mutateAll)

  // Handle URL param selection
  useEffect(() => {
    if (selectedParam) {
      fetch(`/api/bookings/${selectedParam}`)
        .then((r) => r.json())
        .then((b) => {
          if (b && !b.error) {
            setSelectedBooking(b)
            if (b.status === 'Upcoming') setTab('Upcoming')
            else if (b.status === 'CheckedIn') setTab('InHouse')
            else if (b.status === 'CheckedOut' || b.status === 'Cancelled') setTab('Completed')
          }
        })
        .catch(() => {})
    }
  }, [selectedParam])

  const now = new Date()
  const todayDateStr = format(now, 'yyyy-MM-dd')
  const yesterdayDateStr = format(subDays(now, 1), 'yyyy-MM-dd')
  const startOfWeekStr = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const endOfWeekStr = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const startOfMonthStr = format(startOfMonth(now), 'yyyy-MM-dd')
  const endOfMonthStr = format(endOfMonth(now), 'yyyy-MM-dd')

  const arrivingToday = (upcoming || []).filter((b: any) => {
    const ciStr = getDateString(b.checkIn)
    return ciStr <= todayDateStr
  })
  const arrivingLater = (upcoming || []).filter((b: any) => {
    const ciStr = getDateString(b.checkIn)
    return ciStr > todayDateStr
  })

  const departingTodayEarlier = (inhouse || []).filter((b: any) => {
    const coStr = getDateString(b.checkOut)
    return coStr <= todayDateStr
  })
  const stayingOn = (inhouse || []).filter((b: any) => {
    const coStr = getDateString(b.checkOut)
    return coStr > todayDateStr
  })

  // Date filtering helper
  function filterByDate(list: any[], dateField: 'checkOut' | 'checkIn' = 'checkOut') {
    if (datePreset === 'all') return list || []
    return (list || []).filter((b: any) => {
      const dStr = getDateString(b[dateField] || b.checkOut)
      if (!dStr) return false
      if (datePreset === 'today') return dStr === todayDateStr
      if (datePreset === 'yesterday') return dStr === yesterdayDateStr
      if (datePreset === 'thisWeek') return dStr >= startOfWeekStr && dStr <= endOfWeekStr
      if (datePreset === 'thisMonth') return dStr >= startOfMonthStr && dStr <= endOfMonthStr
      if (datePreset === 'custom') {
        if (customFrom && customTo) return dStr >= customFrom && dStr <= customTo
        if (customFrom) return dStr >= customFrom
        if (customTo) return dStr <= customTo
      }
      return true
    })
  }

  const rawCheckedOut = (completed || []).filter((b: any) => b.status === 'CheckedOut')
  const rawNoShow = (completed || []).filter((b: any) => b.status === 'NoShow')
  const rawCancelled = (completed || []).filter((b: any) => b.status === 'Cancelled')

  const filteredCheckedOut = filterByDate(rawCheckedOut, 'checkOut')
  const filteredNoShow = filterByDate(rawNoShow, 'checkOut')
  const filteredCancelled = filterByDate(rawCancelled, 'checkOut')

  // Date-wise Grouping structure
  interface DateGroup {
    dateStr: string
    formattedDate: string
    isToday: boolean
    isYesterday: boolean
    bookings: any[]
    roomCount: number
    roomNights: number
    totalRevenue: number
    collectedAmount: number
  }

  function groupBookingsByDate(list: any[], dateField: 'checkOut' | 'checkIn' = 'checkOut'): DateGroup[] {
    const map = new Map<string, any[]>()
    for (const b of list) {
      const dStr = getDateString(b[dateField] || b.checkOut) || 'unknown'
      if (!map.has(dStr)) {
        map.set(dStr, [])
      }
      map.get(dStr)!.push(b)
    }

    // Sort descending (newest date first)
    const sortedDates = Array.from(map.keys()).sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))

    return sortedDates.map((dateStr) => {
      const items = map.get(dateStr) || []
      const parsed = parseBookingDate(dateStr)
      const isToday = dateStr === todayDateStr
      const isYesterday = dateStr === yesterdayDateStr

      let formattedDate = 'Date not set'
      if (parsed) {
        if (isToday) {
          formattedDate = `Today · ${format(parsed, 'EEE, dd MMM yyyy')}`
        } else if (isYesterday) {
          formattedDate = `Yesterday · ${format(parsed, 'EEE, dd MMM yyyy')}`
        } else {
          formattedDate = format(parsed, 'EEEE, dd MMM yyyy')
        }
      }

      const totalRevenue = items.reduce((s, b) => s + (b.totalAmount || 0), 0)
      const collectedAmount = items.reduce(
        (s, b) =>
          s +
          (b.payments?.reduce(
            (ps: number, p: any) => ps + (p.status !== 'Pending' ? p.amount : 0),
            0
          ) || 0),
        0
      )

      return {
        dateStr,
        formattedDate,
        isToday,
        isYesterday,
        bookings: items,
        roomCount: countRooms(items),
        roomNights: roomNights(items),
        totalRevenue,
        collectedAmount,
      }
    })
  }

  const checkedOutGroups = groupBookingsByDate(filteredCheckedOut, 'checkOut')
  const noShowGroups = groupBookingsByDate(filteredNoShow, 'checkOut')
  const cancelledGroups = groupBookingsByDate(filteredCancelled, 'checkOut')

  function countRooms(list: any[]): number {
    return (list || []).reduce(
      (sum: number, b: any) => sum + (b.bookingRooms?.length || b.numRooms || 1),
      0
    )
  }

  function roomNights(list: any[]) {
    return (list || []).reduce(
      (s: number, b: any) => s + nights(b.checkIn, b.checkOut) * (b.numRooms || 1),
      0
    )
  }

  const isLoading =
    tab === 'Upcoming' ? loadingUpcoming : tab === 'InHouse' ? loadingInhouse : loadingCompleted
  const hasActiveFilters = Boolean(
    search.trim() ||
      categoryFilter !== 'All' ||
      sourceFilter !== 'All' ||
      (tab === 'Completed' && datePreset !== 'all') ||
      (tab === 'Completed' && completedSubFilter !== 'all')
  )

  return (
    <AppShell>
      <div className="bookings-container">
        {/* Page Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Bookings · {currentProperty?.name}</h1>
            <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px' }}>
              {currentProperty?.code} · {currentProperty?.city}
            </div>
          </div>
          <button className="btn btn-red" onClick={() => setShowNewBooking(true)}>
            + New Booking
          </button>
        </div>

        {/* Tabs + Search & Filters Toolbar */}
        <div className="bookings-toolbar" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <div className="tabs">
            {(
              [
                { key: 'Upcoming', label: 'Upcoming', count: countRooms(upcoming) },
                { key: 'InHouse', label: 'In-house', count: countRooms(inhouse) },
                { key: 'Completed', label: 'Completed', count: countRooms(completed) },
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div className="bookings-search-box" style={{ minWidth: '220px' }}>
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
                placeholder="Search name, ID, phone, room"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-3)',
                    cursor: 'pointer',
                  }}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Category Filter */}
            <select
              className="form-control"
              style={{ padding: '6px 10px', fontSize: '12px', width: 'auto', background: 'var(--card)' }}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              {categoryOptions.map((c) => (
                <option key={c} value={c}>
                  {c === 'All' ? 'All Types' : c}
                </option>
              ))}
            </select>

            {/* Source Filter */}
            <select
              className="form-control"
              style={{ padding: '6px 10px', fontSize: '12px', width: 'auto', background: 'var(--card)' }}
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
            >
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s === 'All' ? 'All Sources' : s}
                </option>
              ))}
            </select>

            {/* Reset Filters */}
            {hasActiveFilters && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setSearch('')
                  setCategoryFilter('All')
                  setSourceFilter('All')
                }}
                style={{ fontSize: '11px', padding: '6px 10px' }}
              >
                Reset
              </button>
            )}
          </div>
        </div>

        <div className="bookings-divider" />

        {/* UPCOMING TAB */}
        {tab === 'Upcoming' && (
          <>
            <div className="section-header">
              <div className="section-title">Arriving today ({countRooms(arrivingToday)})</div>
              <div className="section-meta">Booked room nights: {roomNights(arrivingToday)}</div>
            </div>
            {isLoading && !upcoming ? (
              <div className="skeleton" style={{ height: 60, marginBottom: 8 }} />
            ) : arrivingToday.length === 0 ? (
              <div className="empty-state">
                {hasActiveFilters ? 'No arrivals matching current search filter.' : 'No arrivals left for today.'}
              </div>
            ) : (
              arrivingToday.map((b: any) => (
                <BookingCard
                  key={b.id}
                  b={b}
                  currencySymbol={currencySymbol}
                  onSelect={setSelectedBooking}
                  onCheckin={setCheckinBooking}
                  onCheckout={setCheckoutBooking}
                />
              ))
            )}

            <div className="section-header" style={{ marginTop: '24px' }}>
              <div className="section-title">Arriving later ({countRooms(arrivingLater)})</div>
              <div className="section-meta">Booked room nights: {roomNights(arrivingLater)}</div>
            </div>
            {isLoading && !upcoming ? (
              <div className="skeleton" style={{ height: 60, marginBottom: 8 }} />
            ) : arrivingLater.length === 0 ? (
              <div className="empty-state">
                {hasActiveFilters ? 'No upcoming bookings matching filter.' : 'No future bookings scheduled.'}
              </div>
            ) : (
              arrivingLater.map((b: any) => (
                <BookingCard
                  key={b.id}
                  b={b}
                  currencySymbol={currencySymbol}
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
                Departing today or earlier ({countRooms(departingTodayEarlier)})
              </div>
              <div className="section-meta">
                Booked room nights: {roomNights(departingTodayEarlier)}
              </div>
            </div>
            {isLoading && !inhouse ? (
              <div className="skeleton" style={{ height: 60, marginBottom: 8 }} />
            ) : departingTodayEarlier.length === 0 ? (
              <div className="empty-state">
                {hasActiveFilters ? 'No departures matching filter.' : 'No departures due today.'}
              </div>
            ) : (
              departingTodayEarlier.map((b: any) => (
                <BookingCard
                  key={b.id}
                  b={b}
                  currencySymbol={currencySymbol}
                  onSelect={setSelectedBooking}
                  onCheckin={setCheckinBooking}
                  onCheckout={setCheckoutBooking}
                />
              ))
            )}

            <div className="section-header" style={{ marginTop: '24px' }}>
              <div className="section-title">Staying on ({countRooms(stayingOn)})</div>
              <div className="section-meta">Booked room nights: {roomNights(stayingOn)}</div>
            </div>
            {isLoading && !inhouse ? (
              <div className="skeleton" style={{ height: 60, marginBottom: 8 }} />
            ) : stayingOn.length === 0 ? (
              <div className="empty-state">
                {hasActiveFilters ? 'No guests matching filter.' : 'No in-house guests currently staying on.'}
              </div>
            ) : (
              stayingOn.map((b: any) => (
                <BookingCard
                  key={b.id}
                  b={b}
                  currencySymbol={currencySymbol}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Top Toolbar: Date Presets & Sub Filters */}
            <div
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {/* Row 1: Date Range Presets */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: 'var(--text-2)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      marginRight: '2px',
                    }}
                  >
                    <CalendarDays size={14} color="var(--red)" /> Checkout Date:
                  </span>

                  {(
                    [
                      { key: 'all', label: 'All Time' },
                      { key: 'today', label: 'Today' },
                      { key: 'yesterday', label: 'Yesterday' },
                      { key: 'thisWeek', label: 'This Week' },
                      { key: 'thisMonth', label: 'This Month' },
                      { key: 'custom', label: 'Custom Dates' },
                    ] as const
                  ).map((p) => {
                    const isActive = datePreset === p.key
                    return (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => setDatePreset(p.key)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '20px',
                          border: isActive ? '1px solid var(--red)' : '1px solid var(--border)',
                          background: isActive ? 'var(--red)' : 'var(--card-2)',
                          color: isActive ? '#fff' : 'var(--text-2)',
                          fontSize: '12px',
                          fontWeight: isActive ? 700 : 500,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {p.label}
                      </button>
                    )
                  })}
                </div>

                {/* Sub Filter: Status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  {(
                    [
                      { key: 'all', label: 'All', count: filteredCheckedOut.length + filteredNoShow.length + filteredCancelled.length },
                      { key: 'checkedOut', label: 'Checked Out', count: countRooms(filteredCheckedOut) },
                      { key: 'noShow', label: 'No Show', count: countRooms(filteredNoShow) },
                      { key: 'cancelled', label: 'Cancelled', count: countRooms(filteredCancelled) },
                    ] as const
                  ).map((sf) => {
                    const isActive = completedSubFilter === sf.key
                    return (
                      <button
                        key={sf.key}
                        type="button"
                        onClick={() => setCompletedSubFilter(sf.key)}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '6px',
                          border: isActive ? '1px solid var(--red)' : '1px solid var(--border)',
                          background: isActive ? 'var(--red-dim)' : 'transparent',
                          color: isActive ? 'var(--red)' : 'var(--text-2)',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {sf.label} ({sf.count})
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Row 2: Custom Date Inputs (when 'custom' preset is active) */}
              {datePreset === 'custom' && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    paddingTop: '10px',
                    borderTop: '1px solid var(--border)',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-2)' }}>From:</label>
                    <input
                      type="date"
                      className="form-control"
                      style={{ padding: '4px 8px', fontSize: '12px', width: 'auto', background: 'var(--card-2)' }}
                      value={customFrom}
                      onChange={(e) => setCustomFrom(e.target.value)}
                      max={customTo}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-2)' }}>To:</label>
                    <input
                      type="date"
                      className="form-control"
                      style={{ padding: '4px 8px', fontSize: '12px', width: 'auto', background: 'var(--card-2)' }}
                      value={customTo}
                      onChange={(e) => setCustomTo(e.target.value)}
                      min={customFrom}
                    />
                  </div>

                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setCustomFrom(format(subDays(new Date(), 29), 'yyyy-MM-dd'))
                      setCustomTo(todayDateStr)
                    }}
                    style={{ fontSize: '11px', padding: '4px 8px' }}
                  >
                    Reset Range
                  </button>
                </div>
              )}
            </div>

            {/* Quick KPI Strip for Completed / Checked Out */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '10px',
              }}
            >
              <div className="kpi-card" style={{ padding: '12px 14px' }}>
                <div className="kpi-label">Checked Out Stays</div>
                <div className="kpi-value" style={{ fontSize: '20px' }}>
                  {filteredCheckedOut.length}
                </div>
              </div>
              <div className="kpi-card" style={{ padding: '12px 14px' }}>
                <div className="kpi-label">Rooms Checked Out</div>
                <div className="kpi-value" style={{ fontSize: '20px', color: 'var(--blue)' }}>
                  {countRooms(filteredCheckedOut)}
                </div>
              </div>
              <div className="kpi-card" style={{ padding: '12px 14px' }}>
                <div className="kpi-label">Total Room Nights</div>
                <div className="kpi-value" style={{ fontSize: '20px', color: 'var(--text)' }}>
                  {roomNights(filteredCheckedOut)}
                </div>
              </div>
              <div className="kpi-card" style={{ padding: '12px 14px' }}>
                <div className="kpi-label">Total Value Settled</div>
                <div className="kpi-value" style={{ fontSize: '20px', color: 'var(--green)' }}>
                  {currencySymbol}
                  {filteredCheckedOut
                    .reduce((s: number, b: any) => s + (b.totalAmount || 0), 0)
                    .toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* Loading state */}
            {isLoading && !completed ? (
              <div className="skeleton" style={{ height: 120, borderRadius: 'var(--radius)' }} />
            ) : null}

            {/* CHECKED OUT SECTION - Grouped Date-Wise */}
            {(completedSubFilter === 'all' || completedSubFilter === 'checkedOut') && (
              <div>
                <div className="section-header" style={{ marginBottom: '8px' }}>
                  <div className="section-title">
                    Checked out ({countRooms(filteredCheckedOut)} Rooms · {filteredCheckedOut.length} Bookings)
                  </div>
                  <div className="section-meta">
                    {datePreset === 'all'
                      ? 'All historical checkouts'
                      : datePreset === 'today'
                      ? 'Checkouts completed today'
                      : datePreset === 'yesterday'
                      ? 'Checkouts completed yesterday'
                      : datePreset === 'thisWeek'
                      ? 'Checkouts completed this week'
                      : datePreset === 'thisMonth'
                      ? 'Checkouts completed this month'
                      : `Checkouts between ${customFrom} and ${customTo}`}
                  </div>
                </div>

                {filteredCheckedOut.length === 0 ? (
                  <div
                    className="empty-state"
                    style={{
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      padding: '32px 16px',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ color: 'var(--text-2)', marginBottom: '8px', fontSize: '13px' }}>
                      {hasActiveFilters
                        ? 'No check-outs match your selected date or search filter.'
                        : 'No checked out stays recorded for this period.'}
                    </div>
                    {datePreset !== 'all' && (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setDatePreset('all')}
                        style={{ fontSize: '11px', marginTop: '4px' }}
                      >
                        View All Time Check-outs
                      </button>
                    )}
                  </div>
                ) : (
                  /* Render Each Date Group Separately */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {checkedOutGroups.map((group) => (
                      <div key={group.dateStr} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {/* Date Group Header */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '9px 14px',
                            background: group.isToday
                              ? 'linear-gradient(90deg, rgba(34, 197, 94, 0.12) 0%, var(--card) 100%)'
                              : group.isYesterday
                              ? 'linear-gradient(90deg, rgba(245, 158, 11, 0.12) 0%, var(--card) 100%)'
                              : 'var(--card-2)',
                            border: `1px solid ${
                              group.isToday
                                ? 'rgba(34, 197, 94, 0.35)'
                                : group.isYesterday
                                ? 'rgba(245, 158, 11, 0.3)'
                                : 'var(--border)'
                            }`,
                            borderRadius: 'var(--radius-sm)',
                            flexWrap: 'wrap',
                            gap: '8px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div
                              style={{
                                width: '26px',
                                height: '26px',
                                borderRadius: '6px',
                                background: group.isToday
                                  ? 'var(--green-dim)'
                                  : group.isYesterday
                                  ? 'var(--amber-dim)'
                                  : 'var(--card-2)',
                                border: '1px solid var(--border)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: group.isToday ? 'var(--green)' : group.isYesterday ? 'var(--amber)' : 'var(--text-2)',
                              }}
                            >
                              <Calendar size={13} />
                            </div>
                            <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text)' }}>
                              {group.formattedDate}
                            </div>
                            {group.isToday && (
                              <span className="badge badge-green" style={{ fontSize: '10px', padding: '1px 6px' }}>
                                Today
                              </span>
                            )}
                            {group.isYesterday && (
                              <span className="badge badge-amber" style={{ fontSize: '10px', padding: '1px 6px' }}>
                                Yesterday
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', flexWrap: 'wrap' }}>
                            <span style={{ color: 'var(--text-2)', fontWeight: 600 }}>
                              {group.roomCount} Room{group.roomCount !== 1 ? 's' : ''} ({group.roomNights} Night{group.roomNights !== 1 ? 's' : ''})
                            </span>
                            <span
                              style={{
                                background: 'rgba(34, 197, 94, 0.14)',
                                color: '#4ade80',
                                border: '1px solid rgba(34, 197, 94, 0.3)',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontWeight: 700,
                                fontSize: '11.5px',
                              }}
                            >
                              {currencySymbol}{group.totalRevenue.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>

                        {/* List of bookings for this checkout date */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {group.bookings.map((b: any) => (
                            <BookingCard
                              key={b.id}
                              b={b}
                              currencySymbol={currencySymbol}
                              onSelect={setSelectedBooking}
                              onCheckin={setCheckinBooking}
                              onCheckout={setCheckoutBooking}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* NO SHOW SECTION - Grouped Date-Wise */}
            {(completedSubFilter === 'all' || completedSubFilter === 'noShow') && filteredNoShow.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <div className="section-header" style={{ marginBottom: '8px' }}>
                  <div className="section-title">No Show ({countRooms(filteredNoShow)})</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {noShowGroups.map((group) => (
                    <div key={group.dateStr} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 14px',
                          background: 'var(--card-2)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-2)' }}>
                          {group.formattedDate}
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-3)' }}>
                          {group.roomCount} Room{group.roomCount !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {group.bookings.map((b: any) => (
                          <BookingCard
                            key={b.id}
                            b={b}
                            currencySymbol={currencySymbol}
                            onSelect={setSelectedBooking}
                            onCheckin={setCheckinBooking}
                            onCheckout={setCheckoutBooking}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CANCELLED SECTION - Grouped Date-Wise */}
            {(completedSubFilter === 'all' || completedSubFilter === 'cancelled') && filteredCancelled.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <div className="section-header" style={{ marginBottom: '8px' }}>
                  <div className="section-title">Cancelled ({countRooms(filteredCancelled)})</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {cancelledGroups.map((group) => (
                    <div key={group.dateStr} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 14px',
                          background: 'var(--card-2)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-2)' }}>
                          {group.formattedDate}
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-3)' }}>
                          {group.roomCount} Room{group.roomCount !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {group.bookings.map((b: any) => (
                          <BookingCard
                            key={b.id}
                            b={b}
                            currencySymbol={currencySymbol}
                            onSelect={setSelectedBooking}
                            onCheckin={setCheckinBooking}
                            onCheckout={setCheckoutBooking}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
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

export default function BookingsPage() {
  return (
    <Suspense fallback={<div className="skeleton" style={{ height: 200, margin: 20 }} />}>
      <BookingsContent />
    </Suspense>
  )
}
