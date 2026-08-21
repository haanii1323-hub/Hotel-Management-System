import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/utils'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth()
  if (error) return error

  if (!params.id) {
    return NextResponse.json({ error: 'Missing booking ID' }, { status: 400 })
  }

  // Find booking by ID or bookingRef
  const booking = await prisma.booking.findFirst({
    where: {
      OR: [
        { id: params.id },
        { bookingRef: params.id },
        { bookingRef: params.id.startsWith('#') ? params.id : `#${params.id}` },
      ],
    },
    include: {
      guest: true,
      bookingRooms: { include: { room: true } },
      payments: true,
    },
  })

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  if (booking.status === 'CheckedIn') {
    return NextResponse.json({ error: 'Guest is already checked in.' }, { status: 400 })
  }

  if (booking.status === 'CheckedOut') {
    return NextResponse.json({ error: 'Booking is already checked out.' }, { status: 400 })
  }

  if (booking.status === 'Cancelled') {
    return NextResponse.json({ error: 'Cannot check in a cancelled booking.' }, { status: 400 })
  }

  // If no rooms are assigned yet, assign available rooms now
  if (booking.bookingRooms.length === 0) {
    const category = await prisma.roomCategory.findFirst({
      where: { name: booking.roomCategory },
      include: { rooms: true },
    })

    if (category && category.rooms.length > 0) {
      const availableRooms = category.rooms.filter((r) => r.status === 'Available')
      const roomsToAssign = (availableRooms.length >= booking.numRooms ? availableRooms : category.rooms).slice(0, booking.numRooms)

      for (const r of roomsToAssign) {
        await prisma.bookingRoom.create({
          data: {
            bookingId: booking.id,
            roomId: r.id,
          },
        })
      }
    }
  }

  // Update booking status to CheckedIn
  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { status: 'CheckedIn' },
    include: {
      guest: true,
      bookingRooms: { include: { room: true } },
      payments: true,
    },
  })

  // Update assigned rooms to Occupied
  for (const br of updated.bookingRooms) {
    await prisma.room.update({
      where: { id: br.roomId },
      data: { status: 'Occupied' },
    })
    await prisma.roomStatusLog.create({
      data: {
        roomId: br.roomId,
        oldStatus: br.room.status,
        newStatus: 'Occupied',
        changedBy: session?.user?.id,
      },
    })
  }

  await prisma.bookingStatusLog.create({
    data: {
      bookingId: booking.id,
      oldStatus: booking.status,
      newStatus: 'CheckedIn',
      changedBy: session?.user?.id,
    },
  })

  return NextResponse.json({
    success: true,
    message: `${booking.guest.name} checked in successfully!`,
    booking: updated,
    ...updated,
  })
}
