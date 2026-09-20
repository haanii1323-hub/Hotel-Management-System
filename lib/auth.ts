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

        const rawIdentifier = credentials.email.trim()
        const emailLower = rawIdentifier.toLowerCase()
        const inputPassword = credentials.password

        const isDemoIdentifier =
          emailLower === 'admin@apexinn.com' ||
          emailLower === 'demo@apexinn.com' ||
          emailLower === 'admin' ||
          emailLower === 'demo' ||
          emailLower === 'blr3396' ||
          emailLower === 'metro inn'

        const isDemoPassword = inputPassword === 'admin123' || inputPassword.trim() === 'admin123'

        try {
          // 1. Try finding user by Email (case-insensitive), Name, Property Code, or Hotel/Tenant Name
          let user = await prisma.user.findFirst({
            where: {
              OR: [
                { email: { equals: emailLower, mode: 'insensitive' } },
                { email: { equals: rawIdentifier, mode: 'insensitive' } },
                { name: { equals: rawIdentifier, mode: 'insensitive' } },
                {
                  tenant: {
                    properties: {
                      some: {
                        OR: [
                          { code: { equals: rawIdentifier, mode: 'insensitive' } },
                          { name: { contains: rawIdentifier, mode: 'insensitive' } },
                        ],
                      },
                    },
                  },
                },
                {
                  tenant: {
                    name: { contains: rawIdentifier, mode: 'insensitive' },
                  },
                },
              ],
            },
            include: {
              tenant: {
                include: {
                  properties: true,
                },
              },
            },
          })

          // 2. Fallback auto-provision for Demo Admin if DB is fresh
          if (!user) {
            if (isDemoIdentifier && isDemoPassword) {
              let demoTenant = await prisma.tenant.findUnique({
                where: { slug: 'demo' },
                include: { properties: true },
              })
              if (!demoTenant) {
                demoTenant = await prisma.tenant.create({
                  data: {
                    id: 'demo-tenant',
                    name: 'Demo Hospitality Group',
                    slug: 'demo',
                    isDemo: true,
                  },
                  include: { properties: true },
                })
              }
              const passwordHash = await bcrypt.hash('admin123', 10)
              const targetEmail = emailLower.includes('@') ? emailLower : 'admin@apexinn.com'
              user = await prisma.user.upsert({
                where: { email: targetEmail },
                update: { passwordHash, role: 'owner', tenantId: demoTenant.id },
                create: {
                  email: targetEmail,
                  passwordHash,
                  name: targetEmail.startsWith('demo') ? 'Demo User' : 'Demo Admin',
                  role: 'owner',
                  tenantId: demoTenant.id,
                },
                include: { tenant: { include: { properties: true } } },
              })
            } else {
              return null
            }
          }

          // 3. Password Verification
          let isValid = await bcrypt.compare(inputPassword, user.passwordHash)
          if (!isValid && inputPassword.trim() !== inputPassword) {
            isValid = await bcrypt.compare(inputPassword.trim(), user.passwordHash)
          }

          // Demo fallback password bypass
          if (
            !isValid &&
            (user.email === 'admin@apexinn.com' || user.email === 'demo@apexinn.com' || user.tenant?.isDemo) &&
            isDemoPassword
          ) {
            isValid = true
          }

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
            propertyId: user.propertyId || user.tenant?.properties?.[0]?.id || null,
          }
        } catch (dbError: any) {
          console.error('Database error during authentication:', dbError?.message || dbError)

          // Resilient Fallback: If DB is down, quota exceeded, or unreachable, allow demo access
          if (isDemoIdentifier && isDemoPassword) {
            return {
              id: 'demo-admin-id',
              email: 'admin@apexinn.com',
              name: 'Demo Admin',
              role: 'owner',
              tenantId: 'demo-tenant',
              tenantSlug: 'demo',
              tenantName: 'Demo Hospitality Group',
              isDemo: true,
              propertyId: null,
            }
          }

          return null
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
