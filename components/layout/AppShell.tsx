'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  LayoutDashboard,
  BookOpen,
  DollarSign,
  LogOut,
  TrendingUp,
  Users,
  Settings,
  History,
  BedDouble,
  BarChart3,
  Search,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Layers,
  Bell,
  Building2,
  CalendarCheck,
  CreditCard,
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import useSWR from 'swr'
import { InstallAppButton } from '@/components/ui/InstallApp'
import ThemeToggle from '@/components/ui/ThemeToggle'
import PropertySelector from './PropertySelector'
import DelayedAlertsPopup from '@/components/notifications/DelayedAlertsPopup'
import { useProperty } from '@/context/PropertyContext'
import SourceBadge from '@/components/ui/SourceBadge'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface NavItem {
  href: string
  label: string
  icon: any
  badge?: string | number
}

interface NavGroup {
  group: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    group: 'Front Desk',
    items: [
      { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
      { href: '/bookings', label: 'Reservations', icon: BookOpen },
      { href: '/pricing', label: 'Room Rack & Rates', icon: BedDouble },
      { href: '/history', label: 'History & Logs', icon: History },
    ],
  },
  {
    group: 'Finance & CRM',
    items: [
      { href: '/guests', label: 'Guest Directory', icon: Users },
      { href: '/earnings', label: 'Earnings & Cashflow', icon: TrendingUp },
      { href: '/reports', label: 'Analytics & Reports', icon: BarChart3 },
    ],
  },
  {
    group: 'System',
    items: [
      { href: '/settings', label: 'Settings & Config', icon: Settings },
    ],
  },
]

// Flat list for mobile navigation
const MOBILE_NAV = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/bookings', label: 'Bookings', icon: BookOpen },
  { href: '/pricing', label: 'Rooms', icon: BedDouble },
  { href: '/guests', label: 'Guests', icon: Users },
  { href: '/earnings', label: 'Earnings', icon: TrendingUp },
]

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const router = useRouter()
  const { currentProperty, isSwitching } = useProperty()

  const [search, setSearch] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
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
    <div className={`app-shell ${sidebarCollapsed ? 'sidebar-is-collapsed' : ''}`}>
      {/* Desktop Sidebar */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            {currentProperty?.coverImage || currentProperty?.logo ? (
              <img
                src={currentProperty.coverImage || currentProperty.logo || ''}
                alt={currentProperty.name}
                className="sidebar-property-avatar"
              />
            ) : (
              <div className="sidebar-logo-fallback">
                {currentProperty?.name ? currentProperty.name.slice(0, 2).toUpperCase() : 'AP'}
              </div>
            )}
            {!sidebarCollapsed && (
              <div className="sidebar-logo-text">
                <span className="brand" title={currentProperty?.name || 'Apex INN'}>
                  {currentProperty?.name || 'Apex INN'}
                </span>
                <span className="sub">
                  {currentProperty?.code ? `${currentProperty.code} · Hotel PMS` : 'Property Management'}
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            className="sidebar-toggle-btn"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            aria-label="Toggle navigation sidebar"
          >
            {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Grouped Sidebar Navigation */}
        <nav className="sidebar-nav">
          {NAV_GROUPS.map((group) => (
            <div key={group.group} className="nav-group-section">
              {!sidebarCollapsed && (
                <div className="nav-group-header">
                  <span>{group.group}</span>
                </div>
              )}
              {group.items.map(({ href, label, icon: Icon, badge }) => {
                const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                    title={sidebarCollapsed ? label : undefined}
                  >
                    <Icon size={16} className="nav-icon" />
                    {!sidebarCollapsed && <span className="nav-label">{label}</span>}
                    {!sidebarCollapsed && badge && <span className="nav-badge">{badge}</span>}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer Widget */}
        {!sidebarCollapsed && (
          <div className="sidebar-footer">
            <InstallAppButton variant="sidebar-card" />
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div className="main-content">
        {/* Top Bar Header */}
        <header className="topbar">
          {/* Global Omni-Search */}
          <div className="search-bar" ref={searchRef}>
            <Search size={15} className="search-icon" />
            <input
              ref={inputRef}
              type="text"
              placeholder={`Search guests, ref #, phone or rooms in ${currentProperty?.name || 'property'}...`}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setShowResults(true)
              }}
              onFocus={() => setShowResults(true)}
            />
            <span className="search-shortcut-badge">⌘K</span>

            {/* Live Search Results Dropdown */}
            {showResults && search.trim().length >= 1 && searchResults && searchResults.length > 0 && (
              <div className="search-results">
                <div className="search-results-header">
                  <span>Matching Reservations ({searchResults.length})</span>
                </div>
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
                      <div className="search-result-left">
                        <div className="search-result-name">{b.guest?.name || 'Guest'}</div>
                        <div className="search-result-meta">
                          <span className="ref-tag">{b.bookingRef}</span>
                          <span>·</span>
                          <SourceBadge source={b.source} size="xs" />
                          <span>·</span>
                          <span>{b.roomCategory}</span>
                        </div>
                      </div>
                      <div className="search-result-right">
                        <div className="search-result-price">{formatMoney(b.totalAmount)}</div>
                        {balance > 0 ? (
                          <div className="search-result-due">Due: {formatMoney(balance)}</div>
                        ) : (
                          <div className="search-result-paid">Settled</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            {showResults && search.trim().length >= 1 && searchResults?.length === 0 && (
              <div className="search-results">
                <div className="search-results-empty">
                  No matching reservations found in {currentProperty?.name || 'this property'}.
                </div>
              </div>
            )}
          </div>

          {/* Right Topbar Actions */}
          <div className="topbar-user">
            {/* Dark / Light Theme Toggle */}
            <ThemeToggle />

            {/* Install Progressive App Button */}
            <InstallAppButton variant="button" />

            {/* Dynamic Multi-Property Switcher */}
            <PropertySelector />

            {/* Logout / User Signout */}
            <button
              className="logout-btn"
              onClick={() => signOut({ callbackUrl: '/auth' })}
              title="Sign Out of PMS"
              aria-label="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* Page Content with Property Switch Loading Overlay */}
        <main className="page-content">
          {isSwitching && (
            <div className="property-switching-overlay">
              <div className="property-switching-card">
                <span className="spinner" style={{ width: 18, height: 18 }} />
                <span>Switching to {currentProperty?.name}...</span>
              </div>
            </div>
          )}
          {children}
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <nav className="mobile-nav">
          {MOBILE_NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`mobile-nav-item ${pathname === href || (href !== '/dashboard' && pathname.startsWith(href)) ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{label}</span>
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
