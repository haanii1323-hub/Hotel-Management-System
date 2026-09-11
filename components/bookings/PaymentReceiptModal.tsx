'use client'

import React from 'react'
import { X, Printer } from 'lucide-react'
import { format } from 'date-fns'
import useSWR from 'swr'
import { QRCodeSVG } from 'qrcode.react'
import { calculateBookingFinancials, fmtDate, fmtCurrency } from '@/lib/financials'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

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

  const fin = calculateBookingFinancials(booking)

  const receiptNo = `REC-${(payment.id || '').slice(-6).toUpperCase()}`
  const paymentDate = payment.createdAt
    ? format(new Date(payment.createdAt), 'dd MMM yyyy, hh:mm a')
    : format(new Date(), 'dd MMM yyyy, hh:mm a')

  function handlePrint() {
    window.print()
  }

  return (
    <div
      className="modal-overlay receipt-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      style={{ zIndex: 1200 }}
    >
      <div className="modal invoice-modal receipt-print-container" style={{ maxWidth: '600px' }}>
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
                Room: {fin.numRooms} × {booking.roomCategory}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>
                Stay: {fmtDate(booking.checkIn)} to {fmtDate(booking.checkOut)} {fin.isSameDay ? '(1D)' : `(${fin.nights}N)`}
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
                <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '15px', color: 'var(--green)' }}>
                  {fmtCurrency(payment.amount)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Ledger Summary */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
            <div style={{ width: '260px' }}>
              {fin.discount > 0 && (
                <>
                  <div className="invoice-total-row">
                    <span>Gross Charges</span>
                    <span>{fmtCurrency(fin.grossTotal)}</span>
                  </div>
                  <div className="invoice-total-row">
                    <span style={{ color: 'var(--green)' }}>Discount Applied</span>
                    <span style={{ color: 'var(--green)' }}>- {fmtCurrency(fin.discount)}</span>
                  </div>
                </>
              )}
              <div className="invoice-total-row" style={{ fontWeight: 600 }}>
                <span>Total Booking Bill</span>
                <span>{fmtCurrency(fin.totalAmount)}</span>
              </div>
              <div className="invoice-total-row">
                <span style={{ color: 'var(--green)' }}>Total Paid to Date</span>
                <span style={{ color: 'var(--green)', fontWeight: 600 }}>{fmtCurrency(fin.collected)}</span>
              </div>
              <div className="invoice-total-row final" style={{ borderTop: '1px solid var(--border)', paddingTop: '6px' }}>
                <span>Remaining Balance</span>
                <span style={{ color: fin.balance > 0 ? 'var(--amber)' : 'var(--green)', fontWeight: 700 }}>
                  {fin.balance > 0 ? fmtCurrency(fin.balance) : '₹0 (Settled)'}
                </span>
              </div>
            </div>
          </div>

          {/* QR Code / Instructions Footer */}
          {(config?.qrCodeUrl || config?.upiId) && fin.balance > 0 && (
            <div
              className="receipt-qr-footer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '10px 12px',
                background: 'var(--card-2)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                marginBottom: '14px',
              }}
            >
              {config.qrCodeUrl ? (
                <img
                  src={config.qrCodeUrl}
                  alt="QR"
                  className="receipt-qr-img"
                  style={{ width: 56, height: 56, objectFit: 'contain', background: '#fff', borderRadius: 4, padding: 2 }}
                />
              ) : (
                <div className="receipt-qr-img" style={{ background: '#fff', padding: 2, borderRadius: 4 }}>
                  <QRCodeSVG value={`upi://pay?pa=${config.upiId}&pn=${encodeURIComponent(property.name || 'Hotel')}&am=${fin.balance}&cu=INR`} size={52} />
                </div>
              )}
              <div style={{ fontSize: '11px', color: 'var(--text-2)', lineHeight: '1.35' }}>
                <div style={{ fontWeight: 600, color: 'var(--text)' }}>Scan QR to settle remaining balance ({fmtCurrency(fin.balance)})</div>
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
