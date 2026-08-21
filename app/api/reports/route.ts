import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/utils'
import { format, eachDayOfInterval, parseISO, startOfDay, endOfDay } from 'date-fns'

export async function GET(req: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const fromStr = searchParams.get('from')
  const toStr = searchParams.get('to')

  const now = new Date()
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1)
  const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  const from = fromStr ? parseISO(fromStr) : defaultFrom
  const to = toStr ? parseISO(toStr) : defaultTo

  const fromStart = startOfDay(from)
  const toEnd = endOfDay(to)

  // Get all rooms and categories
  const allCategories = await prisma.roomCategory.findMany({
    include: { rooms: true },
    orderBy: { name: 'asc' },
  })
  const allRooms = await prisma.room.findMany({ include: { category: true } })
  const sellableRooms = allRooms.filter(r => !['Maintenance', 'Out of Service'].includes(r.status))

  const days = eachDayOfInterval({ start: fromStart, end: toEnd })
  const numDays = days.length

  // SRN = sellable rooms × number of days in selected period
  const totalSRN = sellableRooms.length * numDays

  // Get all valid bookings overlapping the range
  const bookings = await prisma.booking.findMany({
    where: {
      status: { in: ['CheckedIn', 'CheckedOut'] },
      AND: [
        { checkIn: { lt: toEnd } },
        { checkOut: { gt: fromStart } },
      ],
    },
    include: { payments: true },
  })

  // Category map for performance breakdown
  const categoryStats: Record<string, {
    name: string
    sellableRoomsCount: number
    srn: number
    urnUsed: number
    revenue: number
  }> = {}

  for (const cat of allCategories) {
    const catSellable = cat.rooms.filter(r => !['Maintenance', 'Out of Service'].includes(r.status)).length
    categoryStats[cat.name] = {
      name: cat.name,
      sellableRoomsCount: catSellable,
      srn: catSellable * numDays,
      urnUsed: 0,
      revenue: 0,
    }
  }

  // Daily performance breakdown
  let totalURNUsed = 0
  let totalRoomRevenue = 0

  const dailyReport = days.map(day => {
    const dayStart = startOfDay(day)
    const dayEnd = endOfDay(day)
    const dateFormatted = format(day, 'MMM d')
    const dateFull = format(day, 'yyyy-MM-dd')

    // Find bookings active on this specific night
    // A booking is active on night of `day` if checkIn <= dayStart and checkOut > dayStart
    let dayURN = 0
    let dayRevenue = 0

    for (const b of bookings) {
      const bCheckIn = new Date(b.checkIn)
      const bCheckOut = new Date(b.checkOut)

      if (bCheckIn <= dayStart && bCheckOut > dayStart) {
        const roomsSold = b.numRooms || 1
        const bookingDayRev = (b.nightlyRate || 0) * roomsSold

        dayURN += roomsSold
        dayRevenue += bookingDayRev

        // Add to category
        if (categoryStats[b.roomCategory]) {
          categoryStats[b.roomCategory].urnUsed += roomsSold
          categoryStats[b.roomCategory].revenue += bookingDayRev
        }
      }
    }

    totalURNUsed += dayURN
    totalRoomRevenue += dayRevenue

    const daySRN = sellableRooms.length
    const dayOccupancy = daySRN > 0 ? Math.min(100, Math.round((dayURN / daySRN) * 1000) / 10) : 0
    const dayARR = dayURN > 0 ? Math.round(dayRevenue / dayURN) : 0

    return {
      date: dateFormatted,
      dateFull,
      urn: dayURN,
      srn: daySRN,
      occupancy: dayOccupancy,
      revenue: Math.round(dayRevenue),
      arr: dayARR,
    }
  })

  // Global calculations
  const occupancy = totalSRN > 0 ? Math.min(100, Math.round((totalURNUsed / totalSRN) * 1000) / 10) : 0
  const arr = totalURNUsed > 0 ? Math.round(totalRoomRevenue / totalURNUsed) : 0

  // Category performance list
  const categoryPerformance = Object.values(categoryStats).map(cat => {
    const catOccupancy = cat.srn > 0 ? Math.min(100, Math.round((cat.urnUsed / cat.srn) * 1000) / 10) : 0
    const catARR = cat.urnUsed > 0 ? Math.round(cat.revenue / cat.urnUsed) : 0

    return {
      name: cat.name,
      sellableRooms: cat.sellableRoomsCount,
      urnUsed: cat.urnUsed,
      srn: cat.srn,
      occupancy: catOccupancy,
      revenue: Math.round(cat.revenue),
      arr: catARR,
    }
  })

  // Format dailyRevenue for chart compatibility
  const dailyRevenue = dailyReport.map(d => ({
    date: d.date,
    revenue: d.revenue,
    urn: d.urn,
    occupancy: d.occupancy,
    arr: d.arr,
  }))

  return NextResponse.json({
    roomRevenue: Math.round(totalRoomRevenue),
    urnUsed: totalURNUsed,
    srn: totalSRN,
    occupancy,
    arr,
    sellableRooms: sellableRooms.length,
    numDays,
    dailyRevenue,
    dailyReport,
    categoryPerformance,
    // Keep categoryArr for backwards compatibility if needed
    categoryArr: categoryPerformance,
  })
}
