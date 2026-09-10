import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)

  const body = await req.json().catch(() => ({}))
  const { splits, amount, mode = 'Cash', status: paymentStatus = 'Paid', utrRef, notes } = body

  if (Array.isArray(splits) && splits.length > 0) {
    const validSplits = splits.filter((s: any) => Number(s.amount) > 0)
    if (validSplits.length === 0) {
      return NextResponse.json({ error: 'Please specify a valid amount greater than 0 for each payment mode' }, { status: 400 })
    }

    await prisma.$transaction(
      validSplits.map((s: any) =>
        prisma.payment.create({
          data: {
            bookingId: params.id,
            amount: Number(s.amount),
            mode: s.mode || 'Cash',
            status: s.status || paymentStatus || 'Paid',
            utrRef: s.utrRef?.trim() || null,
            notes: s.notes?.trim() || notes || `Multi-mode payment split (${s.mode || 'Cash'})`,
            collectedBy: session?.user?.id || null,
          },
        })
      )
    )
  } else {
    const numAmount = Number(amount || 0)
    if (numAmount <= 0) {
      return NextResponse.json({ error: 'Please enter an amount greater than 0' }, { status: 400 })
    }

    await prisma.payment.create({
      data: {
        bookingId: params.id,
        amount: numAmount,
        mode: mode || 'Cash',
        status: paymentStatus || 'Paid',
        utrRef: utrRef?.trim() || null,
        notes: notes || null,
        collectedBy: session?.user?.id || null,
      },
    })
  }

  const payments = await prisma.payment.findMany({ where: { bookingId: params.id } })
  const booking = await prisma.booking.findUnique({ where: { id: params.id } })
  const collected = payments.reduce((s, p) => s + (p.status !== 'Pending' ? p.amount : 0), 0)
  const balance = Math.max(0, (booking?.totalAmount || 0) - collected)

  return NextResponse.json({ success: true, collected, balance })
}
