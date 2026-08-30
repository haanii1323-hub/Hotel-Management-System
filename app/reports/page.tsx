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
import { Calendar, TrendingUp, DollarSign, Layers, Percent } from 'lucide-react'
import { useProperty } from '@/context/PropertyContext'
import { useRealtimeSync } from '@/lib/realtime-sync'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function ReportsPage() {
  const { currentProperty } = useProperty()
  const propertyId = currentProperty?.id || ''
  const currencySymbol = currentProperty?.currencySymbol || '₹'

  const formatMoney = (n: number) => `${currencySymbol}${Number(n || 0).toLocaleString('en-IN')}`

  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')
  const thirtyAgo = format(subDays(today, 29), 'yyyy-MM-dd')

  const [from, setFrom] = useState(thirtyAgo)
  const [to, setTo] = useState(todayStr)

  let q = `from=${from}&to=${to}`
  if (propertyId) q += `&propertyId=${propertyId}`

  const { data, isLoading, mutate } = useSWR(`/api/reports?${q}`, fetcher, { refreshInterval: 4000 })

  useRealtimeSync(() => {
    mutate()
  })

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
        <div className="page-header">
          <div>
            <h1 className="page-title">Performance Reports · {currentProperty?.name}</h1>
            <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px' }}>
              {currentProperty?.code} · {currentProperty?.city} · Real-time room revenue, URN, SRN, occupancy, and ARR
            </div>
          </div>
        </div>

        {/* Date Filter & Presets Toolbar */}
        <div className="reports-filter-bar">
          <div className="reports-date-inputs">
            <div className="date-input-group">
              <label>From</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} max={to} />
            </div>
            <div className="date-input-group">
              <label>To</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} min={from} />
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
            {currentProperty?.name} ({data?.totalRooms ?? 0} Rooms)
          </div>
        </div>

        {/* 5-Card Top Metric Row */}
        <div className="reports-metrics">
          {/* 1. Room Revenue */}
          <div className="metric-card">
            <div className="metric-label">
              <DollarSign size={13} color="var(--text-2)" /> Room Revenue
            </div>
            <div className="metric-value">{isLoading ? '—' : formatMoney(roomRevenue)}</div>
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
              {isLoading ? '—' : formatMoney(arr)}
            </div>
            <div className="metric-sub">Average Room Rate</div>
          </div>
        </div>

        {/* Performance Summary Card */}
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
                Hotel Performance Summary · {currentProperty?.code}
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
              <div className="perf-stat-value" style={{ color: occupancy > 0 ? 'var(--green)' : 'var(--text)' }}>
                {isLoading ? '—' : `${occupancy}%`}
              </div>
              <div className="perf-stat-desc">Actual room utilization</div>
            </div>
            <div className="perf-stat-block">
              <div className="perf-stat-label">Average Room Rate (ARR)</div>
              <div className="perf-stat-value" style={{ color: 'var(--green)' }}>
                {isLoading ? '—' : formatMoney(arr)}
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
              <span style={{ fontWeight: 600, color: 'var(--red)' }}>Occupancy: {occupancy}%</span>
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

        {/* Daily Breakdown Table */}
        {data?.dailyBreakdown && data.dailyBreakdown.length > 0 && (
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
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>Daily Performance Log</div>
                <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px' }}>
                  Detailed day-by-day URN, SRN, and realized revenue
                </div>
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
                  {data.dailyBreakdown.map((d: any) => (
                    <tr key={d.date}>
                      <td style={{ fontWeight: 600, color: 'var(--text)' }}>{d.displayDate} ({d.dayName})</td>
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
                        {formatMoney(d.revenue)}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--green)' }}>{formatMoney(d.arr)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
