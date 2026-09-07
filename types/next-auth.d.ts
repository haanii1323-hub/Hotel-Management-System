import NextAuth, { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: string
      tenantId: string
      tenantSlug: string
      tenantName: string
      isDemo: boolean
      propertyId?: string | null
    } & DefaultSession['user']
  }

  interface User {
    id: string
    name?: string | null
    email?: string | null
    role: string
    tenantId: string
    tenantSlug: string
    tenantName: string
    isDemo: boolean
    propertyId?: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
    tenantId: string
    tenantSlug: string
    tenantName: string
    isDemo: boolean
    propertyId?: string | null
  }
}
