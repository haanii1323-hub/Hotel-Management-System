'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { X, Copy, ExternalLink, QrCode, Building2, Banknote, CreditCard, AlertCircle, Settings, Globe } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useToast } from '@/components/ui/Toast'
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

export default function CollectPaymentModal({ booking, onClose, onSuccess }: Props) {
  const { showToast } = useToast()
  const propertyId = booking.propertyId || ''

  const { data: config } = useSWR(
    propertyId ? `/api/payment-config?propertyId=${propertyId}` : null,
    fetcher,
    { revalidateOnFocus: true }
  )

  // Build available payment modes list including Online Prepaid
  const availableModes: string[] = useMemo(() => {
    const modes: string[] = []
    if (config?.cashEnabled !== false) modes.push('Cash')
    if (config?.upiEnabled !== false) modes.push('UPI')
    if (config?.cardEnabled !== false) modes.push('Card')
    modes.push('Online Prepaid')
    if (config?.bankTransferEnabled) modes.push('Bank Transfer')
    if (config?.chequeEnabled) modes.push('Cheque')
    if (config?.otherEnabled) modes.push('Others')
    if (modes.length === 0) modes.push('Cash', 'UPI', 'Online Prepaid')
    return modes
  }, [config])

  const [mode, setMode] = useState('Cash')
  const [payStatus, setPayStatus] = useState('Paid')
  const [utrRef, setUtrRef] = useState('')
  const [loading, setLoading] = useState(false)
  const [utrError, setUtrError] = useState('')

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
    ? `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=Payment+${booking.bookingRef}`
    : ''

  function validate() {
    setUtrError('')
    return true
  }

  async function handlePayment() {
    if (!validate()) return
    if (amount <= 0) {
      showToast('Please enter an amount greater than 0', 'error')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/bookings/${booking.id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          mode,
          status: payStatus,
          utrRef: utrRef.trim() || null,
          notes: `Collected via PMS (${mode})`,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error || 'Payment recording failed', 'error')
      } else {
        showToast(`Payment of ${fmt(amount)} recorded successfully!`, 'success')
        broadcastChange('PAYMENT_COLLECTED', { bookingId: booking.id, amount })
        onSuccess()
      }
    } catch {
      showToast('Network error. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      style={{ zIndex: 1001 }}
    >
      <div className="modal" style={{ maxWidth: '520px', width: '92%' }}>
        <div className="modal-header">
          <div className="modal-title">
            Collect Payment · {booking.guest?.name}
            <button onClick={onClose} className="btn-icon" style={{ background: 'none', border: 'none' }}>
              <X size={16} />
            </button>
          </div>
          <div className="modal-subtitle">
            {booking.bookingRef} · Outstanding balance: <strong style={{ color: 'var(--amber)' }}>{fmt(balance)}</strong>
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
              <span>Total bill</span>
              <span>{fmt(booking.totalAmount)}</span>
            </div>
            <div className="bill-row">
              <span style={{ color: 'var(--text-2)' }}>Already collected</span>
              <span>{fmt(collected)}</span>
            </div>
            <div className="bill-row total">
              <span>Current balance due</span>
              <span style={{ color: balance > 0 ? 'var(--amber)' : 'var(--green)' }}>{fmt(balance)}</span>
            </div>
          </div>

          {/* Payment controls */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '16px' }}>
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
                min={1}
                max={balance}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Payment status</label>
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
                marginBottom: '16px',
              }}
            >
              {config?.qrCodeUrl || upiId ? (
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div
                    style={{
                      width: '100px',
                      height: '100px',
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
                      <QRCodeSVG value={upiString} size={88} bgColor="#ffffff" fgColor="#000000" />
                    )}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Scan to Pay · {fmt(amount)}
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
                            showToast('UPI ID copied to clipboard', 'success')
                          }}
                          title="Copy UPI ID"
                        >
                          <Copy size={11} />
                        </button>
                      </div>
                    )}

                    {config?.paymentInstructions && (
                      <div style={{ fontSize: '11px', color: 'var(--text-2)', marginTop: '6px', lineHeight: '1.4' }}>
                        {config.paymentInstructions}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <QrCode size={28} style={{ margin: '0 auto 6px', color: 'var(--text-3)' }} />
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
                    UPI / QR Code not configured yet
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-2)', marginTop: '2px' }}>
                    The hotel owner has not set up a UPI ID or QR code for this property.
                  </div>
                  <Link
                    href="/settings"
                    className="btn btn-ghost btn-sm"
                    style={{ marginTop: '8px', fontSize: '11px', color: 'var(--red)', display: 'inline-flex', gap: '4px' }}
                    onClick={onClose}
                  >
                    <Settings size={12} /> Configure Payment Settings
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* DYNAMIC BANK TRANSFER VIEW */}
          {mode === 'Bank Transfer' && (
            <div
              style={{
                background: 'var(--card-2)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '14px 16px',
                marginBottom: '16px',
                fontSize: '12px',
              }}
            >
              {config?.bankAccountNumber ? (
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Banknote size={15} color="var(--red)" /> Hotel Bank Account Details
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <span style={{ color: 'var(--text-3)' }}>Beneficiary:</span>
                      <div style={{ fontWeight: 600 }}>{config.bankAccountName || 'Hotel Account'}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-3)' }}>Bank Name:</span>
                      <div style={{ fontWeight: 600 }}>{config.bankName || '—'}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-3)' }}>Account Number:</span>
                      <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>{config.bankAccountNumber}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-3)' }}>IFSC Code:</span>
                      <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>{config.bankIfsc || '—'}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                  <AlertCircle size={20} style={{ margin: '0 auto 4px', color: 'var(--amber)' }} />
                  <div style={{ fontWeight: 600 }}>Bank details not configured</div>
                  <Link
                    href="/settings"
                    className="btn btn-ghost btn-sm"
                    style={{ marginTop: '6px', fontSize: '11px', color: 'var(--red)', display: 'inline-flex', gap: '4px' }}
                    onClick={onClose}
                  >
                    <Settings size={12} /> Configure Bank Details
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Online Prepaid Channel Info */}
          {mode === 'Online Prepaid' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '14px',
                fontSize: '12px',
                color: 'var(--text)',
              }}
            >
              <Globe size={18} color="var(--blue, #3b82f6)" style={{ flexShrink: 0 }} />
              <div>
                <strong style={{ color: 'var(--text)' }}>Online Prepaid Payment</strong>
                <div style={{ color: 'var(--text-2)', fontSize: '11px', marginTop: '2px' }}>
                  Prepaid booking via OTA channel (Agoda, MMT, Booking.com, Goibibo) or website gateway.
                </div>
              </div>
            </div>
          )}

          {/* Reference / Auth Code Input (Bank Transfer, Card, Cheque, Online Prepaid) */}
          {(mode === 'Bank Transfer' || mode === 'Cheque' || mode === 'Card' || mode === 'Online Prepaid') && (
            <div className="form-group">
              <label className="form-label">
                {mode === 'Card'
                  ? 'Card Transaction / Auth Code'
                  : mode === 'Online Prepaid'
                  ? 'Online Reference / OTA Booking ID (Optional)'
                  : 'Payment Reference Number'}
              </label>
              <input
                className="form-control"
                placeholder={
                  mode === 'Online Prepaid'
                    ? 'e.g. MMT-981244, AGODA-88319, TXN-9988'
                    : 'e.g. TXN-882193'
                }
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
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-red" onClick={handlePayment} disabled={loading}>
            {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : `Record Payment (${fmt(amount)})`}
          </button>
        </div>
      </div>
    </div>
  )
}
