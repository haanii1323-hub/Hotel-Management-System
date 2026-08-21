'use client'
import { useState } from 'react'
import useSWR from 'swr'
import AppShell from '@/components/layout/AppShell'
import { Check, Pencil, Plus, Trash2 } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

const fetcher = (url: string) => fetch(url).then(r => r.json())
const STATUSES = ['Available', 'Occupied', 'Cleaning', 'Maintenance', 'Out of Service']
const statusClass: Record<string, string> = {
  Available: 'available', Occupied: 'occupied', Cleaning: 'cleaning',
  Maintenance: 'maintenance', 'Out of Service': 'out-of-service'
}

export default function PricingPage() {
  const { showToast } = useToast()
  const { data: categories, mutate: mutateCategories } = useSWR('/api/categories', fetcher, { refreshInterval: 5000 })
  const { data: rooms, mutate: mutateRooms } = useSWR('/api/rooms', fetcher, { refreshInterval: 5000 })

  // Rate editing
  const [editRate, setEditRate] = useState<Record<string, number>>({})
  const [savingRate, setSavingRate] = useState<Record<string, boolean>>({})

  // Add room form
  const [newRoomNo, setNewRoomNo] = useState('')
  const [newRoomCat, setNewRoomCat] = useState('Deluxe')
  const [addingRoom, setAddingRoom] = useState(false)

  async function saveRate(cat: any) {
    const rate = editRate[cat.id]
    if (!rate || rate <= 0) { showToast('Invalid rate', 'error'); return }
    setSavingRate(prev => ({ ...prev, [cat.id]: true }))
    const res = await fetch('/api/categories', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: cat.id, nightlyRate: rate }),
    })
    setSavingRate(prev => ({ ...prev, [cat.id]: false }))
    if (res.ok) {
      showToast(`${cat.name} rate updated to ₹${rate.toLocaleString('en-IN')}`, 'success')
      setEditRate(prev => { const n = { ...prev }; delete n[cat.id]; return n })
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
      showToast('Room status updated', 'success')
      mutateRooms()
    } else showToast('Failed to update room', 'error')
  }

  async function deleteRoom(roomId: string, roomNumber: string) {
    if (!confirm(`Remove room ${roomNumber}? This cannot be undone.`)) return
    const res = await fetch(`/api/rooms/${roomId}`, { method: 'DELETE' })
    if (res.ok) {
      showToast(`Room ${roomNumber} removed`, 'success')
      mutateRooms(); mutateCategories()
    } else showToast('Failed to remove room', 'error')
  }

  async function addRoom() {
    if (!newRoomNo.trim()) { showToast('Room number required', 'error'); return }
    setAddingRoom(true)
    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: newRoomNo, categoryName: newRoomCat }),
    })
    const data = await res.json()
    setAddingRoom(false)
    if (res.ok) {
      showToast(`Room ${newRoomNo} added`, 'success')
      setNewRoomNo('')
      mutateRooms(); mutateCategories()
    } else showToast(data.error || 'Failed to add room', 'error')
  }

  return (
    <AppShell>
      <div className="page-header">
        <h1 className="page-title">Pricing &amp; Rooms</h1>
      </div>

      {/* Category Rate Cards */}
      <div className="pricing-grid">
        {(categories || []).map((cat: any) => (
          <div key={cat.id} className="pricing-card">
            <div className="pricing-card-name">{cat.name}</div>
            <div className="pricing-card-meta">
              {cat.rooms?.length || 0} rooms · {cat.roomNightsSold || 0} room nights sold
            </div>
            <div className="pricing-rate-label">Nightly rate</div>
            <div className="pricing-rate-row">
              <span style={{ fontSize: '16px', color: 'var(--text-2)', marginRight: '2px' }}>₹</span>
              <input
                className="pricing-rate-input"
                type="number"
                value={editRate[cat.id] ?? cat.nightlyRate}
                onChange={e => setEditRate(prev => ({ ...prev, [cat.id]: Number(e.target.value) }))}
                min={1}
              />
              {editRate[cat.id] !== undefined && editRate[cat.id] !== cat.nightlyRate && (
                <button
                  className="btn btn-red btn-sm"
                  onClick={() => saveRate(cat)}
                  disabled={savingRate[cat.id]}
                >
                  {savingRate[cat.id] ? <span className="spinner" style={{ width: 12, height: 12 }} /> : <Check size={14} />}
                  Save
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Room Inventory */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Room Inventory</h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            className="form-control"
            style={{ width: '160px' }}
            placeholder="Room number"
            value={newRoomNo}
            onChange={e => setNewRoomNo(e.target.value)}
          />
          <select
            className="form-control"
            style={{ width: '120px' }}
            value={newRoomCat}
            onChange={e => setNewRoomCat(e.target.value)}
          >
            {(categories || []).map((c: any) => <option key={c.id}>{c.name}</option>)}
          </select>
          <button className="btn btn-red" onClick={addRoom} disabled={addingRoom}>
            {addingRoom ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Plus size={14} />}
            Add room
          </button>
        </div>
      </div>

      {/* Room Grid grouped by category */}
      {(categories || []).map((cat: any) => {
        const catRooms = (rooms || []).filter((r: any) => r.category?.name === cat.name)
        if (catRooms.length === 0) return null
        return (
          <div key={cat.id} style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {cat.name} ({catRooms.length})
            </div>
            <div className="room-inventory-grid">
              {catRooms.map((room: any) => (
                <div key={room.id} className={`room-card ${statusClass[room.status] || 'available'}`}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div className="room-number">{room.number}</div>
                      <div className="room-category-label">{room.category?.name}</div>
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
                    onChange={e => updateRoomStatus(room.id, e.target.value)}
                    disabled={room.status === 'Occupied'}
                  >
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
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
