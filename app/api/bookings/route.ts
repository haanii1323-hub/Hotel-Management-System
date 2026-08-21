import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, generateBookingRef, calcNights } from '@/lib/utils'

export async function GET(req: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const search = searchParams.get('search')
  const roomCategory = searchParams.get('category')
  const source = searchParams.get('source')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const where: Record<string, unknown> = {}
  if (status) {
    if (status === 'Upcoming') where.status = 'Upcoming'
    else if (status === 'InHouse') where.status = 'CheckedIn'
    else if (status === 'Completed') where.status = { in: ['CheckedOut', 'NoShow', 'Cancelled'] }
    else where.status = status
  }

  if (roomCategory && roomCategory !== 'All') {
    where.roomCategory = roomCategory
  }

  if (source && source !== 'All') {
    where.source = source
  }

  if (from || to) {
    where.checkIn = {}
    if (from) (where.checkIn as any).gte = new Date(`${from}T00:00:00.000Z`)
    if (to) (where.checkIn as any).lte = new Date(`${to}T23:59:59.999Z`)
  }

  if (search) {
    const s = search.trim()
    const withHash = s.startsWith('#') ? s : `#${s}`
    const withoutHash = s.startsWith('#') ? s.slice(1) : s
    where.OR = [
      { guest: { name: { contains: s } } },
      { bookingRef: { contains: s } },
      { bookingRef: { contains: withHash } },
      { bookingRef: { contains: withoutHash } },
      { guest: { phone: { contains: s } } },
      { roomCategory: { contains: s } },
      { source: { contains: s } },
      { bookingRooms: { some: { room: { number: { contains: s } } } } },
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

  // Parse dates safely (avoiding timezone offset issues)
  let checkInDate: Date
  let checkOutDate: Date
  if (typeof checkIn === 'string' && checkIn.includes('T')) {
    checkInDate = new Date(checkIn)
  } else {
    checkInDate = new Date(`${checkIn}T12:00:00.000Z`)
  }

  if (typeof checkOut === 'string' && checkOut.includes('T')) {
    checkOutDate = new Date(checkOut)
  } else {
    checkOutDate = new Date(`${checkOut}T12:00:00.000Z`)
  }

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

  // Assign rooms from available, or fallback to category rooms
  const roomsToAssign = availableRooms.length >= numRooms
    ? availableRooms.slice(0, numRooms)
    : [...availableRooms, ...categoryRooms.filter(r => occupiedRoomIds.has(r.id))].slice(0, numRooms)

  // Find or create guest
  let guest = await prisma.guest.findFirst({ where: { phone: phone.trim() } })
  if (!guest) {
    guest = await prisma.guest.create({
      data: { name: guestName.trim(), phone: phone.trim(), email: email?.trim() || null },
    })
  } else if (guestName && guest.name !== guestName.trim()) {
    // Update guest name if changed
    guest = await prisma.guest.update({
      where: { id: guest.id },
      data: { name: guestName.trim(), email: email?.trim() || guest.email },
    })
  }

  const nights = calcNights(checkInDate, checkOutDate)
  const total = Number(nightlyRate) * nights * Number(numRooms)

  const booking = await prisma.booking.create({
    data: {
      bookingRef: generateBookingRef(),
      guestId: guest.id,
      status: 'Upcoming',
      source: source || 'Walk inn',
      checkIn: checkInDate,
      checkOut: checkOutDate,
      numRooms: Number(numRooms),
      adults: Number(adults),
      kids: Number(kids) || 0,
      nightlyRate: Number(nightlyRate),
      totalAmount: total,
      notes: notes || null,
      roomCategory,
    },
  })

  // Assign rooms
  if (roomsToAssign.length > 0) {
    await prisma.bookingRoom.createMany({
      data: roomsToAssign.map(r => ({ bookingId: booking.id, roomId: r.id })),
    })
  }

  const completeBooking = await prisma.booking.findUnique({
    where: { id: booking.id },
    include: { guest: true, payments: true, bookingRooms: { include: { room: true } } },
  })

  return NextResponse.json(completeBooking, { status: 201 })
}
