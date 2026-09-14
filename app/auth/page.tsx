'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { InstallAppButton } from '@/components/ui/InstallApp'
import {
  Building2,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Lock,
  User,
  Mail,
  Hotel,
  KeyRound,
  Search,
  ArrowLeft,
  Check,
} from 'lucide-react'

export default function AuthPage() {
  const router = useRouter()
  const [authTab, setAuthTab] = useState<'owner' | 'demo'>('owner')
  const [ownerMode, setOwnerMode] = useState<'signin' | 'register' | 'forgot'>('signin')
  const [form, setForm] = useState({ name: '', hotelName: '', email: '', password: '' })
  const [forgotForm, setForgotForm] = useState({ identifier: '', newPassword: '', confirmPassword: '' })
  const [discoveredAccount, setDiscoveredAccount] = useState<any>(null)
  const [findingAccount, setFindingAccount] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const updateForgot = (k: string, v: string) => {
    setForgotForm((f) => ({ ...f, [k]: v }))
    setError('')
  }

  async function handleOwnerSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccessMsg('')
    setLoading(true)
    const res = await signIn('credentials', {
      email: form.email.trim(),
      password: form.password,
      redirect: false,
    })
    setLoading(false)
    if (res?.error) {
      setError('Invalid email or password. Please check your credentials or use Forgot Password.')
    } else {
      router.push('/dashboard')
    }
  }

  async function handleOwnerRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccessMsg('')
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
        setSuccessMsg('Account created! Please sign in using your credentials.')
        setOwnerMode('signin')
      } else {
        router.push('/dashboard')
      }
    } catch {
      setError('Network error during registration. Please try again.')
      setLoading(false)
    }
  }

  async function handleLookupAccount() {
    if (!forgotForm.identifier.trim()) {
      setError('Please enter your email, hotel name, or property code.')
      return
    }
    setError('')
    setFindingAccount(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'lookup',
          identifier: forgotForm.identifier.trim(),
        }),
      })
      const data = await res.json()
      if (res.ok && data.found) {
        setDiscoveredAccount(data)
        setSuccessMsg(`Account found: "${data.hotelName}" · Email: ${data.email}`)
      } else {
        setDiscoveredAccount(null)
        setError(data.error || 'No matching account found.')
      }
    } catch {
      setError('Failed to search account. Please try again.')
    } finally {
      setFindingAccount(false)
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccessMsg('')

    if (!forgotForm.identifier.trim()) {
      setError('Please enter your registered email, hotel name, or property code.')
      return
    }

    if (!forgotForm.newPassword || forgotForm.newPassword.length < 6) {
      setError('New password must be at least 6 characters long.')
      return
    }

    if (forgotForm.newPassword !== forgotForm.confirmPassword) {
      setError('Passwords do not match. Please re-type your new password.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: forgotForm.identifier.trim(),
          newPassword: forgotForm.newPassword,
        }),
      })
      const data = await res.json()
      setLoading(false)

      if (res.ok) {
        setSuccessMsg(`Password reset successfully for ${data.email}! Signing you in...`)
        // Auto sign in with the new password
        const signInRes = await signIn('credentials', {
          email: data.email,
          password: forgotForm.newPassword,
          redirect: false,
        })
        if (!signInRes?.error) {
          router.push('/dashboard')
        } else {
          setForm((f) => ({ ...f, email: data.email, password: forgotForm.newPassword }))
          setOwnerMode('signin')
        }
      } else {
        setError(data.error || 'Failed to reset password.')
      }
    } catch {
      setError('Network error while resetting password. Please try again.')
      setLoading(false)
    }
  }

  async function handleDemoSignIn() {
    setError('')
    setSuccessMsg('')
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
        <div className="auth-left-logo" style={{ gap: '10px' }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #e53e3e 0%, #b91c1c 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 2px 10px rgba(229, 62, 62, 0.4)',
            }}
          >
            <Hotel size={22} />
          </div>
          <span style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.3px' }}>Hotel Management System</span>
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
                setSuccessMsg('')
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
                setSuccessMsg('')
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

          {successMsg && (
            <div className="alert alert-success" style={{ marginBottom: '16px' }}>
              <Check size={14} />
              {successMsg}
            </div>
          )}

          {authTab === 'owner' ? (
            <div>
              {/* Header Title */}
              <div style={{ marginBottom: '16px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {ownerMode === 'signin' && 'Sign In to Your Hotel'}
                  {ownerMode === 'register' && 'Create Your Hotel PMS Account'}
                  {ownerMode === 'forgot' && (
                    <>
                      <KeyRound size={18} color="var(--red)" /> Account Recovery &amp; Reset Password
                    </>
                  )}
                </h2>
                <p className="auth-subtitle" style={{ fontSize: '12px', marginTop: '2px' }}>
                  {ownerMode === 'signin' && 'Access your private hotel organization and operations.'}
                  {ownerMode === 'register' && 'Start with a clean, dedicated environment for your hotel business.'}
                  {ownerMode === 'forgot' && 'Recover access if you forgot your password or email address.'}
                </p>
              </div>

              {/* FORGOT PASSWORD / RECOVERY FORM */}
              {ownerMode === 'forgot' ? (
                <form onSubmit={handleResetPassword}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Email, Hotel Name, or Code *</span>
                      <button
                        type="button"
                        onClick={handleLookupAccount}
                        disabled={findingAccount || !forgotForm.identifier.trim()}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--red-hover)',
                          fontSize: '11px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontWeight: 600,
                        }}
                      >
                        {findingAccount ? (
                          <span className="spinner" style={{ width: 10, height: 10 }} />
                        ) : (
                          <Search size={11} />
                        )}
                        Find Account
                      </button>
                    </label>
                    <input
                      className="form-control"
                      type="text"
                      placeholder="e.g. owner@hotel.com, Metro Inn Rooms, or BLR3396"
                      value={forgotForm.identifier}
                      onChange={(e) => updateForgot('identifier', e.target.value)}
                      required
                      autoFocus
                    />
                    <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '4px' }}>
                      Forgot your email? Enter your Hotel Name, Phone, or Property Code.
                    </div>
                  </div>

                  {discoveredAccount && (
                    <div
                      style={{
                        background: 'rgba(34, 197, 94, 0.08)',
                        border: '1px solid rgba(34, 197, 94, 0.25)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '10px 12px',
                        marginBottom: '14px',
                        fontSize: '12px',
                        color: 'var(--green)',
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>✓ Verified Hotel Account</div>
                      <div style={{ color: 'var(--text-2)', marginTop: '2px' }}>
                        {discoveredAccount.hotelName} ({discoveredAccount.propertyCode}) · Registered Email:{' '}
                        <strong style={{ color: '#ffffff' }}>{discoveredAccount.email}</strong>
                      </div>
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">New Password *</label>
                    <input
                      className="form-control"
                      type="password"
                      placeholder="At least 6 characters"
                      value={forgotForm.newPassword}
                      onChange={(e) => updateForgot('newPassword', e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Confirm New Password *</label>
                    <input
                      className="form-control"
                      type="password"
                      placeholder="Re-type new password"
                      value={forgotForm.confirmPassword}
                      onChange={(e) => updateForgot('confirmPassword', e.target.value)}
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
                      fontWeight: 600,
                    }}
                    disabled={loading}
                  >
                    {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Reset Password & Sign In'}
                  </button>

                  <div style={{ marginTop: '16px', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setOwnerMode('signin')
                        setError('')
                        setSuccessMsg('')
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-2)',
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <ArrowLeft size={13} /> Back to Sign In
                    </button>
                  </div>
                </form>
              ) : (
                /* SIGN IN & REGISTER FORM */
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label className="form-label" style={{ margin: 0 }}>Password *</label>
                      {ownerMode === 'signin' && (
                        <a
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            setOwnerMode('forgot')
                            setForgotForm((f) => ({ ...f, identifier: form.email }))
                            setError('')
                            setSuccessMsg('')
                          }}
                          style={{
                            fontSize: '12px',
                            color: 'var(--red-hover)',
                            textDecoration: 'none',
                            fontWeight: 500,
                          }}
                        >
                          Forgot password?
                        </a>
                      )}
                    </div>
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
                            setSuccessMsg('')
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
                            setSuccessMsg('')
                          }}
                          style={{ color: 'var(--red)', fontWeight: 600 }}
                        >
                          Sign in here
                        </a>
                      </>
                    )}
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* LIVE DEMO TAB */
            <div>
              <div style={{ marginBottom: '16px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={18} color="#e5c06e" /> Live Demo Environment
                </h2>
                <p className="auth-subtitle" style={{ fontSize: '12px' }}>
                  Explore the Hotel Management System with pre-loaded demonstration properties (Metro Inn Rooms &amp; Sahasra Hotel).
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
                <div>• Pre-populated with sample properties and active room inventory</div>
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
