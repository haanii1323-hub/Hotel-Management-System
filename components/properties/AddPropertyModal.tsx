'use client'

import { useState } from 'react'
import { X, Building, Plus, Check } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { useProperty } from '@/context/PropertyContext'
import { broadcastChange } from '@/lib/realtime-sync'

interface Props {
  onClose: () => void
  onSuccess?: () => void
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
    deluxeRooms: 6,
    deluxeRate: 3200,
    classicRooms: 6,
    classicRate: 2200,
    superiorRooms: 3,
    superiorRate: 5000,
  })

  function handleChange(field: string, val: any) {
    setForm((prev) => ({ ...prev, [field]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.code.trim() || !form.city.trim()) {
      showToast('Please fill in required fields (Name, Code, City)', 'error')
      return
    }

    setLoading(true)
    try {
      const categories = [
        { name: 'Classic', rate: Number(form.classicRate), roomCount: Number(form.classicRooms) },
        { name: 'Deluxe', rate: Number(form.deluxeRate), roomCount: Number(form.deluxeRooms) },
        { name: 'Superior', rate: Number(form.superiorRate), roomCount: Number(form.superiorRooms) },
      ]

      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          categories,
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
            Configure a separate hotel property with its own inventory, rates, currency, and bookings.
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
                  placeholder="Bangalore"
                  value={form.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  required
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">State</label>
                <input
                  className="form-control"
                  placeholder="Karnataka"
                  value={form.state}
                  onChange={(e) => handleChange('state', e.target.value)}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Country</label>
                <input
                  className="form-control"
                  placeholder="India"
                  value={form.country}
                  onChange={(e) => handleChange('country', e.target.value)}
                />
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Address</label>
              <input
                className="form-control"
                placeholder="e.g. 12 Indiranagar 100 Feet Road"
                value={form.address}
                onChange={(e) => handleChange('address', e.target.value)}
              />
            </div>

            {/* Financial & Time Policies */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Currency</label>
                <input
                  className="form-control"
                  value={form.currency}
                  onChange={(e) => handleChange('currency', e.target.value)}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Check-In</label>
                <input
                  className="form-control"
                  value={form.checkInTime}
                  onChange={(e) => handleChange('checkInTime', e.target.value)}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Check-Out</label>
                <input
                  className="form-control"
                  value={form.checkOutTime}
                  onChange={(e) => handleChange('checkOutTime', e.target.value)}
                />
              </div>
            </div>

            {/* Initial Room Categories */}
            <div
              style={{
                background: 'var(--card-2)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 14px',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '8px' }}>
                Initial Room Inventory &amp; Nightly Rates
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>Classic (Rooms / Rate)</div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input
                      className="form-control"
                      type="number"
                      title="Rooms"
                      placeholder="Rooms"
                      value={form.classicRooms}
                      onChange={(e) => handleChange('classicRooms', e.target.value)}
                    />
                    <input
                      className="form-control"
                      type="number"
                      title="Rate"
                      placeholder="₹ Rate"
                      value={form.classicRate}
                      onChange={(e) => handleChange('classicRate', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>Deluxe (Rooms / Rate)</div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input
                      className="form-control"
                      type="number"
                      title="Rooms"
                      placeholder="Rooms"
                      value={form.deluxeRooms}
                      onChange={(e) => handleChange('deluxeRooms', e.target.value)}
                    />
                    <input
                      className="form-control"
                      type="number"
                      title="Rate"
                      placeholder="₹ Rate"
                      value={form.deluxeRate}
                      onChange={(e) => handleChange('deluxeRate', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>Superior (Rooms / Rate)</div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input
                      className="form-control"
                      type="number"
                      title="Rooms"
                      placeholder="Rooms"
                      value={form.superiorRooms}
                      onChange={(e) => handleChange('superiorRooms', e.target.value)}
                    />
                    <input
                      className="form-control"
                      type="number"
                      title="Rate"
                      placeholder="₹ Rate"
                      value={form.superiorRate}
                      onChange={(e) => handleChange('superiorRate', e.target.value)}
                    />
                  </div>
                </div>
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
