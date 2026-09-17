// Test uncapped occupancy and overbooking logic
function calculateOccupancy(totalSellableRooms: number, bookedRooms: number) {
  const availableRooms = totalSellableRooms - bookedRooms
  const overbookedRooms = Math.max(0, bookedRooms - totalSellableRooms)
  const isOverbooked = bookedRooms > totalSellableRooms
  const occupancy =
    totalSellableRooms > 0
      ? Number(((bookedRooms / totalSellableRooms) * 100).toFixed(2))
      : 0
  return { availableRooms, overbookedRooms, isOverbooked, occupancy }
}

console.log('--- Test 1: Normal under-capacity (40 booked out of 44) ---')
console.log(calculateOccupancy(44, 40))

console.log('\n--- Test 2: Exactly 100% capacity (44 booked out of 44) ---')
console.log(calculateOccupancy(44, 44))

console.log('\n--- Test 3: Overbooked capacity (50 booked out of 44) ---')
const overbookedResult = calculateOccupancy(44, 50)
console.log(overbookedResult)

if (
  overbookedResult.occupancy === 113.64 &&
  overbookedResult.overbookedRooms === 6 &&
  overbookedResult.availableRooms === -6
) {
  console.log('✅ Test 3 PASSED! 50/44 is 113.64% occupancy, -6 available, 6 overbooked.')
} else {
  console.error('❌ Test 3 FAILED!', overbookedResult)
}

// Test Date-based room nights spanning checkIn <= d < checkOut
function calculateDateRoomNights(
  bookings: Array<{ checkIn: string; checkOut: string; status: string; numRooms: number }>,
  date: string
) {
  return bookings
    .filter((b) => {
      const isEligible = b.status === 'Upcoming' || b.status === 'CheckedIn'
      if (!isEligible) return false
      if (b.checkIn === b.checkOut) return b.checkIn === date
      return b.checkIn <= date && date < b.checkOut
    })
    .reduce((sum, b) => sum + b.numRooms, 0)
}

const mockBookings = [
  // 3-night booking from 2026-09-10 to 2026-09-13 (2 rooms) -> Active on 10th, 11th, 12th; NOT 13th
  { checkIn: '2026-09-10', checkOut: '2026-09-13', status: 'CheckedIn', numRooms: 2 },
  // Cancelled booking (should NOT count)
  { checkIn: '2026-09-10', checkOut: '2026-09-12', status: 'Cancelled', numRooms: 5 },
  // CheckedOut booking (should NOT count)
  { checkIn: '2026-09-08', checkOut: '2026-09-10', status: 'CheckedOut', numRooms: 10 },
  // Confirmed / Upcoming booking
  { checkIn: '2026-09-11', checkOut: '2026-09-12', status: 'Upcoming', numRooms: 44 },
]

console.log('\n--- Date Room Night tests ---')
const d10 = calculateDateRoomNights(mockBookings, '2026-09-10')
const d11 = calculateDateRoomNights(mockBookings, '2026-09-11')
const d12 = calculateDateRoomNights(mockBookings, '2026-09-12')
const d13 = calculateDateRoomNights(mockBookings, '2026-09-13')

console.log('2026-09-10:', d10, 'rooms (Expected: 2)')
console.log('2026-09-11:', d11, 'rooms (Expected: 46 -> Overbooked if capacity 44)')
console.log('2026-09-12:', d12, 'rooms (Expected: 2)')
console.log('2026-09-13:', d13, 'rooms (Expected: 0)')

if (d10 === 2 && d11 === 46 && d12 === 2 && d13 === 0) {
  console.log('✅ Date-based room night test PASSED!')
} else {
  console.error('❌ Date-based room night test FAILED!')
}
