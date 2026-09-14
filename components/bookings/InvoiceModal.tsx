'use client'

import React from 'react'
import { X, Printer, QrCode } from 'lucide-react'
import { format } from 'date-fns'
import useSWR from 'swr'
import { QRCodeSVG } from 'qrcode.react'
import { calculateBookingFinancials, fmtDate, fmtCurrency } from '@/lib/financials'
import { printReceiptDocument } from '@/lib/receipt-printer'
import { useProperty } from '@/context/PropertyContext'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface Props {
  booking: any
  collected?: number
  balance?: number
  onClose: () => void
}

export default function InvoiceModal({ booking, collected: overrideCollected, balance: overrideBalance, onClose }: Props) {
  const { currentProperty } = useProperty()
  const property = booking.property || currentProperty || {}
  const propertyId = booking.propertyId || property.id || ''

  const { data: config } = useSWR(
    propertyId ? `/api/payment-config?propertyId=${propertyId}` : null,
    fetcher
  )

  const fin = calculateBookingFinancials(booking, overrideCollected)
  const currentBalance = overrideBalance !== undefined ? overrideBalance : fin.balance

  // Receipt Number format
  const receiptNo =
    booking.invoices && booking.invoices.length > 0
      ? booking.invoices[0].invoiceNo.replace('INV-', 'REC-')
      : `REC-${(booking.bookingRef || '').replace('#', '')}-${(booking.id || '').slice(-4).toUpperCase()}`

  function handlePrint() {
    printReceiptDocument({
      property,
      booking,
      financials: fin,
      receiptNo,
      config,
      type: 'invoice',
    })
  }

  const addressDetails = [
    property.address,
    property.city,
    property.state,
    property.code ? `Code: ${property.code}` : '',
  ]
    .filter(Boolean)
    .join(' · ')

  const contactDetails = [
    property.phone ? `Phone: ${property.phone}` : '',
    property.email ? `Email: ${property.email}` : '',
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div
      className="modal-overlay receipt-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      style={{ zIndex: 1200 }}
    >
      <div className="modal invoice-modal receipt-print-container" style={{ maxWidth: '640px' }}>
        {/* Receipt Header */}
        <div className="invoice-header">
          <div className="invoice-logo">
            {property.coverImage || property.logo ? (
              <img
                src={property.coverImage || property.logo}
                alt={property.name || 'Hotel'}
                style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }}
              />
            ) : (
              <img
                src="/logo.png"
                alt="Logo"
                style={{ width: 38, height: 38, borderRadius: 6, objectFit: 'cover' }}
              />
            )}
            <div>
              <div className="invoice-brand">{property.name || 'Hotel'}</div>
              {addressDetails && (
                <div style={{ fontSize: '11px', color: 'var(--text-2)' }}>{addressDetails}</div>
              )}
              {contactDetails && (
                <div style={{ fontSize: '10.5px', color: 'var(--text-3)', marginTop: '2px' }}>{contactDetails}</div>
              )}
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
              {booking.guest?.address && <div className="invoice-val">Address: {booking.guest.address}</div>}
            </div>
            <div>
              <div className="invoice-label">Reservation Details</div>
              <div className="invoice-val" style={{ fontWeight: 600 }}>{booking.bookingRef}</div>
              <div className="invoice-val">Source: <strong>{booking.source}</strong></div>
              <div className="invoice-val">
                Stay: {fmtDate(booking.checkIn)} → {fmtDate(booking.checkOut)}
                {fin.isSameDay ? ' (Same-day 1D)' : ` (${fin.nights}N)`}
              </div>
              <div className="invoice-val">
                Rooms: {fin.numRooms} Room{fin.numRooms > 1 ? 's' : ''} ({booking.roomCategory})
              </div>
            </div>
          </div>

          {/* Itemized Line Items Table */}
          <table className="invoice-table">
            <thead>
              <tr>
                <th>Description</th>
                <th style={{ textAlign: 'center' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Rate / Duration</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {fin.lineItems.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{item.description}</div>
                    {item.subtext && (
                      <div style={{ fontSize: '11px', color: 'var(--text-2)' }}>
                        {item.subtext}
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>{item.qty}</td>
                  <td style={{ textAlign: 'right' }}>
                    {item.rate ? `${fmtCurrency(item.rate)} · ` : ''}{item.duration || '—'}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    {fmtCurrency(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Notes / Particulars */}
          {booking.notes && (
            <div
              className="invoice-notes-box"
              style={{
                fontSize: '11px',
                color: 'var(--text-2)',
                background: 'var(--card-2)',
                padding: '8px 12px',
                borderRadius: '4px',
                marginBottom: '14px',
                border: '1px solid var(--border)',
              }}
            >
              <strong>Particulars / Notes:</strong> {booking.notes}
            </div>
          )}

          {/* Totals Breakdown */}
          <div className="invoice-totals">
            {fin.discount > 0 || fin.addOnsTotal > 0 || fin.tax > 0 ? (
              <div className="invoice-total-row">
                <span>Subtotal (Gross Charges)</span>
                <span>{fmtCurrency(fin.grossTotal)}</span>
              </div>
            ) : null}

            {fin.discount > 0 && (
              <div className="invoice-total-row">
                <span style={{ color: 'var(--green)' }}>Discount Applied</span>
                <span style={{ color: 'var(--green)' }}>- {fmtCurrency(fin.discount)}</span>
              </div>
            )}

            {fin.tax > 0 && (
              <div className="invoice-total-row">
                <span>Taxes &amp; Fees</span>
                <span>+ {fmtCurrency(fin.tax)}</span>
              </div>
            )}

            <div className="invoice-total-row" style={{ fontWeight: 700, fontSize: '14.5px', borderTop: '1px solid var(--border)', paddingTop: '6px' }}>
              <span>Total Bill (Net Payable)</span>
              <span>{fmtCurrency(fin.totalAmount)}</span>
            </div>

            <div className="invoice-total-row">
              <span style={{ color: 'var(--green)', fontWeight: 600 }}>Total Collected / Paid</span>
              <span style={{ color: 'var(--green)', fontWeight: 600 }}>{fmtCurrency(fin.collected)}</span>
            </div>

            <div className="invoice-total-row bold">
              <span>Balance Due</span>
              <span style={{ color: currentBalance > 0 ? 'var(--amber)' : 'var(--green)' }}>
                {currentBalance > 0 ? fmtCurrency(currentBalance) : '₹0 (Fully Settled)'}
              </span>
            </div>
          </div>

          {/* Payment Records History */}
          {booking.payments && booking.payments.length > 0 && (
            <div className="invoice-payment-history" style={{ marginTop: '14px' }}>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--text-3)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '6px',
                  fontWeight: 700,
                }}
              >
                Payment Records ({booking.payments.length})
              </div>
              {booking.payments.map((p: any, i: number) => (
                <div
                  key={i}
                  className="invoice-payment-row"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    padding: '4px 0',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <span style={{ color: 'var(--text-2)' }}>
                    {p.mode} · <strong style={{ color: p.status === 'Paid' ? 'var(--green)' : 'var(--amber)' }}>{p.status || 'Paid'}</strong> {p.utrRef ? `(Ref: ${p.utrRef})` : ''} · {p.createdAt ? format(new Date(p.createdAt), 'dd MMM yyyy, hh:mm a') : '—'}
                  </span>
                  <span style={{ fontWeight: 600 }}>{fmtCurrency(p.amount)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Custom QR Code & Payment Information Footer */}
          {(config?.qrCodeUrl || config?.upiId || config?.bankAccountNumber) && currentBalance > 0 && (
            <div
              className="invoice-qr-footer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '10px 12px',
                background: 'var(--card-2)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                marginTop: '14px',
              }}
            >
              {config.qrCodeUrl ? (
                <img
                  src={config.qrCodeUrl}
                  alt="Hotel QR Code"
                  className="invoice-qr-img"
                  style={{ width: 60, height: 60, objectFit: 'contain', background: '#fff', borderRadius: 4, padding: 2 }}
                />
              ) : config.upiId ? (
                <div className="invoice-qr-img" style={{ background: '#fff', padding: 2, borderRadius: 4 }}>
                  <QRCodeSVG value={`upi://pay?pa=${config.upiId}&pn=${encodeURIComponent(property.name || 'Hotel')}&am=${currentBalance}&cu=INR`} size={56} />
                </div>
              ) : null}

              <div style={{ fontSize: '11px', color: 'var(--text-2)', lineHeight: '1.35' }}>
                <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '12px', marginBottom: '2px' }}>
                  Payment Information · Settle {fmtCurrency(currentBalance)}
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
