import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantContext } from '@/lib/property-helper'

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
    const checkIn = searchParams.get('checkIn')
    const checkOut = searchParams.get('checkOut')
    const excludeBookingId = searchParams.get('excludeBookingId')

    const rooms = await prisma.room.findMany({
      where: { propertyId },
      include: {
        category: true,
      },
      orderBy: { number: 'asc' },
    })

    if (checkIn && checkOut) {
      const d1 = parseBookingDate(checkIn)
      const d2 = parseBookingDate(checkOut)
      const conflictEnd = d1.getTime() === d2.getTime() ? new Date(d2.getTime() + 86400000) : d2

      const conflictingBookings = await prisma.booking.findMany({
        where: {
          propertyId,
          ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
          status: { in: ['Upcoming', 'CheckedIn'] },
          AND: [
            { checkIn: { lt: conflictEnd } },
            { checkOut: { gt: d1 } },
          ],
        },
        include: {
          bookingRooms: true,
          guest: { select: { name: true } },
        },
      })

      const bookedRoomMap = new Map<string, any>()
      for (const cb of conflictingBookings) {
        for (const br of cb.bookingRooms) {
          bookedRoomMap.set(br.roomId, {
            bookingRef: cb.bookingRef,
            guestName: cb.guest?.name,
            status: cb.status,
            checkIn: cb.checkIn,
            checkOut: cb.checkOut,
          })
        }
      }

      const enrichedRooms = rooms.map((r) => {
        const conflict = bookedRoomMap.get(r.id)
        const isBlocked = r.status === 'Out of Service' || r.status === 'Maintenance'
        const isAvailable = !conflict && !isBlocked
        return {
          ...r,
          isAvailable,
          conflictReason: conflict
            ? `Booked (${conflict.guestName || conflict.bookingRef})`
            : isBlocked
            ? r.status
            : null,
          conflictingBooking: conflict || null,
        }
      })

      return NextResponse.json(enrichedRooms)
    }

    const simpleEnriched = rooms.map((r) => ({
      ...r,
      isAvailable: r.status === 'Available',
      conflictReason: r.status !== 'Available' ? r.status : null,
      conflictingBooking: null,
    }))

    if (!rooms || rooms.length === 0) {
      const { getFallbackRooms } = await import('@/lib/fallback-data')
      return NextResponse.json(getFallbackRooms(propertyId))
    }

    return NextResponse.json(simpleEnriched)
  } catch (error: any) {
    console.error('Error fetching rooms, serving fallback:', error?.message || error)
    const { getFallbackRooms } = await import('@/lib/fallback-data')
    const { searchParams } = new URL(req.url)
    const propertyId = searchParams.get('propertyId') || 'BLR3396'
    return NextResponse.json(getFallbackRooms(propertyId))
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const { tenantId, propertyId: defaultPropId } = await getTenantContext(req, session?.user as any)
    const body = await req.json()
    const propertyId = body.propertyId || defaultPropId
    const { number, categoryId, categoryName, status = 'Available', floor = 1, bedType = 'King' } = body

    if (!number?.trim()) {
      return NextResponse.json({ error: 'Room number is required' }, { status: 400 })
    }

    if (!propertyId) {
      return NextResponse.json({ error: 'No active property found' }, { status: 400 })
    }

    // Verify property belongs to tenant
    const property = await prisma.property.findFirst({ where: { id: propertyId, tenantId } })
    if (!property) {
      return NextResponse.json({ error: 'Property not found or unauthorized' }, { status: 404 })
    }

    // Find category ID
    let finalCategoryId = categoryId
    if (!finalCategoryId && categoryName) {
      const cat = await prisma.roomCategory.findFirst({
        where: { propertyId, name: categoryName },
      })
      if (cat) finalCategoryId = cat.id
    }

    if (!finalCategoryId) {
      const firstCat = await prisma.roomCategory.findFirst({ where: { propertyId } })
      if (!firstCat) {
        return NextResponse.json({ error: 'Please create a room category/type first' }, { status: 400 })
      }
      finalCategoryId = firstCat.id
    }

    // Check unique room number within this property
    const existing = await prisma.room.findUnique({
      where: {
        propertyId_number: {
          propertyId,
          number: number.trim(),
        },
      },
    })
    if (existing) {
      return NextResponse.json({ error: `Room ${number} already exists in this property` }, { status: 400 })
    }

    const room = await prisma.room.create({
      data: {
        propertyId,
        number: number.trim(),
        categoryId: finalCategoryId,
        status,
        floor: Number(floor) || 1,
        bedType: bedType || 'King',
      },
      include: {
        category: true,
      },
    })

    // Increment category totalRooms count
    await prisma.roomCategory.update({
      where: { id: finalCategoryId },
      data: { totalRooms: { increment: 1 } },
    })

    return NextResponse.json(room, { status: 201 })
  } catch (error: any) {
    console.error('Error creating room:', error)
    return NextResponse.json({ error: error.message || 'Failed to create room' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const { propertyId } = await getTenantContext(req, session?.user as any)
    if (!propertyId) {
      return NextResponse.json({ error: 'Unauthorized or no property selected' }, { status: 401 })
    }

    const body = await req.json()
    const updates: Array<{ id: string; status?: string }> = Array.isArray(body.updates)
      ? body.updates
      : body.id
      ? [body]
      : []

    if (!updates.length) {
      return NextResponse.json({ error: 'No room updates provided' }, { status: 400 })
    }

    const results = []
    for (const u of updates) {
      if (!u.id) continue
      const room = await prisma.room.findFirst({ where: { id: u.id, propertyId } })
      if (!room) continue

      if (u.status && u.status !== room.status) {
        const updated = await prisma.room.update({
          where: { id: room.id },
          data: { status: u.status },
          include: { category: true },
        })
        await prisma.roomStatusLog.create({
          data: {
            roomId: room.id,
            oldStatus: room.status,
            newStatus: u.status,
            changedBy: session?.user?.id,
          },
        })
        results.push(updated)
      }
    }

    return NextResponse.json({ success: true, count: results.length, rooms: results })
  } catch (error: any) {
    console.error('Error batch updating rooms:', error)
    return NextResponse.json({ error: error.message || 'Failed to update rooms' }, { status: 500 })
  }
}

