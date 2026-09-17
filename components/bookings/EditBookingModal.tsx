'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, Minus, Plus, AlertCircle, BedDouble, Check, Trash2 } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { format } from 'date-fns'
import useSWR from 'swr'
import { broadcastChange } from '@/lib/realtime-sync'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export const BOOKING_SOURCES = [
  'GOMMT',
  'OYO',
  'B.COM',
  'AIRBNB',
  'BREVISTAY',
  'B2B',
  'CLEARTRIP',
  'YATRA',
  'EXPEDIA',
  'AGODA',
  'Fab',
  'Corporate',
  'Walk inn',
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

  const initialRoomIds = useMemo(() => {
    return (booking.bookingRooms || []).map((br: any) => br.roomId).filter(Boolean)
  }, [booking])

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
    adults: booking.adults || 1,
    kids: booking.kids || 0,
    notes: booking.notes || '',
    discount: booking.discountAmount || 0,
  })

  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>(initialRoomIds)
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [conflictError, setConflictError] = useState('')
  const [loading, setLoading] = useState(false)

  // Fetch available rooms for property excluding this booking's own conflicts
  const roomsUrl =
    propertyId && form.checkIn && form.checkOut
      ? `/api/rooms?propertyId=${propertyId}&checkIn=${form.checkIn}&checkOut=${form.checkOut}&excludeBookingId=${booking.id}`
      : propertyId
      ? `/api/rooms?propertyId=${propertyId}`
      : null

  const { data: rawRooms, isLoading: loadingRooms } = useSWR(roomsUrl, fetcher)
  const rooms: any[] = useMemo(() => (Array.isArray(rawRooms) ? rawRooms : []), [rawRooms])

  // Extract unique categories
  const categoryNames = useMemo(() => {
    const cats = new Set<string>()
    rooms.forEach((r) => {
      if (r.category?.name) cats.add(r.category.name)
    })
    return Array.from(cats)
  }, [rooms])

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    if (selectedCategoryFilter === 'All') return rooms
    return rooms.filter((r) => r.category?.name === selectedCategoryFilter)
  }, [rooms, selectedCategoryFilter])

  // Selected room details
  const selectedRooms = useMemo(() => {
    return rooms.filter((r) => selectedRoomIds.includes(r.id))
  }, [rooms, selectedRoomIds])

  const upd = (k: string, v: unknown) => {
    setConflictError('')
    setForm((f) => ({ ...f, [k]: v }))
  }

  function handleCheckInChange(newCheckIn: string) {
    setForm((f) => {
      let nextCheckOut = f.checkOut
      if (!f.checkOut || f.checkOut < newCheckIn) {
        nextCheckOut = newCheckIn
      }
      return { ...f, checkIn: newCheckIn, checkOut: nextCheckOut }
    })
  }

  function toggleRoom(room: any) {
    setConflictError('')
    if (selectedRoomIds.includes(room.id)) {
      if (selectedRoomIds.length <= 1) {
        showToast('At least 1 room must remain assigned.', 'error')
        return
      }
      setSelectedRoomIds((prev) => prev.filter((id) => id !== room.id))
    } else {
      if (!room.isAvailable && !initialRoomIds.includes(room.id)) {
        showToast(`Room ${room.number} is unavailable for selected dates.`, 'error')
        return
      }
      setSelectedRoomIds((prev) => [...prev, room.id])
    }
  }

  function calcNights() {
    if (!form.checkIn || !form.checkOut) return 1
    const diff = new Date(form.checkOut).getTime() - new Date(form.checkIn).getTime()
    return Math.max(1, Math.round(diff / 86400000))
  }

  const isSameDay = form.checkIn === form.checkOut
  const nights = calcNights()
  const numRooms = selectedRoomIds.length > 0 ? selectedRoomIds.length : booking.numRooms || 1
  
  // Extract add-on fees from notes
  const notes = form.notes || booking.notes || ''
  let addOnsTotal = 0
  const earlyMatch = notes.match(/Early Check-in:\s*₹?(\d+(?:\.\d+)?)/i)
  if (earlyMatch) addOnsTotal += parseFloat(earlyMatch[1])
  const lateMatch = notes.match(/Late Checkout:\s*₹?(\d+(?:\.\d+)?)/i)
  if (lateMatch) addOnsTotal += parseFloat(lateMatch[1])
  const mattressMatch = notes.match(/Extra Mattress\s*(?:\((\d+)×\s*₹?(\d+)\))?:\s*₹?(\d+(?:\.\d+)?)/i)
  if (mattressMatch) addOnsTotal += parseFloat(mattressMatch[3])

  const subtotal = form.nightlyRate * nights * numRooms
  const discountAmount = Number(form.discount || 0)
  const total = Math.max(0, subtotal + addOnsTotal - discountAmount)

  function validate() {
    const e: Record<string, string> = {}
    if (!form.guestName.trim()) e.guestName = 'Guest name is required'
    if (!form.phone.trim()) e.phone = 'Phone number is required'
    if (!form.checkIn) e.checkIn = 'Check-in date is required'
    if (!form.checkOut) e.checkOut = 'Check-out date is required'
    if (form.checkOut < form.checkIn) e.checkOut = 'Check-out cannot be earlier than check-in'
    if (selectedRoomIds.length === 0) e.rooms = 'At least 1 room must be assigned'
    if (form.adults < 1) e.adults = 'At least 1 adult required'
    if (form.nightlyRate < 0) e.nightlyRate = 'Rate cannot be negative'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return
    setLoading(true)
    setConflictError('')

    const categorySummary =
      selectedRooms.length > 0
        ? selectedRooms.map((r) => `Room ${r.number} (${r.category?.name || 'Standard'})`).join(', ')
        : form.roomCategory

    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          roomCategory: categorySummary,
          numRooms: selectedRoomIds.length,
          roomIds: selectedRoomIds,
          taxAmount: 0,
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
      <div className="modal" style={{ maxWidth: '640px', width: '92%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <div className="modal-title">
            Edit Booking · {booking.bookingRef}
            <button onClick={onClose} className="btn-icon" style={{ background: 'none', border: 'none' }}>
              <X size={16} />
            </button>
          </div>
          <div className="modal-subtitle">Update guest details, dates, rates or assign specific room numbers.</div>
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
              Stay &amp; Dates
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
                <label className="form-label">
                  Check-out *{' '}
                  {isSameDay && (
                    <span style={{ color: 'var(--amber)', fontSize: '11px' }}>(Same-day Stay)</span>
                  )}
                </label>
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <label className="form-label">Source</label>
                <select
                  className="form-control"
                  value={form.source}
                  onChange={(e) => upd('source', e.target.value)}
                >
                  {BOOKING_SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
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

          {/* Manual Room Number Selection Grid */}
          <div className="drawer-section" style={{ border: 'none', padding: 0, marginBottom: '16px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}
            >
              <div
                className="drawer-section-title"
                style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <BedDouble size={14} color="var(--red)" /> Assigned Room Numbers ({selectedRoomIds.length})
              </div>
            </div>

            {/* Category Filter Tabs */}
            {categoryNames.length > 1 && (
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '6px', marginBottom: '8px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedCategoryFilter('All')}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '16px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border:
                      selectedCategoryFilter === 'All' ? '1px solid var(--red)' : '1px solid var(--border)',
                    background: selectedCategoryFilter === 'All' ? 'var(--red-dim)' : 'var(--card-2)',
                    color: selectedCategoryFilter === 'All' ? 'var(--text)' : 'var(--text-2)',
                  }}
                >
                  All ({rooms.length})
                </button>
                {categoryNames.map((cName) => (
                  <button
                    key={cName}
                    type="button"
                    onClick={() => setSelectedCategoryFilter(cName)}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '16px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      border:
                        selectedCategoryFilter === cName ? '1px solid var(--red)' : '1px solid var(--border)',
                      background: selectedCategoryFilter === cName ? 'var(--red-dim)' : 'var(--card-2)',
                      color: selectedCategoryFilter === cName ? 'var(--text)' : 'var(--text-2)',
                    }}
                  >
                    {cName}
                  </button>
                ))}
              </div>
            )}

            {/* Rooms Grid */}
            {loadingRooms ? (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-3)', fontSize: '12px' }}>
                Loading room availability...
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                  gap: '6px',
                  maxHeight: '180px',
                  overflowY: 'auto',
                  padding: '2px',
                }}
              >
                {filteredRooms.map((room) => {
                  const isSelected = selectedRoomIds.includes(room.id)
                  const isAvail = room.isAvailable || initialRoomIds.includes(room.id)

                  return (
                    <div
                      key={room.id}
                      onClick={() => toggleRoom(room)}
                      role="button"
                      tabIndex={0}
                      title={`Room ${room.number} (${room.category?.name})`}
                      style={{
                        padding: '6px 8px',
                        borderRadius: 'var(--radius-sm)',
                        border: isSelected
                          ? '2px solid var(--red)'
                          : isAvail
                          ? '1px solid var(--border)'
                          : '1px solid var(--border)',
                        background: isSelected
                          ? 'var(--red-dim)'
                          : isAvail
                          ? 'var(--card-2)'
                          : 'var(--bg-2)',
                        cursor: isAvail || isSelected ? 'pointer' : 'not-allowed',
                        opacity: isAvail || isSelected ? 1 : 0.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: isSelected ? 'var(--red)' : 'var(--text)' }}>
                          {room.number}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>
                          {room.category?.name}
                        </div>
                      </div>
                      {isSelected && (
                        <div
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: '50%',
                            background: 'var(--red)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Check size={9} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            {errors.rooms && <div className="form-error" style={{ marginTop: '4px' }}>{errors.rooms}</div>}
          </div>

          {/* Pricing */}
          <div className="drawer-section" style={{ border: 'none', padding: 0 }}>
            <div className="drawer-section-title" style={{ marginBottom: '10px' }}>
              Pricing &amp; Bill Breakdown
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Average Nightly Rate (₹) *</label>
                <input
                  type="number"
                  className="form-control"
                  value={form.nightlyRate}
                  onChange={(e) => upd('nightlyRate', Number(e.target.value))}
                  min={0}
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
                <span>Room Charges ({nights}N × {numRooms}R @ ₹{form.nightlyRate})</span>
                <span>₹{subtotal.toLocaleString('en-IN')}</span>
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
