'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import {
  AlertTriangle,
  LogIn,
  LogOut,
  Clock,
  ChevronDown,
  ChevronUp,
  X,
  Bell,
  ArrowRight,
  Sparkles,
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

  const [isMinimized, setIsMinimized] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [snoozeUntil, setSnoozeUntil] = useState<number | null>(null)

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
  const delayedItems = notifications.filter(
    (n: any) => n.isDelayed && (n.type === 'delayed_checkin' || n.type === 'delayed_checkout' || n.delayedDays > 0)
  )

  const delayedCheckins = delayedItems.filter(
    (n: any) => n.type === 'delayed_checkin' || (n.type === 'arrival' && n.isDelayed)
  )
  const delayedCheckouts = delayedItems.filter(
    (n: any) => n.type === 'delayed_checkout' || (n.type === 'departure' && n.isDelayed)
  )

  const totalDelayed = delayedItems.length

  // If no delayed bookings or dismissed/snoozed, do not render popup
  if (totalDelayed === 0) return null

  const isSnoozed = snoozeUntil ? snoozeUntil > Date.now() : false
  if (isDismissed || isSnoozed) return null

  function handleSnooze(hours: number = 1) {
    const expireTime = Date.now() + hours * 60 * 60 * 1000
    setSnoozeUntil(expireTime)
    if (typeof window !== 'undefined' && propertyId) {
      sessionStorage.setItem(`delayed_alert_snooze_${propertyId}`, expireTime.toString())
    }
  }

  const currencySymbol = currentProperty?.currencySymbol || '₹'

  return (
    <>
      <div
        className="delayed-alerts-container"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 999,
          maxWidth: isMinimized ? '320px' : '420px',
          width: 'calc(100vw - 48px)',
          animation: 'slideUpAlert 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div
          style={{
            background: 'var(--card-2)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '12px',
            boxShadow: '0 16px 40px -8px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(239, 68, 68, 0.15)',
            backdropFilter: 'blur(16px)',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '12px 16px',
              background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.2) 0%, rgba(245, 158, 11, 0.1) 100%)',
              borderBottom: isMinimized ? 'none' : '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              cursor: 'pointer',
              userSelect: 'none',
            }}
            onClick={() => setIsMinimized(!isMinimized)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  background: 'var(--red)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  flexShrink: 0,
                  boxShadow: '0 0 12px rgba(239, 68, 68, 0.5)',
                }}
              >
                <AlertTriangle size={15} />
              </div>
              <div>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: 'var(--text)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>Manual Action Required</span>
                  <span
                    style={{
                      background: 'var(--red)',
                      color: '#fff',
                      fontSize: '10px',
                      fontWeight: 800,
                      padding: '1px 6px',
                      borderRadius: '10px',
                    }}
                  >
                    {totalDelayed}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-2)' }}>
                  {delayedCheckins.length > 0 && `${delayedCheckins.length} check-in`}
                  {delayedCheckins.length > 0 && delayedCheckouts.length > 0 && ' · '}
                  {delayedCheckouts.length > 0 && `${delayedCheckouts.length} checkout`} delayed
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? 'Expand details' : 'Minimize'}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-2)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                {isMinimized ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              <button
                type="button"
                className="btn-icon"
                onClick={() => handleSnooze(2)}
                title="Snooze alerts for 2 hours"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-3)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Body Content when expanded */}
          {!isMinimized && (
            <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
              <div style={{ padding: '8px 0' }}>
                {delayedItems.map((item: any) => {
                  const isCheckin = item.type === 'delayed_checkin' || item.type === 'arrival'
                  const isCheckout = item.type === 'delayed_checkout' || item.type === 'departure'
                  const overdueDays = item.delayedDays || 0

                  return (
                    <div
                      key={item.id}
                      style={{
                        padding: '10px 16px',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        background: 'rgba(255, 255, 255, 0.01)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text)' }}>
                              {item.guestName}
                            </span>
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: '4px',
                                background: isCheckin ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                color: isCheckin ? 'var(--red)' : 'var(--amber)',
                                border: isCheckin
                                  ? '1px solid rgba(239, 68, 68, 0.3)'
                                  : '1px solid rgba(245, 158, 11, 0.3)',
                              }}
                            >
                              {isCheckin ? 'DELAYED CHECK-IN' : 'OVERDUE CHECKOUT'}
                            </span>
                          </div>

                          <div style={{ fontSize: '11px', color: 'var(--text-2)', marginTop: '2px' }}>
                            Ref: <strong>{item.bookingRef}</strong> · {item.roomCategory} ({item.assignedRooms})
                          </div>
                        </div>

                        {/* Overdue Badge */}
                        <div
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: overdueDays > 0 ? 'var(--red)' : 'var(--amber)',
                            whiteSpace: 'nowrap',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Clock size={12} />
                          {overdueDays > 0 ? `${overdueDays}d overdue` : 'Due today'}
                        </div>
                      </div>

                      {/* Financial info & Fast Actions */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: 'var(--card)',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid var(--border)',
                          marginTop: '2px',
                        }}
                      >
                        <div style={{ fontSize: '11px' }}>
                          {item.balance > 0 ? (
                            <span style={{ color: 'var(--amber)', fontWeight: 600 }}>
                              Balance: {currencySymbol}
                              {item.balance.toLocaleString('en-IN')}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--green)', fontWeight: 600 }}>Fully Paid</span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: '11px', padding: '3px 8px', height: '24px' }}
                            onClick={() => {
                              router.push(`/bookings?selected=${item.bookingId}`)
                            }}
                          >
                            Details
                          </button>

                          {isCheckin && item.booking && (
                            <button
                              type="button"
                              className="btn btn-red btn-sm"
                              style={{ fontSize: '11px', padding: '3px 10px', height: '24px', gap: '4px' }}
                              onClick={() => setCheckInBooking(item.booking)}
                            >
                              <LogIn size={12} /> Check In
                            </button>
                          )}

                          {isCheckout && item.booking && (
                            <button
                              type="button"
                              className="btn btn-amber btn-sm"
                              style={{
                                fontSize: '11px',
                                padding: '3px 10px',
                                height: '24px',
                                gap: '4px',
                                background: 'var(--amber)',
                                color: '#000',
                                fontWeight: 600,
                              }}
                              onClick={() => setCheckoutBooking(item.booking)}
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

              {/* Footer */}
              <div
                style={{
                  padding: '8px 16px',
                  background: 'var(--card)',
                  borderTop: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  color: 'var(--text-3)',
                }}
              >
                <span>Automated delay tracking</span>
                <button
                  type="button"
                  onClick={() => handleSnooze(2)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-2)',
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
        @keyframes slideUpAlert {
          from {
            transform: translateY(30px) scale(0.95);
            opacity: 0;
          }
          to {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </>
  )
}
