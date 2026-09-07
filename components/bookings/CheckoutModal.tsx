'use client'

import { useState, useEffect } from 'react'
import { X, Copy, ExternalLink, FileText, QrCode, Banknote, AlertCircle, Settings } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useToast } from '@/components/ui/Toast'
import InvoiceModal from './InvoiceModal'
import { broadcastChange } from '@/lib/realtime-sync'
import useSWR from 'swr'
import Link from 'next/link'

const fetcher = (url: string) => fetch(url).then((r) => r.json())
const PAYMENT_STATUSES = ['Paid', 'Pending', 'Partially Paid']

function fmt(n: number) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`
}

interface Props {
  booking: any
  onClose: () => void
  onSuccess: () => void
}

export default function CheckoutModal({ booking, onClose, onSuccess }: Props) {
  const { showToast } = useToast()
  const propertyId = booking.propertyId || ''

  const { data: config } = useSWR(
    propertyId ? `/api/payment-config?propertyId=${propertyId}` : null,
    fetcher,
    { revalidateOnFocus: true }
  )

  const availableModes: string[] = []
  if (config?.cashEnabled !== false) availableModes.push('Cash')
  if (config?.upiEnabled !== false) availableModes.push('UPI')
  if (config?.cardEnabled !== false) availableModes.push('Card')
  if (config?.bankTransferEnabled) availableModes.push('Bank Transfer')
  if (config?.chequeEnabled) availableModes.push('Cheque')
  if (config?.otherEnabled) availableModes.push('Others')
  if (availableModes.length === 0) availableModes.push('Cash', 'UPI')

  const [mode, setMode] = useState(availableModes[0] || 'Cash')
  const [payStatus, setPayStatus] = useState('Paid')
  const [utrRef, setUtrRef] = useState('')
  const [loading, setLoading] = useState(false)
  const [utrError, setUtrError] = useState('')
  const [showInvoice, setShowInvoice] = useState(false)

  useEffect(() => {
    if (availableModes.length > 0 && !availableModes.includes(mode)) {
      setMode(availableModes[0])
    }
  }, [availableModes, mode])

  const collected =
    booking.payments?.reduce(
      (s: number, p: any) => s + (p.status !== 'Pending' ? p.amount : 0),
      0
    ) || 0
  const balance = Math.max(0, (booking.totalAmount || 0) - collected)
  const [amount, setAmount] = useState(balance)

  useEffect(() => {
    setAmount(balance)
  }, [balance])

  const upiId = config?.upiId || ''
  const payeeName = config?.upiDisplayName || config?.upiMerchantName || booking.property?.name || 'Hotel'
  const upiString = upiId
    ? `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=Booking+${booking.bookingRef}`
    : ''

  function validate() {
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
        body: JSON.stringify({
          amount,
          mode,
          status: payStatus,
          utrRef: utrRef.trim() || null,
          notes: 'Checkout settlement',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error || 'Checkout failed', 'error')
      } else {
        showToast(`${booking.guest?.name || 'Guest'} checked out. Stay completed.`, 'success')
        broadcastChange('CHECK_OUT', { bookingId: booking.id })
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
              Checkout · {booking.guest?.name}
              <button onClick={onClose} className="btn-icon" style={{ background: 'none', border: 'none' }}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-subtitle">
              {booking.bookingRef} · Settle pending balance, generate invoice, and complete the stay.
            </div>
          </div>

          <div className="modal-body">
            {/* Bill summary */}
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
                <span>Room Charges ({booking.numRooms} Room · {booking.roomCategory})</span>
                <span>{fmt(booking.totalAmount)}</span>
              </div>
              <div className="bill-row">
                <span style={{ color: 'var(--text-2)' }}>Already paid</span>
                <span>{fmt(collected)}</span>
              </div>
              <div className="bill-row total">
                <span>Balance to settle</span>
                <span style={{ color: balance > 0 ? 'var(--amber)' : 'var(--green)' }}>{fmt(balance)}</span>
              </div>
            </div>

            {/* Payment settlement section (if balance > 0) */}
            {balance > 0 ? (
              <>
                <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '10px' }}>
                  Collect Settlement Amount
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Payment mode</label>
                    <select
                      className="form-control"
                      value={mode}
                      onChange={(e) => {
                        setMode(e.target.value)
                        setUtrError('')
                      }}
                    >
                      {availableModes.map((m) => (
                        <option key={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Amount collecting</label>
                    <input
                      className="form-control"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      min={0}
                      max={balance}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Status</label>
                    <select
                      className="form-control"
                      value={payStatus}
                      onChange={(e) => {
                        setPayStatus(e.target.value)
                        setUtrError('')
                      }}
                    >
                      {PAYMENT_STATUSES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* DYNAMIC UPI / QR VIEW */}
                {mode === 'UPI' && (
                  <div
                    style={{
                      background: 'var(--card-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '16px',
                      marginBottom: '14px',
                    }}
                  >
                    {config?.qrCodeUrl || upiId ? (
                      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <div
                          style={{
                            width: '96px',
                            height: '96px',
                            background: '#fff',
                            padding: '6px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                          }}
                        >
                          {config?.qrCodeUrl ? (
                            <img
                              src={config.qrCodeUrl}
                              alt="Hotel QR Code"
                              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            />
                          ) : (
                            <QRCodeSVG value={upiString} size={84} bgColor="#ffffff" fgColor="#000000" />
                          )}
                        </div>

                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '11px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Settlement QR · {fmt(amount)}
                          </div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginTop: '2px' }}>
                            {payeeName}
                          </div>

                          {upiId && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                              <span style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--red)', fontWeight: 600 }}>
                                {upiId}
                              </span>
                              <button
                                type="button"
                                className="btn-icon"
                                style={{ padding: '2px 4px', border: '1px solid var(--border)', borderRadius: 4 }}
                                onClick={() => {
                                  navigator.clipboard.writeText(upiId)
                                  showToast('UPI ID copied', 'success')
                                }}
                                title="Copy UPI ID"
                              >
                                <Copy size={11} />
                              </button>
                            </div>
                          )}

                          {config?.paymentInstructions && (
                            <div style={{ fontSize: '11px', color: 'var(--text-2)', marginTop: '4px' }}>
                              {config.paymentInstructions}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '10px 0' }}>
                        <QrCode size={24} style={{ margin: '0 auto 4px', color: 'var(--text-3)' }} />
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>
                          UPI / QR Code not configured yet
                        </div>
                        <Link
                          href="/settings"
                          className="btn btn-ghost btn-sm"
                          style={{ marginTop: '6px', fontSize: '11px', color: 'var(--red)', display: 'inline-flex', gap: '4px' }}
                          onClick={onClose}
                        >
                          <Settings size={12} /> Configure Payment Settings
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                {/* Bank details preview */}
                {mode === 'Bank Transfer' && config?.bankAccountNumber && (
                  <div
                    style={{
                      background: 'var(--card-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px 14px',
                      marginBottom: '14px',
                      fontSize: '12px',
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: '6px' }}>Bank Transfer Settlement Details</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      <div><span style={{ color: 'var(--text-3)' }}>A/C:</span> {config.bankAccountNumber}</div>
                      <div><span style={{ color: 'var(--text-3)' }}>IFSC:</span> {config.bankIfsc}</div>
                      <div><span style={{ color: 'var(--text-3)' }}>Bank:</span> {config.bankName}</div>
                      <div><span style={{ color: 'var(--text-3)' }}>Name:</span> {config.bankAccountName}</div>
                    </div>
                  </div>
                )}

                {/* Reference number (Bank Transfer, Card, Cheque) */}
                {(mode === 'Bank Transfer' || mode === 'Cheque' || mode === 'Card') && (
                  <div className="form-group">
                    <label className="form-label">
                      {mode === 'Card' ? 'Card Transaction / Auth Code' : 'Payment reference number'}
                    </label>
                    <input
                      className="form-control"
                      placeholder="e.g. TXN-882193"
                      value={utrRef}
                      onChange={(e) => {
                        setUtrRef(e.target.value)
                        setUtrError('')
                      }}
                    />
                    {utrError && (
                      <div style={{ fontSize: '12px', color: 'var(--red)', marginTop: '4px' }}>
                        {utrError}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div
                style={{
                  padding: '14px',
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.2)',
                  borderRadius: 'var(--radius-sm)',
                  textAlign: 'center',
                  fontSize: '13px',
                  color: 'var(--green)',
                  fontWeight: 600,
                  marginBottom: '14px',
                }}
              >
                All room charges have been fully settled. Ready for checkout!
              </div>
            )}
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button
              className="btn btn-ghost"
              onClick={() => setShowInvoice(true)}
              style={{ gap: '6px' }}
            >
              <FileText size={14} /> Preview Receipt
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button className="btn btn-red" onClick={handleCheckout} disabled={loading}>
                {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : 'Complete Checkout'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showInvoice && (
        <InvoiceModal
          booking={booking}
          collected={collected + (payStatus === 'Paid' ? amount : 0)}
          balance={Math.max(0, balance - (payStatus === 'Paid' ? amount : 0))}
          onClose={() => setShowInvoice(false)}
        />
      )}
    </>
  )
}
