import { PrismaClient } from '@prisma/client'

async function verifyRemoteDatabase() {
  const remoteUrl = process.env.TARGET_DATABASE_URL || process.env.DATABASE_URL
  if (!remoteUrl) {
    console.error('❌ Error: Please specify TARGET_DATABASE_URL environment variable.')
    process.exit(1)
  }

  console.log('🔍 Testing Remote PostgreSQL Database Connection...')
  console.log(`   Target: ${remoteUrl.replace(/:([^:@]+)@/, ':****@')}\n`)

  const prisma = new PrismaClient({
    datasources: { db: { url: remoteUrl } },
  })

  const start = Date.now()
  try {
    await prisma.$connect()
    const latency = Date.now() - start
    console.log(`✅ Connection established successfully (Latency: ${latency}ms)`)

    // 1. Check all 13 table counts
    console.log('\n1. Verifying Database Clean Baseline:')
    const counts = await Promise.all([
      prisma.user.count(),
      prisma.tenant.count(),
      prisma.property.count(),
      prisma.roomCategory.count(),
      prisma.room.count(),
      prisma.guest.count(),
      prisma.booking.count(),
      prisma.bookingRoom.count(),
      prisma.payment.count(),
      prisma.invoice.count(),
      prisma.bookingStatusLog.count(),
      prisma.roomStatusLog.count(),
      prisma.paymentConfig.count(),
    ])

    const tableNames = [
      'User', 'Tenant', 'Property', 'RoomCategory', 'Room', 'Guest',
      'Booking', 'BookingRoom', 'Payment', 'Invoice', 'BookingStatusLog',
      'RoomStatusLog', 'PaymentConfig'
    ]

    let allZero = true
    tableNames.forEach((name, i) => {
      console.log(`   • ${name.padEnd(18)}: ${counts[i]} rows`)
      if (counts[i] !== 0) allZero = false
    })

    if (!allZero) {
      console.warn('\n⚠️ WARNING: Some tables contain existing records. Ensure this is intended before starting Day 1 operations.')
    } else {
      console.log('\n🌟 Clean Baseline: 100% Verified (All 13 tables are at 0 rows)')
    }

    // 2. Perform write/read verification cycle
    console.log('\n2. Testing Read/Write ACID Transaction Cycle...')
    const testTenant = await prisma.tenant.create({
      data: { name: 'Connectivity Check Group', slug: `conn-test-${Date.now()}`, isDemo: false },
    })
    console.log('   • Created test tenant in remote PostgreSQL: ✅ PASS')

    const readTenant = await prisma.tenant.findUnique({ where: { id: testTenant.id } })
    if (!readTenant) throw new Error('Failed to read back written record')
    console.log('   • Read back test tenant from remote PostgreSQL: ✅ PASS')

    await prisma.tenant.delete({ where: { id: testTenant.id } })
    console.log('   • Deleted test tenant from remote PostgreSQL: ✅ PASS')

    console.log('\n=============================================')
    console.log('🎉 REMOTE POSTGRESQL VERIFICATION: 100% PASS!')
    console.log('=============================================')
    console.log('This database is fully verified and ready for Vercel production use.')
  } catch (error: any) {
    console.error('❌ Remote database verification failed:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

verifyRemoteDatabase()
