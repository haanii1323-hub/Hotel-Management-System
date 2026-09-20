import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Export all records from all models
    const [
      tenants,
      properties,
      users,
      categories,
      rooms,
      guests,
      bookings,
      bookingRooms,
      payments,
      invoices,
      paymentConfigs,
      roomStatusLogs,
      bookingStatusLogs,
    ] = await Promise.all([
      prisma.tenant.findMany(),
      prisma.property.findMany(),
      prisma.user.findMany(),
      prisma.roomCategory.findMany(),
      prisma.room.findMany(),
      prisma.guest.findMany(),
      prisma.booking.findMany(),
      prisma.bookingRoom.findMany(),
      prisma.payment.findMany(),
      prisma.invoice.findMany(),
      prisma.paymentConfig.findMany(),
      prisma.roomStatusLog.findMany(),
      prisma.bookingStatusLog.findMany(),
    ])

    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      counts: {
        tenants: tenants.length,
        properties: properties.length,
        users: users.length,
        categories: categories.length,
        rooms: rooms.length,
        guests: guests.length,
        bookings: bookings.length,
        bookingRooms: bookingRooms.length,
        payments: payments.length,
        invoices: invoices.length,
        paymentConfigs: paymentConfigs.length,
        roomStatusLogs: roomStatusLogs.length,
        bookingStatusLogs: bookingStatusLogs.length,
      },
      data: {
        tenants,
        properties,
        users,
        categories,
        rooms,
        guests,
        bookings,
        bookingRooms,
        payments,
        invoices,
        paymentConfigs,
        roomStatusLogs,
        bookingStatusLogs,
      },
    }

    const filename = `apex-inn-backup-${new Date().toISOString().slice(0, 10)}.json`

    return new NextResponse(JSON.stringify(backupData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err: any) {
    console.error('Database backup export failed:', err)
    return NextResponse.json({ error: 'Failed to generate backup: ' + err.message }, { status: 500 })
  }
}
