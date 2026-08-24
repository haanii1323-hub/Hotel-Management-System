import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, calcNights } from '@/lib/utils'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAuth()
  if (error) return error

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
      payments: { orderBy: { createdAt: 'asc' } },
      bookingRooms: { include: { room: { include: { category: true } } } },
      invoices: { orderBy: { generatedAt: 'desc' } },
      statusLogs: { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  return NextResponse.json(booking)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth()
  if (error) return error

  const body = await req.json().catch(() => ({}))
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

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  const {
    guestName,
    phone,
    email,
    source,
    checkIn,
    checkOut,
    roomCategory,
    nightlyRate,
    numRooms,
    adults,
    kids,
    notes,
    status,
  } = body

  // 1. Update Guest if name, phone, or email was changed
  if (guestName !== undefined || phone !== undefined || email !== undefined) {
    await prisma.guest.update({
      where: { id: booking.guestId },
      data: {
        ...(guestName !== undefined ? { name: String(guestName).trim() } : {}),
        ...(phone !== undefined ? { phone: String(phone).trim() } : {}),
        ...(email !== undefined ? { email: email ? String(email).trim() : null } : {}),
      },
    })
  }

  // 2. Prepare Booking Update Data
  const bookingUpdateData: Record<string, unknown> = {}

  if (source !== undefined) bookingUpdateData.source = String(source)
  if (notes !== undefined) bookingUpdateData.notes = notes ? String(notes).trim() : null
  if (adults !== undefined) bookingUpdateData.adults = Math.max(1, Number(adults))
  if (kids !== undefined) bookingUpdateData.kids = Math.max(0, Number(kids))

  // Handle Date changes
  let newCheckIn = booking.checkIn
  let newCheckOut = booking.checkOut

  if (checkIn) {
    newCheckIn = typeof checkIn === 'string' && checkIn.includes('T')
      ? new Date(checkIn)
      : new Date(`${checkIn}T12:00:00.000Z`)
    bookingUpdateData.checkIn = newCheckIn
  }

  if (checkOut) {
    newCheckOut = typeof checkOut === 'string' && checkOut.includes('T')
      ? new Date(checkOut)
      : new Date(`${checkOut}T12:00:00.000Z`)
    bookingUpdateData.checkOut = newCheckOut
  }

  if (newCheckOut <= newCheckIn) {
    return NextResponse.json({ error: 'Check-out date must be after check-in date' }, { status: 400 })
  }

  const newNumRooms = numRooms !== undefined ? Math.max(1, Number(numRooms)) : booking.numRooms
  const newCategory = roomCategory !== undefined ? String(roomCategory) : booking.roomCategory
  const newNightlyRate = nightlyRate !== undefined ? Math.max(1, Number(nightlyRate)) : booking.nightlyRate

  if (numRooms !== undefined) bookingUpdateData.numRooms = newNumRooms
  if (roomCategory !== undefined) bookingUpdateData.roomCategory = newCategory
  if (nightlyRate !== undefined) bookingUpdateData.nightlyRate = newNightlyRate

  // Recalculate total amount if dates, rate or rooms changed
  if (checkIn || checkOut || nightlyRate !== undefined || numRooms !== undefined) {
    const nights = calcNights(newCheckIn, newCheckOut)
    bookingUpdateData.totalAmount = newNightlyRate * nights * newNumRooms
  }

  // 3. Handle Status Change (e.g. Cancelled)
  if (status !== undefined && status !== booking.status) {
    bookingUpdateData.status = status

    await prisma.bookingStatusLog.create({
      data: {
        bookingId: booking.id,
        oldStatus: booking.status,
        newStatus: status,
        changedBy: session?.user?.id,
      },
    })

    // If cancelled, release assigned rooms back to Available
    if (status === 'Cancelled') {
      for (const br of booking.bookingRooms) {
        if (br.room.status === 'Occupied') {
          await prisma.room.update({
            where: { id: br.roomId },
            data: { status: 'Available' },
          })
          await prisma.roomStatusLog.create({
            data: {
              roomId: br.roomId,
              oldStatus: 'Occupied',
              newStatus: 'Available',
              changedBy: session?.user?.id,
            },
          })
        }
      }
    }
  }

  // 4. Handle Room Category or Room Count changes
  if ((roomCategory && roomCategory !== booking.roomCategory) || (numRooms && numRooms !== booking.numRooms)) {
    // If not checked in yet, reassign rooms from the target category
    if (booking.status === 'Upcoming') {
      const cat = await prisma.roomCategory.findFirst({
        where: { name: newCategory },
        include: { rooms: true },
      })
      if (cat) {
        // Delete old assignments
        await prisma.bookingRoom.deleteMany({ where: { bookingId: booking.id } })

        // Find available rooms
        const availableRooms = cat.rooms.filter((r) => r.status === 'Available')
        const toAssign = (availableRooms.length >= newNumRooms ? availableRooms : cat.rooms).slice(0, newNumRooms)

        if (toAssign.length > 0) {
          await prisma.bookingRoom.createMany({
            data: toAssign.map((r) => ({
              bookingId: booking.id,
              roomId: r.id,
            })),
          })
        }
      }
    }
  }

  // 5. Update the booking
  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: bookingUpdateData,
    include: {
      guest: true,
      payments: { orderBy: { createdAt: 'asc' } },
      bookingRooms: { include: { room: { include: { category: true } } } },
      invoices: { orderBy: { generatedAt: 'desc' } },
      statusLogs: { orderBy: { createdAt: 'desc' } },
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth()
  if (error) return error

  const booking = await prisma.booking.findFirst({
    where: {
      OR: [
        { id: params.id },
        { bookingRef: params.id },
        { bookingRef: params.id.startsWith('#') ? params.id : `#${params.id}` },
      ],
    },
    include: { bookingRooms: { include: { room: true } } },
  })

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  // Release any occupied rooms
  for (const br of booking.bookingRooms) {
    if (br.room.status === 'Occupied') {
      await prisma.room.update({
        where: { id: br.roomId },
        data: { status: 'Available' },
      })
      await prisma.roomStatusLog.create({
        data: {
          roomId: br.roomId,
          oldStatus: 'Occupied',
          newStatus: 'Available',
          changedBy: session?.user?.id,
        },
      })
    }
  }

  // Delete relational logs and links
  await prisma.bookingStatusLog.deleteMany({ where: { bookingId: booking.id } })
  await prisma.invoice.deleteMany({ where: { bookingId: booking.id } })
  await prisma.payment.deleteMany({ where: { bookingId: booking.id } })
  await prisma.bookingRoom.deleteMany({ where: { bookingId: booking.id } })
  await prisma.booking.delete({ where: { id: booking.id } })

  return NextResponse.json({ success: true, message: `Booking ${booking.bookingRef} deleted` })
}
