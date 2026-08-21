import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/utils'

export async function GET(req: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''

  if (!q.trim()) return NextResponse.json([])

  const bookings = await prisma.booking.findMany({
    where: {
      OR: [
        { guest: { name: { contains: q } } },
        { bookingRef: { contains: q } },
        { guest: { phone: { contains: q } } },
      ],
    },
    include: { guest: true, payments: true },
    take: 10,
  })

  return NextResponse.json(bookings)
}
