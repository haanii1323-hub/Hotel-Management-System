'use client'

import React, { useState } from 'react'
import AppShell from '@/components/layout/AppShell'
import {
  CreditCard,
  Building2,
  BedDouble,
  Users,
  ShieldCheck,
  Settings as SettingsIcon,
  Sliders,
  DollarSign,
  Palette,
  Sun,
  Moon,
  Check,
} from 'lucide-react'
import PaymentSettingsTab from '@/components/settings/PaymentSettingsTab'
import DataSafetyTab from '@/components/settings/DataSafetyTab'
import { useProperty } from '@/context/PropertyContext'
import { useTheme } from '@/context/ThemeContext'
import ThemeToggle from '@/components/ui/ThemeToggle'
import EditPropertyModal from '@/components/properties/EditPropertyModal'
import Link from 'next/link'

export default function SettingsPage() {
  const { currentProperty, properties } = useProperty()
  const [activeTab, setActiveTab] = useState<'payment' | 'property' | 'rooms' | 'users' | 'appearance' | 'backup'>('payment')
  const [showEditPropModal, setShowEditPropModal] = useState(false)

  return (
    <AppShell>
      <div className="settings-page" style={{ paddingBottom: '40px' }}>
        {/* Page Header */}
        <div className="page-header" style={{ marginBottom: '20px' }}>
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <SettingsIcon size={20} color="var(--red)" />
              <span>Hotel Settings &amp; Configuration</span>
            </h1>
            <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px' }}>
              Manage payment methods, UPI/QR details, bank accounts, property details, and system configurations.
            </div>
          </div>
        </div>

        {/* Settings Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderBottom: '1px solid var(--border)',
            marginBottom: '24px',
            overflowX: 'auto',
            paddingBottom: '2px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('payment')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              color: activeTab === 'payment' ? 'var(--red)' : 'var(--text-2)',
              borderBottom: activeTab === 'payment' ? '2px solid var(--red)' : '2px solid transparent',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            <CreditCard size={15} /> Payment Settings &amp; UPI/QR
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('property')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              color: activeTab === 'property' ? 'var(--red)' : 'var(--text-2)',
              borderBottom: activeTab === 'property' ? '2px solid var(--red)' : '2px solid transparent',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            <Building2 size={15} /> Property Profile
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rooms')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              color: activeTab === 'rooms' ? 'var(--red)' : 'var(--text-2)',
              borderBottom: activeTab === 'rooms' ? '2px solid var(--red)' : '2px solid transparent',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            <BedDouble size={15} /> Rooms &amp; Inventory
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('users')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              color: activeTab === 'users' ? 'var(--red)' : 'var(--text-2)',
              borderBottom: activeTab === 'users' ? '2px solid var(--red)' : '2px solid transparent',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
              <Users size={15} /> Users &amp; Roles
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('appearance')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              color: activeTab === 'appearance' ? 'var(--red)' : 'var(--text-2)',
              borderBottom: activeTab === 'appearance' ? '2px solid var(--red)' : '2px solid transparent',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            <Palette size={15} /> Appearance &amp; Theme
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              color: activeTab === 'backup' ? 'var(--red)' : 'var(--text-2)',
              borderBottom: activeTab === 'backup' ? '2px solid var(--red)' : '2px solid transparent',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            <ShieldCheck size={15} /> Data Safety &amp; Backup
          </button>
        </div>

        {/* TAB 1: PAYMENT SETTINGS */}
        {activeTab === 'payment' && <PaymentSettingsTab />}

        {/* TAB 6: DATA SAFETY & BACKUP */}
        {activeTab === 'backup' && <DataSafetyTab />}

        {/* TAB 2: PROPERTY PROFILE */}
        {activeTab === 'property' && (
          <div style={{ maxWidth: '820px', margin: '0 auto' }}>
            <div className="card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Building2 size={18} color="var(--red)" />
                  <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Property Information</h3>
                </div>
                {currentProperty && (
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowEditPropModal(true)}>
                    Edit Property Details
                  </button>
                )}
              </div>

              {currentProperty ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px' }}>
                  <div>
                    <span style={{ color: 'var(--text-3)' }}>Property Name:</span>
                    <div style={{ fontWeight: 600, marginTop: '2px' }}>{currentProperty.name}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-3)' }}>Property Code:</span>
                    <div style={{ fontWeight: 600, marginTop: '2px' }}>{currentProperty.code}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-3)' }}>Location:</span>
                    <div style={{ marginTop: '2px' }}>
                      {currentProperty.city}, {currentProperty.state}, {currentProperty.country}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-3)' }}>Address:</span>
                    <div style={{ marginTop: '2px' }}>{currentProperty.address || '—'}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-3)' }}>Phone Number:</span>
                    <div style={{ marginTop: '2px' }}>{currentProperty.phone || '—'}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-3)' }}>Email Address:</span>
                    <div style={{ marginTop: '2px' }}>{currentProperty.email || '—'}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-3)' }}>Standard Timings:</span>
                    <div style={{ marginTop: '2px' }}>
                      Check-in: {currentProperty.checkInTime} · Check-out: {currentProperty.checkOutTime}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ color: 'var(--text-3)', textAlign: 'center', padding: '24px' }}>
                  No property selected.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: ROOMS & INVENTORY SHORTCUT */}
        {activeTab === 'rooms' && (
          <div style={{ maxWidth: '820px', margin: '0 auto' }}>
            <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
              <BedDouble size={36} style={{ margin: '0 auto 12px', color: 'var(--red)' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>
                Room Inventory &amp; Category Pricing
              </h3>
              <p style={{ color: 'var(--text-2)', fontSize: '13px', maxWidth: '460px', margin: '0 auto 20px' }}>
                Configure nightly pricing, room categories (Standard, Deluxe, Superior), weekend rates, extra guest surcharges, and room numbers.
              </p>
              <Link href="/pricing" className="btn btn-red" style={{ margin: '0 auto', gap: '6px' }}>
                <Sliders size={14} /> Open Pricing &amp; Rooms Manager
              </Link>
            </div>
          </div>
        )}

        {/* TAB 4: USERS & ACCESS */}
        {activeTab === 'users' && (
          <div style={{ maxWidth: '820px', margin: '0 auto' }}>
            <div className="card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Users size={18} color="var(--red)" />
                <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Users &amp; Role-Based Access</h3>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '16px' }}>
                Role permissions configured for this organization:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--card-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>Hotel Owner / Admin</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>Full access: Add properties, change UPI/QR settings, bank configuration, pricing, reports</div>
                  </div>
                  <span style={{ fontSize: '11px', padding: '2px 8px', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--red)', borderRadius: '4px', fontWeight: 600 }}>Owner</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--card-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>Front Desk Staff</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>Operational access: Create bookings, check-in, check-out, record payments, view permitted QR</div>
                  </div>
                  <span style={{ fontSize: '11px', padding: '2px 8px', background: 'rgba(59, 130, 246, 0.15)', color: 'var(--blue)', borderRadius: '4px', fontWeight: 600 }}>Staff</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: APPEARANCE & THEME */}
        {activeTab === 'appearance' && (
          <AppearanceSettingsTab />
        )}
      </div>

      {/* Edit Property Modal */}
      {showEditPropModal && currentProperty && (
        <EditPropertyModal
          property={currentProperty}
          onClose={() => setShowEditPropModal(false)}
          onSuccess={() => setShowEditPropModal(false)}
        />
      )}
    </AppShell>
  )
}

