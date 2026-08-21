'use client'
import { useState } from 'react'
import { X } from 'lucide-react'
import { format } from 'date-fns'
import { useToast } from '@/components/ui/Toast'

interface Props { booking: any; onClose: () => void; onSuccess: () => void }

export default function CheckInModal({ booking, onClose, onSuccess }: Props) {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)

  const collected = booking.payments?.reduce((s: number, p: any) => s + (p.status !== 'Pending' ? p.amount : 0), 0) || 0
  const balance = booking.totalAmount - collected
  const nights = Math.ceil((new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / 86400000)

  async function handleCheckIn() {
    setLoading(true)
    try {
      const res = await fetch(`/api/bookings/${booking.id}/checkin`, { method: 'POST' })
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
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">
            Check-in · {booking.guest.name}
            <button onClick={onClose} className="btn-icon" style={{ background: 'none', border: 'none' }}><X size={16} /></button>
          </div>
          <div className="modal-subtitle">{booking.bookingRef} · Confirm the guest has arrived.</div>
        </div>

        <div className="modal-body">
          <div style={{ background: 'var(--card-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '16px', marginBottom: '16px' }}>
            <div className="bill-row"><span style={{ color: 'var(--text-2)' }}>Guest</span><span>{booking.guest.name}</span></div>
            <div className="bill-row"><span style={{ color: 'var(--text-2)' }}>Booking ID</span><span>{booking.bookingRef}</span></div>
            <div className="bill-row"><span style={{ color: 'var(--text-2)' }}>Check-in</span><span>{format(new Date(booking.checkIn), 'dd MMM yyyy')}</span></div>
            <div className="bill-row"><span style={{ color: 'var(--text-2)' }}>Check-out</span><span>{format(new Date(booking.checkOut), 'dd MMM yyyy')}</span></div>
            <div className="bill-row"><span style={{ color: 'var(--text-2)' }}>Nights</span><span>{nights}</span></div>
            <div className="bill-row"><span style={{ color: 'var(--text-2)' }}>Room type</span><span>{booking.roomCategory}</span></div>
            <div className="bill-row"><span style={{ color: 'var(--text-2)' }}>Number of rooms</span><span>{booking.numRooms}</span></div>
            <div className="bill-divider" />
            <div className="bill-row total"><span>Total amount</span><span>₹{booking.totalAmount.toLocaleString('en-IN')}</span></div>
            {balance > 0 && (
              <div className="bill-row"><span style={{ color: 'var(--amber)' }}>Balance due</span><span style={{ color: 'var(--amber)' }}>₹{balance.toLocaleString('en-IN')}</span></div>
            )}
            {collected > 0 && (
              <div className="bill-row"><span style={{ color: 'var(--green)' }}>Collected</span><span style={{ color: 'var(--green)' }}>₹{collected.toLocaleString('en-IN')}</span></div>
            )}
          </div>

          {balance > 0 && (
            <div className="alert alert-error" style={{ marginBottom: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              Balance of ₹{balance.toLocaleString('en-IN')} will be collected at hotel.
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-red" onClick={handleCheckIn} disabled={loading}>
            {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : `Confirm Check-in`}
          </button>
        </div>
      </div>
    </div>
  )
}
