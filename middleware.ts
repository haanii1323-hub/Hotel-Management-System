export { default } from 'next-auth/middleware'

export const config = {
  matcher: ['/dashboard/:path*', '/bookings/:path*', '/pricing/:path*', '/guests/:path*', '/earnings/:path*', '/reports/:path*'],
}
