import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

function generateSlug(text: string): string {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  const randomSuffix = Math.random().toString(36).substring(2, 6)
  return `${base || 'hotel'}-${randomSuffix}`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, password, hotelName } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 })
    }
    if (!email?.trim()) {
      return NextResponse.json({ error: 'Email address is required' }, { status: 400 })
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const emailClean = email.toLowerCase().trim()
    const existing = await prisma.user.findUnique({ where: { email: emailClean } })
    if (existing) {
      return NextResponse.json({ error: 'This email is already registered. Please sign in.' }, { status: 409 })
    }

    const orgName = hotelName?.trim() || `${name.trim()}'s Hospitality`
    const orgSlug = generateSlug(orgName)

    // Create Tenant first
    const tenant = await prisma.tenant.create({
      data: {
        name: orgName,
        slug: orgSlug,
        isDemo: false,
      },
    })

    const passwordHash = await bcrypt.hash(password, 10)

    // Create Owner User linked to this Tenant
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: emailClean,
        passwordHash,
        role: 'owner',
        tenantId: tenant.id,
      },
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Hotel account created successfully! You can now sign in.',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: tenant.id,
          tenantName: tenant.name,
          tenantSlug: tenant.slug,
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: 'Failed to create account. Please try again.' }, { status: 500 })
  }
}
