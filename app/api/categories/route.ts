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

    const categories = await prisma.roomCategory.findMany({
      where: { propertyId },
      include: {
        rooms: true,
      },
      orderBy: { nightlyRate: 'asc' },
    })

    const categoriesWithCount = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      nightlyRate: cat.nightlyRate,
      weekendRate: cat.weekendRate,
      extraGuestCharge: cat.extraGuestCharge,
      baseOccupancy: cat.baseOccupancy,
      maxOccupancy: cat.maxOccupancy,
      description: cat.description,
      totalRooms: cat.rooms.length,
      createdAt: cat.createdAt,
    }))

    return NextResponse.json(categoriesWithCount)
  } catch (error: any) {
    console.error('Error fetching categories:', error)
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const { tenantId, propertyId: defaultPropId } = await getTenantContext(req, session?.user as any)
    const body = await req.json()
    const propertyId = body.propertyId || defaultPropId
    const {
      name,
      nightlyRate,
      weekendRate,
      extraGuestCharge,
      baseOccupancy = 2,
      maxOccupancy = 3,
      description,
    } = body

    if (!name?.trim() || nightlyRate === undefined) {
      return NextResponse.json({ error: 'Category name and nightly rate are required' }, { status: 400 })
    }

    if (!propertyId) {
      return NextResponse.json({ error: 'No active property found' }, { status: 400 })
    }

    // Verify property belongs to tenant
    const property = await prisma.property.findFirst({ where: { id: propertyId, tenantId } })
    if (!property) {
      return NextResponse.json({ error: 'Property not found or unauthorized' }, { status: 404 })
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
        weekendRate: weekendRate ? Number(weekendRate) : null,
        extraGuestCharge: extraGuestCharge ? Number(extraGuestCharge) : 0,
        baseOccupancy: Number(baseOccupancy) || 2,
        maxOccupancy: Number(maxOccupancy) || 3,
        description: description?.trim() || null,
        totalRooms: 0,
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
    const { tenantId } = await getTenantContext(req, session?.user as any)
    const body = await req.json()
    const {
      id,
      nightlyRate,
      weekendRate,
      extraGuestCharge,
      baseOccupancy,
      maxOccupancy,
      description,
      name,
    } = body

    if (!id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })
    }

    // Verify category belongs to a property of this tenant
    const existing = await prisma.roomCategory.findFirst({
      where: { id, property: { tenantId } },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Category not found or unauthorized' }, { status: 404 })
    }

    const updateData: any = {}
    if (nightlyRate !== undefined) updateData.nightlyRate = Number(nightlyRate)
    if (weekendRate !== undefined) updateData.weekendRate = Number(weekendRate)
    if (extraGuestCharge !== undefined) updateData.extraGuestCharge = Number(extraGuestCharge)
    if (baseOccupancy !== undefined) updateData.baseOccupancy = Number(baseOccupancy)
    if (maxOccupancy !== undefined) updateData.maxOccupancy = Number(maxOccupancy)
    if (description !== undefined) updateData.description = description?.trim() || null
    if (name !== undefined && name.trim()) {
      const trimmedName = name.trim()
      if (trimmedName !== existing.name) {
        // Check for collision
        const duplicate = await prisma.roomCategory.findUnique({
          where: {
            propertyId_name: {
              propertyId: existing.propertyId,
              name: trimmedName,
            },
          },
        })
        if (duplicate) {
          return NextResponse.json({ error: `Category "${trimmedName}" already exists` }, { status: 400 })
        }
        updateData.name = trimmedName
      }
    }

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

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const { tenantId } = await getTenantContext(req, session?.user as any)
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })
    }

    const existing = await prisma.roomCategory.findFirst({
      where: { id, property: { tenantId } },
      include: {
        rooms: true,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Category not found or unauthorized' }, { status: 404 })
    }

    if (existing.rooms.length > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete "${existing.name}" because ${existing.rooms.length} room${
            existing.rooms.length === 1 ? ' is' : 's are'
          } currently assigned to it. Please reassign or remove those rooms first.`,
        },
        { status: 400 }
      )
    }

    await prisma.roomCategory.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: `Category "${existing.name}" deleted successfully` })
  } catch (error: any) {
    console.error('Error deleting category:', error)
    return NextResponse.json({ error: error.message || 'Failed to delete category' }, { status: 500 })
  }
}
