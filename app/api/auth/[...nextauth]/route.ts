import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'apex-inn-super-secret-key-2024-hotel-pms'

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
