import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTargetPropertyId } from '@/lib/property-helper'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const propertyId = await getTargetPropertyId(req, (session?.user as any)?.propertyId)

    const property = await prisma.property.findUnique({ where: { id: propertyId } })

    const bookings = await prisma.booking.findMany({
      where: {
        propertyId,
        status: { not: 'Cancelled' },
      },
      include: {
        payments: true,
      },
    })

    const bookedValue = bookings.reduce((s, b) => s + (b.totalAmount || 0), 0)

    const allPayments = await prisma.payment.findMany({
      where: {
        booking: { propertyId },
        status: { not: 'Pending' },
      },
    })
    const collected = allPayments.reduce((s, p) => s + p.amount, 0)
    const balanceToCollect = Math.max(0, bookedValue - collected)

    // Channel breakdown
    const channelMap: Record<string, number> = {}
    for (const b of bookings) {
      const src = b.source || 'Others'
      channelMap[src] = (channelMap[src] || 0) + (b.totalAmount || 0)
    }

    const channels = Object.entries(channelMap).map(([name, amount]) => ({
      name,
      amount,
      percentage: bookedValue > 0 ? Math.round((amount / bookedValue) * 100) : 0,
    }))

    // Payment modes breakdown
    const modeMap: Record<string, number> = {}
    for (const p of allPayments) {
      modeMap[p.mode] = (modeMap[p.mode] || 0) + p.amount
    }
    const paymentModes = Object.entries(modeMap).map(([mode, amount]) => ({
      mode,
      amount,
      percentage: collected > 0 ? Math.round((amount / collected) * 100) : 0,
    }))

    return NextResponse.json({
      property: {
        name: property?.name,
        code: property?.code,
        currencySymbol: property?.currencySymbol || '₹',
      },
      bookedValue,
      collected,
      balanceToCollect,
      channels,
      paymentModes,
    })
  } catch (error: any) {
    console.error('Error fetching earnings:', error)
    return NextResponse.json({ error: 'Failed to fetch earnings' }, { status: 500 })
  }
}
