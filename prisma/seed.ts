import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🧹 Clearing sample data and preparing real-time clean database...')

  // Clean up all existing data
  await prisma.bookingStatusLog.deleteMany()
  await prisma.roomStatusLog.deleteMany()
  await prisma.invoice.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.bookingRoom.deleteMany()
  await prisma.booking.deleteMany()
  await prisma.room.deleteMany()
  await prisma.roomCategory.deleteMany()
  await prisma.guest.deleteMany()
  await prisma.user.deleteMany()

  // --- Users ---
  const passwordHash = await bcrypt.hash('admin123', 10)
  const user = await prisma.user.create({
    data: {
      email: 'admin@apexinn.com',
      passwordHash,
      name: 'Admin',
      role: 'admin',
    },
  })
  console.log('✅ Admin user created:', user.email)

  // --- Room Categories ---
  const deluxe = await prisma.roomCategory.create({
    data: { name: 'Deluxe', nightlyRate: 800, totalRooms: 5 },
  })
  const classic = await prisma.roomCategory.create({
    data: { name: 'Classic', nightlyRate: 1896, totalRooms: 8 },
  })
  const suite = await prisma.roomCategory.create({
    data: { name: 'Suite', nightlyRate: 3900, totalRooms: 2 },
  })
  console.log('✅ Room categories created')

  // --- Rooms (All set to Available) ---
  const deluxeRooms = await Promise.all([
    prisma.room.create({ data: { number: 'DELUXE_001', categoryId: deluxe.id, status: 'Available' } }),
    prisma.room.create({ data: { number: 'DELUXE_1', categoryId: deluxe.id, status: 'Available' } }),
    prisma.room.create({ data: { number: 'DELUXE_2', categoryId: deluxe.id, status: 'Available' } }),
    prisma.room.create({ data: { number: 'DELUXE_3', categoryId: deluxe.id, status: 'Available' } }),
    prisma.room.create({ data: { number: 'DELUXE_4', categoryId: deluxe.id, status: 'Available' } }),
  ])

  const classicRooms = await Promise.all([
    prisma.room.create({ data: { number: 'CLASSIC_1', categoryId: classic.id, status: 'Available' } }),
    prisma.room.create({ data: { number: 'CLASSIC_2', categoryId: classic.id, status: 'Available' } }),
    prisma.room.create({ data: { number: 'CLASSIC_3', categoryId: classic.id, status: 'Available' } }),
    prisma.room.create({ data: { number: 'CLASSIC_4', categoryId: classic.id, status: 'Available' } }),
    prisma.room.create({ data: { number: 'CLASSIC_5', categoryId: classic.id, status: 'Available' } }),
    prisma.room.create({ data: { number: 'CLASSIC_6', categoryId: classic.id, status: 'Available' } }),
    prisma.room.create({ data: { number: 'CLASSIC_7', categoryId: classic.id, status: 'Available' } }),
    prisma.room.create({ data: { number: 'CLASSIC_8', categoryId: classic.id, status: 'Available' } }),
  ])

  const suiteRooms = await Promise.all([
    prisma.room.create({ data: { number: 'SUITE_1', categoryId: suite.id, status: 'Available' } }),
    prisma.room.create({ data: { number: 'SUITE_2', categoryId: suite.id, status: 'Available' } }),
  ])
  console.log('✅ Rooms initialized (all Available):', deluxeRooms.length + classicRooms.length + suiteRooms.length)
  console.log('🎉 Clean real-time database ready! (0 bookings, 0 dummy data)')
  console.log('')
  console.log('Login credentials:')
  console.log('  Email: admin@apexinn.com')
  console.log('  Password: admin123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
