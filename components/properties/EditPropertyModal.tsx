'use client'

import { useState } from 'react'
import { X, Settings, Trash2, Check } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { Property, useProperty } from '@/context/PropertyContext'
import { broadcastChange } from '@/lib/realtime-sync'

interface Props {
  property: Property
  onClose: () => void
  onSuccess?: () => void
}

export default function EditPropertyModal({ property, onClose, onSuccess }: Props) {
  const { showToast } = useToast()
  const { reloadProperties, switchProperty } = useProperty()

  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: property.name,
    code: property.code,
    city: property.city,
    state: property.state,
    country: property.country,
    address: property.address || '',
    phone: property.phone || '',
    email: property.email || '',
    website: property.website || '',
    currency: property.currency || 'INR',
    currencySymbol: property.currencySymbol || '₹',
    taxRate: 0,
    checkInTime: property.checkInTime || '02:00 PM',
    checkOutTime: property.checkOutTime || '11:00 AM',
    coverImage: property.coverImage || '',
    isActive: property.isActive,
  })

  function handleChange(field: string, val: any) {
    setForm((prev) => ({ ...prev, [field]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`/api/properties/${property.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()
      if (!res.ok) {
        showToast(data.error || 'Failed to update property', 'error')
      } else {
        showToast(`Property "${data.name}" updated successfully!`, 'success')
        broadcastChange('PROPERTY_UPDATED', { propertyId: property.id })
        await reloadProperties()
        if (onSuccess) onSuccess()
        onClose()
      }
    } catch {
      showToast('Network error while updating property', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleActive() {
    const nextActive = !form.isActive
    if (!confirm(`Are you sure you want to ${nextActive ? 'activate' : 'deactivate'} "${property.name}"?`)) {
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/properties/${property.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: nextActive }),
      })
      const data = await res.json()
      if (res.ok) {
        showToast(`Property ${nextActive ? 'activated' : 'deactivated'}.`, 'success')
        broadcastChange('PROPERTY_UPDATED', { propertyId: property.id, isActive: nextActive })
        await reloadProperties()
        onClose()
      } else {
        showToast(data.error || 'Failed to update property status', 'error')
      }
    } catch {
      showToast('Network error', 'error')
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
      <div className="modal" style={{ maxWidth: '600px', width: '92%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={18} color="var(--red)" /> Property Settings · {property.name}
            <button onClick={onClose} className="btn-icon" style={{ marginLeft: 'auto', background: 'none', border: 'none' }}>
              <X size={16} />
            </button>
          </div>
          <div className="modal-subtitle">
            Configure {property.code} policies, contact information, and operating hours.
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Property Name</label>
                <input
                  className="form-control"
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  required
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Property Code</label>
                <input
                  className="form-control"
                  value={form.code}
                  onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">City</label>
                <input
                  className="form-control"
                  value={form.city}
                  onChange={(e) => handleChange('city', e.target.value)}
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

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Address</label>
              <input
                className="form-control"
                value={form.address}
                onChange={(e) => handleChange('address', e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Contact Phone</label>
                <input
                  className="form-control"
                  value={form.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Official Email</label>
                <input
                  className="form-control"
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Currency Symbol</label>
                <input
                  className="form-control"
                  value={form.currencySymbol}
                  onChange={(e) => handleChange('currencySymbol', e.target.value)}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Check-In Time</label>
                <input
                  className="form-control"
                  value={form.checkInTime}
                  onChange={(e) => handleChange('checkInTime', e.target.value)}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Check-Out Time</label>
                <input
                  className="form-control"
                  value={form.checkOutTime}
                  onChange={(e) => handleChange('checkOutTime', e.target.value)}
                />
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Cover Image URL</label>
              <input
                className="form-control"
                value={form.coverImage}
                onChange={(e) => handleChange('coverImage', e.target.value)}
              />
            </div>

            {/* Status Section */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                background: 'var(--card-2)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
              }}
            >
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>Property Status</div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                  {form.isActive ? 'Active and listed in property selector' : 'Deactivated / Inactive'}
                </div>
              </div>
              <button
                type="button"
                className={`btn btn-sm ${form.isActive ? 'btn-ghost' : 'btn-red'}`}
                onClick={handleToggleActive}
                disabled={loading}
              >
                {form.isActive ? 'Deactivate Property' : 'Reactivate Property'}
              </button>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-red" disabled={loading} style={{ gap: '6px' }}>
              {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Check size={14} />} Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
