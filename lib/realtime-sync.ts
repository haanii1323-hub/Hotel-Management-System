'use client'

import { useEffect } from 'react'
import { mutate } from 'swr'

const CHANNEL_NAME = 'apex_inn_pms_sync'

export type RealtimeEventType =
  | 'BOOKING_CREATED'
  | 'BOOKING_UPDATED'
  | 'BOOKING_DELETED'
  | 'CHECK_IN'
  | 'CHECK_OUT'
  | 'PAYMENT_COLLECTED'
  | 'PAYMENT_DELETED'
  | 'PAYMENT_CONFIG_UPDATED'
  | 'ROOM_UPDATED'
  | 'ROOM_CREATED'
  | 'CATEGORY_UPDATED'
  | 'GUEST_CREATED'
  | 'GUEST_UPDATED'
  | 'PROPERTY_CHANGED'
  | 'PROPERTY_UPDATED'

export function broadcastChange(type: RealtimeEventType, payload?: Record<string, unknown>) {
  if (typeof window === 'undefined') return

  const message = {
    type,
    payload,
    timestamp: Date.now(),
  }

  // 1. Try BroadcastChannel API
  try {
    if ('BroadcastChannel' in window) {
      const bc = new BroadcastChannel(CHANNEL_NAME)
      bc.postMessage(message)
      bc.close()
    }
  } catch {
    // Fallback gracefully
  }

  // 2. Storage event fallback for cross-tab sync
  try {
    localStorage.setItem('apex_pms_sync_event', JSON.stringify(message))
  } catch {
    // Ignore storage quota or security errors
  }

  // 3. Invalidate local SWR caches immediately
  revalidateAllPmsData()
}

export async function revalidateAllPmsData() {
  await mutate(
    (key) =>
      typeof key === 'string' &&
      (key.startsWith('/api/dashboard') ||
        key.startsWith('/api/bookings') ||
        key.startsWith('/api/rooms') ||
        key.startsWith('/api/categories') ||
        key.startsWith('/api/guests') ||
        key.startsWith('/api/earnings') ||
        key.startsWith('/api/reports') ||
        key.startsWith('/api/notifications') ||
        key.startsWith('/api/properties') ||
        key.startsWith('/api/payment-config') ||
        key.startsWith('/api/search')),
    undefined,
    { revalidate: true }
  )
}

export function useRealtimeSync(callback?: () => void) {
  useEffect(() => {
    if (typeof window === 'undefined') return

    let bc: BroadcastChannel | null = null

    if ('BroadcastChannel' in window) {
      try {
        bc = new BroadcastChannel(CHANNEL_NAME)
        bc.onmessage = () => {
          revalidateAllPmsData()
          if (callback) callback()
        }
      } catch {
        bc = null
      }
    }

    function handleStorage(e: StorageEvent) {
      if (e.key === 'apex_pms_sync_event') {
        revalidateAllPmsData()
        if (callback) callback()
      }
    }

    window.addEventListener('storage', handleStorage)

    return () => {
      if (bc) bc.close()
      window.removeEventListener('storage', handleStorage)
    }
  }, [callback])
}
