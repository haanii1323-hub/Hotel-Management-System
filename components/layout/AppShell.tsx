'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { BarChart3, BookOpen, DollarSign, Home, LogOut, TrendingUp, Users, Settings, History } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { InstallAppButton } from '@/components/ui/InstallApp'
import ThemeToggle from '@/components/ui/ThemeToggle'
import PropertySelector from './PropertySelector'
import DelayedAlertsPopup from '@/components/notifications/DelayedAlertsPopup'
import { useProperty } from '@/context/PropertyContext'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const NAV = [
  { href: '/dashboard', label: 'Growth', icon: Home },
  { href: '/bookings', label: 'Bookings', icon: BookOpen },
  { href: '/history', label: 'History', icon: History },
  { href: '/pricing', label: 'Pricing & Rooms', icon: DollarSign },
  { href: '/guests', label: 'Guest Directory', icon: Users },
  { href: '/earnings', label: 'Earnings', icon: TrendingUp },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const router = useRouter()
  const { currentProperty, isSwitching } = useProperty()

  const [search, setSearch] = useState('')
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const propertyId = currentProperty?.id || ''
  const { data: searchResults } = useSWR(
    search.trim().length >= 1 ? `/api/search?q=${encodeURIComponent(search.trim())}&propertyId=${propertyId}` : null,
    fetcher
  )

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', handleClick)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (currentProperty?.name) {
        document.title = `${currentProperty.name} — Hotel Management System`
      } else {
        document.title = 'Hotel Management System'
      }
    }
  }, [currentProperty?.name])

  const currencySymbol = currentProperty?.currencySymbol || '₹'
  const formatMoney = (amount: number) => `${currencySymbol}${Number(amount || 0).toLocaleString('en-IN')}`

  return (
    <div className="app-shell">
      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo" style={{ gap: '10px' }}>
          {currentProperty?.coverImage || currentProperty?.logo ? (
            <img
              src={currentProperty.coverImage || currentProperty.logo || ''}
              alt={currentProperty.name}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                objectFit: 'cover',
                flexShrink: 0,
                border: '1px solid var(--border)',
              }}
            />
          ) : (
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #e53e3e 0%, #991b1b 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 800,
                fontSize: '13px',
                flexShrink: 0,
                boxShadow: '0 2px 8px rgba(229, 62, 62, 0.35)',
              }}
            >
              {currentProperty?.name ? currentProperty.name.slice(0, 2).toUpperCase() : 'HM'}
            </div>
          )}
          <div className="sidebar-logo-text" style={{ minWidth: 0 }}>
            <span
              className="brand"
              style={{
                fontSize: '13.5px',
                fontWeight: 700,
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: 'block',
              }}
              title={currentProperty?.name || 'Hotel Management System'}
            >
              {currentProperty?.name || 'Hotel Management System'}
            </span>
            <span className="sub" style={{ fontSize: '10.5px', color: 'var(--text-3)' }}>
              {currentProperty?.code ? `${currentProperty.code} · Hotel PMS` : 'Hotel Management System'}
            </span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={`nav-item${pathname.startsWith(href) ? ' active' : ''}`}>
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>

        {/* Sidebar Install App Widget */}
        <div className="sidebar-footer">
          <InstallAppButton variant="sidebar-card" />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-content">
        {/* Top Bar */}
        <header className="topbar">
          {/* Global Search */}
          <div className="search-bar" ref={searchRef}>
            <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              placeholder={`Search guests, ref IDs, rooms in ${currentProperty?.name || 'property'}...`}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setShowResults(true)
              }}
              onFocus={() => setShowResults(true)}
            />
            <span className="search-shortcut-badge">⌘K</span>
            {showResults && search.trim().length >= 1 && searchResults && searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map((b: any) => {
                  const collected =
                    b.payments?.reduce((s: number, p: any) => s + (p.status !== 'Pending' ? p.amount : 0), 0) || 0
                  const balance = Math.max(0, b.totalAmount - collected)
                  return (
                    <div
                      key={b.id}
                      className="search-result-item"
                      onClick={() => {
                        router.push(`/bookings?selected=${b.id}`)
                        setSearch('')
                        setShowResults(false)
                      }}
                    >
                      <div>
                        <div className="search-result-name">{b.guest?.name}</div>
                        <div className="search-result-meta">
                          {b.bookingRef} · {b.source} · {b.roomCategory}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>{formatMoney(b.totalAmount)}</div>
                        {balance > 0 && (
                          <div style={{ fontSize: '11px', color: 'var(--amber)' }}>Balance: {formatMoney(balance)}</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            {showResults && search.trim().length >= 1 && searchResults?.length === 0 && (
              <div className="search-results">
                <div style={{ padding: '12px 14px', color: 'var(--text-2)', fontSize: '13px' }}>
                  No bookings found in {currentProperty?.name}
                </div>
              </div>
            )}
          </div>

          {/* Right Topbar: Theme Toggle, Install App, Property Selector & User */}
          <div className="topbar-user" style={{ gap: '12px' }}>
            {/* Dark / Light Theme Toggle */}
            <ThemeToggle />

            {/* Install App Button */}
            <InstallAppButton variant="button" />

            {/* Dynamic Multi-Property Selector */}
            <PropertySelector />

            {/* Logout */}
            <button className="logout-btn" onClick={() => signOut({ callbackUrl: '/auth' })} title="Logout">
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* Page content with switching overlay */}
        <main className="page-content" style={{ position: 'relative' }}>
          {isSwitching && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(11, 13, 15, 0.45)',
                backdropFilter: 'blur(2px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 100,
              }}
            >
              <div
                style={{
                  background: 'var(--card-2)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '12px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '13px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                }}
              >
                <span className="spinner" style={{ width: 16, height: 16 }} />
                <span>Loading {currentProperty?.name}...</span>
              </div>
            </div>
          )}
          {children}
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <nav className="mobile-nav">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={`mobile-nav-item${pathname.startsWith(href) ? ' active' : ''}`}>
              <Icon size={18} />
              <span>{label.split(' ')[0]}</span>
            </Link>
          ))}
          <InstallAppButton variant="mobile-item" />
        </nav>
      </div>

      {/* Floating Delayed Checkin/Checkout Alert Popup */}
      <DelayedAlertsPopup />
    </div>
  )
}
