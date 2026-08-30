import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTargetPropertyId } from '@/lib/property-helper'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const propertyId = await getTargetPropertyId(req, (session?.user as any)?.propertyId)

    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || ''

    if (!q.trim()) {
      return NextResponse.json([])
    }

    const search = q.trim().replace(/^#/, '')

    const bookings = await prisma.booking.findMany({
      where: {
        propertyId,
        OR: [
          { guest: { name: { contains: search, mode: 'insensitive' } } },
          { guest: { phone: { contains: search } } },
          { guest: { email: { contains: search, mode: 'insensitive' } } },
          { bookingRef: { contains: search, mode: 'insensitive' } },
          { bookingRef: { contains: `#${search}`, mode: 'insensitive' } },
          { roomCategory: { contains: search, mode: 'insensitive' } },
          { source: { contains: search, mode: 'insensitive' } },
          { bookingRooms: { some: { room: { number: { contains: search, mode: 'insensitive' } } } } },
        ],
      },
      include: {
        guest: true,
        payments: true,
        bookingRooms: {
          include: {
            room: true,
          },
        },
      },
      take: 12,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(bookings)
  } catch (error: any) {
    console.error('Error in search:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
