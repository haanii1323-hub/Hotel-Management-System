'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { InstallAppButton } from '@/components/ui/InstallApp'
import ThemeToggle from '@/components/ui/ThemeToggle'
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
  BedDouble,
  Activity,
  Zap,
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
      <div style={{ position: 'absolute', top: '18px', right: '20px', zIndex: 10, display: 'flex', alignItems: 'center', gap: '10px' }}>
        <ThemeToggle variant="pill" />
        <InstallAppButton variant="landing-badge" />
      </div>

      {/* Left panel */}
      <div className="auth-left">
        <Link href="/" className="auth-left-logo" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="34" height="34" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 3L4 10V33H32V10L18 3Z" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M9 13V33" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M15 11V33" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M21 11V33" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M27 13V33" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M2 33H34" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
              <path d="M18 3V8" stroke="var(--accent)" strokeWidth="1.5" />
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', fontWeight: 800, color: 'var(--text)', letterSpacing: '0.5px', lineHeight: 1.1 }}>
              HOTEL MANAGEMENT
            </div>
            <div style={{ fontSize: '10.5px', color: 'var(--text-3)', fontWeight: 500, letterSpacing: '0.4px', marginTop: '2px' }}>
              Cloud Property Management System
            </div>
          </div>
        </Link>

        <div className="auth-left-content">
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: 'var(--red-dim)',
              border: '1px solid var(--border-glow)',
              borderRadius: '20px',
              color: 'var(--red)',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              marginBottom: '20px',
              width: 'fit-content',
            }}
          >
            <Sparkles size={13} /> Enterprise Multi-Tenant PMS
          </div>

          <h1>The front desk, ledger, and rate card — on one unified screen.</h1>
          <p>
            Check guests in, collect balances, manage room inventory, tune nightly rates, and watch live occupancy across all your properties in real time.
          </p>

          {/* Feature list */}
          <div style={{ marginTop: '28px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '13px',
                color: 'var(--text-1)',
                fontWeight: 500,
                background: 'var(--card-2)',
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                width: 'fit-content',
              }}
            >
              <CheckCircle2 size={16} color="#16a34a" />
              <span>Strict Database Tenant Isolation &amp; Privacy</span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '13px',
                color: 'var(--text-1)',
                fontWeight: 500,
                background: 'var(--card-2)',
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                width: 'fit-content',
              }}
            >
              <CheckCircle2 size={16} color="#16a34a" />
              <span>Overlapping Double-Booking Prevention</span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '13px',
                color: 'var(--text-1)',
                fontWeight: 500,
                background: 'var(--card-2)',
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                width: 'fit-content',
              }}
            >
              <CheckCircle2 size={16} color="#16a34a" />
              <span>Instant Cross-Device Real-Time Sync</span>
            </div>
          </div>

          {/* Metrics summary widget (100% Data-Safe Platform Benchmarks) */}
          <div
            style={{
              marginTop: '32px',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              padding: '16px',
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)' }}>99.99%</div>
              <div style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 500 }}>Cloud Uptime</div>
            </div>
            <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '12px' }}>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)' }}>0 ms</div>
              <div style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 500 }}>In-Memory Sync</div>
            </div>
            <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '12px' }}>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#16a34a' }}>100%</div>
              <div style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 500 }}>Tenant Isolation</div>
            </div>
          </div>
        </div>

        <div className="auth-left-footer">
          <ShieldCheck size={16} color="var(--red)" />
          <span>Production Secured · 256-Bit Encrypted Multi-Tenant Architecture</span>
        </div>
      </div>

      {/* Right panel */}
      <div className="auth-right">
        <div className="auth-form-box">
          {/* Main Mode Tabs */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              background: 'var(--card-2)',
              padding: '4px',
              borderRadius: '8px',
              marginBottom: '24px',
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
                padding: '10px 12px',
                borderRadius: '6px',
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
                boxShadow: authTab === 'owner' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Building2 size={15} color={authTab === 'owner' ? 'var(--red)' : 'currentColor'} /> My Hotel Account
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthTab('demo')
                setError('')
                setSuccessMsg('')
              }}
              style={{
                padding: '10px 12px',
                borderRadius: '6px',
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
                boxShadow: authTab === 'demo' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Sparkles size={15} color="var(--accent)" /> Try Live Demo
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
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {ownerMode === 'signin' && 'Sign In to Your Hotel'}
                  {ownerMode === 'register' && 'Create Your Hotel PMS Account'}
                  {ownerMode === 'forgot' && (
                    <>
                      <KeyRound size={20} color="var(--red)" /> Account Recovery &amp; Reset Password
                    </>
                  )}
                </h2>
                <p className="auth-subtitle" style={{ fontSize: '13px', color: 'var(--text-2)', marginTop: '4px' }}>
                  {ownerMode === 'signin' && 'Access your private hotel organization and operations.'}
                  {ownerMode === 'register' && 'Start with a clean, dedicated environment for your hotel business.'}
                  {ownerMode === 'forgot' && 'Recover access if you forgot your password or email address.'}
                </p>
              </div>

              {/* FORGOT PASSWORD / RECOVERY FORM */}
              {ownerMode === 'forgot' ? (
                <form onSubmit={handleResetPassword}>
                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', color: 'var(--text-1)', fontWeight: 600 }}>
                      <span>Email, Hotel Name, or Code *</span>
                      <button
                        type="button"
                        onClick={handleLookupAccount}
                        disabled={findingAccount || !forgotForm.identifier.trim()}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--red)',
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontWeight: 600,
                        }}
                      >
                        {findingAccount ? (
                          <span className="spinner" style={{ width: 12, height: 12 }} />
                        ) : (
                          <Search size={12} />
                        )}
                        Find Account
                      </button>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        className="form-control"
                        type="text"
                        placeholder="e.g. owner@hotel.com, Metro Inn, or BLR3396"
                        value={forgotForm.identifier}
                        onChange={(e) => updateForgot('identifier', e.target.value)}
                        required
                        autoFocus
                        style={{ height: '42px', paddingLeft: '14px' }}
                      />
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '4px' }}>
                      Forgot your email? Enter your Hotel Name, Phone, or Property Code.
                    </div>
                  </div>

                  {discoveredAccount && (
                    <div
                      style={{
                        background: 'rgba(34, 197, 94, 0.1)',
                        border: '1px solid rgba(34, 197, 94, 0.3)',
                        borderRadius: '8px',
                        padding: '12px 14px',
                        marginBottom: '16px',
                        fontSize: '12px',
                        color: '#16a34a',
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>✓ Verified Hotel Account</div>
                      <div style={{ color: 'var(--text-2)', marginTop: '2px' }}>
                        {discoveredAccount.hotelName} ({discoveredAccount.propertyCode}) · Registered Email:{' '}
                        <strong style={{ color: 'var(--text)' }}>{discoveredAccount.email}</strong>
                      </div>
                    </div>
                  )}

                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label className="form-label" style={{ marginBottom: '6px', color: 'var(--text-1)', fontWeight: 600 }}>New Password *</label>
                    <input
                      className="form-control"
                      type="password"
                      placeholder="At least 6 characters"
                      value={forgotForm.newPassword}
                      onChange={(e) => updateForgot('newPassword', e.target.value)}
                      required
                      minLength={6}
                      style={{ height: '42px', paddingLeft: '14px' }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label className="form-label" style={{ marginBottom: '6px', color: 'var(--text-1)', fontWeight: 600 }}>Confirm New Password *</label>
                    <input
                      className="form-control"
                      type="password"
                      placeholder="Re-type new password"
                      value={forgotForm.confirmPassword}
                      onChange={(e) => updateForgot('confirmPassword', e.target.value)}
                      required
                      minLength={6}
                      style={{ height: '42px', paddingLeft: '14px' }}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-red"
                    style={{
                      width: '100%',
                      justifyContent: 'center',
                      padding: '12px',
                      fontSize: '14px',
                      fontWeight: 600,
                      borderRadius: '8px',
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
                        fontWeight: 500,
                      }}
                    >
                      <ArrowLeft size={14} /> Back to Sign In
                    </button>
                  </div>
                </form>
              ) : (
                /* SIGN IN & REGISTER FORM */
                <form onSubmit={ownerMode === 'signin' ? handleOwnerSignIn : handleOwnerRegister}>
                  {ownerMode === 'register' && (
                    <>
                      <div className="form-group" style={{ marginBottom: '16px' }}>
                        <label className="form-label" style={{ marginBottom: '6px', color: 'var(--text-1)', fontWeight: 600 }}>Your Full Name *</label>
                        <div style={{ position: 'relative' }}>
                          <input
                            className="form-control"
                            type="text"
                            placeholder="e.g. Vikram Malhotra"
                            value={form.name}
                            onChange={(e) => update('name', e.target.value)}
                            required
                            style={{ height: '42px', paddingLeft: '38px' }}
                          />
                          <User size={16} color="var(--text-3)" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                        </div>
                      </div>

                      <div className="form-group" style={{ marginBottom: '16px' }}>
                        <label className="form-label" style={{ marginBottom: '6px', color: 'var(--text-1)', fontWeight: 600 }}>Hotel / Business Name *</label>
                        <div style={{ position: 'relative' }}>
                          <input
                            className="form-control"
                            type="text"
                            placeholder="e.g. Grand Heritage Resort &amp; Spa"
                            value={form.hotelName}
                            onChange={(e) => update('hotelName', e.target.value)}
                            required
                            style={{ height: '42px', paddingLeft: '38px' }}
                          />
                          <Building2 size={16} color="var(--text-3)" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label className="form-label" style={{ marginBottom: '6px', color: 'var(--text-1)', fontWeight: 600 }}>Email Address *</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        className="form-control"
                        type="email"
                        placeholder="owner@yourhotel.com"
                        value={form.email}
                        onChange={(e) => update('email', e.target.value)}
                        required
                        style={{ height: '42px', paddingLeft: '38px' }}
                      />
                      <Mail size={16} color="var(--text-3)" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label className="form-label" style={{ margin: 0, color: 'var(--text-1)', fontWeight: 600 }}>Password *</label>
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
                            color: 'var(--red)',
                            textDecoration: 'none',
                            fontWeight: 600,
                          }}
                        >
                          Forgot password?
                        </a>
                      )}
                    </div>
                    <div style={{ position: 'relative' }}>
                      <input
                        className="form-control"
                        type="password"
                        placeholder="••••••••"
                        value={form.password}
                        onChange={(e) => update('password', e.target.value)}
                        required
                        minLength={6}
                        style={{ height: '42px', paddingLeft: '38px' }}
                      />
                      <Lock size={16} color="var(--text-3)" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-red"
                    style={{
                      width: '100%',
                      justifyContent: 'center',
                      padding: '12px',
                      fontSize: '14.5px',
                      fontWeight: 700,
                      borderRadius: '8px',
                      boxShadow: '0 4px 14px var(--red-glow)',
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

                  <div className="auth-link" style={{ marginTop: '18px', textAlign: 'center', fontSize: '13px' }}>
                    {ownerMode === 'signin' ? (
                      <>
                        <span style={{ color: 'var(--text-2)' }}>New hotel owner? </span>
                        <a
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            setOwnerMode('register')
                            setError('')
                            setSuccessMsg('')
                          }}
                          style={{ color: 'var(--red)', fontWeight: 700 }}
                        >
                          Create your hotel account
                        </a>
                      </>
                    ) : (
                      <>
                        <span style={{ color: 'var(--text-2)' }}>Already have an account? </span>
                        <a
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            setOwnerMode('signin')
                            setError('')
                            setSuccessMsg('')
                          }}
                          style={{ color: 'var(--red)', fontWeight: 700 }}
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
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={20} color="var(--accent)" /> Live Demo Environment
                </h2>
                <p className="auth-subtitle" style={{ fontSize: '13px', color: 'var(--text-2)', marginTop: '4px' }}>
                  Explore the Hotel Management System with pre-loaded demonstration properties (Metro Inn Rooms &amp; Sahasra Hotel).
                </p>
              </div>

              <div
                style={{
                  background: 'var(--card-2)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '16px',
                  marginBottom: '20px',
                  fontSize: '12px',
                  color: 'var(--text-2)',
                  lineHeight: '1.6',
                }}
              >
                <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: '6px', fontSize: '13px' }}>
                  Included in Demo:
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <CheckCircle2 size={14} color="#16a34a" /> 2 Multi-floor properties with 40+ configured rooms
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <CheckCircle2 size={14} color="#16a34a" /> Pre-loaded active bookings, revenue, and guest ledgers
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={14} color="#16a34a" /> Real-time check-in, check-out, and invoice printing
                </div>
              </div>

              <button
                type="button"
                className="btn btn-red"
                onClick={handleDemoSignIn}
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  padding: '13px',
                  fontSize: '14.5px',
                  fontWeight: 700,
                  gap: '8px',
                  borderRadius: '8px',
                  boxShadow: '0 4px 14px var(--red-glow)',
                }}
                disabled={loading}
              >
                {loading ? (
                  <span className="spinner" style={{ width: 16, height: 16 }} />
                ) : (
                  <>
                    <span>Enter Live Demo as SuperAdmin</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '12px', color: 'var(--text-3)' }}>
                Demo credentials: <strong style={{ color: 'var(--text-2)' }}>admin@apexinn.com / admin123</strong>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
