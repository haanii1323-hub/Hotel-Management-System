'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { InstallAppButton } from '@/components/ui/InstallApp'
import { Building2, Sparkles, ShieldCheck, ArrowRight, CheckCircle2, Lock, User, Mail, Hotel } from 'lucide-react'

export default function AuthPage() {
  const router = useRouter()
  const [authTab, setAuthTab] = useState<'owner' | 'demo'>('owner')
  const [ownerMode, setOwnerMode] = useState<'signin' | 'register'>('signin')
  const [form, setForm] = useState({ name: '', hotelName: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  async function handleOwnerSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await signIn('credentials', {
      email: form.email.trim(),
      password: form.password,
      redirect: false,
    })
    setLoading(false)
    if (res?.error) {
      setError('Invalid email or password. Please check your credentials.')
    } else {
      router.push('/dashboard')
    }
  }

  async function handleOwnerRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Registration failed')
        setLoading(false)
        return
      }

      // Auto sign in to newly created tenant
      const signInRes = await signIn('credentials', {
        email: form.email.trim(),
        password: form.password,
        redirect: false,
      })
      setLoading(false)
      if (signInRes?.error) {
        setError('Account created! Please sign in using your credentials.')
        setOwnerMode('signin')
      } else {
        router.push('/dashboard')
      }
    } catch {
      setError('Network error during registration. Please try again.')
      setLoading(false)
    }
  }

  async function handleDemoSignIn() {
    setError('')
    setLoading(true)
    const res = await signIn('credentials', {
      email: 'admin@apexinn.com',
      password: 'admin123',
      redirect: false,
    })
    setLoading(false)
    if (res?.error) {
      setError('Demo login failed. Please try again.')
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="auth-page">
      {/* Top action bar */}
      <div style={{ position: 'absolute', top: '18px', right: '20px', zIndex: 10 }}>
        <InstallAppButton variant="landing-badge" />
      </div>

      {/* Left panel */}
      <div className="auth-left">
        <div className="auth-left-logo">
          <img
            src="/logo.png"
            alt="APEX INN"
            style={{ width: 42, height: 42, borderRadius: 10, objectFit: 'cover' }}
          />
          <span>APEX INN</span>
        </div>

        <div className="auth-left-content">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'rgba(212, 175, 55, 0.15)', border: '1px solid rgba(212, 175, 55, 0.3)', borderRadius: '20px', color: '#e5c06e', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>
            <Sparkles size={12} /> Enterprise Multi-Tenant PMS
          </div>
          <h1>The front desk, ledger, and rate card — on one screen.</h1>
          <p>
            Check guests in, collect balances, manage room inventory, tune nightly rates, and watch live occupancy across all your properties in real time.
          </p>

          <div style={{ marginTop: '28px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#cbd5e1' }}>
              <CheckCircle2 size={16} color="var(--green)" />
              <span>Strict Database Tenant Isolation &amp; Privacy</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#cbd5e1' }}>
              <CheckCircle2 size={16} color="var(--green)" />
              <span>Overlapping Double-Booking Prevention</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#cbd5e1' }}>
              <CheckCircle2 size={16} color="var(--green)" />
              <span>Instant Cross-Device Real-Time Sync</span>
            </div>
          </div>
        </div>

        <div className="auth-left-footer" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.45)', fontSize: '12px' }}>
          <ShieldCheck size={14} /> Production Secured · Multi-Tenant Architecture
        </div>
      </div>

      {/* Right panel */}
      <div className="auth-right">
        <div className="auth-form-box" style={{ maxWidth: '440px' }}>
          {/* Main Mode Tabs */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              background: 'var(--card-2)',
              padding: '4px',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '20px',
              border: '1px solid var(--border)',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setAuthTab('owner')
                setError('')
              }}
              style={{
                padding: '9px 12px',
                borderRadius: '4px',
                border: 'none',
                background: authTab === 'owner' ? 'var(--card)' : 'transparent',
                color: authTab === 'owner' ? 'var(--text)' : 'var(--text-3)',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: authTab === 'owner' ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Building2 size={14} /> My Hotel Account
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthTab('demo')
                setError('')
              }}
              style={{
                padding: '9px 12px',
                borderRadius: '4px',
                border: 'none',
                background: authTab === 'demo' ? 'var(--card)' : 'transparent',
                color: authTab === 'demo' ? 'var(--text)' : 'var(--text-3)',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: authTab === 'demo' ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Sparkles size={14} color="#e5c06e" /> Try Live Demo
            </button>
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: '16px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          {authTab === 'owner' ? (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700 }}>
                  {ownerMode === 'signin' ? 'Sign In to Your Hotel' : 'Create Your Hotel PMS Account'}
                </h2>
                <p className="auth-subtitle" style={{ fontSize: '12px' }}>
                  {ownerMode === 'signin'
                    ? 'Access your private hotel organization and operations.'
                    : 'Start with a clean, dedicated environment for your hotel business.'}
                </p>
              </div>

              <form onSubmit={ownerMode === 'signin' ? handleOwnerSignIn : handleOwnerRegister}>
                {ownerMode === 'register' && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Your Full Name *</label>
                      <input
                        className="form-control"
                        type="text"
                        placeholder="e.g. Vikram Malhotra"
                        value={form.name}
                        onChange={(e) => update('name', e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Hotel / Business Name *</label>
                      <input
                        className="form-control"
                        type="text"
                        placeholder="e.g. Grand Apex Resort &amp; Spa"
                        value={form.hotelName}
                        onChange={(e) => update('hotelName', e.target.value)}
                        required
                      />
                    </div>
                  </>
                )}

                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input
                    className="form-control"
                    type="email"
                    placeholder="owner@yourhotel.com"
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <input
                    className="form-control"
                    type="password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => update('password', e.target.value)}
                    required
                    minLength={6}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-red"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    padding: '11px',
                    marginTop: '8px',
                    fontSize: '14px',
                  }}
                  disabled={loading}
                >
                  {loading ? (
                    <span className="spinner" style={{ width: 16, height: 16 }} />
                  ) : ownerMode === 'signin' ? (
                    'Sign In to Hotel PMS'
                  ) : (
                    'Create Account & Launch PMS'
                  )}
                </button>
              </form>

              <div className="auth-link" style={{ marginTop: '16px', textAlign: 'center', fontSize: '13px' }}>
                {ownerMode === 'signin' ? (
                  <>
                    New hotel owner?{' '}
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        setOwnerMode('register')
                        setError('')
                      }}
                      style={{ color: 'var(--red)', fontWeight: 600 }}
                    >
                      Create your hotel account
                    </a>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        setOwnerMode('signin')
                        setError('')
                      }}
                      style={{ color: 'var(--red)', fontWeight: 600 }}
                    >
                      Sign in here
                    </a>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={18} color="#e5c06e" /> Live Demo Environment
                </h2>
                <p className="auth-subtitle" style={{ fontSize: '12px' }}>
                  Explore APEX INN with pre-loaded demonstration properties (Metro Inn Rooms &amp; Sahasra Hotel).
                </p>
              </div>

              <div
                style={{
                  background: 'var(--card-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '14px',
                  marginBottom: '16px',
                  fontSize: '12px',
                  color: 'var(--text-2)',
                  lineHeight: '1.6',
                }}
              >
                <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
                  Demo Account Info:
                </div>
                <div>• Pre-populated with 12 sample properties and active room inventory</div>
                <div>• Allows testing bookings, check-in, payments, and reporting</div>
                <div>• Changes made here are isolated to the demo tenant</div>
              </div>

              <button
                type="button"
                className="btn btn-red"
                onClick={handleDemoSignIn}
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  padding: '12px',
                  fontSize: '14px',
                  gap: '8px',
                }}
                disabled={loading}
              >
                {loading ? (
                  <span className="spinner" style={{ width: 16, height: 16 }} />
                ) : (
                  <>
                    <span>Enter Live Demo as SuperAdmin</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>

              <div style={{ marginTop: '14px', textAlign: 'center', fontSize: '11px', color: 'var(--text-3)' }}>
                Demo credentials: admin@apexinn.com / admin123
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
