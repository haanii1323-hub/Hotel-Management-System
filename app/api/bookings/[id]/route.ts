import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, calcNights } from '@/lib/utils'
import { format } from 'date-fns'

function parseBookingDate(d: string | Date | null | undefined): Date {
  if (!d) return new Date()
  if (typeof d === 'string') {
    const match = d.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) {
      const year = parseInt(match[1], 10)
      const month = parseInt(match[2], 10) - 1
      const day = parseInt(match[3], 10)
      return new Date(year, month, day, 12, 0, 0)
    }
  }
  const dt = new Date(d)
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 12, 0, 0)
}

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
      property: true,
    },
  })

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  const {
    guestName,
    phone,
    email,
    address,
    source,
    checkIn,
    checkOut,
    roomCategory,
    nightlyRate,
    taxAmount: customTax,
    discountAmount: customDiscount,
    numRooms,
    adults,
    kids,
    notes,
    status,
  } = body

  // 1. Update Guest if fields provided
  if (guestName !== undefined || phone !== undefined || email !== undefined || address !== undefined) {
    await prisma.guest.update({
      where: { id: booking.guestId },
      data: {
        ...(guestName !== undefined ? { name: String(guestName).trim() } : {}),
        ...(phone !== undefined ? { phone: String(phone).trim() } : {}),
        ...(email !== undefined ? { email: email ? String(email).trim() : null } : {}),
        ...(address !== undefined ? { address: address ? String(address).trim() : null } : {}),
      },
    })
  }

  // 2. Dates and category verification
  let newCheckIn = booking.checkIn
  let newCheckOut = booking.checkOut
  let datesChanged = false

  if (checkIn) {
    newCheckIn = parseBookingDate(checkIn)
    datesChanged = true
  }
  if (checkOut) {
    newCheckOut = parseBookingDate(checkOut)
    datesChanged = true
  }

  if (newCheckOut <= newCheckIn) {
    return NextResponse.json({ error: 'Check-out date must be after check-in date' }, { status: 400 })
  }

  const newNumRooms = numRooms !== undefined ? Math.max(1, Number(numRooms)) : booking.numRooms
  const newCategory = roomCategory !== undefined ? String(roomCategory) : booking.roomCategory
  const newNightlyRate = nightlyRate !== undefined ? Math.max(1, Number(nightlyRate)) : booking.nightlyRate

  const bookingUpdateData: Record<string, unknown> = {
    checkIn: newCheckIn,
    checkOut: newCheckOut,
    numRooms: newNumRooms,
    roomCategory: newCategory,
    nightlyRate: newNightlyRate,
  }

  if (source !== undefined) bookingUpdateData.source = String(source)
  if (notes !== undefined) bookingUpdateData.notes = notes ? String(notes).trim() : null
  if (adults !== undefined) bookingUpdateData.adults = Math.max(1, Number(adults))
  if (kids !== undefined) bookingUpdateData.kids = Math.max(0, Number(kids))

  // Check double-booking conflicts if dates or category/rooms changed and status is Upcoming or CheckedIn
  const targetStatus = status !== undefined ? status : booking.status
  if (
    (datesChanged || roomCategory !== undefined || numRooms !== undefined) &&
    ['Upcoming', 'CheckedIn'].includes(targetStatus)
  ) {
    // Check conflicts excluding this booking
    const conflictingBookings = await prisma.booking.findMany({
      where: {
        propertyId: booking.propertyId,
        id: { not: booking.id },
        status: { in: ['Upcoming', 'CheckedIn'] },
        AND: [
          { checkIn: { lt: newCheckOut } },
          { checkOut: { gt: newCheckIn } },
        ],
      },
      include: { bookingRooms: true },
    })

    const bookedRoomIds = new Set<string>()
    for (const cb of conflictingBookings) {
      for (const br of cb.bookingRooms) {
        bookedRoomIds.add(br.roomId)
      }
    }

    const categoryRooms = await prisma.room.findMany({
      where: {
        propertyId: booking.propertyId,
        category: { name: newCategory },
      },
    })

    const availableRooms = categoryRooms.filter((r) => !bookedRoomIds.has(r.id))

    if (availableRooms.length < newNumRooms) {
      return NextResponse.json(
        {
          error: `Category '${newCategory}' is unavailable for ${format(newCheckIn, 'dd MMM')} → ${format(newCheckOut, 'dd MMM yyyy')}. Only ${availableRooms.length} available, requested ${newNumRooms}.`,
        },
        { status: 409 }
      )
    }

    // If upcoming, reassign available rooms
    if (targetStatus === 'Upcoming') {
      await prisma.bookingRoom.deleteMany({ where: { bookingId: booking.id } })
      await prisma.bookingRoom.createMany({
        data: availableRooms.slice(0, newNumRooms).map((r) => ({
          bookingId: booking.id,
          roomId: r.id,
        })),
      })
    }
  }

  // Recalculate totals
  const nights = calcNights(newCheckIn, newCheckOut)
  const subtotal = newNightlyRate * nights * newNumRooms
  const taxRate = booking.property?.taxRate || 12.0
  const taxAmount = customTax !== undefined ? Number(customTax) : Math.round((subtotal * taxRate) / 100)
  const discountAmount = customDiscount !== undefined ? Number(customDiscount) : booking.discountAmount || 0
  const totalAmount = Math.max(0, subtotal + taxAmount - discountAmount)

  bookingUpdateData.taxAmount = taxAmount
  bookingUpdateData.discountAmount = discountAmount
  bookingUpdateData.totalAmount = totalAmount

  // 3. Status changes (e.g. Cancelled)
  if (status !== undefined && status !== booking.status) {
    bookingUpdateData.status = status

    await prisma.bookingStatusLog.create({
      data: {
        bookingId: booking.id,
        oldStatus: booking.status,
        newStatus: status,
        changedBy: session?.user?.name || session?.user?.email || 'Staff',
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

  // 4. Update database record
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
