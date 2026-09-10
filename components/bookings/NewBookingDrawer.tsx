'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import {
  X,
  Minus,
  Plus,
  AlertCircle,
  BedDouble,
  Clock,
  CheckCircle2,
  Filter,
  Check,
  Building2,
  Trash2,
  UserCheck,
  Sparkles,
  History,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react'
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

function parseBookingDate(d: string | Date | null | undefined): Date | null {
  if (!d) return null
  if (typeof d === 'string') {
    const match = d.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) {
      const year = parseInt(match[1], 10)
      const month = parseInt(match[2], 10) - 1
      const day = parseInt(match[3], 10)
      return new Date(year, month, day, 12, 0, 0)
    }
  }
  const dt = new Date(d)
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 12, 0, 0)
}

function fmtDate(d: string | Date | null | undefined) {
  const parsed = parseBookingDate(d)
  if (!parsed) return '—'
  return format(parsed, 'dd MMM yyyy')
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

  // Guest Search & Suggestions
  const [guestSearchQuery, setGuestSearchQuery] = useState('')
  const [guestSuggestions, setGuestSuggestions] = useState<any[]>([])
  const [showGuestDropdown, setShowGuestDropdown] = useState(false)
  const [selectedReturningGuest, setSelectedReturningGuest] = useState<any | null>(null)
  const [searchingGuests, setSearchingGuests] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Selected Room IDs (explicit manual selection by staff)
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([])
  const [customRoomRates, setCustomRoomRates] = useState<Record<string, number>>({})
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [conflictError, setConflictError] = useState('')
  const [loading, setLoading] = useState(false)

  // Fetch rooms with live date availability for this property
  const roomsUrl =
    propertyId && form.checkIn && form.checkOut
      ? `/api/rooms?propertyId=${propertyId}&checkIn=${form.checkIn}&checkOut=${form.checkOut}`
      : propertyId
      ? `/api/rooms?propertyId=${propertyId}`
      : null

  const { data: rawRooms, isLoading: loadingRooms } = useSWR(roomsUrl, fetcher)
  const rooms: any[] = useMemo(() => (Array.isArray(rawRooms) ? rawRooms : []), [rawRooms])

  // Extract unique categories from rooms list
  const categoryNames = useMemo(() => {
    const cats = new Set<string>()
    rooms.forEach((r) => {
      if (r.category?.name) cats.add(r.category.name)
    })
    return Array.from(cats)
  }, [rooms])

  // Filtered rooms based on active category tab
  const filteredRooms = useMemo(() => {
    if (selectedCategoryFilter === 'All') return rooms
    return rooms.filter((r) => r.category?.name === selectedCategoryFilter)
  }, [rooms, selectedCategoryFilter])

  // Selected room details list
  const selectedRooms = useMemo(() => {
    return rooms.filter((r) => selectedRoomIds.includes(r.id))
  }, [rooms, selectedRoomIds])

  // Set default room selection once available rooms load
  useEffect(() => {
    if (rooms.length > 0 && selectedRoomIds.length === 0) {
      const firstAvailable = rooms.find((r) => r.isAvailable)
      if (firstAvailable) {
        setSelectedRoomIds([firstAvailable.id])
        setCustomRoomRates((prev) => ({
          ...prev,
          [firstAvailable.id]: Number(firstAvailable.category?.nightlyRate) || 2500,
        }))
      }
    }
  }, [rooms, selectedRoomIds.length])

  // Debounced lookup for returning guests by name or phone
  useEffect(() => {
    const query = guestSearchQuery.trim()
    if (!query || query.length < 2) {
      setGuestSuggestions([])
      setShowGuestDropdown(false)
      return
    }

    const timer = setTimeout(async () => {
      try {
        setSearchingGuests(true)
        const res = await fetch(
          `/api/guests?propertyId=${propertyId}&search=${encodeURIComponent(query)}`
        )
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data) && data.length > 0) {
            setGuestSuggestions(data.slice(0, 5))
            setShowGuestDropdown(true)
          } else {
            setGuestSuggestions([])
            setShowGuestDropdown(false)
          }
        }
      } catch {
        // ignore
      } finally {
        setSearchingGuests(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [guestSearchQuery, propertyId])

  const upd = (k: string, v: unknown) => {
    setConflictError('')
    setForm((f) => ({ ...f, [k]: v }))
  }

  function handleNameInput(val: string) {
    upd('guestName', val)
    if (!selectedReturningGuest || selectedReturningGuest.name !== val) {
      setSelectedReturningGuest(null)
    }
    setGuestSearchQuery(val)
  }

  function handlePhoneInput(val: string) {
    upd('phone', val)
    if (!selectedReturningGuest || selectedReturningGuest.phone !== val) {
      setSelectedReturningGuest(null)
    }
    setGuestSearchQuery(val)
  }

  function selectGuestProfile(g: any) {
    setForm((f) => ({
      ...f,
      guestName: g.name || f.guestName,
      phone: g.phone || f.phone,
      email: g.email || f.email || '',
      address: g.address || f.address || '',
    }))
    setSelectedReturningGuest(g)
    setShowGuestDropdown(false)
    setGuestSuggestions([])
    setGuestSearchQuery('')
    showToast(`Loaded details for returning guest ${g.name}!`, 'success')
  }

  function clearReturningGuest() {
    setSelectedReturningGuest(null)
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
      setSelectedRoomIds((prev) => prev.filter((id) => id !== room.id))
    } else {
      if (!room.isAvailable) {
        showToast(
          `Room ${room.number} is unavailable for selected dates (${room.conflictReason || 'Booked'}).`,
          'error'
        )
        return
      }
      setSelectedRoomIds((prev) => [...prev, room.id])
      if (customRoomRates[room.id] === undefined) {
        setCustomRoomRates((prev) => ({
          ...prev,
          [room.id]: Number(room.category?.nightlyRate) || 2500,
        }))
      }
    }
  }

  function handleRoomRateChange(roomId: string, rate: number) {
    setCustomRoomRates((prev) => ({
      ...prev,
      [roomId]: Math.max(0, rate),
    }))
  }

  function calcNights() {
    if (!form.checkIn || !form.checkOut) return 1
    const d1 = new Date(form.checkIn).getTime()
    const d2 = new Date(form.checkOut).getTime()
    const diff = d2 - d1
    return Math.max(1, Math.round(diff / 86400000))
  }

  const isSameDay = form.checkIn === form.checkOut
  const nights = calcNights()

  // Room Charges Calculation
  const totalNumRooms = selectedRoomIds.length
  const totalRoomChargePerNight = selectedRooms.reduce((sum, r) => {
    const rate = customRoomRates[r.id] ?? Number(r.category?.nightlyRate) ?? 2500
    return sum + rate
  }, 0)
  const totalRoomCharges = totalRoomChargePerNight * nights

  // Add-ons Calculation
  const earlyCheckInFee = form.earlyCheckIn ? Number(form.earlyCheckInAmount || 0) : 0
  const lateCheckOutFee = form.lateCheckOut ? Number(form.lateCheckOutAmount || 0) : 0
  const extraMattressFee = (Number(form.extraMattressCount) || 0) * (Number(form.extraMattressRate) || 0) * nights
  const totalAddons = earlyCheckInFee + lateCheckOutFee + extraMattressFee

  const discountAmount = Number(form.discount || 0)
  const total = Math.max(0, totalRoomCharges + totalAddons - discountAmount)

  function validate() {
    const e: Record<string, string> = {}
    if (!form.guestName.trim()) e.guestName = 'Guest name is required'
    if (!form.phone.trim()) e.phone = 'Phone number is required'
    if (!form.checkIn) e.checkIn = 'Check-in date is required'
    if (!form.checkOut) e.checkOut = 'Check-out date is required'
    if (form.checkOut < form.checkIn) e.checkOut = 'Check-out cannot be earlier than check-in'
    if (selectedRoomIds.length === 0) e.rooms = 'Please select at least 1 room number'
    if (form.adults < 1) e.adults = 'At least 1 adult required'
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
        : 'Standard'

    const avgNightlyRate =
      totalNumRooms > 0 ? Math.round(totalRoomChargePerNight / totalNumRooms) : totalRoomChargePerNight

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
          roomIds: selectedRoomIds,
          adults: form.adults,
          kids: form.kids,
          roomCategory: categorySummary,
          nightlyRate: avgNightlyRate,
          earlyCheckIn: earlyCheckInFee,
          lateCheckOut: lateCheckOutFee,
          extraMattressCount: Number(form.extraMattressCount || 0),
          extraMattressRate: Number(form.extraMattressRate || 0),
          taxAmount: 0,
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
        showToast(`Booking ${data.bookingRef || ''} created with assigned rooms!`, 'success')
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
        if (e.target === e.currentTarget) {
          setShowGuestDropdown(false)
          onClose()
        }
      }}
    >
      <div className="drawer" style={{ maxWidth: '680px' }}>
        <div className="drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="drawer-title">New Reservation</div>
            <button onClick={onClose} className="btn-icon">
              <X size={16} />
            </button>
          </div>
          <div className="drawer-subtitle">
            {currentProperty?.name} ({currentProperty?.code}) · Select exact room numbers &amp; guest details
          </div>
        </div>

        <div className="drawer-body">
          {conflictError && (
            <div className="alert alert-error" style={{ marginBottom: '14px' }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <div>{conflictError}</div>
            </div>
          )}

          {/* Guest Details with Returning Guest Autofill */}
          <div className="drawer-section" style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div className="drawer-section-title" style={{ margin: 0 }}>Guest Details</div>
              {selectedReturningGuest ? (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(212, 175, 55, 0.15)',
                    border: '1px solid rgba(212, 175, 55, 0.4)',
                    color: 'var(--red)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 600,
                  }}
                >
                  <Sparkles size={11} /> Returning Guest ({selectedReturningGuest.totalStays} Past Stays)
                  <button
                    type="button"
                    onClick={clearReturningGuest}
                    style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 0, marginLeft: 2 }}
                    title="Clear guest details"
                  >
                    <X size={11} />
                  </button>
                </div>
              ) : (
                <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                  Type name or mobile to auto-suggest previous guests
                </span>
              )}
            </div>

            {/* Returning guest alert banner if recognized */}
            {selectedReturningGuest && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: 'rgba(212, 175, 55, 0.08)',
                  border: '1px solid rgba(212, 175, 55, 0.3)',
                  borderRadius: '6px',
                  marginBottom: '12px',
                  fontSize: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserCheck size={16} color="var(--red)" />
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                      {selectedReturningGuest.name}
                    </span>
                    <span style={{ color: 'var(--text-2)', marginLeft: '6px' }}>
                      · {selectedReturningGuest.totalStays} prior visit{selectedReturningGuest.totalStays !== 1 ? 's' : ''} (Last visit: {fmtDate(selectedReturningGuest.lastStay)})
                    </span>
                  </div>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--green)', fontWeight: 600 }}>Auto-filled</span>
              </div>
            )}

            <div style={{ position: 'relative' }}>
              <div className="form-group" style={{ position: 'relative' }}>
                <label className="form-label">Full Name *</label>
                <input
                  className="form-control"
                  placeholder="e.g. John Doe (type to search existing guest)"
                  value={form.guestName}
                  onChange={(e) => handleNameInput(e.target.value)}
                  onFocus={() => {
                    if (guestSuggestions.length > 0) setShowGuestDropdown(true)
                  }}
                  autoComplete="off"
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
                    onChange={(e) => handlePhoneInput(e.target.value)}
                    onFocus={() => {
                      if (guestSuggestions.length > 0) setShowGuestDropdown(true)
                    }}
                    autoComplete="off"
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

              {/* Guest Autocomplete Suggestions Dropdown */}
              {showGuestDropdown && guestSuggestions.length > 0 && (
                <div
                  ref={dropdownRef}
                  style={{
                    position: 'absolute',
                    top: '68px',
                    left: 0,
                    right: 0,
                    zIndex: 50,
                    background: 'var(--card)',
                    border: '1px solid var(--border-strong, #333)',
                    borderRadius: '8px',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
                    maxHeight: '260px',
                    overflowY: 'auto',
                    padding: '6px',
                  }}
                >
                  <div
                    style={{
                      padding: '4px 8px',
                      fontSize: '10px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: 'var(--text-3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid var(--border)',
                      marginBottom: '4px',
                    }}
                  >
                    <span>Previous Guest Profiles Found ({guestSuggestions.length})</span>
                    <span>Click to auto-fill details</span>
                  </div>

                  {guestSuggestions.map((g) => (
                    <div
                      key={g.id}
                      onClick={() => selectGuestProfile(g)}
                      role="button"
                      tabIndex={0}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--card-2)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text)' }}>
                            {g.name}
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              background: 'rgba(212, 175, 55, 0.15)',
                              color: 'var(--red)',
                              fontWeight: 600,
                            }}
                          >
                            ⭐ {g.totalStays} Stay{g.totalStays !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-2)' }}>
                          📞 {g.phone}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: 'var(--text-3)' }}>
                        {g.email && <span>✉️ {g.email}</span>}
                        {g.address && <span>📍 {g.address}</span>}
                        {g.lastStay && <span>Last visit: {fmtDate(g.lastStay)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                  Check-out Date *{' '}
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
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: '13px',
                        width: '20px',
                        textAlign: 'center',
                      }}
                    >
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
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: '13px',
                        width: '20px',
                        textAlign: 'center',
                      }}
                    >
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

          {/* Manual Room Number Selection (Chosen by Staff) */}
          <div className="drawer-section">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px',
              }}
            >
              <div
                className="drawer-section-title"
                style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <BedDouble size={15} color="var(--red)" /> Select Room Number(s) ({selectedRoomIds.length} Selected)
              </div>
              {selectedRoomIds.length > 0 && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setSelectedRoomIds([])}
                  style={{ fontSize: '11px', color: 'var(--text-3)' }}
                >
                  Clear Selection
                </button>
              )}
            </div>

            {/* Category Filter Tabs */}
            {categoryNames.length > 1 && (
              <div
                style={{
                  display: 'flex',
                  gap: '6px',
                  overflowX: 'auto',
                  paddingBottom: '8px',
                  marginBottom: '10px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedCategoryFilter('All')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border:
                      selectedCategoryFilter === 'All'
                        ? '1px solid var(--red)'
                        : '1px solid var(--border)',
                    background:
                      selectedCategoryFilter === 'All' ? 'var(--red-dim)' : 'var(--card-2)',
                    color: selectedCategoryFilter === 'All' ? 'var(--text)' : 'var(--text-2)',
                  }}
                >
                  All Types ({rooms.length})
                </button>
                {categoryNames.map((catName) => {
                  const count = rooms.filter((r) => r.category?.name === catName).length
                  const isCatSelected = selectedCategoryFilter === catName
                  return (
                    <button
                      key={catName}
                      type="button"
                      onClick={() => setSelectedCategoryFilter(catName)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        border: isCatSelected ? '1px solid var(--red)' : '1px solid var(--border)',
                        background: isCatSelected ? 'var(--red-dim)' : 'var(--card-2)',
                        color: isCatSelected ? 'var(--text)' : 'var(--text-2)',
                      }}
                    >
                      {catName} ({count})
                    </button>
                  )
                })}
              </div>
            )}

            {/* Room Selection Grid */}
            {loadingRooms ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-3)', fontSize: '12px' }}>
                Checking room availability for selected dates...
              </div>
            ) : filteredRooms.length === 0 ? (
              <div
                style={{
                  padding: '16px',
                  textAlign: 'center',
                  background: 'var(--card-2)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-3)',
                  fontSize: '12px',
                }}
              >
                No rooms configured for this property yet.
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                  gap: '8px',
                  maxHeight: '260px',
                  overflowY: 'auto',
                  padding: '2px',
                }}
              >
                {filteredRooms.map((room) => {
                  const isSelected = selectedRoomIds.includes(room.id)
                  const isAvail = room.isAvailable

                  return (
                    <div
                      key={room.id}
                      onClick={() => toggleRoom(room)}
                      role="button"
                      tabIndex={0}
                      title={
                        isAvail
                          ? `Click to ${isSelected ? 'remove' : 'select'} Room ${room.number} (${room.category?.name})`
                          : `Room ${room.number} is ${room.conflictReason || 'Unavailable'}`
                      }
                      style={{
                        padding: '10px 10px',
                        borderRadius: 'var(--radius-sm)',
                        border: isSelected
                          ? '2px solid var(--red)'
                          : isAvail
                          ? '1px solid var(--border)'
                          : '1px solid rgba(255, 255, 255, 0.05)',
                        background: isSelected
                          ? 'var(--red-dim)'
                          : isAvail
                          ? 'var(--card-2)'
                          : 'rgba(255, 255, 255, 0.02)',
                        cursor: isAvail || isSelected ? 'pointer' : 'not-allowed',
                        opacity: isAvail || isSelected ? 1 : 0.5,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '4px',
                        position: 'relative',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontWeight: 700, fontSize: '14px', color: isSelected ? 'var(--red)' : 'var(--text)' }}>
                          {room.number}
                        </div>
                        {isSelected ? (
                          <div
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: '50%',
                              background: 'var(--red)',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Check size={10} strokeWidth={3} />
                          </div>
                        ) : (
                          <span
                            style={{
                              fontSize: '9px',
                              padding: '2px 5px',
                              borderRadius: '4px',
                              fontWeight: 600,
                              background: isAvail ? 'rgba(74, 222, 128, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                              color: isAvail ? 'var(--green)' : 'var(--red)',
                            }}
                          >
                            {isAvail ? 'Free' : 'Booked'}
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '11px', color: 'var(--text-2)', lineHeight: 1.2 }}>
                        {room.category?.name || 'Classic'}
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '10px',
                          color: 'var(--text-3)',
                          marginTop: '2px',
                        }}
                      >
                        <span>Fl {room.floor || 1}</span>
                        <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                          {currencySymbol}{room.category?.nightlyRate || 2500}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {errors.rooms && <div className="form-error" style={{ marginTop: '6px' }}>{errors.rooms}</div>}

            {/* Selected Room Configuration & Custom Rates */}
            {selectedRooms.length > 0 && (
              <div
                style={{
                  marginTop: '12px',
                  background: 'var(--card-2)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  padding: '10px 12px',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: 'var(--text-3)',
                    marginBottom: '8px',
                  }}
                >
                  Selected Rooms &amp; Custom Nightly Rates ({nights} {nights > 1 ? 'Nights' : 'Night'})
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedRooms.map((r) => {
                    const currentRate = customRoomRates[r.id] ?? Number(r.category?.nightlyRate) ?? 2500
                    return (
                      <div
                        key={r.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 8px',
                          background: 'var(--card)',
                          borderRadius: '4px',
                          border: '1px solid var(--border)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: '13px',
                              background: 'var(--red-dim)',
                              color: 'var(--red)',
                              padding: '2px 8px',
                              borderRadius: '4px',
                            }}
                          >
                            Room {r.number}
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>
                            {r.category?.name} · Floor {r.floor || 1}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{currencySymbol}</span>
                            <input
                              type="number"
                              title="Rate per night for this room"
                              className="form-control"
                              style={{ width: '85px', padding: '4px 6px', fontSize: '12px' }}
                              value={currentRate}
                              onChange={(e) => handleRoomRateChange(r.id, Number(e.target.value))}
                              min={0}
                            />
                            <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>/N</span>
                          </div>
                          <button
                            type="button"
                            className="btn-icon"
                            onClick={() => toggleRoom(r)}
                            title="Remove this room"
                            style={{ padding: '4px', color: 'var(--text-3)' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
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
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
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
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
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
                    <span
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-2)',
                        marginLeft: '6px',
                        fontWeight: 400,
                      }}
                    >
                      ({form.extraMattressCount} × {currencySymbol}
                      {form.extraMattressRate} × {nights}N)
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
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: '12px',
                        width: '16px',
                        textAlign: 'center',
                      }}
                    >
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
              {/* Itemized Selected Rooms */}
              {selectedRooms.map((r) => {
                const rRate = customRoomRates[r.id] ?? Number(r.category?.nightlyRate) ?? 2500
                return (
                  <div key={r.id} className="bill-row">
                    <span>
                      Room {r.number} ({r.category?.name}) × {nights}{' '}
                      {nights > 1 ? 'Nights' : isSameDay ? 'Day-use' : 'Night'} @ {currencySymbol}
                      {rRate.toLocaleString('en-IN')}
                    </span>
                    <span>{currencySymbol}{(rRate * nights).toLocaleString('en-IN')}</span>
                  </div>
                )
              })}

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
                  <span>
                    Extra Mattress ({form.extraMattressCount}× @ {currencySymbol}
                    {form.extraMattressRate} × {nights}N)
                  </span>
                  <span>+{currencySymbol}{extraMattressFee.toLocaleString('en-IN')}</span>
                </div>
              )}

              {discountAmount > 0 && (
                <div className="bill-row">
                  <span style={{ color: 'var(--green)' }}>Discount</span>
                  <span style={{ color: 'var(--green)' }}>
                    -{currencySymbol}{discountAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              <div className="bill-divider" />
              <div className="bill-row total">
                <span>Total Bill Amount ({selectedRoomIds.length} Room{selectedRoomIds.length !== 1 ? 's' : ''})</span>
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
              `Confirm Reservation · ${currencySymbol}${total.toLocaleString('en-IN')}`
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
