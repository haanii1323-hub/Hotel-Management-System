import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/utils'

export async function GET(req: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') || '').trim()

  if (!q) return NextResponse.json([])

  const withHash = q.startsWith('#') ? q : `#${q}`
  const withoutHash = q.startsWith('#') ? q.slice(1) : q

  const bookings = await prisma.booking.findMany({
    where: {
      OR: [
        { guest: { name: { contains: q } } },
        { guest: { phone: { contains: q } } },
        { guest: { email: { contains: q } } },
        { bookingRef: { contains: q } },
        { bookingRef: { contains: withHash } },
        { bookingRef: { contains: withoutHash } },
        { roomCategory: { contains: q } },
        { source: { contains: q } },
        { bookingRooms: { some: { room: { number: { contains: q } } } } },
      ],
    },
    include: {
      guest: true,
      payments: true,
      bookingRooms: { include: { room: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 12,
  })

  return NextResponse.json(bookings)
}
