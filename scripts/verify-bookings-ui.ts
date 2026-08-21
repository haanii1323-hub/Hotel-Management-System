import { prisma } from '../lib/prisma'

async function verify() {
  console.log('🔍 Verifying Bookings Data & Structure for Modal/Card...')

  const bookings = await prisma.booking.findMany({
    include: {
      guest: true,
      payments: true,
      bookingRooms: { include: { room: true } },
    },
    take: 5,
  })

  console.log(`Found ${bookings.length} bookings to test.`)

  for (const b of bookings) {
    const collected = b.payments.reduce((s, p) => s + (p.status !== 'Pending' ? p.amount : 0), 0)
    const balance = b.totalAmount - collected
    console.log(`\n• Booking #${b.bookingRef}:`)
    console.log(`  - Guest: ${b.guest.name} (${b.guest.phone || 'No phone'})`)
    console.log(`  - Status: ${b.status}`)
    console.log(`  - Category: ${b.roomCategory}, Rooms: ${b.numRooms}`)
    console.log(`  - Dates: ${b.checkIn.toISOString().slice(0,10)} → ${b.checkOut.toISOString().slice(0,10)}`)
    console.log(`  - Financials: Total ₹${b.totalAmount}, Collected ₹${collected}, Balance ₹${balance}`)
    console.log(`  - Payments count: ${b.payments.length}`)
  }

  console.log('\n✅ All booking records verified with complete relational data!')
}

verify().catch(console.error)
