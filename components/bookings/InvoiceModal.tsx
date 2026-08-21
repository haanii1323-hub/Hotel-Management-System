'use client'
import { X, Printer, Download } from 'lucide-react'
import { format } from 'date-fns'

interface Props {
  booking: any
  collected: number
  balance: number
  onClose: () => void
}

export default function InvoiceModal({ booking, collected, balance, onClose }: Props) {
  const nights = Math.ceil((new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / 86400000)
  const invoiceNo = `INV-${booking.bookingRef.replace('#', '')}-${Date.now().toString().slice(-4)}`

  function handlePrint() {
    window.print()
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal invoice-modal">
        {/* Invoice Header */}
        <div className="invoice-header">
          <div className="invoice-logo">
            <div className="invoice-logo-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                <polyline points="9,22 9,12 15,12 15,22"/>
              </svg>
            </div>
            <div>
              <div className="invoice-brand">APEX INN</div>
              <div style={{ fontSize: '11px', color: 'var(--text-2)' }}>Hotel Operations Console</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 700, fontSize: '16px' }}>INVOICE</div>
            <div className="invoice-number">{invoiceNo}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-2)' }}>{format(new Date(), 'dd MMM yyyy')}</div>
          </div>
        </div>

        <div className="invoice-body">
          {/* Guest Info */}
          <div className="invoice-guest-section">
            <div>
              <div className="invoice-label">Bill to</div>
              <div className="invoice-val" style={{ fontWeight: 600 }}>{booking.guest.name}</div>
              {booking.guest.phone && <div className="invoice-val">{booking.guest.phone}</div>}
              {booking.guest.email && <div className="invoice-val">{booking.guest.email}</div>}
            </div>
            <div>
              <div className="invoice-label">Booking details</div>
              <div className="invoice-val">{booking.bookingRef}</div>
              <div className="invoice-val">Source: {booking.source}</div>
              <div className="invoice-val">
                {format(new Date(booking.checkIn), 'dd MMM yyyy')} → {format(new Date(booking.checkOut), 'dd MMM yyyy')}
              </div>
            </div>
          </div>

          {/* Line items */}
          <table className="invoice-table">
            <thead>
              <tr>
                <th>Description</th>
                <th style={{ textAlign: 'center' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Rate</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{booking.roomCategory} Room</td>
                <td style={{ textAlign: 'center' }}>{nights} night{nights !== 1 ? 's' : ''} × {booking.numRooms} room{booking.numRooms !== 1 ? 's' : ''}</td>
                <td style={{ textAlign: 'right' }}>₹{booking.nightlyRate.toLocaleString('en-IN')}</td>
                <td style={{ textAlign: 'right' }}>₹{booking.totalAmount.toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
          </table>

          {/* Totals */}
          <div className="invoice-totals">
            <div className="invoice-total-row"><span>Subtotal</span><span>₹{booking.totalAmount.toLocaleString('en-IN')}</span></div>
            <div className="invoice-total-row"><span style={{ color: 'var(--green)' }}>Collected</span><span style={{ color: 'var(--green)' }}>₹{collected.toLocaleString('en-IN')}</span></div>
            <div className="invoice-total-row bold">
              <span>Balance due</span>
              <span style={{ color: balance > 0 ? 'var(--amber)' : 'var(--green)' }}>₹{balance.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Payments */}
          {booking.payments && booking.payments.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Payment history</div>
              {booking.payments.map((p: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-2)' }}>{p.mode} · {p.status}</span>
                  <span>₹{p.amount.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={14} /> Close</button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-ghost btn-sm" onClick={handlePrint}><Printer size={14} /> Print</button>
          </div>
        </div>
      </div>
    </div>
  )
}
