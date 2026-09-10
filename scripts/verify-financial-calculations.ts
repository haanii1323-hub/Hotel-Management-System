import { calculateBookingFinancials } from '../lib/financials'
import assert from 'assert'

console.log('🧪 Starting Financial Calculations & Receipt Verification...')

// Test Case 1: Standard Booking without add-ons or discount
{
  const booking = {
    checkIn: '2026-09-10',
    checkOut: '2026-09-12',
    numRooms: 2,
    roomCategory: 'Deluxe Room',
    nightlyRate: 3000,
    discountAmount: 0,
    taxAmount: 0,
    totalAmount: 12000, // 3000 * 2 rooms * 2 nights = 12000
    payments: [{ amount: 4000, status: 'Paid' }],
  }

  const fin = calculateBookingFinancials(booking)
  assert.strictEqual(fin.nights, 2, 'Nights should be 2')
  assert.strictEqual(fin.numRooms, 2, 'Num rooms should be 2')
  assert.strictEqual(fin.baseRoomCharges, 12000, 'Base room charges should be 12000')
  assert.strictEqual(fin.grossTotal, 12000, 'Gross total should be 12000')
  assert.strictEqual(fin.totalAmount, 12000, 'Net total amount should be 12000')
  assert.strictEqual(fin.collected, 4000, 'Collected should be 4000')
  assert.strictEqual(fin.balance, 8000, 'Balance should be 8000')
  assert.strictEqual(fin.lineItems.length, 1, 'Should have 1 room reservation line item')
  console.log('  ✅ Test 1 Passed: Standard booking calculations')
}

// Test Case 2: Booking with Discount
{
  const booking = {
    checkIn: '2026-09-10',
    checkOut: '2026-09-13',
    numRooms: 1,
    roomCategory: 'Executive Suite',
    nightlyRate: 4000,
    discountAmount: 1500,
    taxAmount: 0,
    totalAmount: 10500, // 4000 * 3 nights = 12000 - 1500 discount = 10500
    payments: [{ amount: 10500, status: 'Paid' }],
  }

  const fin = calculateBookingFinancials(booking)
  assert.strictEqual(fin.nights, 3, 'Nights should be 3')
  assert.strictEqual(fin.baseRoomCharges, 12000, 'Base room charges before discount should be 12000')
  assert.strictEqual(fin.grossTotal, 12000, 'Gross total should be 12000')
  assert.strictEqual(fin.discount, 1500, 'Discount should be 1500')
  assert.strictEqual(fin.totalAmount, 10500, 'Total payable should be 10500')
  assert.strictEqual(fin.collected, 10500, 'Collected should be 10500')
  assert.strictEqual(fin.balance, 0, 'Balance should be 0')
  console.log('  ✅ Test 2 Passed: Booking with discount calculations')
}

// Test Case 3: Booking with Add-ons (Early check-in, Late checkout, Extra mattress) + Discount
{
  const booking = {
    checkIn: '2026-09-10',
    checkOut: '2026-09-12',
    numRooms: 1,
    roomCategory: 'Deluxe Room',
    nightlyRate: 2500,
    discountAmount: 500,
    taxAmount: 0,
    totalAmount: 6500, // Room: 2500*2 = 5000 + Early check-in 500 + Extra mattress 1*750*2 = 1500 - Discount 500 = 6500
    notes: 'Early Check-in: ₹500 | Extra Mattress (1× ₹750): ₹1500',
    payments: [
      { amount: 3000, status: 'Paid' },
      { amount: 3500, status: 'Paid' },
    ],
  }

  const fin = calculateBookingFinancials(booking)
  assert.strictEqual(fin.nights, 2, 'Nights should be 2')
  assert.strictEqual(fin.baseRoomCharges, 5000, 'Base room charges should be 5000')
  assert.strictEqual(fin.earlyCheckIn, 500, 'Early check-in should be 500')
  assert.strictEqual(fin.extraMattress, 1500, 'Extra mattress should be 1500')
  assert.strictEqual(fin.extraMattressCount, 1, 'Mattress count should be 1')
  assert.strictEqual(fin.extraMattressRate, 750, 'Mattress rate should be 750')
  assert.strictEqual(fin.addOnsTotal, 2000, 'Total add-ons should be 2000')
  assert.strictEqual(fin.grossTotal, 7000, 'Gross total should be 7000 (5000 + 2000)')
  assert.strictEqual(fin.discount, 500, 'Discount should be 500')
  assert.strictEqual(fin.totalAmount, 6500, 'Total amount should be 6500')
  assert.strictEqual(fin.collected, 6500, 'Collected should be 6500')
  assert.strictEqual(fin.balance, 0, 'Balance should be 0')
  assert.strictEqual(fin.lineItems.length, 3, 'Should have 3 itemized lines (Room, Early check-in, Extra mattress)')
  console.log('  ✅ Test 3 Passed: Booking with add-ons and discount calculations')
}

// Test Case 4: Same-Day Stay (Day Use)
{
  const booking = {
    checkIn: '2026-09-10',
    checkOut: '2026-09-10',
    numRooms: 1,
    roomCategory: 'Standard Room',
    nightlyRate: 1800,
    discountAmount: 0,
    taxAmount: 0,
    totalAmount: 1800,
    payments: [],
  }

  const fin = calculateBookingFinancials(booking)
  assert.strictEqual(fin.isSameDay, true, 'isSameDay should be true')
  assert.strictEqual(fin.nights, 1, 'Nights should be 1 (billed as 1 day)')
  assert.strictEqual(fin.baseRoomCharges, 1800, 'Room charges should be 1800')
  assert.strictEqual(fin.totalAmount, 1800, 'Total amount should be 1800')
  assert.strictEqual(fin.balance, 1800, 'Balance should be 1800')
  console.log('  ✅ Test 4 Passed: Same-day stay calculations')
}

console.log('🎉 ALL FINANCIAL & RECEIPT CALCULATION TESTS PASSED SUCCESSFULLY!')
