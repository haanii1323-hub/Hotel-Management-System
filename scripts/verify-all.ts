import { PrismaClient } from '@prisma/client'
import { format, addDays } from 'date-fns'

const prisma = new PrismaClient()

async function runTests() {
  console.log('🚀 Starting Comprehensive Real-Time PMS Database & Workflow Tests...')
  let passed = 0
  let failed = 0

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${msg}`)
      passed++
    } else {
      console.error(`  ❌ FAIL: ${msg}`)
      failed++
    }
  }

  const testSuffix = Date.now().toString().slice(-4)
  const propCode = `TST${testSuffix}`

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Create Property -> Verify database -> Verify query
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 1: Property Creation & Persistence ---')
    const property = await prisma.property.create({
      data: {
        code: propCode,
        name: `Test Luxury Hotel ${testSuffix}`,
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        address: '100 Marine Drive',
        phone: '+91 22 5555 1234',
        email: `stay@testluxury${testSuffix}.com`,
        currency: 'INR',
        currencySymbol: '₹',
        taxRate: 18.0,
        checkInTime: '02:00 PM',
        checkOutTime: '11:00 AM',
      },
    })
    assert(!!property.id, `Property created with ID: ${property.id}`)
    const propFromDb = await prisma.property.findUnique({ where: { id: property.id } })
    assert(propFromDb?.code === propCode, `Property code matches in DB: ${propFromDb?.code}`)

    // -------------------------------------------------------------------------
    // TEST 2: Create Guest -> Verify database -> Verify guest list
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: Guest Creation & Directory ---')
    const guestPhone = `98200${testSuffix}99`
    const guest = await prisma.guest.create({
      data: {
        propertyId: property.id,
        name: `Ananya Sharma ${testSuffix}`,
        phone: guestPhone,
        email: `ananya${testSuffix}@example.com`,
        address: 'Bandra West, Mumbai',
      },
    })
    assert(!!guest.id, `Guest created with ID: ${guest.id}`)
    const guestFromDb = await prisma.guest.findFirst({ where: { propertyId: property.id, phone: guestPhone } })
    assert(guestFromDb?.name === `Ananya Sharma ${testSuffix}`, `Guest retrieved by phone: ${guestFromDb?.name}`)

    // -------------------------------------------------------------------------
    // TEST 3: Create Category & Rooms -> Verify database
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: Category & Room Inventory Management ---')
    const category = await prisma.roomCategory.create({
      data: {
        propertyId: property.id,
        name: 'Ocean Suite',
        nightlyRate: 4500,
        totalRooms: 2,
      },
    })
    const room1 = await prisma.room.create({
      data: {
        propertyId: property.id,
        number: `OS-${testSuffix}-1`,
        categoryId: category.id,
        status: 'Available',
      },
    })
    const room2 = await prisma.room.create({
      data: {
        propertyId: property.id,
        number: `OS-${testSuffix}-2`,
        categoryId: category.id,
        status: 'Available',
      },
    })
    assert(!!room1.id && !!room2.id, `Created rooms: ${room1.number} and ${room2.number}`)
    const roomsCount = await prisma.room.count({ where: { propertyId: property.id } })
    assert(roomsCount === 2, `Total rooms for property is 2`)

    // -------------------------------------------------------------------------
    // TEST 4 & 5: Create Booking -> Verify Upcoming Bookings & Persistence
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4 & 5: Booking Creation & Persistence ---')
    const today = new Date()
    const checkInDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0)
    const checkOutDate = addDays(checkInDate, 2)
    const bookingRef = `#${propCode.slice(0, 3)}-BK${testSuffix}`

    const booking = await prisma.booking.create({
      data: {
        propertyId: property.id,
        bookingRef,
        guestId: guest.id,
        status: 'Upcoming',
        source: 'Direct Web',
        checkIn: checkInDate,
        checkOut: checkOutDate,
        numRooms: 1,
        adults: 2,
        kids: 0,
        roomCategory: 'Ocean Suite',
        nightlyRate: 4500,
        taxAmount: (4500 * 2 * 18) / 100,
        discountAmount: 0,
        totalAmount: 4500 * 2 + (4500 * 2 * 18) / 100,
        bookingRooms: {
          create: [{ roomId: room1.id }],
        },
        statusLogs: {
          create: {
            oldStatus: 'None',
            newStatus: 'Upcoming',
            changedBy: 'Admin',
          },
        },
      },
      include: {
        guest: true,
        bookingRooms: { include: { room: true } },
        payments: true,
      },
    })
    assert(booking.totalAmount === 10620, `Total calculated correctly (4500*2 + 18% tax = 10620): ${booking.totalAmount}`)
    assert(booking.status === 'Upcoming', `Booking status is Upcoming`)

    // -------------------------------------------------------------------------
    // TEST 6: Search Booking
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6: Live Search Query ---')
    const searchResults = await prisma.booking.findMany({
      where: {
        propertyId: property.id,
        OR: [
          { guest: { name: { contains: 'Ananya', mode: 'insensitive' } } },
          { bookingRef: { contains: bookingRef } },
        ],
      },
    })
    assert(searchResults.length === 1 && searchResults[0].id === booking.id, `Found booking via search query`)

    // -------------------------------------------------------------------------
    // TEST 7: Check-In Workflow (Room becomes Occupied)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 7: Check-In Operation ---')
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'CheckedIn' },
    })
    await prisma.room.update({
      where: { id: room1.id },
      data: { status: 'Occupied' },
    })
    await prisma.roomStatusLog.create({
      data: {
        roomId: room1.id,
        oldStatus: 'Available',
        newStatus: 'Occupied',
        changedBy: 'Staff',
      },
    })

    const updatedBooking = await prisma.booking.findUnique({ where: { id: booking.id } })
    const updatedRoom1 = await prisma.room.findUnique({ where: { id: room1.id } })
    assert(updatedBooking?.status === 'CheckedIn', `Booking status updated to CheckedIn`)
    assert(updatedRoom1?.status === 'Occupied', `Room 1 status updated to Occupied`)

    // -------------------------------------------------------------------------
    // TEST 8: Add Payment -> Settle balance
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 8: Payment Settlement ---')
    const payment = await prisma.payment.create({
      data: {
        bookingId: booking.id,
        amount: 10620,
        mode: 'UPI',
        status: 'Paid',
        utrRef: `UTR${Date.now()}`,
      },
    })
    assert(payment.amount === 10620, `Payment of 10620 recorded with UTR: ${payment.utrRef}`)

    const allPayments = await prisma.payment.findMany({ where: { bookingId: booking.id } })
    const totalCollected = allPayments.reduce((s, p) => s + (p.status !== 'Pending' ? p.amount : 0), 0)
    const balance = (updatedBooking?.totalAmount || 0) - totalCollected
    assert(balance === 0, `Outstanding balance settled to ₹0`)

    // -------------------------------------------------------------------------
    // TEST 9: Check-Out Workflow (Room becomes Cleaning + Invoice generated)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 9: Check-Out & Housekeeping Transition ---')
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'CheckedOut' },
    })
    await prisma.room.update({
      where: { id: room1.id },
      data: { status: 'Cleaning' },
    })
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNo: `INV-${propCode}-${testSuffix}`,
        bookingId: booking.id,
      },
    })
    const checkedOutBooking = await prisma.booking.findUnique({ where: { id: booking.id } })
    const cleaningRoom1 = await prisma.room.findUnique({ where: { id: room1.id } })
    assert(checkedOutBooking?.status === 'CheckedOut', `Booking status is CheckedOut`)
    assert(cleaningRoom1?.status === 'Cleaning', `Room status is Cleaning`)
    assert(!!invoice.invoiceNo, `Invoice generated: ${invoice.invoiceNo}`)

    // -------------------------------------------------------------------------
    // TEST 10: Clean Room -> Available
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 10: Room Turnaround (Cleaning -> Available) ---')
    await prisma.room.update({
      where: { id: room1.id },
      data: { status: 'Available' },
    })
    const readyRoom1 = await prisma.room.findUnique({ where: { id: room1.id } })
    assert(readyRoom1?.status === 'Available', `Room successfully marked Available after cleaning`)

    // -------------------------------------------------------------------------
    // TEST 11: Multi-Property Data Isolation
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 11: Multi-Tenant Data Isolation ---')
    const otherProperty = await prisma.property.create({
      data: {
        code: `ISO${testSuffix}`,
        name: `Isolated Hotel ${testSuffix}`,
        city: 'Delhi',
      },
    })
    const otherBookings = await prisma.booking.findMany({ where: { propertyId: otherProperty.id } })
    const otherGuests = await prisma.guest.findMany({ where: { propertyId: otherProperty.id } })
    const otherRooms = await prisma.room.findMany({ where: { propertyId: otherProperty.id } })
    assert(otherBookings.length === 0, `Isolated property has 0 bookings from other properties`)
    assert(otherGuests.length === 0, `Isolated property has 0 guests from other properties`)
    assert(otherRooms.length === 0, `Isolated property has 0 rooms from other properties`)

    // -------------------------------------------------------------------------
    // TEST 12: Overlapping Booking Conflict Prevention Logic
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 12: Overlapping Reservation Conflict Detection ---')
    // Create an active upcoming booking on room2
    const testCheckIn = addDays(new Date(), 5)
    const testCheckOut = addDays(new Date(), 8)
    await prisma.booking.create({
      data: {
        propertyId: property.id,
        bookingRef: `#CONF-1-${testSuffix}`,
        guestId: guest.id,
        status: 'Upcoming',
        source: 'Walk inn',
        checkIn: testCheckIn,
        checkOut: testCheckOut,
        numRooms: 1,
        nightlyRate: 4500,
        totalAmount: 4500 * 3,
        roomCategory: 'Ocean Suite',
        bookingRooms: {
          create: [{ roomId: room2.id }],
        },
      },
    })

    // Try detecting conflict for overlapping dates: 6th to 7th day
    const overlapStart = addDays(new Date(), 6)
    const overlapEnd = addDays(new Date(), 7)

    const conflicts = await prisma.booking.findMany({
      where: {
        propertyId: property.id,
        status: { in: ['Upcoming', 'CheckedIn'] },
        AND: [
          { checkIn: { lt: overlapEnd } },
          { checkOut: { gt: overlapStart } },
        ],
      },
      include: { bookingRooms: true },
    })

    const occupiedRoomIds = new Set<string>()
    conflicts.forEach((c) => c.bookingRooms.forEach((br) => occupiedRoomIds.add(br.roomId)))

    assert(occupiedRoomIds.has(room2.id), `Correctly identified room2 as conflicting for overlapping dates`)
    assert(!occupiedRoomIds.has(room1.id), `Correctly identified room1 as available for overlapping dates`)

    console.log(`\n========================================`)
    console.log(`🏁 TESTS COMPLETED: ${passed} PASSED, ${failed} FAILED`)
    console.log(`========================================`)
  } catch (err) {
    console.error('Test execution error:', err)
    failed++
  } finally {
    await prisma.$disconnect()
    if (failed > 0) process.exit(1)
  }
}

runTests()
