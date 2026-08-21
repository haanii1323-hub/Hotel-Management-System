import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/utils'

export async function GET(req: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search')

  const guests = await prisma.guest.findMany({
    where: search ? {
      OR: [
        { name: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
        { bookings: { some: { bookingRef: { contains: search } } } },
      ],
    } : undefined,
    include: {
      bookings: {
        include: { payments: true },
        orderBy: { checkIn: 'desc' },
      },
    },
    orderBy: { name: 'asc' },
  })

  const result = guests.map(g => {
    const totalNights = g.bookings.reduce((s, b) => {
      const nights = Math.ceil((b.checkOut.getTime() - b.checkIn.getTime()) / (1000 * 60 * 60 * 24))
      return s + nights
    }, 0)
    const totalSpent = g.bookings.reduce((s, b) => {
      const collected = b.payments.reduce((ps, p) => ps + (p.status !== 'Pending' ? p.amount : 0), 0)
      return s + collected
    }, 0)
    const balance = g.bookings.reduce((s, b) => {
      const collected = b.payments.reduce((ps, p) => ps + (p.status !== 'Pending' ? p.amount : 0), 0)
      return s + Math.max(0, b.totalAmount - collected)
    }, 0)
    const lastStay = g.bookings[0]?.checkOut || null
    const sources = Array.from(new Set(g.bookings.map(b => b.source)))

    return {
      id: g.id,
      name: g.name,
      phone: g.phone,
      email: g.email,
      totalStays: g.bookings.length,
      totalNights,
      totalSpent,
      balance,
      lastStay,
      sources,
      bookings: g.bookings,
    }
  })

  return NextResponse.json(result)
}
