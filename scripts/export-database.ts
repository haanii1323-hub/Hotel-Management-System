import { prisma } from '../lib/prisma'
import * as fs from 'fs'
import * as path from 'path'

async function exportFullDatabase() {
  console.log('🔄 Starting complete database export...')

  const [
    tenants,
    properties,
    users,
    categories,
    rooms,
    guests,
    bookings,
    bookingRooms,
    payments,
    invoices,
    paymentConfigs,
    roomStatusLogs,
    bookingStatusLogs,
  ] = await Promise.all([
    prisma.tenant.findMany(),
    prisma.property.findMany(),
    prisma.user.findMany(),
    prisma.roomCategory.findMany(),
    prisma.room.findMany(),
    prisma.guest.findMany(),
    prisma.booking.findMany(),
    prisma.bookingRoom.findMany(),
    prisma.payment.findMany(),
    prisma.invoice.findMany(),
    prisma.paymentConfig.findMany(),
    prisma.roomStatusLog.findMany(),
    prisma.bookingStatusLog.findMany(),
  ])

  const dump = {
    exportedAt: new Date().toISOString(),
    counts: {
      tenants: tenants.length,
      properties: properties.length,
      users: users.length,
      categories: categories.length,
      rooms: rooms.length,
      guests: guests.length,
      bookings: bookings.length,
      bookingRooms: bookingRooms.length,
      payments: payments.length,
      invoices: invoices.length,
      paymentConfigs: paymentConfigs.length,
      roomStatusLogs: roomStatusLogs.length,
      bookingStatusLogs: bookingStatusLogs.length,
    },
    data: {
      tenants,
      properties,
      users,
      categories,
      rooms,
      guests,
      bookings,
      bookingRooms,
      payments,
      invoices,
      paymentConfigs,
      roomStatusLogs,
      bookingStatusLogs,
    },
  }

  const backupDir = path.join(__dirname, '../backups')
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }

  const filename = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  const latestFilename = `backup-latest.json`
  const filePath = path.join(backupDir, filename)
  const latestPath = path.join(backupDir, latestFilename)

  fs.writeFileSync(filePath, JSON.stringify(dump, null, 2), 'utf-8')
  fs.writeFileSync(latestPath, JSON.stringify(dump, null, 2), 'utf-8')

  console.log('✅ Full database successfully exported!')
  console.log(`📁 Backup saved to: ${filePath}`)
  console.log(`📁 Latest backup symlink/copy at: ${latestPath}`)
  console.log('📊 Exported Summary:', dump.counts)
}

exportFullDatabase()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
