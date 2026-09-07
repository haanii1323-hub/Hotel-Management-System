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
    const { propertyId } = await getTenantContext(req, session?.user as any)

    if (!propertyId) {
      return NextResponse.json({
        totalCount: 0,
        arrivingCount: 0,
        departingCount: 0,
        cleaningCount: 0,
        notifications: [],
      })
    }

    const now = new Date()
    const todayStr = format(now, 'yyyy-MM-dd')

    // 1. Pending Check-ins
    const upcomingBookings = await prisma.booking.findMany({
      where: {
        propertyId,
        status: 'Upcoming',
      },
      include: {
        guest: true,
        bookingRooms: { include: { room: true } },
      },
    })
    const arrivingToday = upcomingBookings.filter((b) => getDateString(b.checkIn) <= todayStr)

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
    })
    const departingToday = inHouseBookings.filter((b) => getDateString(b.checkOut) <= todayStr)

    // 3. Rooms needing cleaning
    const cleaningRooms = await prisma.room.findMany({
      where: {
        propertyId,
        status: 'Cleaning',
      },
      include: { category: true },
    })

    // Build structured notifications list
    const notifications: Array<{
      id: string
      type: 'arrival' | 'departure' | 'cleaning' | 'payment'
      title: string
      description: string
      bookingId?: string
      roomId?: string
      href?: string
    }> = []

    for (const b of arrivingToday) {
      notifications.push({
        id: `arr-${b.id}`,
        type: 'arrival',
        title: `Arrival Due · ${b.guest.name}`,
        description: `${b.bookingRef} (${b.roomCategory}) scheduled for check-in today.`,
        bookingId: b.id,
        href: `/bookings?selected=${b.id}`,
      })
    }

    for (const b of departingToday) {
      const collected = b.payments.reduce(
        (s, p) => s + (p.status !== 'Pending' ? p.amount : 0),
        0
      )
      const balance = Math.max(0, b.totalAmount - collected)
      notifications.push({
        id: `dep-${b.id}`,
        type: 'departure',
        title: `Departure Due · ${b.guest.name}`,
        description: `${b.bookingRef} due to checkout.${balance > 0 ? ` Balance: ₹${balance.toLocaleString('en-IN')}` : ' Paid.'}`,
        bookingId: b.id,
        href: `/bookings?selected=${b.id}`,
      })
    }

    for (const r of cleaningRooms) {
      notifications.push({
        id: `clean-${r.id}`,
        type: 'cleaning',
        title: `Housekeeping · Room ${r.number}`,
        description: `${r.category?.name || 'Room'} needs cleaning & turnaround.`,
        roomId: r.id,
        href: `/pricing`,
      })
    }

    return NextResponse.json({
      totalCount: notifications.length,
      arrivingCount: arrivingToday.length,
      departingCount: departingToday.length,
      cleaningCount: cleaningRooms.length,
      notifications,
    })
  } catch (error: any) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}
