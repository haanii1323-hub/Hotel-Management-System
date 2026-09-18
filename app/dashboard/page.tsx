'use client'

import { useState } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import {
  CalendarDays,
  Hotel,
  Percent,
  ArrowRight,
  CheckCircle2,
  BedDouble,
  Plus,
  Building2,
  Sparkles,
  Layers,
  DollarSign,
  AlertTriangle,
  Users,
  TrendingUp,
  LogIn,
  LogOut,
  CreditCard,
  Clock,
  Phone,
  BarChart3,
  CalendarCheck,
  ShieldAlert,
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
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
  const [operationalTab, setOperationalTab] = useState<'arrivals' | 'departures' | 'recent'>('arrivals')

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
    pendingPayments: 0,
  }

  const arrivingToday = data?.arrivingToday || []
  const departingToday = data?.departingToday || []
  const recentBookings = data?.recentBookings || []
  const categoryPerformance = data?.categoryPerformance || []
  const trends = data?.trends || []

  // Custom Chart Tooltips
  const RevenueTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            background: 'var(--card-2)',
            border: '1px solid var(--border-2)',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '12px',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div style={{ color: 'var(--text-3)', fontWeight: 600, marginBottom: '2px' }}>{label}</div>
          <div style={{ color: 'var(--green)', fontWeight: 700 }}>
            Revenue: {formatMoney(payload[0].value)}
          </div>
        </div>
      )
    }
    return null
  }

  const OccupancyTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            background: 'var(--card-2)',
            border: '1px solid var(--border-2)',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '12px',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div style={{ color: 'var(--text-3)', fontWeight: 600, marginBottom: '2px' }}>{label}</div>
          <div style={{ color: 'var(--blue)', fontWeight: 700 }}>
            Occupancy: {payload[0].value}%
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <AppShell>
      {!hasProperties && !isLoading ? (
        /* Empty State for Newly Registered Organizations */
        <div style={{ maxWidth: '780px', margin: '40px auto', padding: '0 16px' }}>
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '48px 36px',
              textAlign: 'center',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                background: 'rgba(201, 156, 66, 0.12)',
                border: '1px solid rgba(201, 156, 66, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                color: 'var(--red)',
              }}
            >
              <Building2 size={32} />
            </div>

            <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text)', marginBottom: '8px' }}>
              Welcome to Your Hotel PMS
            </h1>
            <p style={{ color: 'var(--text-2)', fontSize: '14px', maxWidth: '520px', margin: '0 auto 24px', lineHeight: '1.6' }}>
              Your hotel organization workspace is initialized. Set up your property profile, room inventory, and pricing matrix to start managing front desk operations.
            </p>

            <button
              className="btn btn-red"
              onClick={() => setShowAddProperty(true)}
              style={{ padding: '12px 24px', fontSize: '14px', margin: '0 auto' }}
            >
              <Plus size={16} /> Add First Property
            </button>
          </div>
        </div>
      ) : (
        <div className="dashboard-page" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header & Quick Action Bar */}
          <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h1 className="page-title">{currentProperty?.name || 'Hotel Front Desk'}</h1>
                {kpis.isOverbooked ? (
                  <span className="badge badge-red" style={{ fontWeight: 800 }}>
                    OVERBOOKED (+{kpis.overbookedRooms})
                  </span>
                ) : (
                  <span
                    className={`badge ${
                      kpis.occupancy >= 90
                        ? 'badge-amber'
                        : kpis.occupancy >= 50
                        ? 'badge-green'
                        : 'badge-blue'
                    }`}
                  >
                    {kpis.occupancy}% Occupancy · {kpis.overbookingStatus}
                  </span>
                )}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px' }}>
                {currentProperty?.code} · {currentProperty?.city}, {currentProperty?.country} · Front Desk Operational Console
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                className="btn btn-ghost"
                onClick={() => router.push('/pricing')}
                style={{ fontSize: '13px' }}
              >
                <BedDouble size={15} /> Room Rack
              </button>
              <button
                className="btn btn-red"
                onClick={() => setShowNewBooking(true)}
                style={{ fontSize: '13px' }}
              >
                <Plus size={15} /> New Reservation
              </button>
            </div>
          </div>

          {/* Overbooking Alert Banner if inventory exceeded */}
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
                color: 'var(--text)',
                fontSize: '13px',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldAlert size={20} color="#ef4444" style={{ flexShrink: 0 }} />
                <span>
                  <strong>Overbooking Notice:</strong> {kpis.bookedRoomsToday} rooms booked against {kpis.sellableRooms || kpis.totalRooms} physical inventory. Exceeded by <strong style={{ color: '#ef4444' }}>{kpis.overbookedRooms} room{kpis.overbookedRooms > 1 ? 's' : ''}</strong>.
                </span>
              </div>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => router.push('/bookings')}
                style={{ fontSize: '11px', borderColor: 'rgba(239, 68, 68, 0.4)' }}
              >
                Resolve Bookings <ArrowRight size={12} />
              </button>
            </div>
          )}

          {/* ================================================================= */}
          {/* 1. TOP 8 PMS OPERATIONAL METRICS */}
          {/* ================================================================= */}
          <div className="kpi-grid">
            {/* Occupancy % */}
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">Occupancy Rate</span>
                <div className="kpi-icon-wrap" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                  <Percent size={16} />
                </div>
              </div>
              <div
                className="kpi-main-val"
                style={{ color: kpis.occupancy > 100 ? 'var(--red-semantic)' : kpis.occupancy >= 80 ? 'var(--green)' : 'var(--text)' }}
              >
                {kpis.occupancy}%
              </div>
              <div className="kpi-sub">
                <span>{kpis.bookedRoomsToday ?? kpis.occupiedRooms} / {kpis.sellableRooms || kpis.totalRooms} rooms booked</span>
              </div>
              {/* Visual mini-bar */}
              <div style={{ width: '100%', height: '4px', background: 'var(--border)', borderRadius: '2px', marginTop: '8px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${Math.min(100, Math.max(0, kpis.occupancy))}%`,
                    height: '100%',
                    background: kpis.occupancy > 100 ? '#C85C5C' : '#355C4A',
                    borderRadius: '2px',
                  }}
                />
              </div>
            </div>

            {/* Available Rooms */}
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">Available Rooms</span>
                <div className="kpi-icon-wrap" style={{ background: 'rgba(63, 143, 104, 0.12)', color: '#3F8F68' }}>
                  <BedDouble size={16} />
                </div>
              </div>
              <div
                className="kpi-main-val"
                style={{ color: kpis.availableRooms < 0 ? '#C85C5C' : 'var(--text)' }}
              >
                {kpis.availableRooms}
              </div>
              <div className="kpi-sub">
                <span>Sellable tonight for walk-in</span>
              </div>
            </div>

            {/* Occupied Rooms */}
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">Occupied Tonight</span>
                <div className="kpi-icon-wrap" style={{ background: 'rgba(91, 130, 166, 0.12)', color: '#5B82A6' }}>
                  <Users size={16} />
                </div>
              </div>
              <div className="kpi-main-val">
                {kpis.bookedRoomsToday ?? kpis.occupiedRooms}
              </div>
              <div className="kpi-sub">
                <span>{kpis.inHouseCount} guests in-house</span>
              </div>
            </div>

            {/* Check-ins Today */}
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">Check-ins Today</span>
                <div className="kpi-icon-wrap" style={{ background: 'rgba(212, 154, 58, 0.12)', color: '#D49A3A' }}>
                  <LogIn size={16} />
                </div>
              </div>
              <div className="kpi-main-val" style={{ color: 'var(--amber)' }}>
                {kpis.arrivingTodayCount}
              </div>
              <div className="kpi-sub">
                <span>{arrivingToday.length} pending arrival</span>
              </div>
            </div>

            {/* Check-outs Today */}
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">Check-outs Today</span>
                <div className="kpi-icon-wrap" style={{ background: 'rgba(124, 110, 166, 0.12)', color: '#7C6EA6' }}>
                  <LogOut size={16} />
                </div>
              </div>
              <div className="kpi-main-val">
                {kpis.departingTodayCount}
              </div>
              <div className="kpi-sub">
                <span>{departingToday.length} due today</span>
              </div>
            </div>

            {/* Today's Revenue */}
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">Today&apos;s Revenue</span>
                <div className="kpi-icon-wrap" style={{ background: 'rgba(63, 143, 104, 0.12)', color: '#3F8F68' }}>
                  <DollarSign size={16} />
                </div>
              </div>
              <div className="kpi-main-val" style={{ color: '#3F8F68' }}>
                {formatMoney(kpis.collectedToday)}
              </div>
              <div className="kpi-sub">
                <span>Collected in last 24h</span>
              </div>
            </div>

            {/* Total Revenue */}
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">Total Revenue</span>
                <div className="kpi-icon-wrap" style={{ background: 'rgba(211, 155, 98, 0.14)', color: '#D39B62' }}>
                  <TrendingUp size={16} />
                </div>
              </div>
              <div className="kpi-main-val" style={{ color: '#D39B62' }}>
                {formatMoney(kpis.totalRevenue)}
              </div>
              <div className="kpi-sub">
                <span>Across {kpis.totalBookings} reservations</span>
              </div>
            </div>

            {/* Pending Payments */}
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">Pending Balance</span>
                <div className="kpi-icon-wrap" style={{ background: 'rgba(200, 92, 92, 0.12)', color: '#C85C5C' }}>
                  <CreditCard size={16} />
                </div>
              </div>
              <div
                className="kpi-main-val"
                style={{ color: kpis.pendingPayments > 0 ? 'var(--amber)' : 'var(--green)' }}
              >
                {formatMoney(kpis.pendingPayments)}
              </div>
              <div className="kpi-sub">
                <span>Uncollected guest balances</span>
              </div>
            </div>
          </div>

          {/* ================================================================= */}
          {/* 2. ROOM CATEGORY PERFORMANCE SECTION (Standard, Deluxe, Suite, Luxury) */}
          {/* ================================================================= */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={17} color="var(--red)" />
                  <span>Room Category Performance &amp; Revenue Contribution</span>
                </h2>
                <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>
                  Revenue, bookings count, room nights sold, occupancy share, and average room rate (ARR) by category
                </div>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => router.push('/reports')}
                style={{ fontSize: '12px', gap: '6px' }}
              >
                Detailed Analytics <ArrowRight size={13} />
              </button>
            </div>

            {categoryPerformance.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>
                No category data available for this property.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                {categoryPerformance.map((cat: any) => (
                  <div
                    key={cat.name}
                    style={{
                      background: 'var(--card-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '14px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: cat.color,
                          }}
                        />
                        <span style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text)' }}>
                          {cat.name}
                        </span>
                      </div>
                      <span className="badge" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-2)', fontSize: '11px' }}>
                        {cat.availableRooms} Rooms
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: '2px' }}>
                      <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)' }}>
                        {formatMoney(cat.revenue)}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--red)' }}>
                        {cat.revenuePercent}% share
                      </span>
                    </div>

                    {/* Progress Bar for Share */}
                    <div style={{ width: '100%', height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${Math.min(100, Math.max(0, cat.revenuePercent))}%`,
                          height: '100%',
                          backgroundColor: cat.color,
                          borderRadius: '2px',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-3)', marginTop: '2px' }}>
                      <span>{cat.bookingsCount} Bookings · {cat.roomNights} Nights</span>
                      <span>ARR: <strong style={{ color: 'var(--text-2)' }}>{formatMoney(cat.arr)}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ================================================================= */}
          {/* 3. TRENDS CHARTS (Revenue & Occupancy last 7 days) */}
          {/* ================================================================= */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
            {/* Revenue Trend Chart */}
            <div className="card" style={{ padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>
                    Revenue Trend (Last 7 Days)
                  </h3>
                  <p style={{ fontSize: '11.5px', color: 'var(--text-3)', marginTop: '2px' }}>
                    Daily collected revenue trajectory
                  </p>
                </div>
                <div className="kpi-icon-wrap" style={{ width: '28px', height: '28px', background: 'rgba(63, 143, 104, 0.1)', color: '#3F8F68' }}>
                  <TrendingUp size={14} />
                </div>
              </div>

              <div style={{ width: '100%', height: '180px' }}>
                {trends.length === 0 ? (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: '12px' }}>
                    No revenue history in last 7 days
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3F8F68" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#3F8F68" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="label" stroke="var(--text-3)" fontSize={11} tickLine={false} />
                      <YAxis
                        stroke="var(--text-3)"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => (v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`)}
                      />
                      <Tooltip content={<RevenueTooltip />} />
                      <Area type="monotone" dataKey="revenue" stroke="#3F8F68" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Occupancy Trend Chart */}
            <div className="card" style={{ padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>
                    Occupancy Rate Trend (Last 7 Days)
                  </h3>
                  <p style={{ fontSize: '11.5px', color: 'var(--text-3)', marginTop: '2px' }}>
                    Daily occupancy demand %
                  </p>
                </div>
                <div className="kpi-icon-wrap" style={{ width: '28px', height: '28px', background: 'rgba(91, 130, 166, 0.1)', color: '#5B82A6' }}>
                  <BarChart3 size={14} />
                </div>
              </div>

              <div style={{ width: '100%', height: '180px' }}>
                {trends.length === 0 ? (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: '12px' }}>
                    No occupancy history in last 7 days
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="label" stroke="var(--text-3)" fontSize={11} tickLine={false} />
                      <YAxis
                        stroke="var(--text-3)"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `${v}%`}
                        domain={[0, 100]}
                      />
                      <Tooltip content={<OccupancyTooltip />} />
                      <Bar dataKey="occupancy" fill="#5B82A6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* ================================================================= */}
          {/* 4. FRONT DESK OPERATIONAL BOARD (Arrivals, Departures, Recent Feed) */}
          {/* ================================================================= */}
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 20px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--card-2)',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              {/* Tab Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setOperationalTab('arrivals')}
                  className={`tab ${operationalTab === 'arrivals' ? 'active' : ''}`}
                  style={{ fontSize: '13px', padding: '6px 12px' }}
                >
                  <LogIn size={14} /> Expected Arrivals ({arrivingToday.length})
                </button>
                <button
                  type="button"
                  onClick={() => setOperationalTab('departures')}
                  className={`tab ${operationalTab === 'departures' ? 'active' : ''}`}
                  style={{ fontSize: '13px', padding: '6px 12px' }}
                >
                  <LogOut size={14} /> Due Departures ({departingToday.length})
                </button>
                <button
                  type="button"
                  onClick={() => setOperationalTab('recent')}
                  className={`tab ${operationalTab === 'recent' ? 'active' : ''}`}
                  style={{ fontSize: '13px', padding: '6px 12px' }}
                >
                  <Clock size={14} /> Recent Activity ({recentBookings.length})
                </button>
              </div>

              <button
                className="btn btn-ghost btn-sm"
                onClick={() => router.push('/bookings')}
                style={{ fontSize: '12px' }}
              >
                All Bookings <ArrowRight size={12} />
              </button>
            </div>

            {/* Tab Contents */}
            <div style={{ padding: '16px 20px' }}>
              {operationalTab === 'arrivals' && (
                arrivingToday.length === 0 ? (
                  <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>
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
                          padding: '12px 14px',
                          background: 'var(--card-2)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border)',
                          flexWrap: 'wrap',
                          gap: '10px',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text)' }}>
                            {b.guest?.name || 'Guest'}
                          </div>
                          <div style={{ fontSize: '11.5px', color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{b.bookingRef}</span>
                            <span>·</span>
                            <SourceBadge source={b.source} size="xs" />
                            <span>·</span>
                            <span>{b.roomCategory}</span>
                            <span>·</span>
                            <span>{b.numRooms} Room{b.numRooms > 1 ? 's' : ''}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 700, fontSize: '13px' }}>{formatMoney(b.totalAmount)}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{fmtDate(b.checkIn)} – {fmtDate(b.checkOut)}</div>
                          </div>
                          {b.guest?.phone && (
                            <a
                              href={`tel:${b.guest.phone}`}
                              className="btn-icon"
                              title={`Call ${b.guest.name}`}
                              style={{ width: '32px', height: '32px' }}
                            >
                              <Phone size={13} />
                            </a>
                          )}
                          <button
                            className="btn btn-sm btn-green"
                            onClick={() => setCheckinBooking(b)}
                            style={{ fontSize: '12px', padding: '6px 14px' }}
                          >
                            Check-in
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {operationalTab === 'departures' && (
                departingToday.length === 0 ? (
                  <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>
                    No departures due for today.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {departingToday.map((b: any) => {
                      const collected = b.payments?.reduce((s: number, p: any) => s + (p.status !== 'Pending' ? p.amount : 0), 0) || 0
                      const balance = Math.max(0, b.totalAmount - collected)
                      return (
                        <div
                          key={b.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 14px',
                            background: 'var(--card-2)',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border)',
                            flexWrap: 'wrap',
                            gap: '10px',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text)' }}>
                              {b.guest?.name || 'Guest'}
                            </div>
                            <div style={{ fontSize: '11.5px', color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
                              <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{b.bookingRef}</span>
                              <span>·</span>
                              <SourceBadge source={b.source} size="xs" />
                              <span>·</span>
                              <span>
                                {b.bookingRooms && b.bookingRooms.length > 0
                                  ? `Room ${b.bookingRooms.map((br: any) => br.room?.number).filter(Boolean).join(', ')}`
                                  : b.roomCategory}
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: 700, fontSize: '13px' }}>{formatMoney(b.totalAmount)}</div>
                              {balance > 0 ? (
                                <div style={{ fontSize: '11px', color: 'var(--amber)', fontWeight: 600 }}>
                                  Due: {formatMoney(balance)}
                                </div>
                              ) : (
                                <div style={{ fontSize: '11px', color: 'var(--green)', fontWeight: 600 }}>
                                  Settled
                                </div>
                              )}
                            </div>
                            {b.guest?.phone && (
                              <a
                                href={`tel:${b.guest.phone}`}
                                className="btn-icon"
                                title={`Call ${b.guest.name}`}
                                style={{ width: '32px', height: '32px' }}
                              >
                                <Phone size={13} />
                              </a>
                            )}
                            <button
                              className="btn btn-sm btn-ghost"
                              onClick={() => setCheckoutBooking(b)}
                              style={{ fontSize: '12px', padding: '6px 14px' }}
                            >
                              Check-out
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              )}

              {operationalTab === 'recent' && (
                recentBookings.length === 0 ? (
                  <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>
                    No bookings on record.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {recentBookings.map((b: any) => (
                      <div
                        key={b.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 14px',
                          background: 'var(--card-2)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border)',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease',
                        }}
                        onClick={() => router.push(`/bookings?selected=${b.id}`)}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text)' }}>
                            {b.guest?.name || 'Guest'}
                          </div>
                          <div style={{ fontSize: '11.5px', color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                            <span style={{ fontFamily: 'monospace' }}>{b.bookingRef}</span>
                            <span>·</span>
                            <SourceBadge source={b.source} size="xs" />
                            <span>·</span>
                            <span>{b.roomCategory}</span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, fontSize: '13px' }}>{formatMoney(b.totalAmount)}</div>
                          <span
                            className={`badge ${
                              b.status === 'CheckedIn'
                                ? 'badge-green'
                                : b.status === 'Upcoming'
                                ? 'badge-amber'
                                : b.status === 'CheckedOut'
                                ? 'badge-gray'
                                : 'badge-red'
                            }`}
                            style={{ fontSize: '10.5px' }}
                          >
                            {b.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
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
