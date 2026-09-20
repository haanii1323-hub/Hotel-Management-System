import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('search') || searchParams.get('q') || ''
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const tenantId = (session?.user as any)?.tenantId || 'demo-tenant'

    const where: any = {
      tenantId,
    }

    if (!includeInactive) {
      where.isActive = true
    }

    if (q.trim()) {
      const search = q.trim()
      where.AND = [
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { code: { contains: search, mode: 'insensitive' } },
            { city: { contains: search, mode: 'insensitive' } },
            { state: { contains: search, mode: 'insensitive' } },
            { address: { contains: search, mode: 'insensitive' } },
          ],
        },
      ]
    }

    let properties = await prisma.property.findMany({
      where,
      include: {
        _count: {
          select: {
            rooms: true,
            bookings: true,
            categories: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    if (!properties || properties.length === 0) {
      const { getFallbackProperties } = await import('@/lib/fallback-data')
      properties = getFallbackProperties() as any
    }

    return NextResponse.json(properties)
  } catch (error: any) {
    console.error('Error fetching properties from DB, serving fallback:', error?.message || error)
    const { getFallbackProperties } = await import('@/lib/fallback-data')
    return NextResponse.json(getFallbackProperties())
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const tenantId = (session?.user as any)?.tenantId || 'demo-tenant'

    const body = await req.json()
    const {
      name,
      code,
      city,
      state = 'Karnataka',
      country = 'India',
      address,
      phone,
      email,
      website,
      currency = 'INR',
      currencySymbol = '₹',
      timezone = 'Asia/Kolkata',
      taxRate = 0.0,
      checkInTime = '12:00 PM',
      checkOutTime = '11:00 AM',
      coverImage,
      categories,
    } = body

    if (!name?.trim() || !code?.trim() || !city?.trim()) {
      return NextResponse.json({ error: 'Property name, code, and city are required' }, { status: 400 })
    }

    const cleanCode = code.trim().toUpperCase()

    // Check unique code within this tenant
    const existing = await prisma.property.findFirst({
      where: { tenantId, code: cleanCode },
    })
    if (existing) {
      return NextResponse.json({ error: `Property with code "${cleanCode}" already exists in your account` }, { status: 400 })
    }

    const property = await prisma.property.create({
      data: {
        tenantId,
        name: name.trim(),
        code: cleanCode,
        city: city.trim(),
        state: state.trim(),
        country: country.trim(),
        address: address?.trim(),
        phone: phone?.trim(),
        email: email?.trim(),
        website: website?.trim(),
        currency: currency.trim(),
        currencySymbol: currencySymbol.trim(),
        timezone: timezone.trim(),
        taxRate: Number(taxRate) || 0.0,
        checkInTime: checkInTime.trim(),
        checkOutTime: checkOutTime.trim(),
        coverImage: coverImage || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
      },
    })

    // If initial categories were provided during onboarding, create them
    if (Array.isArray(categories) && categories.length > 0) {
      for (const cat of categories) {
        if (!cat.name?.trim()) continue
        const createdCat = await prisma.roomCategory.create({
          data: {
            propertyId: property.id,
            name: cat.name.trim(),
            nightlyRate: Number(cat.rate) || 2500,
            totalRooms: Number(cat.roomCount) || (cat.rooms ? cat.rooms.length : 0),
          },
        })

        if (Array.isArray(cat.rooms)) {
          for (const roomNo of cat.rooms) {
            if (!roomNo?.trim()) continue
            await prisma.room.create({
              data: {
                propertyId: property.id,
                number: roomNo.trim(),
                categoryId: createdCat.id,
                status: 'Available',
              },
            })
          }
        }
      }
    }

    return NextResponse.json(property, { status: 201 })
  } catch (error: any) {
    console.error('Error creating property:', error)
    return NextResponse.json({ error: error.message || 'Failed to create property' }, { status: 500 })
  }
}
