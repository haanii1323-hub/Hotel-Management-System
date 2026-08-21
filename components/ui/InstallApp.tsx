'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { Download, Smartphone, Laptop, Check, X, Share, PlusSquare, ArrowRight, ShieldCheck, Sparkles, MonitorCheck } from 'lucide-react'

type InstallContextType = {
  canInstall: boolean
  isInstalled: boolean
  isIOS: boolean
  isAndroid: boolean
  isMac: boolean
  isWindows: boolean
  promptInstall: () => void
  showModal: boolean
  setShowModal: (show: boolean) => void
}

const InstallContext = createContext<InstallContextType>({
  canInstall: false,
  isInstalled: false,
  isIOS: false,
  isAndroid: false,
  isMac: false,
  isWindows: false,
  promptInstall: () => {},
  showModal: false,
  setShowModal: () => {},
})

export const useInstallApp = () => useContext(InstallContext)

export function InstallAppProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [canInstall, setCanInstall] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)
  const [isMac, setIsMac] = useState(false)
  const [isWindows, setIsWindows] = useState(false)

  useEffect(() => {
    // Check if running as standalone PWA
    if (typeof window !== 'undefined') {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://')

      setIsInstalled(Boolean(isStandalone))

      // Platform detection
      const userAgent = window.navigator.userAgent.toLowerCase()
      const iosDevice = /iphone|ipad|ipod/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
      const androidDevice = /android/.test(userAgent)
      const macDevice = /macintosh|mac os x/.test(userAgent) && !iosDevice
      const winDevice = /windows/.test(userAgent)

      setIsIOS(iosDevice)
      setIsAndroid(androidDevice)
      setIsMac(macDevice)
      setIsWindows(winDevice)
    }

    // Capture beforeinstallprompt event (Chrome, Edge, Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setCanInstall(true)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setCanInstall(false)
      setDeferredPrompt(null)
      setShowModal(false)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // Register Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.log('Service Worker registration skipped:', err)
      })
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const promptInstall = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt()
        const choiceResult = await deferredPrompt.userChoice
        if (choiceResult.outcome === 'accepted') {
          setIsInstalled(true)
          setCanInstall(false)
          setShowModal(false)
        }
        setDeferredPrompt(null)
      } catch (err) {
        setShowModal(true)
      }
    } else {
      setShowModal(true)
    }
  }

  return (
    <InstallContext.Provider
      value={{
        canInstall,
        isInstalled,
        isIOS,
        isAndroid,
        isMac,
        isWindows,
        promptInstall,
        showModal,
        setShowModal,
      }}
    >
      {children}
      {showModal && <InstallAppModal onClose={() => setShowModal(false)} />}
    </InstallContext.Provider>
  )
}

