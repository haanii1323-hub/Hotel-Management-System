import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const property = await prisma.property.findUnique({
      where: { id: params.id },
      include: {
        categories: {
          include: {
            rooms: true,
          },
        },
        _count: {
          select: {
            rooms: true,
            bookings: true,
            guests: true,
          },
        },
      },
    })

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    return NextResponse.json(property)
  } catch (error: any) {
    console.error('Error fetching property:', error)
    return NextResponse.json({ error: 'Failed to fetch property' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      name,
      code,
      city,
      state,
      country,
      address,
      phone,
      email,
      website,
      currency,
      currencySymbol,
      timezone,
      taxRate,
      checkInTime,
      checkOutTime,
      coverImage,
      isActive,
    } = body

    const updateData: any = {}
    if (name !== undefined) updateData.name = name.trim()
    if (code !== undefined) updateData.code = code.trim().toUpperCase()
    if (city !== undefined) updateData.city = city.trim()
    if (state !== undefined) updateData.state = state.trim()
    if (country !== undefined) updateData.country = country.trim()
    if (address !== undefined) updateData.address = address?.trim()
    if (phone !== undefined) updateData.phone = phone?.trim()
    if (email !== undefined) updateData.email = email?.trim()
    if (website !== undefined) updateData.website = website?.trim()
    if (currency !== undefined) updateData.currency = currency.trim()
    if (currencySymbol !== undefined) updateData.currencySymbol = currencySymbol.trim()
    if (timezone !== undefined) updateData.timezone = timezone.trim()
    if (taxRate !== undefined) updateData.taxRate = Number(taxRate)
    if (checkInTime !== undefined) updateData.checkInTime = checkInTime.trim()
    if (checkOutTime !== undefined) updateData.checkOutTime = checkOutTime.trim()
    if (coverImage !== undefined) updateData.coverImage = coverImage
    if (isActive !== undefined) updateData.isActive = Boolean(isActive)

    const updated = await prisma.property.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Error updating property:', error)
    return NextResponse.json({ error: error.message || 'Failed to update property' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Soft delete / deactivate property
    const property = await prisma.property.update({
      where: { id: params.id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true, message: 'Property deactivated', property })
  } catch (error: any) {
    console.error('Error deactivating property:', error)
    return NextResponse.json({ error: error.message || 'Failed to deactivate property' }, { status: 500 })
  }
}
