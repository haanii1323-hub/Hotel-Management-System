import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/utils'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAuth()
  if (error) return error

  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: {
      guest: true,
      payments: { orderBy: { createdAt: 'asc' } },
      bookingRooms: { include: { room: { include: { category: true } } } },
    },
  })

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  return NextResponse.json(booking)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth()
  if (error) return error

  const body = await req.json()
  const booking = await prisma.booking.findUnique({ where: { id: params.id } })
  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  const updated = await prisma.booking.update({
    where: { id: params.id },
    data: body,
  })

  return NextResponse.json(updated)
}
