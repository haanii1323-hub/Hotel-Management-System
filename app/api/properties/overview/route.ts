import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { format } from 'date-fns'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const tenantId = (session?.user as any)?.tenantId || 'demo-tenant'

    const properties = await prisma.property.findMany({
      where: { tenantId, isActive: true },
      include: {
        rooms: true,
        bookings: {
          include: {
            payments: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    const todayStr = format(new Date(), 'yyyy-MM-dd')

    let totalProperties = properties.length
    let totalPhysicalRooms = 0
    let totalSellableRooms = 0
    let totalBookedRooms = 0
    let totalAvailable = 0
    let totalRevenue = 0
    let totalBookings = 0

    const propertySummaries = properties.map((p) => {
      const pTotalRooms = p.rooms.length
      const outOfOrder = p.rooms.filter(
        (r) => r.status === 'Maintenance' || r.status === 'OutOfOrder'
      ).length
      const pSellable = Math.max(0, pTotalRooms - outOfOrder)

      // Count active bookings for today (Upcoming/Confirmed or CheckedIn)
      const activeBookingsToday = p.bookings.filter((b) => {
        const isEligible = b.status === 'Upcoming' || b.status === 'CheckedIn'
        if (!isEligible) return false

        const checkInStr = format(new Date(b.checkIn), 'yyyy-MM-dd')
        const checkOutStr = format(new Date(b.checkOut), 'yyyy-MM-dd')

        if (checkInStr === checkOutStr) {
          return checkInStr === todayStr
        }
        return checkInStr <= todayStr && todayStr < checkOutStr
      })

      const pBooked = activeBookingsToday.reduce((sum, b) => sum + (b.numRooms || 1), 0)
      const pAvailable = pSellable - pBooked
      const isOverbooked = pBooked > pSellable
      const overbookedRooms = Math.max(0, pBooked - pSellable)

      // Uncapped occupancy %
      const pOccupancy =
        pSellable > 0 ? Number(((pBooked / pSellable) * 100).toFixed(1)) : 0

      const pBookings = p.bookings.length
      const pRevenue = p.bookings.reduce((sum, b) => {
        const collected = b.payments.reduce(
          (pSum, pay) => pSum + (pay.status !== 'Pending' ? pay.amount : 0),
          0
        )
        return sum + collected
      }, 0)

      totalPhysicalRooms += pTotalRooms
      totalSellableRooms += pSellable
      totalBookedRooms += pBooked
      totalAvailable += pAvailable
      totalRevenue += pRevenue
      totalBookings += pBookings

      return {
        id: p.id,
        code: p.code,
        name: p.name,
        city: p.city,
        coverImage: p.coverImage,
        currencySymbol: p.currencySymbol,
        taxRate: p.taxRate,
        totalRooms: pTotalRooms,
        sellableRooms: pSellable,
        occupiedRooms: pBooked,
        availableRooms: pAvailable,
        isOverbooked,
        overbookedRooms,
        totalRevenue: pRevenue,
        totalBookings: pBookings,
        occupancyRate: pOccupancy,
      }
    })

    const overallOccupancy =
      totalSellableRooms > 0
        ? Number(((totalBookedRooms / totalSellableRooms) * 100).toFixed(1))
        : 0

    return NextResponse.json({
      portfolio: {
        totalProperties,
        totalRooms: totalPhysicalRooms,
        sellableRooms: totalSellableRooms,
        totalOccupied: totalBookedRooms,
        totalAvailable,
        isOverbooked: totalBookedRooms > totalSellableRooms,
        overbookedRooms: Math.max(0, totalBookedRooms - totalSellableRooms),
        totalRevenue,
        totalBookings,
        overallOccupancy,
      },
      properties: propertySummaries,
    })
  } catch (error: any) {
    console.error('Error fetching property portfolio overview:', error)
    return NextResponse.json({ error: 'Failed to fetch overview' }, { status: 500 })
  }
}
