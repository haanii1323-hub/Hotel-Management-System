import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/utils'

export async function GET(req: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  // All bookings with payments
  const bookings = await prisma.booking.findMany({
    where: { status: { not: 'Cancelled' } },
    include: { payments: true, guest: true },
    orderBy: { createdAt: 'desc' },
  })

  // Total booked value
  const bookedValue = bookings.reduce((s, b) => s + b.totalAmount, 0)

  // Total collected
  const collected = bookings.reduce((s, b) => {
    return s + b.payments.reduce((ps, p) => ps + (p.status !== 'Pending' ? p.amount : 0), 0)
  }, 0)

  const balance = Math.max(0, bookedValue - collected)

  // Revenue by channel
  const channelMap: Record<string, number> = {}
  for (const b of bookings) {
    const rev = b.payments.reduce((s, p) => s + (p.status !== 'Pending' ? p.amount : 0), 0)
    channelMap[b.source] = (channelMap[b.source] || 0) + rev
  }
  const totalRev = Object.values(channelMap).reduce((s, v) => s + v, 0)
  const channels = Object.entries(channelMap)
    .map(([name, amount]) => ({
      name,
      amount,
      percentage: totalRev > 0 ? Math.round((amount / totalRev) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount)

  // Outstanding balances (per booking)
  const outstanding = bookings
    .map((b) => {
      const c = b.payments.reduce((s, p) => s + (p.status !== 'Pending' ? p.amount : 0), 0)
      const bal = Math.max(0, b.totalAmount - c)
      return {
        bookingId: b.id,
        bookingRef: b.bookingRef,
        guestName: b.guest.name,
        guestPhone: b.guest.phone,
        guestEmail: b.guest.email,
        guestId: b.guestId,
        roomCategory: b.roomCategory,
        numRooms: b.numRooms,
        checkIn: b.checkIn,
        checkOut: b.checkOut,
        status: b.status,
        totalAmount: b.totalAmount,
        collected: c,
        amount: bal,
        booking: b,
      }
    })
    .filter((o) => o.amount > 0)
    .sort((a, b) => b.amount - a.amount)

  return NextResponse.json({ bookedValue, collected, balance, channels, outstanding })
}
