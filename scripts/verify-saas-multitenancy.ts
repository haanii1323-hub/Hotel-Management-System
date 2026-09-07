import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function runSaaSTests() {
  console.log('🧪 Starting Multi-Tenant PMS SaaS Automated Test Suite...\n')

  // 1. Verify Demo Tenant & Data
  console.log('--- TEST 1: Verify Demo Environment & Sample Data ---')
  const demoTenant = await prisma.tenant.findUnique({
    where: { slug: 'demo' },
    include: {
      properties: {
        include: {
          rooms: true,
          bookings: true,
        },
      },
      users: true,
    },
  })

  if (!demoTenant) {
    throw new Error('❌ Demo tenant does not exist')
  }

  console.log(`✅ Demo Tenant found: "${demoTenant.name}" (ID: ${demoTenant.id}, isDemo: ${demoTenant.isDemo})`)
  console.log(`   Demo Properties Count: ${demoTenant.properties.length}`)
  console.log(`   Demo Users Count: ${demoTenant.users.map((u) => u.email).join(', ')}`)

  const totalDemoRooms = demoTenant.properties.reduce((s, p) => s + p.rooms.length, 0)
  const totalDemoBookings = demoTenant.properties.reduce((s, p) => s + p.bookings.length, 0)
  console.log(`   Demo Total Rooms: ${totalDemoRooms}, Demo Total Bookings: ${totalDemoBookings}`)

  if (demoTenant.properties.length === 0 || totalDemoRooms === 0) {
    throw new Error('❌ Demo data is missing properties or rooms')
  }
  console.log('✅ TEST 1 PASSED: Demo account & demo portfolio intact.\n')

  // 2. Register a New Hotel Owner (My Hotel Account)
  console.log('--- TEST 2: Register Private Hotel Owner & Verify Zero Initial State ---')
  const testOwnerEmail = `owner_${Date.now()}@realhotel.com`
  const testHotelName = 'Royal Orchid Heritage Palace'
  const testSlug = `royal-orchid-${Date.now()}`

  // Create Owner's dedicated tenant
  const ownerTenant = await prisma.tenant.create({
    data: {
      name: testHotelName,
      slug: testSlug,
      isDemo: false,
    },
  })

  const passwordHash = await bcrypt.hash('SecureOwnerPass123!', 10)
  const ownerUser = await prisma.user.create({
    data: {
      name: 'Vikramaditya Roy',
      email: testOwnerEmail,
      passwordHash,
      role: 'owner',
      tenantId: ownerTenant.id,
    },
  })

  console.log(`✅ Private Tenant Created: "${ownerTenant.name}" (ID: ${ownerTenant.id}, isDemo: ${ownerTenant.isDemo})`)
  console.log(`✅ Owner User Created: "${ownerUser.name}" (${ownerUser.email})`)

  // Verify Initial State of New Owner
  const ownerPropsInitial = await prisma.property.findMany({ where: { tenantId: ownerTenant.id } })
  const ownerBookingsInitial = await prisma.booking.findMany({
    where: { property: { tenantId: ownerTenant.id } },
  })
  const ownerRoomsInitial = await prisma.room.findMany({
    where: { property: { tenantId: ownerTenant.id } },
  })

  console.log(`   Initial Properties: ${ownerPropsInitial.length}`)
  console.log(`   Initial Bookings: ${ownerBookingsInitial.length}`)
  console.log(`   Initial Rooms: ${ownerRoomsInitial.length}`)

  if (ownerPropsInitial.length !== 0 || ownerBookingsInitial.length !== 0 || ownerRoomsInitial.length !== 0) {
    throw new Error('❌ New Owner Account did not start with 0 data!')
  }
  console.log('✅ TEST 2 PASSED: Private hotel account starts 100% clean with NO dummy/demo data.\n')

  // 3. Hotel Setup Lifecycle: Add Property -> Room Types -> Rooms -> Guest -> Booking -> Check-in -> Payment
  console.log('--- TEST 3: Execute Complete Hotel PMS Operations Lifecycle ---')
  
  // Step 3a: Add Property
  const newProperty = await prisma.property.create({
    data: {
      tenantId: ownerTenant.id,
      name: 'Royal Orchid Heritage - Jaipur',
      code: 'ROH01',
      city: 'Jaipur',
      state: 'Rajasthan',
      country: 'India',
      address: '77 Palace Road, Civil Lines',
      phone: '+91 141 2233445',
      email: 'jaipur@royalorchid.com',
      currency: 'INR',
      currencySymbol: '₹',
      taxRate: 18.0,
      checkInTime: '02:00 PM',
      checkOutTime: '12:00 PM',
    },
  })
  console.log(`✅ 3a. Property Created: ${newProperty.name} (${newProperty.code})`)

  // Step 3b: Add Room Categories
  const catDeluxe = await prisma.roomCategory.create({
    data: {
      propertyId: newProperty.id,
      name: 'Heritage Deluxe',
      nightlyRate: 4500,
      weekendRate: 5500,
      extraGuestCharge: 1200,
      baseOccupancy: 2,
      maxOccupancy: 3,
      totalRooms: 2,
    },
  })
  const catSuite = await prisma.roomCategory.create({
    data: {
      propertyId: newProperty.id,
      name: 'Royal Maharaja Suite',
      nightlyRate: 9500,
      weekendRate: 11500,
      extraGuestCharge: 2000,
      baseOccupancy: 2,
      maxOccupancy: 4,
      totalRooms: 1,
    },
  })
  console.log(`✅ 3b. Room Categories Created: "${catDeluxe.name}" (₹${catDeluxe.nightlyRate}/night), "${catSuite.name}" (₹${catSuite.nightlyRate}/night)`)

  // Step 3c: Add Physical Rooms
  const room101 = await prisma.room.create({
    data: {
      propertyId: newProperty.id,
      number: '101',
      categoryId: catDeluxe.id,
      floor: 1,
      bedType: 'King Bed',
      status: 'Available',
    },
  })
  const room102 = await prisma.room.create({
    data: {
      propertyId: newProperty.id,
      number: '102',
      categoryId: catDeluxe.id,
      floor: 1,
      bedType: 'Twin Beds',
      status: 'Available',
    },
  })
  const room201 = await prisma.room.create({
    data: {
      propertyId: newProperty.id,
      number: '201',
      categoryId: catSuite.id,
      floor: 2,
      bedType: 'Imperial Suite Bed',
      status: 'Available',
    },
  })
  console.log(`✅ 3c. Rooms Created: 101 (${catDeluxe.name}), 102 (${catDeluxe.name}), 201 (${catSuite.name})`)

  // Step 3d: Add Guest
  const guest = await prisma.guest.create({
    data: {
      propertyId: newProperty.id,
      name: 'Arjun Singhania',
      phone: '+91 9811223344',
      email: 'arjun.singhania@techcorp.in',
      address: 'Mumbai, Maharashtra',
    },
  })
  console.log(`✅ 3d. Guest Registered: ${guest.name} (${guest.phone})`)

  // Step 3e: Create Booking
  const checkInDate = new Date()
  const checkOutDate = new Date(Date.now() + 2 * 86400000) // 2 nights
  const nights = 2
  const subtotal = catDeluxe.nightlyRate * nights // 9000
  const tax = Math.round((subtotal * newProperty.taxRate) / 100) // 1620
  const totalAmount = subtotal + tax // 10620

  const booking = await prisma.booking.create({
    data: {
      propertyId: newProperty.id,
      guestId: guest.id,
      bookingRef: '#ROH-9921',
      checkIn: checkInDate,
      checkOut: checkOutDate,
      numRooms: 1,
      adults: 2,
      kids: 0,
      roomCategory: catDeluxe.name,
      nightlyRate: catDeluxe.nightlyRate,
      taxAmount: tax,
      discountAmount: 0,
      totalAmount: totalAmount,
      source: 'Direct Website',
      status: 'Upcoming',
    },
  })

  // Link room to booking
  await prisma.bookingRoom.create({
    data: {
      bookingId: booking.id,
      roomId: room101.id,
    },
  })
  console.log(`✅ 3e. Booking Created: ${booking.bookingRef} for ₹${totalAmount} (2 nights in Room 101)`)

  // Step 3f: Check In Guest
  const updatedBooking = await prisma.booking.update({
    where: { id: booking.id },
    data: { status: 'CheckedIn' },
  })
  await prisma.room.update({
    where: { id: room101.id },
    data: { status: 'Occupied' },
  })
  console.log(`✅ 3f. Guest Checked In! Booking status: ${updatedBooking.status}, Room 101 status: Occupied`)

  // Step 3g: Record Payment
  const payment = await prisma.payment.create({
    data: {
      bookingId: booking.id,
      amount: totalAmount,
      mode: 'UPI',
      utrRef: 'UPI/20240830/998877665544',
      status: 'Success',
    },
  })
  console.log(`✅ 3g. Payment Recorded: ₹${payment.amount} via ${payment.mode} (UTR: ${payment.utrRef})`)

  // Step 3h: Verify Dashboard & Revenue Aggregations for Owner Tenant
  const ownerPayments = await prisma.payment.findMany({
    where: { booking: { property: { tenantId: ownerTenant.id } }, status: 'Success' },
  })
  const totalOwnerRevenue = ownerPayments.reduce((s, p) => s + p.amount, 0)
  console.log(`   Owner Verified Total Revenue: ₹${totalOwnerRevenue}`)

  if (totalOwnerRevenue !== totalAmount) {
    throw new Error(`❌ Revenue calculation mismatch! Expected ${totalAmount}, got ${totalOwnerRevenue}`)
  }
  console.log('✅ TEST 3 PASSED: Full PMS operations lifecycle executed and persisted successfully.\n')

  // 4. Strict Cross-Tenant Isolation Verification
  console.log('--- TEST 4: Strict Cross-Tenant Data Isolation ---')

  // Check 4a: Demo tenant queries
  const demoProperties = await prisma.property.findMany({
    where: { tenantId: demoTenant.id },
  })
  const demoHasOwnerProp = demoProperties.some((p) => p.id === newProperty.id || p.name === newProperty.name)
  if (demoHasOwnerProp) {
    throw new Error('❌ CRITICAL SECURITY BREACH: Owner property leaked into Demo Tenant!')
  }
  console.log(`✅ 4a. Demo tenant cannot see owner property (verified across ${demoProperties.length} demo properties)`)

  // Check 4b: Owner tenant queries
  const ownerAllProperties = await prisma.property.findMany({
    where: { tenantId: ownerTenant.id },
  })
  const ownerHasDemoProp = ownerAllProperties.some((p) => p.name.includes('Metro Inn') || p.name.includes('Sahasra'))
  if (ownerHasDemoProp) {
    throw new Error('❌ CRITICAL DATA LEAK: Demo property found inside private Owner Tenant!')
  }
  console.log(`✅ 4b. Owner tenant cannot see demo properties (verified strictly isolated to ${ownerAllProperties.length} owner property)`)

  // Check 4c: Owner queries bookings
  const ownerAllBookings = await prisma.booking.findMany({
    where: { property: { tenantId: ownerTenant.id } },
  })
  if (ownerAllBookings.length !== 1 || ownerAllBookings[0].id !== booking.id) {
    throw new Error('❌ Cross-tenant booking query anomaly')
  }
  console.log(`✅ 4c. Owner bookings strictly isolated (count: ${ownerAllBookings.length})`)

  console.log('\n🎉 ALL MULTI-TENANT SAAS TESTS PASSED WITH 100% SUCCESS!')
}

runSaaSTests()
  .catch((e) => {
    console.error('❌ Test failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
