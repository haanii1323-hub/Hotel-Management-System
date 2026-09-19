'use client'

import React, { useState, useEffect, useRef } from 'react'
import useSWR from 'swr'
import {
  QrCode,
  Building2,
  CreditCard,
  Banknote,
  Upload,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Save,
  Eye,
  EyeOff,
  Sparkles,
  Smartphone,
  ShieldCheck,
  Check,
  RefreshCw,
} from 'lucide-react'
import { useProperty } from '@/context/PropertyContext'
import { useToast } from '@/components/ui/Toast'
import { broadcastChange } from '@/lib/realtime-sync'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function PaymentSettingsTab() {
  const { currentProperty } = useProperty()
  const propertyId = currentProperty?.id || ''
  const { showToast } = useToast()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [uploadingQr, setUploadingQr] = useState(false)
  const [showAccountNo, setShowAccountNo] = useState(false)

  const { data: configData, mutate, isLoading } = useSWR(
    propertyId ? `/api/payment-config?propertyId=${propertyId}` : null,
    fetcher,
    { revalidateOnFocus: true }
  )

  const [form, setForm] = useState({
    upiEnabled: true,
    upiId: '',
    upiDisplayName: '',
    upiMerchantName: '',
    upiPhone: '',
    qrCodeUrl: '',
    qrCodeFileName: '',
    cashEnabled: true,
    cardEnabled: true,
    bankTransferEnabled: false,
    chequeEnabled: false,
    otherEnabled: false,
    cardProvider: '',
    cardInstructions: '',
    bankAccountName: '',
    bankName: '',
    bankAccountNumber: '',
    bankIfsc: '',
    bankBranch: '',
    bankAccountType: 'Current',
    paymentInstructions: '',
  })

  useEffect(() => {
    if (configData) {
      setForm({
        upiEnabled: configData.upiEnabled ?? true,
        upiId: configData.upiId || '',
        upiDisplayName: configData.upiDisplayName || currentProperty?.name || '',
        upiMerchantName: configData.upiMerchantName || currentProperty?.name || '',
        upiPhone: configData.upiPhone || currentProperty?.phone || '',
        qrCodeUrl: configData.qrCodeUrl || '',
        qrCodeFileName: configData.qrCodeFileName || '',
        cashEnabled: configData.cashEnabled ?? true,
        cardEnabled: configData.cardEnabled ?? true,
        bankTransferEnabled: configData.bankTransferEnabled ?? false,
        chequeEnabled: configData.chequeEnabled ?? false,
        otherEnabled: configData.otherEnabled ?? false,
        cardProvider: configData.cardProvider || '',
        cardInstructions: configData.cardInstructions || '',
        bankAccountName: configData.bankAccountName || '',
        bankName: configData.bankName || '',
        bankAccountNumber: configData.bankAccountNumber || '',
        bankIfsc: configData.bankIfsc || '',
        bankBranch: configData.bankBranch || '',
        bankAccountType: configData.bankAccountType || 'Current',
        paymentInstructions: configData.paymentInstructions || '',
      })
    }
  }, [configData, currentProperty])

  const update = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }))

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type)) {
      showToast('Please upload a valid image file (PNG, JPG, JPEG, or WebP)', 'error')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size exceeds 5MB limit', 'error')
      return
    }

    setUploadingQr(true)
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = reader.result as string
      try {
        const res = await fetch('/api/payment-config/upload-qr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            propertyId,
            qrCodeDataUrl: dataUrl,
            fileName: file.name,
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          showToast(data.error || 'Failed to upload QR code', 'error')
        } else {
          update('qrCodeUrl', data.qrCodeUrl)
          update('qrCodeFileName', data.fileName)
          update('upiEnabled', true)
          showToast('Hotel QR Code uploaded and saved successfully!', 'success')
          broadcastChange('PAYMENT_CONFIG_UPDATED', { propertyId })
          mutate()
        }
      } catch {
        showToast('Error uploading QR code', 'error')
      } finally {
        setUploadingQr(false)
      }
    }
    reader.readAsDataURL(file)
  }

  async function handleRemoveQr() {
    if (!confirm('Are you sure you want to remove this QR code?')) return
    setUploadingQr(true)
    try {
      const res = await fetch('/api/payment-config/upload-qr', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId }),
      })
      if (res.ok) {
        update('qrCodeUrl', '')
        update('qrCodeFileName', '')
        showToast('QR Code removed', 'success')
        broadcastChange('PAYMENT_CONFIG_UPDATED', { propertyId })
        mutate()
      }
    } catch {
      showToast('Failed to remove QR code', 'error')
    } finally {
      setUploadingQr(false)
    }
  }

  async function handleSaveConfig(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch('/api/payment-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          ...form,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        showToast(data.error || 'Failed to save payment settings', 'error')
      } else {
        showToast('Payment settings saved and synced across all devices!', 'success')
        broadcastChange('PAYMENT_CONFIG_UPDATED', { propertyId })
        mutate()
      }
    } catch {
      showToast('Network error while saving payment settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!currentProperty) {
    return (
      <div className="empty-state" style={{ padding: '60px 20px' }}>
        <Building2 size={36} style={{ margin: '0 auto 12px', color: 'var(--text-3)' }} />
        <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>No Property Selected</div>
        <div style={{ fontSize: '13px', color: 'var(--text-2)', maxWidth: '400px', margin: '0 auto' }}>Please create or select a property to configure payment details.</div>
      </div>
    )
  }

  const isConfigured = Boolean(form.upiId?.trim()) || Boolean(form.qrCodeUrl) || Boolean(form.bankAccountNumber?.trim())

  return (
    <div style={{ maxWidth: '920px', margin: '0 auto' }}>
      {/* Property Context Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '16px 20px',
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '24px',
        }}
      >
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
            Configuring Payment Details For
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
            <span>{currentProperty.name}</span>
            <span style={{ fontSize: '12px', padding: '2px 8px', background: 'var(--card-2)', borderRadius: '4px', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
              {currentProperty.code}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isConfigured ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--green)', fontWeight: 600 }}>
              <CheckCircle2 size={14} /> Active &amp; Ready
            </span>
          ) : (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--amber)', fontWeight: 600 }}>
              <AlertCircle size={14} /> Not Fully Configured
            </span>
          )}
        </div>
      </div>

      <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* SECTION 1: ACCEPTED PAYMENT METHODS */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <CreditCard size={18} color="var(--red)" />
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Accepted Payment Methods</h3>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-2)', marginBottom: '16px' }}>
            Enable or disable the payment modes accepted at this property. Only enabled methods will appear on the Front Desk check-in, booking checkout, and payment collection screens.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            {/* Cash */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 14px',
                background: form.cashEnabled ? 'var(--card-2)' : 'var(--card)',
                border: form.cashEnabled ? '1px solid var(--red)' : '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <input
                type="checkbox"
                checked={form.cashEnabled}
                onChange={(e) => update('cashEnabled', e.target.checked)}
                style={{ width: 16, height: 16, accentColor: 'var(--red)' }}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>Cash Payments</div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>Front desk counter cash</div>
              </div>
            </label>

            {/* UPI / QR */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 14px',
                background: form.upiEnabled ? 'var(--card-2)' : 'var(--card)',
                border: form.upiEnabled ? '1px solid var(--red)' : '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <input
                type="checkbox"
                checked={form.upiEnabled}
                onChange={(e) => update('upiEnabled', e.target.checked)}
                style={{ width: 16, height: 16, accentColor: 'var(--red)' }}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>UPI / QR Code</div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>Instant QR &amp; VPA scan</div>
              </div>
            </label>

            {/* Credit/Debit Card */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 14px',
                background: form.cardEnabled ? 'var(--card-2)' : 'var(--card)',
                border: form.cardEnabled ? '1px solid var(--red)' : '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <input
                type="checkbox"
                checked={form.cardEnabled}
                onChange={(e) => update('cardEnabled', e.target.checked)}
                style={{ width: 16, height: 16, accentColor: 'var(--red)' }}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>Card (POS / Swipe)</div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>Credit &amp; Debit cards</div>
              </div>
            </label>

            {/* Bank Transfer */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 14px',
                background: form.bankTransferEnabled ? 'var(--card-2)' : 'var(--card)',
                border: form.bankTransferEnabled ? '1px solid var(--red)' : '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <input
                type="checkbox"
                checked={form.bankTransferEnabled}
                onChange={(e) => update('bankTransferEnabled', e.target.checked)}
                style={{ width: 16, height: 16, accentColor: 'var(--red)' }}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>Bank Transfer (NEFT/RTGS/IMPS)</div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>Direct account deposit</div>
              </div>
            </label>

            {/* Cheque */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 14px',
                background: form.chequeEnabled ? 'var(--card-2)' : 'var(--card)',
                border: form.chequeEnabled ? '1px solid var(--red)' : '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <input
                type="checkbox"
                checked={form.chequeEnabled}
                onChange={(e) => update('chequeEnabled', e.target.checked)}
                style={{ width: 16, height: 16, accentColor: 'var(--red)' }}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>Cheque</div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>Corporate &amp; bulk cheques</div>
              </div>
            </label>

            {/* Other */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 14px',
                background: form.otherEnabled ? 'var(--card-2)' : 'var(--card)',
                border: form.otherEnabled ? '1px solid var(--red)' : '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <input
                type="checkbox"
                checked={form.otherEnabled}
                onChange={(e) => update('otherEnabled', e.target.checked)}
                style={{ width: 16, height: 16, accentColor: 'var(--red)' }}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>Other Modes</div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>OTA direct &amp; vouchers</div>
              </div>
            </label>
          </div>
        </div>

        {/* SECTION 2: UPI & QR CODE CONFIGURATION */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <QrCode size={18} color="var(--red)" />
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>UPI &amp; QR Code Configuration</h3>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.upiEnabled}
                onChange={(e) => update('upiEnabled', e.target.checked)}
                style={{ accentColor: 'var(--red)' }}
              />
              <span>Enable UPI for this hotel</span>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }} className="settings-grid-2col">
            {/* Left: UPI Inputs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">UPI ID / VPA *</label>
                <input
                  className="form-control"
                  placeholder="e.g. yourhotel@okaxis, 9876543210@upi"
                  value={form.upiId}
                  onChange={(e) => update('upiId', e.target.value)}
                  style={{ fontFamily: 'monospace', fontSize: '14px' }}
                />
                <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '4px' }}>
                  Guests and staff can copy or trigger direct UPI payments with this VPA.
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Business / Payee Display Name</label>
                <input
                  className="form-control"
                  placeholder="e.g. Royal Orchid Hospitality"
                  value={form.upiDisplayName}
                  onChange={(e) => update('upiDisplayName', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Merchant / Contact Phone (Optional)</label>
                <input
                  className="form-control"
                  placeholder="e.g. +91 9876543210"
                  value={form.upiPhone}
                  onChange={(e) => update('upiPhone', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Payment Instructions for Guest</label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="e.g. Scan QR code using PhonePe, Google Pay, or Paytm. Mention booking reference in note."
                  value={form.paymentInstructions}
                  onChange={(e) => update('paymentInstructions', e.target.value)}
                />
              </div>
            </div>

            {/* Right: Upload Real Hotel QR Code */}
            <div>
              <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>
                Hotel UPI QR Code
              </label>

              {form.qrCodeUrl ? (
                <div
                  style={{
                    background: 'var(--card-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '16px',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      width: '180px',
                      height: '180px',
                      margin: '0 auto 12px',
                      background: '#fff',
                      padding: '8px',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                    }}
                  >
                    <img
                      src={form.qrCodeUrl}
                      alt="Hotel QR Code"
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  </div>

                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', marginBottom: '2px' }}>
                    {form.qrCodeFileName || 'Hotel Custom QR Code'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--green)', marginBottom: '12px' }}>
                    Active &amp; Visible on Invoices &amp; Checkout
                  </div>

                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingQr}
                    >
                      <RefreshCw size={13} /> Replace QR
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={handleRemoveQr}
                      disabled={uploadingQr}
                      style={{ color: 'var(--red)' }}
                    >
                      <Trash2 size={13} /> Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '32px 16px',
                    textAlign: 'center',
                    background: 'var(--card-2)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  className="upload-dropzone"
                >
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: 'rgba(124, 92, 255, 0.15)',
                      color: 'var(--accent-highlight, #A78BFA)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 12px',
                    }}
                  >
                    <Upload size={20} />
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text)', marginBottom: '4px' }}>
                    {uploadingQr ? 'Uploading QR Code...' : 'Upload Hotel UPI QR Code'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-3)', maxWidth: '260px', margin: '0 auto 8px' }}>
                    PNG, JPG, JPEG, or WebP (Max 5MB)
                  </div>
                  <button type="button" className="btn btn-red btn-sm" style={{ margin: '0 auto', gap: '6px' }}>
                    <Upload size={13} /> Choose Image
                  </button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: BANK TRANSFER CONFIGURATION */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Banknote size={18} color="var(--red)" />
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Bank Account Details (NEFT / RTGS / IMPS)</h3>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.bankTransferEnabled}
                onChange={(e) => update('bankTransferEnabled', e.target.checked)}
                style={{ accentColor: 'var(--red)' }}
              />
              <span>Enable Bank Transfers</span>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="settings-grid-2col">
            <div className="form-group">
              <label className="form-label">Account Holder / Beneficiary Name</label>
              <input
                className="form-control"
                placeholder="e.g. Royal Heritage Hospitality Pvt Ltd"
                value={form.bankAccountName}
                onChange={(e) => update('bankAccountName', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Bank Name</label>
              <input
                className="form-control"
                placeholder="e.g. HDFC Bank / State Bank of India / ICICI Bank"
                value={form.bankName}
                onChange={(e) => update('bankName', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Account Number</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-control"
                  type={showAccountNo ? 'text' : 'password'}
                  placeholder="e.g. 50200012345678"
                  value={form.bankAccountNumber}
                  onChange={(e) => update('bankAccountNumber', e.target.value)}
                  style={{ fontFamily: 'monospace', paddingRight: '36px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowAccountNo(!showAccountNo)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-3)',
                    cursor: 'pointer',
                  }}
                  title={showAccountNo ? 'Hide' : 'Reveal'}
                >
                  {showAccountNo ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">IFSC Code</label>
              <input
                className="form-control"
                placeholder="e.g. HDFC0001234"
                value={form.bankIfsc}
                onChange={(e) => update('bankIfsc', e.target.value.toUpperCase())}
                style={{ fontFamily: 'monospace', textTransform: 'uppercase' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Branch Name</label>
              <input
                className="form-control"
                placeholder="e.g. MG Road Branch, Bangalore"
                value={form.bankBranch}
                onChange={(e) => update('bankBranch', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Account Type</label>
              <select
                className="form-control"
                value={form.bankAccountType}
                onChange={(e) => update('bankAccountType', e.target.value)}
              >
                <option value="Current">Current Account</option>
                <option value="Savings">Savings Account</option>
                <option value="Overdraft">Overdraft / Cash Credit</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 4: CARD & POS CONFIGURATION */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CreditCard size={18} color="var(--red)" />
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Card &amp; POS Machine Settings</h3>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.cardEnabled}
                onChange={(e) => update('cardEnabled', e.target.checked)}
                style={{ accentColor: 'var(--red)' }}
              />
              <span>Enable Card Payments</span>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="settings-grid-2col">
            <div className="form-group">
              <label className="form-label">POS Gateway / Machine Provider</label>
              <input
                className="form-control"
                placeholder="e.g. Pine Labs, Razorpay POS, HDFC Merchant Swipe"
                value={form.cardProvider}
                onChange={(e) => update('cardProvider', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Card Instructions for Staff</label>
              <input
                className="form-control"
                placeholder="e.g. Collect 4-digit terminal auth code on charge slip"
                value={form.cardInstructions}
                onChange={(e) => update('cardInstructions', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Bottom Save Action Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            position: 'sticky',
            bottom: '16px',
            zIndex: 100,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-3)' }}>
            <ShieldCheck size={15} color="var(--green)" /> Property-Specific &amp; Encrypted
          </div>

          <button
            type="submit"
            className="btn btn-red"
            style={{ padding: '10px 24px', fontSize: '14px', gap: '8px' }}
            disabled={saving}
          >
            {saving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Save size={15} />}
            <span>Save Payment Settings</span>
          </button>
        </div>
      </form>
    </div>
  )
}
