import { format, addDays } from 'date-fns'

async function runE2eApiTest() {
  console.log('🌐 Starting Live End-to-End HTTP API Tests on http://localhost:3000...\n')
  const baseUrl = 'http://localhost:3000'
  let passed = 0
  let failed = 0

  function assert(cond: boolean, desc: string) {
    if (cond) {
      console.log(`  ✅ PASS: ${desc}`)
      passed++
    } else {
      console.error(`  ❌ FAIL: ${desc}`)
      failed++
    }
  }

  const suffix = Date.now().toString().slice(-4)

  try {
    // 1. Check Properties List
    console.log('--- Step 1: Fetch Properties List ---')
    const resProps = await fetch(`${baseUrl}/api/properties`)
    assert(resProps.ok, `GET /api/properties returned HTTP ${resProps.status}`)
    const properties = await resProps.json()
    assert(Array.isArray(properties) && properties.length > 0, `Properties loaded: ${properties.length} properties found`)
    const currentProp = properties[0]
    console.log(`  Selected Property: ${currentProp.name} (${currentProp.code}) [${currentProp.id}]`)

    // 2. Check Dashboard KPIs
    console.log('\n--- Step 2: Dashboard Real-time KPIs ---')
    const resDash = await fetch(`${baseUrl}/api/dashboard?propertyId=${currentProp.id}`)
    assert(resDash.ok, `GET /api/dashboard returned HTTP ${resDash.status}`)
    const dashData = await resDash.json()
    assert(dashData.kpis !== undefined, `Dashboard KPIs received (Total Rooms: ${dashData.kpis.totalRooms}, Occupied: ${dashData.kpis.occupiedRooms})`)

    // 3. Create Guest directly via API
    console.log('\n--- Step 3: Direct Guest Creation ---')
    const guestPhone = `998877${suffix}`
    const resGuest = await fetch(`${baseUrl}/api/guests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        propertyId: currentProp.id,
        name: `Vikram Malhotra ${suffix}`,
        phone: guestPhone,
        email: `vikram${suffix}@hoteltest.com`,
        address: 'Indiranagar, Bangalore',
      }),
    })
    assert(resGuest.status === 201, `POST /api/guests returned HTTP ${resGuest.status}`)
    const createdGuest = await resGuest.json()
    assert(createdGuest.name === `Vikram Malhotra ${suffix}`, `Guest name confirmed: ${createdGuest.name}`)

    // 4. Verify Guest Directory search
    console.log('\n--- Step 4: Guest Directory Verification ---')
    const resGuestSearch = await fetch(`${baseUrl}/api/guests?propertyId=${currentProp.id}&search=${guestPhone}`)
    const guestSearchResults = await resGuestSearch.json()
    assert(guestSearchResults.length === 1, `Found created guest in directory search`)

    // 5. Fetch Categories & Rooms
    console.log('\n--- Step 5: Rooms and Categories ---')
    const resCats = await fetch(`${baseUrl}/api/categories?propertyId=${currentProp.id}`)
    const categories = await resCats.json()
    assert(categories.length > 0, `Categories retrieved: ${categories.map((c: any) => c.name).join(', ')}`)
    const targetCat = categories[0]

    // Create a new room
    const roomNum = `R-${suffix}`
    const resRoom = await fetch(`${baseUrl}/api/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        propertyId: currentProp.id,
        number: roomNum,
        categoryId: targetCat.id,
      }),
    })
    // May be 201 or 401 if unauthenticated session, check response
    console.log(`  Room creation attempt status: HTTP ${resRoom.status}`)

    // 6. Create New Booking via API
    console.log('\n--- Step 6: Create New Booking ---')
    const today = new Date()
    const checkInStr = format(today, 'yyyy-MM-dd')
    const checkOutStr = format(addDays(today, 2), 'yyyy-MM-dd')

    const resBooking = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        propertyId: currentProp.id,
        guestName: `Vikram Malhotra ${suffix}`,
        phone: guestPhone,
        email: `vikram${suffix}@hoteltest.com`,
        checkIn: checkInStr,
        checkOut: checkOutStr,
        roomCategory: targetCat.name,
        nightlyRate: targetCat.nightlyRate,
        numRooms: 1,
        source: 'Direct Web',
      }),
    })
    assert(resBooking.status === 201, `POST /api/bookings returned HTTP ${resBooking.status}`)
    const createdBooking = await resBooking.json()
    assert(!!createdBooking.bookingRef, `Booking created with reference: ${createdBooking.bookingRef}`)
    assert(createdBooking.status === 'Upcoming', `Booking status is Upcoming`)

    // 7. Verify Overlapping Double-Booking Prevention
    console.log('\n--- Step 7: Overlapping Double-Booking Prevention ---')
    // Attempt to book ALL available rooms plus one on the same dates
    const resRoomsList = await fetch(`${baseUrl}/api/rooms?propertyId=${currentProp.id}`)
    const allRooms = await resRoomsList.json()
    const catRooms = allRooms.filter((r: any) => r.categoryId === targetCat.id)

    const resConflict = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        propertyId: currentProp.id,
        guestName: 'Overbooking Tester',
        phone: '9999999999',
        checkIn: checkInStr,
        checkOut: checkOutStr,
        roomCategory: targetCat.name,
        nightlyRate: targetCat.nightlyRate,
        numRooms: catRooms.length + 1, // Request more rooms than exist
      }),
    })
    assert(resConflict.status === 409, `Overlapping / over-capacity booking rejected with HTTP 409 Conflict (got ${resConflict.status})`)
    const conflictData = await resConflict.json()
    console.log(`  Conflict error message: "${conflictData.error}"`)

    // 8. Check-In Booking
    console.log('\n--- Step 8: Check-In Operation ---')
    const resCheckIn = await fetch(`${baseUrl}/api/bookings/${createdBooking.id}/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    assert(resCheckIn.ok, `POST /api/bookings/${createdBooking.id}/checkin returned HTTP ${resCheckIn.status}`)
    const checkInData = await resCheckIn.json()
    assert(checkInData.booking?.status === 'CheckedIn' || checkInData.status === 'CheckedIn', `Booking status is now CheckedIn`)

    // 9. Payment Collection
    console.log('\n--- Step 9: Payment Collection ---')
    const resPayment = await fetch(`${baseUrl}/api/bookings/${createdBooking.id}/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: createdBooking.totalAmount,
        mode: 'UPI',
        status: 'Paid',
        utrRef: `UTR${Date.now()}`,
      }),
    })
    assert(resPayment.ok, `POST /api/bookings/${createdBooking.id}/payment returned HTTP ${resPayment.status}`)

    // 10. Check-Out Operation
    console.log('\n--- Step 10: Check-Out Operation ---')
    const resCheckOut = await fetch(`${baseUrl}/api/bookings/${createdBooking.id}/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: 0,
        mode: 'Cash',
        status: 'Paid',
      }),
    })
    assert(resCheckOut.ok, `POST /api/bookings/${createdBooking.id}/checkout returned HTTP ${resCheckOut.status}`)
    const checkoutData = await resCheckOut.json()
    assert(checkoutData.booking?.status === 'CheckedOut' || checkoutData.status === 'CheckedOut', `Booking status is CheckedOut`)
    assert(!!checkoutData.invoiceNo, `Invoice number generated: ${checkoutData.invoiceNo}`)

    // 11. Verify Earnings & Reports
    console.log('\n--- Step 11: Dynamic Reports & Earnings ---')
    const resReports = await fetch(`${baseUrl}/api/reports?propertyId=${currentProp.id}`)
    const reportsData = await resReports.json()
    assert(reportsData.roomRevenue !== undefined, `Reports generated dynamically with revenue: ₹${reportsData.roomRevenue}`)

    const resEarnings = await fetch(`${baseUrl}/api/earnings?propertyId=${currentProp.id}`)
    const earningsData = await resEarnings.json()
    assert(earningsData.collected !== undefined, `Earnings collected amount: ₹${earningsData.collected}`)

    // 12. Realtime Notifications Check
    console.log('\n--- Step 12: Realtime Notifications ---')
    const resNotif = await fetch(`${baseUrl}/api/notifications?propertyId=${currentProp.id}`)
    const notifData = await resNotif.json()
    assert(notifData.totalCount !== undefined, `Notifications query returned count: ${notifData.totalCount} (cleaning: ${notifData.cleaningCount})`)

    console.log('\n========================================')
    console.log(`🏁 LIVE HTTP API TESTS COMPLETED: ${passed} PASSED, ${failed} FAILED`)
    console.log('========================================')
  } catch (e) {
    console.error('Test execution error:', e)
    failed++
  }

  if (failed > 0) process.exit(1)
}

runE2eApiTest()
