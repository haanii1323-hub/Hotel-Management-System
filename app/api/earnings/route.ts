import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantContext } from '@/lib/property-helper'
import { isValid } from 'date-fns'

function parseDateBoundary(d: string | null, isEnd: boolean): Date | null {
  if (!d) return null
  const match = d.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) {
    const year = parseInt(match[1], 10)
    const month = parseInt(match[2], 10) - 1
    const day = parseInt(match[3], 10)
    const dt = isEnd
      ? new Date(year, month, day, 23, 59, 59, 999)
      : new Date(year, month, day, 0, 0, 0, 0)
    return isValid(dt) ? dt : null
  }
  const dt = new Date(d)
  if (!isValid(dt)) return null
  if (isEnd) {
    dt.setHours(23, 59, 59, 999)
  } else {
    dt.setHours(0, 0, 0, 0)
  }
  return dt
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const { tenantId, propertyId } = await getTenantContext(req, session?.user as any)

    if (!propertyId) {
      return NextResponse.json({
        property: null,
        bookedValue: 0,
        collected: 0,
        balanceToCollect: 0,
        channels: [],
        paymentModes: [],
        totalBookings: 0,
        totalPayments: 0,
      })
    }

    const property = await prisma.property.findFirst({ where: { id: propertyId, tenantId } })
    const { searchParams } = new URL(req.url)

    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')
    const filterMode = searchParams.get('mode') || (fromParam || toParam ? 'custom' : 'all')

    const fromDate = parseDateBoundary(fromParam, false)
    const toDate = parseDateBoundary(toParam, true)

    // Build Prisma where clauses
    let bookingWhere: any = {
      propertyId,
      status: { not: 'Cancelled' },
    }

    let paymentWhere: any = {
      booking: { propertyId },
      status: { not: 'Pending' },
    }

    if (fromDate && toDate) {
      let start = fromDate
      let end = toDate
      if (start > end) {
        const tmp = start
        start = end
        end = tmp
      }

      // Bookings that were active during this period or created during this period
      bookingWhere.OR = [
        {
          checkIn: { lte: end },
          checkOut: { gte: start },
        },
        {
          createdAt: { gte: start, lte: end },
        },
      ]

      // Payments received during this period
      paymentWhere.createdAt = {
        gte: start,
        lte: end,
      }
    } else if (fromDate) {
      bookingWhere.OR = [
        { checkOut: { gte: fromDate } },
        { createdAt: { gte: fromDate } },
      ]
      paymentWhere.createdAt = { gte: fromDate }
    } else if (toDate) {
      bookingWhere.OR = [
        { checkIn: { lte: toDate } },
        { createdAt: { lte: toDate } },
      ]
      paymentWhere.createdAt = { lte: toDate }
    }

    const bookings = await prisma.booking.findMany({
      where: bookingWhere,
      include: {
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const bookedValue = bookings.reduce((s, b) => s + (b.totalAmount || 0), 0)

    const allPayments = await prisma.payment.findMany({
      where: paymentWhere,
      orderBy: { createdAt: 'desc' },
    })

    const collected = allPayments.reduce((s, p) => s + p.amount, 0)

    // Calculate outstanding balance across these bookings
    let balanceToCollect = 0
    for (const b of bookings) {
      const bPaid = (b.payments || [])
        .filter((p) => p.status !== 'Pending' && p.status !== 'Failed' && p.status !== 'Cancelled')
        .reduce((sum, p) => sum + p.amount, 0)
      const due = Math.max(0, (b.totalAmount || 0) - bPaid)
      balanceToCollect += due
    }

    // Channel breakdown
    const channelMap: Record<string, number> = {}
    for (const b of bookings) {
      const src = b.source || 'Walk inn'
      channelMap[src] = (channelMap[src] || 0) + (b.totalAmount || 0)
    }

    const channels = Object.entries(channelMap).map(([name, amount]) => ({
      name,
      amount,
      percentage: bookedValue > 0 ? Math.round((amount / bookedValue) * 100) : 0,
    }))

    // Sort channels by amount descending
    channels.sort((a, b) => b.amount - a.amount)

    // Payment modes breakdown
    const modeMap: Record<string, number> = {}
    for (const p of allPayments) {
      const m = p.mode || 'Cash'
      modeMap[m] = (modeMap[m] || 0) + p.amount
    }

    const paymentModes = Object.entries(modeMap).map(([mode, amount]) => ({
      mode,
      amount,
      percentage: collected > 0 ? Math.round((amount / collected) * 100) : 0,
    }))

    // Sort payment modes by amount descending
    paymentModes.sort((a, b) => b.amount - a.amount)

    return NextResponse.json({
      property: {
        id: property?.id,
        name: property?.name,
        code: property?.code,
        currencySymbol: property?.currencySymbol || '₹',
      },
      filter: {
        mode: filterMode,
        from: fromParam || null,
        to: toParam || null,
      },
      bookedValue,
      collected,
      balanceToCollect,
      channels,
      paymentModes,
      totalBookings: bookings.length,
      totalPayments: allPayments.length,
    })
  } catch (error: any) {
    console.error('Error fetching earnings:', error)
    return NextResponse.json({ error: 'Failed to fetch earnings' }, { status: 500 })
  }
}
