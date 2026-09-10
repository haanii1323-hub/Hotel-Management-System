import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/utils'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth()
  if (error) return error

  const body = await req.json()
  const { number, status, categoryId, categoryName, floor, bedType } = body

  const room = await prisma.room.findUnique({ where: { id: params.id } })
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

  const updateData: Record<string, unknown> = {}

  if (number && number.trim() !== room.number) {
    const existing = await prisma.room.findUnique({
      where: {
        propertyId_number: {
          propertyId: room.propertyId,
          number: number.trim(),
        },
      },
    })
    if (existing && existing.id !== room.id) {
      return NextResponse.json({ error: `Room ${number} already exists in this property` }, { status: 400 })
    }
    updateData.number = number.trim()
  }

  if (status && status !== room.status) {
    updateData.status = status
    await prisma.roomStatusLog.create({
      data: { roomId: params.id, oldStatus: room.status, newStatus: status, changedBy: session?.user?.id },
    })
  }

  if (categoryId) {
    updateData.categoryId = categoryId
  } else if (categoryName) {
    const category = await prisma.roomCategory.findFirst({
      where: { propertyId: room.propertyId, name: categoryName },
    })
    if (!category) return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    updateData.categoryId = category.id
  }

  if (floor !== undefined) {
    updateData.floor = Number(floor) || 1
  }

  if (bedType !== undefined) {
    updateData.bedType = String(bedType)
  }

  const updated = await prisma.room.update({
    where: { id: params.id },
    data: updateData,
    include: { category: true },
  })

  return NextResponse.json(updated)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAuth()
  if (error) return error

  const room = await prisma.room.findUnique({ where: { id: params.id } })
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

  await prisma.roomStatusLog.deleteMany({ where: { roomId: params.id } })
  await prisma.bookingRoom.deleteMany({ where: { roomId: params.id } })
  await prisma.room.delete({ where: { id: params.id } })

  return NextResponse.json({ success: true })
}
