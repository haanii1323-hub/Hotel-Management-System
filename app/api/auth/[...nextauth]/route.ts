import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextRequest } from 'next/server'

process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'apex-inn-super-secret-key-2024-hotel-pms-production-secure'

async function authHandler(req: NextRequest, ctx: any) {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000'
  const proto = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
  
  // Dynamically set NEXTAUTH_URL to the incoming request domain
  process.env.NEXTAUTH_URL = `${proto}://${host}`
  
  return NextAuth(authOptions)(req, ctx)
}

export { authHandler as GET, authHandler as POST }
