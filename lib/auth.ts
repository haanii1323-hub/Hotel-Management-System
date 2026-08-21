import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

async function ensureInitialData() {
  try {
    const userCount = await prisma.user.count()
    if (userCount === 0) {
      const passwordHash = await bcrypt.hash('admin123', 10)
      await prisma.user.create({
        data: {
          email: 'admin@apexinn.com',
          passwordHash,
          name: 'Sahasra',
          role: 'admin',
        },
      })

      // Ensure room categories
      const deluxe = await prisma.roomCategory.upsert({
        where: { name: 'Deluxe' },
        update: {},
        create: { name: 'Deluxe', nightlyRate: 800, totalRooms: 5 },
      })
      const classic = await prisma.roomCategory.upsert({
        where: { name: 'Classic' },
        update: {},
        create: { name: 'Classic', nightlyRate: 1896, totalRooms: 8 },
      })
      const suite = await prisma.roomCategory.upsert({
        where: { name: 'Suite' },
        update: {},
        create: { name: 'Suite', nightlyRate: 3900, totalRooms: 2 },
      })

      // Ensure rooms
      const existingRooms = await prisma.room.count()
      if (existingRooms === 0) {
        for (let i = 1; i <= 5; i++) {
          await prisma.room.create({ data: { number: `DELUXE_${i}`, categoryId: deluxe.id, status: 'Available' } })
        }
        for (let i = 1; i <= 8; i++) {
          await prisma.room.create({ data: { number: `CLASSIC_${i}`, categoryId: classic.id, status: 'Available' } })
        }
        for (let i = 1; i <= 2; i++) {
          await prisma.room.create({ data: { number: `SUITE_${i}`, categoryId: suite.id, status: 'Available' } })
        }
      }
    }
  } catch (err) {
    console.error('Error ensuring initial data:', err)
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

        // Auto-seed admin user if database is freshly deployed
        await ensureInitialData()

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        })

        if (!user) {
          // If default admin login attempted and not found, create it
          if (credentials.email.toLowerCase().trim() === 'admin@apexinn.com' && credentials.password === 'admin123') {
            const passwordHash = await bcrypt.hash('admin123', 10)
            const newAdmin = await prisma.user.create({
              data: {
                email: 'admin@apexinn.com',
                passwordHash,
                name: 'Sahasra',
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
