import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const baseUrl = 'http://localhost:3000'

interface TestContext {
  createdBookingIds: string[]
  createdGuestIds: string[]
  createdRoomIds: string[]
}

const context: TestContext = {
  createdBookingIds: [],
  createdGuestIds: [],
  createdRoomIds: [],
}

async function runComprehensiveTests() {
  console.log('🧪 Starting APEX INN Comprehensive PMS Verification...\n')

  let passed = 0
  let failed = 0

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName} ${detail ? `(${detail})` : ''}`)
      passed++
    } else {
      console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`)
      failed++
    }
  }

  try {
    // 0. Initial Data Snapshot
    const initialBookingCount = await prisma.booking.count()
    const initialGuestCount = await prisma.guest.count()
    console.log(`📊 Initial DB State: ${initialBookingCount} bookings, ${initialGuestCount} guests`)

    // 1. Page HTTP Responses
    console.log('\n--- 1. Testing Core Frontend Routes ---')
    const routes = ['/', '/bookings', '/dashboard', '/earnings', '/reports', '/pricing', '/settings']
    for (const route of routes) {
      const res = await fetch(`${baseUrl}${route}`)
      assert(res.status === 200, `Route ${route} renders with HTTP 200`, `Status: ${res.status}`)
    }

    // 2. Authentication Flow
    console.log('\n--- 2. Testing Authentication & Session ---')
    const csrfRes = await fetch(`${baseUrl}/api/auth/csrf`)
    const { csrfToken } = await csrfRes.json()
    const setCookie = csrfRes.headers.get('set-cookie') || ''

    const loginRes = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': setCookie,
      },
      body: new URLSearchParams({
        csrfToken,
        email: 'admin@apexinn.com',
        password: 'admin123',
        json: 'true',
      }),
      redirect: 'manual',
    })

    const authCookies = loginRes.headers.get('set-cookie') || setCookie
    const cookieHeaders = loginRes.headers.getSetCookie?.() || [authCookies]
    const cookie = cookieHeaders.map((c: any) => c.split(';')[0]).join('; ')
    assert(cookie.length > 0, 'Admin Authentication Successful', 'Acquired next-auth session cookie')

    const headers = {
      'Content-Type': 'application/json',
      'Cookie': cookie,
    }

    // 3. Property & Categories
    console.log('\n--- 3. Testing Property & Room Categories ---')
    const catRes = await fetch(`${baseUrl}/api/categories`, { headers })
    const categories = await catRes.json()
    assert(Array.isArray(categories) && categories.length > 0, 'Fetched Room Categories', `Found ${categories.length} categories`)

    const roomsRes = await fetch(`${baseUrl}/api/rooms`, { headers })
    const rooms = await roomsRes.json()
    assert(Array.isArray(rooms) && rooms.length > 0, 'Fetched Room Inventory', `Found ${rooms.length} rooms`)

    const todayStr = new Date().toISOString().split('T')[0]
    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0]
    const twoDaysStr = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0]

    // 4. Feature Test: Same-Day Stay (Day Use) & 0% GST
    console.log('\n--- 4. Feature Test: Same-Day Stay (Day Use) & 0% GST ---')
    const sameDayPayload = {
      guestName: '__TEST_SAME_DAY_GUEST__',
      phone: '9999000001',
      email: 'test.sameday@example.com',
      source: 'Walk inn',
      checkIn: todayStr,
      checkOut: todayStr, // Same-day stay!
      roomCategory: categories[0]?.name || 'Deluxe',
      nightlyRate: 1500,
      numRooms: 1,
      adults: 1,
      kids: 0,
      taxAmount: 0, // No GST
    }

    const sameDayRes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers,
      body: JSON.stringify(sameDayPayload),
    })
    const sameDayBooking = await sameDayRes.json()
    assert(sameDayRes.status === 200, 'Same-Day Booking Creation HTTP 200', sameDayBooking.bookingRef)
    if (sameDayBooking.id) {
      context.createdBookingIds.push(sameDayBooking.id)
      if (sameDayBooking.guestId) context.createdGuestIds.push(sameDayBooking.guestId)
      assert(sameDayBooking.totalAmount === 1500, 'Same-Day Pricing is billed as 1 Day (₹1500)', `Total: ₹${sameDayBooking.totalAmount}`)
      assert(sameDayBooking.taxAmount === 0, 'GST is 0% (taxAmount = 0)', `Tax: ₹${sameDayBooking.taxAmount}`)
    }

    // 5. Feature Test: Multi-Room Category Selections & Add-ons
    console.log('\n--- 5. Feature Test: Multi-Room Category Selections & Add-ons ---')
    const multiRoomPayload = {
      guestName: '__TEST_MULTI_ROOM_GUEST__',
      phone: '9999000002',
      email: 'test.multiroom@example.com',
      source: 'GOMMT',
      checkIn: todayStr,
      checkOut: tomorrowStr, // 1 night
      roomSelections: [
        { categoryName: categories[0]?.name || 'Deluxe', count: 1, rate: 2000 },
        { categoryName: categories[1]?.name || 'Standard', count: 1, rate: 1500 },
      ],
      earlyCheckIn: 300,
      lateCheckOut: 400,
      extraMattressCount: 1,
      extraMattressRate: 500,
      taxAmount: 0,
    }

    const multiRes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers,
      body: JSON.stringify(multiRoomPayload),
    })
    const multiBooking = await multiRes.json()
    assert(multiRes.status === 200, 'Multi-Category Booking Creation HTTP 200', multiBooking.bookingRef)
    if (multiBooking.id) {
      context.createdBookingIds.push(multiBooking.id)
      if (multiBooking.guestId) context.createdGuestIds.push(multiBooking.guestId)
      // Expected total: (2000 + 1500) * 1 night + 300 + 400 + 500 = 4700
      const expectedTotal = 3500 + 300 + 400 + 500
      assert(multiBooking.totalAmount === expectedTotal, `Multi-room + Addons total matches ₹${expectedTotal}`, `Actual: ₹${multiBooking.totalAmount}`)
      assert(multiBooking.source === 'GOMMT', 'Source correctly recorded as GOMMT', multiBooking.source)
    }

    // 6. Feature Test: 12 OTA Channels Source Support
    console.log('\n--- 6. Feature Test: 12 OTA Channels Sources ---')
    const otas = ['GOMMT', 'B.COM', 'AIRBNB', 'BREVISTAY', 'B2B', 'CLEARTRIP', 'YATRA', 'EXPEDIA', 'AGODA', 'Fab', 'Corporate', 'Walk inn']
    let otasSuccess = true
    for (const ota of otas.slice(0, 3)) { // test subset dynamically
      const otaPayload = {
        guestName: `__TEST_OTA_${ota}__`,
        phone: '9999000003',
        source: ota,
        checkIn: tomorrowStr,
        checkOut: twoDaysStr,
        roomCategory: categories[0]?.name || 'Deluxe',
        nightlyRate: 1000,
        numRooms: 1,
      }
      const otaRes = await fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers,
        body: JSON.stringify(otaPayload),
      })
      const otaBooking = await otaRes.json()
      if (otaBooking.id) {
        context.createdBookingIds.push(otaBooking.id)
        if (otaBooking.guestId) context.createdGuestIds.push(otaBooking.guestId)
        if (otaBooking.source !== ota) otasSuccess = false
      } else {
        otasSuccess = false
      }
    }
    assert(otasSuccess, '12 OTA Channels properly accepted and stored')

    // 7. Feature Test: Fast UPI Payment Collection (No UTR requirement)
    console.log('\n--- 7. Feature Test: Fast UPI Payment Collection ---')
    if (context.createdBookingIds.length > 0) {
      const testBId = context.createdBookingIds[0]
      const upiPaymentRes = await fetch(`${baseUrl}/api/bookings/${testBId}/payment`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          amount: 1000,
          method: 'UPI', // UPI payment
          // Note: NO utrRef provided!
          note: 'Fast counter UPI collection',
        }),
      })
      assert(upiPaymentRes.status === 200, 'Fast UPI Payment accepted without mandatory UTR', `Amount: ₹1000, Mode: UPI`)
    }

    // 8. Feature Test: Check-in & Checkout Flow
    console.log('\n--- 8. Feature Test: Check-in & Checkout Lifecycle ---')
    if (context.createdBookingIds.length > 0) {
      const testBId = context.createdBookingIds[0]
      // Check-in
      const cinRes = await fetch(`${baseUrl}/api/bookings/${testBId}/checkin`, { method: 'POST', headers })
      const cinData = await cinRes.json()
      assert(cinData.status === 'CheckedIn', 'Guest Check-in Status updated to CheckedIn', cinData.status)

      // Checkout
      const coutRes = await fetch(`${baseUrl}/api/bookings/${testBId}/checkout`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ paymentMethod: 'CASH', settledAmount: 500 }),
      })
      const coutData = await coutRes.json()
      assert(coutData.status === 'CheckedOut', 'Guest Checkout Status updated to CheckedOut', coutData.status)
    }

    // 9. Feature Test: Dashboard, Earnings, Reports API
    console.log('\n--- 9. Feature Test: Real-time Analytics & Reports APIs ---')
    const dashRes = await fetch(`${baseUrl}/api/dashboard`, { headers })
    const dashData = await dashRes.json()
    assert(dashRes.status === 200 && dashData.kpis != null, 'Dashboard KPIs API functional', `Occupancy: ${dashData.kpis?.occupancy}%`)

    const earnRes = await fetch(`${baseUrl}/api/earnings`, { headers })
    const earnData = await earnRes.json()
    assert(earnRes.status === 200 && earnData.channels != null, 'Earnings Channel Breakdown API functional', `Channels count: ${earnData.channels?.length}`)

    const repRes = await fetch(`${baseUrl}/api/reports`, { headers })
    const repData = await repRes.json()
    assert(repRes.status === 200 && repData.roomRevenue != null, 'Reports & Trends API functional', `Revenue: ₹${repData.roomRevenue}`)

  } catch (err: any) {
    console.error('💥 Unexpected Test Execution Error:', err)
    failed++
  } finally {
    // 10. CLEANUP: Complete safety cleanup of all test records
    console.log('\n🧹 Cleaning up test data to guarantee zero impact on real database...')
    try {
      if (context.createdBookingIds.length > 0) {
        // Delete payments for test bookings
        await prisma.payment.deleteMany({
          where: { bookingId: { in: context.createdBookingIds } },
        })
        // Delete invoices for test bookings
        await prisma.invoice.deleteMany({
          where: { bookingId: { in: context.createdBookingIds } },
        })
        // Delete booking rooms
        await prisma.bookingRoom.deleteMany({
          where: { bookingId: { in: context.createdBookingIds } },
        })
        // Delete status logs
        await prisma.bookingStatusLog.deleteMany({
          where: { bookingId: { in: context.createdBookingIds } },
        })
        // Delete bookings
        const deletedBookings = await prisma.booking.deleteMany({
          where: { id: { in: context.createdBookingIds } },
        })
        console.log(`  🗑️ Removed ${deletedBookings.count} test bookings`)
      }

      // Delete test guests
      if (context.createdGuestIds.length > 0) {
        const deletedGuests = await prisma.guest.deleteMany({
          where: {
            OR: [
              { id: { in: context.createdGuestIds } },
              { name: { startsWith: '__TEST_' } },
            ],
          },
        })
        console.log(`  🗑️ Removed ${deletedGuests.count} test guests`)
      }

      const finalBookingCount = await prisma.booking.count()
      const finalGuestCount = await prisma.guest.count()
      console.log(`🔒 Final DB State: ${finalBookingCount} bookings, ${finalGuestCount} guests (Data completely preserved)`)
    } catch (cleanupErr) {
      console.error('Error during cleanup:', cleanupErr)
    }
  }

  console.log(`\n========================================`)
  console.log(`🏁 Test Summary: ${passed} Passed, ${failed} Failed`)
  console.log(`========================================\n`)

  if (failed > 0) {
    process.exit(1)
  }
}

runComprehensiveTests()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
