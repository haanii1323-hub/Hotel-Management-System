import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('search') || searchParams.get('q') || ''
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const where: any = {}
    if (!includeInactive) {
      where.isActive = true
    }

    if (q.trim()) {
      const search = q.trim()
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { state: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ]
    }

    const properties = await prisma.property.findMany({
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

    return NextResponse.json(properties)
  } catch (error: any) {
    console.error('Error fetching properties:', error)
    return NextResponse.json({ error: 'Failed to fetch properties' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
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
      state = 'Karnataka',
      country = 'India',
      address,
      phone,
      email,
      website,
      currency = 'INR',
      currencySymbol = '₹',
      timezone = 'Asia/Kolkata',
      taxRate = 12.0,
      checkInTime = '12:00 PM',
      checkOutTime = '11:00 AM',
      coverImage,
      categories,
    } = body

    if (!name?.trim() || !code?.trim() || !city?.trim()) {
      return NextResponse.json({ error: 'Property name, code, and city are required' }, { status: 400 })
    }

    const cleanCode = code.trim().toUpperCase()

    // Check unique code
    const existing = await prisma.property.findUnique({ where: { code: cleanCode } })
    if (existing) {
      return NextResponse.json({ error: `Property with code "${cleanCode}" already exists` }, { status: 400 })
    }

    const property = await prisma.property.create({
      data: {
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
        taxRate: Number(taxRate) || 12.0,
        checkInTime: checkInTime.trim(),
        checkOutTime: checkOutTime.trim(),
        coverImage: coverImage || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
      },
    })

    // Create default room categories & rooms if supplied or generate sensible defaults
    const initialCategories = categories && categories.length > 0
      ? categories
      : [
          { name: 'Standard', rate: 2200, roomCount: 5 },
          { name: 'Deluxe', rate: 3200, roomCount: 5 },
          { name: 'Suite', rate: 5000, roomCount: 2 },
        ]

    for (const cat of initialCategories) {
      const createdCat = await prisma.roomCategory.create({
        data: {
          propertyId: property.id,
          name: cat.name,
          nightlyRate: Number(cat.rate) || 2500,
          totalRooms: Number(cat.roomCount) || (cat.rooms ? cat.rooms.length : 4),
        },
      })

      const count = Number(cat.roomCount) || (cat.rooms ? cat.rooms.length : 4)
      for (let i = 1; i <= count; i++) {
        const roomNo = cat.rooms && cat.rooms[i - 1] ? cat.rooms[i - 1] : `${cat.name.slice(0, 2).toUpperCase()}-${100 + i}`
        await prisma.room.create({
          data: {
            propertyId: property.id,
            number: roomNo,
            categoryId: createdCat.id,
            status: 'Available',
          },
        })
      }
    }

    return NextResponse.json(property, { status: 201 })
  } catch (error: any) {
    console.error('Error creating property:', error)
    return NextResponse.json({ error: error.message || 'Failed to create property' }, { status: 500 })
  }
}
