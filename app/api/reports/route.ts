import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantContext } from '@/lib/property-helper'
import { eachDayOfInterval, format, startOfMonth, endOfMonth, isValid } from 'date-fns'

export const dynamic = 'force-dynamic'

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

const CATEGORY_COLORS = [
  '#355C4A', // Deep Sage
  '#3F8F68', // Success Green
  '#5B82A6', // Info Blue
  '#D49A3A', // Warning Amber
  '#D39B62', // Warm Terracotta
  '#68736D', // Muted Gray
  '#A8C4B5', // Soft Sage
]

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
        categories: [],
        categorySummary: {
          highestRevenueCategory: 'N/A',
          highestRevenueAmount: 0,
          highestRevenuePercent: 0,
          totalRoomRevenue: 0,
          totalRoomNights: 0,
          overallArr: 0,
          totalBookings: 0,
        },
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

    // Fetch rooms and configured categories for this property
    const [rooms, dbCategories] = await Promise.all([
      prisma.room.findMany({ where: { propertyId } }),
      prisma.roomCategory.findMany({
        where: { propertyId },
        include: { rooms: true },
      }),
    ])

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
        bookingRooms: {
          include: {
            room: {
              include: {
                category: true,
              },
            },
          },
        },
        payments: true,
      },
    })

    // Calculate URN (Utilized Room Nights) and Revenue
    let urnUsed = 0
    let roomRevenue = 0

    const sourceMap: Record<string, { count: number; revenue: number }> = {}

    // Initialize Category Map with all configured categories
    const categoryMap: Record<string, {
      name: string
      availableRooms: number
      bookingsCount: number
      roomNights: number
      revenue: number
    }> = {}

    dbCategories.forEach((cat) => {
      const roomCount = cat.rooms?.length || cat.totalRooms || 0
      categoryMap[cat.name] = {
        name: cat.name,
        availableRooms: roomCount,
        bookingsCount: 0,
        roomNights: 0,
        revenue: 0,
      }
    })

    // Daily breakdown map
    const dailyMap: Record<string, { date: string; occupiedRooms: number; revenue: number }> = {}
    days.forEach((d) => {
      const k = format(d, 'yyyy-MM-dd')
      dailyMap[k] = { date: k, occupiedRooms: 0, revenue: 0 }
    })

    const countedCategoryBookings = new Set<string>()

    for (const b of bookings) {
      const bCheckIn = parseDateParam(format(new Date(b.checkIn), 'yyyy-MM-dd')) || new Date(b.checkIn)
      const bCheckOut = parseDateParam(format(new Date(b.checkOut), 'yyyy-MM-dd')) || new Date(b.checkOut)
      const bRooms = Math.max(1, b.numRooms || b.bookingRooms?.length || 1)
      const stayNights = Math.max(1, Math.round((bCheckOut.getTime() - bCheckIn.getTime()) / 86400000))
      const bNightly = b.nightlyRate || (b.totalAmount / stayNights)

      // Identify Category: From assigned room's category or booking.roomCategory field
      const catName =
        b.bookingRooms?.[0]?.room?.category?.name ||
        b.roomCategory ||
        'Standard'

      if (!categoryMap[catName]) {
        categoryMap[catName] = {
          name: catName,
          availableRooms: 0,
          bookingsCount: 0,
          roomNights: 0,
          revenue: 0,
        }
      }

      // Count unique booking for this category
      const bookingKey = `${b.id}-${catName}`
      if (!countedCategoryBookings.has(bookingKey)) {
        categoryMap[catName].bookingsCount += 1
        countedCategoryBookings.add(bookingKey)
      }

      // Track source
      const src = b.source || 'Direct'
      if (!sourceMap[src]) sourceMap[src] = { count: 0, revenue: 0 }
      sourceMap[src].count += 1
      sourceMap[src].revenue += b.totalAmount

      const inTime = bCheckIn.getTime()
      const outTime = bCheckOut.getTime()

      for (const d of days) {
        const currTime = d.getTime()
        const isOccupying = inTime === outTime ? inTime === currTime : (currTime >= inTime && currTime < outTime)

        if (isOccupying) {
          urnUsed += bRooms
          roomRevenue += bNightly * bRooms

          categoryMap[catName].roomNights += bRooms
          categoryMap[catName].revenue += bNightly * bRooms

          const k = format(d, 'yyyy-MM-dd')
          if (dailyMap[k]) {
            dailyMap[k].occupiedRooms += bRooms
            dailyMap[k].revenue += bNightly * bRooms
          }
        }
      }
    }

    // Uncapped Occupancy Formula: (URN ÷ SRN) × 100
    const occupancy = srn > 0 ? Number(((urnUsed / srn) * 100).toFixed(2)) : 0
    const overbookedRoomNights = Math.max(0, urnUsed - srn)
    const arr = urnUsed > 0 ? Math.round(roomRevenue / urnUsed) : 0

    // Format category metrics with occupancy %, ARR, and Revenue %
    const categories = Object.values(categoryMap)
      .map((cat, idx) => {
        const catSrn = cat.availableRooms * numDays
        const catOcc = catSrn > 0 ? Number(((cat.roomNights / catSrn) * 100).toFixed(1)) : 0
        const catArr = cat.roomNights > 0 ? Math.round(cat.revenue / cat.roomNights) : 0
        const catRevPercent = roomRevenue > 0 ? Number(((cat.revenue / roomRevenue) * 100).toFixed(1)) : 0

        return {
          name: cat.name,
          bookings: cat.bookingsCount,
          roomNights: cat.roomNights,
          availableRooms: cat.availableRooms,
          srn: catSrn,
          occupancy: catOcc,
          revenue: Math.round(cat.revenue),
          arr: catArr,
          revenuePercent: catRevPercent,
          color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
        }
      })
      .sort((a, b) => b.revenue - a.revenue) // Sort by highest revenue

    const highestRevenueCategory = categories.length > 0 ? categories[0] : null
    const totalBookingsCount = categories.reduce((sum, c) => sum + c.bookings, 0)

    const categorySummary = {
      highestRevenueCategory: highestRevenueCategory?.name || 'N/A',
      highestRevenueAmount: highestRevenueCategory?.revenue || 0,
      highestRevenuePercent: highestRevenueCategory?.revenuePercent || 0,
      totalRoomRevenue: Math.round(roomRevenue),
      totalRoomNights: urnUsed,
      overallArr: arr,
      totalBookings: totalBookingsCount,
    }

    const daily = Object.values(dailyMap).map((d) => {
      const dailyOcc = totalRooms > 0 ? Number(((d.occupiedRooms / totalRooms) * 100).toFixed(2)) : 0
      const dailyArr = d.occupiedRooms > 0 ? Math.round(d.revenue / d.occupiedRooms) : 0
      const dailyOverbooked = Math.max(0, d.occupiedRooms - totalRooms)
      return {
        date: d.date,
        occupiedRooms: d.occupiedRooms,
        urn: d.occupiedRooms,
        srn: totalRooms,
        occupancy: dailyOcc,
        overbookedRooms: dailyOverbooked,
        revenue: Math.round(d.revenue),
        arr: dailyArr,
      }
    })

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
      overbookedRoomNights,
      roomRevenue,
      arr,
      daily,
      dailyBreakdown: daily.map((d) => {
        const dt = parseDateParam(d.date) || new Date(d.date)
        return {
          ...d,
          displayDate: format(dt, 'dd MMM'),
          dayName: format(dt, 'EEE'),
        }
      }),
      sources,
      categories,
      categorySummary,
    })
  } catch (error: any) {
    console.error('Error calculating reports:', error)
    return NextResponse.json({ error: 'Failed to calculate reports' }, { status: 500 })
  }
}