export function InstallAppModal({ onClose }: { onClose: () => void }) {
  const { isIOS, isAndroid, isMac, isWindows, canInstall, promptInstall, isInstalled } = useInstallApp()

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '480px',
          width: '90%',
          background: 'var(--card)',
          borderRadius: '14px',
          border: '1px solid var(--border-2)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
          overflow: 'hidden',
          padding: 0,
        }}
      >
        {/* Header Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1c2026 0%, #0e1013 100%)',
            padding: '24px 20px 20px',
            borderBottom: '1px solid var(--border)',
            position: 'relative',
          }}
        >
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              color: 'var(--text-2)',
              padding: '6px',
              borderRadius: '6px',
              background: 'var(--card-2)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #ff4d4f 0%, #d32f2f 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 6px 16px rgba(229, 62, 62, 0.35)',
                flexShrink: 0,
              }}
            >
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                <polyline points="9,22 9,12 15,12 15,22" />
              </svg>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>APEX INN</h3>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    background: 'var(--red-dim)',
                    color: 'var(--red)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                >
                  PMS App
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '3px' }}>
                Real-Time Hotel Operating Console
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px' }}>
          {isInstalled ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'var(--green-dim)',
                  color: 'var(--green)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                }}
              >
                <Check size={24} />
              </div>
              <h4 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>App Already Installed!</h4>
              <p style={{ fontSize: '13px', color: 'var(--text-2)', marginTop: '6px' }}>
                APEX INN is installed on your device. You can launch it directly from your Dock, Applications, or Home Screen.
              </p>
              <button
                className="btn btn-red"
                onClick={onClose}
                style={{ marginTop: '16px', width: '100%', justifyContent: 'center' }}
              >
                Close
              </button>
            </div>
          ) : (
            <>
              {/* Features List */}
              <div
                style={{
                  background: 'var(--bg-2)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  marginBottom: '18px',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text)' }}>
                  <ShieldCheck size={15} color="#e53e3e" />
                  <span>Full-screen front desk experience without browser bars</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text)' }}>
                  <Sparkles size={15} color="#e53e3e" />
                  <span>Instant 1-tap launch from desktop dock or home screen</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text)' }}>
                  <Smartphone size={15} color="#e53e3e" />
                  <span>Fast offline caching & smooth animations</span>
                </div>
              </div>

              {/* Instructions based on device */}
              {isIOS ? (
                <div style={{ marginBottom: '18px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '10px' }}>
                    How to install on iOS / Safari:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-2)' }}>
                      <span
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: 'var(--card-2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: 'var(--text)',
                          flexShrink: 0,
                        }}
                      >
                        1
                      </span>
                      <span>
                        Tap the <strong style={{ color: 'var(--text)' }}>Share button</strong> <Share size={13} style={{ display: 'inline', verticalAlign: 'middle' }} /> in your Safari toolbar.
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-2)' }}>
                      <span
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: 'var(--card-2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: 'var(--text)',
                          flexShrink: 0,
                        }}
                      >
                        2
                      </span>
                      <span>
                        Scroll down and select <strong style={{ color: 'var(--text)' }}>&quot;Add to Home Screen&quot;</strong> <PlusSquare size={13} style={{ display: 'inline', verticalAlign: 'middle' }} />.
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-2)' }}>
                      <span
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: 'var(--card-2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: 'var(--text)',
                          flexShrink: 0,
                        }}
                      >
                        3
                      </span>
                      <span>
                        Tap <strong style={{ color: 'var(--text)' }}>Add</strong> in the top right to complete installation.
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom: '18px' }}>
                  {canInstall ? (
                    <button
                      className="btn btn-red"
                      onClick={promptInstall}
                      style={{
                        width: '100%',
                        justifyContent: 'center',
                        fontSize: '14px',
                        padding: '12px 18px',
                        fontWeight: 600,
                      }}
                    >
                      <Download size={16} /> Install APEX INN App Now
                    </button>
                  ) : (
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>
                        How to install on Chrome / Edge / Desktop:
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: '1.6' }}>
                        • On <strong style={{ color: 'var(--text)' }}>Chrome / Edge</strong>: Click the <strong>Install</strong> icon (computer/arrow) in the address bar at the top right.<br />
                        • On <strong style={{ color: 'var(--text)' }}>Android</strong>: Tap the menu (⋮) in Chrome and choose <strong>&quot;Install app&quot;</strong> or <strong>&quot;Add to Home screen&quot;</strong>.<br />
                        • On <strong style={{ color: 'var(--text)' }}>Safari (Mac)</strong>: Go to <strong>File &gt; Add to Dock...</strong> to install as a standalone app.
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button
                className="btn btn-outline"
                onClick={onClose}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Reusable Install App Button (Always permanently visible & consistent)
 */
export function InstallAppButton({
  variant = 'button',
  className = '',
}: {
  variant?: 'button' | 'icon-only' | 'sidebar-card' | 'landing-badge' | 'mobile-item'
  className?: string
}) {
  const { promptInstall, isInstalled, setShowModal } = useInstallApp()

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    promptInstall()
  }

  if (variant === 'icon-only') {
    return (
      <button
        onClick={handleClick}
        className={`install-icon-btn ${className}`}
        title={isInstalled ? "APEX INN App (Installed)" : "Install APEX INN App"}
        aria-label="Install App"
      >
        {isInstalled ? <Check size={16} color="var(--green)" /> : <Download size={16} />}
      </button>
    )
  }

  if (variant === 'landing-badge') {
    return (
      <button
        onClick={handleClick}
        className={`landing-install-pill ${className}`}
        title="Install APEX INN App"
      >
        {isInstalled ? <Check size={14} color="var(--green)" /> : <Download size={14} />}
        <span>{isInstalled ? 'App Active' : 'Install App'}</span>
      </button>
    )
  }

  if (variant === 'sidebar-card') {
    return (
      <div className={`sidebar-install-widget ${className}`} onClick={handleClick}>
        <div
          className="sidebar-install-icon"
          style={isInstalled ? { background: 'var(--green-dim)', color: 'var(--green)' } : undefined}
        >
          {isInstalled ? <MonitorCheck size={16} /> : <Download size={15} />}
        </div>
        <div className="sidebar-install-text">
          <div className="install-title">{isInstalled ? 'APEX INN App' : 'Install App'}</div>
          <div className="install-sub" style={isInstalled ? { color: 'var(--green)' } : undefined}>
            {isInstalled ? 'Running PMS App' : 'Standalone PMS'}
          </div>
        </div>
        <ArrowRight size={13} color="var(--text-2)" />
      </div>
    )
  }

  if (variant === 'mobile-item') {
    return (
      <button onClick={handleClick} className={`mobile-nav-item install-mobile-btn ${className}`}>
        {isInstalled ? <Check size={18} color="var(--green)" /> : <Download size={18} color="var(--red)" />}
        <span>{isInstalled ? 'App' : 'Install'}</span>
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      className={`btn btn-install ${className}`}
      title="Install APEX INN App on your device"
    >
      {isInstalled ? <Check size={14} color="var(--green)" /> : <Download size={14} />}
      <span>{isInstalled ? 'App Installed' : 'Install App'}</span>
    </button>
  )
}
