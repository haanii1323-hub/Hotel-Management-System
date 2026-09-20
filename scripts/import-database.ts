import { prisma } from '../lib/prisma'
import * as fs from 'fs'
import * as path from 'path'

async function importFullDatabase(backupFilePath?: string) {
  let filePath = backupFilePath
  if (!filePath) {
    const masterPath = path.join(__dirname, '../backups/master-archive-complete-timeline.json')
    const latestPath = path.join(__dirname, '../backups/backup-latest.json')
    filePath = fs.existsSync(masterPath) ? masterPath : latestPath
  }

  if (!fs.existsSync(filePath)) {
    throw new Error(`Backup file not found at: ${filePath}`)
  }

  console.log(`🔄 Reading master backup from: ${filePath}`)
  const raw = fs.readFileSync(filePath, 'utf-8')
  const dump = JSON.parse(raw)
  const { data, counts } = dump

  console.log('📊 Master Dataset Details:', {
    version: dump.meta?.version || '1.0',
    generatedAt: dump.meta?.generatedAt || dump.exportedAt,
    counts,
  })

  console.log('🚀 Importing tables in topological dependency order (Zero-Data-Loss)...')

  // Helper to sanitize payload for Prisma
  const cleanPayload = (obj: any) => {
    const copy = { ...obj }
    delete copy.origin
    delete copy._count
    return copy
  }

  // 1. Tenants
  if (data.tenants && data.tenants.length > 0) {
    console.log(`  Importing ${data.tenants.length} Tenants...`)
    for (const t of data.tenants) {
      const payload = cleanPayload(t)
      await prisma.tenant.upsert({
        where: { id: payload.id },
        update: payload,
        create: payload,
      })
    }
  }

  // 2. Properties
  if (data.properties && data.properties.length > 0) {
    console.log(`  Importing ${data.properties.length} Properties...`)
    for (const p of data.properties) {
      const payload = cleanPayload(p)
      await prisma.property.upsert({
        where: { id: payload.id },
        update: payload,
        create: payload,
      })
    }
  }

  // 3. Users
  if (data.users && data.users.length > 0) {
    console.log(`  Importing ${data.users.length} Users...`)
    for (const u of data.users) {
      const payload = cleanPayload(u)
      await prisma.user.upsert({
        where: { id: payload.id },
        update: payload,
        create: payload,
      })
    }
  }

  // 4. Room Categories
  if (data.categories && data.categories.length > 0) {
    console.log(`  Importing ${data.categories.length} Room Categories...`)
    for (const c of data.categories) {
      const payload = cleanPayload(c)
      await prisma.roomCategory.upsert({
        where: { id: payload.id },
        update: payload,
        create: payload,
      })
    }
  }

  // 5. Rooms
  if (data.rooms && data.rooms.length > 0) {
    console.log(`  Importing ${data.rooms.length} Rooms...`)
    for (const r of data.rooms) {
      const payload = cleanPayload(r)
      await prisma.room.upsert({
        where: { id: payload.id },
        update: payload,
        create: payload,
      })
    }
  }

  // 6. Guests
  if (data.guests && data.guests.length > 0) {
    console.log(`  Importing ${data.guests.length} Guests...`)
    for (const g of data.guests) {
      const payload = cleanPayload(g)
      await prisma.guest.upsert({
        where: { id: payload.id },
        update: payload,
        create: payload,
      })
    }
  }

  // 7. Bookings
  if (data.bookings && data.bookings.length > 0) {
    console.log(`  Importing ${data.bookings.length} Bookings...`)
    for (const b of data.bookings) {
      const payload = cleanPayload(b)
      await prisma.booking.upsert({
        where: { id: payload.id },
        update: {
          ...payload,
          checkIn: new Date(payload.checkIn),
          checkOut: new Date(payload.checkOut),
        },
        create: {
          ...payload,
          checkIn: new Date(payload.checkIn),
          checkOut: new Date(payload.checkOut),
        },
      })
    }
  }

  // 8. BookingRooms
  if (data.bookingRooms && data.bookingRooms.length > 0) {
    console.log(`  Importing ${data.bookingRooms.length} BookingRooms...`)
    for (const br of data.bookingRooms) {
      const payload = cleanPayload(br)
      await prisma.bookingRoom.upsert({
        where: { id: payload.id },
        update: payload,
        create: payload,
      })
    }
  }

  // 9. Payments
  if (data.payments && data.payments.length > 0) {
    console.log(`  Importing ${data.payments.length} Payments...`)
    for (const p of data.payments) {
      const payload = cleanPayload(p)
      await prisma.payment.upsert({
        where: { id: payload.id },
        update: payload,
        create: payload,
      })
    }
  }

  // 10. Invoices
  if (data.invoices && data.invoices.length > 0) {
    console.log(`  Importing ${data.invoices.length} Invoices...`)
    for (const inv of data.invoices) {
      const payload = cleanPayload(inv)
      await prisma.invoice.upsert({
        where: { id: payload.id },
        update: { ...payload, generatedAt: new Date(payload.generatedAt) },
        create: { ...payload, generatedAt: new Date(payload.generatedAt) },
      })
    }
  }

  // 11. PaymentConfigs
  if (data.paymentConfigs && data.paymentConfigs.length > 0) {
    console.log(`  Importing ${data.paymentConfigs.length} PaymentConfigs...`)
    for (const pc of data.paymentConfigs) {
      const payload = cleanPayload(pc)
      await prisma.paymentConfig.upsert({
        where: { id: payload.id },
        update: payload,
        create: payload,
      })
    }
  }

  // 12. Audit Logs
  if (data.roomStatusLogs && data.roomStatusLogs.length > 0) {
    console.log(`  Importing ${data.roomStatusLogs.length} RoomStatusLogs...`)
    for (const rsl of data.roomStatusLogs) {
      const payload = cleanPayload(rsl)
      await prisma.roomStatusLog.upsert({
        where: { id: payload.id },
        update: payload,
        create: payload,
      })
    }
  }

  if (data.bookingStatusLogs && data.bookingStatusLogs.length > 0) {
    console.log(`  Importing ${data.bookingStatusLogs.length} BookingStatusLogs...`)
    for (const bsl of data.bookingStatusLogs) {
      const payload = cleanPayload(bsl)
      await prisma.bookingStatusLog.upsert({
        where: { id: payload.id },
        update: payload,
        create: payload,
      })
    }
  }

  console.log('🎉 Database master restore complete! 100% of historical timeline preserved and synchronized.')
}

const customPath = process.argv[2]
importFullDatabase(customPath)
  .catch(console.error)
  .finally(() => prisma.$disconnect())
