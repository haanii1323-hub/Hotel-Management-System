import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payments = await prisma.payment.findMany({
    where: { bookingId: params.id },
    orderBy: { createdAt: 'asc' },
  })

  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
  })

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  const collected = payments.reduce((s, p) => s + (p.status !== 'Pending' ? p.amount : 0), 0)
  const balance = Math.max(0, (booking.totalAmount || 0) - collected)

  return NextResponse.json({ payments, collected, balance })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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

  const payments = await prisma.payment.findMany({
    where: { bookingId: params.id },
    orderBy: { createdAt: 'asc' },
  })
  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: {
      guest: true,
      property: true,
      bookingRooms: { include: { room: true } },
      payments: { orderBy: { createdAt: 'asc' } },
      invoices: true,
    },
  })

  const collected = payments.reduce((s, p) => s + (p.status !== 'Pending' ? p.amount : 0), 0)
  const total = booking?.totalAmount || 0
  const balance = Math.max(0, total - collected)

  return NextResponse.json({
    success: true,
    collected,
    balance,
    payments,
    booking,
  })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  let paymentId = searchParams.get('paymentId')

  if (!paymentId) {
    const body = await req.json().catch(() => ({}))
    paymentId = body.paymentId
  }

  if (!paymentId) {
    return NextResponse.json({ error: 'Payment ID is required to delete payment' }, { status: 400 })
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  })

  if (!payment || payment.bookingId !== params.id) {
    return NextResponse.json({ error: 'Payment record not found for this booking' }, { status: 404 })
  }

  await prisma.payment.delete({
    where: { id: paymentId },
  })

  const remainingPayments = await prisma.payment.findMany({
    where: { bookingId: params.id },
    orderBy: { createdAt: 'asc' },
  })

  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: {
      guest: true,
      property: true,
      bookingRooms: { include: { room: true } },
      payments: { orderBy: { createdAt: 'asc' } },
      invoices: true,
    },
  })

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  const collected = remainingPayments.reduce(
    (s, p) => s + (p.status !== 'Pending' ? p.amount : 0),
    0
  )
  const total = booking.totalAmount || 0
  const balance = Math.max(0, total - collected)

  return NextResponse.json({
    success: true,
    message: `Payment (${payment.mode} ₹${payment.amount}) deleted successfully`,
    collected,
    balance,
    payments: remainingPayments,
    booking,
  })
}
