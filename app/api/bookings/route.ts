import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantContext } from '@/lib/property-helper'
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
    const { propertyId } = await getTenantContext(req, session?.user as any)

    if (!propertyId) {
      return NextResponse.json([])
    }

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
    const { tenantId, propertyId: defaultPropId } = await getTenantContext(req, session?.user as any)
    const body = await req.json()
    const propertyId = body.propertyId || defaultPropId

    if (!propertyId) {
      return NextResponse.json({ error: 'No active property found' }, { status: 400 })
    }

    const property = await prisma.property.findFirst({ where: { id: propertyId, tenantId } })
    if (!property) {
      return NextResponse.json({ error: 'Property not found or unauthorized' }, { status: 400 })
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
      roomIds,
      selectedRoomIds,
      nightlyRate,
      roomSelections, // Optional Array<{ categoryName: string, count: number, rate: number }>
      earlyCheckIn = 0,
      lateCheckOut = 0,
      extraMattressCount = 0,
      extraMattressRate = 500,
      taxAmount: customTax = 0, // GST removed / 0
      discountAmount: customDiscount = 0,
      notes,
      paymentAmount = 0,
      paymentMode = 'Cash',
      paymentUtr,
    } = body

    if (!guestName?.trim() || !phone?.trim() || !checkIn || !checkOut) {
      return NextResponse.json({ error: 'Missing required booking fields (Guest, Phone, Dates)' }, { status: 400 })
    }

    const d1 = parseBookingDate(checkIn)
    const d2 = parseBookingDate(checkOut)

    if (d2 < d1) {
      return NextResponse.json({ error: 'Check-out date cannot be earlier than check-in date' }, { status: 400 })
    }

    const nights = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000))

    // Check conflicting bookings for these dates in this property
    const conflictEnd = d1.getTime() === d2.getTime() ? new Date(d2.getTime() + 86400000) : d2
    const conflictingBookings = await prisma.booking.findMany({
      where: {
        propertyId,
        status: { in: ['Upcoming', 'CheckedIn'] },
        AND: [
          { checkIn: { lt: conflictEnd } },
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

    // Determine manual explicit room selection vs category auto-assignment
    const explicitRoomIds: string[] = Array.isArray(roomIds) && roomIds.length > 0
      ? roomIds
      : Array.isArray(selectedRoomIds) && selectedRoomIds.length > 0
      ? selectedRoomIds
      : roomId
      ? [roomId]
      : []

    let assignedRoomIds: string[] = []
    let calculatedSubtotal = 0
    let totalRoomsCount = Number(numRooms || 1)
    let categoryDisplay = roomCategory || 'Classic'
    let effectiveNightlyRate = Number(nightlyRate || 0)

    if (explicitRoomIds.length > 0) {
      // Validate all manually selected rooms
      const selectedRooms = await prisma.room.findMany({
        where: {
          id: { in: explicitRoomIds },
          propertyId,
        },
        include: {
          category: true,
        },
      })

      if (selectedRooms.length !== explicitRoomIds.length) {
        return NextResponse.json({ error: 'One or more selected rooms were not found in this property.' }, { status: 400 })
      }

      // Check conflict for each selected room
      for (const r of selectedRooms) {
        if (bookedRoomIds.has(r.id)) {
          return NextResponse.json(
            {
              error: `Room ${r.number} is unavailable for the selected dates (${format(d1, 'dd MMM')} → ${format(d2, 'dd MMM yyyy')}). Please choose another room.`,
            },
            { status: 409 }
          )
        }
      }

      assignedRoomIds = explicitRoomIds
      totalRoomsCount = explicitRoomIds.length

      // Calculate rates & category labels
      const categoryCounts: Record<string, number> = {}
      let totalRoomRatePerNight = 0
      for (const r of selectedRooms) {
        const catName = r.category?.name || 'Standard'
        categoryCounts[catName] = (categoryCounts[catName] || 0) + 1
        const rRate = effectiveNightlyRate > 0 ? effectiveNightlyRate : Number(r.category?.nightlyRate || 2500)
        totalRoomRatePerNight += rRate
      }

      categoryDisplay =
        roomCategory ||
        Object.entries(categoryCounts)
          .map(([cName, count]) => (count > 1 ? `${count}× ${cName}` : cName))
          .join(', ')

      effectiveNightlyRate = totalRoomsCount > 0 ? Math.round(totalRoomRatePerNight / totalRoomsCount) : totalRoomRatePerNight
      calculatedSubtotal = totalRoomRatePerNight * nights
    } else if (Array.isArray(roomSelections) && roomSelections.length > 0) {
      totalRoomsCount = roomSelections.reduce((sum: number, item: any) => sum + Number(item.count || 1), 0)
      const perNightRoomTotal = roomSelections.reduce(
        (sum: number, item: any) => sum + Number(item.rate || 0) * Number(item.count || 1),
        0
      )
      calculatedSubtotal = perNightRoomTotal * nights
      categoryDisplay = roomSelections
        .map((item: any) => `${item.count}× ${item.categoryName}`)
        .join(', ')
      effectiveNightlyRate = totalRoomsCount > 0 ? Math.round(perNightRoomTotal / totalRoomsCount) : perNightRoomTotal

      for (const sel of roomSelections) {
        const catName = sel.categoryName
        const reqCount = Number(sel.count || 1)
        const catRooms = await prisma.room.findMany({
          where: {
            propertyId,
            category: { name: catName },
          },
          orderBy: { number: 'asc' },
        })

        const available = catRooms.filter((r) => !bookedRoomIds.has(r.id) && !assignedRoomIds.includes(r.id))
        if (available.length < reqCount) {
          return NextResponse.json(
            {
              error: `Not enough available rooms in category '${catName}' (${available.length} available, requested ${reqCount}).`,
            },
            { status: 409 }
          )
        }
        for (let i = 0; i < reqCount; i++) {
          assignedRoomIds.push(available[i].id)
        }
      }
    } else {
      // Single category allocation
      const categoryRooms = await prisma.room.findMany({
        where: {
          propertyId,
          category: { name: categoryDisplay },
        },
        include: { category: true },
        orderBy: { number: 'asc' },
      })

      if (categoryRooms.length === 0) {
        return NextResponse.json({ error: `Category '${categoryDisplay}' has no configured rooms in this property.` }, { status: 400 })
      }

      const availableRooms = categoryRooms.filter((r) => !bookedRoomIds.has(r.id))

      if (availableRooms.length < totalRoomsCount) {
        return NextResponse.json(
          {
            error: `No available rooms in '${categoryDisplay}' for ${format(d1, 'dd MMM')} → ${format(d2, 'dd MMM yyyy')}. Available: ${availableRooms.length}, Requested: ${totalRoomsCount}.`,
          },
          { status: 409 }
        )
      }

      assignedRoomIds = availableRooms.slice(0, totalRoomsCount).map((r) => r.id)
      calculatedSubtotal = Number(effectiveNightlyRate || categoryRooms[0]?.category?.nightlyRate || 0) * nights * totalRoomsCount
    }

    // Add-ons calculation (Early check-in, late checkout, extra mattress)
    const extraEarlyCheckIn = Number(earlyCheckIn || 0)
    const extraLateCheckOut = Number(lateCheckOut || 0)
    const extraMattressTotal = Number(extraMattressCount || 0) * Number(extraMattressRate || 0) * nights
    const totalAddons = extraEarlyCheckIn + extraLateCheckOut + extraMattressTotal

    const taxAmount = Number(customTax || 0) // GST removed
    const discountAmount = Number(customDiscount || 0)
    const totalAmount = Math.max(0, calculatedSubtotal + totalAddons + taxAmount - discountAmount)

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
        numRooms: totalRoomsCount,
        adults: Number(adults),
        kids: Number(kids),
        roomCategory: categoryDisplay,
        nightlyRate: effectiveNightlyRate,
        taxAmount,
        discountAmount,
        totalAmount,
        notes: [
          notes?.trim(),
          extraEarlyCheckIn > 0 ? `Early Check-in: ₹${extraEarlyCheckIn}` : '',
          extraLateCheckOut > 0 ? `Late Checkout: ₹${extraLateCheckOut}` : '',
          extraMattressCount > 0 ? `Extra Mattress (${extraMattressCount}× ₹${extraMattressRate}): ₹${extraMattressTotal}` : '',
          Array.isArray(roomSelections) && roomSelections.length > 1
            ? `Room Breakdown: ${roomSelections.map((s: any) => `${s.count}× ${s.categoryName} @ ₹${s.rate}/N`).join(', ')}`
            : '',
        ]
          .filter(Boolean)
          .join(' | ') || null,
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
