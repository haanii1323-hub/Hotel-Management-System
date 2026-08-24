'use client'

import { useState, useEffect } from 'react'
import { X, Minus, Plus } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { format, addDays } from 'date-fns'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((r) => r.json())
const SOURCES = ['Walk inn', 'GOMMT', 'B.COM', 'AIRBNB', 'BREWISTAY', 'B2B', 'CLEARTRIP', 'YATRA', 'EXPEDIA', 'AGODA', 'Fab', 'Corporate']
const DEFAULT_CATEGORIES = ['Deluxe', 'Classic', 'Suite']
const DEFAULT_RATES: Record<string, number> = { Deluxe: 800, Classic: 1896, Suite: 3900 }

function parseDateInput(d: string | Date | null | undefined): string {
  if (!d) return ''
  if (typeof d === 'string') {
    const match = d.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) return match[0]
  }
  const dt = new Date(d)
  return format(dt, 'yyyy-MM-dd')
}

interface Props {
  booking: any
  onClose: () => void
  onSuccess: (updatedBooking?: any) => void
}

export default function EditBookingModal({ booking, onClose, onSuccess }: Props) {
  const { showToast } = useToast()
  const { data: categories } = useSWR('/api/categories', fetcher)

  const [form, setForm] = useState({
    guestName: booking.guest?.name || '',
    phone: booking.guest?.phone || '',
    email: booking.guest?.email || '',
    source: booking.source || 'Walk inn',
    checkIn: parseDateInput(booking.checkIn),
    checkOut: parseDateInput(booking.checkOut),
    roomCategory: booking.roomCategory || 'Deluxe',
    nightlyRate: booking.nightlyRate || 800,
    numRooms: booking.numRooms || 1,
    adults: booking.adults || 1,
    kids: booking.kids || 0,
    notes: booking.notes || '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const upd = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }))

  function calcNights() {
    if (!form.checkIn || !form.checkOut) return 1
    const diff = new Date(form.checkOut).getTime() - new Date(form.checkIn).getTime()
    return Math.max(1, Math.ceil(diff / 86400000))
  }

  const nights = calcNights()
  const total = form.nightlyRate * nights * form.numRooms

  function handleCheckInChange(newCheckIn: string) {
    setForm((f) => {
      let nextCheckOut = f.checkOut
      if (!f.checkOut || f.checkOut <= newCheckIn) {
        const parts = newCheckIn.split('-').map(Number)
        const d = new Date(parts[0], parts[1] - 1, parts[2])
        nextCheckOut = format(addDays(d, 1), 'yyyy-MM-dd')
      }
      return { ...f, checkIn: newCheckIn, checkOut: nextCheckOut }
    })
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.guestName.trim()) e.guestName = 'Guest name is required'
    if (!form.phone.trim()) e.phone = 'Phone number is required'
    if (!form.checkIn) e.checkIn = 'Check-in date is required'
    if (!form.checkOut) e.checkOut = 'Check-out date is required'
    if (form.checkOut <= form.checkIn) e.checkOut = 'Check-out must be after check-in'
    if (form.numRooms < 1) e.numRooms = 'At least 1 room required'
    if (form.adults < 1) e.adults = 'At least 1 adult required'
    if (form.nightlyRate <= 0) e.nightlyRate = 'Rate must be positive'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return
    setLoading(true)
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error || 'Failed to update booking', 'error')
      } else {
        showToast(`Booking ${booking.bookingRef} updated successfully!`, 'success')
        onSuccess(data)
      }
    } catch {
      showToast('Network error. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      style={{ zIndex: 1100 }}
    >
      <div className="modal" style={{ maxWidth: '580px', width: '92%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <div className="modal-title">
            Edit Booking · {booking.bookingRef}
            <button onClick={onClose} className="btn-icon" style={{ background: 'none', border: 'none' }}>
              <X size={16} />
            </button>
          </div>
          <div className="modal-subtitle">Update guest details, dates, rates or room allocation.</div>
        </div>

        <div className="modal-body">
          {/* Guest Information */}
          <div className="drawer-section" style={{ border: 'none', padding: 0, marginBottom: '16px' }}>
            <div className="drawer-section-title" style={{ marginBottom: '10px' }}>
              Guest Information
            </div>

            <div className="form-group">
              <label className="form-label">Guest Name *</label>
              <input
                className="form-control"
                value={form.guestName}
                onChange={(e) => upd('guestName', e.target.value)}
                placeholder="Full name"
              />
              {errors.guestName && <div className="form-error">{errors.guestName}</div>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Phone *</label>
                <input
                  className="form-control"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => upd('phone', e.target.value)}
                  placeholder="10-digit mobile"
                />
                {errors.phone && <div className="form-error">{errors.phone}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  className="form-control"
                  type="email"
                  value={form.email}
                  onChange={(e) => upd('email', e.target.value)}
                  placeholder="guest@email.com"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Source</label>
              <select className="form-control" value={form.source} onChange={(e) => upd('source', e.target.value)}>
                {SOURCES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Stay Dates */}
          <div className="drawer-section" style={{ border: 'none', padding: 0, marginBottom: '16px' }}>
            <div className="drawer-section-title" style={{ marginBottom: '10px' }}>
              Stay Dates
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Check-in *</label>
                <input
                  className="form-control"
                  type="date"
                  value={form.checkIn}
                  onChange={(e) => handleCheckInChange(e.target.value)}
                />
                {errors.checkIn && <div className="form-error">{errors.checkIn}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Check-out *</label>
                <input
                  className="form-control"
                  type="date"
                  value={form.checkOut}
                  onChange={(e) => upd('checkOut', e.target.value)}
                  min={form.checkIn}
                />
                {errors.checkOut && <div className="form-error">{errors.checkOut}</div>}
              </div>
            </div>
          </div>

          {/* Room & Pricing */}
          <div className="drawer-section" style={{ border: 'none', padding: 0, marginBottom: '16px' }}>
            <div className="drawer-section-title" style={{ marginBottom: '10px' }}>
              Room &amp; Pricing
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Room Type</label>
                <select
                  className="form-control"
                  value={form.roomCategory}
                  onChange={(e) => {
                    const catName = e.target.value
                    const catObj = categories?.find((c: any) => c.name === catName)
                    const rate = catObj?.nightlyRate || DEFAULT_RATES[catName] || 800
                    upd('roomCategory', catName)
                    upd('nightlyRate', rate)
                  }}
                >
                  {(categories && categories.length > 0
                    ? categories.map((c: any) => c.name)
                    : DEFAULT_CATEGORIES
                  ).map((c: string) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Price / Night (₹)</label>
                <input
                  className="form-control"
                  type="number"
                  value={form.nightlyRate}
                  onChange={(e) => upd('nightlyRate', Number(e.target.value))}
                  min={1}
                />
                {errors.nightlyRate && <div className="form-error">{errors.nightlyRate}</div>}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div className="form-group">
                <label className="form-label">Rooms</label>
                <div className="counter">
                  <button
                    className="counter-btn"
                    onClick={() => upd('numRooms', Math.max(1, form.numRooms - 1))}
                  >
                    <Minus size={14} />
                  </button>
                  <div className="counter-val">{form.numRooms}</div>
                  <button className="counter-btn" onClick={() => upd('numRooms', form.numRooms + 1)}>
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Adults</label>
                <div className="counter">
                  <button
                    className="counter-btn"
                    onClick={() => upd('adults', Math.max(1, form.adults - 1))}
                  >
                    <Minus size={14} />
                  </button>
                  <div className="counter-val">{form.adults}</div>
                  <button className="counter-btn" onClick={() => upd('adults', form.adults + 1)}>
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Kids</label>
                <div className="counter">
                  <button
                    className="counter-btn"
                    onClick={() => upd('kids', Math.max(0, form.kids - 1))}
                  >
                    <Minus size={14} />
                  </button>
                  <div className="counter-val">{form.kids}</div>
                  <button className="counter-btn" onClick={() => upd('kids', form.kids + 1)}>
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea
                className="form-control"
                value={form.notes}
                onChange={(e) => upd('notes', e.target.value)}
                placeholder="Special instructions..."
                rows={2}
              />
            </div>
          </div>

          {/* Recalculated Summary */}
          <div
            style={{
              background: 'var(--card-2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '14px 16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>Recalculated Total</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)', marginTop: '2px' }}>
                  ₹{total.toLocaleString('en-IN')}
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '12px', color: 'var(--text-3)' }}>
                ₹{form.nightlyRate.toLocaleString('en-IN')} × {nights}N × {form.numRooms} room(s)
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="btn btn-red" onClick={handleSubmit} disabled={loading}>
            {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
