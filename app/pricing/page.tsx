'use client'

import { useState } from 'react'
import useSWR from 'swr'
import AppShell from '@/components/layout/AppShell'
import { Check, Plus, Trash2, BedDouble, Pencil, X, Tag } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { useProperty } from '@/context/PropertyContext'
import { broadcastChange, useRealtimeSync } from '@/lib/realtime-sync'

const fetcher = (url: string) => fetch(url).then((r) => r.json())
const STATUSES = ['Available', 'Occupied', 'Cleaning', 'Maintenance', 'Out of Service']
const BED_TYPES = ['King Bed', 'Queen Bed', 'Twin Beds', 'Single Bed', 'Double Bed']

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

  // Category rename inline
  const [editingCatId, setEditingCatId] = useState<string | null>(null)
  const [editCatName, setEditCatName] = useState('')
  const [savingCatName, setSavingCatName] = useState(false)

  // Add room form
  const [newRoomNo, setNewRoomNo] = useState('')
  const [newRoomCat, setNewRoomCat] = useState('')
  const [addingRoom, setAddingRoom] = useState(false)

  // Edit room modal state
  const [editingRoom, setEditingRoom] = useState<any | null>(null)
  const [editForm, setEditForm] = useState({
    number: '',
    categoryName: '',
    floor: 1,
    bedType: 'King Bed',
    status: 'Available',
  })
  const [savingRoomEdit, setSavingRoomEdit] = useState(false)

  // Add category form
  const [showAddCat, setShowAddCat] = useState(false)
  const [catName, setCatName] = useState('')
  const [catRate, setCatRate] = useState('')
  const [addingCat, setAddingCat] = useState(false)
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null)

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

  async function saveCategoryName(cat: any) {
    if (!editCatName.trim()) {
      showToast('Category name cannot be empty', 'error')
      return
    }
    setSavingCatName(true)
    try {
      const res = await fetch('/api/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cat.id, name: editCatName.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        showToast(`Category renamed to "${editCatName.trim()}"`, 'success')
        setEditingCatId(null)
        broadcastChange('CATEGORY_UPDATED', { categoryId: cat.id })
        mutateCategories()
        mutateRooms()
      } else {
        showToast(data.error || 'Failed to rename category', 'error')
      }
    } catch {
      showToast('Network error while updating category', 'error')
    } finally {
      setSavingCatName(false)
    }
  }

  async function deleteCategory(cat: any) {
    const roomCount = cat.totalRooms || 0
    const msg =
      roomCount > 0
        ? `Are you sure you want to delete category "${cat.name}" and its ${roomCount} room${
            roomCount === 1 ? '' : 's'
          }? This cannot be undone.`
        : `Are you sure you want to delete category "${cat.name}"?`

    if (!confirm(msg)) return
    setDeletingCatId(cat.id)
    try {
      const res = await fetch(`/api/categories?id=${cat.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        showToast(`Category "${cat.name}" deleted successfully`, 'success')
        broadcastChange('CATEGORY_UPDATED', { categoryId: cat.id, action: 'deleted' })
        mutateCategories()
        mutateRooms()
      } else {
        showToast(data.error || 'Failed to delete category', 'error')
      }
    } catch {
      showToast('Network error while deleting category', 'error')
    } finally {
      setDeletingCatId(null)
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

  function startEditingRoom(room: any) {
    setEditingRoom(room)
    setEditForm({
      number: room.number || '',
      categoryName: room.category?.name || '',
      floor: room.floor || 1,
      bedType: room.bedType || 'King Bed',
      status: room.status || 'Available',
    })
  }

  async function saveRoomEdit() {
    if (!editForm.number.trim()) {
      showToast('Room number cannot be empty', 'error')
      return
    }
    setSavingRoomEdit(true)
    try {
      const res = await fetch(`/api/rooms/${editingRoom.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      const data = await res.json()
      if (res.ok) {
        showToast(`Room ${editForm.number} updated successfully!`, 'success')
        broadcastChange('ROOM_UPDATED', { roomId: editingRoom.id })
        mutateRooms()
        mutateCategories()
        setEditingRoom(null)
      } else {
        showToast(data.error || 'Failed to update room', 'error')
      }
    } catch {
      showToast('Network error while updating room', 'error')
    } finally {
      setSavingRoomEdit(false)
    }
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
    const categoryName = newRoomCat || (categories && categories[0]?.name) || 'Standard'
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
      showToast(`Category "${catName.trim()}" added to ${currentProperty?.name}!`, 'success')
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
      <div className="page-header" style={{ marginBottom: '20px' }}>
        <div>
          <h1 className="page-title">Pricing &amp; Rooms · {currentProperty?.name}</h1>
          <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px' }}>
            {currentProperty?.code} · {currentProperty?.city} · Currency: {currentProperty?.currency} ({currencySymbol}) · Custom property categories
          </div>
        </div>
        <button
          className="btn btn-red btn-sm"
          onClick={() => setShowAddCat(!showAddCat)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={14} /> Add Category
        </button>
      </div>

      {/* Add Category Drawer / Inline Form */}
      {showAddCat && (
        <div
          style={{
            background: 'var(--card-2)',
            border: '1px solid var(--border-2)',
            borderRadius: 'var(--radius-md)',
            padding: '18px 20px',
            marginBottom: '24px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>
              Add New Custom Category for {currentProperty?.name}
            </div>
            <button
              onClick={() => setShowAddCat(false)}
              className="btn-icon"
              style={{ background: 'none', border: 'none', color: 'var(--text-3)' }}
            >
              <X size={15} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              className="form-control"
              style={{ width: '220px' }}
              placeholder="Category name (e.g. Deluxe, Suite, Villa...)"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              autoFocus
            />
            <input
              className="form-control"
              style={{ width: '150px' }}
              type="number"
              placeholder={`Base Rate (${currencySymbol})`}
              value={catRate}
              onChange={(e) => setCatRate(e.target.value)}
            />
            <button className="btn btn-red btn-sm" onClick={addCategory} disabled={addingCat}>
              {addingCat ? <span className="spinner" style={{ width: 12, height: 12 }} /> : <Plus size={12} />}
              Save Category
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowAddCat(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Category Rate Cards */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-2)' }}>
          Room Categories &amp; Nightly Base Rates
        </h2>
        <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
          {categories?.length || 0} Categories configured
        </span>
      </div>

      {!categories || categories.length === 0 ? (
        <div className="empty-state" style={{ marginBottom: '24px' }}>
          No room categories configured yet for this property. Click &quot;Add Category&quot; above to create one.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '14px',
            marginBottom: '28px',
          }}
        >
          {categories.map((cat: any) => {
            const isEditingThis = editingCatId === cat.id
            const roomCount = cat.totalRooms || 0

            return (
              <div key={cat.id} className="card" style={{ padding: '16px', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  {isEditingThis ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, marginRight: '8px' }}>
                      <input
                        className="form-control"
                        style={{ padding: '3px 8px', fontSize: '13px', fontWeight: 700 }}
                        value={editCatName}
                        onChange={(e) => setEditCatName(e.target.value)}
                        autoFocus
                      />
                      <button
                        className="btn-icon"
                        style={{ padding: '4px', color: 'var(--green)' }}
                        onClick={() => saveCategoryName(cat)}
                        disabled={savingCatName}
                        title="Save name"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        className="btn-icon"
                        style={{ padding: '4px', color: 'var(--text-3)' }}
                        onClick={() => setEditingCatId(null)}
                        title="Cancel"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 700, fontSize: '14.5px', color: '#ffffff' }}>{cat.name}</span>
                      <button
                        className="btn-icon"
                        style={{ padding: '2px 4px', border: 'none', background: 'none', color: 'var(--text-3)' }}
                        onClick={() => {
                          setEditingCatId(cat.id)
                          setEditCatName(cat.name)
                        }}
                        title="Rename category"
                      >
                        <Pencil size={11} />
                      </button>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="badge badge-gray" style={{ fontSize: '10.5px' }}>
                      {roomCount} {roomCount === 1 ? 'Room' : 'Rooms'}
                    </span>
                    <button
                      className="btn-icon"
                      style={{ padding: '2px 4px', border: 'none', background: 'none', color: 'var(--red)', cursor: 'pointer' }}
                      onClick={() => deleteCategory(cat)}
                      disabled={deletingCatId === cat.id}
                      title={`Delete category "${cat.name}"`}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Rate Input */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: 'var(--text-3)', fontSize: '13px', fontWeight: 600 }}>{currencySymbol}</span>
                  <input
                    type="number"
                    className="form-control"
                    style={{ width: '110px', padding: '5px 8px', fontSize: '13px', fontWeight: 700 }}
                    value={editRate[cat.id] !== undefined ? editRate[cat.id] : cat.nightlyRate}
                    onChange={(e) =>
                      setEditRate((prev) => ({
                        ...prev,
                        [cat.id]: Number(e.target.value),
                      }))
                    }
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
            )
          })}
        </div>
      )}

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
            style={{ width: '150px' }}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <button
                        className="btn-icon"
                        style={{ padding: '4px', border: 'none', background: 'none', color: 'var(--text-3)' }}
                        onClick={() => startEditingRoom(room)}
                        title="Edit room number & details"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        className="btn-icon"
                        style={{ padding: '4px', border: 'none', background: 'none', color: 'var(--text-3)' }}
                        onClick={() => deleteRoom(room.id, room.number)}
                        title="Remove room"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <select
                    className="room-status-select"
                    value={room.status}
                    onChange={(e) => updateRoomStatus(room.id, e.target.value)}
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

      {/* Edit Room Modal */}
      {editingRoom && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingRoom(null)
          }}
          style={{ zIndex: 1100 }}
        >
          <div className="modal" style={{ maxWidth: '440px', width: '92%' }}>
            <div className="modal-header">
              <div className="modal-title">
                Edit Room · {editingRoom.number}
                <button
                  onClick={() => setEditingRoom(null)}
                  className="btn-icon"
                  style={{ background: 'none', border: 'none' }}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="modal-subtitle">Update room number, category, floor, bed type, or status</div>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Room Number *</label>
                <input
                  className="form-control"
                  value={editForm.number}
                  onChange={(e) => setEditForm((f) => ({ ...f, number: e.target.value }))}
                  placeholder="e.g. 101"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Room Category *</label>
                <select
                  className="form-control"
                  value={editForm.categoryName}
                  onChange={(e) => setEditForm((f) => ({ ...f, categoryName: e.target.value }))}
                >
                  {(categories || []).map((c: any) => (
                    <option key={c.id} value={c.name}>
                      {c.name} ({currencySymbol}{c.nightlyRate}/night)
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Floor</label>
                  <input
                    type="number"
                    className="form-control"
                    value={editForm.floor}
                    onChange={(e) => setEditForm((f) => ({ ...f, floor: Number(e.target.value) }))}
                    min={1}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Bed Type</label>
                  <select
                    className="form-control"
                    value={editForm.bedType}
                    onChange={(e) => setEditForm((f) => ({ ...f, bedType: e.target.value }))}
                  >
                    {BED_TYPES.map((bt) => (
                      <option key={bt} value={bt}>
                        {bt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Room Status</label>
                <select
                  className="form-control"
                  value={editForm.status}
                  onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                >
                  {STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setEditingRoom(null)} disabled={savingRoomEdit}>
                Cancel
              </button>
              <button className="btn btn-red" onClick={saveRoomEdit} disabled={savingRoomEdit}>
                {savingRoomEdit ? <span className="spinner" style={{ width: 14, height: 14 }} /> : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
