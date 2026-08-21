import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/utils'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth()
  if (error) return error

  const body = await req.json()
  const { amount, mode, status: paymentStatus, utrRef, notes } = body

  if (mode === 'UPI' && paymentStatus === 'Paid' && !utrRef?.trim()) {
    return NextResponse.json({ error: 'UTR reference required for UPI payments marked as paid' }, { status: 400 })
  }

  await prisma.payment.create({
    data: {
      bookingId: params.id,
      amount: Number(amount),
      mode,
      status: paymentStatus,
      utrRef: utrRef?.trim() || null,
      notes: notes || null,
      collectedBy: session?.user?.id,
    },
  })

  const payments = await prisma.payment.findMany({ where: { bookingId: params.id } })
  const booking = await prisma.booking.findUnique({ where: { id: params.id } })
  const collected = payments.reduce((s, p) => s + (p.status !== 'Pending' ? p.amount : 0), 0)
  const balance = (booking?.totalAmount || 0) - collected

  return NextResponse.json({ success: true, collected, balance })
}
