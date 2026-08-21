'use client'

import { useState } from 'react'
import useSWR from 'swr'
import AppShell from '@/components/layout/AppShell'
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Calendar, TrendingUp, BarChart3, Layers, DollarSign, Percent } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function fmt(n: number) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`
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
          <div key={p.name} style={{ color: p.color || '#fff', fontWeight: 600, marginTop: '2px' }}>
            {p.name === 'revenue'
              ? `Revenue: ${fmt(p.value)}`
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

export default function ReportsPage() {
  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')
  const thirtyAgo = format(subDays(today, 29), 'yyyy-MM-dd')

  const [from, setFrom] = useState(thirtyAgo)
  const [to, setTo] = useState(todayStr)

  const { data, isLoading } = useSWR(
    `/api/reports?from=${from}&to=${to}`,
    fetcher,
    { refreshInterval: 5000 }
  )

  const urnUsed = data?.urnUsed ?? 0
  const srn = data?.srn ?? 0
  const occupancy = data?.occupancy ?? 0
  const roomRevenue = data?.roomRevenue ?? 0
  const arr = data?.arr ?? 0

  const occupancyRatio = srn > 0 ? Math.min(100, Math.max(0, (urnUsed / srn) * 100)) : 0

  // Date range presets
  const setPreset = (type: '7days' | '30days' | 'thisMonth') => {
    if (type === '7days') {
      setFrom(format(subDays(today, 6), 'yyyy-MM-dd'))
      setTo(todayStr)
    } else if (type === '30days') {
      setFrom(thirtyAgo)
      setTo(todayStr)
    } else if (type === 'thisMonth') {
      setFrom(format(startOfMonth(today), 'yyyy-MM-dd'))
      setTo(format(endOfMonth(today), 'yyyy-MM-dd'))
    }
  }

  return (
    <AppShell>
      <div className="reports-container">
        {/* Page Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Trends &amp; Performance Reports</h1>
            <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px' }}>
              Real-time room revenue, URN, SRN, occupancy rate, and ARR analytics
            </div>
          </div>
        </div>

        {/* Date Filter & Presets Toolbar */}
        <div className="reports-filter-bar">
          <div className="reports-date-inputs">
            <div className="date-input-group">
              <label>From</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                max={to}
              />
            </div>
            <div className="date-input-group">
              <label>To</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                min={from}
              />
            </div>
          </div>

          {/* Quick Presets */}
          <div className="reports-presets">
            <button
              className={`preset-btn ${from === format(subDays(today, 6), 'yyyy-MM-dd') ? 'active' : ''}`}
              onClick={() => setPreset('7days')}
            >
              7D
            </button>
            <button
              className={`preset-btn ${from === thirtyAgo ? 'active' : ''}`}
              onClick={() => setPreset('30days')}
            >
              30D
            </button>
            <button
              className={`preset-btn ${from === format(startOfMonth(today), 'yyyy-MM-dd') ? 'active' : ''}`}
              onClick={() => setPreset('thisMonth')}
            >
              This Month
            </button>
          </div>

          <div className="reports-filter-info">
            {data?.numDays ?? 0} days · {data?.sellableRooms ?? 0} sellable rooms
          </div>
        </div>

        {/* 5-Card Top Metric Row */}
        <div className="reports-metrics">
          {/* 1. Room Revenue */}
          <div className="metric-card">
            <div className="metric-label">
              <DollarSign size={13} color="var(--text-2)" /> Room Revenue
            </div>
            <div className="metric-value">{isLoading ? '—' : fmt(roomRevenue)}</div>
            <div className="metric-sub">Total room booking charges</div>
          </div>

          {/* 2. URN Used */}
          <div className="metric-card">
            <div className="metric-label">
              <Layers size={13} color="var(--text-2)" /> URN Used
            </div>
            <div className="metric-value">{isLoading ? '—' : urnUsed}</div>
            <div className="metric-sub">Used Room Nights</div>
          </div>

          {/* 3. SRN */}
          <div className="metric-card">
            <div className="metric-label">
              <Calendar size={13} color="var(--text-2)" /> SRN
            </div>
            <div className="metric-value">{isLoading ? '—' : srn}</div>
            <div className="metric-sub">Sellable Room Nights</div>
          </div>

          {/* 4. Occupancy */}
          <div className="metric-card">
            <div className="metric-label">
              <Percent size={13} color="var(--text-2)" /> Occupancy
            </div>
            <div className="metric-value" style={{ color: occupancy > 0 ? 'var(--green)' : 'var(--text)' }}>
              {isLoading ? '—' : `${occupancy}%`}
            </div>
            <div className="metric-sub">URN ÷ SRN × 100</div>
          </div>

          {/* 5. ARR */}
          <div className="metric-card">
            <div className="metric-label">
              <TrendingUp size={13} color="var(--text-2)" /> ARR
            </div>
            <div className="metric-value" style={{ color: 'var(--green)' }}>
              {isLoading ? '—' : fmt(arr)}
            </div>
            <div className="metric-sub">Average Room Rate</div>
          </div>
        </div>

        {/* Hotel Performance Summary Card */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>
                Hotel Performance Summary
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px' }}>
                Operational efficiency and room night realization
              </div>
            </div>
            <div>
              <span className="badge badge-green" style={{ fontSize: '12px', padding: '5px 12px' }}>
                {occupancy}% Realized Occupancy
              </span>
            </div>
          </div>

          {/* 4 Performance Stat Blocks */}
          <div className="performance-stats-grid">
            <div className="perf-stat-block">
              <div className="perf-stat-label">URN Used</div>
              <div className="perf-stat-value">{isLoading ? '—' : `${urnUsed} nights`}</div>
              <div className="perf-stat-desc">Rooms sold × nights</div>
            </div>
            <div className="perf-stat-block">
              <div className="perf-stat-label">SRN Capacity</div>
              <div className="perf-stat-value">{isLoading ? '—' : `${srn} nights`}</div>
              <div className="perf-stat-desc">Sellable inventory</div>
            </div>
            <div className="perf-stat-block">
              <div className="perf-stat-label">Occupancy Rate</div>
              <div
                className="perf-stat-value"
                style={{ color: occupancy > 0 ? 'var(--green)' : 'var(--text)' }}
              >
                {isLoading ? '—' : `${occupancy}%`}
              </div>
              <div className="perf-stat-desc">Actual room utilization</div>
            </div>
            <div className="perf-stat-block">
              <div className="perf-stat-label">Average Room Rate (ARR)</div>
              <div className="perf-stat-value" style={{ color: 'var(--green)' }}>
                {isLoading ? '—' : fmt(arr)}
              </div>
              <div className="perf-stat-desc">Revenue per sold night</div>
            </div>
          </div>

          {/* Visual Comparison Progress Bar */}
          <div style={{ padding: '0 4px', marginTop: '14px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '12px',
                marginBottom: '8px',
                flexWrap: 'wrap',
                gap: '6px',
              }}
            >
              <span style={{ color: 'var(--text-2)' }}>
                Used Room Nights: <strong style={{ color: 'var(--text)' }}>{urnUsed}</strong> / {srn}
              </span>
              <span style={{ color: 'var(--text-2)' }}>
                Available Capacity: <strong style={{ color: 'var(--text)' }}>{Math.max(0, srn - urnUsed)} nights</strong>
              </span>
              <span style={{ fontWeight: 600, color: 'var(--red)' }}>
                Occupancy: {occupancy}%
              </span>
            </div>
            <div
              style={{
                width: '100%',
                height: '8px',
                background: 'var(--card-2)',
                borderRadius: '4px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${occupancyRatio}%`,
                  height: '100%',
                  background: 'var(--red)',
                  borderRadius: '4px',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>
        </div>

        {/* Daily Revenue Chart & Performance Table */}
        <div className="card" style={{ marginBottom: '20px', minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
                Daily Room Revenue
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px' }}>
                Nightly room charges realized across all active reservations
              </div>
            </div>
          </div>

          {/* Chart View */}
          <div style={{ width: '100%', minWidth: 0, height: 230 }}>
            {isLoading ? (
              <div className="skeleton" style={{ height: 230, width: '100%' }} />
            ) : !data?.dailyRevenue?.length ? (
              <div style={{ color: 'var(--text-2)', fontSize: '13px', textAlign: 'center', padding: '40px' }}>
                No revenue recorded for this period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={data.dailyRevenue} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: 'var(--text-2)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fill: 'var(--text-2)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => (v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`)}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="revenue" fill="var(--red)" radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Daily Breakdown Table */}
          {data?.dailyReport && data.dailyReport.length > 0 && (
            <div style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px',
                  flexWrap: 'wrap',
                  gap: '6px',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                  Daily Performance Log
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-2)' }}>
                  Showing latest {Math.min(10, data.dailyReport.length)} days
                </div>
              </div>

              <div className="table-responsive">
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th style={{ textAlign: 'right' }}>URN</th>
                      <th style={{ textAlign: 'right' }}>SRN</th>
                      <th style={{ textAlign: 'right' }}>Occupancy</th>
                      <th style={{ textAlign: 'right' }}>Room Revenue</th>
                      <th style={{ textAlign: 'right' }}>ARR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.dailyReport.slice(-10).map((d: any) => (
                      <tr key={d.dateFull}>
                        <td style={{ fontWeight: 600, color: 'var(--text)' }}>{d.date}</td>
                        <td style={{ textAlign: 'right', color: 'var(--text)' }}>{d.urn}</td>
                        <td style={{ textAlign: 'right', color: 'var(--text-2)' }}>{d.srn}</td>
                        <td
                          style={{
                            textAlign: 'right',
                            fontWeight: 600,
                            color: d.occupancy > 0 ? 'var(--green)' : 'var(--text-2)',
                          }}
                        >
                          {d.occupancy}%
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text)' }}>
                          {fmt(d.revenue)}
                        </td>
                        <td style={{ textAlign: 'right', color: 'var(--green)' }}>
                          {fmt(d.arr)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Room Category Performance Section */}
        <div className="card">
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
            Room Category Performance
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px', marginBottom: '16px' }}>
            Category-wise inventory utilization, URN, ARR, and room revenues
          </div>

          {isLoading ? (
            <div className="skeleton" style={{ height: 180 }} />
          ) : !data?.categoryPerformance?.length ? (
            <div style={{ color: 'var(--text-2)', fontSize: '13px', textAlign: 'center', padding: '30px' }}>
              No room category data available.
            </div>
          ) : (
            <div className="category-performance-grid">
              {data.categoryPerformance.map((c: any) => (
                <div key={c.name} className="category-stat-card">
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '12px',
                    }}
                  >
                    <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
                      {c.name}
                    </span>
                    <span
                      className={`badge ${c.occupancy > 0 ? 'badge-green' : 'badge-gray'}`}
                      style={{ fontSize: '11px' }}
                    >
                      {c.occupancy}% Occ
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-2)' }}>URN Used</span>
                      <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                        {c.urnUsed} nights
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-2)' }}>SRN Capacity</span>
                      <span style={{ color: 'var(--text-2)' }}>{c.srn} nights</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-2)' }}>Occupancy Rate</span>
                      <span
                        style={{
                          fontWeight: 600,
                          color: c.occupancy > 0 ? 'var(--green)' : 'var(--text-2)',
                        }}
                      >
                        {c.occupancy}%
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        paddingTop: '6px',
                        borderTop: '1px solid var(--border)',
                      }}
                    >
                      <span style={{ color: 'var(--text-2)' }}>Room Revenue</span>
                      <span style={{ fontWeight: 600, color: 'var(--text)' }}>{fmt(c.revenue)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-2)' }}>ARR</span>
                      <span style={{ fontWeight: 700, color: 'var(--green)' }}>{fmt(c.arr)}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div
                    style={{
                      width: '100%',
                      height: '4px',
                      background: 'var(--border)',
                      borderRadius: '2px',
                      overflow: 'hidden',
                      marginTop: '12px',
                    }}
                  >
                    <div
                      style={{
                        width: `${
                          c.srn > 0 ? Math.min(100, Math.max(0, (c.urnUsed / c.srn) * 100)) : 0
                        }%`,
                        height: '100%',
                        background: 'var(--red)',
                        borderRadius: '2px',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
