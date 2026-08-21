import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, generateBookingRef, calcNights } from '@/lib/utils'

export async function GET(req: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const search = searchParams.get('search')

  const where: Record<string, unknown> = {}
  if (status) {
    if (status === 'Upcoming') where.status = 'Upcoming'
    else if (status === 'InHouse') where.status = 'CheckedIn'
    else if (status === 'Completed') where.status = { in: ['CheckedOut', 'NoShow', 'Cancelled'] }
  }

  if (search) {
    where.OR = [
      { guest: { name: { contains: search } } },
      { bookingRef: { contains: search } },
      { guest: { phone: { contains: search } } },
    ]
  }

  const bookings = await prisma.booking.findMany({
    where,
    include: { guest: true, payments: true, bookingRooms: { include: { room: true } } },
    orderBy: { checkIn: 'asc' },
  })

  return NextResponse.json(bookings)
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth()
  if (error) return error

  const body = await req.json()
  const {
    guestName, phone, email, source,
    checkIn, checkOut, roomCategory, nightlyRate,
    numRooms, adults, kids, notes,
  } = body

  // Validate
  if (!guestName?.trim()) return NextResponse.json({ error: 'Guest name is required' }, { status: 400 })
  if (!phone?.trim()) return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
  if (!checkIn) return NextResponse.json({ error: 'Check-in date is required' }, { status: 400 })
  if (!checkOut) return NextResponse.json({ error: 'Check-out date is required' }, { status: 400 })

  const checkInDate = new Date(checkIn)
  const checkOutDate = new Date(checkOut)
  if (checkOutDate <= checkInDate) return NextResponse.json({ error: 'Check-out must be after check-in' }, { status: 400 })
  if (numRooms < 1) return NextResponse.json({ error: 'At least 1 room required' }, { status: 400 })
  if (adults < 1) return NextResponse.json({ error: 'At least 1 adult required' }, { status: 400 })

  // Check room availability
  const category = await prisma.roomCategory.findFirst({ where: { name: roomCategory } })
  if (!category) return NextResponse.json({ error: 'Invalid room category' }, { status: 400 })

  // Find rooms of the category
  const categoryRooms = await prisma.room.findMany({
    where: { categoryId: category.id, status: { not: { in: ['Maintenance', 'Out of Service'] } } },
  })

  // Check which rooms are already booked for the date range
  const conflictingBookings = await prisma.bookingRoom.findMany({
    where: {
      room: { categoryId: category.id },
      booking: {
        status: { in: ['Upcoming', 'CheckedIn'] },
        AND: [
          { checkIn: { lt: checkOutDate } },
          { checkOut: { gt: checkInDate } },
        ],
      },
    },
    include: { room: true },
  })

  const occupiedRoomIds = new Set(conflictingBookings.map(br => br.roomId))
  const availableRooms = categoryRooms.filter(r => !occupiedRoomIds.has(r.id))

  if (availableRooms.length < numRooms) {
    return NextResponse.json({ 
      error: `Only ${availableRooms.length} ${roomCategory} room(s) available for the selected dates` 
    }, { status: 400 })
  }

  // Find or create guest
  let guest = await prisma.guest.findFirst({ where: { phone: phone.trim() } })
  if (!guest) {
    guest = await prisma.guest.create({
      data: { name: guestName.trim(), phone: phone.trim(), email: email?.trim() || null },
    })
  }

  const nights = calcNights(checkInDate, checkOutDate)
  const total = nightlyRate * nights * numRooms

  const booking = await prisma.booking.create({
    data: {
      bookingRef: generateBookingRef(),
      guestId: guest.id,
      status: 'Upcoming',
      source,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      numRooms,
      adults,
      kids: kids || 0,
      nightlyRate,
      totalAmount: total,
      notes: notes || null,
      roomCategory,
    },
  })

  // Assign rooms
  const assignedRooms = availableRooms.slice(0, numRooms)
  await prisma.bookingRoom.createMany({
    data: assignedRooms.map(r => ({ bookingId: booking.id, roomId: r.id })),
  })

  return NextResponse.json(booking, { status: 201 })
}
