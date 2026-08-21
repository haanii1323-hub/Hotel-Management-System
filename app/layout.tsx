import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'APEX INN — Hotel Management System',
  description: 'The front desk, the ledger and the rate card — on one screen. APEX INN is the admin console for your property.',
  keywords: 'hotel management, property management system, PMS, hotel software',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
