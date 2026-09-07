import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const emailLower = credentials.email.toLowerCase().trim()
        const user = await prisma.user.findUnique({
          where: { email: emailLower },
          include: { tenant: true },
        })

        if (!user) {
          // Fallback auto-provision for Demo Admin if needed
          if ((emailLower === 'admin@apexinn.com' || emailLower === 'demo@apexinn.com') && credentials.password === 'admin123') {
            let demoTenant = await prisma.tenant.findUnique({ where: { slug: 'demo' } })
            if (!demoTenant) {
              demoTenant = await prisma.tenant.create({
                data: {
                  id: 'demo-tenant',
                  name: 'Demo Hospitality Group',
                  slug: 'demo',
                  isDemo: true,
                },
              })
            }
            const passwordHash = await bcrypt.hash('admin123', 10)
            const newAdmin = await prisma.user.create({
              data: {
                email: emailLower,
                passwordHash,
                name: emailLower.startsWith('demo') ? 'Demo User' : 'Demo Admin',
                role: 'owner',
                tenantId: demoTenant.id,
              },
              include: { tenant: true },
            })
            return {
              id: newAdmin.id,
              email: newAdmin.email,
              name: newAdmin.name,
              role: newAdmin.role,
              tenantId: newAdmin.tenantId,
              tenantSlug: newAdmin.tenant.slug,
              tenantName: newAdmin.tenant.name,
              isDemo: newAdmin.tenant.isDemo,
              propertyId: newAdmin.propertyId,
            }
          }
          return null
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
          tenantSlug: user.tenant?.slug || 'demo',
          tenantName: user.tenant?.name || 'Hotel Group',
          isDemo: user.tenant?.isDemo ?? false,
          propertyId: user.propertyId,
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.tenantId = user.tenantId
        token.tenantSlug = user.tenantSlug
        token.tenantName = user.tenantName
        token.isDemo = user.isDemo
        token.propertyId = user.propertyId
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.tenantId = token.tenantId as string
        session.user.tenantSlug = token.tenantSlug as string
        session.user.tenantName = token.tenantName as string
        session.user.isDemo = Boolean(token.isDemo)
        session.user.propertyId = token.propertyId as string | null
      }
      return session
    },
  },
  pages: {
    signIn: '/auth',
  },
  secret: process.env.NEXTAUTH_SECRET || 'apex-inn-super-secret-key-2024-hotel-pms',
}
