import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/utils'

export async function GET(req: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  const rooms = await prisma.room.findMany({
    include: { category: true },
    orderBy: { number: 'asc' },
  })

  return NextResponse.json(rooms)
}

export async function POST(req: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  const body = await req.json()
  const { number, categoryName } = body

  if (!number?.trim()) return NextResponse.json({ error: 'Room number required' }, { status: 400 })
  if (!categoryName) return NextResponse.json({ error: 'Category required' }, { status: 400 })

  const existing = await prisma.room.findUnique({ where: { number: number.trim() } })
  if (existing) return NextResponse.json({ error: 'Room number already exists' }, { status: 400 })

  const category = await prisma.roomCategory.findFirst({ where: { name: categoryName } })
  if (!category) return NextResponse.json({ error: 'Invalid category' }, { status: 400 })

  const room = await prisma.room.create({
    data: { number: number.trim(), categoryId: category.id, status: 'Available' },
    include: { category: true },
  })

  // Update category total rooms count
  const totalRooms = await prisma.room.count({ where: { categoryId: category.id } })
  await prisma.roomCategory.update({ where: { id: category.id }, data: { totalRooms } })

  return NextResponse.json(room, { status: 201 })
}
