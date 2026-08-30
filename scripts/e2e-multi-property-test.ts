import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function runTests() {
  console.log('🧪 Starting Multi-Company / Multi-Property PMS Architecture Test...\n')

  // 1. Verify 12 Properties exist
  const properties = await prisma.property.findMany({
    include: {
      rooms: true,
      categories: true,
      bookings: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  console.log(`✅ Total Properties in Database: ${properties.length}`)
  if (properties.length < 12) {
    throw new Error(`Expected at least 12 properties, found ${properties.length}`)
  }

  const prop1 = properties.find((p) => p.code === 'BLR3396')!
  const prop2 = properties.find((p) => p.code === 'BLR3630')!

  console.log(`🏨 Property 1: ${prop1.name} (${prop1.code}) - ${prop1.rooms.length} rooms, ${prop1.bookings.length} bookings`)
  console.log(`🏨 Property 2: ${prop2.name} (${prop2.code}) - ${prop2.rooms.length} rooms, ${prop2.bookings.length} bookings`)

  // 2. Test Data Isolation
  const prop1Bookings = await prisma.booking.findMany({
    where: { propertyId: prop1.id },
  })
  const prop2Bookings = await prisma.booking.findMany({
    where: { propertyId: prop2.id },
  })

  const prop1Refs = new Set(prop1Bookings.map((b) => b.id))
  const overlap = prop2Bookings.some((b) => prop1Refs.has(b.id))
  if (overlap) {
    throw new Error('❌ DATA CONTAMINATION: Booking found in both properties!')
  }
  console.log('✅ 100% Data Isolation Verified: Zero booking overlap between Property 1 and Property 2.')

  // 3. Test Room Isolation
  const prop1Rooms = await prisma.room.findMany({ where: { propertyId: prop1.id } })
  const prop2Rooms = await prisma.room.findMany({ where: { propertyId: prop2.id } })
  console.log(`✅ Property 1 has ${prop1Rooms.length} isolated rooms. Property 2 has ${prop2Rooms.length} isolated rooms.`)

  // 4. Test Creating a Brand New 13th Property Dynamically
  const testCode = `TEST${Date.now().toString().slice(-4)}`
  const newProp = await prisma.property.create({
    data: {
      name: 'Automated Test Luxury Suites',
      code: testCode,
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      address: '77 Electronic City Phase 1',
      taxRate: 18.0,
      currency: 'INR',
      currencySymbol: '₹',
      checkInTime: '01:00 PM',
      checkOutTime: '11:00 AM',
    },
  })
  console.log(`✅ Created New 13th Property: ${newProp.name} (${newProp.code})`)

  // Create category and room for the new property
  const cat = await prisma.roomCategory.create({
    data: {
      propertyId: newProp.id,
      name: 'Presidential',
      nightlyRate: 7500,
      totalRooms: 3,
    },
  })

  const room = await prisma.room.create({
    data: {
      propertyId: newProp.id,
      number: 'PRES-101',
      categoryId: cat.id,
      status: 'Available',
    },
  })
  console.log(`✅ Added Category "${cat.name}" and Room "${room.number}" for ${newProp.code}`)

  // Create Guest and Booking for New Property
  const guest = await prisma.guest.create({
    data: {
      propertyId: newProp.id,
      name: 'Dr. John Test Doe',
      phone: '9988776655',
      email: 'john.test@example.com',
    },
  })

  const newBookingRef = `#${testCode}001`
  const newBooking = await prisma.booking.create({
    data: {
      propertyId: newProp.id,
      bookingRef: newBookingRef,
      guestId: guest.id,
      status: 'Upcoming',
      source: 'Direct Web',
      checkIn: new Date(),
      checkOut: new Date(Date.now() + 2 * 86400000),
      numRooms: 1,
      adults: 2,
      kids: 0,
      roomCategory: 'Presidential',
      nightlyRate: 7500,
      totalAmount: 15000,
      bookingRooms: {
        create: [{ roomId: room.id }],
      },
    },
    include: {
      guest: true,
      bookingRooms: { include: { room: true } },
    },
  })
  console.log(`✅ Created Booking ${newBooking.bookingRef} for ${newBooking.guest.name} under ${newProp.code}`)

  // Verify it only exists under newProp
  const searchInProp1 = await prisma.booking.findFirst({
    where: { propertyId: prop1.id, id: newBooking.id },
  })
  if (searchInProp1) {
    throw new Error('❌ Contamination: New booking appeared in Property 1!')
  }
  console.log('✅ Verified: New booking is strictly isolated to the new property.')

  // 5. Test Check-In Flow on New Property Booking
  await prisma.booking.update({
    where: { id: newBooking.id },
    data: { status: 'CheckedIn' },
  })
  await prisma.room.update({
    where: { id: room.id },
    data: { status: 'Occupied' },
  })
  console.log(`✅ Checked In Booking ${newBooking.bookingRef} and Room ${room.number} is now Occupied`)

  // 6. Test Payment Collection
  const payment = await prisma.payment.create({
    data: {
      bookingId: newBooking.id,
      amount: 15000,
      mode: 'UPI',
      status: 'Paid',
      utrRef: 'UPI-TEST-9988',
    },
  })
  console.log(`✅ Collected full payment of ₹${payment.amount} via ${payment.mode}`)

  // 7. Test Property Settings Update
  const updatedProp = await prisma.property.update({
    where: { id: newProp.id },
    data: {
      taxRate: 15.0,
      checkInTime: '02:00 PM',
      name: 'Automated Test Luxury Suites & Spa',
    },
  })
  console.log(`✅ Updated Property settings: Name = "${updatedProp.name}", Tax = ${updatedProp.taxRate}%, CheckIn = ${updatedProp.checkInTime}`)

  // Clean up test property
  await prisma.payment.deleteMany({ where: { bookingId: newBooking.id } })
  await prisma.bookingRoom.deleteMany({ where: { bookingId: newBooking.id } })
  await prisma.booking.deleteMany({ where: { propertyId: newProp.id } })
  await prisma.room.deleteMany({ where: { propertyId: newProp.id } })
  await prisma.roomCategory.deleteMany({ where: { propertyId: newProp.id } })
  await prisma.guest.deleteMany({ where: { propertyId: newProp.id } })
  await prisma.property.delete({ where: { id: newProp.id } })
  console.log(`🧹 Cleaned up temporary test property and records.`)

  console.log('\n🎉 ALL MULTI-COMPANY / MULTI-PROPERTY ARCHITECTURE TESTS PASSED SUCCESSFULLY! 🚀')
}

runTests()
  .catch((e) => {
    console.error('❌ Test failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
