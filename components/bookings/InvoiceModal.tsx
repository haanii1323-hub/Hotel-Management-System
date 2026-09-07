'use client'

import { X, Printer, QrCode } from 'lucide-react'
import { format } from 'date-fns'
import useSWR from 'swr'
import { QRCodeSVG } from 'qrcode.react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface Props {
  booking: any
  collected: number
  balance: number
  onClose: () => void
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

export default function InvoiceModal({ booking, collected, balance, onClose }: Props) {
  const property = booking.property || {}
  const propertyId = booking.propertyId || ''

  const { data: config } = useSWR(
    propertyId ? `/api/payment-config?propertyId=${propertyId}` : null,
    fetcher
  )

  const d1 = parseBookingDate(booking.checkIn)
  const d2 = parseBookingDate(booking.checkOut)
  const isSameDay = d1 && d2 && d1.toDateString() === d2.toDateString()
  const nights = d1 && d2 ? Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000)) : 1

  // Receipt Number format
  const receiptNo =
    booking.invoices && booking.invoices.length > 0
      ? booking.invoices[0].invoiceNo.replace('INV-', 'REC-')
      : `REC-${(booking.bookingRef || '').replace('#', '')}-${(booking.id || '').slice(-4).toUpperCase()}`

  function handlePrint() {
    window.print()
  }

  // Parse any add-on charges or breakdown recorded in notes
  const notesText = booking.notes || ''
  const hasEarlyCheckIn = notesText.includes('Early Check-in:')
  const hasLateCheckOut = notesText.includes('Late Checkout:')
  const hasExtraMattress = notesText.includes('Extra Mattress')

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      style={{ zIndex: 1200 }}
    >
      <div className="modal invoice-modal" style={{ maxWidth: '640px' }}>
        {/* Receipt Header */}
        <div className="invoice-header">
          <div className="invoice-logo">
            <img
              src="/logo.png"
              alt="APEX INN"
              style={{ width: 38, height: 38, borderRadius: 6, objectFit: 'cover' }}
            />
            <div>
              <div className="invoice-brand">{property.name || 'APEX INN HOTEL'}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-2)' }}>
                {property.address ? `${property.address}, ` : ''}{property.city || 'Bangalore'} · Code: {property.code}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 800, fontSize: '18px', color: 'var(--text)', letterSpacing: '0.5px' }}>
              RECEIPT
            </div>
            <div className="invoice-number" style={{ fontWeight: 600 }}>{receiptNo}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-2)' }}>{format(new Date(), 'dd MMM yyyy')}</div>
          </div>
        </div>

        <div className="invoice-body">
          {/* Guest & Reservation Info */}
          <div className="invoice-guest-section">
            <div>
              <div className="invoice-label">Guest Details</div>
              <div className="invoice-val" style={{ fontWeight: 600, fontSize: '14px' }}>
                {booking.guest?.name || 'Guest'}
              </div>
              {booking.guest?.phone && <div className="invoice-val">Phone: {booking.guest.phone}</div>}
              {booking.guest?.email && <div className="invoice-val">Email: {booking.guest.email}</div>}
            </div>
            <div>
              <div className="invoice-label">Booking Reference</div>
              <div className="invoice-val" style={{ fontWeight: 600 }}>{booking.bookingRef}</div>
              <div className="invoice-val">Source: <strong>{booking.source}</strong></div>
              <div className="invoice-val">
                Stay: {fmtDate(booking.checkIn)} → {fmtDate(booking.checkOut)}
                {isSameDay ? ' (Same-day)' : ` (${nights}N)`}
              </div>
            </div>
          </div>

          {/* Line items table */}
          <table className="invoice-table">
            <thead>
              <tr>
                <th>Description</th>
                <th style={{ textAlign: 'center' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Duration</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div style={{ fontWeight: 600 }}>{booking.roomCategory}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-2)' }}>
                    Room Reservation ({booking.numRooms} Room{booking.numRooms !== 1 ? 's' : ''})
                  </div>
                </td>
                <td style={{ textAlign: 'center' }}>{booking.numRooms}</td>
                <td style={{ textAlign: 'right' }}>
                  {isSameDay ? 'Same-day (1D)' : `${nights} Night${nights !== 1 ? 's' : ''}`}
                </td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>
                  ₹{(booking.totalAmount || 0).toLocaleString('en-IN')}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Notes / Special Instructions if any */}
          {booking.notes && (
            <div
              style={{
                fontSize: '11px',
                color: 'var(--text-2)',
                background: 'var(--card-2)',
                padding: '8px 12px',
                borderRadius: '4px',
                marginBottom: '12px',
                border: '1px solid var(--border)',
              }}
            >
              <strong>Particulars:</strong> {booking.notes}
            </div>
          )}

          {/* Totals Breakdown */}
          <div className="invoice-totals">
            <div className="invoice-total-row">
              <span>Total Charges</span>
              <span>₹{(booking.totalAmount || 0).toLocaleString('en-IN')}</span>
            </div>
            {booking.discountAmount > 0 && (
              <div className="invoice-total-row">
                <span style={{ color: 'var(--green)' }}>Discount Applied</span>
                <span style={{ color: 'var(--green)' }}>-₹{Number(booking.discountAmount).toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="invoice-total-row">
              <span style={{ color: 'var(--green)', fontWeight: 600 }}>Total Collected</span>
              <span style={{ color: 'var(--green)', fontWeight: 600 }}>₹{collected.toLocaleString('en-IN')}</span>
            </div>
            <div className="invoice-total-row bold">
              <span>Balance Due</span>
              <span style={{ color: balance > 0 ? 'var(--amber)' : 'var(--green)' }}>
                {balance > 0 ? `₹${balance.toLocaleString('en-IN')}` : '₹0 (Fully Settled)'}
              </span>
            </div>
          </div>

          {/* Payment History */}
          {booking.payments && booking.payments.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--text-3)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '8px',
                  fontWeight: 700,
                }}
              >
                Payment Records
              </div>
              {booking.payments.map((p: any, i: number) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    padding: '4px 0',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <span style={{ color: 'var(--text-2)' }}>
                    {p.mode} · <strong style={{ color: 'var(--green)' }}>{p.status}</strong> {p.utrRef ? `(Ref: ${p.utrRef})` : ''}
                  </span>
                  <span style={{ fontWeight: 600 }}>₹{p.amount.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          )}

          {/* Custom QR Code & Payment Information Footer */}
          {(config?.qrCodeUrl || config?.upiId || config?.bankAccountNumber) && balance > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '12px 14px',
                background: 'var(--card-2)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                marginTop: '16px',
              }}
            >
              {config.qrCodeUrl ? (
                <img
                  src={config.qrCodeUrl}
                  alt="Hotel QR Code"
                  style={{ width: 68, height: 68, objectFit: 'contain', background: '#fff', borderRadius: 4, padding: 2 }}
                />
              ) : config.upiId ? (
                <div style={{ background: '#fff', padding: 3, borderRadius: 4 }}>
                  <QRCodeSVG value={`upi://pay?pa=${config.upiId}&pn=${encodeURIComponent(property.name || 'Hotel')}&am=${balance}&cu=INR`} size={62} />
                </div>
              ) : null}

              <div style={{ fontSize: '11px', color: 'var(--text-2)', lineHeight: '1.4' }}>
                <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '12px', marginBottom: '2px' }}>
                  Payment Information
                </div>
                {config.upiId && (
                  <div>UPI ID: <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--red)' }}>{config.upiId}</span></div>
                )}
                {config.bankAccountNumber && (
                  <div>Bank: {config.bankName} · A/C: <span style={{ fontFamily: 'monospace' }}>{config.bankAccountNumber}</span> · IFSC: <span style={{ fontFamily: 'monospace' }}>{config.bankIfsc}</span></div>
                )}
                {config.paymentInstructions && (
                  <div style={{ marginTop: '2px', color: 'var(--text-3)' }}>{config.paymentInstructions}</div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer no-print">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <X size={14} /> Close
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-red btn-sm" onClick={handlePrint} style={{ gap: '6px' }}>
              <Printer size={14} /> Print Receipt
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
