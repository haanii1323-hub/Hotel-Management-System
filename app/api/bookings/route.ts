import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTargetPropertyId } from '@/lib/property-helper'
import { format } from 'date-fns'

function generateBookingRef(code?: string): string {
  const prefix = code ? code.slice(0, 4).toUpperCase() : 'APX'
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = ''
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `#${prefix}-${result}`
}

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

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const propertyId = await getTargetPropertyId(req, (session?.user as any)?.propertyId)

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category')
    const source = searchParams.get('source')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const where: any = {
      propertyId,
    }

    // Status filter
    if (status === 'Upcoming') {
      where.status = 'Upcoming'
    } else if (status === 'InHouse') {
      where.status = 'CheckedIn'
    } else if (status === 'Completed') {
      where.status = { in: ['CheckedOut', 'NoShow', 'Cancelled'] }
    } else if (status && status !== 'All') {
      where.status = status
    }

    if (category && category !== 'All') {
      where.roomCategory = category
    }

    if (source && source !== 'All') {
      where.source = source
    }

    if (from && to) {
      const dFrom = parseBookingDate(from)
      const dTo = parseBookingDate(to)
      where.AND = [
        { checkIn: { lte: dTo } },
        { checkOut: { gte: dFrom } },
      ]
    }

    if (search.trim()) {
      const q = search.trim().replace(/^#/, '')
      where.OR = [
        { guest: { name: { contains: q, mode: 'insensitive' } } },
        { guest: { phone: { contains: q } } },
        { guest: { email: { contains: q, mode: 'insensitive' } } },
        { bookingRef: { contains: q, mode: 'insensitive' } },
        { bookingRef: { contains: `#${q}`, mode: 'insensitive' } },
        { bookingRooms: { some: { room: { number: { contains: q, mode: 'insensitive' } } } } },
      ]
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        guest: true,
        bookingRooms: {
          include: {
            room: true,
          },
        },
        payments: true,
        invoices: true,
      },
      orderBy: { checkIn: 'asc' },
    })

    return NextResponse.json(bookings)
  } catch (error: any) {
    console.error('Error fetching bookings:', error)
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const body = await req.json()
    const propertyId = body.propertyId || (await getTargetPropertyId(req, (session?.user as any)?.propertyId))

    const property = await prisma.property.findUnique({ where: { id: propertyId } })
    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 400 })
    }

    const {
      guestName,
      phone,
      email,
      address,
      source = 'Walk inn',
      checkIn,
      checkOut,
      numRooms = 1,
      adults = 1,
      kids = 0,
      roomCategory,
      roomId,
      nightlyRate,
      taxAmount: customTax,
      discountAmount: customDiscount = 0,
      notes,
      paymentAmount = 0,
      paymentMode = 'Cash',
      paymentUtr,
    } = body

    if (!guestName?.trim() || !phone?.trim() || !checkIn || !checkOut || !roomCategory || !nightlyRate) {
      return NextResponse.json({ error: 'Missing required booking fields (Guest, Phone, Dates, Category, Rate)' }, { status: 400 })
    }

    const d1 = parseBookingDate(checkIn)
    const d2 = parseBookingDate(checkOut)

    if (d2 <= d1) {
      return NextResponse.json({ error: 'Check-out date must be after check-in date' }, { status: 400 })
    }

    const nights = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000))
    const subtotal = Number(nightlyRate) * nights * Number(numRooms)
    const taxRate = property.taxRate || 12.0
    const taxAmount = customTax !== undefined ? Number(customTax) : Math.round((subtotal * taxRate) / 100)
    const discountAmount = Number(customDiscount || 0)
    const totalAmount = Math.max(0, subtotal + taxAmount - discountAmount)

    // Check conflicting bookings for these dates in this property
    const conflictingBookings = await prisma.booking.findMany({
      where: {
        propertyId,
        status: { in: ['Upcoming', 'CheckedIn'] },
        AND: [
          { checkIn: { lt: d2 } },
          { checkOut: { gt: d1 } },
        ],
      },
      include: {
        bookingRooms: {
          include: { room: true },
        },
      },
    })

    const bookedRoomIds = new Set<string>()
    for (const cb of conflictingBookings) {
      for (const br of cb.bookingRooms) {
        bookedRoomIds.add(br.roomId)
      }
    }

    // Check specific roomId if provided
    let assignedRoomIds: string[] = []
    if (roomId) {
      if (bookedRoomIds.has(roomId)) {
        const bookedRoom = await prisma.room.findUnique({ where: { id: roomId } })
        return NextResponse.json(
          {
            error: `Room ${bookedRoom?.number || roomId} is unavailable for the selected dates (${format(d1, 'dd MMM')} → ${format(d2, 'dd MMM yyyy')}).`,
          },
          { status: 409 }
        )
      }
      assignedRoomIds = [roomId]
    } else {
      // Find all rooms in this property and category
      const categoryRooms = await prisma.room.findMany({
        where: {
          propertyId,
          category: { name: roomCategory },
        },
        orderBy: { number: 'asc' },
      })

      if (categoryRooms.length === 0) {
        return NextResponse.json({ error: `Category '${roomCategory}' has no configured rooms in this property.` }, { status: 400 })
      }

      const availableRooms = categoryRooms.filter((r) => !bookedRoomIds.has(r.id))

      if (availableRooms.length < Number(numRooms)) {
        return NextResponse.json(
          {
            error: `No available rooms in '${roomCategory}' for ${format(d1, 'dd MMM')} → ${format(d2, 'dd MMM yyyy')}. Total: ${categoryRooms.length}, Booked: ${categoryRooms.length - availableRooms.length}, Available: ${availableRooms.length}, Requested: ${numRooms}.`,
          },
          { status: 409 }
        )
      }

      assignedRoomIds = availableRooms.slice(0, Number(numRooms)).map((r) => r.id)
    }

    // Find or create guest within this property
    let guest = await prisma.guest.findFirst({
      where: {
        propertyId,
        phone: phone.trim(),
      },
    })

    if (guest) {
      guest = await prisma.guest.update({
        where: { id: guest.id },
        data: {
          name: guestName.trim(),
          email: email?.trim() || guest.email,
          address: address?.trim() || guest.address,
        },
      })
    } else {
      guest = await prisma.guest.create({
        data: {
          propertyId,
          name: guestName.trim(),
          phone: phone.trim(),
          email: email?.trim() || null,
          address: address?.trim() || null,
        },
      })
    }

    // Generate unique bookingRef
    let uniqueRef = generateBookingRef(property.code)
    let exists = await prisma.booking.findUnique({ where: { bookingRef: uniqueRef } })
    while (exists) {
      uniqueRef = generateBookingRef(property.code)
      exists = await prisma.booking.findUnique({ where: { bookingRef: uniqueRef } })
    }

    const booking = await prisma.booking.create({
      data: {
        propertyId,
        bookingRef: uniqueRef,
        guestId: guest.id,
        status: 'Upcoming',
        source,
        checkIn: d1,
        checkOut: d2,
        numRooms: Number(numRooms),
        adults: Number(adults),
        kids: Number(kids),
        roomCategory,
        nightlyRate: Number(nightlyRate),
        taxAmount,
        discountAmount,
        totalAmount,
        notes: notes?.trim() || null,
        bookingRooms: {
          create: assignedRoomIds.map((rId) => ({ roomId: rId })),
        },
        statusLogs: {
          create: {
            oldStatus: 'None',
            newStatus: 'Upcoming',
            changedBy: session?.user?.name || session?.user?.email || 'Staff',
          },
        },
        payments:
          Number(paymentAmount) > 0
            ? {
                create: [
                  {
                    amount: Number(paymentAmount),
                    mode: paymentMode,
                    status: 'Paid',
                    utrRef: paymentUtr?.trim() || null,
                    notes: 'Advance payment upon booking',
                    collectedBy: session?.user?.id,
                  },
                ],
              }
            : undefined,
      },
      include: {
        guest: true,
        bookingRooms: {
          include: {
            room: true,
          },
        },
        payments: true,
        invoices: true,
      },
    })

    return NextResponse.json(booking, { status: 201 })
  } catch (error: any) {
    console.error('Error creating booking:', error)
    return NextResponse.json({ error: error.message || 'Failed to create booking' }, { status: 500 })
  }
}
