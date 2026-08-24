'use client'

import { useState } from 'react'
import { X, BedDouble } from 'lucide-react'
import { format } from 'date-fns'
import { useToast } from '@/components/ui/Toast'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface Props {
  booking: any
  onClose: () => void
  onSuccess: () => void
}

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

export default function CheckInModal({ booking, onClose, onSuccess }: Props) {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)

  // Fetch all rooms of this category to allow selection
  const { data: allRooms } = useSWR('/api/rooms', fetcher)
  const categoryRooms = (allRooms || []).filter(
    (r: any) => r.category?.name === booking.roomCategory
  )

  // Currently assigned room IDs or fallback to initial assignment
  const initialRoomIds = (booking.bookingRooms || []).map((br: any) => br.roomId)
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>(initialRoomIds)

  const collected =
    booking.payments?.reduce(
      (s: number, p: any) => s + (p.status !== 'Pending' ? p.amount : 0),
      0
    ) || 0
  const balance = Math.max(0, booking.totalAmount - collected)
  const d1 = parseBookingDate(booking.checkIn)
  const d2 = parseBookingDate(booking.checkOut)
  const nights = d1 && d2 ? Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000)) : 1

  function toggleRoom(roomId: string) {
    if (selectedRoomIds.includes(roomId)) {
      if (selectedRoomIds.length > 1) {
        setSelectedRoomIds(selectedRoomIds.filter((id) => id !== roomId))
      }
    } else {
      if (selectedRoomIds.length < booking.numRooms) {
        setSelectedRoomIds([...selectedRoomIds, roomId])
      } else {
        // Replace last room
        setSelectedRoomIds([...selectedRoomIds.slice(0, booking.numRooms - 1), roomId])
      }
    }
  }

  async function handleCheckIn() {
    setLoading(true)
    try {
      const res = await fetch(`/api/bookings/${booking.id}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedRoomIds: selectedRoomIds.length > 0 ? selectedRoomIds : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error || 'Check-in failed', 'error')
      } else {
        showToast(`${booking.guest.name} checked in successfully!`, 'success')
        onSuccess()
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
      style={{ zIndex: 1050 }}
    >
      <div className="modal" style={{ maxWidth: '540px', width: '92%' }}>
        <div className="modal-header">
          <div className="modal-title">
            Check-in · {booking.guest.name}
            <button onClick={onClose} className="btn-icon" style={{ background: 'none', border: 'none' }}>
              <X size={16} />
            </button>
          </div>
          <div className="modal-subtitle">{booking.bookingRef} · Confirm the guest has arrived at the property.</div>
        </div>

        <div className="modal-body">
          {/* Reservation Summary */}
          <div
            style={{
              background: 'var(--card-2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '14px 16px',
              marginBottom: '16px',
            }}
          >
            <div className="bill-row">
              <span style={{ color: 'var(--text-2)' }}>Guest</span>
              <span style={{ fontWeight: 600 }}>{booking.guest.name}</span>
            </div>
            <div className="bill-row">
              <span style={{ color: 'var(--text-2)' }}>Booking ID</span>
              <span>{booking.bookingRef}</span>
            </div>
            <div className="bill-row">
              <span style={{ color: 'var(--text-2)' }}>Stay Dates</span>
              <span>
                {fmtDate(booking.checkIn)} → {fmtDate(booking.checkOut)} ({nights}N)
              </span>
            </div>
            <div className="bill-row">
              <span style={{ color: 'var(--text-2)' }}>Category &amp; Rooms</span>
              <span>
                {booking.numRooms} × {booking.roomCategory}
              </span>
            </div>
            <div className="bill-divider" />
            <div className="bill-row total">
              <span>Total Amount</span>
              <span>₹{booking.totalAmount.toLocaleString('en-IN')}</span>
            </div>
            {balance > 0 ? (
              <div className="bill-row">
                <span style={{ color: 'var(--amber)' }}>Balance to collect</span>
                <span style={{ color: 'var(--amber)', fontWeight: 700 }}>
                  ₹{balance.toLocaleString('en-IN')}
                </span>
              </div>
            ) : (
              <div className="bill-row">
                <span style={{ color: 'var(--green)' }}>Payment Status</span>
                <span style={{ color: 'var(--green)', fontWeight: 600 }}>Fully Paid</span>
              </div>
            )}
          </div>

          {/* Room Allocation Selection */}
          {categoryRooms && categoryRooms.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-2)',
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <BedDouble size={14} /> Assign {booking.numRooms} Room(s)
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                  Selected: {selectedRoomIds.length} / {booking.numRooms}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {categoryRooms.map((r: any) => {
                  const isSelected = selectedRoomIds.includes(r.id)
                  const isAvailable = r.status === 'Available' || initialRoomIds.includes(r.id)

                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => toggleRoom(r.id)}
                      disabled={!isAvailable && !isSelected}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: isSelected
                          ? '2px solid var(--red)'
                          : '1px solid var(--border)',
                        background: isSelected
                          ? 'var(--red-dim)'
                          : isAvailable
                          ? 'var(--card)'
                          : 'var(--card-2)',
                        color: isSelected
                          ? 'var(--text)'
                          : isAvailable
                          ? 'var(--text)'
                          : 'var(--text-3)',
                        cursor: isAvailable || isSelected ? 'pointer' : 'not-allowed',
                        fontSize: '12px',
                        fontWeight: isSelected ? 700 : 500,
                      }}
                    >
                      {r.number}
                      {!isAvailable && !isSelected && (
                        <span style={{ fontSize: '10px', marginLeft: '4px', opacity: 0.7 }}>
                          ({r.status})
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {balance > 0 && (
            <div className="alert alert-error" style={{ marginBottom: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              Balance of ₹{balance.toLocaleString('en-IN')} pending. Collect before or during checkout.
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="btn btn-red" onClick={handleCheckIn} disabled={loading}>
            {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : `Confirm Check-in`}
          </button>
        </div>
      </div>
    </div>
  )
}
