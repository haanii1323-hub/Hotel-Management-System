'use client'

import { useState, useEffect } from 'react'
import { X, Minus, Plus, AlertCircle, BedDouble, PlusCircle, Trash2, Clock } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { format, addDays } from 'date-fns'
import useSWR from 'swr'
import { useProperty } from '@/context/PropertyContext'
import { broadcastChange } from '@/lib/realtime-sync'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export const BOOKING_SOURCES = [
  'GOMMT',
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

interface RoomSelection {
  id: string
  categoryName: string
  count: number
  rate: number
}

interface Props {
  onClose: () => void
  onSuccess: (createdBooking?: any) => void
}

export default function NewBookingDrawer({ onClose, onSuccess }: Props) {
  const { showToast } = useToast()
  const { currentProperty } = useProperty()
  const propertyId = currentProperty?.id || ''
  const currencySymbol = currentProperty?.currencySymbol || '₹'

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
    adults: 1,
    kids: 0,
    notes: '',
    discount: 0,
    earlyCheckIn: false,
    earlyCheckInAmount: 500,
    lateCheckOut: false,
    lateCheckOutAmount: 500,
    extraMattressCount: 0,
    extraMattressRate: 500,
  })

  // Dynamic Room Selections (e.g. 1 Deluxe, 2 Standard)
  const [roomSelections, setRoomSelections] = useState<RoomSelection[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [conflictError, setConflictError] = useState('')
  const [loading, setLoading] = useState(false)

  // Initialize room selections when categories load
  useEffect(() => {
    if (categories && categories.length > 0 && roomSelections.length === 0) {
      const first = categories[0]
      setRoomSelections([
        {
          id: 'room-1',
          categoryName: first.name,
          count: 1,
          rate: Number(first.nightlyRate) || 2500,
        },
      ])
    }
  }, [categories, roomSelections.length])

  const upd = (k: string, v: unknown) => {
    setConflictError('')
    setForm((f) => ({ ...f, [k]: v }))
  }

  function handleAddRoomSelection() {
    if (!categories || categories.length === 0) return
    const unusedCat = categories.find(
      (c: any) => !roomSelections.some((rs) => rs.categoryName === c.name)
    ) || categories[0]

    setRoomSelections((prev) => [
      ...prev,
      {
        id: `room-${Date.now()}`,
        categoryName: unusedCat.name,
        count: 1,
        rate: Number(unusedCat.nightlyRate) || 2500,
      },
    ])
  }

  function handleRemoveRoomSelection(id: string) {
    if (roomSelections.length <= 1) return
    setRoomSelections((prev) => prev.filter((rs) => rs.id !== id))
  }

  function handleSelectionChange(id: string, field: 'categoryName' | 'count' | 'rate', value: any) {
    setRoomSelections((prev) =>
      prev.map((rs) => {
        if (rs.id !== id) return rs
        if (field === 'categoryName') {
          const match = categories?.find((c: any) => c.name === value)
          return {
            ...rs,
            categoryName: value,
            rate: match ? Number(match.nightlyRate) : rs.rate,
          }
        }
        return { ...rs, [field]: value }
      })
    )
  }

  function calcNights() {
    if (!form.checkIn || !form.checkOut) return 1
    const d1 = new Date(form.checkIn).getTime()
    const d2 = new Date(form.checkOut).getTime()
    const diff = d2 - d1
    // Same day stay = 1 day charge
    return Math.max(1, Math.round(diff / 86400000))
  }

  const isSameDay = form.checkIn === form.checkOut
  const nights = calcNights()

  // Room Charges Calculation
  const totalNumRooms = roomSelections.reduce((sum, item) => sum + (Number(item.count) || 1), 0)
  const roomChargePerNight = roomSelections.reduce(
    (sum, item) => sum + (Number(item.rate) || 0) * (Number(item.count) || 1),
    0
  )
  const totalRoomCharges = roomChargePerNight * nights

  // Add-ons Calculation
  const earlyCheckInFee = form.earlyCheckIn ? Number(form.earlyCheckInAmount || 0) : 0
  const lateCheckOutFee = form.lateCheckOut ? Number(form.lateCheckOutAmount || 0) : 0
  const extraMattressFee = (Number(form.extraMattressCount) || 0) * (Number(form.extraMattressRate) || 0) * nights
  const totalAddons = earlyCheckInFee + lateCheckOutFee + extraMattressFee

  const discountAmount = Number(form.discount || 0)
  // GST removed -> Total = Room Charges + Addons - Discount
  const total = Math.max(0, totalRoomCharges + totalAddons - discountAmount)

  function handleCheckInChange(newCheckIn: string) {
    setForm((f) => {
      let nextCheckOut = f.checkOut
      if (!f.checkOut || f.checkOut < newCheckIn) {
        nextCheckOut = newCheckIn
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
    if (form.checkOut < form.checkIn) e.checkOut = 'Check-out cannot be earlier than check-in'
    if (totalNumRooms < 1) e.rooms = 'At least 1 room required'
    if (form.adults < 1) e.adults = 'At least 1 adult required'
    if (roomSelections.some((rs) => rs.rate < 0)) e.rates = 'Rate cannot be negative'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return
    setLoading(true)
    setConflictError('')

    const categorySummary =
      roomSelections.length === 1
        ? roomSelections[0].categoryName
        : roomSelections.map((rs) => `${rs.count}× ${rs.categoryName}`).join(', ')

    const avgNightlyRate = totalNumRooms > 0 ? Math.round(roomChargePerNight / totalNumRooms) : roomChargePerNight

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestName: form.guestName,
          phone: form.phone,
          email: form.email,
          address: form.address,
          source: form.source,
          checkIn: form.checkIn,
          checkOut: form.checkOut,
          numRooms: totalNumRooms,
          adults: form.adults,
          kids: form.kids,
          roomCategory: categorySummary,
          nightlyRate: avgNightlyRate,
          roomSelections,
          earlyCheckIn: earlyCheckInFee,
          lateCheckOut: lateCheckOutFee,
          extraMattressCount: Number(form.extraMattressCount || 0),
          extraMattressRate: Number(form.extraMattressRate || 0),
          taxAmount: 0, // GST removed
          discountAmount,
          notes: form.notes,
          propertyId,
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
      <div className="drawer" style={{ maxWidth: '640px' }}>
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

          {/* Stay & Date Selection */}
          <div className="drawer-section">
            <div className="drawer-section-title">Stay Duration &amp; Source</div>
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
                <label className="form-label">
                  Check-out Date * {isSameDay && <span style={{ color: 'var(--amber)', fontSize: '11px' }}>(Same-day Stay)</span>}
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <label className="form-label">Booking Source *</label>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div className="form-group">
                  <label className="form-label">Adults</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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
          </div>

          {/* Multi-Room Category Builder */}
          <div className="drawer-section">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div className="drawer-section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <BedDouble size={14} color="var(--red)" /> Room Categories &amp; Allocation ({totalNumRooms} Rooms)
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleAddRoomSelection}
                style={{ fontSize: '11px', color: 'var(--red)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <PlusCircle size={13} /> Add Another Room Type
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {roomSelections.map((sel, idx) => (
                <div
                  key={sel.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1.2fr 1.5fr auto',
                    gap: '10px',
                    alignItems: 'center',
                    background: 'var(--card-2)',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {/* Category Selection */}
                  <div>
                    <label style={{ fontSize: '10px', color: 'var(--text-3)', display: 'block', marginBottom: '2px' }}>
                      Room Type #{idx + 1}
                    </label>
                    <select
                      className="form-control"
                      value={sel.categoryName}
                      onChange={(e) => handleSelectionChange(sel.id, 'categoryName', e.target.value)}
                      style={{ fontSize: '12px', padding: '6px 8px' }}
                    >
                      {categories && categories.length > 0 ? (
                        categories.map((c: any) => (
                          <option key={c.id} value={c.name}>
                            {c.name} ({currencySymbol}{c.nightlyRate}/N)
                          </option>
                        ))
                      ) : (
                        <option value="Classic">Classic</option>
                      )}
                    </select>
                  </div>

                  {/* Quantity Stepper */}
                  <div>
                    <label style={{ fontSize: '10px', color: 'var(--text-3)', display: 'block', marginBottom: '2px' }}>
                      Qty (Rooms)
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '4px 6px', height: '28px' }}
                        onClick={() => handleSelectionChange(sel.id, 'count', Math.max(1, sel.count - 1))}
                      >
                        <Minus size={11} />
                      </button>
                      <span style={{ fontWeight: 700, fontSize: '12px', width: '20px', textAlign: 'center' }}>
                        {sel.count}
                      </span>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '4px 6px', height: '28px' }}
                        onClick={() => handleSelectionChange(sel.id, 'count', sel.count + 1)}
                      >
                        <Plus size={11} />
                      </button>
                    </div>
                  </div>

                  {/* Nightly Rate */}
                  <div>
                    <label style={{ fontSize: '10px', color: 'var(--text-3)', display: 'block', marginBottom: '2px' }}>
                      Rate/Room ({currencySymbol})
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      style={{ fontSize: '12px', padding: '6px 8px' }}
                      value={sel.rate}
                      onChange={(e) => handleSelectionChange(sel.id, 'rate', Number(e.target.value))}
                      min={0}
                    />
                  </div>

                  {/* Remove action */}
                  <div>
                    <label style={{ fontSize: '10px', visibility: 'hidden', display: 'block', marginBottom: '2px' }}>-</label>
                    <button
                      type="button"
                      className="btn-icon"
                      disabled={roomSelections.length <= 1}
                      onClick={() => handleRemoveRoomSelection(sel.id)}
                      style={{
                        color: roomSelections.length > 1 ? 'var(--red)' : 'var(--text-3)',
                        opacity: roomSelections.length > 1 ? 1 : 0.4,
                        padding: '6px',
                      }}
                      title="Remove room category"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {errors.rooms && <div className="form-error" style={{ marginTop: '6px' }}>{errors.rooms}</div>}
          </div>

          {/* Add-ons & Extra Charges */}
          <div className="drawer-section">
            <div className="drawer-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={14} color="var(--red)" /> Additional Charges &amp; Add-ons
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Early Check-in */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: form.earlyCheckIn ? 'rgba(212, 175, 55, 0.08)' : 'var(--card-2)',
                  border: form.earlyCheckIn ? '1px solid var(--red)' : '1px solid var(--border)',
                  borderRadius: '6px',
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={form.earlyCheckIn}
                    onChange={(e) => upd('earlyCheckIn', e.target.checked)}
                    style={{ accentColor: 'var(--red)', width: 15, height: 15 }}
                  />
                  <span>Early Check-in Charge</span>
                </label>
                {form.earlyCheckIn && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{currencySymbol}</span>
                    <input
                      type="number"
                      className="form-control"
                      style={{ width: '90px', padding: '4px 8px', fontSize: '12px' }}
                      value={form.earlyCheckInAmount}
                      onChange={(e) => upd('earlyCheckInAmount', Number(e.target.value))}
                      min={0}
                    />
                  </div>
                )}
              </div>

              {/* Late Checkout */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: form.lateCheckOut ? 'rgba(212, 175, 55, 0.08)' : 'var(--card-2)',
                  border: form.lateCheckOut ? '1px solid var(--red)' : '1px solid var(--border)',
                  borderRadius: '6px',
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={form.lateCheckOut}
                    onChange={(e) => upd('lateCheckOut', e.target.checked)}
                    style={{ accentColor: 'var(--red)', width: 15, height: 15 }}
                  />
                  <span>Late Check-out Charge</span>
                </label>
                {form.lateCheckOut && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{currencySymbol}</span>
                    <input
                      type="number"
                      className="form-control"
                      style={{ width: '90px', padding: '4px 8px', fontSize: '12px' }}
                      value={form.lateCheckOutAmount}
                      onChange={(e) => upd('lateCheckOutAmount', Number(e.target.value))}
                      min={0}
                    />
                  </div>
                )}
              </div>

              {/* Extra Mattress */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: form.extraMattressCount > 0 ? 'rgba(212, 175, 55, 0.08)' : 'var(--card-2)',
                  border: form.extraMattressCount > 0 ? '1px solid var(--red)' : '1px solid var(--border)',
                  borderRadius: '6px',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 600 }}>
                  Extra Mattress / Bed
                  {form.extraMattressCount > 0 && (
                    <span style={{ fontSize: '11px', color: 'var(--text-2)', marginLeft: '6px', fontWeight: 400 }}>
                      ({form.extraMattressCount} × {currencySymbol}{form.extraMattressRate} × {nights}N)
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ padding: '4px 6px', height: '26px' }}
                      onClick={() => upd('extraMattressCount', Math.max(0, form.extraMattressCount - 1))}
                    >
                      <Minus size={11} />
                    </button>
                    <span style={{ fontWeight: 700, fontSize: '12px', width: '16px', textAlign: 'center' }}>
                      {form.extraMattressCount}
                    </span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ padding: '4px 6px', height: '26px' }}
                      onClick={() => upd('extraMattressCount', form.extraMattressCount + 1)}
                    >
                      <Plus size={11} />
                    </button>
                  </div>
                  {form.extraMattressCount > 0 && (
                    <input
                      type="number"
                      title="Rate per mattress per night"
                      placeholder="Rate"
                      className="form-control"
                      style={{ width: '75px', padding: '4px 6px', fontSize: '11px' }}
                      value={form.extraMattressRate}
                      onChange={(e) => upd('extraMattressRate', Number(e.target.value))}
                      min={0}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Pricing & Billing Breakdown */}
          <div className="drawer-section">
            <div className="drawer-section-title">Pricing &amp; Bill Breakdown</div>
            <div className="form-group" style={{ marginBottom: '10px' }}>
              <label className="form-label">Discount ({currencySymbol})</label>
              <input
                type="number"
                className="form-control"
                value={form.discount}
                onChange={(e) => upd('discount', Number(e.target.value))}
                min={0}
                placeholder="0"
              />
            </div>

            <div className="bill-summary" style={{ marginTop: '10px' }}>
              {/* Itemized Room Categories */}
              {roomSelections.map((sel) => (
                <div key={sel.id} className="bill-row">
                  <span>
                    {sel.count}× {sel.categoryName} ({nights} {nights > 1 ? 'Nights' : isSameDay ? 'Day-use' : 'Night'} @ {currencySymbol}{sel.rate})
                  </span>
                  <span>{currencySymbol}{(sel.count * sel.rate * nights).toLocaleString('en-IN')}</span>
                </div>
              ))}

              {/* Add-ons */}
              {earlyCheckInFee > 0 && (
                <div className="bill-row">
                  <span>Early Check-in Fee</span>
                  <span>+{currencySymbol}{earlyCheckInFee.toLocaleString('en-IN')}</span>
                </div>
              )}
              {lateCheckOutFee > 0 && (
                <div className="bill-row">
                  <span>Late Check-out Fee</span>
                  <span>+{currencySymbol}{lateCheckOutFee.toLocaleString('en-IN')}</span>
                </div>
              )}
              {extraMattressFee > 0 && (
                <div className="bill-row">
                  <span>Extra Mattress ({form.extraMattressCount}× @ {currencySymbol}{form.extraMattressRate} × {nights}N)</span>
                  <span>+{currencySymbol}{extraMattressFee.toLocaleString('en-IN')}</span>
                </div>
              )}

              {discountAmount > 0 && (
                <div className="bill-row">
                  <span style={{ color: 'var(--green)' }}>Discount</span>
                  <span style={{ color: 'var(--green)' }}>-{currencySymbol}{discountAmount.toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="bill-divider" />
              <div className="bill-row total">
                <span>Total Bill Amount</span>
                <span>{currencySymbol}{total.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '12px' }}>
              <label className="form-label">Internal Notes (Optional)</label>
              <textarea
                className="form-control"
                rows={2}
                placeholder="Special requests, guest preferences, etc."
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
            {loading ? (
              <span className="spinner" style={{ width: 14, height: 14 }} />
            ) : (
              `Confirm Booking (${currencySymbol}${total.toLocaleString('en-IN')})`
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
