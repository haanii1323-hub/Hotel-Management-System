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
  AlertCircle
} from 'lucide-react'
import { format } from 'date-fns'
import InvoiceModal from './InvoiceModal'

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

function nights(checkIn: string, checkOut: string) {
  if (!checkIn || !checkOut) return 1
  const d1 = parseBookingDate(checkIn)
  const d2 = parseBookingDate(checkOut)
  if (!d1 || !d2) return 1
  return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000))
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
  booking,
  onClose,
  onCheckin,
  onCheckout,
  onCollectPayment,
  onSuccess,
}: Props) {
  const [showInvoice, setShowInvoice] = useState(false)

  if (!booking) return null

  const collected =
    booking.payments?.reduce(
      (s: number, p: any) => s + (p.status !== 'Pending' ? p.amount : 0),
      0
    ) || 0
  const balance = Math.max(0, (booking.totalAmount || 0) - collected)
  const numNights = nights(booking.checkIn, booking.checkOut)
  const assignedRooms =
    booking.bookingRooms && booking.bookingRooms.length > 0
      ? booking.bookingRooms.map((br: any) => br.room?.roomNumber).filter(Boolean).join(', ')
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
              <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px' }}>
                Created on {fmtDate(booking.createdAt)} · Source: <strong>{booking.source}</strong>
              </div>
            </div>
            <button
              onClick={onClose}
              className="btn-icon"
              style={{ padding: '6px', borderRadius: '6px', color: 'var(--text-2)' }}
            >
              <X size={18} />
            </button>
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
                <BedDouble size={13} /> Stay & Inventory
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
                    {numNights} Night{numNights !== 1 ? 's' : ''}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-2)' }}>Rooms & Category</div>
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
                  <div style={{ fontSize: '13px', color: 'var(--text)', marginTop: '2px', fontWeight: 500 }}>
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
                    Room Rate ({booking.roomCategory} × {booking.numRooms} × {numNights}N)
                  </span>
                  <span style={{ color: 'var(--text)', fontWeight: 500 }}>
                    {fmt(booking.nightlyRate || 0)} / night
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-2)' }}>Total Room Charges</span>
                  <span style={{ color: 'var(--text)', fontWeight: 600 }}>{fmt(booking.totalAmount)}</span>
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
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                        {fmt(p.amount)}
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
                <FileText size={14} /> Generate Bill / Invoice
              </button>
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

      {showInvoice && (
        <InvoiceModal
          booking={booking}
          collected={collected}
          balance={balance}
          onClose={() => setShowInvoice(false)}
        />
      )}
    </>
  )
}
