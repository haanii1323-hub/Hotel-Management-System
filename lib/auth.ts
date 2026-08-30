import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

async function ensureAdminUser() {
  try {
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@apexinn.com' },
    })
    if (!admin) {
      const passwordHash = await bcrypt.hash('admin123', 10)
      await prisma.user.create({
        data: {
          email: 'admin@apexinn.com',
          passwordHash,
          name: 'SuperAdmin',
          role: 'admin',
        },
      })
    }
  } catch (err) {
    console.error('Error ensuring admin user in auth:', err)
  }
}

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

        await ensureAdminUser()

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        })

        if (!user) {
          if (credentials.email.toLowerCase().trim() === 'admin@apexinn.com' && credentials.password === 'admin123') {
            const passwordHash = await bcrypt.hash('admin123', 10)
            const newAdmin = await prisma.user.create({
              data: {
                email: 'admin@apexinn.com',
                passwordHash,
                name: 'SuperAdmin',
                role: 'admin',
              },
            })
            return {
              id: newAdmin.id,
              email: newAdmin.email,
              name: newAdmin.name,
              role: newAdmin.role,
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
        token.role = (user as { role?: string }).role
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.role = token.role as string
        session.user.id = token.id as string
      }
      return session
    },
  },
  pages: {
    signIn: '/auth',
  },
  secret: process.env.NEXTAUTH_SECRET || 'apex-inn-super-secret-key-2024-hotel-pms',
}
