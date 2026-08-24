import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/utils'

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

  // Arriving today or overdue (all upcoming due today or earlier)
  const arrivingToday = await prisma.booking.findMany({
    where: {
      status: 'Upcoming',
      checkIn: { lt: todayEnd },
    },
    include: { guest: true, payments: true, bookingRooms: { include: { room: true } } },
    orderBy: { checkIn: 'asc' },
  })

  // In-house guests currently checked in
  const inHouse = await prisma.booking.findMany({
    where: { status: 'CheckedIn' },
    include: { guest: true, payments: true, bookingRooms: { include: { room: true } } },
    orderBy: { checkOut: 'asc' },
  })

  // Departing today or overdue (checked in with checkout due today or earlier)
  const departingToday = await prisma.booking.findMany({
    where: {
      status: 'CheckedIn',
      checkOut: { lt: todayEnd },
    },
    include: { guest: true, payments: true, bookingRooms: { include: { room: true } } },
    orderBy: { checkOut: 'asc' },
  })

  // Room status breakdown
  const allRooms = await prisma.room.findMany({ include: { category: true } })
  const sellableRooms = allRooms.filter(r => !['Maintenance', 'Out of Service'].includes(r.status))
  const occupiedRooms = allRooms.filter(r => r.status === 'Occupied')
  const availableRooms = allRooms.filter(r => r.status === 'Available')
  const cleaningRooms = allRooms.filter(r => r.status === 'Cleaning')
  const maintenanceRooms = allRooms.filter(r => r.status === 'Maintenance')
  const outOfServiceRooms = allRooms.filter(r => r.status === 'Out of Service')

  const occupancy = sellableRooms.length > 0
    ? Math.round((occupiedRooms.length / sellableRooms.length) * 100)
    : 0

  // Total bookings count
  const totalBookingsCount = await prisma.booking.count()

  // Balance to collect (all non-cancelled bookings with outstanding balance)
  const allBookings = await prisma.booking.findMany({
    where: { status: { not: 'Cancelled' } },
    include: { payments: true },
  })
  let totalBalance = 0
  let totalRevenue = 0
  for (const b of allBookings) {
    const collected = b.payments.reduce((s, p) => s + (p.status !== 'Pending' ? p.amount : 0), 0)
    const balance = b.totalAmount - collected
    if (balance > 0) totalBalance += balance
    totalRevenue += b.totalAmount
  }

  // Collected today
  const todayPayments = await prisma.payment.findMany({
    where: {
      createdAt: { gte: todayStart, lt: todayEnd },
      status: { not: 'Pending' },
    },
  })
  const collectedToday = todayPayments.reduce((s, p) => s + p.amount, 0)

  return NextResponse.json({
    arrivingToday,
    inHouse,
    departingToday,
    kpis: {
      arrivingTodayCount: arrivingToday.length,
      inHouseCount: inHouse.length,
      departingTodayCount: departingToday.length,
      totalBookingsCount,
      totalRevenue,
      occupancy,
      balanceToCollect: totalBalance,
      collectedToday,
      totalRooms: allRooms.length,
      sellableRooms: sellableRooms.length,
      availableRooms: availableRooms.length,
      occupiedRooms: occupiedRooms.length,
      cleaningRooms: cleaningRooms.length,
      maintenanceRooms: maintenanceRooms.length,
      outOfServiceRooms: outOfServiceRooms.length,
    },
  })
}
