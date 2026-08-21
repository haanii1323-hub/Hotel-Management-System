'use client'

import React, { useState, useEffect } from 'react'
import { X, Copy, ExternalLink, Check } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useToast } from '@/components/ui/Toast'

const PAYMENT_MODES = ['UPI', 'Cash', 'Bank Transfer', 'Pending Payments', 'Others']
const PAYMENT_STATUSES = ['Paid', 'Pending', 'Partially Paid']
const UPI_ID = 'apexinn@upi'

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
  const [mode, setMode] = useState('UPI')
  const [payStatus, setPayStatus] = useState('Paid')
  const [utrRef, setUtrRef] = useState('')
  const [loading, setLoading] = useState(false)
  const [utrError, setUtrError] = useState('')

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

  const upiString = `upi://pay?pa=${UPI_ID}&pn=APEX+INN&am=${amount}&cu=INR&tn=Payment+${booking.bookingRef}`

  function validate() {
    if (mode === 'UPI' && payStatus === 'Paid' && !utrRef.trim()) {
      setUtrError('Reference number is required for UPI payments marked as paid.')
      return false
    }
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
        body: JSON.stringify({ amount, mode, status: payStatus, utrRef, notes: 'Collected via PMS' }),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error || 'Payment recording failed', 'error')
      } else {
        showToast(`Payment of ${fmt(amount)} recorded successfully!`, 'success')
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
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
                {PAYMENT_MODES.map((m) => (
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

          {/* UPI QR */}
          {mode === 'UPI' && (
            <div className="upi-block">
              <div className="upi-qr">
                <QRCodeSVG value={upiString} size={88} bgColor="#ffffff" fgColor="#000000" />
              </div>
              <div className="upi-details">
                <div className="upi-amount-label">Amount to collect</div>
                <div className="upi-amount">{fmt(amount)}</div>
                <div className="upi-id-row">
                  <span className="upi-id">{UPI_ID}</span>
                  <button
                    className="btn-icon"
                    style={{ padding: '3px', border: '1px solid var(--border)', borderRadius: 4 }}
                    onClick={() => {
                      navigator.clipboard.writeText(UPI_ID)
                      showToast('UPI ID copied', 'success')
                    }}
                  >
                    <Copy size={12} />
                  </button>
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
                onChange={(e) => {
                  setUtrRef(e.target.value)
                  setUtrError('')
                }}
              />
              {utrError && (
                <div style={{ fontSize: '12px', color: 'var(--red)', marginTop: '4px' }}>
                  Reference number is required for UPI payments marked as paid.
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
