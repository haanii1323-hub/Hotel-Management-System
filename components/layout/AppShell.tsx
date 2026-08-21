'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { BarChart3, BookOpen, DollarSign, Home, LogOut, TrendingUp, Users } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const NAV = [
  { href: '/dashboard', label: 'Growth', icon: Home },
  { href: '/bookings', label: 'Bookings', icon: BookOpen },
  { href: '/pricing', label: 'Pricing & Rooms', icon: DollarSign },
  { href: '/guests', label: 'Guest Directory', icon: Users },
  { href: '/earnings', label: 'Earnings', icon: TrendingUp },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
]

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const { data: searchResults } = useSWR(
    search.length >= 2 ? `/api/search?q=${encodeURIComponent(search)}` : null,
    fetcher
  )

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const formatRupees = (amount: number) => `₹${Number(amount).toLocaleString('en-IN')}`

  return (
    <div className="app-shell">
      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              <polyline points="9,22 9,12 15,12 15,22"/>
            </svg>
          </div>
          <div className="sidebar-logo-text">
            <span className="brand">APEX INN</span>
            <span className="sub">Hotel Management</span>
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
      </aside>

      {/* Main */}
      <div className="main-content">
        {/* Top Bar */}
        <header className="topbar">
          <div className="search-bar" ref={searchRef}>
            <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search bookings..."
              value={search}
              onChange={e => { setSearch(e.target.value); setShowResults(true) }}
              onFocus={() => setShowResults(true)}
            />
            {showResults && search.length >= 2 && searchResults && searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map((b: any) => {
                  const collected = b.payments?.reduce((s: number, p: any) => s + (p.status !== 'Pending' ? p.amount : 0), 0) || 0
                  const balance = b.totalAmount - collected
                  return (
                    <div key={b.id} className="search-result-item" onClick={() => {
                      router.push('/bookings')
                      setSearch('')
                      setShowResults(false)
                    }}>
                      <div>
                        <div className="search-result-name">{b.guest?.name}</div>
                        <div className="search-result-meta">{b.bookingRef} · {b.source} · {b.roomCategory}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>{formatRupees(b.totalAmount)}</div>
                        {balance > 0 && <div style={{ fontSize: '11px', color: 'var(--amber)' }}>Balance: {formatRupees(balance)}</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            {showResults && search.length >= 2 && searchResults?.length === 0 && (
              <div className="search-results">
                <div style={{ padding: '12px 14px', color: 'var(--text-2)', fontSize: '13px' }}>No bookings found</div>
              </div>
            )}
          </div>

          <div className="topbar-user">
            <div className="user-info">
              <div className="user-code">APX3630</div>
              <div className="user-sub">Apex Inn · {session?.user?.name || 'Sahasra'}</div>
            </div>
            <button className="logout-btn" onClick={() => signOut({ callbackUrl: '/auth' })} title="Logout">
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="page-content">
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
        </nav>
      </div>
    </div>
  )
}
