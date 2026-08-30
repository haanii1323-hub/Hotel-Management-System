'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, Search, Plus, Settings, Building2, Bell, AlertCircle, Sparkles, X } from 'lucide-react'
import { useProperty } from '@/context/PropertyContext'
import AddPropertyModal from '@/components/properties/AddPropertyModal'
import EditPropertyModal from '@/components/properties/EditPropertyModal'
import AllPropertiesModal from '@/components/properties/AllPropertiesModal'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function PropertySelector() {
  const router = useRouter()
  const { currentProperty, properties, switchProperty, isSwitching } = useProperty()
  const [open, setOpen] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showOverviewModal, setShowOverviewModal] = useState(false)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const propertyId = currentProperty?.id || ''
  const { data: notifData } = useSWR(
    propertyId ? `/api/notifications?propertyId=${propertyId}` : '/api/notifications',
    fetcher,
    { refreshInterval: 5000 }
  )

  const notifCount = notifData?.totalCount || 0
  const notifications = notifData?.notifications || []

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
    } else {
      setSearch('')
    }
  }, [open])

  const filteredProperties = properties.filter((p) => {
    if (!search.trim()) return p.isActive
    const q = search.toLowerCase().trim()
    return (
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      p.city.toLowerCase().includes(q)
    )
  })

  const current = currentProperty || {
    name: 'Metro Inn Rooms',
    code: 'BLR3396',
    city: 'Bangalore',
    country: 'India',
    coverImage: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
  }

  return (
    <>
      <div className="property-selector-container" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Real Notification Bell */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            style={{
              position: 'relative',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px',
              background: showNotifications ? 'var(--card-2)' : 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: 'var(--text)',
            }}
            title="Real-time alerts & notifications"
          >
            <Bell size={18} />
            {notifCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  background: 'var(--red)',
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: 700,
                  minWidth: '16px',
                  height: '16px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px',
                  lineHeight: 1,
                }}
              >
                {notifCount}
              </span>
            )}
          </button>

          {/* Notification Popover */}
          {showNotifications && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '320px',
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
                zIndex: 1100,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '12px 14px',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '13px' }}>
                  Property Alerts ({notifCount})
                </div>
                <button
                  type="button"
                  onClick={() => setShowNotifications(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}
                >
                  <X size={14} />
                </button>
              </div>

              <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: '12px' }}>
                    <Check size={24} style={{ margin: '0 auto 8px', color: 'var(--green)' }} />
                    All clear! No urgent check-ins, check-outs, or housekeeping tasks pending.
                  </div>
                ) : (
                  notifications.map((n: any) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        if (n.href) router.push(n.href)
                        setShowNotifications(false)
                      }}
                      style={{
                        padding: '10px 14px',
                        borderBottom: '1px solid var(--border)',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                      }}
                      className="notif-item-hover"
                    >
                      <div style={{ fontWeight: 600, fontSize: '12px', color: n.type === 'cleaning' ? 'var(--amber)' : 'var(--text)' }}>
                        {n.title}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-2)', marginTop: '2px' }}>
                        {n.description}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Property Selector Dropdown */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              padding: '4px 8px',
              borderRadius: '6px',
              transition: 'background 0.15s ease',
            }}
            className="property-trigger-btn"
          >
            {/* Property Image Thumbnail */}
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '6px',
                overflow: 'hidden',
                background: 'var(--card-2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                border: '1px solid var(--border)',
              }}
            >
              {current.coverImage ? (
                <img
                  src={current.coverImage}
                  alt={current.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <Building2 size={16} color="var(--text-2)" />
              )}
            </div>

            {/* Code + Chevron & Name */}
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: 'var(--text)',
                  lineHeight: 1.2,
                }}
              >
                <span>{current.code}</span>
                <ChevronDown
                  size={14}
                  color="var(--text-2)"
                  style={{
                    transform: open ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.15s ease',
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--text-2)',
                  maxWidth: '160px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  marginTop: '1px',
                }}
              >
                {current.name}
              </div>
            </div>
          </button>

          {/* Dropdown Menu */}
          {open && (
            <div
              className="property-dropdown-menu"
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '320px',
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
                zIndex: 1100,
                overflow: 'hidden',
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: '12px 14px 10px',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text)' }}>
                  Properties ({properties.length})
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {currentProperty && (
                    <button
                      className="btn-icon"
                      style={{ padding: '4px', background: 'var(--card-2)', border: '1px solid var(--border)', borderRadius: 4 }}
                      title={`Configure ${current.name}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        setOpen(false)
                        setShowEditModal(true)
                      }}
                    >
                      <Settings size={13} color="var(--text-2)" />
                    </button>
                  )}
                  <button
                    className="btn btn-red btn-sm"
                    style={{ fontSize: '11px', padding: '4px 8px', gap: '4px' }}
                    onClick={(e) => {
                      e.stopPropagation()
                      setOpen(false)
                      setShowAddModal(true)
                    }}
                  >
                    <Plus size={12} /> Add
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ position: 'relative' }}>
                  <Search
                    size={12}
                    style={{
                      position: 'absolute',
                      left: 8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-3)',
                    }}
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search by code, hotel, city..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'var(--card-2)',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      padding: '6px 10px 6px 26px',
                      fontSize: '12px',
                      color: 'var(--text)',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Property Items List */}
              <div style={{ maxHeight: '280px', overflowY: 'auto', padding: '6px 0' }}>
                {filteredProperties.length === 0 ? (
                  <div style={{ padding: '20px 14px', textAlign: 'center', color: 'var(--text-3)', fontSize: '12px' }}>
                    No properties match &quot;{search}&quot;
                  </div>
                ) : (
                  filteredProperties.map((p) => {
                    const isSelected = p.id === currentProperty?.id
                    return (
                      <div
                        key={p.id}
                        onClick={async () => {
                          setOpen(false)
                          await switchProperty(p.id)
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 14px',
                          cursor: 'pointer',
                          background: isSelected ? 'var(--red-dim)' : 'transparent',
                          transition: 'background 0.15s ease',
                        }}
                        className="property-list-item"
                      >
                        {/* Thumbnail */}
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '4px',
                            overflow: 'hidden',
                            background: 'var(--card-2)',
                            flexShrink: 0,
                            border: isSelected ? '1px solid var(--red)' : '1px solid var(--border)',
                          }}
                        >
                          {p.coverImage ? (
                            <img
                              src={p.coverImage}
                              alt={p.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Building2 size={14} color="var(--text-3)" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text)' }}>
                              {p.code}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>· {p.city}</span>
                          </div>
                          <div
                            style={{
                              fontSize: '11px',
                              color: 'var(--text-2)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {p.name}
                          </div>
                        </div>

                        {/* Selected Indicator */}
                        {isSelected && <Check size={14} color="var(--red)" style={{ flexShrink: 0 }} />}
                      </div>
                    )
                  })
                )}
              </div>

              {/* Footer View All Overview */}
              <div
                style={{
                  padding: '8px 14px',
                  borderTop: '1px solid var(--border)',
                  background: 'var(--card-2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ width: '100%', fontSize: '11px', justifyContent: 'center' }}
                  onClick={() => {
                    setOpen(false)
                    setShowOverviewModal(true)
                  }}
                >
                  View All Properties Performance Overview
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Property Modal */}
      {showAddModal && (
        <AddPropertyModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => setShowAddModal(false)}
        />
      )}

      {/* Edit Property Settings Modal */}
      {showEditModal && currentProperty && (
        <EditPropertyModal
          property={currentProperty}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => setShowEditModal(false)}
        />
      )}

      {/* All Properties Overview Modal */}
      {showOverviewModal && (
        <AllPropertiesModal
          onClose={() => setShowOverviewModal(false)}
          onAddProperty={() => {
            setShowOverviewModal(false)
            setShowAddModal(true)
          }}
        />
      )}
    </>
  )
}
