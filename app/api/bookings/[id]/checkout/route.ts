import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateInvoiceNo } from '@/lib/utils'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)

  if (!params.id) {
    return NextResponse.json({ error: 'Missing booking ID' }, { status: 400 })
  }

  const body = await req.json().catch(() => ({}))
  const { splits, amount = 0, mode = 'Cash', status: paymentStatus = 'Paid', utrRef, notes } = body

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
      invoices: true,
    },
  })

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  if (booking.status === 'CheckedOut') {
    return NextResponse.json({ error: 'Booking is already checked out.' }, { status: 400 })
  }

  // Save payments if collected now (either via splits or single amount)
  if (Array.isArray(splits) && splits.length > 0) {
    const validSplits = splits.filter((s: any) => Number(s.amount) > 0)
    if (validSplits.length > 0) {
      await prisma.$transaction(
        validSplits.map((s: any) =>
          prisma.payment.create({
            data: {
              bookingId: booking.id,
              amount: Number(s.amount),
              mode: s.mode || 'Cash',
              status: s.status || paymentStatus || 'Paid',
              utrRef: s.utrRef?.trim() || null,
              notes: s.notes?.trim() || notes || `Checkout settlement (${s.mode || 'Cash'})`,
              collectedBy: session?.user?.id || null,
            },
          })
        )
      )
    }
  } else {
    const numAmount = Number(amount || 0)
    if (numAmount > 0) {
      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          amount: numAmount,
          mode: mode || 'Cash',
          status: paymentStatus || 'Paid',
          utrRef: utrRef?.trim() || null,
          notes: notes || 'Checkout settlement',
          collectedBy: session?.user?.id || null,
        },
      })
    }
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
      bookingRooms: { include: { room: { include: { category: true } } } },
      payments: true,
      invoices: true,
      statusLogs: true,
      property: true,
    },
  })

  // Update rooms to Cleaning
  for (const br of updated.bookingRooms) {
    await prisma.room.update({ where: { id: br.roomId }, data: { status: 'Cleaning' } })
    await prisma.roomStatusLog.create({
      data: { roomId: br.roomId, oldStatus: br.room.status, newStatus: 'Cleaning', changedBy: session?.user?.id || 'Staff' },
    })
  }

  await prisma.bookingStatusLog.create({
    data: { bookingId: booking.id, oldStatus: booking.status, newStatus: 'CheckedOut', changedBy: session?.user?.id || 'Staff' },
  })

  // Generate and persist invoice if none exists yet
  let invoiceNo = booking.invoices?.[0]?.invoiceNo
  if (!invoiceNo) {
    invoiceNo = generateInvoiceNo()
    await prisma.invoice.create({ data: { invoiceNo, bookingId: booking.id } })
  }

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
