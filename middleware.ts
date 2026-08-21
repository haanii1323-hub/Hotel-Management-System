import { withAuth } from 'next-auth/middleware'

const secret = process.env.NEXTAUTH_SECRET || 'apex-inn-super-secret-key-2024-hotel-pms'

export default withAuth({
  secret,
  pages: {
    signIn: '/auth',
  },
})

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/bookings/:path*',
    '/pricing/:path*',
    '/guests/:path*',
    '/earnings/:path*',
    '/reports/:path*',
  ],
}
