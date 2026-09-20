import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyPureSqlCrudLifecycle() {
  console.log('🧪 Starting Pure SQL End-to-End CRUD Lifecycle Test...')

  // 1. Pick an active property
  const property = await prisma.property.findFirst({
    where: { isActive: true },
    include: { categories: true, rooms: true },
  })

  if (!property || property.rooms.length === 0) {
    throw new Error('No active property with rooms found.')
  }

  const room = property.rooms[0]
  console.log(`🏨 Testing with Property: ${property.name} (${property.code}), Room: ${room.number}`)

  // 2. Step 1: Create Real Guest
  const uniquePhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`
  const guest = await prisma.guest.create({
    data: {
      propertyId: property.id,
      name: 'Dr. Sameer Verma',
      phone: uniquePhone,
      email: 'sameer.verma@example.com',
      address: 'Indiranagar, Bangalore',
    },
  })
  console.log(`✅ Step 1: Real Guest Created in SQL: ${guest.name} (ID: ${guest.id})`)

  // 3. Step 2: Create Real Booking
  const checkIn = new Date()
  const checkOut = new Date(Date.now() + 86400000 * 2) // 2 nights
  const bookingRef = `#TEST-${Math.floor(1000 + Math.random() * 9000)}`

  const booking = await prisma.booking.create({
    data: {
      propertyId: property.id,
      guestId: guest.id,
      bookingRef,
      status: 'Upcoming',
      source: 'Direct Website',
      checkIn,
      checkOut,
      numRooms: 1,
      adults: 2,
      kids: 0,
      nightlyRate: 3500,
      totalAmount: 7000,
      roomCategory: property.categories[0]?.name || 'Deluxe',
      bookingRooms: {
        create: [{ roomId: room.id }],
      },
      statusLogs: {
        create: [{ oldStatus: 'None', newStatus: 'Upcoming', changedBy: 'System Test' }],
      },
    },
  })
  console.log(`✅ Step 2: Real Booking Created in SQL: Ref ${booking.bookingRef} (ID: ${booking.id})`)

  // 4. Step 3: Check-in
  await prisma.booking.update({
    where: { id: booking.id },
    data: { status: 'CheckedIn' },
  })
  await prisma.room.update({
    where: { id: room.id },
    data: { status: 'Occupied' },
  })
  console.log(`✅ Step 3: Check-in executed: Booking status = CheckedIn, Room ${room.number} = Occupied`)

  // 5. Step 4: Record Real Payment
  const payment = await prisma.payment.create({
    data: {
      bookingId: booking.id,
      amount: 7000,
      mode: 'UPI',
      status: 'Paid',
      utrRef: 'UPI-TEST-99887766',
      notes: 'Full settlement via PhonePe',
    },
  })
  console.log(`✅ Step 4: Payment recorded in SQL: ₹${payment.amount} (${payment.mode}, UTR: ${payment.utrRef})`)

  // 6. Step 5: Generate Real Invoice
  const invoice = await prisma.invoice.create({
    data: {
      bookingId: booking.id,
      invoiceNo: `INV-${Date.now().toString().slice(-6)}`,
    },
  })
  console.log(`✅ Step 5: Invoice saved to SQL: No ${invoice.invoiceNo}`)

  // 7. Step 6: Check-out
  await prisma.booking.update({
    where: { id: booking.id },
    data: { status: 'CheckedOut' },
  })
  await prisma.room.update({
    where: { id: room.id },
    data: { status: 'Available' },
  })
  console.log(`✅ Step 6: Check-out completed: Booking = CheckedOut, Room = Available`)

  // 8. Step 7: Persistence Verification (Survival across queries)
  const persistedBooking = await prisma.booking.findUnique({
    where: { id: booking.id },
    include: {
      guest: true,
      payments: true,
      invoices: true,
      bookingRooms: { include: { room: true } },
    },
  })

  if (!persistedBooking) throw new Error('Persisted booking not found in SQL.')
  if (persistedBooking.payments.length === 0) throw new Error('Persisted payment not found in SQL.')
  if (persistedBooking.invoices.length === 0) throw new Error('Persisted invoice not found in SQL.')
  if (persistedBooking.guest.name !== 'Dr. Sameer Verma') throw new Error('Guest relation mismatch in SQL.')

  console.log('\n=========================================')
  console.log('🌟 PURE SQL LIFECYCLE TEST PASSED 100%:')
  console.log('=========================================')
  console.log(`• Booking Ref:        ${persistedBooking.bookingRef}`)
  console.log(`• Status:             ${persistedBooking.status} (Retained in History)`)
  console.log(`• Guest:              ${persistedBooking.guest.name}`)
  console.log(`• Payment Settled:    ₹${persistedBooking.payments[0].amount}`)
  console.log(`• Invoice Generated:  ${persistedBooking.invoices[0].invoiceNo}`)
  console.log(`• Room Assigned:      Room ${persistedBooking.bookingRooms[0].room.number}`)
  console.log('=========================================\n')

  // Clean up the test booking so database stays pure
  await prisma.invoice.deleteMany({ where: { bookingId: booking.id } })
  await prisma.payment.deleteMany({ where: { bookingId: booking.id } })
  await prisma.bookingRoom.deleteMany({ where: { bookingId: booking.id } })
  await prisma.bookingStatusLog.deleteMany({ where: { bookingId: booking.id } })
  await prisma.booking.delete({ where: { id: booking.id } })
  await prisma.guest.delete({ where: { id: guest.id } })
  console.log('🧹 Test records cleaned up. Database is 100% clean and ready for real data.')
}

verifyPureSqlCrudLifecycle()
  .catch((e) => {
    console.error('❌ Verification failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
