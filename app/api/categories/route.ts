import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/utils'

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  const categories = await prisma.roomCategory.findMany({
    include: {
      rooms: true,
    },
    orderBy: { name: 'asc' },
  })

  // Compute room nights sold per category
  const now = new Date()
  const result = await Promise.all(categories.map(async (cat) => {
    // Count room nights sold (CheckedIn or CheckedOut bookings)
    const bookings = await prisma.booking.findMany({
      where: {
        roomCategory: cat.name,
        status: { in: ['CheckedIn', 'CheckedOut'] },
      },
    })
    const roomNightsSold = bookings.reduce((s, b) => {
      const nights = Math.ceil((b.checkOut.getTime() - b.checkIn.getTime()) / (1000 * 60 * 60 * 24))
      return s + nights * b.numRooms
    }, 0)

    return {
      ...cat,
      roomNightsSold,
      activeRooms: cat.rooms.filter(r => !['Maintenance', 'Out of Service'].includes(r.status)).length,
    }
  }))

  return NextResponse.json(result)
}

export async function PATCH(req: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  const body = await req.json()
  const { id, nightlyRate } = body

  if (!id) return NextResponse.json({ error: 'Category ID required' }, { status: 400 })
  if (!nightlyRate || nightlyRate <= 0) return NextResponse.json({ error: 'Invalid nightly rate' }, { status: 400 })

  const updated = await prisma.roomCategory.update({
    where: { id },
    data: { nightlyRate: Number(nightlyRate) },
  })

  return NextResponse.json(updated)
}
