import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrate() {
  console.log('Running Tenant raw migration...')
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Tenant" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "slug" TEXT NOT NULL,
        "isDemo" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
      );
    `)

    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "Tenant_slug_key" ON "Tenant"("slug");
    `)

    await prisma.$executeRawUnsafe(`
      INSERT INTO "Tenant" ("id", "name", "slug", "isDemo", "createdAt", "updatedAt")
      VALUES ('demo-tenant', 'Demo Hospitality Group', 'demo', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("slug") DO UPDATE SET "isDemo" = true;
    `)

    // Ensure tenantId column exists on Property & User
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'demo-tenant';
    `)

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'demo-tenant';
    `)

    await prisma.$executeRawUnsafe(`
      UPDATE "Property" SET "tenantId" = 'demo-tenant' WHERE "tenantId" IS NULL OR "tenantId" = '';
    `)

    await prisma.$executeRawUnsafe(`
      UPDATE "User" SET "tenantId" = 'demo-tenant' WHERE "tenantId" IS NULL OR "tenantId" = '';
    `)

    console.log('✅ Tenant table & foreign keys pre-migrated successfully!')
  } catch (err) {
    console.error('Migration error:', err)
  } finally {
    await prisma.$disconnect()
  }
}

migrate()
