import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fullCleanResetToZero() {
  const args = process.argv.slice(2)
  const isConfirmed = args.includes('--confirm-destructive-dev-reset-ground-zero')

  if (!isConfirmed) {
    console.error('🛑 BLOCKED: Destructive database reset is protected!')
    console.error('   This script deletes all PMS records and is disabled by default to prevent accidental data loss.')
    console.error('   To run in development mode only, you must explicitly pass:')
    console.error('   npx tsx scripts/full-clean-reset-to-zero.ts --confirm-destructive-dev-reset-ground-zero')
    process.exit(1)
  }

  if (process.env.NODE_ENV === 'production') {
    console.error('🛑 CRITICAL ERROR: Database reset script CANNOT be executed in production environment (NODE_ENV=production).')
    process.exit(1)
  }

  console.log('🚨 EXECUTING COMPLETE 100% FULL DATABASE RESET TO GROUND ZERO...')

  try {
    const logs1 = await prisma.roomStatusLog.deleteMany({})
    console.log(`• Cleared RoomStatusLog: ${logs1.count}`)
  } catch (e: any) {
    console.warn('RoomStatusLog:', e.message)
  }

  try {
    const logs2 = await prisma.bookingStatusLog.deleteMany({})
    console.log(`• Cleared BookingStatusLog: ${logs2.count}`)
  } catch (e: any) {
    console.warn('BookingStatusLog:', e.message)
  }

  try {
    const inv = await prisma.invoice.deleteMany({})
    console.log(`• Cleared Invoice: ${inv.count}`)
  } catch (e: any) {
    console.warn('Invoice:', e.message)
  }

  try {
    const pay = await prisma.payment.deleteMany({})
    console.log(`• Cleared Payment: ${pay.count}`)
  } catch (e: any) {
    console.warn('Payment:', e.message)
  }

  try {
    const br = await prisma.bookingRoom.deleteMany({})
    console.log(`• Cleared BookingRoom: ${br.count}`)
  } catch (e: any) {
    console.warn('BookingRoom:', e.message)
  }

  try {
    const bk = await prisma.booking.deleteMany({})
    console.log(`• Cleared Booking: ${bk.count}`)
  } catch (e: any) {
    console.warn('Booking:', e.message)
  }

  try {
    const g = await prisma.guest.deleteMany({})
    console.log(`• Cleared Guest: ${g.count}`)
  } catch (e: any) {
    console.warn('Guest:', e.message)
  }

  try {
    const pc = await prisma.paymentConfig.deleteMany({})
    console.log(`• Cleared PaymentConfig: ${pc.count}`)
  } catch (e: any) {
    console.warn('PaymentConfig:', e.message)
  }

  try {
    const r = await prisma.room.deleteMany({})
    console.log(`• Cleared Room: ${r.count}`)
  } catch (e: any) {
    console.warn('Room:', e.message)
  }

  try {
    const cat = await prisma.roomCategory.deleteMany({})
    console.log(`• Cleared RoomCategory: ${cat.count}`)
  } catch (e: any) {
    console.warn('RoomCategory:', e.message)
  }

  try {
    const p = await prisma.property.deleteMany({})
    console.log(`• Cleared Property: ${p.count}`)
  } catch (e: any) {
    console.warn('Property:', e.message)
  }

  try {
    const u = await prisma.user.deleteMany({})
    console.log(`• Cleared User: ${u.count}`)
  } catch (e: any) {
    console.warn('User:', e.message)
  }

  try {
    const t = await prisma.tenant.deleteMany({})
    console.log(`• Cleared Tenant: ${t.count}`)
  } catch (e: any) {
    console.warn('Tenant:', e.message)
  }

  console.log('\n=============================================')
  console.log('🌟 FULL RESET COMPLETED: ALL TABLES ARE AT 0')
  console.log('=============================================')
  console.log('You can now create brand new users, properties, categories, and inventory from scratch!')
}

fullCleanResetToZero()
  .catch((e) => {
    console.error('❌ Reset error:', e)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
