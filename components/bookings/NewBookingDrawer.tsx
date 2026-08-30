'use client'

import { useState, useEffect } from 'react'
import { X, Minus, Plus, AlertCircle, BedDouble, Check } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { format, addDays } from 'date-fns'
import useSWR from 'swr'
import { useProperty } from '@/context/PropertyContext'
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

interface Props {
  onClose: () => void
  onSuccess: (createdBooking?: any) => void
}

export default function NewBookingDrawer({ onClose, onSuccess }: Props) {
  const { showToast } = useToast()
  const { currentProperty } = useProperty()
  const propertyId = currentProperty?.id || ''
  const currencySymbol = currentProperty?.currencySymbol || '₹'
  const taxRate = currentProperty?.taxRate ?? 12.0

  const { data: categories } = useSWR(
    propertyId ? `/api/categories?propertyId=${propertyId}` : '/api/categories',
    fetcher
  )

  const today = format(new Date(), 'yyyy-MM-dd')
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd')

  const [form, setForm] = useState({
    guestName: '',
    phone: '',
    email: '',
    address: '',
    source: 'Walk inn',
    checkIn: today,
    checkOut: tomorrow,
    roomCategory: '',
    nightlyRate: 2500,
    numRooms: 1,
    adults: 1,
    kids: 0,
    notes: '',
    discount: 0,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [conflictError, setConflictError] = useState('')
  const [loading, setLoading] = useState(false)

  // Sync initial category and rate when categories load
  useEffect(() => {
    if (categories && categories.length > 0) {
      if (!form.roomCategory || !categories.some((c: any) => c.name === form.roomCategory)) {
        const first = categories[0]
        setForm((f) => ({
          ...f,
          roomCategory: first.name,
          nightlyRate: first.nightlyRate,
        }))
      }
    }
  }, [categories])

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
    if (!form.roomCategory) e.roomCategory = 'Please select a room category'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return
    setLoading(true)
    setConflictError('')
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          propertyId,
          taxAmount: calculatedTax,
          discountAmount,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 409) {
          setConflictError(data.error || 'Room conflict detected for selected dates.')
        }
        showToast(data.error || 'Failed to create booking', 'error')
      } else {
        showToast(`Booking ${data.bookingRef || ''} created for ${form.guestName}!`, 'success')
        broadcastChange('BOOKING_CREATED', { bookingId: data.id })
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
      className="drawer-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="drawer">
        <div className="drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="drawer-title">New Reservation</div>
            <button onClick={onClose} className="btn-icon">
              <X size={16} />
            </button>
          </div>
          <div className="drawer-subtitle">
            {currentProperty?.name} ({currentProperty?.code})
          </div>
        </div>

        <div className="drawer-body">
          {conflictError && (
            <div className="alert alert-error" style={{ marginBottom: '14px' }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <div>{conflictError}</div>
            </div>
          )}

          {/* Guest Details */}
          <div className="drawer-section">
            <div className="drawer-section-title">Guest Details</div>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input
                className="form-control"
                placeholder="e.g. John Doe"
                value={form.guestName}
                onChange={(e) => upd('guestName', e.target.value)}
              />
              {errors.guestName && <div className="form-error">{errors.guestName}</div>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <label className="form-label">Phone Number *</label>
                <input
                  className="form-control"
                  placeholder="e.g. 9876543210"
                  value={form.phone}
                  onChange={(e) => upd('phone', e.target.value)}
                />
                {errors.phone && <div className="form-error">{errors.phone}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Email (Optional)</label>
                <input
                  className="form-control"
                  type="email"
                  placeholder="e.g. john@example.com"
                  value={form.email}
                  onChange={(e) => upd('email', e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Address (Optional)</label>
              <input
                className="form-control"
                placeholder="City, State / ID details"
                value={form.address}
                onChange={(e) => upd('address', e.target.value)}
              />
            </div>
          </div>

          {/* Stay & Room Details */}
          <div className="drawer-section">
            <div className="drawer-section-title">Stay &amp; Room Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <label className="form-label">Check-in Date *</label>
                <input
                  type="date"
                  className="form-control"
                  value={form.checkIn}
                  onChange={(e) => handleCheckInChange(e.target.value)}
                />
                {errors.checkIn && <div className="form-error">{errors.checkIn}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Check-out Date *</label>
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
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
                        {c.name} ({currencySymbol}{c.nightlyRate}/night)
                      </option>
                    ))
                  ) : (
                    <option value="Classic">Classic</option>
                  )}
                </select>
                {errors.roomCategory && <div className="form-error">{errors.roomCategory}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Booking Source</label>
                <select
                  className="form-control"
                  value={form.source}
                  onChange={(e) => upd('source', e.target.value)}
                >
                  {SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Steppers for Rooms and Guests */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '6px' }}>
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

          {/* Pricing & Billing Breakdown */}
          <div className="drawer-section">
            <div className="drawer-section-title">Pricing &amp; Bill Breakdown</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <label className="form-label">Nightly Rate ({currencySymbol}) *</label>
                <input
                  type="number"
                  className="form-control"
                  value={form.nightlyRate}
                  onChange={(e) => upd('nightlyRate', Number(e.target.value))}
                  min={1}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Discount ({currencySymbol})</label>
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
                <span>Room Charges ({nights}N × {form.numRooms}R @ {currencySymbol}{form.nightlyRate})</span>
                <span>{currencySymbol}{subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="bill-row">
                <span>Tax ({taxRate}%)</span>
                <span>+{currencySymbol}{calculatedTax.toLocaleString('en-IN')}</span>
              </div>
              {discountAmount > 0 && (
                <div className="bill-row">
                  <span style={{ color: 'var(--green)' }}>Discount</span>
                  <span style={{ color: 'var(--green)' }}>-{currencySymbol}{discountAmount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="bill-divider" />
              <div className="bill-row total">
                <span>Total Amount</span>
                <span>{currencySymbol}{total.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '12px' }}>
              <label className="form-label">Internal Notes (Optional)</label>
              <textarea
                className="form-control"
                rows={2}
                placeholder="Special requests, early check-in notes, etc."
                value={form.notes}
                onChange={(e) => upd('notes', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="drawer-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="btn btn-red" onClick={handleSubmit} disabled={loading}>
            {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : `Confirm Booking (${currencySymbol}${total.toLocaleString('en-IN')})`}
          </button>
        </div>
      </div>
    </div>
  )
}
