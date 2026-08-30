import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTargetPropertyId } from '@/lib/property-helper'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const propertyId = await getTargetPropertyId(req, (session?.user as any)?.propertyId)

    const categories = await prisma.roomCategory.findMany({
      where: { propertyId },
      include: {
        rooms: true,
      },
      orderBy: { nightlyRate: 'asc' },
    })

    return NextResponse.json(categories)
  } catch (error: any) {
    console.error('Error fetching categories:', error)
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const body = await req.json()
    const propertyId = body.propertyId || (await getTargetPropertyId(req, (session?.user as any)?.propertyId))
    const { name, nightlyRate, totalRooms = 0 } = body

    if (!name?.trim() || nightlyRate === undefined) {
      return NextResponse.json({ error: 'Name and nightly rate are required' }, { status: 400 })
    }

    const existing = await prisma.roomCategory.findUnique({
      where: {
        propertyId_name: {
          propertyId,
          name: name.trim(),
        },
      },
    })
    if (existing) {
      return NextResponse.json({ error: `Category "${name}" already exists in this property` }, { status: 400 })
    }

    const category = await prisma.roomCategory.create({
      data: {
        propertyId,
        name: name.trim(),
        nightlyRate: Number(nightlyRate),
        totalRooms: Number(totalRooms),
      },
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error: any) {
    console.error('Error creating category:', error)
    return NextResponse.json({ error: error.message || 'Failed to create category' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const body = await req.json()
    const { id, nightlyRate, name, totalRooms } = body

    if (!id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })
    }

    const updateData: any = {}
    if (nightlyRate !== undefined) updateData.nightlyRate = Number(nightlyRate)
    if (name !== undefined) updateData.name = name.trim()
    if (totalRooms !== undefined) updateData.totalRooms = Number(totalRooms)

    const updated = await prisma.roomCategory.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Error updating category:', error)
    return NextResponse.json({ error: error.message || 'Failed to update category' }, { status: 500 })
  }
}
