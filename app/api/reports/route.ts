import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTargetPropertyId } from '@/lib/property-helper'
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
    const propertyId = await getTargetPropertyId(req, (session?.user as any)?.propertyId)

    const property = await prisma.property.findUnique({ where: { id: propertyId } })
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
        status: { notIn: ['Cancelled', 'NoShow'] },
        AND: [{ checkIn: { lte: to } }, { checkOut: { gte: from } }],
      },
      include: {
        payments: true,
      },
    })

    // Calculate URN (Used Room Nights) and Revenue
    let urnUsed = 0
    let roomRevenue = 0

    const dailyBreakdown = days.map((day) => {
      const dayStr = format(day, 'yyyy-MM-dd')
      const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0)
      const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59)

      const activeOnDay = bookings.filter((b) => {
        const ci = new Date(b.checkIn)
        const co = new Date(b.checkOut)
        return ci <= dayEnd && co > dayStart
      })

      const dayRooms = activeOnDay.reduce((s, b) => s + (b.numRooms || 1), 0)
      const dayRev = activeOnDay.reduce((s, b) => s + (b.nightlyRate || 0) * (b.numRooms || 1), 0)
      const dayOcc = totalRooms > 0 ? Math.min(100, Math.round((dayRooms / totalRooms) * 100)) : 0
      const dayArr = dayRooms > 0 ? Math.round(dayRev / dayRooms) : 0

      urnUsed += dayRooms
      roomRevenue += dayRev

      return {
        date: dayStr,
        dayName: format(day, 'EEE'),
        displayDate: format(day, 'dd MMM'),
        urn: dayRooms,
        srn: totalRooms,
        occupancy: dayOcc,
        revenue: dayRev,
        arr: dayArr,
      }
    })

    const occupancy = srn > 0 ? Math.min(100, parseFloat(((urnUsed / srn) * 100).toFixed(1))) : 0
    const arr = urnUsed > 0 ? Math.round(roomRevenue / urnUsed) : 0

    return NextResponse.json({
      property: {
        name: property?.name,
        code: property?.code,
        currencySymbol: property?.currencySymbol || '₹',
      },
      roomRevenue,
      urnUsed,
      srn,
      occupancy,
      arr,
      totalRooms,
      dailyBreakdown,
    })
  } catch (error: any) {
    console.error('Error calculating reports:', error)
    return NextResponse.json({ error: 'Failed to generate reports' }, { status: 500 })
  }
}
