import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, generateInvoiceNo } from '@/lib/utils'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth()
  if (error) return error

  if (!params.id) {
    return NextResponse.json({ error: 'Missing booking ID' }, { status: 400 })
  }

  const body = await req.json().catch(() => ({}))
  const { amount = 0, mode = 'Cash', status: paymentStatus = 'Paid', utrRef, notes } = body

  const numAmount = Number(amount || 0)
  if (numAmount < 0) return NextResponse.json({ error: 'Invalid payment amount' }, { status: 400 })
  if (numAmount > 0 && !mode) return NextResponse.json({ error: 'Payment mode is required' }, { status: 400 })
  if (numAmount > 0 && mode === 'UPI' && paymentStatus === 'Paid' && !utrRef?.trim()) {
    return NextResponse.json({ error: 'UTR/UPI reference number is required for UPI payments marked as paid' }, { status: 400 })
  }

  // Find booking by ID or bookingRef
  const booking = await prisma.booking.findFirst({
    where: {
      OR: [
        { id: params.id },
        { bookingRef: params.id },
        { bookingRef: params.id.startsWith('#') ? params.id : `#${params.id}` },
      ],
    },
    include: {
      guest: true,
      bookingRooms: { include: { room: true } },
      payments: true,
    },
  })

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  if (booking.status === 'CheckedOut') {
    return NextResponse.json({ error: 'Booking is already checked out.' }, { status: 400 })
  }

  // Save payment if collected now
  if (numAmount > 0) {
    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        amount: numAmount,
        mode: mode || 'Cash',
        status: paymentStatus || 'Paid',
        utrRef: utrRef?.trim() || null,
        notes: notes || null,
        collectedBy: session?.user?.id,
      },
    })
  }

  // Calculate total collected
  const allPayments = await prisma.payment.findMany({ where: { bookingId: booking.id } })
  const totalCollected = allPayments.reduce((s, p) => s + (p.status !== 'Pending' ? p.amount : 0), 0)
  const balance = Math.max(0, booking.totalAmount - totalCollected)

  // Determine final payment status
  let finalPaymentStatus = 'Pending'
  if (totalCollected >= booking.totalAmount) finalPaymentStatus = 'Paid'
  else if (totalCollected > 0) finalPaymentStatus = 'Partially Paid'

  // Update booking to CheckedOut
  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { status: 'CheckedOut' },
    include: {
      guest: true,
      bookingRooms: { include: { room: true } },
      payments: true,
    },
  })

  // Update rooms to Cleaning
  for (const br of updated.bookingRooms) {
    await prisma.room.update({ where: { id: br.roomId }, data: { status: 'Cleaning' } })
    await prisma.roomStatusLog.create({
      data: { roomId: br.roomId, oldStatus: br.room.status, newStatus: 'Cleaning', changedBy: session?.user?.id },
    })
  }

  await prisma.bookingStatusLog.create({
    data: { bookingId: booking.id, oldStatus: booking.status, newStatus: 'CheckedOut', changedBy: session?.user?.id },
  })

  // Generate invoice
  const invoiceNo = generateInvoiceNo()
  await prisma.invoice.create({ data: { invoiceNo, bookingId: booking.id } })

  return NextResponse.json({
    success: true,
    message: `${booking.guest.name} checked out successfully!`,
    invoiceNo,
    balance,
    finalPaymentStatus,
    booking: updated,
    ...updated,
  })
}
