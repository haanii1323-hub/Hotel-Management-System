'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  X,
  Copy,
  Plus,
  Trash2,
  FileText,
  QrCode,
  Banknote,
  AlertCircle,
  Settings,
  Globe,
  CheckCircle2,
  Layers,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useToast } from '@/components/ui/Toast'
import InvoiceModal from './InvoiceModal'
import { broadcastChange } from '@/lib/realtime-sync'
import useSWR from 'swr'
import Link from 'next/link'
import { calculateBookingFinancials, fmtCurrency } from '@/lib/financials'

const fetcher = (url: string) => fetch(url).then((r) => r.json())
const PAYMENT_STATUSES = ['Paid', 'Pending', 'Partially Paid']

function fmt(n: number) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`
}

export interface PaymentSplit {
  id: string
  mode: string
  amount: number | ''
  utrRef: string
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

  const [existingPayments, setExistingPayments] = useState<any[]>(booking.payments || [])
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null)

  const currentBookingState = useMemo(() => ({
    ...booking,
    payments: existingPayments,
  }), [booking, existingPayments])

  const fin = calculateBookingFinancials(currentBookingState)
  const collected = fin.collected
  const balance = fin.balance

  const [payStatus, setPayStatus] = useState('Paid')
  const [loading, setLoading] = useState(false)
  const [showInvoice, setShowInvoice] = useState(false)

  // Split payment rows
  const [splits, setSplits] = useState<PaymentSplit[]>([
    {
      id: 'split-1',
      mode: availableModes[0] || 'Cash',
      amount: balance > 0 ? balance : 0,
      utrRef: '',
    },
  ])

  useEffect(() => {
    if (availableModes.length > 0 && splits.length === 1 && !availableModes.includes(splits[0].mode)) {
      setSplits([{ ...splits[0], mode: availableModes[0] }])
    }
  }, [availableModes])

  const totalSplitsAmount = useMemo(() => {
    return splits.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
  }, [splits])

  const remainingBalanceDiff = balance - totalSplitsAmount

  async function handleDeletePayment(p: any) {
    if (
      !confirm(
        `Are you sure you want to delete this recorded payment?\n\n• Mode: ${p.mode}\n• Amount: ${fmt(
          p.amount
        )}\n\nThis will restore ₹${p.amount} to the outstanding settlement balance.`
      )
    ) {
      return
    }

    setDeletingPaymentId(p.id)
    try {
      const res = await fetch(`/api/bookings/${booking.id}/payment?paymentId=${p.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error || 'Failed to delete payment', 'error')
      } else {
        showToast(`Payment of ${fmt(p.amount)} (${p.mode}) deleted`, 'success')
        broadcastChange('PAYMENT_DELETED', { bookingId: booking.id, paymentId: p.id })
        const updatedList = existingPayments.filter((item: any) => item.id !== p.id)
        setExistingPayments(updatedList)
        const newFin = calculateBookingFinancials({ ...booking, payments: updatedList })
        setSplits([
          {
            id: 'split-1',
            mode: availableModes[0] || 'Cash',
            amount: newFin.balance > 0 ? newFin.balance : 0,
            utrRef: '',
          },
        ])
      }
    } catch {
      showToast('Network error while deleting payment', 'error')
    } finally {
      setDeletingPaymentId(null)
    }
  }

  function handleAddSplit() {
    const usedModes = new Set(splits.map((s) => s.mode))
    const nextMode = availableModes.find((m) => !usedModes.has(m)) || availableModes[0] || 'Online Prepaid'
    const unallocated = Math.max(0, remainingBalanceDiff)

    setSplits((prev) => [
      ...prev,
      {
        id: `split-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        mode: nextMode,
        amount: unallocated > 0 ? unallocated : 0,
        utrRef: '',
      },
    ])
  }

  function handleRemoveSplit(id: string) {
    if (splits.length <= 1) return
    setSplits((prev) => prev.filter((s) => s.id !== id))
  }

  function handleUpdateSplit(id: string, field: keyof PaymentSplit, value: any) {
    setSplits((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    )
  }

  function handleAutoFill(id: string) {
    const otherSum = splits
      .filter((s) => s.id !== id)
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
    const needed = Math.max(0, balance - otherSum)
    handleUpdateSplit(id, 'amount', needed)
  }

  const upiId = config?.upiId || ''
  const payeeName = config?.upiDisplayName || config?.upiMerchantName || booking.property?.name || 'Hotel'

  const upiSplit = splits.find((s) => s.mode === 'UPI')
  const upiAmount = upiSplit ? Number(upiSplit.amount) || 0 : totalSplitsAmount
  const upiString = upiId
    ? `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${upiAmount}&cu=INR&tn=Booking+${booking.bookingRef}`
    : ''

  const hasBankTransfer = splits.some((s) => s.mode === 'Bank Transfer')
  const hasOnlinePrepaid = splits.some((s) => s.mode === 'Online Prepaid')

  async function handleCheckout() {
    const validSplits = splits.filter((s) => Number(s.amount) > 0)

    setLoading(true)
    try {
      const res = await fetch(`/api/bookings/${booking.id}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          splits:
            balance > 0 && validSplits.length > 0
              ? validSplits.map((s) => ({
                  amount: Number(s.amount),
                  mode: s.mode,
                  status: payStatus,
                  utrRef: s.utrRef.trim() || null,
                  notes: `Checkout settlement (${s.mode})`,
                }))
              : [],
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        showToast(data.error || 'Checkout failed', 'error')
      } else {
        showToast(`${booking.guest?.name || 'Guest'} checked out successfully!`, 'success')
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
        <div className="modal" style={{ maxWidth: '580px', width: '94%' }}>
          <div className="modal-header">
            <div className="modal-title">
              Checkout · {booking.guest?.name}
              <button onClick={onClose} className="btn-icon" style={{ background: 'none', border: 'none' }}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-subtitle">
              {booking.bookingRef} · Settle pending balance, generate receipt, and complete stay.
            </div>
          </div>

          <div className="modal-body">
            {/* Bill summary */}
            <div
              style={{
                background: 'var(--card-2)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 16px',
                marginBottom: '16px',
              }}
            >
              <div className="bill-row">
                <span>Room Charges ({fin.numRooms} Room · {booking.roomCategory})</span>
                <span>{fmt(fin.baseRoomCharges)}</span>
              </div>
              {fin.addOnsTotal > 0 && (
                <div className="bill-row">
                  <span style={{ color: 'var(--text-2)' }}>Add-ons &amp; Extras</span>
                  <span>+{fmt(fin.addOnsTotal)}</span>
                </div>
              )}
              {fin.discount > 0 && (
                <div className="bill-row">
                  <span style={{ color: 'var(--green)' }}>Discount Applied</span>
                  <span style={{ color: 'var(--green)' }}>-{fmt(fin.discount)}</span>
                </div>
              )}
              <div className="bill-row" style={{ borderTop: '1px solid var(--border)', paddingTop: '6px', fontWeight: 600 }}>
                <span>Total Bill</span>
                <span>{fmt(fin.totalAmount)}</span>
              </div>
              <div className="bill-row">
                <span style={{ color: 'var(--text-2)' }}>Already Paid</span>
                <span>{fmt(collected)}</span>
              </div>
              <div className="bill-row total">
                <span>Balance to Settle</span>
                <span style={{ color: balance > 0 ? 'var(--amber)' : 'var(--green)' }}>{fmt(balance)}</span>
              </div>
            </div>

            {/* Existing Payments with Delete Option */}
            {existingPayments.length > 0 && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.03)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 14px',
                  marginBottom: '16px',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: 'var(--text-3)',
                    marginBottom: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>Recorded Payments ({existingPayments.length})</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-3)', fontWeight: 'normal' }}>
                    Wrong entry? Click trash icon to delete
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {existingPayments.map((p: any) => (
                    <div
                      key={p.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 10px',
                        background: 'var(--card)',
                        borderRadius: '4px',
                        border: '1px solid var(--border)',
                        fontSize: '12px',
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 600, color: 'var(--text)' }}>{p.mode}</span>
                        <span style={{ color: 'var(--text-3)', margin: '0 6px' }}>·</span>
                        <span style={{ color: p.status === 'Paid' ? 'var(--green)' : 'var(--amber)', fontSize: '11px', fontWeight: 600 }}>
                          {p.status || 'Paid'}
                        </span>
                        {p.utrRef && <span style={{ color: 'var(--text-3)', fontSize: '11px', marginLeft: '6px' }}>({p.utrRef})</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text)' }}>{fmt(p.amount)}</span>
                        <button
                          type="button"
                          className="btn-icon"
                          style={{
                            padding: '3px',
                            color: 'var(--red)',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                          onClick={() => handleDeletePayment(p)}
                          disabled={deletingPaymentId === p.id}
                          title={`Delete ${p.mode} payment of ${fmt(p.amount)}`}
                        >
                          {deletingPaymentId === p.id ? (
                            <span className="spinner" style={{ width: 10, height: 10 }} />
                          ) : (
                            <Trash2 size={12} />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment settlement section (if balance > 0) */}
            {balance > 0 ? (
              <>
                {/* Header with Add Split Mode button */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '13px' }}>
                    <Layers size={15} color="var(--red)" />
                    Settlement Payment Modes
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={handleAddSplit}
                    style={{
                      fontSize: '11px',
                      color: 'var(--red)',
                      gap: '4px',
                      padding: '4px 8px',
                      border: '1px dashed var(--border)',
                      background: 'rgba(239, 68, 68, 0.04)',
                    }}
                  >
                    <Plus size={13} /> Add Payment Mode
                  </button>
                </div>

                {/* Split rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
                  {splits.map((split, index) => (
                    <div
                      key={split.id}
                      style={{
                        background: 'var(--card-2)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '10px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: 'var(--text-3)',
                            width: '20px',
                            textAlign: 'center',
                          }}
                        >
                          #{index + 1}
                        </span>

                        {/* Mode Dropdown */}
                        <div style={{ flex: '1.2' }}>
                          <select
                            className="form-control"
                            style={{ fontSize: '13px', padding: '6px 10px', height: '36px' }}
                            value={split.mode}
                            onChange={(e) => handleUpdateSplit(split.id, 'mode', e.target.value)}
                          >
                            {availableModes.map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Amount Input */}
                        <div style={{ flex: '1.1' }}>
                          <input
                            className="form-control"
                            type="number"
                            placeholder="Amount (₹)"
                            style={{ fontSize: '13px', fontWeight: 600, padding: '6px 10px', height: '36px' }}
                            value={split.amount}
                            onChange={(e) =>
                              handleUpdateSplit(
                                split.id,
                                'amount',
                                e.target.value === '' ? '' : Math.max(0, Number(e.target.value))
                              )
                            }
                            min={0}
                          />
                        </div>

                        {/* Fill remaining button */}
                        {remainingBalanceDiff !== 0 && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleAutoFill(split.id)}
                            title="Auto-fill balance into this mode"
                            style={{ fontSize: '10px', padding: '4px 6px', height: '36px', whiteSpace: 'nowrap' }}
                          >
                            Fill
                          </button>
                        )}

                        {/* Remove Split */}
                        {splits.length > 1 && (
                          <button
                            type="button"
                            className="btn-icon"
                            onClick={() => handleRemoveSplit(split.id)}
                            title="Remove payment mode"
                            style={{
                              color: 'var(--text-3)',
                              padding: '6px',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>

                      {/* Reference line */}
                      {(split.mode === 'UPI' ||
                        split.mode === 'Card' ||
                        split.mode === 'Online Prepaid' ||
                        split.mode === 'Bank Transfer' ||
                        split.mode === 'Cheque') && (
                        <div style={{ display: 'flex', gap: '8px', paddingLeft: '28px' }}>
                          <input
                            className="form-control"
                            placeholder={
                              split.mode === 'Online Prepaid'
                                ? 'OTA Ref / Booking ID (e.g. MMT-1029, AGODA-882)'
                                : split.mode === 'UPI'
                                ? 'UPI Ref / UTR (Optional)'
                                : split.mode === 'Card'
                                ? 'Card Auth / Transaction Code (Optional)'
                                : 'Reference / Cheque Number (Optional)'
                            }
                            style={{ fontSize: '11px', padding: '4px 8px', height: '30px' }}
                            value={split.utrRef}
                            onChange={(e) => handleUpdateSplit(split.id, 'utrRef', e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Split Balance Verification Bar */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background:
                      remainingBalanceDiff === 0
                        ? 'rgba(34, 197, 94, 0.08)'
                        : remainingBalanceDiff > 0
                        ? 'rgba(234, 179, 8, 0.08)'
                        : 'rgba(239, 68, 68, 0.08)',
                    border: `1px solid ${
                      remainingBalanceDiff === 0
                        ? 'rgba(34, 197, 94, 0.25)'
                        : remainingBalanceDiff > 0
                        ? 'rgba(234, 179, 8, 0.25)'
                        : 'rgba(239, 68, 68, 0.25)'
                    }`,
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '14px',
                    fontSize: '12px',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--text-2)' }}>Settlement Total: </span>
                    <strong style={{ fontSize: '13px' }}>{fmt(totalSplitsAmount)}</strong>
                  </div>

                  {remainingBalanceDiff === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--green)', fontWeight: 600 }}>
                      <CheckCircle2 size={14} /> Full Balance Settled
                    </div>
                  ) : remainingBalanceDiff > 0 ? (
                    <div style={{ color: 'var(--amber)', fontWeight: 600 }}>
                      {fmt(remainingBalanceDiff)} Remaining Unsettled
                    </div>
                  ) : (
                    <div style={{ color: 'var(--red)', fontWeight: 600 }}>
                      {fmt(Math.abs(remainingBalanceDiff))} Exceeds Balance
                    </div>
                  )}
                </div>

                {/* Payment Status selector */}
                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label">Payment Status</label>
                  <select
                    className="form-control"
                    value={payStatus}
                    onChange={(e) => setPayStatus(e.target.value)}
                  >
                    {PAYMENT_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* DYNAMIC UPI / QR VIEW */}
                {upiSplit && (
                  <div
                    style={{
                      background: 'var(--card-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '14px',
                      marginBottom: '14px',
                    }}
                  >
                    {config?.qrCodeUrl || upiId ? (
                      <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                        <div
                          style={{
                            width: '90px',
                            height: '90px',
                            background: '#fff',
                            padding: '5px',
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
                            <QRCodeSVG value={upiString} size={80} bgColor="#ffffff" fgColor="#000000" />
                          )}
                        </div>

                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '11px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Settlement QR · {fmt(upiAmount)}
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginTop: '2px' }}>
                            {payeeName}
                          </div>

                          {upiId && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
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
                      <div style={{ textAlign: 'center', padding: '8px 0' }}>
                        <QrCode size={22} style={{ margin: '0 auto 4px', color: 'var(--text-3)' }} />
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>
                          UPI / QR Code not configured
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
                {hasBankTransfer && config?.bankAccountNumber && (
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

                {/* Online Prepaid Channel Info */}
                {hasOnlinePrepaid && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      background: 'rgba(59, 130, 246, 0.08)',
                      border: '1px solid rgba(59, 130, 246, 0.25)',
                      borderRadius: 'var(--radius-sm)',
                      marginBottom: '14px',
                      fontSize: '12px',
                      color: 'var(--text)',
                    }}
                  >
                    <Globe size={16} color="var(--blue, #3b82f6)" style={{ flexShrink: 0 }} />
                    <div>
                      <strong>Online Prepaid Payment</strong>
                      <div style={{ color: 'var(--text-2)', fontSize: '11px', marginTop: '2px' }}>
                        Prepaid booking via OTA channel (Agoda, MMT, Booking.com, Goibibo) or website gateway.
                      </div>
                    </div>
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
          collected={collected + (payStatus === 'Paid' ? totalSplitsAmount : 0)}
          balance={Math.max(0, balance - (payStatus === 'Paid' ? totalSplitsAmount : 0))}
          onClose={() => setShowInvoice(false)}
        />
      )}
    </>
  )
}
