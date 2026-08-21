import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/utils'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth()
  if (error) return error

  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: { bookingRooms: { include: { room: true } } },
  })

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  if (booking.status !== 'Upcoming') return NextResponse.json({ error: 'Booking is not in Upcoming status' }, { status: 400 })

  // Update booking status
  const updated = await prisma.booking.update({
    where: { id: params.id },
    data: { status: 'CheckedIn' },
  })

  // Update room status to Occupied
  for (const br of booking.bookingRooms) {
    await prisma.room.update({ where: { id: br.roomId }, data: { status: 'Occupied' } })
    await prisma.roomStatusLog.create({
      data: { roomId: br.roomId, oldStatus: br.room.status, newStatus: 'Occupied', changedBy: session?.user?.id },
    })
  }

  await prisma.bookingStatusLog.create({
    data: { bookingId: params.id, oldStatus: 'Upcoming', newStatus: 'CheckedIn', changedBy: session?.user?.id },
  })

  return NextResponse.json(updated)
}
