import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantContext } from '@/lib/property-helper'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const { propertyId } = await getTenantContext(req, session?.user as any)

    if (!propertyId) {
      return NextResponse.json([])
    }

    const rooms = await prisma.room.findMany({
      where: { propertyId },
      include: {
        category: true,
      },
      orderBy: { number: 'asc' },
    })

    return NextResponse.json(rooms)
  } catch (error: any) {
    console.error('Error fetching rooms:', error)
    return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const { tenantId, propertyId: defaultPropId } = await getTenantContext(req, session?.user as any)
    const body = await req.json()
    const propertyId = body.propertyId || defaultPropId
    const { number, categoryId, categoryName, status = 'Available', floor = 1, bedType = 'King' } = body

    if (!number?.trim()) {
      return NextResponse.json({ error: 'Room number is required' }, { status: 400 })
    }

    if (!propertyId) {
      return NextResponse.json({ error: 'No active property found' }, { status: 400 })
    }

    // Verify property belongs to tenant
    const property = await prisma.property.findFirst({ where: { id: propertyId, tenantId } })
    if (!property) {
      return NextResponse.json({ error: 'Property not found or unauthorized' }, { status: 404 })
    }

    // Find category ID
    let finalCategoryId = categoryId
    if (!finalCategoryId && categoryName) {
      const cat = await prisma.roomCategory.findFirst({
        where: { propertyId, name: categoryName },
      })
      if (cat) finalCategoryId = cat.id
    }

    if (!finalCategoryId) {
      const firstCat = await prisma.roomCategory.findFirst({ where: { propertyId } })
      if (!firstCat) {
        return NextResponse.json({ error: 'Please create a room category/type first' }, { status: 400 })
      }
      finalCategoryId = firstCat.id
    }

    // Check unique room number within this property
    const existing = await prisma.room.findUnique({
      where: {
        propertyId_number: {
          propertyId,
          number: number.trim(),
        },
      },
    })
    if (existing) {
      return NextResponse.json({ error: `Room ${number} already exists in this property` }, { status: 400 })
    }

    const room = await prisma.room.create({
      data: {
        propertyId,
        number: number.trim(),
        categoryId: finalCategoryId,
        status,
        floor: Number(floor) || 1,
        bedType: bedType || 'King',
      },
      include: {
        category: true,
      },
    })

    // Increment category totalRooms count
    await prisma.roomCategory.update({
      where: { id: finalCategoryId },
      data: { totalRooms: { increment: 1 } },
    })

    return NextResponse.json(room, { status: 201 })
  } catch (error: any) {
    console.error('Error creating room:', error)
    return NextResponse.json({ error: error.message || 'Failed to create room' }, { status: 500 })
  }
}
