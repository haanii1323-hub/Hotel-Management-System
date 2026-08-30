'use client'

import { useState } from 'react'
import useSWR from 'swr'
import AppShell from '@/components/layout/AppShell'
import { format } from 'date-fns'
import { Search, Plus, UserPlus, Phone, Mail, MapPin, Calendar, Clock, X, BedDouble } from 'lucide-react'
import { useProperty } from '@/context/PropertyContext'
import { useToast } from '@/components/ui/Toast'
import { broadcastChange, useRealtimeSync } from '@/lib/realtime-sync'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function GuestsPage() {
  const { showToast } = useToast()
  const { currentProperty } = useProperty()
  const propertyId = currentProperty?.id || ''
  const currencySymbol = currentProperty?.currencySymbol || '₹'

  const formatMoney = (n: number) => `${currencySymbol}${Number(n || 0).toLocaleString('en-IN')}`

  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showAddGuest, setShowAddGuest] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newGuest, setNewGuest] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
  })

  let q = propertyId ? `?propertyId=${propertyId}` : ''
  if (search.trim()) q += `${q ? '&' : '?'}search=${encodeURIComponent(search.trim())}`

  const { data: guests, isLoading, mutate } = useSWR(`/api/guests${q}`, fetcher, {
    refreshInterval: 4000,
    revalidateOnFocus: true,
  })

  useRealtimeSync(() => {
    mutate()
  })

  async function handleCreateGuest(e: React.FormEvent) {
    e.preventDefault()
    if (!newGuest.name.trim() || !newGuest.phone.trim()) {
      showToast('Name and phone number are required', 'error')
      return
    }

    setAdding(true)
    try {
      const res = await fetch('/api/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newGuest,
          propertyId,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        showToast(data.error || 'Failed to create guest', 'error')
      } else {
        showToast(`Guest ${data.name} added to directory!`, 'success')
        broadcastChange('GUEST_CREATED', { guestId: data.id })
        setNewGuest({ name: '', phone: '', email: '', address: '' })
        setShowAddGuest(false)
        mutate()
      }
    } catch {
      showToast('Network error while creating guest', 'error')
    } finally {
      setAdding(false)
    }
  }

  return (
    <AppShell>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="page-title">Guest Directory · {currentProperty?.name}</h1>
          <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px' }}>
            {currentProperty?.code} · {currentProperty?.city} · Real-time guest profiles and stay history
          </div>
        </div>

        <button className="btn btn-red" onClick={() => setShowAddGuest(true)}>
          <UserPlus size={15} /> Add Guest
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '20px', maxWidth: '380px' }}>
        <Search
          size={14}
          style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }}
        />
        <input
          style={{
            width: '100%',
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 12px 8px 34px',
            color: 'var(--text)',
            fontSize: '13px',
            outline: 'none',
          }}
          placeholder="Search by name, phone, email, or city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table Header */}
      <div className="guest-th">
        <span>Guest</span>
        <span>Phone</span>
        <span>Email</span>
        <span>Stays</span>
        <span>Nights</span>
        <span>Total Spent</span>
        <span>Last Stay</span>
      </div>

      {isLoading && !guests ? (
        Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 52, marginBottom: 6, borderRadius: '6px' }} />
        ))
      ) : guests?.length === 0 ? (
        <div className="empty-state">
          No guests found for {currentProperty?.name}.
        </div>
      ) : (
        guests?.map((g: any) => (
          <div key={g.id}>
            <div
              className="guest-row"
              onClick={() => setExpanded(expanded === g.id ? null : g.id)}
              style={{ cursor: 'pointer' }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>{g.name}</div>
                {g.address && (
                  <div style={{ fontSize: '11px', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                    <MapPin size={10} /> {g.address}
                  </div>
                )}
              </div>
              <div style={{ fontSize: '13px' }}>{g.phone}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>{g.email || '—'}</div>
              <div style={{ fontSize: '13px' }}>{g.totalStays}</div>
              <div style={{ fontSize: '13px' }}>{g.totalNights}</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--green)' }}>
                {formatMoney(g.totalSpent)}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>
                {g.lastStay ? format(new Date(g.lastStay), 'dd MMM yyyy') : '—'}
              </div>
            </div>

            {/* Expanded guest history */}
            {expanded === g.id && (
              <div
                style={{
                  background: 'var(--card-2)',
                  border: '1px solid var(--border)',
                  borderTop: 'none',
                  borderRadius: '0 0 var(--radius-sm) var(--radius-sm)',
                  padding: '16px',
                  marginBottom: '8px',
                }}
              >
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--text-2)',
                    marginBottom: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Stay History ({g.bookings?.length || 0} reservation{g.bookings?.length !== 1 ? 's' : ''})
                </div>

                {(!g.bookings || g.bookings.length === 0) ? (
                  <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>No previous stays recorded.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {g.bookings.map((b: any) => {
                      const collected = b.payments?.reduce(
                        (s: number, p: any) => s + (p.status !== 'Pending' ? p.amount : 0),
                        0
                      ) || 0
                      const balance = Math.max(0, (b.totalAmount || 0) - collected)

                      return (
                        <div
                          key={b.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            background: 'var(--card)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '12px',
                            flexWrap: 'wrap',
                            gap: '8px',
                          }}
                        >
                          <div>
                            <span style={{ fontWeight: 700, color: 'var(--text)' }}>{b.bookingRef}</span>
                            <span style={{ color: 'var(--text-3)', marginLeft: '8px' }}>· {b.source} · {b.roomCategory}</span>
                          </div>

                          <div style={{ color: 'var(--text-2)' }}>
                            {format(new Date(b.checkIn), 'dd MMM yyyy')} → {format(new Date(b.checkOut), 'dd MMM yyyy')}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontWeight: 600 }}>{formatMoney(b.totalAmount)}</span>
                            <span className={`badge ${b.status === 'CheckedIn' ? 'badge-green' : b.status === 'Upcoming' ? 'badge-amber' : b.status === 'CheckedOut' ? 'badge-blue' : 'badge-gray'}`}>
                              {b.status}
                            </span>
                            {balance > 0 && (
                              <span style={{ color: 'var(--amber)', fontSize: '11px', fontWeight: 600 }}>
                                Due: {formatMoney(balance)}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        ))
      )}

      {/* Add Guest Modal */}
      {showAddGuest && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddGuest(false)
          }}
          style={{ zIndex: 1100 }}
        >
          <div className="modal" style={{ maxWidth: '480px', width: '92%' }}>
            <div className="modal-header">
              <div className="modal-title">
                Add Guest to Directory
                <button onClick={() => setShowAddGuest(false)} className="btn-icon" style={{ background: 'none', border: 'none' }}>
                  <X size={16} />
                </button>
              </div>
              <div className="modal-subtitle">Create a guest profile for {currentProperty?.name}.</div>
            </div>

            <form onSubmit={handleCreateGuest}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    className="form-control"
                    placeholder="e.g. Ramesh Kumar"
                    value={newGuest.name}
                    onChange={(e) => setNewGuest({ ...newGuest, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number *</label>
                  <input
                    className="form-control"
                    placeholder="e.g. 9876543210"
                    value={newGuest.phone}
                    onChange={(e) => setNewGuest({ ...newGuest, phone: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address (Optional)</label>
                  <input
                    className="form-control"
                    type="email"
                    placeholder="e.g. ramesh@example.com"
                    value={newGuest.email}
                    onChange={(e) => setNewGuest({ ...newGuest, email: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Address / ID Information (Optional)</label>
                  <input
                    className="form-control"
                    placeholder="City, State / Government ID"
                    value={newGuest.address}
                    onChange={(e) => setNewGuest({ ...newGuest, address: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowAddGuest(false)} disabled={adding}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-red" disabled={adding}>
                  {adding ? <span className="spinner" style={{ width: 14, height: 14 }} /> : 'Save Guest'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  )
}
