'use client'

import React, { useState } from 'react'
import {
  X,
  Phone,
  Mail,
  User,
  Calendar,
  BedDouble,
  CreditCard,
  CheckCircle2,
  Clock,
  FileText,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  Tag,
  AlertCircle,
  Pencil,
  Ban,
  Printer,
  Trash2,
} from 'lucide-react'
import { format } from 'date-fns'
import InvoiceModal from './InvoiceModal'
import EditBookingModal from './EditBookingModal'
import PaymentReceiptModal from './PaymentReceiptModal'
import { useToast } from '@/components/ui/Toast'
import SourceBadge from '@/components/ui/SourceBadge'
import { broadcastChange } from '@/lib/realtime-sync'

import { calculateBookingFinancials, fmtCurrency } from '@/lib/financials'

function fmt(n: number) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`
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

interface Props {
  booking: any
  onClose: () => void
  onCheckin: (b: any) => void
  onCheckout: (b: any) => void
  onCollectPayment?: (b: any) => void
  onSuccess?: () => void
}

export default function BookingDetailsModal({
  booking: initialBooking,
  onClose,
  onCheckin,
  onCheckout,
  onCollectPayment,
  onSuccess,
}: Props) {
  const { showToast } = useToast()
  const [booking, setBooking] = useState(initialBooking)
  const [showInvoice, setShowInvoice] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null)
  const [receiptPayment, setReceiptPayment] = useState<any>(null)

  if (!booking) return null

  const fin = calculateBookingFinancials(booking)
  const collected = fin.collected
  const balance = fin.balance
  const numNights = fin.nights

  const assignedRooms =
    booking.bookingRooms && booking.bookingRooms.length > 0
      ? booking.bookingRooms.map((br: any) => br.room?.number || br.room?.roomNumber).filter(Boolean).join(', ')
      : 'Auto-assigned upon check-in'

  const statusConfig: Record<string, { label: string; className: string }> = {
    Upcoming: { label: 'Upcoming', className: 'badge-amber' },
    CheckedIn: { label: 'In-house (Checked in)', className: 'badge-green' },
    CheckedOut: { label: 'Checked out', className: 'badge-blue' },
    NoShow: { label: 'No Show', className: 'badge-gray' },
    Cancelled: { label: 'Cancelled', className: 'badge-red' },
  }

  const currentStatus = statusConfig[booking.status] || {
    label: booking.status,
    className: 'badge-gray',
  }

  async function handleDeletePayment(payment: any) {
    if (
      !confirm(
        `Are you sure you want to delete this recorded payment?\n\n• Mode: ${payment.mode}\n• Amount: ${fmt(
          payment.amount
        )}\n• Date: ${fmtDate(payment.createdAt)}\n\nThe outstanding balance will be automatically recalculated.`
      )
    ) {
      return
    }

    setDeletingPaymentId(payment.id)
    try {
      const res = await fetch(`/api/bookings/${booking.id}/payment?paymentId=${payment.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error || 'Failed to delete payment', 'error')
      } else {
        showToast(`Payment of ${fmt(payment.amount)} (${payment.mode}) deleted. Balance updated.`, 'success')
        broadcastChange('PAYMENT_DELETED', { bookingId: booking.id, paymentId: payment.id })
        if (data.booking) {
          setBooking(data.booking)
        } else {
          setBooking((prev: any) => ({
            ...prev,
            payments: (prev.payments || []).filter((p: any) => p.id !== payment.id),
            paymentStatus: data.paymentStatus || prev.paymentStatus,
          }))
        }
        if (onSuccess) onSuccess()
      }
    } catch {
      showToast('Network error while deleting payment', 'error')
    } finally {
      setDeletingPaymentId(null)
    }
  }

  async function handleCancelBooking() {
    if (!confirm(`Are you sure you want to cancel booking ${booking.bookingRef} for ${booking.guest?.name}? Assigned rooms will be released back to inventory.`)) {
      return
    }

    setCancelling(true)
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Cancelled' }),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error || 'Failed to cancel booking', 'error')
      } else {
        showToast(`Booking ${booking.bookingRef} cancelled. Rooms released.`, 'success')
        broadcastChange('BOOKING_UPDATED', { bookingId: booking.id, status: 'Cancelled' })
        setBooking(data)
        if (onSuccess) onSuccess()
      }
    } catch {
      showToast('Network error. Please try again.', 'error')
    } finally {
      setCancelling(false)
    }
  }

  return (
    <>
      <div
        className="modal-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
        style={{ zIndex: 1000 }}
      >
        <div
          className="modal booking-details-modal"
          style={{
            maxWidth: '680px',
            width: '94%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            borderRadius: '12px',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--card-2)',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>
                  Booking {booking.bookingRef}
                </h2>
                <span className={`badge ${currentStatus.className}`}>{currentStatus.label}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-2)', marginTop: '4px', flexWrap: 'wrap' }}>
                <span>Created on {fmtDate(booking.createdAt)}</span>
                <span style={{ color: 'var(--border-2)' }}>•</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span>Source:</span>
                  <SourceBadge source={booking.source} size="xs" />
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {booking.status !== 'Cancelled' && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowEdit(true)}
                  style={{ gap: '5px', fontSize: '12px', padding: '6px 10px' }}
                  title="Edit booking details"
                >
                  <Pencil size={13} /> Edit
                </button>
              )}
              {booking.status !== 'Cancelled' && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={handleCancelBooking}
                  disabled={cancelling}
                  style={{ gap: '5px', fontSize: '12px', padding: '6px 10px', color: 'var(--red)' }}
                  title="Cancel booking"
                >
                  <Ban size={13} /> {cancelling ? 'Cancelling...' : 'Cancel'}
                </button>
              )}
              <button
                onClick={onClose}
                className="btn-icon"
                style={{ padding: '6px', borderRadius: '6px', color: 'var(--text-2)' }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Scrollable Content Body */}
          <div
            style={{
              padding: '20px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {/* Guest Details Section */}
            <div
              style={{
                background: 'var(--bg-2)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '14px 16px',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: 'var(--text-3)',
                  fontWeight: 700,
                  marginBottom: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <User size={13} /> Guest Information
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-2)' }}>Guest Name</div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginTop: '2px' }}>
                    {booking.guest?.name || 'Guest'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-2)' }}>Phone Number</div>
                  <div style={{ fontSize: '13px', marginTop: '2px' }}>
                    {booking.guest?.phone ? (
                      <a
                        href={`tel:${booking.guest.phone}`}
                        style={{ color: 'var(--red)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}
                      >
                        <Phone size={12} /> {booking.guest.phone}
                      </a>
                    ) : (
                      <span style={{ color: 'var(--text-3)' }}>Not provided</span>
                    )}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-2)' }}>Email</div>
                  <div style={{ fontSize: '13px', marginTop: '2px' }}>
                    {booking.guest?.email ? (
                      <a
                        href={`mailto:${booking.guest.email}`}
                        style={{ color: 'var(--text)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Mail size={12} color="var(--text-2)" /> {booking.guest.email}
                      </a>
                    ) : (
                      <span style={{ color: 'var(--text-3)' }}>Not provided</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Stay & Room Details Section */}
            <div
              style={{
                background: 'var(--bg-2)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '14px 16px',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: 'var(--text-3)',
                  fontWeight: 700,
                  marginBottom: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <BedDouble size={13} /> Stay &amp; Inventory
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-2)' }}>Check-in</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginTop: '2px' }}>
                    {fmtDate(booking.checkIn)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-2)' }}>Check-out</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginTop: '2px' }}>
                    {fmtDate(booking.checkOut)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-2)' }}>Duration</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginTop: '2px' }}>
                    {fmtDate(booking.checkIn) === fmtDate(booking.checkOut)
                      ? 'Same-day (1 Day)'
                      : `${numNights} Night${numNights !== 1 ? 's' : ''}`}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-2)' }}>Rooms &amp; Category</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginTop: '2px' }}>
                    {booking.numRooms} × {booking.roomCategory}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-2)' }}>Occupancy</div>
                  <div style={{ fontSize: '13px', color: 'var(--text)', marginTop: '2px' }}>
                    {booking.adults || 1} Adult{booking.adults !== 1 ? 's' : ''}
                    {booking.kids > 0 ? `, ${booking.kids} Kid${booking.kids !== 1 ? 's' : ''}` : ''}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-2)' }}>Assigned Rooms</div>
                  <div style={{ fontSize: '13px', color: 'var(--text)', marginTop: '2px', fontWeight: 600 }}>
                    {assignedRooms}
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Ledger Section */}
            <div
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '14px 16px',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: 'var(--text-3)',
                  fontWeight: 700,
                  marginBottom: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <CreditCard size={13} /> Financial Breakdown
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-2)' }}>
                    Room Charges ({booking.roomCategory} × {fin.numRooms} × {fin.isSameDay ? '1D' : `${fin.nights}N`})
                  </span>
                  <span style={{ color: 'var(--text)', fontWeight: 600 }}>
                    {fmt(fin.baseRoomCharges)}
                  </span>
                </div>

                {fin.earlyCheckIn > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-2)' }}>Early Check-in Fee</span>
                    <span style={{ color: 'var(--text)', fontWeight: 500 }}>+{fmt(fin.earlyCheckIn)}</span>
                  </div>
                )}

                {fin.lateCheckOut > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-2)' }}>Late Checkout Fee</span>
                    <span style={{ color: 'var(--text)', fontWeight: 500 }}>+{fmt(fin.lateCheckOut)}</span>
                  </div>
                )}

                {fin.extraMattress > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-2)' }}>Extra Mattress ({fin.extraMattressCount}× @ {fmt(fin.extraMattressRate)}/N × {fin.nights}N)</span>
                    <span style={{ color: 'var(--text)', fontWeight: 500 }}>+{fmt(fin.extraMattress)}</span>
                  </div>
                )}

                {fin.discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'var(--green)' }}>Discount Applied</span>
                    <span style={{ color: 'var(--green)', fontWeight: 500 }}>-{fmt(fin.discount)}</span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', fontWeight: 600, borderTop: '1px solid var(--border)', paddingTop: '4px' }}>
                  <span>Total Bill</span>
                  <span style={{ color: 'var(--text)', fontWeight: 700 }}>{fmt(fin.totalAmount)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--green)' }}>Total Collected</span>
                  <span style={{ color: 'var(--green)', fontWeight: 600 }}>{fmt(collected)}</span>
                </div>
                <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 700 }}>
                  <span>Balance Due</span>
                  <span style={{ color: balance > 0 ? 'var(--amber)' : 'var(--green)' }}>
                    {balance > 0 ? fmt(balance) : 'Fully Settled (₹0)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment History List */}
            <div
              style={{
                background: 'var(--bg-2)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '14px 16px',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: 'var(--text-3)',
                  fontWeight: 700,
                  marginBottom: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={13} /> Payment History ({booking.payments?.length || 0})
                </div>
                {balance > 0 && onCollectPayment && booking.status !== 'Cancelled' && (
                  <button
                    onClick={() => {
                      onClose()
                      onCollectPayment(booking)
                    }}
                    style={{
                      fontSize: '11px',
                      color: 'var(--red)',
                      fontWeight: 600,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    + Collect Payment
                  </button>
                )}
              </div>

              {booking.payments && booking.payments.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {booking.payments.map((p: any) => (
                    <div
                      key={p.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        background: 'var(--card)',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        fontSize: '12px',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                          {p.mode} · <span style={{ color: p.status === 'Paid' ? 'var(--green)' : 'var(--amber)' }}>{p.status}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-2)', marginTop: '2px' }}>
                          {fmtDate(p.createdAt)}
                          {p.utrRef ? ` · UTR: ${p.utrRef}` : ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                          {fmt(p.amount)}
                        </div>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '3px 8px', fontSize: '11px', gap: '4px' }}
                          onClick={() => setReceiptPayment(p)}
                          title="View / Print Receipt"
                        >
                          <Printer size={12} /> Receipt
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm text-red"
                          style={{
                            padding: '3px 6px',
                            color: 'var(--red)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: '4px',
                          }}
                          onClick={() => handleDeletePayment(p)}
                          disabled={deletingPaymentId === p.id}
                          title={`Delete ${p.mode} payment of ${fmt(p.amount)}`}
                        >
                          {deletingPaymentId === p.id ? (
                            <span className="spinner" style={{ width: 11, height: 11 }} />
                          ) : (
                            <Trash2 size={12} />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: 'var(--text-3)', fontStyle: 'italic' }}>
                  No payment records recorded yet.
                </div>
              )}
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div
            style={{
              padding: '14px 20px',
              borderTop: '1px solid var(--border)',
              background: 'var(--card-2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            {/* Left side actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowInvoice(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <FileText size={14} /> View / Print Receipt
              </button>
              {booking.status !== 'Cancelled' && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowEdit(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Pencil size={13} /> Edit Booking
                </button>
              )}
              {booking.status !== 'Cancelled' && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={handleCancelBooking}
                  disabled={cancelling}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--red)' }}
                >
                  <Ban size={13} /> {cancelling ? 'Cancelling...' : 'Cancel Booking'}
                </button>
              )}
            </div>

            {/* Right side contextual status actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button className="btn btn-ghost btn-sm" onClick={onClose}>
                Close
              </button>

              {/* Status Specific Action Buttons */}
              {booking.status === 'Upcoming' && (
                <button
                  className="btn btn-red btn-sm"
                  onClick={() => {
                    onClose()
                    onCheckin(booking)
                  }}
                  style={{ fontWeight: 600, padding: '8px 16px' }}
                >
                  Proceed to Check-in →
                </button>
              )}

              {booking.status === 'CheckedIn' && (
                <button
                  className="btn btn-red btn-sm"
                  onClick={() => {
                    onClose()
                    onCheckout(booking)
                  }}
                  style={{ fontWeight: 600, padding: '8px 16px' }}
                >
                  Proceed to Checkout →
                </button>
              )}

              {booking.status !== 'Upcoming' &&
                booking.status !== 'CheckedIn' &&
                balance > 0 &&
                booking.status !== 'Cancelled' && (
                  <button
                    className="btn btn-red btn-sm"
                    onClick={() => {
                      onClose()
                      if (onCollectPayment) onCollectPayment(booking)
                      else onCheckout(booking)
                    }}
                    style={{ fontWeight: 600, padding: '8px 16px' }}
                  >
                    Collect Balance ({fmt(balance)})
                  </button>
                )}
            </div>
          </div>
        </div>
      </div>

      {showEdit && (
        <EditBookingModal
          booking={booking}
          onClose={() => setShowEdit(false)}
          onSuccess={(updated) => {
            setShowEdit(false)
            if (updated) setBooking(updated)
            if (onSuccess) onSuccess()
          }}
        />
      )}

      {showInvoice && (
        <InvoiceModal
          booking={booking}
          collected={collected}
          balance={balance}
          onClose={() => setShowInvoice(false)}
        />
      )}

      {receiptPayment && (
        <PaymentReceiptModal
          payment={receiptPayment}
          booking={booking}
          onClose={() => setReceiptPayment(null)}
        />
      )}
    </>
  )
}
