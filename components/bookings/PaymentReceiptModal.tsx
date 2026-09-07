'use client'

import React from 'react'
import { X, Printer, CheckCircle2, ShieldCheck } from 'lucide-react'
import { format } from 'date-fns'
import useSWR from 'swr'
import { QRCodeSVG } from 'qrcode.react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

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
  payment: any
  booking: any
  onClose: () => void
}

export default function PaymentReceiptModal({ payment, booking, onClose }: Props) {
  const property = booking.property || {}
  const propertyId = booking.propertyId || ''

  const { data: config } = useSWR(
    propertyId ? `/api/payment-config?propertyId=${propertyId}` : null,
    fetcher
  )

  const collected =
    booking.payments?.reduce(
      (s: number, p: any) => s + (p.status !== 'Pending' ? p.amount : 0),
      0
    ) || 0
  const balance = Math.max(0, (booking.totalAmount || 0) - collected)

  const receiptNo = `REC-${(payment.id || '').slice(-6).toUpperCase()}`
  const paymentDate = payment.createdAt ? format(new Date(payment.createdAt), 'dd MMM yyyy, hh:mm a') : format(new Date(), 'dd MMM yyyy, hh:mm a')

  function handlePrint() {
    window.print()
  }

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      style={{ zIndex: 1200 }}
    >
      <div className="modal invoice-modal" style={{ maxWidth: '600px' }}>
        {/* Receipt Header */}
        <div className="invoice-header">
          <div className="invoice-logo">
            <img
              src="/logo.png"
              alt="APEX INN"
              style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }}
            />
            <div>
              <div className="invoice-brand">{property.name || 'APEX INN HOTEL'}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-2)' }}>
                {property.address ? `${property.address}, ` : ''}{property.city || 'Bangalore'} · Code: {property.code}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--green)' }}>PAYMENT RECEIPT</div>
            <div className="invoice-number">{receiptNo}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-2)' }}>{paymentDate}</div>
          </div>
        </div>

        <div className="invoice-body">
          {/* Guest & Booking Info */}
          <div className="invoice-guest-section" style={{ marginBottom: '16px' }}>
            <div className="invoice-guest-box">
              <div className="invoice-section-title">Received From</div>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>{booking.guest?.name || 'Guest'}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px' }}>
                Phone: {booking.guest?.phone || '—'}
              </div>
              {booking.guest?.email && (
                <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>Email: {booking.guest?.email}</div>
              )}
            </div>

            <div className="invoice-guest-box">
              <div className="invoice-section-title">Reservation Details</div>
              <div style={{ fontWeight: 600, fontSize: '13px' }}>{booking.bookingRef}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px' }}>
                Room: {booking.numRooms} × {booking.roomCategory}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>
                Stay: {fmtDate(booking.checkIn)} to {fmtDate(booking.checkOut)}
              </div>
            </div>
          </div>

          {/* Payment Particulars Table */}
          <table className="invoice-table" style={{ marginBottom: '16px' }}>
            <thead>
              <tr>
                <th>Payment Mode</th>
                <th>Reference / UTR</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Amount Paid</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 600 }}>{payment.mode || 'Cash'}</td>
                <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{payment.utrRef || '—'}</td>
                <td>
                  <span style={{ fontSize: '11px', padding: '2px 6px', background: 'rgba(34, 197, 94, 0.15)', color: 'var(--green)', borderRadius: '4px', fontWeight: 600 }}>
                    {payment.status || 'Paid'}
                  </span>
                </td>
                <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '14px', color: 'var(--green)' }}>
                  {fmt(payment.amount)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Ledger Summary */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
            <div style={{ width: '240px' }}>
              <div className="invoice-total-row">
                <span>Total Booking Bill</span>
                <span>{fmt(booking.totalAmount)}</span>
              </div>
              <div className="invoice-total-row">
                <span style={{ color: 'var(--green)' }}>Total Paid to Date</span>
                <span style={{ color: 'var(--green)', fontWeight: 600 }}>{fmt(collected)}</span>
              </div>
              <div className="invoice-total-row final">
                <span>Remaining Balance</span>
                <span style={{ color: balance > 0 ? 'var(--amber)' : 'var(--green)' }}>{fmt(balance)}</span>
              </div>
            </div>
          </div>

          {/* QR Code / Instructions Footer */}
          {(config?.qrCodeUrl || config?.upiId) && balance > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '12px 14px',
                background: 'var(--card-2)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                marginBottom: '16px',
              }}
            >
              {config.qrCodeUrl ? (
                <img
                  src={config.qrCodeUrl}
                  alt="QR"
                  style={{ width: 64, height: 64, objectFit: 'contain', background: '#fff', borderRadius: 4, padding: 2 }}
                />
              ) : (
                <div style={{ background: '#fff', padding: 3, borderRadius: 4 }}>
                  <QRCodeSVG value={`upi://pay?pa=${config.upiId}&pn=${encodeURIComponent(property.name || 'Hotel')}&am=${balance}&cu=INR`} size={58} />
                </div>
              )}
              <div style={{ fontSize: '11px', color: 'var(--text-2)' }}>
                <div style={{ fontWeight: 600, color: 'var(--text)' }}>Scan QR to settle remaining balance ({fmt(balance)})</div>
                {config.upiId && <div>UPI ID: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{config.upiId}</span></div>}
              </div>
            </div>
          )}

          <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-3)', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
            Official Payment Receipt · Generated by APEX INN PMS · Thank you for your business.
          </div>
        </div>

        <div className="invoice-actions no-print">
          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
          <button className="btn btn-red" onClick={handlePrint} style={{ gap: '6px' }}>
            <Printer size={14} /> Print Receipt
          </button>
        </div>
      </div>
    </div>
  )
}
