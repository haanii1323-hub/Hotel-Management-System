'use client'

import { SessionProvider } from 'next-auth/react'
import { ToastProvider } from '@/components/ui/Toast'
import { InstallAppProvider } from '@/components/ui/InstallApp'
import { PropertyProvider } from '@/context/PropertyContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <PropertyProvider>
        <ToastProvider>
          <InstallAppProvider>
            {children}
          </InstallAppProvider>
        </ToastProvider>
      </PropertyProvider>
    </SessionProvider>
  )
}
