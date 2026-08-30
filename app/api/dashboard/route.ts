import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTargetPropertyId } from '@/lib/property-helper'
import { format } from 'date-fns'

function parseBookingDate(d: string | Date | null | undefined): Date | null {
  if (!d) return null
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

function getDateString(d: string | Date | null | undefined): string {
  const parsed = parseBookingDate(d)
  if (!parsed) return ''
  return format(parsed, 'yyyy-MM-dd')
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const propertyId = await getTargetPropertyId(req, (session?.user as any)?.propertyId)

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    })

    const now = new Date()
    const todayStr = format(now, 'yyyy-MM-dd')

    // 1. Rooms breakdown
    const rooms = await prisma.room.findMany({ where: { propertyId } })
    const totalRooms = rooms.length
    const availableRooms = rooms.filter((r) => r.status === 'Available').length
    const occupiedRooms = rooms.filter((r) => r.status === 'Occupied').length
    const cleaningRooms = rooms.filter((r) => r.status === 'Cleaning').length
    const maintenanceRooms = rooms.filter((r) => r.status === 'Maintenance').length
    const outOfServiceRooms = rooms.filter((r) => r.status === 'Out of Service').length

    // 2. Bookings
    const allBookings = await prisma.booking.findMany({
      where: { propertyId },
      include: {
        guest: true,
        payments: true,
        bookingRooms: {
          include: {
            room: true,
          },
        },
      },
      orderBy: { checkIn: 'asc' },
    })

    const upcomingBookings = allBookings.filter((b) => b.status === 'Upcoming')
    const inHouseBookings = allBookings.filter((b) => b.status === 'CheckedIn')
    const completedBookings = allBookings.filter((b) => ['CheckedOut', 'NoShow', 'Cancelled'].includes(b.status))

    const arrivingToday = upcomingBookings.filter((b) => getDateString(b.checkIn) <= todayStr)
    const departingToday = inHouseBookings.filter((b) => getDateString(b.checkOut) <= todayStr)

    // 3. Revenue calculations
    const allPayments = await prisma.payment.findMany({
      where: {
        booking: { propertyId },
        status: { not: 'Pending' },
      },
    })
    const totalRevenue = allPayments.reduce((s, p) => s + p.amount, 0)

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    const todayPayments = await prisma.payment.findMany({
      where: {
        booking: { propertyId },
        status: { not: 'Pending' },
        createdAt: { gte: todayStart, lte: todayEnd },
      },
    })
    const collectedToday = todayPayments.reduce((s, p) => s + p.amount, 0)

    const occupancy = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0

    return NextResponse.json({
      property: {
        id: property?.id,
        name: property?.name,
        code: property?.code,
        city: property?.city,
        currencySymbol: property?.currencySymbol || '₹',
        taxRate: property?.taxRate || 12.0,
      },
      kpis: {
        totalRooms,
        availableRooms,
        occupiedRooms,
        cleaningRooms,
        maintenanceRooms,
        outOfServiceRooms,
        arrivingTodayCount: arrivingToday.length,
        inHouseCount: inHouseBookings.length,
        departingTodayCount: departingToday.length,
        totalBookings: allBookings.length,
        occupancy,
        totalRevenue,
        collectedToday,
      },
      arrivingToday,
      departingToday,
      inHouseBookings,
      upcomingBookings,
      recentBookings: allBookings.slice(0, 10),
    })
  } catch (error: any) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard' }, { status: 500 })
  }
}
