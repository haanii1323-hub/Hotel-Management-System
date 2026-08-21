'use client'
import { SessionProvider } from 'next-auth/react'
import { ToastProvider } from '@/components/ui/Toast'
import { InstallAppProvider } from '@/components/ui/InstallApp'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>
        <InstallAppProvider>
          {children}
        </InstallAppProvider>
      </ToastProvider>
    </SessionProvider>
  )
}

