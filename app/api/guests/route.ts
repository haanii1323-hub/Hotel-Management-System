import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTargetPropertyId } from '@/lib/property-helper'

function nights(checkIn: Date, checkOut: Date): number {
  return Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000))
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const propertyId = await getTargetPropertyId(req, (session?.user as any)?.propertyId)

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''

    const where: any = {
      propertyId,
    }

    if (search.trim()) {
      const q = search.trim()
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
        { email: { contains: q, mode: 'insensitive' } },
        { address: { contains: q, mode: 'insensitive' } },
      ]
    }

    const guests = await prisma.guest.findMany({
      where,
      include: {
        bookings: {
          where: { propertyId },
          include: {
            payments: true,
          },
          orderBy: { checkIn: 'desc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    const result = guests.map((g) => {
      const totalStays = g.bookings.length
      const totalNights = g.bookings.reduce((s, b) => s + nights(b.checkIn, b.checkOut), 0)
      const totalSpent = g.bookings.reduce((s, b) => {
        const collected = b.payments.reduce(
          (pSum, pay) => pSum + (pay.status !== 'Pending' ? pay.amount : 0),
          0
        )
        return s + collected
      }, 0)
      const lastStay = g.bookings[0]?.checkIn || null

      return {
        id: g.id,
        name: g.name,
        phone: g.phone,
        email: g.email,
        address: g.address,
        totalStays,
        totalNights,
        totalSpent,
        lastStay,
        bookings: g.bookings,
      }
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error fetching guests:', error)
    return NextResponse.json({ error: 'Failed to fetch guests' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const body = await req.json()
    const propertyId = body.propertyId || (await getTargetPropertyId(req, (session?.user as any)?.propertyId))

    const { name, phone, email, address } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Guest name is required' }, { status: 400 })
    }
    if (!phone?.trim()) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
    }

    // Verify property exists
    const property = await prisma.property.findUnique({ where: { id: propertyId } })
    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    // Check if guest already exists for this property with same phone
    let guest = await prisma.guest.findFirst({
      where: {
        propertyId,
        phone: phone.trim(),
      },
    })

    if (guest) {
      guest = await prisma.guest.update({
        where: { id: guest.id },
        data: {
          name: name.trim(),
          email: email?.trim() || guest.email,
          address: address?.trim() || guest.address,
        },
      })
    } else {
      guest = await prisma.guest.create({
        data: {
          propertyId,
          name: name.trim(),
          phone: phone.trim(),
          email: email?.trim() || null,
          address: address?.trim() || null,
        },
      })
    }

    return NextResponse.json(guest, { status: 201 })
  } catch (error: any) {
    console.error('Error creating guest:', error)
    return NextResponse.json({ error: error.message || 'Failed to create guest' }, { status: 500 })
  }
}
