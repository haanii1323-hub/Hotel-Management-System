'use client'
import { useState } from 'react'
import useSWR from 'swr'
import AppShell from '@/components/layout/AppShell'
import { format, subDays } from 'date-fns'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

const fetcher = (url: string) => fetch(url).then(r => r.json())
function fmt(n: number) { return `₹${Number(n || 0).toLocaleString('en-IN')}` }

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: 'var(--card-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: '13px' }}>
        <div style={{ color: 'var(--text-2)', marginBottom: '4px' }}>{label}</div>
        {payload.map((p: any) => (
          <div key={p.name} style={{ color: p.color || '#fff', fontWeight: 600 }}>
            {p.name === 'revenue' ? `Revenue: ${fmt(p.value)}` : p.name === 'urn' ? `URN: ${p.value}` : `${p.name}: ${p.value}`}
          </div>
        ))}
      </div>
    )
  }
  return null
}

export default function ReportsPage() {
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const thirtyAgo = format(subDays(new Date(), 29), 'yyyy-MM-dd')
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

  return (
    <AppShell>
      <div className="page-header">
        <h1 className="page-title">Trends &amp; Performance Reports</h1>
      </div>

      {/* Date filter */}
      <div className="date-filter">
        <label>From</label>
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} max={to} />
        <label>To</label>
        <input type="date" value={to} onChange={e => setTo(e.target.value)} min={from} max={todayStr} />
        <span style={{ fontSize: '12px', color: 'var(--text-2)', marginLeft: '8px' }}>
          ({data?.numDays ?? 0} days · {data?.sellableRooms ?? 0} sellable rooms)
        </span>
      </div>

      {/* 5-Card KPI Row */}
      <div className="reports-metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {/* 1. Room Revenue */}
        <div className="metric-card">
          <div className="metric-label">Room Revenue</div>
          <div className="metric-value">{isLoading ? '—' : fmt(roomRevenue)}</div>
          <div className="metric-sub">Total room booking charges</div>
        </div>

        {/* 2. URN Used */}
        <div className="metric-card">
          <div className="metric-label">URN Used</div>
          <div className="metric-value">{isLoading ? '—' : urnUsed}</div>
          <div className="metric-sub">Used Room Nights</div>
        </div>

        {/* 3. SRN */}
        <div className="metric-card">
          <div className="metric-label">SRN</div>
          <div className="metric-value">{isLoading ? '—' : srn}</div>
          <div className="metric-sub">Sellable Room Nights</div>
        </div>

        {/* 4. Occupancy */}
        <div className="metric-card">
          <div className="metric-label">Occupancy</div>
          <div className="metric-value">{isLoading ? '—' : `${occupancy}%`}</div>
          <div className="metric-sub">URN ÷ SRN × 100</div>
        </div>

        {/* 5. ARR */}
        <div className="metric-card">
          <div className="metric-label">ARR</div>
          <div className="metric-value">{isLoading ? '—' : fmt(arr)}</div>
          <div className="metric-sub">Average Room Rate</div>
        </div>
      </div>

      {/* Hotel Performance Summary Section */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700 }}>Hotel Performance</div>
            <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px' }}>
              Real-time operational efficiency metrics for the selected period
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className="badge badge-green" style={{ fontSize: '12px', padding: '4px 10px' }}>
              {occupancy}% Occupancy
            </span>
          </div>
        </div>

        {/* 4 summary stat blocks */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', padding: '16px', background: 'var(--card-2)', borderRadius: 'var(--radius-sm)', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>URN Used</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)', marginTop: '4px' }}>
              {isLoading ? '—' : `${urnUsed} room nights`}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SRN</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)', marginTop: '4px' }}>
              {isLoading ? '—' : `${srn} room nights`}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Occupancy</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)', marginTop: '4px' }}>
              {isLoading ? '—' : `${occupancy}%`}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ARR</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)', marginTop: '4px' }}>
              {isLoading ? '—' : fmt(arr)}
            </div>
          </div>
        </div>

        {/* Visual Comparison Progress Bars */}
        <div style={{ padding: '0 4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
            <span style={{ color: 'var(--text-2)' }}>
              Used Room Nights: <strong style={{ color: 'var(--text)' }}>{urnUsed}</strong> / {srn}
            </span>
            <span style={{ color: 'var(--text-2)' }}>
              Sellable Room Nights: <strong style={{ color: 'var(--text)' }}>{srn}</strong>
            </span>
            <span style={{ fontWeight: 600, color: 'var(--red)' }}>
              Occupancy: {occupancy}%
            </span>
          </div>
          <div style={{ width: '100%', height: '8px', background: 'var(--card-2)', borderRadius: '4px', overflow: 'hidden' }}>
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

      {/* Daily Revenue & Performance Chart */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600 }}>Daily Room Revenue</div>
            <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px' }}>
              Revenue generated per night across all active bookings
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="skeleton" style={{ height: 220 }} />
        ) : !data?.dailyRevenue?.length ? (
          <div style={{ color: 'var(--text-2)', fontSize: '13px', textAlign: 'center', padding: '40px' }}>
            No revenue data for selected period.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.dailyRevenue} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fill: 'var(--text-2)', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fill: 'var(--text-2)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="revenue" fill="var(--red)" radius={[3, 3, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* Daily Breakdown Table */}
        {data?.dailyReport && data.dailyReport.length > 0 && (
          <div style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '12px' }}>
              Daily Performance Breakdown
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-2)', textAlign: 'left' }}>
                    <th style={{ padding: '8px 6px' }}>Date</th>
                    <th style={{ padding: '8px 6px', textAlign: 'right' }}>URN</th>
                    <th style={{ padding: '8px 6px', textAlign: 'right' }}>SRN</th>
                    <th style={{ padding: '8px 6px', textAlign: 'right' }}>Occupancy</th>
                    <th style={{ padding: '8px 6px', textAlign: 'right' }}>Room Revenue</th>
                    <th style={{ padding: '8px 6px', textAlign: 'right' }}>ARR</th>
                  </tr>
                </thead>
                <tbody>
                  {data.dailyReport.slice(-10).map((d: any) => (
                    <tr key={d.dateFull} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 6px', color: 'var(--text)' }}>{d.date}</td>
                      <td style={{ padding: '8px 6px', textAlign: 'right', color: 'var(--text)' }}>{d.urn}</td>
                      <td style={{ padding: '8px 6px', textAlign: 'right', color: 'var(--text-2)' }}>{d.srn}</td>
                      <td style={{ padding: '8px 6px', textAlign: 'right', color: d.occupancy > 0 ? 'var(--green)' : 'var(--text-2)' }}>{d.occupancy}%</td>
                      <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 600, color: 'var(--text)' }}>{fmt(d.revenue)}</td>
                      <td style={{ padding: '8px 6px', textAlign: 'right', color: 'var(--text)' }}>{fmt(d.arr)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.dailyReport.length > 10 && (
                <div style={{ fontSize: '11px', color: 'var(--text-3)', textAlign: 'right', marginTop: '6px' }}>
                  Showing latest 10 days in selected date range
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Room Category Performance Section */}
      <div className="card">
        <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>Room Category Performance</div>
        <div style={{ fontSize: '12px', color: 'var(--text-2)', marginBottom: '16px' }}>
          Detailed performance breakdown by room type for the selected period
        </div>

        {isLoading ? (
          <div className="skeleton" style={{ height: 180 }} />
        ) : !data?.categoryPerformance?.length ? (
          <div style={{ color: 'var(--text-2)', fontSize: '13px', textAlign: 'center', padding: '30px' }}>
            No room category data available.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
            {data.categoryPerformance.map((c: any) => (
              <div
                key={c.name}
                style={{
                  background: 'var(--card-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>{c.name}</span>
                  <span className="badge badge-green">{c.occupancy}% Occ</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-2)' }}>URN Used</span>
                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>{c.urnUsed} room nights</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-2)' }}>SRN</span>
                    <span style={{ color: 'var(--text-2)' }}>{c.srn} room nights</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-2)' }}>Occupancy</span>
                    <span style={{ color: c.occupancy > 0 ? 'var(--green)' : 'var(--text-2)', fontWeight: 600 }}>{c.occupancy}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px', borderTop: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--text-2)' }}>Room Revenue</span>
                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>{fmt(c.revenue)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-2)' }}>ARR</span>
                    <span style={{ fontWeight: 700, color: 'var(--green)' }}>{fmt(c.arr)}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ width: '100%', height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden', marginTop: '12px' }}>
                  <div
                    style={{
                      width: `${c.srn > 0 ? Math.min(100, Math.max(0, (c.urnUsed / c.srn) * 100)) : 0}%`,
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
    </AppShell>
  )
}
