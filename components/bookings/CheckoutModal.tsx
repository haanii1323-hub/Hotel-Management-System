'use client'
import { useState, useEffect } from 'react'
import { X, Copy, ExternalLink, FileText } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { format } from 'date-fns'
import { useToast } from '@/components/ui/Toast'
import InvoiceModal from './InvoiceModal'

const PAYMENT_MODES = ['UPI', 'Cash', 'Bank Transfer', 'Pending Payments', 'Others']
const PAYMENT_STATUSES = ['Paid', 'Pending', 'Partially Paid']
const UPI_ID = 'apexinn@upi'

interface Props { booking: any; onClose: () => void; onSuccess: () => void }

export default function CheckoutModal({ booking, onClose, onSuccess }: Props) {
  const { showToast } = useToast()
  const [mode, setMode] = useState('UPI')
  const [payStatus, setPayStatus] = useState('Paid')
  const [utrRef, setUtrRef] = useState('')
  const [loading, setLoading] = useState(false)
  const [utrError, setUtrError] = useState('')
  const [showInvoice, setShowInvoice] = useState(false)

  const collected = booking.payments?.reduce((s: number, p: any) => s + (p.status !== 'Pending' ? p.amount : 0), 0) || 0
  const balance = Math.max(0, booking.totalAmount - collected)
  const [amount, setAmount] = useState(balance)

  useEffect(() => { setAmount(balance) }, [balance])

  const upiString = `upi://pay?pa=${UPI_ID}&pn=APEX+INN&am=${amount}&cu=INR&tn=Booking+${booking.bookingRef}`

  function validate() {
    if (mode === 'UPI' && payStatus === 'Paid' && !utrRef.trim()) {
      setUtrError('Reference number is required for UPI payments marked as paid.')
      return false
    }
    setUtrError('')
    return true
  }

  async function handleCheckout() {
    if (!validate()) return
    setLoading(true)
    try {
      const res = await fetch(`/api/bookings/${booking.id}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, mode, status: payStatus, utrRef, notes: '' }),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error || 'Checkout failed', 'error')
      } else {
        showToast(`${booking.guest.name} checked out. Invoice ${data.invoiceNo} generated.`, 'success')
        onSuccess()
      }
    } catch {
      showToast('Network error. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
        <div className="modal" style={{ maxWidth: '540px' }}>
          <div className="modal-header">
            <div className="modal-title">
              Checkout · {booking.guest.name}
              <button onClick={onClose} className="btn-icon" style={{ background: 'none', border: 'none' }}><X size={16} /></button>
            </div>
            <div className="modal-subtitle">{booking.bookingRef} · collect the payment, confirm it, then complete the stay.</div>
          </div>

          <div className="modal-body">
            {/* Bill summary */}
            <div style={{ background: 'var(--card-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '14px 16px', marginBottom: '16px' }}>
              <div className="bill-row"><span>Total bill</span><span>₹{booking.totalAmount.toLocaleString('en-IN')}</span></div>
              <div className="bill-row"><span style={{ color: 'var(--text-2)' }}>Already collected</span><span>₹{collected.toLocaleString('en-IN')}</span></div>
              <div className="bill-row total"><span>Balance due</span><span style={{ color: balance > 0 ? 'var(--amber)' : 'var(--green)' }}>₹{balance.toLocaleString('en-IN')}</span></div>
            </div>

            {/* Payment controls */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Payment mode</label>
                <select className="form-control" value={mode} onChange={e => { setMode(e.target.value); setUtrError('') }}>
                  {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Amount collected now</label>
                <input
                  className="form-control"
                  type="number"
                  value={amount}
                  onChange={e => setAmount(Number(e.target.value))}
                  min={0}
                  max={balance}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Payment status</label>
                <select className="form-control" value={payStatus} onChange={e => { setPayStatus(e.target.value); setUtrError('') }}>
                  {PAYMENT_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* UPI QR */}
            {mode === 'UPI' && (
              <div className="upi-block">
                <div className="upi-qr">
                  <QRCodeSVG value={upiString} size={88} bgColor="#ffffff" fgColor="#000000" />
                </div>
                <div className="upi-details">
                  <div className="upi-amount-label">Amount to collect</div>
                  <div className="upi-amount">₹{amount.toLocaleString('en-IN')}</div>
                  <div className="upi-id-row">
                    <span className="upi-id">{UPI_ID}</span>
                    <button
                      className="btn-icon"
                      style={{ padding: '3px', border: '1px solid var(--border)', borderRadius: 4 }}
                      onClick={() => { navigator.clipboard.writeText(UPI_ID); showToast('UPI ID copied', 'success') }}
                    ><Copy size={12} /></button>
                  </div>
                  <div className="upi-payee">Payee · APEX INN</div>
                  <a href={upiString} className="btn btn-ghost btn-sm" style={{ marginTop: '8px', display: 'inline-flex' }}>
                    <ExternalLink size={12} /> Pay via UPI app
                  </a>
                </div>
              </div>
            )}

            {/* UTR */}
            {mode === 'UPI' && (
              <div className="form-group">
                <label className="form-label">UPI reference / UTR number</label>
                <input
                  className="form-control"
                  placeholder="e.g. 412345678901"
                  value={utrRef}
                  onChange={e => { setUtrRef(e.target.value); setUtrError('') }}
                />
                {utrError && (
                  <div style={{ fontSize: '12px', color: 'var(--red)', marginTop: '4px' }}>
                    Reference number is required for UPI payments marked as paid.
                  </div>
                )}
              </div>
            )}

            {utrError && (
              <div className="alert alert-error">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                Enter the UTR / UPI reference number.
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button className="btn btn-ghost btn-sm" onClick={() => setShowInvoice(true)} style={{ gap: '6px' }}>
              <FileText size={14} /> Generate bill / invoice
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button className="btn btn-red" onClick={handleCheckout} disabled={loading}>
                {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : 'Confirm & complete checkout'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showInvoice && (
        <InvoiceModal booking={booking} collected={collected} balance={balance} onClose={() => setShowInvoice(false)} />
      )}
    </>
  )
}
