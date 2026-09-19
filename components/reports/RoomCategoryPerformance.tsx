'use client'

import React, { useState, useMemo } from 'react'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import {
  TrendingUp,
  DollarSign,
  BedDouble,
  Award,
  Calendar,
  Layers,
  Percent,
  Sparkles,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'

export interface CategoryData {
  name: string
  bookings: number
  roomNights: number
  availableRooms: number
  srn: number
  occupancy: number
  revenue: number
  arr: number
  revenuePercent: number
  color: string
}

export interface CategorySummary {
  highestRevenueCategory: string
  highestRevenueAmount: number
  highestRevenuePercent: number
  totalRoomRevenue: number
  totalRoomNights: number
  overallArr: number
  totalBookings: number
}

interface RoomCategoryPerformanceProps {
  categories: CategoryData[]
  summary: CategorySummary
  currencySymbol: string
  isLoading?: boolean
  dateRangeLabel?: string
}

export default function RoomCategoryPerformance({
  categories = [],
  summary,
  currencySymbol = '₹',
  isLoading = false,
  dateRangeLabel = '',
}: RoomCategoryPerformanceProps) {
  const formatMoney = (val: number) =>
    `${currencySymbol}${Number(val || 0).toLocaleString('en-IN')}`

  // Table sorting state
  const [sortKey, setSortKey] = useState<'name' | 'bookings' | 'roomNights' | 'occupancy' | 'revenue' | 'arr' | 'revenuePercent'>('revenue')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortKey(key)
      setSortOrder(key === 'name' ? 'asc' : 'desc')
    }
  }

  const sortedCategories = useMemo(() => {
    if (!categories || !Array.isArray(categories)) return []
    return [...categories].sort((a, b) => {
      if (sortKey === 'name') {
        const cmp = a.name.localeCompare(b.name)
        return sortOrder === 'asc' ? cmp : -cmp
      }
      const aVal = Number(a[sortKey] || 0)
      const bVal = Number(b[sortKey] || 0)
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
    })
  }, [categories, sortKey, sortOrder])

  // Custom Bar Chart Tooltip
  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const cat = payload[0].payload as CategoryData
      return (
        <div
          style={{
            background: 'var(--card-2)',
            border: '1px solid var(--border-2)',
            borderRadius: '10px',
            padding: '12px 16px',
            fontSize: '12.5px',
            boxShadow: 'var(--shadow-lg)',
            minWidth: '180px',
          }}
        >
          <div style={{ fontWeight: 800, color: 'var(--text)', marginBottom: '8px', fontSize: '13.5px' }}>
            {cat.name}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '3px' }}>
            <span style={{ color: 'var(--text-3)' }}>Revenue:</span>
            <strong style={{ color: 'var(--red)' }}>{formatMoney(cat.revenue)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '3px' }}>
            <span style={{ color: 'var(--text-3)' }}>Revenue Share:</span>
            <strong style={{ color: 'var(--text)' }}>{cat.revenuePercent}%</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '3px' }}>
            <span style={{ color: 'var(--text-3)' }}>Room Nights:</span>
            <strong style={{ color: 'var(--text)' }}>{cat.roomNights} nights</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '3px' }}>
            <span style={{ color: 'var(--text-3)' }}>Bookings:</span>
            <strong style={{ color: 'var(--text)' }}>{cat.bookings}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--text-3)' }}>ARR:</span>
            <strong style={{ color: '#10b981' }}>{formatMoney(cat.arr)}/night</strong>
          </div>
        </div>
      )
    }
    return null
  }

  // Custom Donut Chart Tooltip
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as CategoryData
      return (
        <div
          style={{
            background: 'var(--card-2)',
            border: '1px solid var(--border-2)',
            borderRadius: '10px',
            padding: '10px 14px',
            fontSize: '12.5px',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <div style={{ fontWeight: 800, color: data.color, marginBottom: '4px' }}>
            {data.name}
          </div>
          <div style={{ color: 'var(--text)', fontWeight: 700 }}>
            {formatMoney(data.revenue)} ({data.revenuePercent}%)
          </div>
          <div style={{ color: 'var(--text-3)', fontSize: '11px', marginTop: '2px' }}>
            {data.roomNights} room nights sold
          </div>
        </div>
      )
    }
    return null
  }

  const pieData = categories.filter((c) => c.revenue > 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* ========================================================================= */}
      {/* 1. TOP 4 SUMMARY METRIC CARDS */}
      {/* ========================================================================= */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Highest Revenue Category */}
        <div
          className="card"
          style={{
            position: 'relative',
            overflow: 'hidden',
            border: '1px solid rgba(201, 156, 66, 0.35)',
            background: 'var(--card)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '-15px',
              right: '-15px',
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'var(--red-dim)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Award size={22} color="var(--red)" />
          </div>

          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Top Revenue Category
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text)', marginTop: '4px', lineHeight: 1.2 }}>
            {summary?.highestRevenueCategory || 'None'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', fontSize: '12px' }}>
            <span style={{ color: 'var(--red)', fontWeight: 700 }}>
              {formatMoney(summary?.highestRevenueAmount || 0)}
            </span>
            <span style={{ color: 'var(--text-3)' }}>•</span>
            <span style={{ color: 'var(--text-2)', fontWeight: 600 }}>
              {summary?.highestRevenuePercent || 0}% of business
            </span>
          </div>
        </div>

        {/* Total Room Revenue */}
        <div className="card" style={{ background: 'var(--card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Room Revenue
            </div>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10b981',
              }}
            >
              <DollarSign size={16} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text)', marginTop: '4px' }}>
            {formatMoney(summary?.totalRoomRevenue || 0)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '8px' }}>
            Across {summary?.totalBookings || 0} total bookings
          </div>
        </div>

        {/* Total Room Nights Sold */}
        <div className="card" style={{ background: 'var(--card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Rooms Sold / Nights
            </div>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(59, 130, 246, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#3b82f6',
              }}
            >
              <BedDouble size={16} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text)', marginTop: '4px' }}>
            {summary?.totalRoomNights || 0} <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-3)' }}>nights</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '8px' }}>
            Utilized Room Nights (URN)
          </div>
        </div>

        {/* Average Room Rate (Overall ARR) */}
        <div className="card" style={{ background: 'var(--card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Average Room Rate (ARR)
            </div>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(139, 92, 246, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#8b5cf6',
              }}
            >
              <TrendingUp size={16} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text)', marginTop: '4px' }}>
            {formatMoney(summary?.overallArr || 0)} <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-3)' }}>/night</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '8px' }}>
            Blended portfolio ARR
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. REVENUE COMPARISON BAR CHART & DONUT CONTRIBUTION CHART */}
      {/* ========================================================================= */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '20px',
        }}
      >
        {/* Bar Chart: Revenue by Category */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
                Revenue by Room Category
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>
                Comparing total revenue generation per category
              </p>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600 }}>
              {dateRangeLabel}
            </div>
          </div>

          <div style={{ width: '100%', height: '280px' }}>
            {categories.length === 0 || summary?.totalRoomRevenue === 0 ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: '13px' }}>
                No category revenue data in this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categories} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="var(--text-3)"
                    fontSize={11.5}
                    tickLine={false}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis
                    stroke="var(--text-3)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) =>
                      val >= 100000 ? `₹${(val / 100000).toFixed(1)}L` : val >= 1000 ? `₹${(val / 1000).toFixed(0)}k` : `₹${val}`
                    }
                  />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                    {categories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Donut Chart: Revenue Contribution Share */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
                Revenue Contribution %
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>
                Share of total hotel business generated
              </p>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600 }}>
              100% Total Share
            </div>
          </div>

          <div style={{ width: '100%', height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {pieData.length === 0 ? (
              <div style={{ color: 'var(--text-3)', fontSize: '13px' }}>
                No category revenue data to display
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<CustomPieTooltip />} />
                  <Pie
                    data={pieData}
                    dataKey="revenue"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={3}
                    stroke="var(--card)"
                    strokeWidth={2}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`pie-cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value: string, entry: any) => {
                      const payload = entry.payload as CategoryData
                      return (
                        <span style={{ color: 'var(--text-2)', fontSize: '12px', fontWeight: 600, marginRight: '10px' }}>
                          {value} ({payload.revenuePercent}%)
                        </span>
                      )
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. CATEGORY BUSINESS BREAKDOWN TABLE */}
      {/* ========================================================================= */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--card-2)',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
              Room Category Performance Breakdown
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>
              Detailed booking count, room nights sold, occupancy %, ARR, and revenue contribution
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-3)', fontWeight: 600 }}>
                Order:
              </span>
              <button
                type="button"
                onClick={() => setSortOrder('desc')}
                style={{
                  padding: '5px 10px',
                  fontSize: '12px',
                  fontWeight: 700,
                  borderRadius: '6px',
                  border: `1px solid ${sortOrder === 'desc' ? 'var(--accent)' : 'var(--border)'}`,
                  background: sortOrder === 'desc' ? 'var(--accent)' : 'var(--card)',
                  color: sortOrder === 'desc' ? '#ffffff' : 'var(--text-2)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease',
                }}
                title="Sort High to Low (Descending)"
              >
                <ArrowDown size={13} />
                <span>High to Low</span>
              </button>
              <button
                type="button"
                onClick={() => setSortOrder('asc')}
                style={{
                  padding: '5px 10px',
                  fontSize: '12px',
                  fontWeight: 700,
                  borderRadius: '6px',
                  border: `1px solid ${sortOrder === 'asc' ? 'var(--accent)' : 'var(--border)'}`,
                  background: sortOrder === 'asc' ? 'var(--accent)' : 'var(--card)',
                  color: sortOrder === 'asc' ? '#ffffff' : 'var(--text-2)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease',
                }}
                title="Sort Low to High (Ascending)"
              >
                <ArrowUp size={13} />
                <span>Low to High</span>
              </button>
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text-3)', fontWeight: 600, borderLeft: '1px solid var(--border)', paddingLeft: '10px' }}>
              {categories.length} Categories
            </div>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--card-2)', color: 'var(--text-3)', fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                <th
                  onClick={() => toggleSort('name')}
                  style={{
                    padding: '12px 18px',
                    cursor: 'pointer',
                    userSelect: 'none',
                    color: sortKey === 'name' ? 'var(--text)' : 'var(--text-3)',
                  }}
                  title="Sort by Category Name"
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span>Room Category</span>
                    {sortKey === 'name' ? (
                      sortOrder === 'asc' ? <ArrowUp size={13} color="var(--accent-highlight, #A78BFA)" /> : <ArrowDown size={13} color="var(--accent-highlight, #A78BFA)" />
                    ) : (
                      <ArrowUpDown size={12} style={{ opacity: 0.35 }} />
                    )}
                  </div>
                </th>

                <th
                  onClick={() => toggleSort('bookings')}
                  style={{
                    padding: '12px 16px',
                    textAlign: 'right',
                    cursor: 'pointer',
                    userSelect: 'none',
                    color: sortKey === 'bookings' ? 'var(--text)' : 'var(--text-3)',
                  }}
                  title="Sort by Total Bookings"
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                    <span>Total Bookings</span>
                    {sortKey === 'bookings' ? (
                      sortOrder === 'asc' ? <ArrowUp size={13} color="var(--accent-highlight, #A78BFA)" /> : <ArrowDown size={13} color="var(--accent-highlight, #A78BFA)" />
                    ) : (
                      <ArrowUpDown size={12} style={{ opacity: 0.35 }} />
                    )}
                  </div>
                </th>

                <th
                  onClick={() => toggleSort('roomNights')}
                  style={{
                    padding: '12px 16px',
                    textAlign: 'right',
                    cursor: 'pointer',
                    userSelect: 'none',
                    color: sortKey === 'roomNights' ? 'var(--text)' : 'var(--text-3)',
                  }}
                  title="Sort by Room Nights (URN)"
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                    <span>Room Nights (URN)</span>
                    {sortKey === 'roomNights' ? (
                      sortOrder === 'asc' ? <ArrowUp size={13} color="var(--accent-highlight, #A78BFA)" /> : <ArrowDown size={13} color="var(--accent-highlight, #A78BFA)" />
                    ) : (
                      <ArrowUpDown size={12} style={{ opacity: 0.35 }} />
                    )}
                  </div>
                </th>

                <th
                  onClick={() => toggleSort('occupancy')}
                  style={{
                    padding: '12px 16px',
                    textAlign: 'right',
                    cursor: 'pointer',
                    userSelect: 'none',
                    color: sortKey === 'occupancy' ? 'var(--text)' : 'var(--text-3)',
                  }}
                  title="Sort by Occupancy %"
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                    <span>Occupancy %</span>
                    {sortKey === 'occupancy' ? (
                      sortOrder === 'asc' ? <ArrowUp size={13} color="var(--accent-highlight, #A78BFA)" /> : <ArrowDown size={13} color="var(--accent-highlight, #A78BFA)" />
                    ) : (
                      <ArrowUpDown size={12} style={{ opacity: 0.35 }} />
                    )}
                  </div>
                </th>

                <th
                  onClick={() => toggleSort('revenue')}
                  style={{
                    padding: '12px 16px',
                    textAlign: 'right',
                    cursor: 'pointer',
                    userSelect: 'none',
                    color: sortKey === 'revenue' ? 'var(--text)' : 'var(--text-3)',
                  }}
                  title="Sort by Total Revenue"
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                    <span>Total Revenue</span>
                    {sortKey === 'revenue' ? (
                      sortOrder === 'asc' ? <ArrowUp size={13} color="var(--accent-highlight, #A78BFA)" /> : <ArrowDown size={13} color="var(--accent-highlight, #A78BFA)" />
                    ) : (
                      <ArrowUpDown size={12} style={{ opacity: 0.35 }} />
                    )}
                  </div>
                </th>

                <th
                  onClick={() => toggleSort('arr')}
                  style={{
                    padding: '12px 16px',
                    textAlign: 'right',
                    cursor: 'pointer',
                    userSelect: 'none',
                    color: sortKey === 'arr' ? 'var(--text)' : 'var(--text-3)',
                  }}
                  title="Sort by Average Rate (ARR)"
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                    <span>Average Rate (ARR)</span>
                    {sortKey === 'arr' ? (
                      sortOrder === 'asc' ? <ArrowUp size={13} color="var(--accent-highlight, #A78BFA)" /> : <ArrowDown size={13} color="var(--accent-highlight, #A78BFA)" />
                    ) : (
                      <ArrowUpDown size={12} style={{ opacity: 0.35 }} />
                    )}
                  </div>
                </th>

                <th
                  onClick={() => toggleSort('revenuePercent')}
                  style={{
                    padding: '12px 18px',
                    textAlign: 'right',
                    minWidth: '160px',
                    cursor: 'pointer',
                    userSelect: 'none',
                    color: sortKey === 'revenuePercent' ? 'var(--text)' : 'var(--text-3)',
                  }}
                  title="Sort by Revenue %"
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                    <span>Revenue %</span>
                    {sortKey === 'revenuePercent' ? (
                      sortOrder === 'asc' ? <ArrowUp size={13} color="var(--accent-highlight, #A78BFA)" /> : <ArrowDown size={13} color="var(--accent-highlight, #A78BFA)" />
                    ) : (
                      <ArrowUpDown size={12} style={{ opacity: 0.35 }} />
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedCategories.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-3)' }}>
                    No room categories found for this property
                  </td>
                </tr>
              ) : (
                sortedCategories.map((cat, idx) => {
                  const isTop = idx === 0 && cat.revenue > 0
                  return (
                    <tr
                      key={cat.name}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        transition: 'background 0.15s ease',
                      }}
                      className="hover:bg-[var(--card-hover)]"
                    >
                      {/* Category Name & Rank */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span
                            style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              backgroundColor: cat.color,
                              flexShrink: 0,
                            }}
                          />
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>{cat.name}</span>
                              {isTop && (
                                <span
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: 800,
                                    padding: '2px 6px',
                                    borderRadius: '10px',
                                    background: 'var(--red-dim)',
                                    color: 'var(--red)',
                                    border: '1px solid var(--border-glow)',
                                    letterSpacing: '0.3px',
                                  }}
                                >
                                  TOP EARNER
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                              {cat.availableRooms} rooms allocated
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Total Bookings */}
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--text-1)' }}>
                        {cat.bookings}
                      </td>

                      {/* Room Nights (URN) */}
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--text)' }}>
                        {cat.roomNights} <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>nights</span>
                      </td>

                      {/* Occupancy % */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <span
                          style={{
                            fontWeight: 700,
                            color: cat.occupancy >= 80 ? '#10b981' : cat.occupancy >= 50 ? 'var(--red)' : 'var(--text-2)',
                          }}
                        >
                          {cat.occupancy}%
                        </span>
                      </td>

                      {/* Total Revenue */}
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 800, color: 'var(--text)' }}>
                        {formatMoney(cat.revenue)}
                      </td>

                      {/* Average Rate (ARR) */}
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--text-2)' }}>
                        {formatMoney(cat.arr)}
                      </td>

                      {/* Revenue Contribution % & Progress Bar */}
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                          <span style={{ fontWeight: 700, color: 'var(--text)' }}>
                            {cat.revenuePercent}%
                          </span>
                          <div
                            style={{
                              width: '100%',
                              height: '6px',
                              borderRadius: '3px',
                              background: 'var(--border)',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${Math.min(100, Math.max(0, cat.revenuePercent))}%`,
                                height: '100%',
                                backgroundColor: cat.color,
                                borderRadius: '3px',
                              }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
            {categories.length > 0 && summary?.totalRoomRevenue > 0 && (
              <tfoot>
                <tr style={{ background: 'var(--card-2)', borderTop: '2px solid var(--border)', fontWeight: 800 }}>
                  <td style={{ padding: '14px 18px', color: 'var(--text)' }}>Total Portfolio Business</td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--text)' }}>{summary.totalBookings}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--text)' }}>{summary.totalRoomNights} nights</td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--text)' }}>—</td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--red)', fontSize: '14px' }}>
                    {formatMoney(summary.totalRoomRevenue)}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--text)' }}>
                    {formatMoney(summary.overallArr)}
                  </td>
                  <td style={{ padding: '14px 18px', textAlign: 'right', color: 'var(--text)' }}>100%</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}
