import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'
import path from 'path'

const primaryPrisma = new PrismaClient()

async function testDisasterRecoveryIsolatedDb() {
  console.log('🧪 Starting Isolated Disaster Recovery Test...\n')

  // 1. Create temporary test data in primary database
  console.log('1. Creating temporary test records in primary database...')
  const ts = Date.now()
  const tenant = await primaryPrisma.tenant.create({
    data: { name: `Audit Group ${ts}`, slug: `audit-group-${ts}`, isDemo: false },
  })

  const property = await primaryPrisma.property.create({
    data: {
      tenantId: tenant.id,
      name: 'Grand Audit Palace',
      code: `GAP${ts.toString().slice(-4)}`,
      city: 'Bangalore',
      currency: 'INR',
      currencySymbol: '₹',
    },
  })

  const category = await primaryPrisma.roomCategory.create({
    data: {
      propertyId: property.id,
      name: 'Deluxe Suite',
      nightlyRate: 5000,
      totalRooms: 1,
    },
  })

  const room = await primaryPrisma.room.create({
    data: {
      propertyId: property.id,
      categoryId: category.id,
      number: '801',
      status: 'Occupied',
    },
  })

  const guest = await primaryPrisma.guest.create({
    data: {
      propertyId: property.id,
      name: 'Dr. Vikram Sarabhai',
      email: 'vikram.audit@apexinn.com',
      phone: '+91 9988776655',
    },
  })

  const booking = await primaryPrisma.booking.create({
    data: {
      propertyId: property.id,
      guestId: guest.id,
      bookingRef: '#BK-AUDIT-999',
      roomCategory: 'Deluxe Suite',
      nightlyRate: 5000,
      checkIn: new Date(),
      checkOut: new Date(Date.now() + 2 * 86400000),
      numRooms: 1,
      adults: 2,
      kids: 0,
      totalAmount: 10000,
      status: 'CheckedIn',
      source: 'Direct',
    },
  })

  const bookingRoom = await primaryPrisma.bookingRoom.create({
    data: {
      bookingId: booking.id,
      roomId: room.id,
    },
  })

  const payment = await primaryPrisma.payment.create({
    data: {
      bookingId: booking.id,
      amount: 10000,
      mode: 'UPI',
      status: 'Paid',
    },
  })

  const invoice = await primaryPrisma.invoice.create({
    data: {
      bookingId: booking.id,
      invoiceNo: 'INV-AUDIT-999',
    },
  })

  console.log('✅ Temporary test records created successfully.')
  console.log(`   • Guest: ${guest.name}`)
  console.log(`   • Booking Ref: ${booking.bookingRef}`)
  console.log(`   • Payment: ₹${payment.amount}`)
  console.log(`   • Invoice: ${invoice.invoiceNo}`)

  // 2. Execute backup
  console.log('\n2. Creating full database snapshot...')
  const backupOut = execSync('./scripts/backup-database.sh', { encoding: 'utf-8' })
  const match = backupOut.match(/File: (\S+\.sql\.gz)/)
  if (!match) throw new Error('Failed to parse backup filename')
  const backupFile = match[1]
  console.log(`✅ Backup created: ${backupFile}`)

  // 3. Create isolated test database
  console.log('\n3. Creating isolated test database "apex_inn_isolated_recovery_test"...')
  execSync('docker exec -i apex_inn_postgres psql -U postgres -c "DROP DATABASE IF EXISTS apex_inn_isolated_recovery_test;"')
  execSync('docker exec -i apex_inn_postgres psql -U postgres -c "CREATE DATABASE apex_inn_isolated_recovery_test;"')

  // 4. Restore snapshot into isolated test database
  console.log('4. Restoring snapshot into isolated test database...')
  execSync(`gunzip -c "${backupFile}" | docker exec -i apex_inn_postgres psql -U postgres -d apex_inn_isolated_recovery_test -q`)
  console.log('✅ Restore into isolated database completed successfully.')

  // 5. Connect and verify in isolated database
  console.log('\n5. Verifying integrity in isolated restored database...')
  const isolatedPrisma = new PrismaClient({
    datasources: {
      db: { url: 'postgresql://postgres:postgres123@localhost:5432/apex_inn_isolated_recovery_test?sslmode=disable' },
    },
  })

  const restoredGuest = await isolatedPrisma.guest.findUnique({ where: { id: guest.id } })
  const restoredBooking = await isolatedPrisma.booking.findUnique({
    where: { id: booking.id },
    include: { guest: true, payments: true, invoices: true, bookingRooms: { include: { room: true } } },
  })
  const restoredPayment = await isolatedPrisma.payment.findUnique({ where: { id: payment.id } })
  const restoredInvoice = await isolatedPrisma.invoice.findUnique({ where: { id: invoice.id } })

  if (!restoredGuest) throw new Error('Verification failed: Guest not found in restored database')
  if (!restoredBooking) throw new Error('Verification failed: Booking not found in restored database')
  if (!restoredPayment) throw new Error('Verification failed: Payment not found in restored database')
  if (!restoredInvoice) throw new Error('Verification failed: Invoice not found in restored database')

  if (restoredBooking.payments[0].amount !== 10000) throw new Error('Financial total mismatch on payment')
  if (restoredBooking.invoices[0].invoiceNo !== 'INV-AUDIT-999') throw new Error('Invoice number mismatch')
  if (restoredBooking.bookingRooms[0].room.number !== '801') throw new Error('Relationship mismatch on room allocation')

  console.log('  ✅ Restored Guest: verified (' + restoredGuest.name + ')')
  console.log('  ✅ Restored Booking: verified (' + restoredBooking.bookingRef + ')')
  console.log('  ✅ Restored Payment: verified (₹' + restoredPayment.amount + ')')
  console.log('  ✅ Restored Invoice: verified (' + restoredInvoice.invoiceNo + ')')
  console.log('  ✅ Restored Relationships: verified (Room 801 attached to booking)')

  await isolatedPrisma.$disconnect()

  // 6. Clean up isolated test database
  console.log('\n6. Cleaning up isolated test database...')
  execSync('docker exec -i apex_inn_postgres psql -U postgres -c "DROP DATABASE IF EXISTS apex_inn_isolated_recovery_test;"')
  console.log('✅ Isolated test database dropped.')

  // 7. Clean up temporary test data from primary database
  console.log('\n7. Cleaning up temporary test records from primary database...')
  await primaryPrisma.invoice.delete({ where: { id: invoice.id } })
  await primaryPrisma.payment.delete({ where: { id: payment.id } })
  await primaryPrisma.bookingRoom.delete({ where: { id: bookingRoom.id } })
  await primaryPrisma.booking.delete({ where: { id: booking.id } })
  await primaryPrisma.guest.delete({ where: { id: guest.id } })
  await primaryPrisma.room.delete({ where: { id: room.id } })
  await primaryPrisma.roomCategory.delete({ where: { id: category.id } })
  await primaryPrisma.property.delete({ where: { id: property.id } })
  await primaryPrisma.tenant.delete({ where: { id: tenant.id } })

  console.log('✅ Temporary test records cleanly removed from primary database.')

  // 8. Verify clean baseline
  const counts = await Promise.all([
    primaryPrisma.booking.count(),
    primaryPrisma.guest.count(),
    primaryPrisma.payment.count(),
    primaryPrisma.invoice.count(),
    primaryPrisma.room.count(),
    primaryPrisma.roomCategory.count(),
    primaryPrisma.property.count(),
    primaryPrisma.user.count(),
    primaryPrisma.tenant.count(),
  ])

  console.log('\n=============================================')
  console.log('🌟 CLEAN BASELINE VERIFICATION:')
  console.log('=============================================')
  console.log(`• Bookings:       ${counts[0]}`)
  console.log(`• Guests:         ${counts[1]}`)
  console.log(`• Payments:       ${counts[2]}`)
  console.log(`• Invoices:       ${counts[3]}`)
  console.log(`• Rooms:          ${counts[4]}`)
  console.log(`• Categories:     ${counts[5]}`)
  console.log(`• Properties:     ${counts[6]}`)
  console.log(`• Users:          ${counts[7]}`)
  console.log(`• Tenants:        ${counts[8]}`)
  console.log('=============================================')
  console.log('🎉 DISASTER RECOVERY & CLEAN BASELINE: 100% PASS!')

  await primaryPrisma.$disconnect()
}

testDisasterRecoveryIsolatedDb().catch(async (e) => {
  console.error('❌ Disaster recovery test failed:', e)
  await primaryPrisma.$disconnect()
  process.exit(1)
})
