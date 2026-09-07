import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)

  const body = await req.json()
  const { amount, mode = 'Cash', status: paymentStatus = 'Paid', utrRef, notes } = body



  await prisma.payment.create({
    data: {
      bookingId: params.id,
      amount: Number(amount),
      mode,
      status: paymentStatus,
      utrRef: utrRef?.trim() || null,
      notes: notes || null,
      collectedBy: session?.user?.id || null,
    },
  })

  const payments = await prisma.payment.findMany({ where: { bookingId: params.id } })
  const booking = await prisma.booking.findUnique({ where: { id: params.id } })
  const collected = payments.reduce((s, p) => s + (p.status !== 'Pending' ? p.amount : 0), 0)
  const balance = Math.max(0, (booking?.totalAmount || 0) - collected)

  return NextResponse.json({ success: true, collected, balance })
}
