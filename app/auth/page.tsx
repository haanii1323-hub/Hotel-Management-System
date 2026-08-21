'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'signin' | 'register'>('signin')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await signIn('credentials', {
      email: form.email,
      password: form.password,
      redirect: false,
    })
    setLoading(false)
    if (res?.error) {
      setError('Invalid email or password. Please try again.')
    } else {
      router.push('/dashboard')
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
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
    // Auto sign in
    const signInRes = await signIn('credentials', {
      email: form.email,
      password: form.password,
      redirect: false,
    })
    setLoading(false)
    if (signInRes?.error) setError('Account created but sign-in failed.')
    else router.push('/dashboard')
  }

  return (
    <div className="auth-page">
      {/* Left panel */}
      <div className="auth-left">
        <div className="auth-left-logo">
          <div className="auth-left-logo-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              <polyline points="9,22 9,12 15,12 15,22"/>
            </svg>
          </div>
          <span>APEX INN</span>
        </div>

        <div className="auth-left-content">
          <h1>The front desk, the ledger and the rate card — on one screen.</h1>
          <p>Check guests in, collect balances, tune nightly rates and watch occupancy move in real time across every device on property.</p>
        </div>

        <div className="auth-left-footer">Admin access only</div>
      </div>

      {/* Right panel */}
      <div className="auth-right">
        <div className="auth-form-box">
          <h2>{mode === 'signin' ? 'Staff sign in' : 'Create account'}</h2>
          <p className="auth-subtitle">APEX INN hotel operations console</p>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: '16px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={mode === 'signin' ? handleSignIn : handleRegister}>
            {mode === 'register' && (
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  className="form-control"
                  type="text"
                  placeholder="Your name"
                  value={form.name}
                  onChange={e => update('name', e.target.value)}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                className="form-control"
                type="email"
                placeholder="staff@hotel.com"
                value={form.email}
                onChange={e => update('email', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                className="form-control"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={e => update('password', e.target.value)}
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              className="btn btn-red"
              style={{ width: '100%', justifyContent: 'center', padding: '11px', marginTop: '8px', fontSize: '14px' }}
              disabled={loading}
            >
              {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : (mode === 'signin' ? 'Sign in' : 'Create account')}
            </button>
          </form>

          <div className="auth-link">
            {mode === 'signin' ? (
              <>No account yet? <a href="#" onClick={e => { e.preventDefault(); setMode('register'); setError('') }}>Create one</a></>
            ) : (
              <>Already have an account? <a href="#" onClick={e => { e.preventDefault(); setMode('signin'); setError('') }}>Sign in</a></>
            )}
          </div>

          <div style={{ marginTop: '24px', padding: '12px', background: 'var(--card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>Demo credentials</div>
            <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>admin@apexinn.com / admin123</div>
          </div>
        </div>
      </div>
    </div>
  )
}
