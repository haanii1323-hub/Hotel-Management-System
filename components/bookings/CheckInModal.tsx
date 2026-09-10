'use client'

import { useState } from 'react'
import { X, BedDouble } from 'lucide-react'
import { format } from 'date-fns'
import { useToast } from '@/components/ui/Toast'
import useSWR from 'swr'
import { broadcastChange } from '@/lib/realtime-sync'

import { calculateBookingFinancials, fmtDate, fmtCurrency } from '@/lib/financials'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface Props {
  booking: any
  onClose: () => void
  onSuccess: () => void
}

export default function CheckInModal({ booking, onClose, onSuccess }: Props) {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)

  // Fetch all rooms of this property to allow selection
  const { data: allRooms } = useSWR(
    booking.propertyId ? `/api/rooms?propertyId=${booking.propertyId}` : '/api/rooms',
    fetcher
  )
  const categoryRooms = (allRooms || []).filter(
    (r: any) => r.category?.name === booking.roomCategory
  )

  // Currently assigned room IDs or fallback to initial assignment
  const initialRoomIds = (booking.bookingRooms || []).map((br: any) => br.roomId)
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>(initialRoomIds)

  const fin = calculateBookingFinancials(booking)
  const collected = fin.collected
  const balance = fin.balance
  const nights = fin.nights

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
        broadcastChange('CHECK_IN', { bookingId: booking.id })
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
            Check-in · {booking.guest?.name}
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
              <span style={{ fontWeight: 600 }}>{booking.guest?.name}</span>
            </div>
            <div className="bill-row">
              <span style={{ color: 'var(--text-2)' }}>Booking Ref</span>
              <span style={{ fontWeight: 600 }}>{booking.bookingRef}</span>
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
            <div className="bill-row">
              <span style={{ color: 'var(--text-2)' }}>Room Charges</span>
              <span>{fmtCurrency(fin.baseRoomCharges)}</span>
            </div>
            {fin.addOnsTotal > 0 && (
              <div className="bill-row">
                <span style={{ color: 'var(--text-2)' }}>Add-ons</span>
                <span>+{fmtCurrency(fin.addOnsTotal)}</span>
              </div>
            )}
            {fin.discount > 0 && (
              <div className="bill-row">
                <span style={{ color: 'var(--green)' }}>Discount</span>
                <span style={{ color: 'var(--green)' }}>-{fmtCurrency(fin.discount)}</span>
              </div>
            )}
            <div className="bill-row total">
              <span>Total Bill</span>
              <span>{fmtCurrency(fin.totalAmount)}</span>
            </div>
            {collected > 0 && (
              <div className="bill-row">
                <span style={{ color: 'var(--green)' }}>Already Collected</span>
                <span style={{ color: 'var(--green)', fontWeight: 600 }}>{fmtCurrency(collected)}</span>
              </div>
            )}
            {balance > 0 ? (
              <div className="bill-row">
                <span style={{ color: 'var(--amber)' }}>Balance to collect</span>
                <span style={{ color: 'var(--amber)', fontWeight: 700 }}>
                  {fmtCurrency(balance)}
                </span>
              </div>
            ) : (
              <div className="bill-row">
                <span style={{ color: 'var(--green)' }}>Payment Status</span>
                <span style={{ color: 'var(--green)', fontWeight: 600 }}>Fully Settled</span>
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
