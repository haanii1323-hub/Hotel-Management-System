import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantContext } from '@/lib/property-helper'
import { eachDayOfInterval, format, startOfMonth, endOfMonth, isValid } from 'date-fns'

function parseDateParam(d: string | null): Date | null {
  if (!d) return null
  const match = d.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) {
    const year = parseInt(match[1], 10)
    const month = parseInt(match[2], 10) - 1
    const day = parseInt(match[3], 10)
    const dt = new Date(year, month, day, 12, 0, 0)
    return isValid(dt) ? dt : null
  }
  const dt = new Date(d)
  return isValid(dt) ? dt : null
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const { tenantId, propertyId } = await getTenantContext(req, session?.user as any)

    if (!propertyId) {
      return NextResponse.json({
        urnUsed: 0,
        srn: 0,
        occupancy: 0,
        roomRevenue: 0,
        arr: 0,
        daily: [],
        sources: [],
      })
    }

    const property = await prisma.property.findFirst({ where: { id: propertyId, tenantId } })
    const { searchParams } = new URL(req.url)

    const fromParam = parseDateParam(searchParams.get('from'))
    const toParam = parseDateParam(searchParams.get('to'))

    const now = new Date()
    let from = fromParam || startOfMonth(now)
    let to = toParam || endOfMonth(now)

    // Bounds safety: Ensure from <= to
    if (from > to) {
      const temp = from
      from = to
      to = temp
    }

    const rooms = await prisma.room.findMany({ where: { propertyId } })
    const totalRooms = rooms.length

    // Days in interval
    let days: Date[] = []
    try {
      days = eachDayOfInterval({ start: from, end: to })
    } catch {
      days = [from]
    }
    const numDays = Math.max(1, days.length)
    const srn = totalRooms * numDays // Supply Room Nights

    // Fetch bookings in interval for this property
    const bookings = await prisma.booking.findMany({
      where: {
        propertyId,
        status: { in: ['CheckedIn', 'CheckedOut', 'Upcoming'] },
        AND: [
          { checkIn: { lte: to } },
          { checkOut: { gte: from } },
        ],
      },
      include: {
        bookingRooms: true,
        payments: true,
      },
    })

    // Calculate URN (Utilized Room Nights) and Revenue
    let urnUsed = 0
    let roomRevenue = 0

    const sourceMap: Record<string, { count: number; revenue: number }> = {}

    // Daily breakdown map
    const dailyMap: Record<string, { date: string; occupiedRooms: number; revenue: number }> = {}
    days.forEach((d) => {
      const k = format(d, 'yyyy-MM-dd')
      dailyMap[k] = { date: k, occupiedRooms: 0, revenue: 0 }
    })

    for (const b of bookings) {
      const bCheckIn = new Date(b.checkIn)
      const bCheckOut = new Date(b.checkOut)
      const bRooms = Math.max(1, b.numRooms || b.bookingRooms.length || 1)
      const bNightly = b.nightlyRate || (b.totalAmount / Math.max(1, Math.round((bCheckOut.getTime() - bCheckIn.getTime()) / 86400000)))

      // Track source
      const src = b.source || 'Direct'
      if (!sourceMap[src]) sourceMap[src] = { count: 0, revenue: 0 }
      sourceMap[src].count += 1
      sourceMap[src].revenue += b.totalAmount

      for (const d of days) {
        if (d >= bCheckIn && d < bCheckOut) {
          urnUsed += bRooms
          roomRevenue += bNightly * bRooms
          const k = format(d, 'yyyy-MM-dd')
          if (dailyMap[k]) {
            dailyMap[k].occupiedRooms += bRooms
            dailyMap[k].revenue += bNightly * bRooms
          }
        }
      }
    }

    const occupancy = srn > 0 ? Math.min(100, Math.round((urnUsed / srn) * 100)) : 0
    const arr = urnUsed > 0 ? Math.round(roomRevenue / urnUsed) : 0

    const daily = Object.values(dailyMap)
    const sources = Object.entries(sourceMap).map(([name, val]) => ({
      name,
      bookings: val.count,
      revenue: val.revenue,
    }))

    return NextResponse.json({
      property: {
        id: property?.id,
        name: property?.name,
        currencySymbol: property?.currencySymbol || '₹',
      },
      from: format(from, 'yyyy-MM-dd'),
      to: format(to, 'yyyy-MM-dd'),
      totalRooms,
      srn,
      urnUsed,
      occupancy,
      roomRevenue,
      arr,
      daily,
      sources,
    })
  } catch (error: any) {
    console.error('Error calculating reports:', error)
    return NextResponse.json({ error: 'Failed to calculate reports' }, { status: 500 })
  }
}
