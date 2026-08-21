import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/utils'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth()
  if (error) return error

  const body = await req.json()
  const { status, categoryName } = body

  const room = await prisma.room.findUnique({ where: { id: params.id } })
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

  const updateData: Record<string, unknown> = {}

  if (status) {
    updateData.status = status
    await prisma.roomStatusLog.create({
      data: { roomId: params.id, oldStatus: room.status, newStatus: status, changedBy: session?.user?.id },
    })
  }

  if (categoryName) {
    const category = await prisma.roomCategory.findFirst({ where: { name: categoryName } })
    if (!category) return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    updateData.categoryId = category.id
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