function AppearanceSettingsTab() {
  const { theme, toggleTheme, isDark } = useTheme()

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--red)',
              }}
            >
              <Palette size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Theme &amp; Display Appearance</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0, marginTop: '2px' }}>
                Select your preferred interface color mode for hotel operations and dashboard views.
              </p>
            </div>
          </div>

          <ThemeToggle variant="pill" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '20px' }}>
          {/* Light Theme Option Card */}
          <div
            onClick={() => isDark && toggleTheme()}
            style={{
              padding: '18px',
              borderRadius: 'var(--radius-md)',
              border: !isDark ? '2px solid var(--red)' : '1px solid var(--border)',
              background: !isDark ? 'var(--card-2)' : 'transparent',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              position: 'relative',
              boxShadow: !isDark ? '0 4px 16px rgba(225, 29, 72, 0.12)' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: '#fef3c7',
                    color: '#d97706',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Sun size={17} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>Light Mode</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>Crisp paper white &amp; high contrast</div>
                </div>
              </div>

              {!isDark ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'var(--red)',
                    color: '#fff',
                    padding: '3px 8px',
                    borderRadius: '9999px',
                    fontSize: '11px',
                    fontWeight: 600,
                  }}
                >
                  <Check size={12} strokeWidth={3} /> Active
                </span>
              ) : (
                <span style={{ fontSize: '12px', color: 'var(--text-3)', fontWeight: 500 }}>Select</span>
              )}
            </div>

            {/* Light Mockup Preview */}
            <div
              style={{
                borderRadius: '8px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                <div style={{ width: '60px', height: '8px', background: '#0f172a', borderRadius: '4px' }} />
                <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#e11d48' }} />
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <div style={{ width: '30%', height: '36px', background: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0' }} />
                <div style={{ width: '70%', height: '36px', background: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0' }} />
              </div>
            </div>
          </div>

          {/* Dark Theme Option Card */}
          <div
            onClick={() => !isDark && toggleTheme()}
            style={{
              padding: '18px',
              borderRadius: 'var(--radius-md)',
              border: isDark ? '2px solid var(--red)' : '1px solid var(--border)',
              background: isDark ? 'var(--card-2)' : 'transparent',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              position: 'relative',
              boxShadow: isDark ? '0 4px 16px rgba(225, 29, 72, 0.12)' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: '#1e293b',
                    color: '#fbbf24',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Moon size={17} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>Dark Mode</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>Deep midnight OLED &amp; luxury gold</div>
                </div>
              </div>

              {isDark ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'var(--red)',
                    color: '#fff',
                    padding: '3px 8px',
                    borderRadius: '9999px',
                    fontSize: '11px',
                    fontWeight: 600,
                  }}
                >
                  <Check size={12} strokeWidth={3} /> Active
                </span>
              ) : (
                <span style={{ fontSize: '12px', color: 'var(--text-3)', fontWeight: 500 }}>Select</span>
              )}
            </div>

            {/* Dark Mockup Preview */}
            <div
              style={{
                borderRadius: '8px',
                background: '#090d16',
                border: '1px solid #1e293b',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #161f30', paddingBottom: '6px' }}>
                <div style={{ width: '60px', height: '8px', background: '#f8fafc', borderRadius: '4px' }} />
                <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#e11d48' }} />
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <div style={{ width: '30%', height: '36px', background: '#0e1626', borderRadius: '4px', border: '1px solid #1e293b' }} />
                <div style={{ width: '70%', height: '36px', background: '#0e1626', borderRadius: '4px', border: '1px solid #1e293b' }} />
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: '24px',
            padding: '14px 16px',
            background: 'var(--card-2)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            fontSize: '12px',
            color: 'var(--text-2)',
          }}
        >
          <span style={{ fontSize: '14px' }}>💡</span>
          <div>
            <strong>Quick Access:</strong> You can also toggle between Light and Dark mode at any time using the Sun/Moon icon in the top header on any page.
          </div>
        </div>
      </div>
    </div>
  )
}
