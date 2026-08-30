'use client'

import { useState } from 'react'
import useSWR from 'swr'
import AppShell from '@/components/layout/AppShell'
import { Check, Plus, Trash2, BedDouble } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { useProperty } from '@/context/PropertyContext'
import { broadcastChange, useRealtimeSync } from '@/lib/realtime-sync'

const fetcher = (url: string) => fetch(url).then((r) => r.json())
const STATUSES = ['Available', 'Occupied', 'Cleaning', 'Maintenance', 'Out of Service']
const statusClass: Record<string, string> = {
  Available: 'available',
  Occupied: 'occupied',
  Cleaning: 'cleaning',
  Maintenance: 'maintenance',
  'Out of Service': 'out-of-service',
}

export default function PricingPage() {
  const { showToast } = useToast()
  const { currentProperty } = useProperty()
  const propertyId = currentProperty?.id || ''
  const currencySymbol = currentProperty?.currencySymbol || '₹'

  const { data: categories, mutate: mutateCategories } = useSWR(
    propertyId ? `/api/categories?propertyId=${propertyId}` : '/api/categories',
    fetcher,
    { refreshInterval: 5000 }
  )
  const { data: rooms, mutate: mutateRooms } = useSWR(
    propertyId ? `/api/rooms?propertyId=${propertyId}` : '/api/rooms',
    fetcher,
    { refreshInterval: 5000 }
  )

  // Rate editing
  const [editRate, setEditRate] = useState<Record<string, number>>({})
  const [savingRate, setSavingRate] = useState<Record<string, boolean>>({})

  // Add room form
  const [newRoomNo, setNewRoomNo] = useState('')
  const [newRoomCat, setNewRoomCat] = useState('')
  const [addingRoom, setAddingRoom] = useState(false)

  // Add category form
  const [showAddCat, setShowAddCat] = useState(false)
  const [catName, setCatName] = useState('')
  const [catRate, setCatRate] = useState('')
  const [addingCat, setAddingCat] = useState(false)
  useRealtimeSync(() => {
    mutateCategories()
    mutateRooms()
  })

  async function saveRate(cat: any) {
    const rate = editRate[cat.id]
    if (!rate || rate <= 0) {
      showToast('Invalid rate', 'error')
      return
    }
    setSavingRate((prev) => ({ ...prev, [cat.id]: true }))
    const res = await fetch('/api/categories', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: cat.id, nightlyRate: rate }),
    })
    setSavingRate((prev) => ({ ...prev, [cat.id]: false }))
    if (res.ok) {
      showToast(`${cat.name} rate updated to ${currencySymbol}${rate.toLocaleString('en-IN')}`, 'success')
      setEditRate((prev) => {
        const n = { ...prev }
        delete n[cat.id]
        return n
      })
      broadcastChange('CATEGORY_UPDATED', { categoryId: cat.id })
      mutateCategories()
    } else {
      showToast('Failed to update rate', 'error')
    }
  }

  async function updateRoomStatus(roomId: string, status: string) {
    const res = await fetch(`/api/rooms/${roomId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      showToast(`Room status updated to ${status}`, 'success')
      broadcastChange('ROOM_UPDATED', { roomId, status })
      mutateRooms()
    } else showToast('Failed to update room', 'error')
  }

  async function deleteRoom(roomId: string, roomNumber: string) {
    if (!confirm(`Remove room ${roomNumber}? This cannot be undone.`)) return
    const res = await fetch(`/api/rooms/${roomId}`, { method: 'DELETE' })
    if (res.ok) {
      showToast(`Room ${roomNumber} removed`, 'success')
      broadcastChange('ROOM_UPDATED', { roomId, action: 'deleted' })
      mutateRooms()
      mutateCategories()
    } else showToast('Failed to remove room', 'error')
  }

  async function addRoom() {
    if (!newRoomNo.trim()) {
      showToast('Room number required', 'error')
      return
    }
    setAddingRoom(true)
    const categoryName = newRoomCat || (categories && categories[0]?.name) || 'Classic'
    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        number: newRoomNo.trim(),
        categoryName,
        propertyId,
      }),
    })
    const data = await res.json()
    setAddingRoom(false)
    if (res.ok) {
      showToast(`Room ${newRoomNo} added to ${currentProperty?.name}`, 'success')
      setNewRoomNo('')
      broadcastChange('ROOM_CREATED', { roomId: data.id })
      mutateRooms()
      mutateCategories()
    } else showToast(data.error || 'Failed to add room', 'error')
  }

  async function addCategory() {
    if (!catName.trim() || !catRate) {
      showToast('Category name and nightly rate required', 'error')
      return
    }
    setAddingCat(true)
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: catName.trim(),
        nightlyRate: Number(catRate),
        propertyId,
      }),
    })
    const data = await res.json()
    setAddingCat(false)
    if (res.ok) {
      showToast(`Category "${catName}" added!`, 'success')
      setCatName('')
      setCatRate('')
      setShowAddCat(false)
      broadcastChange('CATEGORY_UPDATED', { categoryId: data.id })
      mutateCategories()
    } else {
      showToast(data.error || 'Failed to create category', 'error')
    }
  }

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">Pricing &amp; Rooms · {currentProperty?.name}</h1>
          <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px' }}>
            {currentProperty?.code} · {currentProperty?.city} · Currency: {currentProperty?.currency} ({currencySymbol})
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowAddCat(!showAddCat)}>
          <Plus size={14} /> Add Category
        </button>
      </div>

      {/* Add Category Drawer / Inline */}
      {showAddCat && (
        <div
          style={{
            background: 'var(--card-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '14px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap',
          }}
        >
          <input
            className="form-control"
            style={{ width: '180px' }}
            placeholder="Category name (e.g. Studio)"
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
          />
          <input
            className="form-control"
            style={{ width: '140px' }}
            type="number"
            placeholder={`Rate (${currencySymbol})`}
            value={catRate}
            onChange={(e) => setCatRate(e.target.value)}
          />
          <button className="btn btn-red btn-sm" onClick={addCategory} disabled={addingCat}>
            {addingCat ? <span className="spinner" style={{ width: 12, height: 12 }} /> : 'Create Category'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowAddCat(false)}>
            Cancel
          </button>
        </div>
      )}

      {/* Category Rate Cards */}
      <div className="pricing-grid">
        {(categories || []).map((cat: any) => (
          <div key={cat.id} className="pricing-card">
            <div className="pricing-card-name">{cat.name}</div>
            <div className="pricing-card-meta">
              {cat.rooms?.length || 0} rooms · Nightly base rate
            </div>
            <div className="pricing-rate-label">Nightly rate</div>
            <div className="pricing-rate-row">
              <span style={{ fontSize: '16px', color: 'var(--text-2)', marginRight: '2px' }}>{currencySymbol}</span>
              <input
                className="pricing-rate-input"
                type="number"
                value={editRate[cat.id] ?? cat.nightlyRate}
                onChange={(e) => setEditRate((prev) => ({ ...prev, [cat.id]: Number(e.target.value) }))}
                min={1}
              />
              {editRate[cat.id] !== undefined && editRate[cat.id] !== cat.nightlyRate && (
                <button className="btn btn-red btn-sm" onClick={() => saveRate(cat)} disabled={savingRate[cat.id]}>
                  {savingRate[cat.id] ? (
                    <span className="spinner" style={{ width: 12, height: 12 }} />
                  ) : (
                    <Check size={14} />
                  )}
                  Save
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Room Inventory Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <h2 style={{ fontSize: '18px', fontWeight: 700 }}>
          Room Inventory ({rooms?.length || 0} Rooms in {currentProperty?.code})
        </h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            className="form-control"
            style={{ width: '160px' }}
            placeholder="Room number (e.g. 101)"
            value={newRoomNo}
            onChange={(e) => setNewRoomNo(e.target.value)}
          />
          <select
            className="form-control"
            style={{ width: '140px' }}
            value={newRoomCat || (categories && categories[0]?.name) || ''}
            onChange={(e) => setNewRoomCat(e.target.value)}
          >
            {(categories || []).map((c: any) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
          <button className="btn btn-red" onClick={addRoom} disabled={addingRoom}>
            {addingRoom ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Plus size={14} />}
            Add room
          </button>
        </div>
      </div>

      {/* Room Grid grouped by category */}
      {(categories || []).map((cat: any) => {
        const catRooms = (rooms || []).filter((r: any) => r.category?.name === cat.name || r.categoryId === cat.id)
        if (catRooms.length === 0) return null
        return (
          <div key={cat.id} style={{ marginBottom: '24px' }}>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-2)',
                marginBottom: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              {cat.name} ({catRooms.length}) · {currencySymbol}
              {cat.nightlyRate}/night
            </div>
            <div className="room-inventory-grid">
              {catRooms.map((room: any) => (
                <div key={room.id} className={`room-card ${statusClass[room.status] || 'available'}`}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div className="room-number">{room.number}</div>
                      <div className="room-category-label">{room.category?.name || cat.name}</div>
                    </div>
                    <button
                      className="btn-icon"
                      style={{ padding: '4px', border: 'none', background: 'none', color: 'var(--text-3)' }}
                      onClick={() => deleteRoom(room.id, room.number)}
                      title="Remove room"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <select
                    className="room-status-select"
                    value={room.status}
                    onChange={(e) => updateRoomStatus(room.id, e.target.value)}
                    disabled={room.status === 'Occupied'}
                  >
                    {STATUSES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </AppShell>
  )
}
