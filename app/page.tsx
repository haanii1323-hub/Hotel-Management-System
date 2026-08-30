import Link from 'next/link'
import { ArrowRight, BarChart3, CreditCard, Hotel } from 'lucide-react'
import type { Metadata } from 'next'
import { InstallAppButton } from '@/components/ui/InstallApp'

export const metadata: Metadata = {
  title: 'APEX INN — Every room, every rupee, in real time',
  description: 'APEX INN is the admin console for your property — bookings, room inventory, nightly pricing, guest history and revenue trends, live on every screen at once.',
}

export default function LandingPage() {
  return (
    <div className="landing">
      {/* Nav */}
      <nav className="landing-nav">
        <div className="landing-logo">
          <img
            src="/logo.png"
            alt="APEX INN"
            style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }}
          />
          <span>APEX INN</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <InstallAppButton variant="landing-badge" />
          <Link href="/auth" className="btn btn-red btn-sm">Staff sign in</Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="landing-hero">
        <div className="landing-tag">
          <span>●</span> Hotel Operating System
        </div>
        <h1 className="landing-h1">Every room, every rupee,<br />in real time.</h1>
        <p className="landing-desc">
          APEX INN is the admin console for your property — bookings, room inventory, nightly pricing, guest history and revenue trends, live on every screen at once.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <Link href="/auth" className="btn btn-red" style={{ fontSize: '15px', padding: '12px 28px' }}>
            Open the console <ArrowRight size={16} />
          </Link>
          <InstallAppButton variant="button" className="btn-hero-install" />
        </div>
      </div>

      {/* Feature Cards */}
      <div className="landing-cards">
        <div className="landing-card">
          <div className="landing-card-icon">
            <Hotel size={18} />
          </div>
          <h3>Front desk that keeps up</h3>
          <p>Upcoming, in-house and completed bookings with one-tap check-in and checkout.</p>
        </div>
        <div className="landing-card">
          <div className="landing-card-icon">
            <CreditCard size={18} />
          </div>
          <h3>Money, settled</h3>
          <p>Bill summary, collected amount and balance to collect on every booking.</p>
        </div>
        <div className="landing-card">
          <div className="landing-card-icon">
            <BarChart3 size={18} />
          </div>
          <h3>Revenue you can read</h3>
          <p>Room revenue, occupancy and ARR trends across any date range.</p>
        </div>
      </div>
    </div>
  )
}

