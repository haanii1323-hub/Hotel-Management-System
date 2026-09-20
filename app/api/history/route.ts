import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantContext } from '@/lib/property-helper'
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subMonths, isValid } from 'date-fns'

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
  if (isEnd) dt.setHours(23, 59, 59, 999)
  else dt.setHours(0, 0, 0, 0)
  return dt
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const { tenantId, propertyId } = await getTenantContext(req, session?.user as any)

    const { searchParams } = new URL(req.url)
    const statusFilter = searchParams.get('status') || 'all'
    const datePreset = searchParams.get('preset') || 'all'
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')
    const search = (searchParams.get('search') || '').trim()
    const category = searchParams.get('category')
    const source = searchParams.get('source')

    if (!propertyId) {
      return NextResponse.json({
        summary: {
          totalBookings: 0,
          completedCount: 0,
          completedRevenue: 0,
          cancelledCount: 0,
          cancelledValue: 0,
          noShowCount: 0,
          totalCollected: 0,
          totalRoomsBooked: 0,
          totalGuests: 0,
        },
        bookings: [],
        filter: {
          preset: datePreset,
          status: statusFilter,
          from: fromParam,
          to: toParam,
        },
      })
    }

    // Determine Date Boundaries
    const now = new Date()
    let startDate: Date | null = null
    let endDate: Date | null = null

    if (datePreset === 'today') {
      startDate = startOfDay(now)
      endDate = endOfDay(now)
    } else if (datePreset === 'yesterday') {
      const y = subDays(now, 1)
      startDate = startOfDay(y)
      endDate = endOfDay(y)
    } else if (datePreset === 'this_week') {
      startDate = startOfWeek(now, { weekStartsOn: 1 })
      endDate = endOfWeek(now, { weekStartsOn: 1 })
    } else if (datePreset === 'this_month') {
      startDate = startOfMonth(now)
      endDate = endOfMonth(now)
    } else if (datePreset === 'last_month') {
      const lm = subMonths(now, 1)
      startDate = startOfMonth(lm)
      endDate = endOfMonth(lm)
    } else if (datePreset === 'custom' || fromParam || toParam) {
      startDate = parseDateBoundary(fromParam, false)
      endDate = parseDateBoundary(toParam, true)
    }

    // Build Prisma query
    const where: any = {
      propertyId,
    }

    // Status filter
    if (statusFilter === 'CheckedOut') {
      where.status = 'CheckedOut'
    } else if (statusFilter === 'Cancelled') {
      where.status = 'Cancelled'
    } else if (statusFilter === 'NoShow') {
      where.status = 'NoShow'
    } else if (statusFilter === 'all') {
      // Standard history view: past and cancelled stays
      where.status = { in: ['CheckedOut', 'Cancelled', 'NoShow'] }
    } else if (statusFilter === 'all_statuses') {
      // Include all including CheckedIn and Upcoming if explicitly searched
      // No status filter restriction
    } else {
      where.status = statusFilter
    }

    // Category and Source filter
    if (category && category !== 'all') {
      where.roomCategory = category
    }
    if (source && source !== 'all') {
      where.source = source
    }

    // Date range filter: check against checkOut date, checkIn date, or cancellation/creation date
    if (startDate && endDate) {
      if (startDate > endDate) {
        const tmp = startDate
        startDate = endDate
        endDate = tmp
      }
      where.OR = [
        { checkOut: { gte: startDate, lte: endDate } },
        { checkIn: { gte: startDate, lte: endDate } },
        { updatedAt: { gte: startDate, lte: endDate } },
        { createdAt: { gte: startDate, lte: endDate } },
      ]
    } else if (startDate) {
      where.OR = [
        { checkOut: { gte: startDate } },
        { checkIn: { gte: startDate } },
        { createdAt: { gte: startDate } },
      ]
    } else if (endDate) {
      where.OR = [
        { checkOut: { lte: endDate } },
        { checkIn: { lte: endDate } },
        { createdAt: { lte: endDate } },
      ]
    }

    // Search query
    if (search) {
      const cleanQ = search.replace(/^#/, '')
      const searchConditions = [
        { guest: { name: { contains: cleanQ, mode: 'insensitive' as const } } },
        { guest: { phone: { contains: cleanQ } } },
        { guest: { email: { contains: cleanQ, mode: 'insensitive' as const } } },
        { bookingRef: { contains: cleanQ, mode: 'insensitive' as const } },
        { bookingRef: { contains: `#${cleanQ}`, mode: 'insensitive' as const } },
        { roomCategory: { contains: cleanQ, mode: 'insensitive' as const } },
        { bookingRooms: { some: { room: { number: { contains: cleanQ, mode: 'insensitive' as const } } } } },
      ]

      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { OR: searchConditions },
        ]
        delete where.OR
      } else {
        where.OR = searchConditions
      }
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        guest: true,
        bookingRooms: {
          include: {
            room: true,
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
        statusLogs: {
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
        property: {
          select: {
            id: true,
            name: true,
            code: true,
            currencySymbol: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    // Compute Summary Statistics
    let completedCount = 0
    let completedRevenue = 0
    let cancelledCount = 0
    let cancelledValue = 0
    let noShowCount = 0
    let totalCollected = 0
    let totalRoomsBooked = 0
    let totalGuests = 0

    const formattedBookings = bookings.map((b) => {
      const paid = (b.payments || [])
        .filter((p) => p.status !== 'Pending' && p.status !== 'Failed' && p.status !== 'Cancelled')
        .reduce((s, p) => s + p.amount, 0)
      const balance = Math.max(0, (b.totalAmount || 0) - paid)
      const isFullyPaid = balance === 0 && (b.totalAmount || 0) > 0

      if (b.status === 'CheckedOut') {
        completedCount++
        completedRevenue += b.totalAmount || 0
      } else if (b.status === 'Cancelled') {
        cancelledCount++
        cancelledValue += b.totalAmount || 0
      } else if (b.status === 'NoShow') {
        noShowCount++
      }

      totalCollected += paid
      totalRoomsBooked += b.numRooms || 1
      totalGuests += (b.adults || 1) + (b.kids || 0)

      const cancellationLog = b.statusLogs.find((l) => l.newStatus === 'Cancelled')

      return {
        ...b,
        assignedRooms: b.bookingRooms.map((br) => br.room.number).join(', ') || 'Unassigned',
        paidAmount: paid,
        balanceAmount: balance,
        isFullyPaid,
        cancellationReason: b.status === 'Cancelled' ? b.notes || 'Reservation cancelled by front desk' : null,
        cancelledAt: cancellationLog?.createdAt || (b.status === 'Cancelled' ? b.updatedAt : null),
      }
    })

    return NextResponse.json({
      summary: {
        totalBookings: bookings.length,
        completedCount,
        completedRevenue,
        cancelledCount,
        cancelledValue,
        noShowCount,
        totalCollected,
        totalRoomsBooked,
        totalGuests,
      },
      bookings: formattedBookings,
      filter: {
        preset: datePreset,
        status: statusFilter,
        from: fromParam,
        to: toParam,
      },
    })
  } catch (error: any) {
    console.error('Error fetching booking history from SQL:', error?.message || error)
    return NextResponse.json({
      summary: {
        totalBookings: 0,
        completedCount: 0,
        completedRevenue: 0,
        cancelledCount: 0,
        cancelledValue: 0,
        noShowCount: 0,
        totalCollected: 0,
        totalRoomsBooked: 0,
        totalGuests: 0,
      },
      bookings: [],
      filter: { preset: 'all', status: 'all', from: null, to: null },
    })
  }
}
