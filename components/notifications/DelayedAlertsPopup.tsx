'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import {
  AlertCircle,
  LogIn,
  LogOut,
  Clock,
  ChevronDown,
  ChevronUp,
  X,
  Bell,
  ArrowRight,
  Sparkles,
  BedDouble,
  User,
  CreditCard,
  CheckCircle2,
} from 'lucide-react'
import { useProperty } from '@/context/PropertyContext'
import { useRealtimeSync, broadcastChange } from '@/lib/realtime-sync'
import CheckInModal from '@/components/bookings/CheckInModal'
import CheckoutModal from '@/components/bookings/CheckoutModal'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function DelayedAlertsPopup() {
  const router = useRouter()
  const { currentProperty } = useProperty()
  const propertyId = currentProperty?.id || ''

  const { data: notifData, mutate: refreshNotifications } = useSWR(
    propertyId ? `/api/notifications?propertyId=${propertyId}` : '/api/notifications',
    fetcher,
    { refreshInterval: 6000 }
  )

  useRealtimeSync(() => {
    refreshNotifications()
  })

  // Collapsed by default into sleek floating pill, user can expand or snooze
  const [isExpanded, setIsExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'checkin' | 'checkout'>('all')
  const [snoozeUntil, setSnoozeUntil] = useState<number | null>(null)
  const [isDismissed, setIsDismissed] = useState(false)

  // Selected booking for action modal
  const [checkInBooking, setCheckInBooking] = useState<any | null>(null)
  const [checkoutBooking, setCheckoutBooking] = useState<any | null>(null)

  // Check snooze status on mount or property change
  useEffect(() => {
    if (typeof window !== 'undefined' && propertyId) {
      const stored = sessionStorage.getItem(`delayed_alert_snooze_${propertyId}`)
      if (stored) {
        const time = parseInt(stored, 10)
        if (time > Date.now()) {
          setSnoozeUntil(time)
        } else {
          sessionStorage.removeItem(`delayed_alert_snooze_${propertyId}`)
        }
      }
    }
  }, [propertyId])

  const notifications = notifData?.notifications || []
  // Filter for delayed check-ins and delayed check-outs
  const delayedItems = useMemo(() => {
    return notifications.filter(
      (n: any) => n.isDelayed && (n.type === 'delayed_checkin' || n.type === 'delayed_checkout' || n.delayedDays > 0)
    )
  }, [notifications])

  const delayedCheckins = useMemo(() => {
    return delayedItems.filter(
      (n: any) => n.type === 'delayed_checkin' || (n.type === 'arrival' && n.isDelayed)
    )
  }, [delayedItems])

  const delayedCheckouts = useMemo(() => {
    return delayedItems.filter(
      (n: any) => n.type === 'delayed_checkout' || (n.type === 'departure' && n.isDelayed)
    )
  }, [delayedItems])

  const totalDelayed = delayedItems.length

  // If no delayed bookings or dismissed/snoozed, do not render
  if (totalDelayed === 0) return null

  const isSnoozed = snoozeUntil ? snoozeUntil > Date.now() : false
  if (isDismissed || isSnoozed) return null

  function handleSnooze(hours: number = 2) {
    const expireTime = Date.now() + hours * 60 * 60 * 1000
    setSnoozeUntil(expireTime)
    if (typeof window !== 'undefined' && propertyId) {
      sessionStorage.setItem(`delayed_alert_snooze_${propertyId}`, expireTime.toString())
    }
  }

  const displayedList =
    activeTab === 'checkin'
      ? delayedCheckins
      : activeTab === 'checkout'
      ? delayedCheckouts
      : delayedItems

  const currencySymbol = currentProperty?.currencySymbol || '₹'

  return (
    <>
      <div
        className="delayed-alert-dock"
        style={{
          position: 'fixed',
          bottom: '22px',
          right: '22px',
          zIndex: 999,
          width: isExpanded ? '440px' : 'auto',
          maxWidth: 'calc(100vw - 36px)',
          fontFamily: 'inherit',
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {!isExpanded ? (
          /* ====================================================================
             COMPACT FLOATING PILL / DYNAMIC ISLAND STYLE (Sleek & Non-Intrusive)
             ==================================================================== */
          <div
            onClick={() => setIsExpanded(true)}
            style={{
              background: 'rgba(18, 22, 28, 0.88)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              boxShadow: '0 12px 36px -4px rgba(0,0,0,0.7), 0 0 20px -2px rgba(239, 68, 68, 0.25)',
              borderRadius: '9999px',
              padding: '8px 14px 8px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              userSelect: 'none',
              animation: 'popInPill 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            className="hover-lift"
          >
            {/* Pulsing Beacon Icon */}
            <div
              style={{
                position: 'relative',
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 0 14px rgba(239, 68, 68, 0.6)',
                flexShrink: 0,
              }}
            >
              <Bell size={15} className="bell-shake" />
              <span
                style={{
                  position: 'absolute',
                  top: '-1px',
                  right: '-1px',
                  width: '9px',
                  height: '9px',
                  borderRadius: '50%',
                  background: '#22c55e',
                  border: '1.5px solid #111827',
                }}
              />
            </div>

            {/* Label */}
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.2px' }}>
                  {totalDelayed} Pending {totalDelayed === 1 ? 'Action' : 'Actions'}
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#f87171',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    borderRadius: '10px',
                    padding: '1px 6px',
                  }}
                >
                  Overdue
                </span>
              </div>
              <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                {delayedCheckins.length > 0 && `${delayedCheckins.length} check-in`}
                {delayedCheckins.length > 0 && delayedCheckouts.length > 0 && ' · '}
                {delayedCheckouts.length > 0 && `${delayedCheckouts.length} checkout`}
              </span>
            </div>

            {/* Expand Action Arrow */}
            <div
              style={{
                marginLeft: '4px',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#cbd5e1',
              }}
            >
              <ChevronUp size={14} />
            </div>
          </div>
        ) : (
          /* ====================================================================
             EXPANDED LUXURY CARD DRAWER (Clean, Elegant & Action-Oriented)
             ==================================================================== */
          <div
            style={{
              background: 'rgba(15, 18, 24, 0.94)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '0 24px 60px -12px rgba(0, 0, 0, 0.8), 0 0 1px 1px rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              overflow: 'hidden',
              animation: 'scaleInCard 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '14px 18px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(255, 255, 255, 0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(245, 158, 11, 0.15) 100%)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#f87171',
                  }}
                >
                  <AlertCircle size={17} />
                </div>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.2px' }}>
                    Front Desk Overdue Alerts
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>
                    Pending manual check-ins &amp; check-outs
                  </div>
                </div>
              </div>

              {/* Window Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  title="Minimize to dock"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease',
                  }}
                  className="btn-ghost-hover"
                >
                  <ChevronDown size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleSnooze(2)}
                  title="Snooze for 2 hours"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease',
                  }}
                  className="btn-ghost-hover"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 18px 6px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '20px',
                  border: 'none',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: activeTab === 'all' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                  color: activeTab === 'all' ? '#fff' : '#94a3b8',
                  transition: 'all 0.15s ease',
                }}
              >
                All ({totalDelayed})
              </button>
              {delayedCheckins.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('checkin')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '20px',
                    border: 'none',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: activeTab === 'checkin' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                    color: activeTab === 'checkin' ? '#f87171' : '#94a3b8',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Check-in ({delayedCheckins.length})
                </button>
              )}
              {delayedCheckouts.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('checkout')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '20px',
                    border: 'none',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: activeTab === 'checkout' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: activeTab === 'checkout' ? '#fbbf24' : '#94a3b8',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Checkout ({delayedCheckouts.length})
                </button>
              )}
            </div>

            {/* List Body */}
            <div style={{ maxHeight: '340px', overflowY: 'auto', padding: '10px 14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {displayedList.map((item: any) => {
                  const isCheckin = item.type === 'delayed_checkin' || item.type === 'arrival'
                  const isCheckout = item.type === 'delayed_checkout' || item.type === 'departure'
                  const overdueDays = item.delayedDays || 0

                  return (
                    <div
                      key={item.id}
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.07)',
                        borderRadius: '10px',
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        transition: 'background 0.15s ease, border-color 0.15s ease',
                      }}
                      className="alert-item-card"
                    >
                      {/* Top Row: Guest & Status Badge */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '8px',
                              background: isCheckin
                                ? 'rgba(239, 68, 68, 0.12)'
                                : 'rgba(245, 158, 11, 0.12)',
                              color: isCheckin ? '#f87171' : '#fbbf24',
                              border: isCheckin
                                ? '1px solid rgba(239, 68, 68, 0.25)'
                                : '1px solid rgba(245, 158, 11, 0.25)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {item.guestName ? item.guestName.slice(0, 2).toUpperCase() : 'GU'}
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9' }}>
                              {item.guestName}
                            </div>
                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>
                              {item.bookingRef} · {item.roomCategory} ({item.assignedRooms})
                            </div>
                          </div>
                        </div>

                        {/* Overdue Tag */}
                        <span
                          style={{
                            fontSize: '10.5px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: isCheckin ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: isCheckin ? '#f87171' : '#fbbf24',
                            border: isCheckin
                              ? '1px solid rgba(239, 68, 68, 0.3)'
                              : '1px solid rgba(245, 158, 11, 0.3)',
                            whiteSpace: 'nowrap',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Clock size={11} />
                          {overdueDays > 0 ? `${overdueDays}d overdue` : 'Due today'}
                        </span>
                      </div>

                      {/* Bottom Row: Balance & Action Buttons */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingTop: '8px',
                          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                        }}
                      >
                        <div style={{ fontSize: '11.5px' }}>
                          {item.balance > 0 ? (
                            <span style={{ color: '#fbbf24', fontWeight: 600 }}>
                              Balance: {currencySymbol}
                              {item.balance.toLocaleString('en-IN')}
                            </span>
                          ) : (
                            <span style={{ color: '#4ade80', fontWeight: 600 }}>
                              Fully Settled
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              router.push(`/bookings?selected=${item.bookingId}`)
                              setIsExpanded(false)
                            }}
                            style={{
                              background: 'rgba(255, 255, 255, 0.06)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              color: '#cbd5e1',
                              borderRadius: '6px',
                              padding: '4px 9px',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                            className="btn-ghost-hover"
                          >
                            Details
                          </button>

                          {isCheckin && item.booking && (
                            <button
                              type="button"
                              onClick={() => {
                                setCheckInBooking(item.booking)
                                setIsExpanded(false)
                              }}
                              style={{
                                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                border: 'none',
                                color: '#fff',
                                borderRadius: '6px',
                                padding: '4px 12px',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
                                transition: 'all 0.15s ease',
                              }}
                              className="btn-red-hover"
                            >
                              <LogIn size={12} /> Check In
                            </button>
                          )}

                          {isCheckout && item.booking && (
                            <button
                              type="button"
                              onClick={() => {
                                setCheckoutBooking(item.booking)
                                setIsExpanded(false)
                              }}
                              style={{
                                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                border: 'none',
                                color: '#111827',
                                borderRadius: '6px',
                                padding: '4px 12px',
                                fontSize: '11.5px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                boxShadow: '0 2px 8px rgba(245, 158, 11, 0.4)',
                                transition: 'all 0.15s ease',
                              }}
                              className="btn-amber-hover"
                            >
                              <LogOut size={12} /> Checkout
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: '9px 18px',
                background: 'rgba(0, 0, 0, 0.25)',
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '11px',
                color: '#64748b',
              }}
            >
              <span>Live PMS Queue</span>
              <button
                type="button"
                onClick={() => handleSnooze(2)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '11px',
                  textDecoration: 'underline',
                }}
              >
                Snooze for 2 hours
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Check In Modal */}
      {checkInBooking && (
        <CheckInModal
          booking={checkInBooking}
          onClose={() => setCheckInBooking(null)}
          onSuccess={() => {
            setCheckInBooking(null)
            refreshNotifications()
            broadcastChange('CHECK_IN')
          }}
        />
      )}

      {/* Checkout Modal */}
      {checkoutBooking && (
        <CheckoutModal
          booking={checkoutBooking}
          onClose={() => setCheckoutBooking(null)}
          onSuccess={() => {
            setCheckoutBooking(null)
            refreshNotifications()
            broadcastChange('CHECK_OUT')
          }}
        />
      )}

      <style jsx global>{`
        @keyframes popInPill {
          0% {
            transform: scale(0.85) translateY(12px);
            opacity: 0;
          }
          100% {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }
        @keyframes scaleInCard {
          0% {
            transform: scale(0.92) translateY(16px);
            opacity: 0;
          }
          100% {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }
        @keyframes bellShake {
          0%, 100% { transform: rotate(0deg); }
          20%, 60% { transform: rotate(12deg); }
          40%, 80% { transform: rotate(-12deg); }
        }
        .bell-shake {
          animation: bellShake 2.5s infinite ease-in-out;
        }
        .hover-lift {
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease;
        }
        .hover-lift:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 44px -4px rgba(0,0,0,0.8), 0 0 24px -2px rgba(239, 68, 68, 0.35) !important;
        }
        .alert-item-card:hover {
          background: rgba(255, 255, 255, 0.05) !important;
          border-color: rgba(255, 255, 255, 0.14) !important;
        }
        .btn-ghost-hover:hover {
          background: rgba(255, 255, 255, 0.12) !important;
          color: #fff !important;
        }
        .btn-red-hover:hover {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }
        .btn-amber-hover:hover {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }
      `}</style>
    </>
  )
}
