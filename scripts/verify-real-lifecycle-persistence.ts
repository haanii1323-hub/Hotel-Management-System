import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyRealLifecyclePersistence() {
  console.log('🔄 Testing Real-World PMS Lifecycle Persistence in PostgreSQL...\n')

  // Step 1: Owner Account & Property Registration
  console.log('1. Creating Tenant & Owner Property...')
  const tenant = await prisma.tenant.create({
    data: { name: 'Persistence Test Hospitality', slug: 'persistence-test-group', isDemo: false },
  })

  const property = await prisma.property.create({
    data: {
      tenantId: tenant.id,
      name: 'Apex Test Boutique',
      code: 'ATB777',
      city: 'Mumbai',
      currency: 'INR',
      currencySymbol: '₹',
    },
  })

  const category = await prisma.roomCategory.create({
    data: {
      propertyId: property.id,
      name: 'Executive Deluxe',
      nightlyRate: 4500,
      totalRooms: 1,
    },
  })

  const room = await prisma.room.create({
    data: {
      propertyId: property.id,
      categoryId: category.id,
      number: '305',
      status: 'Available',
    },
  })
  console.log('  ✅ SQL Verified: Property, Category, and Room 305 created.')

  // Step 2: Guest Profile Creation
  console.log('\n2. Registering Guest Profile...')
  const guest = await prisma.guest.create({
    data: {
      propertyId: property.id,
      name: 'Aditi Sharma',
      email: 'aditi.sharma@example.com',
      phone: '+91 9876543210',
    },
  })
  const dbGuest = await prisma.guest.findUnique({ where: { id: guest.id } })
  if (!dbGuest) throw new Error('Guest not found in SQL')
  console.log(`  ✅ SQL Verified: Guest "${dbGuest.name}" persisted.`)

  // Step 3: Booking Creation (Upcoming)
  console.log('\n3. Creating Reservation...')
  const checkInDate = new Date()
  const checkOutDate = new Date(Date.now() + 86400000)
  const booking = await prisma.booking.create({
    data: {
      propertyId: property.id,
      guestId: guest.id,
      bookingRef: '#BK-PERSIST-305',
      roomCategory: 'Executive Deluxe',
      nightlyRate: 4500,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      numRooms: 1,
      adults: 1,
      kids: 0,
      totalAmount: 4500,
      status: 'Upcoming',
      source: 'Walk inn',
    },
  })
  const dbBooking = await prisma.booking.findUnique({ where: { id: booking.id } })
  if (!dbBooking || dbBooking.status !== 'Upcoming') throw new Error('Booking persistence failed')
  console.log(`  ✅ SQL Verified: Reservation ${dbBooking.bookingRef} status is "Upcoming".`)

  // Step 4: Check-in & Room Assignment
  console.log('\n4. Executing Check-In & Room Assignment...')
  const bookingRoom = await prisma.bookingRoom.create({
    data: { bookingId: booking.id, roomId: room.id },
  })
  await prisma.room.update({ where: { id: room.id }, data: { status: 'Occupied' } })
  await prisma.booking.update({ where: { id: booking.id }, data: { status: 'CheckedIn' } })
  await prisma.roomStatusLog.create({
    data: { roomId: room.id, oldStatus: 'Available', newStatus: 'Occupied', changedBy: 'Reception' },
  })
  await prisma.bookingStatusLog.create({
    data: { bookingId: booking.id, oldStatus: 'Upcoming', newStatus: 'CheckedIn', changedBy: 'Reception' },
  })

  const checkedRoom = await prisma.room.findUnique({ where: { id: room.id } })
  const checkedBooking = await prisma.booking.findUnique({ where: { id: booking.id } })
  if (checkedRoom?.status !== 'Occupied' || checkedBooking?.status !== 'CheckedIn') {
    throw new Error('Check-in status update failed in SQL')
  }
  console.log(`  ✅ SQL Verified: Room 305 is "Occupied" & Booking status is "CheckedIn".`)

  // Step 5: Recording Payment
  console.log('\n5. Collecting UPI Payment...')
  const payment = await prisma.payment.create({
    data: {
      bookingId: booking.id,
      amount: 4500,
      mode: 'UPI',
      status: 'Paid',
      utrRef: 'UPI-REF-9988112233',
    },
  })
  const dbPayment = await prisma.payment.findUnique({ where: { id: payment.id } })
  if (!dbPayment || dbPayment.amount !== 4500) throw new Error('Payment persistence failed')
  console.log(`  ✅ SQL Verified: Payment ₹${dbPayment.amount} (${dbPayment.mode}) recorded.`)

  // Step 6: Generating Tax Invoice
  console.log('\n6. Generating Invoice...')
  const invoice = await prisma.invoice.create({
    data: {
      bookingId: booking.id,
      invoiceNo: 'INV-PERSIST-001',
    },
  })
  const dbInvoice = await prisma.invoice.findUnique({ where: { id: invoice.id } })
  if (!dbInvoice) throw new Error('Invoice persistence failed')
  console.log(`  ✅ SQL Verified: Tax Invoice "${dbInvoice.invoiceNo}" persisted.`)

  // Step 7: Executing Checkout
  console.log('\n7. Executing Guest Checkout...')
  await prisma.booking.update({ where: { id: booking.id }, data: { status: 'CheckedOut' } })
  await prisma.room.update({ where: { id: room.id }, data: { status: 'Cleaning' } })
  await prisma.bookingStatusLog.create({
    data: { bookingId: booking.id, oldStatus: 'CheckedIn', newStatus: 'CheckedOut', changedBy: 'Reception' },
  })
  await prisma.roomStatusLog.create({
    data: { roomId: room.id, oldStatus: 'Occupied', newStatus: 'Cleaning', changedBy: 'Housekeeping' },
  })

  const finalBooking = await prisma.booking.findUnique({
    where: { id: booking.id },
    include: { payments: true, invoices: true, guest: true, bookingRooms: { include: { room: true } }, statusLogs: true },
  })
  const finalRoom = await prisma.room.findUnique({ where: { id: room.id } })

  if (finalBooking?.status !== 'CheckedOut' || finalRoom?.status !== 'Cleaning') {
    throw new Error('Checkout status persistence failed')
  }
  console.log(`  ✅ SQL Verified: Guest CheckedOut, Room set to "Cleaning".`)
  console.log(`  ✅ Full Audit Trail: ${finalBooking.statusLogs.length} lifecycle status transitions logged in PostgreSQL.`)

  // Clean up lifecycle test data
  console.log('\n8. Purging lifecycle test records...')
  await prisma.roomStatusLog.deleteMany({ where: { roomId: room.id } })
  await prisma.bookingStatusLog.deleteMany({ where: { bookingId: booking.id } })
  await prisma.invoice.delete({ where: { id: invoice.id } })
  await prisma.payment.delete({ where: { id: payment.id } })
  await prisma.bookingRoom.delete({ where: { id: bookingRoom.id } })
  await prisma.booking.delete({ where: { id: booking.id } })
  await prisma.guest.delete({ where: { id: guest.id } })
  await prisma.room.delete({ where: { id: room.id } })
  await prisma.roomCategory.delete({ where: { id: category.id } })
  await prisma.property.delete({ where: { id: property.id } })
  await prisma.tenant.delete({ where: { id: tenant.id } })

  console.log('✅ Lifecycle test data cleanly removed.')
  console.log('\n🎉 FULL PMS LIFECYCLE PERSISTENCE: 100% PASS!')
  await prisma.$disconnect()
}

verifyRealLifecyclePersistence().catch(async (e) => {
  console.error('❌ Lifecycle persistence failed:', e)
  await prisma.$disconnect()
  process.exit(1)
})
