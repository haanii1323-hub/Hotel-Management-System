import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, email, identifier, newPassword } = body

    const queryTerm = (email || identifier || '').toLowerCase().trim()

    if (!queryTerm) {
      return NextResponse.json(
        { error: 'Please enter your email, hotel name, or property code to find your account.' },
        { status: 400 }
      )
    }

    // 1. Try finding by direct user email
    let user = await prisma.user.findFirst({
      where: { email: { equals: queryTerm, mode: 'insensitive' } },
      include: {
        tenant: {
          include: {
            properties: true,
          },
        },
      },
    })

    // 2. If not found by email, search by property name, code, phone, or tenant name
    if (!user) {
      // Search by Property Name, Code, or Phone
      const property = await prisma.property.findFirst({
        where: {
          OR: [
            { name: { contains: queryTerm, mode: 'insensitive' } },
            { code: { contains: queryTerm, mode: 'insensitive' } },
            { phone: { contains: queryTerm, mode: 'insensitive' } },
          ],
        },
        include: {
          tenant: {
            include: {
              users: {
                where: { role: 'owner' },
              },
            },
          },
        },
      })

      if (property && property.tenant?.users?.length) {
        user = (await prisma.user.findUnique({
          where: { id: property.tenant.users[0].id },
          include: {
            tenant: {
              include: {
                properties: true,
              },
            },
          },
        })) as any
      }
    }

    // 3. Search by Tenant Name
    if (!user) {
      const tenant = await prisma.tenant.findFirst({
        where: {
          name: { contains: queryTerm, mode: 'insensitive' },
        },
        include: {
          users: {
            where: { role: 'owner' },
          },
          properties: true,
        },
      })

      if (tenant && tenant.users.length > 0) {
        user = (await prisma.user.findUnique({
          where: { id: tenant.users[0].id },
          include: {
            tenant: {
              include: {
                properties: true,
              },
            },
          },
        })) as any
      }
    }

    // 4. Search by Owner Name
    if (!user) {
      user = await prisma.user.findFirst({
        where: {
          name: { contains: queryTerm, mode: 'insensitive' },
        },
        include: {
          tenant: {
            include: {
              properties: true,
            },
          },
        },
      })
    }

    if (!user) {
      return NextResponse.json(
        {
          error: `No hotel account found matching "${queryTerm}". Please check your email, hotel name, or property code.`,
        },
        { status: 404 }
      )
    }

    const hotelName = user.tenant?.properties?.[0]?.name || user.tenant?.name || 'Hotel Property'
    const propertyCode = user.tenant?.properties?.[0]?.code || ''

    // If this was just an account discovery lookup
    if (action === 'lookup') {
      return NextResponse.json({
        success: true,
        found: true,
        email: user.email,
        name: user.name,
        hotelName,
        propertyCode,
      })
    }

    // Otherwise, perform password reset
    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        {
          error: 'New password is required and must be at least 6 characters.',
          accountFound: true,
          email: user.email,
          hotelName,
        },
        { status: 400 }
      )
    }

    const passwordHash = await bcrypt.hash(newPassword, 10)

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    })

    return NextResponse.json({
      success: true,
      message: `Password reset successfully for ${user.email}! You can now sign in with your new password.`,
      email: user.email,
      name: user.name,
      hotelName,
    })
  } catch (error: any) {
    console.error('Password reset error:', error)
    return NextResponse.json({ error: 'Failed to process password reset request.' }, { status: 500 })
  }
}
