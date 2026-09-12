'use client'

import { useState } from 'react'
import { X, Building, Plus, Trash2 } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { useProperty } from '@/context/PropertyContext'
import { broadcastChange } from '@/lib/realtime-sync'

interface Props {
  onClose: () => void
  onSuccess?: () => void
}

interface CategoryInput {
  name: string
  roomCount: number
  rate: number
}

export default function AddPropertyModal({ onClose, onSuccess }: Props) {
  const { showToast } = useToast()
  const { reloadProperties, switchProperty } = useProperty()

  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    code: '',
    city: 'Bangalore',
    state: 'Karnataka',
    country: 'India',
    address: '',
    phone: '',
    email: '',
    website: '',
    currency: 'INR',
    currencySymbol: '₹',
    timezone: 'Asia/Kolkata',
    taxRate: 0,
    checkInTime: '02:00 PM',
    checkOutTime: '11:00 AM',
    coverImage: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
  })

  const [categories, setCategories] = useState<CategoryInput[]>([
    { name: 'Standard', roomCount: 6, rate: 2500 },
    { name: 'Deluxe', roomCount: 5, rate: 3500 },
    { name: 'Superior', roomCount: 3, rate: 5500 },
  ])

  function handleChange(field: string, val: any) {
    setForm((prev) => ({ ...prev, [field]: val }))
  }

  function handleCategoryChange(idx: number, field: keyof CategoryInput, val: any) {
    setCategories((prev) => {
      const next = [...prev]
      next[idx] = {
        ...next[idx],
        [field]: field === 'name' ? val : Math.max(0, Number(val) || 0),
      }
      return next
    })
  }

  function addCategoryRow() {
    setCategories((prev) => [...prev, { name: '', roomCount: 2, rate: 2000 }])
  }

  function removeCategoryRow(idx: number) {
    if (categories.length <= 1) {
      showToast('Property must have at least one room category', 'error')
      return
    }
    setCategories((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.code.trim() || !form.city.trim()) {
      showToast('Please fill in required fields (Name, Code, City)', 'error')
      return
    }

    const validCategories = categories.filter((c) => c.name.trim().length > 0)
    if (validCategories.length === 0) {
      showToast('Please specify at least one category name', 'error')
      return
    }

    setLoading(true)
    try {
      const formattedCategories = validCategories.map((c) => ({
        name: c.name.trim(),
        rate: Number(c.rate),
        roomCount: Number(c.roomCount),
      }))

      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          categories: formattedCategories,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        showToast(data.error || 'Failed to create property', 'error')
      } else {
        showToast(`Property "${data.name}" created successfully!`, 'success')
        broadcastChange('PROPERTY_UPDATED', { propertyId: data.id })
        await reloadProperties()
        await switchProperty(data.id)
        if (onSuccess) onSuccess()
        onClose()
      }
    } catch {
      showToast('Network error while creating property', 'error')
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
      style={{ zIndex: 1200 }}
    >
      <div className="modal" style={{ maxWidth: '640px', width: '92%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building size={18} color="var(--red)" /> Add New Company / Property
            <button onClick={onClose} className="btn-icon" style={{ marginLeft: 'auto', background: 'none', border: 'none' }}>
              <X size={16} />
            </button>
          </div>
          <div className="modal-subtitle">
            Configure a separate hotel property with its own custom categories, inventory, rates, and currency.
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Primary Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Property Name *</label>
                <input
                  className="form-control"
                  placeholder="e.g. Skyline Business Hotel"
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  required
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Property Code *</label>
                <input
                  className="form-control"
                  placeholder="e.g. BLR5412"
                  value={form.code}
                  onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
                  required
                />
              </div>
            </div>

            {/* Location */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">City *</label>
                <input
                  className="form-control"
                  value={form.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  required
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">State</label>
                <input
                  className="form-control"
                  value={form.state}
                  onChange={(e) => handleChange('state', e.target.value)}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Country</label>
                <input
                  className="form-control"
                  value={form.country}
                  onChange={(e) => handleChange('country', e.target.value)}
                />
              </div>
            </div>

            {/* Contact Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Contact Phone</label>
                <input
                  className="form-control"
                  placeholder="+91 80 4112 3396"
                  value={form.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Contact Email</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="info@hotel.com"
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                />
              </div>
            </div>

            {/* Currency & Tax */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Currency</label>
                <select
                  className="form-control"
                  value={form.currency}
                  onChange={(e) => {
                    const c = e.target.value
                    handleChange('currency', c)
                    handleChange('currencySymbol', c === 'USD' ? '$' : c === 'EUR' ? '€' : c === 'GBP' ? '£' : '₹')
                  }}
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="AED">AED (د.إ)</option>
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Tax Rate (%)</label>
                <input
                  type="number"
                  className="form-control"
                  value={form.taxRate}
                  onChange={(e) => handleChange('taxRate', Number(e.target.value))}
                  min={0}
                  max={100}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Check-in / Check-out</label>
                <input
                  className="form-control"
                  value={`${form.checkInTime} / ${form.checkOutTime}`}
                  readOnly
                  style={{ opacity: 0.8 }}
                />
              </div>
            </div>

            {/* Custom Room Categories for this Property */}
            <div
              style={{
                background: 'var(--card-2)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                    Room Categories &amp; Inventory for this Property
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                    Add custom category types specific to this hotel (e.g. Standard, Suite, Villa, Dorm...)
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={addCategoryRow}
                  style={{ fontSize: '11.5px', padding: '4px 8px' }}
                >
                  <Plus size={12} /> Add Type
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {categories.map((cat, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      className="form-control"
                      style={{ flex: 2 }}
                      placeholder="Category name (e.g. Suite)"
                      value={cat.name}
                      onChange={(e) => handleCategoryChange(idx, 'name', e.target.value)}
                    />
                    <input
                      className="form-control"
                      style={{ flex: 1 }}
                      type="number"
                      placeholder="Rooms"
                      value={cat.roomCount}
                      onChange={(e) => handleCategoryChange(idx, 'roomCount', e.target.value)}
                      min={0}
                    />
                    <input
                      className="form-control"
                      style={{ flex: 1.2 }}
                      type="number"
                      placeholder={`${form.currencySymbol} Rate`}
                      value={cat.rate}
                      onChange={(e) => handleCategoryChange(idx, 'rate', e.target.value)}
                      min={0}
                    />
                    {categories.length > 1 && (
                      <button
                        type="button"
                        className="btn-icon"
                        style={{ padding: '6px', color: 'var(--red)', background: 'none', border: 'none' }}
                        onClick={() => removeCategoryRow(idx)}
                        title="Remove category"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Cover Image URL */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Property Cover Image URL</label>
              <input
                className="form-control"
                placeholder="https://..."
                value={form.coverImage}
                onChange={(e) => handleChange('coverImage', e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-red" disabled={loading} style={{ gap: '6px' }}>
              {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Plus size={14} />} Create Property
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
