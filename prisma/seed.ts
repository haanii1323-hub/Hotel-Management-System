import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding APEX INN database...')

  // Clean up
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
      name: 'Sahasra',
      role: 'admin',
    },
  })
  console.log('✅ User created:', user.email)

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

  // --- Rooms ---
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
  console.log('✅ Rooms created:', deluxeRooms.length + classicRooms.length + suiteRooms.length)

  // --- Guests ---
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const guestEjaz = await prisma.guest.create({ data: { name: 'Ejaz', phone: '9876543210', email: 'ejaz@example.com' } })
  const guestMaaz = await prisma.guest.create({ data: { name: 'Maaz', phone: '9876543211', email: 'maaz@example.com' } })
  const guestMubarak = await prisma.guest.create({ data: { name: 'Mubarak Pasha', phone: '9876543212', email: 'mubarak@example.com' } })
  const guestAzgar = await prisma.guest.create({ data: { name: 'Azgar', phone: '9876543213', email: 'azgar@example.com' } })
  const guestAsif = await prisma.guest.create({ data: { name: 'Asif', phone: '9876543214', email: 'asif@example.com' } })
  const guestMizaan = await prisma.guest.create({ data: { name: 'Mizaaan', phone: '9876543215', email: 'mizaan@example.com' } })
  const guestYousuf = await prisma.guest.create({ data: { name: 'YOUSUF', phone: '9876543216', email: 'yousuf@example.com' } })
  const guestHani = await prisma.guest.create({ data: { name: 'hani', phone: '9876543217', email: 'hani@example.com' } })
  const guestAmaira = await prisma.guest.create({ data: { name: 'AMAIRA', phone: '9876543218', email: 'amaira@example.com' } })
  const guestAbcd = await prisma.guest.create({ data: { name: 'ABCD', phone: '9876543219', email: 'abcd@example.com' } })
  console.log('✅ Guests created')

  function addDays(date: Date, days: number): Date {
    const d = new Date(date)
    d.setDate(d.getDate() + days)
    return d
  }

  function genRef(): string {
    return '#' + Math.floor(10000000 + Math.random() * 90000000).toString()
  }

  // --- Bookings ---

  // 1. EJAZ - Upcoming, arriving today, Walk inn, unpaid
  const bookingEjaz = await prisma.booking.create({
    data: {
      bookingRef: '#21226138',
      guestId: guestEjaz.id,
      status: 'Upcoming',
      source: 'Walk inn',
      checkIn: today,
      checkOut: addDays(today, 1),
      numRooms: 1,
      adults: 1,
      kids: 0,
      nightlyRate: 800,
      totalAmount: 800,
      roomCategory: 'Deluxe',
    },
  })

  // 2. MAAZ - In-house, YATRA, 7 nights, unpaid
  const bookingMaaz = await prisma.booking.create({
    data: {
      bookingRef: '#AD52F2B3',
      guestId: guestMaaz.id,
      status: 'CheckedIn',
      source: 'YATRA',
      checkIn: today,
      checkOut: addDays(today, 7),
      numRooms: 1,
      adults: 2,
      kids: 0,
      nightlyRate: 800,
      totalAmount: 5600,
      roomCategory: 'Deluxe',
    },
  })
  await prisma.room.update({ where: { id: deluxeRooms[0].id }, data: { status: 'Occupied' } })

  // 3. MUBARAK PASHA - Completed, partially paid (balance 3200)
  const bookingMubarak = await prisma.booking.create({
    data: {
      bookingRef: genRef(),
      guestId: guestMubarak.id,
      status: 'CheckedOut',
      source: 'GOMMT',
      checkIn: addDays(today, -5),
      checkOut: addDays(today, -1),
      numRooms: 1,
      adults: 2,
      kids: 0,
      nightlyRate: 800,
      totalAmount: 3200,
      roomCategory: 'Deluxe',
    },
  })
  await prisma.payment.create({
    data: { bookingId: bookingMubarak.id, amount: 0, mode: 'Cash', status: 'Pending', collectedBy: user.id },
  })

  // 4. AZGAR - Completed, partially paid (balance 3000)
  const bookingAzgar = await prisma.booking.create({
    data: {
      bookingRef: genRef(),
      guestId: guestAzgar.id,
      status: 'CheckedOut',
      source: 'AIRBNB',
      checkIn: addDays(today, -3),
      checkOut: addDays(today, -1),
      numRooms: 1,
      adults: 1,
      kids: 0,
      nightlyRate: 1500,
      totalAmount: 3000,
      roomCategory: 'Classic',
    },
  })
  await prisma.payment.create({
    data: { bookingId: bookingAzgar.id, amount: 0, mode: 'UPI', status: 'Pending', collectedBy: user.id },
  })

  // 5. ASIF - Completed, partially paid (balance 1000)
  const bookingAsif = await prisma.booking.create({
    data: {
      bookingRef: genRef(),
      guestId: guestAsif.id,
      status: 'CheckedOut',
      source: 'B2B',
      checkIn: addDays(today, -4),
      checkOut: addDays(today, -3),
      numRooms: 1,
      adults: 1,
      kids: 0,
      nightlyRate: 1000,
      totalAmount: 1000,
      roomCategory: 'Classic',
    },
  })
  await prisma.payment.create({
    data: { bookingId: bookingAsif.id, amount: 0, mode: 'Cash', status: 'Pending', collectedBy: user.id },
  })

  // 6. MIZAAN - Completed, fully paid
  const bookingMizaan = await prisma.booking.create({
    data: {
      bookingRef: genRef(),
      guestId: guestMizaan.id,
      status: 'CheckedOut',
      source: 'CLEARTRIP',
      checkIn: addDays(today, -10),
      checkOut: addDays(today, -7),
      numRooms: 1,
      adults: 2,
      kids: 1,
      nightlyRate: 800,
      totalAmount: 2400,
      roomCategory: 'Deluxe',
    },
  })
  await prisma.payment.create({
    data: { bookingId: bookingMizaan.id, amount: 2400, mode: 'Cash', status: 'Paid', collectedBy: user.id },
  })

  // 7. YOUSUF - Completed, fully paid
  const bookingYousuf = await prisma.booking.create({
    data: {
      bookingRef: genRef(),
      guestId: guestYousuf.id,
      status: 'CheckedOut',
      source: 'Walk inn',
      checkIn: addDays(today, -7),
      checkOut: addDays(today, -6),
      numRooms: 1,
      adults: 1,
      kids: 0,
      nightlyRate: 800,
      totalAmount: 800,
      roomCategory: 'Deluxe',
    },
  })
  await prisma.payment.create({
    data: { bookingId: bookingYousuf.id, amount: 800, mode: 'UPI', status: 'Paid', utrRef: 'UTR123456789', collectedBy: user.id },
  })

  // 8. HANI - Completed, fully paid (Suite)
  const bookingHani = await prisma.booking.create({
    data: {
      bookingRef: genRef(),
      guestId: guestHani.id,
      status: 'CheckedOut',
      source: 'Corporate',
      checkIn: addDays(today, -14),
      checkOut: addDays(today, -12),
      numRooms: 1,
      adults: 2,
      kids: 0,
      nightlyRate: 3900,
      totalAmount: 7800,
      roomCategory: 'Suite',
    },
  })
  await prisma.payment.create({
    data: { bookingId: bookingHani.id, amount: 7800, mode: 'Bank Transfer', status: 'Paid', utrRef: 'NEFT987654321', collectedBy: user.id },
  })

  // 9. AMAIRA - Upcoming, arriving in 2 days
  const bookingAmaira = await prisma.booking.create({
    data: {
      bookingRef: genRef(),
      guestId: guestAmaira.id,
      status: 'Upcoming',
      source: 'EXPEDIA',
      checkIn: addDays(today, 2),
      checkOut: addDays(today, 5),
      numRooms: 1,
      adults: 2,
      kids: 1,
      nightlyRate: 1896,
      totalAmount: 5688,
      roomCategory: 'Classic',
    },
  })
  await prisma.payment.create({
    data: { bookingId: bookingAmaira.id, amount: 2000, mode: 'Bank Transfer', status: 'Partially Paid', collectedBy: user.id },
  })

  // 10. ABCD - Completed, fully paid
  const bookingAbcd = await prisma.booking.create({
    data: {
      bookingRef: genRef(),
      guestId: guestAbcd.id,
      status: 'CheckedOut',
      source: 'AGODA',
      checkIn: addDays(today, -20),
      checkOut: addDays(today, -18),
      numRooms: 2,
      adults: 4,
      kids: 0,
      nightlyRate: 800,
      totalAmount: 3200,
      roomCategory: 'Deluxe',
    },
  })
  await prisma.payment.create({
    data: { bookingId: bookingAbcd.id, amount: 3200, mode: 'Cash', status: 'Paid', collectedBy: user.id },
  })

  console.log('✅ Bookings and payments created')
  console.log('🎉 Database seeded successfully!')
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
