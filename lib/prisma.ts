import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function getDatabaseUrl(): string | undefined {
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('file:')) {
    return process.env.DATABASE_URL
  }

  // On Vercel / AWS Lambda, the root filesystem is read-only.
  // SQLite needs write access for WAL journals and transactions, so we use /tmp.
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const tmpDbPath = '/tmp/dev.db'
    if (!fs.existsSync(tmpDbPath)) {
      // Look for bundled dev.db
      const potentialPaths = [
        path.join(process.cwd(), 'prisma', 'dev.db'),
        path.join(process.cwd(), 'dev.db'),
        path.join(__dirname, 'dev.db'),
        path.join(__dirname, '..', 'dev.db'),
        path.join(__dirname, '..', 'prisma', 'dev.db'),
      ]

      for (const p of potentialPaths) {
        if (fs.existsSync(p)) {
          try {
            fs.copyFileSync(p, tmpDbPath)
            break
          } catch (e) {
            console.error('Failed to copy db to /tmp:', e)
          }
        }
      }
    }
    return `file:${tmpDbPath}`
  }

  return undefined
}

const dbUrl = getDatabaseUrl()

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error'],
    ...(dbUrl ? { datasources: { db: { url: dbUrl } } } : {}),
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
