'use client'

import React, { useState, useMemo } from 'react'
import useSWR from 'swr'
import AppShell from '@/components/layout/AppShell'
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  Calendar,
  TrendingUp,
  DollarSign,
  Layers,
  Percent,
  BedDouble,
  PieChart as PieChartIcon,
  BarChart2,
  Table as TableIcon,
  Sparkles,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import { useProperty } from '@/context/PropertyContext'
import { useRealtimeSync } from '@/lib/realtime-sync'
import RoomCategoryPerformance from '@/components/reports/RoomCategoryPerformance'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function ReportsPage() {
  const { currentProperty } = useProperty()
  const propertyId = currentProperty?.id || ''
  const currencySymbol = currentProperty?.currencySymbol || '₹'

  const formatMoney = (n: number) => `${currencySymbol}${Number(n || 0).toLocaleString('en-IN')}`

  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')
  const yesterdayStr = format(subDays(today, 1), 'yyyy-MM-dd')
  const thirtyAgo = format(subDays(today, 29), 'yyyy-MM-dd')

  const [from, setFrom] = useState(format(startOfMonth(today), 'yyyy-MM-dd'))
  const [to, setTo] = useState(format(endOfMonth(today), 'yyyy-MM-dd'))
  const [activePreset, setActivePreset] = useState<'today' | 'yesterday' | 'week' | 'month' | 'custom'>('month')
  const [activeTab, setActiveTab] = useState<'categories' | 'daily' | 'sources'>('categories')

  // Booking channels sorting state
  const [sourceSortKey, setSourceSortKey] = useState<'name' | 'bookings' | 'revenue' | 'share'>('revenue')
  const [sourceSortOrder, setSourceSortOrder] = useState<'asc' | 'desc'>('desc')

  const toggleSourceSort = (key: 'name' | 'bookings' | 'revenue' | 'share') => {
    if (sourceSortKey === key) {
      setSourceSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))
    } else {
      setSourceSortKey(key)
      setSourceSortOrder(key === 'name' ? 'asc' : 'desc')
    }
  }

  let q = `from=${from}&to=${to}`
  if (propertyId) q += `&propertyId=${propertyId}`

  const { data, isLoading, mutate } = useSWR(`/api/reports?${q}`, fetcher, {
    refreshInterval: 60000,
    revalidateOnFocus: true,
    dedupingInterval: 2000,
  })

  useRealtimeSync(() => {
    mutate()
  })

  const sortedSources = useMemo(() => {
    if (!data?.sources || !Array.isArray(data.sources)) return []
    return [...data.sources].sort((a: any, b: any) => {
      if (sourceSortKey === 'name') {
        const cmp = String(a.name || '').localeCompare(String(b.name || ''))
        return sourceSortOrder === 'asc' ? cmp : -cmp
      }
      if (sourceSortKey === 'share' || sourceSortKey === 'revenue') {
        const aVal = Number(a.revenue || 0)
        const bVal = Number(b.revenue || 0)
        return sourceSortOrder === 'asc' ? aVal - bVal : bVal - aVal
      }
      const aVal = Number(a[sourceSortKey] || 0)
      const bVal = Number(b[sourceSortKey] || 0)
      return sourceSortOrder === 'asc' ? aVal - bVal : bVal - aVal
    })
  }, [data?.sources, sourceSortKey, sourceSortOrder])

  const urnUsed = data?.urnUsed ?? 0
  const srn = data?.srn ?? 0
  const occupancy = data?.occupancy ?? 0
  const roomRevenue = data?.roomRevenue ?? 0
  const arr = data?.arr ?? 0
  const categories = data?.categories ?? []
  const categorySummary = data?.categorySummary ?? {
    highestRevenueCategory: 'N/A',
    highestRevenueAmount: 0,
    highestRevenuePercent: 0,
    totalRoomRevenue: roomRevenue,
    totalRoomNights: urnUsed,
    overallArr: arr,
    totalBookings: 0,
  }

  // Date range presets required: Today, Yesterday, This Week, This Month, Custom
  const setPreset = (type: 'today' | 'yesterday' | 'week' | 'month') => {
    setActivePreset(type)
    if (type === 'today') {
      setFrom(todayStr)
      setTo(todayStr)
    } else if (type === 'yesterday') {
      setFrom(yesterdayStr)
      setTo(yesterdayStr)
    } else if (type === 'week') {
      setFrom(format(subDays(today, 6), 'yyyy-MM-dd'))
      setTo(todayStr)
    } else if (type === 'month') {
      setFrom(format(startOfMonth(today), 'yyyy-MM-dd'))
      setTo(format(endOfMonth(today), 'yyyy-MM-dd'))
    }
  }

  const handleCustomDateChange = (newFrom: string, newTo: string) => {
    setActivePreset('custom')
    setFrom(newFrom)
    setTo(newTo)
  }

  const getDateRangeLabel = () => {
    if (from === to) {
      if (from === todayStr) return 'Today'
      if (from === yesterdayStr) return 'Yesterday'
      return format(new Date(from), 'dd MMM yyyy')
    }
    return `${format(new Date(from), 'dd MMM')} – ${format(new Date(to), 'dd MMM yyyy')}`
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            background: 'var(--card-2)',
            border: '1px solid var(--border-2)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 14px',
            fontSize: '13px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{ color: 'var(--text-2)', marginBottom: '4px', fontWeight: 600 }}>{label}</div>
          {payload.map((p: any) => (
            <div key={p.name} style={{ color: p.color || 'var(--text)', fontWeight: 600, marginTop: '2px' }}>
              {p.name === 'revenue'
                ? `Revenue: ${formatMoney(p.value)}`
                : p.name === 'urn'
                ? `URN: ${p.value} nights`
                : `${p.name}: ${p.value}`}
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <AppShell>
      <div className="reports-container">
        {/* Page Header */}
        <div className="page-header" style={{ marginBottom: '16px' }}>
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Business Analytics · {currentProperty?.name}</span>
            </h1>
            <div style={{ fontSize: '12.5px', color: 'var(--text-2)', marginTop: '2px' }}>
              {currentProperty?.code} · {currentProperty?.city} · Real-time room category performance, revenue, URN, ARR, and occupancy
            </div>
          </div>
        </div>

        {/* Date Filter Toolbar with Today, Yesterday, This Week, This Month, Custom Filters */}
        <div
          className="card"
          style={{
            padding: '14px 18px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          {/* Preset Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', marginRight: '4px' }}>
              Period:
            </span>
            <button
              className={`preset-btn ${activePreset === 'today' ? 'active' : ''}`}
              onClick={() => setPreset('today')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                background: activePreset === 'today' ? 'var(--red)' : 'var(--card-2)',
                color: activePreset === 'today' ? '#17120a' : 'var(--text)',
                border: '1px solid var(--border)',
                transition: 'all 0.15s ease',
              }}
            >
              Today
            </button>
            <button
              className={`preset-btn ${activePreset === 'yesterday' ? 'active' : ''}`}
              onClick={() => setPreset('yesterday')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                background: activePreset === 'yesterday' ? 'var(--red)' : 'var(--card-2)',
                color: activePreset === 'yesterday' ? '#17120a' : 'var(--text)',
                border: '1px solid var(--border)',
                transition: 'all 0.15s ease',
              }}
            >
              Yesterday
            </button>
            <button
              className={`preset-btn ${activePreset === 'week' ? 'active' : ''}`}
              onClick={() => setPreset('week')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                background: activePreset === 'week' ? 'var(--red)' : 'var(--card-2)',
                color: activePreset === 'week' ? '#17120a' : 'var(--text)',
                border: '1px solid var(--border)',
                transition: 'all 0.15s ease',
              }}
            >
              This Week (7D)
            </button>
            <button
              className={`preset-btn ${activePreset === 'month' ? 'active' : ''}`}
              onClick={() => setPreset('month')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                background: activePreset === 'month' ? 'var(--red)' : 'var(--card-2)',
                color: activePreset === 'month' ? '#17120a' : 'var(--text)',
                border: '1px solid var(--border)',
                transition: 'all 0.15s ease',
              }}
            >
              This Month
            </button>
          </div>

          {/* Custom Date Range Picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="date-input-group" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-3)' }}>From</label>
              <input
                type="date"
                value={from}
                onChange={(e) => handleCustomDateChange(e.target.value, to)}
                max={to}
                className="form-control"
                style={{ height: '34px', fontSize: '12.5px', padding: '4px 8px', width: '135px' }}
              />
            </div>
            <div className="date-input-group" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-3)' }}>To</label>
              <input
                type="date"
                value={to}
                onChange={(e) => handleCustomDateChange(from, e.target.value)}
                min={from}
                className="form-control"
                style={{ height: '34px', fontSize: '12.5px', padding: '4px 8px', width: '135px' }}
              />
            </div>
          </div>
        </div>

        {/* Analytics Section Switcher Tabs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '20px',
            borderBottom: '1px solid var(--border)',
            paddingBottom: '12px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'categories' ? 'var(--card)' : 'transparent',
              color: activeTab === 'categories' ? 'var(--red)' : 'var(--text-2)',
              fontWeight: 700,
              fontSize: '13.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              borderBottom: activeTab === 'categories' ? '2px solid var(--red)' : '2px solid transparent',
              boxShadow: activeTab === 'categories' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <BedDouble size={16} />
            <span>Room Category Business</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('daily')}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'daily' ? 'var(--card)' : 'transparent',
              color: activeTab === 'daily' ? 'var(--red)' : 'var(--text-2)',
              fontWeight: 700,
              fontSize: '13.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              borderBottom: activeTab === 'daily' ? '2px solid var(--red)' : '2px solid transparent',
              boxShadow: activeTab === 'daily' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <BarChart2 size={16} />
            <span>Daily Revenue &amp; Occupancy Trend</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sources')}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'sources' ? 'var(--card)' : 'transparent',
              color: activeTab === 'sources' ? 'var(--red)' : 'var(--text-2)',
              fontWeight: 700,
              fontSize: '13.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              borderBottom: activeTab === 'sources' ? '2px solid var(--red)' : '2px solid transparent',
              boxShadow: activeTab === 'sources' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <PieChartIcon size={16} />
            <span>Booking Channels</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: ROOM CATEGORY BUSINESS ANALYTICS */}
        {/* ========================================================================= */}
        {activeTab === 'categories' && (
          <RoomCategoryPerformance
            categories={categories}
            summary={categorySummary}
            currencySymbol={currencySymbol}
            isLoading={isLoading}
            dateRangeLabel={getDateRangeLabel()}
          />
        )}

        {/* ========================================================================= */}
        {/* TAB 2: DAILY REVENUE & OCCUPANCY TREND */}
        {/* ========================================================================= */}
        {activeTab === 'daily' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Top Metrics Row */}
            <div className="reports-metrics">
              <div className="metric-card">
                <div className="metric-label">
                  <DollarSign size={13} color="var(--text-2)" /> Room Revenue
                </div>
                <div className="metric-value">{isLoading ? '—' : formatMoney(roomRevenue)}</div>
                <div className="metric-sub">Total room booking charges</div>
              </div>

              <div className="metric-card">
                <div className="metric-label">
                  <Layers size={13} color="var(--text-2)" /> URN Used
                </div>
                <div className="metric-value">{isLoading ? '—' : urnUsed}</div>
                <div className="metric-sub">Used Room Nights</div>
              </div>

              <div className="metric-card">
                <div className="metric-label">
                  <Calendar size={13} color="var(--text-2)" /> SRN
                </div>
                <div className="metric-value">{isLoading ? '—' : srn}</div>
                <div className="metric-sub">Sellable Room Nights ({data?.totalRooms || 0} Rooms)</div>
              </div>

              <div className="metric-card">
                <div className="metric-label">
                  <Percent size={13} color="var(--text-2)" /> Occupancy
                </div>
                <div
                  className="metric-value"
                  style={{
                    color: occupancy > 100 ? 'var(--red)' : occupancy > 0 ? 'var(--green)' : 'var(--text)',
                  }}
                >
                  {isLoading ? '—' : `${occupancy}%`}
                </div>
                <div className="metric-sub">
                  {data?.overbookedRoomNights > 0 ? (
                    <span style={{ color: 'var(--red)', fontWeight: 600 }}>
                      Overbooked: +{data.overbookedRoomNights} RN
                    </span>
                  ) : (
                    'URN ÷ SRN × 100'
                  )}
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-label">
                  <TrendingUp size={13} color="var(--text-2)" /> ARR
                </div>
                <div className="metric-value" style={{ color: 'var(--green)' }}>
                  {isLoading ? '—' : formatMoney(arr)}
                </div>
                <div className="metric-sub">Average Room Rate</div>
              </div>
            </div>

            {/* Daily Revenue Bar Chart */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
                    Daily Revenue Realization ({currencySymbol})
                  </h3>
                  <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>
                    Revenue distributed across each night of guest stays
                  </div>
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)' }}>
                  {getDateRangeLabel()}
                </div>
              </div>

              <div style={{ width: '100%', height: 280 }}>
                {isLoading ? (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>
                    Loading chart data...
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data?.dailyBreakdown ?? []} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="displayDate" stroke="var(--text-3)" fontSize={11} tickLine={false} />
                      <YAxis stroke="var(--text-3)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="revenue" fill="var(--red)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Daily Occupancy Trend Chart */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
                    Daily Occupied Rooms (URN)
                  </h3>
                  <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>
                    Rooms occupied per day vs Total Capacity ({data?.totalRooms ?? 0} Rooms)
                  </div>
                </div>
              </div>

              <div style={{ width: '100%', height: 260 }}>
                {isLoading ? (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>
                    Loading chart data...
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data?.dailyBreakdown ?? []} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="displayDate" stroke="var(--text-3)" fontSize={11} tickLine={false} />
                      <YAxis stroke="var(--text-3)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="occupiedRooms" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: BOOKING CHANNELS / SOURCES */}
        {/* ========================================================================= */}
        {activeTab === 'sources' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--card-2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
                  Booking Channel Breakdown
                </h3>
                <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>
                  Revenue contribution by OTA platforms and direct reservations
                </div>
              </div>

              {/* Order by High to Low / Low to High Quick Action Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-3)', marginRight: '4px', fontWeight: 600 }}>
                  Order:
                </span>
                <button
                  type="button"
                  onClick={() => setSourceSortOrder('desc')}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    borderRadius: '6px',
                    border: `1px solid ${sourceSortOrder === 'desc' ? 'var(--red)' : 'var(--border)'}`,
                    background: sourceSortOrder === 'desc' ? 'var(--red)' : 'var(--card)',
                    color: sourceSortOrder === 'desc' ? '#ffffff' : 'var(--text-2)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.15s ease',
                  }}
                  title="Sort High to Low (Descending)"
                >
                  <ArrowDown size={13} />
                  <span>High to Low</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSourceSortOrder('asc')}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    borderRadius: '6px',
                    border: `1px solid ${sourceSortOrder === 'asc' ? 'var(--red)' : 'var(--border)'}`,
                    background: sourceSortOrder === 'asc' ? 'var(--red)' : 'var(--card)',
                    color: sourceSortOrder === 'asc' ? '#ffffff' : 'var(--text-2)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.15s ease',
                  }}
                  title="Sort Low to High (Ascending)"
                >
                  <ArrowUp size={13} />
                  <span>Low to High</span>
                </button>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'var(--card-2)', color: 'var(--text-3)', fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    {/* Source Channel Column */}
                    <th
                      onClick={() => toggleSourceSort('name')}
                      style={{
                        padding: '12px 18px',
                        cursor: 'pointer',
                        userSelect: 'none',
                        color: sourceSortKey === 'name' ? 'var(--text)' : 'var(--text-3)',
                        transition: 'color 0.15s ease',
                      }}
                      title="Sort by Source Channel Name"
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span>Source Channel</span>
                        {sourceSortKey === 'name' ? (
                          sourceSortOrder === 'asc' ? (
                            <ArrowUp size={13} color="var(--red)" />
                          ) : (
                            <ArrowDown size={13} color="var(--red)" />
                          )
                        ) : (
                          <ArrowUpDown size={12} style={{ opacity: 0.35 }} />
                        )}
                      </div>
                    </th>

                    {/* Total Bookings Column */}
                    <th
                      onClick={() => toggleSourceSort('bookings')}
                      style={{
                        padding: '12px 16px',
                        textAlign: 'right',
                        cursor: 'pointer',
                        userSelect: 'none',
                        color: sourceSortKey === 'bookings' ? 'var(--text)' : 'var(--text-3)',
                        transition: 'color 0.15s ease',
                      }}
                      title="Sort by Total Bookings (High to Low / Low to High)"
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        <span>Total Bookings</span>
                        {sourceSortKey === 'bookings' ? (
                          sourceSortOrder === 'asc' ? (
                            <ArrowUp size={13} color="var(--red)" />
                          ) : (
                            <ArrowDown size={13} color="var(--red)" />
                          )
                        ) : (
                          <ArrowUpDown size={12} style={{ opacity: 0.35 }} />
                        )}
                      </div>
                    </th>

                    {/* Revenue Generated Column */}
                    <th
                      onClick={() => toggleSourceSort('revenue')}
                      style={{
                        padding: '12px 16px',
                        textAlign: 'right',
                        cursor: 'pointer',
                        userSelect: 'none',
                        color: sourceSortKey === 'revenue' ? 'var(--text)' : 'var(--text-3)',
                        transition: 'color 0.15s ease',
                      }}
                      title="Sort by Revenue Generated (High to Low / Low to High)"
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        <span>Revenue Generated</span>
                        {sourceSortKey === 'revenue' ? (
                          sourceSortOrder === 'asc' ? (
                            <ArrowUp size={13} color="var(--red)" />
                          ) : (
                            <ArrowDown size={13} color="var(--red)" />
                          )
                        ) : (
                          <ArrowUpDown size={12} style={{ opacity: 0.35 }} />
                        )}
                      </div>
                    </th>

                    {/* Share % Column */}
                    <th
                      onClick={() => toggleSourceSort('share')}
                      style={{
                        padding: '12px 18px',
                        textAlign: 'right',
                        cursor: 'pointer',
                        userSelect: 'none',
                        color: sourceSortKey === 'share' ? 'var(--text)' : 'var(--text-3)',
                        transition: 'color 0.15s ease',
                      }}
                      title="Sort by Share % (High to Low / Low to High)"
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        <span>Share %</span>
                        {sourceSortKey === 'share' ? (
                          sourceSortOrder === 'asc' ? (
                            <ArrowUp size={13} color="var(--red)" />
                          ) : (
                            <ArrowDown size={13} color="var(--red)" />
                          )
                        ) : (
                          <ArrowUpDown size={12} style={{ opacity: 0.35 }} />
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {!sortedSources || sortedSources.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-3)' }}>
                        No booking channel data in this date range
                      </td>
                    </tr>
                  ) : (
                    sortedSources.map((s: any) => {
                      const share = roomRevenue > 0 ? ((s.revenue / roomRevenue) * 100).toFixed(1) : '0'
                      return (
                        <tr
                          key={s.name}
                          style={{
                            borderBottom: '1px solid var(--border)',
                            transition: 'background 0.15s ease',
                          }}
                          className="hover:bg-[var(--card-hover)]"
                        >
                          <td style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text)' }}>{s.name}</td>
                          <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--text)' }}>
                            {s.bookings}
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 800, color: 'var(--text)' }}>
                            {formatMoney(s.revenue)}
                          </td>
                          <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: 700, color: 'var(--red)' }}>
                            {share}%
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
