'use client'
import { useState, useEffect } from 'react'
import { X, Minus, Plus } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { format, addDays } from 'date-fns'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())
const SOURCES = ['Walk inn', 'GOMMT', 'B.COM', 'AIRBNB', 'BREWISTAY', 'B2B', 'CLEARTRIP', 'YATRA', 'EXPEDIA', 'AGODA', 'Fab', 'Corporate']
const DEFAULT_CATEGORIES = ['Deluxe', 'Classic', 'Suite']
const DEFAULT_RATES: Record<string, number> = { Deluxe: 800, Classic: 1896, Suite: 3900 }

interface Props { onClose: () => void; onSuccess: (createdBooking?: any) => void }

export default function NewBookingDrawer({ onClose, onSuccess }: Props) {
  const { showToast } = useToast()
  const { data: categories } = useSWR('/api/categories', fetcher)

  const today = format(new Date(), 'yyyy-MM-dd')
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd')

  const [form, setForm] = useState({
    guestName: '', phone: '', email: '', source: 'Walk inn',
    checkIn: today, checkOut: tomorrow,
    roomCategory: 'Deluxe', nightlyRate: 800,
    numRooms: 1, adults: 1, kids: 0,
    notes: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  // Sync category rates if categories are loaded from API
  useEffect(() => {
    if (categories && categories.length > 0) {
      const currentCat = categories.find((c: any) => c.name === form.roomCategory)
      if (currentCat && currentCat.nightlyRate) {
        setForm(f => ({ ...f, nightlyRate: currentCat.nightlyRate }))
      }
    }
  }, [categories, form.roomCategory])

  const upd = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  function calcNights() {
    if (!form.checkIn || !form.checkOut) return 1
    const diff = new Date(form.checkOut).getTime() - new Date(form.checkIn).getTime()
    return Math.max(1, Math.ceil(diff / 86400000))
  }

  const nights = calcNights()
  const total = form.nightlyRate * nights * form.numRooms

  function handleCheckInChange(newCheckIn: string) {
    setForm(f => {
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
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error || 'Failed to create booking', 'error')
      } else {
        showToast(`Booking ${data.bookingRef || ''} for ${form.guestName} created!`, 'success')
        onSuccess(data)
      }
    } catch {
      showToast('Network error. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="drawer-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="drawer">
        <div className="drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="drawer-title">Add booking</div>
            <button onClick={onClose} className="btn-icon"><X size={16} /></button>
          </div>
          <div className="drawer-subtitle">
            {form.adults + form.kids} Guest{form.adults + form.kids !== 1 ? 's' : ''} · {nights} Night{nights !== 1 ? 's' : ''} · {form.numRooms} Room{form.numRooms !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="drawer-body">
          {/* Guest Info */}
          <div className="drawer-section">
            <div className="drawer-section-title">Guest information</div>

            <div className="form-group">
              <label className="form-label">Guest name *</label>
              <input className="form-control" value={form.guestName} onChange={e => upd('guestName', e.target.value)} placeholder="Full name" />
              {errors.guestName && <div className="form-error">{errors.guestName}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Phone *</label>
              <input className="form-control" type="tel" value={form.phone} onChange={e => upd('phone', e.target.value)} placeholder="10-digit mobile" />
              {errors.phone && <div className="form-error">{errors.phone}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Email ID</label>
              <input className="form-control" type="email" value={form.email} onChange={e => upd('email', e.target.value)} placeholder="guest@email.com" />
            </div>

            <div className="form-group">
              <label className="form-label">Source</label>
              <select className="form-control" value={form.source} onChange={e => upd('source', e.target.value)}>
                {SOURCES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Stay Details */}
          <div className="drawer-section">
            <div className="drawer-section-title">Stay details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Check-in *</label>
                <input className="form-control" type="date" value={form.checkIn} onChange={e => handleCheckInChange(e.target.value)} />
                {errors.checkIn && <div className="form-error">{errors.checkIn}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Check-out *</label>
                <input className="form-control" type="date" value={form.checkOut} onChange={e => upd('checkOut', e.target.value)} min={form.checkIn} />
                {errors.checkOut && <div className="form-error">{errors.checkOut}</div>}
              </div>
            </div>
          </div>

          {/* Room Details */}
          <div className="drawer-section">
            <div className="drawer-section-title">Room details</div>

            <div className="form-group">
              <label className="form-label">Room type</label>
              <select className="form-control" value={form.roomCategory} onChange={e => {
                const selectedCatName = e.target.value
                const catObj = categories?.find((c: any) => c.name === selectedCatName)
                const rate = catObj?.nightlyRate || DEFAULT_RATES[selectedCatName] || 800
                upd('roomCategory', selectedCatName)
                upd('nightlyRate', rate)
              }}>
                {(categories && categories.length > 0 ? categories.map((c: any) => c.name) : DEFAULT_CATEGORIES).map((c: string) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Room price / night (₹)</label>
              <input
                className="form-control"
                type="number"
                value={form.nightlyRate}
                onChange={e => upd('nightlyRate', Number(e.target.value))}
                min={1}
              />
              {errors.nightlyRate && <div className="form-error">{errors.nightlyRate}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Number of rooms</label>
              <div className="counter">
                <button className="counter-btn" onClick={() => upd('numRooms', Math.max(1, form.numRooms - 1))}>
                  <Minus size={14} />
                </button>
                <div className="counter-val">{form.numRooms}</div>
                <button className="counter-btn" onClick={() => upd('numRooms', form.numRooms + 1)}>
                  <Plus size={14} />
                </button>
              </div>
              {errors.numRooms && <div className="form-error">{errors.numRooms}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Adults per room</label>
              <div className="counter">
                <button className="counter-btn" onClick={() => upd('adults', Math.max(1, form.adults - 1))}>
                  <Minus size={14} />
                </button>
                <div className="counter-val">{form.adults}</div>
                <button className="counter-btn" onClick={() => upd('adults', form.adults + 1)}>
                  <Plus size={14} />
                </button>
              </div>
              {errors.adults && <div className="form-error">{errors.adults}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Kids</label>
              <div className="counter">
                <button className="counter-btn" onClick={() => upd('kids', Math.max(0, form.kids - 1))}>
                  <Minus size={14} />
                </button>
                <div className="counter-val">{form.kids}</div>
                <button className="counter-btn" onClick={() => upd('kids', form.kids + 1)}>
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notes / To-do</label>
              <textarea className="form-control" value={form.notes} onChange={e => upd('notes', e.target.value)} placeholder="Any special requests or notes..." />
            </div>
          </div>

          {/* Total */}
          <div style={{ background: 'var(--card-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px', marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-2)', marginBottom: '8px' }}>Total charges</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text)' }}>₹{total.toLocaleString('en-IN')}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '4px' }}>
              ₹{form.nightlyRate.toLocaleString('en-IN')} × {nights} night{nights !== 1 ? 's' : ''} × {form.numRooms} room{form.numRooms !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        <div className="drawer-footer">
          <button
            className="btn btn-red"
            style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Create Booking'}
          </button>
        </div>
      </div>
    </div>
  )
}
