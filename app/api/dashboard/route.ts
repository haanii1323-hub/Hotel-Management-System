import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantContext } from '@/lib/property-helper'
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
    const { tenantId, propertyId } = await getTenantContext(req, session?.user as any)

    const now = new Date()
    const todayStr = format(now, 'yyyy-MM-dd')

    if (!propertyId || propertyId.startsWith('prop-demo-') || propertyId.startsWith('BLR') || tenantId === 'demo-tenant') {
      const { getFallbackDashboard } = await import('@/lib/fallback-data')
      return NextResponse.json(getFallbackDashboard(propertyId || 'BLR3396'))
    }

    const property = await prisma.property.findFirst({
      where: { id: propertyId, tenantId },
    })

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

    // Gather all room IDs actively assigned to checked-in guests
    const inHouseRoomIds = new Set<string>()
    for (const b of inHouseBookings) {
      for (const br of b.bookingRooms) {
        if (br.roomId) inHouseRoomIds.add(br.roomId)
      }
    }

    // Active bookings occupying today: status Upcoming or CheckedIn
    // Date condition: checkIn <= today < checkOut (or same-day checkIn === today)
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0)
    
    let bookedRoomsToday = 0
    for (const b of allBookings) {
      if (b.status === 'Upcoming' || b.status === 'CheckedIn') {
        const bIn = parseBookingDate(b.checkIn)
        const bOut = parseBookingDate(b.checkOut)
        if (bIn && bOut) {
          const inTime = new Date(bIn.getFullYear(), bIn.getMonth(), bIn.getDate(), 12, 0, 0).getTime()
          const outTime = new Date(bOut.getFullYear(), bOut.getMonth(), bOut.getDate(), 12, 0, 0).getTime()
          const currTime = todayDate.getTime()

          const isOccupying = inTime === outTime ? inTime === currTime : (currTime >= inTime && currTime < outTime)
          if (isOccupying) {
            const rCount = Math.max(1, b.numRooms || b.bookingRooms?.length || 1)
            bookedRoomsToday += rCount
          }
        }
      }
    }

    // 1. Rooms breakdown
    let rooms: any[] = []
    try {
      rooms = await prisma.room.findMany({ where: { propertyId } })
    } catch {
      rooms = []
    }

    if (!rooms || rooms.length === 0) {
      const { getFallbackDashboard } = await import('@/lib/fallback-data')
      return NextResponse.json(getFallbackDashboard(propertyId || 'BLR3396'))
    }

    const totalPhysicalRooms = rooms.length
    const totalRooms = totalPhysicalRooms
    const sellableRooms = totalPhysicalRooms

    // Auto-sync room status for any room with an active in-house checked-in booking
    for (const r of rooms) {
      if (inHouseRoomIds.has(r.id) && r.status !== 'Occupied') {
        r.status = 'Occupied'
        prisma.room.update({ where: { id: r.id }, data: { status: 'Occupied' } }).catch(() => {})
      }
    }

    const occupiedRooms = rooms.filter((r) => r.status === 'Occupied' || inHouseRoomIds.has(r.id)).length
    const cleaningRooms = rooms.filter((r) => r.status === 'Cleaning' && !inHouseRoomIds.has(r.id)).length
    const maintenanceRooms = rooms.filter((r) => r.status === 'Maintenance' && !inHouseRoomIds.has(r.id)).length
    const outOfServiceRooms = rooms.filter((r) => r.status === 'Out of Service' && !inHouseRoomIds.has(r.id)).length

    // Available rooms: Physical sellable inventory minus total booked rooms today
    // If overbooked (e.g. 50 booked on 44 capacity), availableRooms is -6 and overbookedRooms is 6
    const availableRooms = sellableRooms - bookedRoomsToday
    const overbookedRooms = Math.max(0, bookedRoomsToday - sellableRooms)
    const isOverbooked = overbookedRooms > 0

    // Occupancy % = (Booked Rooms / Sellable Rooms) * 100 (Uncapped: e.g. 113.64%)
    const occupancy = sellableRooms > 0
      ? Number(((bookedRoomsToday / sellableRooms) * 100).toFixed(2))
      : 0

    const overbookingStatus = isOverbooked
      ? 'OVERBOOKED'
      : occupancy >= 100
      ? 'FULL'
      : occupancy >= 80
      ? 'HIGH'
      : 'OPTIMAL'

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

    return NextResponse.json({
      hasProperties: true,
      totalProperties,
      property: {
        id: property?.id,
        name: property?.name,
        code: property?.code,
        city: property?.city,
        currencySymbol: property?.currencySymbol || '₹',
        taxRate: property?.taxRate || 0.0,
      },
      kpis: {
        totalProperties,
        totalPhysicalRooms,
        totalRooms,
        sellableRooms,
        bookedRoomsToday,
        availableRooms,
        occupiedRooms,
        cleaningRooms,
        maintenanceRooms,
        outOfServiceRooms,
        overbookedRooms,
        isOverbooked,
        overbookingStatus,
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
    console.error('Error fetching dashboard data, serving fallback:', error?.message || error)
    const { getFallbackDashboard } = await import('@/lib/fallback-data')
    const { searchParams } = new URL(req.url)
    const propertyId = searchParams.get('propertyId') || 'BLR3396'
    return NextResponse.json(getFallbackDashboard(propertyId))
  }
}
