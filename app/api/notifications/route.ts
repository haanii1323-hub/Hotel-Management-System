import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantContext } from '@/lib/property-helper'
import { format, differenceInCalendarDays } from 'date-fns'

export const dynamic = 'force-dynamic'

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
    const { propertyId } = await getTenantContext(req, session?.user as any)

    if (!propertyId) {
      return NextResponse.json({
        totalCount: 0,
        delayedCheckinCount: 0,
        delayedCheckoutCount: 0,
        arrivingCount: 0,
        departingCount: 0,
        cleaningCount: 0,
        notifications: [],
      })
    }

    const now = new Date()
    const todayStr = format(now, 'yyyy-MM-dd')
    const todayNoon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0)

    // 1. Pending Check-ins
    const upcomingBookings = await prisma.booking.findMany({
      where: {
        propertyId,
        status: 'Upcoming',
      },
      include: {
        guest: true,
        bookingRooms: { include: { room: true } },
        payments: true,
      },
      orderBy: { checkIn: 'asc' },
    })

    const arrivingTodayOrOverdue = upcomingBookings.filter((b) => getDateString(b.checkIn) <= todayStr)

    // 2. Pending Check-outs
    const inHouseBookings = await prisma.booking.findMany({
      where: {
        propertyId,
        status: 'CheckedIn',
      },
      include: {
        guest: true,
        bookingRooms: { include: { room: true } },
        payments: true,
      },
      orderBy: { checkOut: 'asc' },
    })

    const departingTodayOrOverdue = inHouseBookings.filter((b) => getDateString(b.checkOut) <= todayStr)

    // 3. Rooms needing cleaning
    const cleaningRooms = await prisma.room.findMany({
      where: {
        propertyId,
        status: 'Cleaning',
      },
      include: { category: true },
      orderBy: { number: 'asc' },
    })

    // Build structured notifications list
    const notifications: Array<{
      id: string
      type: 'delayed_checkin' | 'delayed_checkout' | 'arrival' | 'departure' | 'cleaning'
      title: string
      description: string
      isDelayed: boolean
      delayedDays: number
      guestName: string
      bookingRef: string
      roomCategory: string
      assignedRooms: string
      totalAmount: number
      collectedAmount: number
      balance: number
      booking?: any
      bookingId?: string
      roomId?: string
      href?: string
    }> = []

    let delayedCheckinCount = 0
    let delayedCheckoutCount = 0

    // Process Check-ins
    for (const b of arrivingTodayOrOverdue) {
      const checkInDt = parseBookingDate(b.checkIn)
      const delayDays = checkInDt ? differenceInCalendarDays(todayNoon, checkInDt) : 0
      const isDelayed = delayDays >= 0 // Due today or earlier and not yet checked in

      if (isDelayed) delayedCheckinCount++

      const assignedRooms = (b.bookingRooms || [])
        .map((br) => br.room?.number)
        .filter(Boolean)
        .join(', ')

      const delayLabel =
        delayDays > 0
          ? `${delayDays} day${delayDays === 1 ? '' : 's'} overdue`
          : 'Scheduled for check-in today'

      notifications.push({
        id: `arr-${b.id}`,
        type: isDelayed && delayDays > 0 ? 'delayed_checkin' : 'arrival',
        title: isDelayed && delayDays > 0 ? `Delayed Check-in · ${b.guest.name}` : `Arrival Due · ${b.guest.name}`,
        description: `${b.bookingRef} (${b.roomCategory}) · ${delayLabel}.`,
        isDelayed,
        delayedDays: Math.max(0, delayDays),
        guestName: b.guest.name,
        bookingRef: b.bookingRef,
        roomCategory: b.roomCategory,
        assignedRooms: assignedRooms || `${b.numRooms} Room(s)`,
        totalAmount: b.totalAmount || 0,
        collectedAmount: b.payments.reduce((s, p) => s + (p.status !== 'Pending' ? p.amount : 0), 0),
        balance: Math.max(
          0,
          (b.totalAmount || 0) - b.payments.reduce((s, p) => s + (p.status !== 'Pending' ? p.amount : 0), 0)
        ),
        booking: b,
        bookingId: b.id,
        href: `/bookings?selected=${b.id}`,
      })
    }

    // Process Check-outs
    for (const b of departingTodayOrOverdue) {
      const checkOutDt = parseBookingDate(b.checkOut)
      const delayDays = checkOutDt ? differenceInCalendarDays(todayNoon, checkOutDt) : 0
      const isDelayed = delayDays >= 0 // Due today or earlier and not yet checked out

      if (isDelayed) delayedCheckoutCount++

      const collected = b.payments.reduce((s, p) => s + (p.status !== 'Pending' ? p.amount : 0), 0)
      const balance = Math.max(0, (b.totalAmount || 0) - collected)
      const assignedRooms = (b.bookingRooms || [])
        .map((br) => br.room?.number)
        .filter(Boolean)
        .join(', ')

      const delayLabel =
        delayDays > 0
          ? `${delayDays} day${delayDays === 1 ? '' : 's'} overdue`
          : 'Scheduled for checkout today'

      notifications.push({
        id: `dep-${b.id}`,
        type: isDelayed && delayDays > 0 ? 'delayed_checkout' : 'departure',
        title: isDelayed && delayDays > 0 ? `Delayed Checkout · ${b.guest.name}` : `Departure Due · ${b.guest.name}`,
        description: `${b.bookingRef} (Room ${assignedRooms || b.roomCategory}) · ${delayLabel}.${
          balance > 0 ? ` Balance: ₹${balance.toLocaleString('en-IN')}` : ' Paid.'
        }`,
        isDelayed,
        delayedDays: Math.max(0, delayDays),
        guestName: b.guest.name,
        bookingRef: b.bookingRef,
        roomCategory: b.roomCategory,
        assignedRooms: assignedRooms || 'Room',
        totalAmount: b.totalAmount || 0,
        collectedAmount: collected,
        balance,
        booking: b,
        bookingId: b.id,
        href: `/bookings?selected=${b.id}`,
      })
    }

    // Process Cleaning
    for (const r of cleaningRooms) {
      notifications.push({
        id: `clean-${r.id}`,
        type: 'cleaning',
        title: `Housekeeping · Room ${r.number}`,
        description: `${r.category?.name || 'Room'} is vacant and needs turnaround cleaning.`,
        isDelayed: false,
        delayedDays: 0,
        guestName: '',
        bookingRef: '',
        roomCategory: r.category?.name || '',
        assignedRooms: r.number,
        totalAmount: 0,
        collectedAmount: 0,
        balance: 0,
        roomId: r.id,
        href: `/pricing`,
      })
    }

    // Sort: Delayed checkouts and delayed check-ins first
    notifications.sort((a, b) => {
      if (a.isDelayed && !b.isDelayed) return -1
      if (!a.isDelayed && b.isDelayed) return 1
      return b.delayedDays - a.delayedDays
    })

    return NextResponse.json({
      totalCount: notifications.length,
      delayedCheckinCount,
      delayedCheckoutCount,
      arrivingCount: arrivingTodayOrOverdue.length,
      departingCount: departingTodayOrOverdue.length,
      cleaningCount: cleaningRooms.length,
      notifications,
    })
  } catch (error: any) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}
