'use client'

import { useState, useEffect } from 'react'
import { X, Minus, Plus, AlertCircle } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { format, addDays } from 'date-fns'
import useSWR from 'swr'
import { broadcastChange } from '@/lib/realtime-sync'

const fetcher = (url: string) => fetch(url).then((r) => r.json())
const SOURCES = [
  'Walk inn',
  'Direct Web',
  'Booking.com',
  'Agoda',
  'Expedia',
  'MakeMyTrip',
  'Airbnb',
  'Corporate',
  'Phone',
  'Others',
]

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
  const propertyId = booking.propertyId || ''
  const { data: categories } = useSWR(
    propertyId ? `/api/categories?propertyId=${propertyId}` : '/api/categories',
    fetcher
  )

  const [form, setForm] = useState({
    guestName: booking.guest?.name || '',
    phone: booking.guest?.phone || '',
    email: booking.guest?.email || '',
    address: booking.guest?.address || '',
    source: booking.source || 'Walk inn',
    checkIn: parseDateInput(booking.checkIn),
    checkOut: parseDateInput(booking.checkOut),
    roomCategory: booking.roomCategory || '',
    nightlyRate: booking.nightlyRate || 2500,
    numRooms: booking.numRooms || 1,
    adults: booking.adults || 1,
    kids: booking.kids || 0,
    notes: booking.notes || '',
    discount: booking.discountAmount || 0,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [conflictError, setConflictError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (categories && categories.length > 0 && !form.roomCategory) {
      const match = categories.find((c: any) => c.name === booking.roomCategory) || categories[0]
      setForm((f) => ({
        ...f,
        roomCategory: match.name,
      }))
    }
  }, [categories, booking])

  const upd = (k: string, v: unknown) => {
    setConflictError('')
    setForm((f) => ({ ...f, [k]: v }))
  }

  function handleCategoryChange(catName: string) {
    const match = categories?.find((c: any) => c.name === catName)
    setForm((f) => ({
      ...f,
      roomCategory: catName,
      nightlyRate: match ? match.nightlyRate : f.nightlyRate,
    }))
  }

  function calcNights() {
    if (!form.checkIn || !form.checkOut) return 1
    const diff = new Date(form.checkOut).getTime() - new Date(form.checkIn).getTime()
    return Math.max(1, Math.ceil(diff / 86400000))
  }

  const nights = calcNights()
  const subtotal = form.nightlyRate * nights * form.numRooms
  const taxRate = 12.0
  const calculatedTax = Math.round((subtotal * taxRate) / 100)
  const discountAmount = Number(form.discount || 0)
  const total = Math.max(0, subtotal + calculatedTax - discountAmount)

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
    setConflictError('')
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          taxAmount: calculatedTax,
          discountAmount,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 409) {
          setConflictError(data.error || 'Room conflict detected for selected dates.')
        }
        showToast(data.error || 'Failed to update booking', 'error')
      } else {
        showToast(`Booking ${booking.bookingRef} updated successfully!`, 'success')
        broadcastChange('BOOKING_UPDATED', { bookingId: booking.id })
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
          {conflictError && (
            <div className="alert alert-error" style={{ marginBottom: '14px' }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <div>{conflictError}</div>
            </div>
          )}

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
                  value={form.phone}
                  onChange={(e) => upd('phone', e.target.value)}
                  placeholder="Phone"
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
                  placeholder="Email"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Address</label>
              <input
                className="form-control"
                value={form.address}
                onChange={(e) => upd('address', e.target.value)}
                placeholder="Address"
              />
            </div>
          </div>

          {/* Stay & Room Details */}
          <div className="drawer-section" style={{ border: 'none', padding: 0, marginBottom: '16px' }}>
            <div className="drawer-section-title" style={{ marginBottom: '10px' }}>
              Stay &amp; Room Details
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Check-in *</label>
                <input
                  type="date"
                  className="form-control"
                  value={form.checkIn}
                  onChange={(e) => handleCheckInChange(e.target.value)}
                />
                {errors.checkIn && <div className="form-error">{errors.checkIn}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Check-out *</label>
                <input
                  type="date"
                  className="form-control"
                  value={form.checkOut}
                  min={form.checkIn}
                  onChange={(e) => upd('checkOut', e.target.value)}
                />
                {errors.checkOut && <div className="form-error">{errors.checkOut}</div>}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Room Category *</label>
                <select
                  className="form-control"
                  value={form.roomCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                >
                  {categories && categories.length > 0 ? (
                    categories.map((c: any) => (
                      <option key={c.id} value={c.name}>
                        {c.name} (₹{c.nightlyRate}/night)
                      </option>
                    ))
                  ) : (
                    <option value={form.roomCategory}>{form.roomCategory || 'Classic'}</option>
                  )}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Source</label>
                <select
                  className="form-control"
                  value={form.source}
                  onChange={(e) => upd('source', e.target.value)}
                >
                  {SOURCES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <label className="form-label">Rooms</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '6px 8px' }}
                    onClick={() => upd('numRooms', Math.max(1, form.numRooms - 1))}
                  >
                    <Minus size={12} />
                  </button>
                  <span style={{ fontWeight: 600, fontSize: '13px', width: '20px', textAlign: 'center' }}>
                    {form.numRooms}
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '6px 8px' }}
                    onClick={() => upd('numRooms', form.numRooms + 1)}
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Adults</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '6px 8px' }}
                    onClick={() => upd('adults', Math.max(1, form.adults - 1))}
                  >
                    <Minus size={12} />
                  </button>
                  <span style={{ fontWeight: 600, fontSize: '13px', width: '20px', textAlign: 'center' }}>
                    {form.adults}
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '6px 8px' }}
                    onClick={() => upd('adults', form.adults + 1)}
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Kids</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '6px 8px' }}
                    onClick={() => upd('kids', Math.max(0, form.kids - 1))}
                  >
                    <Minus size={12} />
                  </button>
                  <span style={{ fontWeight: 600, fontSize: '13px', width: '20px', textAlign: 'center' }}>
                    {form.kids}
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '6px 8px' }}
                    onClick={() => upd('kids', form.kids + 1)}
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="drawer-section" style={{ border: 'none', padding: 0 }}>
            <div className="drawer-section-title" style={{ marginBottom: '10px' }}>
              Pricing &amp; Bill Breakdown
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Nightly Rate (₹) *</label>
                <input
                  type="number"
                  className="form-control"
                  value={form.nightlyRate}
                  onChange={(e) => upd('nightlyRate', Number(e.target.value))}
                  min={1}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Discount (₹)</label>
                <input
                  type="number"
                  className="form-control"
                  value={form.discount}
                  onChange={(e) => upd('discount', Number(e.target.value))}
                  min={0}
                />
              </div>
            </div>

            <div className="bill-summary" style={{ marginTop: '10px' }}>
              <div className="bill-row">
                <span>Room Charges ({nights}N × {form.numRooms}R @ ₹{form.nightlyRate})</span>
                <span>₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="bill-row">
                <span>Tax ({taxRate}%)</span>
                <span>+₹{calculatedTax.toLocaleString('en-IN')}</span>
              </div>
              {discountAmount > 0 && (
                <div className="bill-row">
                  <span style={{ color: 'var(--green)' }}>Discount</span>
                  <span style={{ color: 'var(--green)' }}>-₹{discountAmount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="bill-divider" />
              <div className="bill-row total">
                <span>Total Amount</span>
                <span>₹{total.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '12px' }}>
              <label className="form-label">Notes</label>
              <textarea
                className="form-control"
                rows={2}
                value={form.notes}
                onChange={(e) => upd('notes', e.target.value)}
              />
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
