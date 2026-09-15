'use client'

import { SessionProvider } from 'next-auth/react'
import { ToastProvider } from '@/components/ui/Toast'
import { InstallAppProvider } from '@/components/ui/InstallApp'
import { PropertyProvider } from '@/context/PropertyContext'
import { ThemeProvider } from '@/context/ThemeContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <PropertyProvider>
          <ToastProvider>
            <InstallAppProvider>
              {children}
            </InstallAppProvider>
          </ToastProvider>
        </PropertyProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}
