import { prisma } from '../lib/prisma'
import * as fs from 'fs'
import * as path from 'path'

async function importFullDatabase(backupFilePath?: string) {
  const filePath = backupFilePath || path.join(__dirname, '../backups/backup-latest.json')
  if (!fs.existsSync(filePath)) {
    throw new Error(`Backup file not found at: ${filePath}`)
  }

  console.log(`🔄 Reading backup from: ${filePath}`)
  const raw = fs.readFileSync(filePath, 'utf-8')
  const dump = JSON.parse(raw)
  const { data, counts } = dump

  console.log('📊 Backup details:', { exportedAt: dump.exportedAt, counts })

  console.log('🚀 Importing tables in topological dependency order...')

  // 1. Tenants
  if (data.tenants && data.tenants.length > 0) {
    console.log(`  Importing ${data.tenants.length} Tenants...`)
    for (const t of data.tenants) {
      await prisma.tenant.upsert({
        where: { id: t.id },
        update: t,
        create: t,
      })
    }
  }

  // 2. Properties
  if (data.properties && data.properties.length > 0) {
    console.log(`  Importing ${data.properties.length} Properties...`)
    for (const p of data.properties) {
      await prisma.property.upsert({
        where: { id: p.id },
        update: p,
        create: p,
      })
    }
  }

  // 3. Users
  if (data.users && data.users.length > 0) {
    console.log(`  Importing ${data.users.length} Users...`)
    for (const u of data.users) {
      await prisma.user.upsert({
        where: { id: u.id },
        update: u,
        create: u,
      })
    }
  }

  // 4. Room Categories
  if (data.categories && data.categories.length > 0) {
    console.log(`  Importing ${data.categories.length} Room Categories...`)
    for (const c of data.categories) {
      await prisma.roomCategory.upsert({
        where: { id: c.id },
        update: c,
        create: c,
      })
    }
  }

  // 5. Rooms
  if (data.rooms && data.rooms.length > 0) {
    console.log(`  Importing ${data.rooms.length} Rooms...`)
    for (const r of data.rooms) {
      await prisma.room.upsert({
        where: { id: r.id },
        update: r,
        create: r,
      })
    }
  }

  // 6. Guests
  if (data.guests && data.guests.length > 0) {
    console.log(`  Importing ${data.guests.length} Guests...`)
    for (const g of data.guests) {
      await prisma.guest.upsert({
        where: { id: g.id },
        update: g,
        create: g,
      })
    }
  }

  // 7. Bookings
  if (data.bookings && data.bookings.length > 0) {
    console.log(`  Importing ${data.bookings.length} Bookings...`)
    for (const b of data.bookings) {
      await prisma.booking.upsert({
        where: { id: b.id },
        update: {
          ...b,
          checkIn: new Date(b.checkIn),
          checkOut: new Date(b.checkOut),
        },
        create: {
          ...b,
          checkIn: new Date(b.checkIn),
          checkOut: new Date(b.checkOut),
        },
      })
    }
  }

  // 8. BookingRooms
  if (data.bookingRooms && data.bookingRooms.length > 0) {
    console.log(`  Importing ${data.bookingRooms.length} BookingRooms...`)
    for (const br of data.bookingRooms) {
      await prisma.bookingRoom.upsert({
        where: { id: br.id },
        update: br,
        create: br,
      })
    }
  }

  // 9. Payments
  if (data.payments && data.payments.length > 0) {
    console.log(`  Importing ${data.payments.length} Payments...`)
    for (const p of data.payments) {
      await prisma.payment.upsert({
        where: { id: p.id },
        update: p,
        create: p,
      })
    }
  }

  // 10. Invoices
  if (data.invoices && data.invoices.length > 0) {
    console.log(`  Importing ${data.invoices.length} Invoices...`)
    for (const inv of data.invoices) {
      await prisma.invoice.upsert({
        where: { id: inv.id },
        update: { ...inv, generatedAt: new Date(inv.generatedAt) },
        create: { ...inv, generatedAt: new Date(inv.generatedAt) },
      })
    }
  }

  // 11. PaymentConfigs
  if (data.paymentConfigs && data.paymentConfigs.length > 0) {
    console.log(`  Importing ${data.paymentConfigs.length} PaymentConfigs...`)
    for (const pc of data.paymentConfigs) {
      await prisma.paymentConfig.upsert({
        where: { id: pc.id },
        update: pc,
        create: pc,
      })
    }
  }

  console.log('🎉 Database restore completed successfully! All records imported intact.')
}

const customPath = process.argv[2]
importFullDatabase(customPath)
  .catch(console.error)
  .finally(() => prisma.$disconnect())
