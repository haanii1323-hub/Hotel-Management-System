'use client'

import useSWR from 'swr'
import { X, Building2, BedDouble, Users, TrendingUp, Check, Plus, ExternalLink } from 'lucide-react'
import { useProperty } from '@/context/PropertyContext'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface Props {
  onClose: () => void
  onAddProperty?: () => void
}

function fmt(n: number) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`
}

export default function AllPropertiesModal({ onClose, onAddProperty }: Props) {
  const { data, isLoading } = useSWR('/api/properties/overview', fetcher)
  const { currentProperty, switchProperty } = useProperty()

  const portfolio = data?.portfolio || {
    totalProperties: 0,
    totalRooms: 0,
    totalOccupied: 0,
    totalAvailable: 0,
    totalRevenue: 0,
    totalBookings: 0,
    overallOccupancy: 0,
  }
  const properties = data?.properties || []

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      style={{ zIndex: 1200 }}
    >
      <div className="modal" style={{ maxWidth: '840px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={18} color="var(--red)" /> All Properties Portfolio Overview
            <button onClick={onClose} className="btn-icon" style={{ marginLeft: 'auto', background: 'none', border: 'none' }}>
              <X size={16} />
            </button>
          </div>
          <div className="modal-subtitle">
            Consolidated metrics across all {portfolio.totalProperties} active hotel properties.
          </div>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Top KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
            <div className="kpi-card" style={{ padding: '12px' }}>
              <div className="kpi-label">Properties</div>
              <div className="kpi-value" style={{ fontSize: '20px' }}>{portfolio.totalProperties}</div>
            </div>
            <div className="kpi-card" style={{ padding: '12px' }}>
              <div className="kpi-label">Total Rooms</div>
              <div className="kpi-value" style={{ fontSize: '20px' }}>{portfolio.totalRooms}</div>
            </div>
            <div className="kpi-card" style={{ padding: '12px' }}>
              <div className="kpi-label">Occupied</div>
              <div className="kpi-value" style={{ fontSize: '20px', color: 'var(--green)' }}>{portfolio.totalOccupied}</div>
            </div>
            <div className="kpi-card" style={{ padding: '12px' }}>
              <div className="kpi-label">Available</div>
              <div
                className="kpi-value"
                style={{
                  fontSize: '20px',
                  color: portfolio.totalAvailable < 0 ? 'var(--red)' : 'var(--text)',
                }}
              >
                {portfolio.totalAvailable}
              </div>
            </div>
            <div className="kpi-card" style={{ padding: '12px' }}>
              <div className="kpi-label">Occupancy</div>
              <div
                className="kpi-value"
                style={{
                  fontSize: '20px',
                  color:
                    portfolio.overallOccupancy > 100
                      ? 'var(--red)'
                      : portfolio.overallOccupancy > 0
                      ? 'var(--green)'
                      : 'var(--text)',
                }}
              >
                {portfolio.overallOccupancy}%
              </div>
            </div>
            <div className="kpi-card" style={{ padding: '12px' }}>
              <div className="kpi-label">Total Revenue</div>
              <div className="kpi-value" style={{ fontSize: '20px', color: 'var(--green)' }}>{fmt(portfolio.totalRevenue)}</div>
            </div>
          </div>

          {/* Properties Table */}
          <div
            style={{
              background: 'var(--card-2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              overflow: 'hidden',
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ margin: 0, width: '100%', fontSize: '12px' }}>
                <thead>
                  <tr>
                    <th>Property</th>
                    <th>City</th>
                    <th style={{ textAlign: 'center' }}>Rooms</th>
                    <th style={{ textAlign: 'center' }}>Occupancy</th>
                    <th style={{ textAlign: 'right' }}>Revenue</th>
                    <th style={{ textAlign: 'center' }}>Bookings</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '24px' }}>
                        <span className="spinner" style={{ width: 18, height: 18 }} />
                      </td>
                    </tr>
                  ) : (
                    properties.map((p: any) => {
                      const isCurrent = currentProperty?.id === p.id
                      return (
                        <tr key={p.id} style={{ background: isCurrent ? 'var(--card)' : undefined }}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {p.coverImage ? (
                                <img
                                  src={p.coverImage}
                                  alt={p.name}
                                  style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover' }}
                                />
                              ) : (
                                <div
                                  style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: 4,
                                    background: 'var(--card)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <Building2 size={14} />
                                </div>
                              )}
                              <div>
                                <div style={{ fontWeight: 600 }}>{p.name}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{p.code}</div>
                              </div>
                            </div>
                          </td>
                          <td>{p.city}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{ fontWeight: 600 }}>{p.totalRooms}</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-3)', marginLeft: 4 }}>
                              ({p.occupiedRooms} occ)
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span
                              className={`badge ${
                                p.occupancyRate > 100
                                  ? 'badge-red'
                                  : p.occupancyRate > 50
                                  ? 'badge-green'
                                  : 'badge-gray'
                              }`}
                            >
                              {p.occupancyRate}%
                              {p.isOverbooked && ' (Overbooked)'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>
                            {fmt(p.totalRevenue)}
                          </td>
                          <td style={{ textAlign: 'center' }}>{p.totalBookings}</td>
                          <td style={{ textAlign: 'right' }}>
                            {isCurrent ? (
                              <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                <Check size={11} /> Selected
                              </span>
                            ) : (
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => {
                                  switchProperty(p.id)
                                  onClose()
                                }}
                                style={{ fontSize: '11px', padding: '4px 8px' }}
                              >
                                Select
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              onClose()
              if (onAddProperty) onAddProperty()
            }}
            style={{ gap: '6px' }}
          >
            <Plus size={14} /> Add New Property
          </button>
          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
