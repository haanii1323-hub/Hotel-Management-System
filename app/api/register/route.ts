import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/utils'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, email, password } = body

  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })
  if (!email?.trim()) return NextResponse.json({ error: 'Email required' }, { status: 400 })
  if (!password || password.length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return NextResponse.json({ error: 'Email already registered' }, { status: 400 })

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { name: name.trim(), email: email.trim(), passwordHash, role: 'staff' },
  })

  return NextResponse.json({ id: user.id, email: user.email, name: user.name }, { status: 201 })
}
