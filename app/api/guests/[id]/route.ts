import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const guest = await prisma.guest.findUnique({
      where: { id: params.id },
      include: {
        bookings: {
          include: {
            payments: true,
            bookingRooms: { include: { room: true } },
          },
          orderBy: { checkIn: 'desc' },
        },
      },
    })

    if (!guest) return NextResponse.json({ error: 'Guest not found' }, { status: 404 })
    return NextResponse.json(guest)
  } catch (error: any) {
    console.error('Error fetching guest:', error)
    return NextResponse.json({ error: 'Failed to fetch guest' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { name, phone, email, address } = body

    const updateData: any = {}
    if (name !== undefined) updateData.name = name.trim()
    if (phone !== undefined) updateData.phone = phone.trim()
    if (email !== undefined) updateData.email = email ? email.trim() : null
    if (address !== undefined) updateData.address = address ? address.trim() : null

    const updated = await prisma.guest.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Error updating guest:', error)
    return NextResponse.json({ error: 'Failed to update guest' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await prisma.guest.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true, message: 'Guest deleted' })
  } catch (error: any) {
    console.error('Error deleting guest:', error)
    return NextResponse.json({ error: 'Failed to delete guest' }, { status: 500 })
  }
}
