import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

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

    let totalProperties = properties.length
    let totalRooms = 0
    let totalOccupied = 0
    let totalAvailable = 0
    let totalRevenue = 0
    let totalBookings = 0

    const propertySummaries = properties.map((p) => {
      const pRooms = p.rooms.length
      const pOccupied = p.rooms.filter((r) => r.status === 'Occupied').length
      const pAvailable = p.rooms.filter((r) => r.status === 'Available').length
      const pBookings = p.bookings.length
      const pRevenue = p.bookings.reduce((sum, b) => {
        const collected = b.payments.reduce((pSum, pay) => pSum + (pay.status !== 'Pending' ? pay.amount : 0), 0)
        return sum + collected
      }, 0)
      const pOccupancy = pRooms > 0 ? Math.round((pOccupied / pRooms) * 100) : 0

      totalRooms += pRooms
      totalOccupied += pOccupied
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
        totalRooms: pRooms,
        occupiedRooms: pOccupied,
        availableRooms: pAvailable,
        totalRevenue: pRevenue,
        totalBookings: pBookings,
        occupancyRate: pOccupancy,
      }
    })

    const overallOccupancy = totalRooms > 0 ? Math.round((totalOccupied / totalRooms) * 100) : 0

    return NextResponse.json({
      portfolio: {
        totalProperties,
        totalRooms,
        totalOccupied,
        totalAvailable,
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
