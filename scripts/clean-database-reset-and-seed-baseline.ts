import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import masterArchive from '../backups/master-archive-complete-timeline.json'

const prisma = new PrismaClient()

async function resetAndSeedCleanBaseline() {
  console.log('🚀 Starting Clean SQL Database Reset...')

  // 1. Cleanly delete all transactional demo/test records
  console.log('🧹 Purging transactional tables (Bookings, Payments, Invoices, Guests, Status Logs)...')
  
  try {
    await prisma.roomStatusLog.deleteMany({})
  } catch (e: any) {
    console.warn('RoomStatusLog purge:', e.message)
  }

  try {
    await prisma.bookingStatusLog.deleteMany({})
  } catch (e: any) {
    console.warn('BookingStatusLog purge:', e.message)
  }

  try {
    await prisma.invoice.deleteMany({})
  } catch (e: any) {
    console.warn('Invoice purge:', e.message)
  }

  try {
    await prisma.payment.deleteMany({})
  } catch (e: any) {
    console.warn('Payment purge:', e.message)
  }

  try {
    await prisma.bookingRoom.deleteMany({})
  } catch (e: any) {
    console.warn('BookingRoom purge:', e.message)
  }

  try {
    await prisma.booking.deleteMany({})
  } catch (e: any) {
    console.warn('Booking purge:', e.message)
  }

  try {
    await prisma.guest.deleteMany({})
  } catch (e: any) {
    console.warn('Guest purge:', e.message)
  }

  console.log('✅ All old/demo bookings, guests, payments, and invoices completely purged (Count = 0).')

  // 2. Establish Real Baseline Infrastructure from masterArchive
  const { tenants, properties, categories, rooms, users, paymentConfigs } = masterArchive.data

  console.log(`📦 Seeding baseline infrastructure: ${tenants.length} tenants, ${properties.length} properties, ${categories.length} categories, ${rooms.length} rooms, ${users.length} users...`)

  // Tenants
  for (const t of tenants) {
    await prisma.tenant.upsert({
      where: { id: t.id },
      update: { name: t.name, slug: t.slug, isDemo: false },
      create: { id: t.id, name: t.name, slug: t.slug, isDemo: false },
    })
  }

  // Properties
  for (const p of properties) {
    await prisma.property.upsert({
      where: { id: p.id },
      update: {
        tenantId: p.tenantId,
        code: p.code,
        name: p.name,
        city: p.city || 'Bangalore',
        state: p.state || 'Karnataka',
        country: p.country || 'India',
        address: p.address,
        phone: p.phone,
        email: p.email,
        website: p.website,
        currency: p.currency || 'INR',
        currencySymbol: p.currencySymbol || '₹',
        timezone: p.timezone || 'Asia/Kolkata',
        taxRate: p.taxRate || 0,
        checkInTime: p.checkInTime || '02:00 PM',
        checkOutTime: p.checkOutTime || '12:00 PM',
        coverImage: p.coverImage,
        isActive: true,
      },
      create: {
        id: p.id,
        tenantId: p.tenantId,
        code: p.code,
        name: p.name,
        city: p.city || 'Bangalore',
        state: p.state || 'Karnataka',
        country: p.country || 'India',
        address: p.address,
        phone: p.phone,
        email: p.email,
        website: p.website,
        currency: p.currency || 'INR',
        currencySymbol: p.currencySymbol || '₹',
        timezone: p.timezone || 'Asia/Kolkata',
        taxRate: p.taxRate || 0,
        checkInTime: p.checkInTime || '02:00 PM',
        checkOutTime: p.checkOutTime || '12:00 PM',
        coverImage: p.coverImage,
        isActive: true,
      },
    })
  }

  // Room Categories
  for (const c of categories) {
    await prisma.roomCategory.upsert({
      where: { id: c.id },
      update: {
        propertyId: c.propertyId,
        name: c.name,
        nightlyRate: Number(c.nightlyRate || c.rate || 2000),
        weekendRate: c.weekendRate ? Number(c.weekendRate) : null,
        totalRooms: Number(c.totalRooms || 0),
        baseOccupancy: Number(c.baseOccupancy || 2),
        maxOccupancy: Number(c.maxOccupancy || 3),
      },
      create: {
        id: c.id,
        propertyId: c.propertyId,
        name: c.name,
        nightlyRate: Number(c.nightlyRate || c.rate || 2000),
        weekendRate: c.weekendRate ? Number(c.weekendRate) : null,
        totalRooms: Number(c.totalRooms || 0),
        baseOccupancy: Number(c.baseOccupancy || 2),
        maxOccupancy: Number(c.maxOccupancy || 3),
      },
    })
  }

  // Physical Rooms (Reset status to Available)
  for (const r of rooms) {
    await prisma.room.upsert({
      where: { id: r.id },
      update: {
        propertyId: r.propertyId,
        number: r.number,
        categoryId: r.categoryId,
        status: 'Available',
        floor: Number(r.floor || 1),
        bedType: r.bedType || 'King Bed',
      },
      create: {
        id: r.id,
        propertyId: r.propertyId,
        number: r.number,
        categoryId: r.categoryId,
        status: 'Available',
        floor: Number(r.floor || 1),
        bedType: r.bedType || 'King Bed',
      },
    })
  }

  // Users
  const defaultHash = await bcrypt.hash('admin123', 10)
  for (const u of users) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: {
        tenantId: u.tenantId,
        email: u.email,
        name: u.name,
        role: u.role || 'owner',
        propertyId: u.propertyId || null,
        passwordHash: u.passwordHash || defaultHash,
      },
      create: {
        id: u.id,
        tenantId: u.tenantId,
        email: u.email,
        name: u.name,
        role: u.role || 'owner',
        propertyId: u.propertyId || null,
        passwordHash: u.passwordHash || defaultHash,
      },
    })
  }

  // Payment Configs
  for (const pc of paymentConfigs) {
    await prisma.paymentConfig.upsert({
      where: { id: pc.id },
      update: {
        propertyId: pc.propertyId,
        tenantId: pc.tenantId,
        upiEnabled: pc.upiEnabled ?? true,
        upiId: pc.upiId,
        upiDisplayName: pc.upiDisplayName,
        upiMerchantName: pc.upiMerchantName,
        upiPhone: pc.upiPhone,
        qrCodeUrl: pc.qrCodeUrl,
        cashEnabled: pc.cashEnabled ?? true,
        cardEnabled: pc.cardEnabled ?? true,
      },
      create: {
        id: pc.id,
        propertyId: pc.propertyId,
        tenantId: pc.tenantId,
        upiEnabled: pc.upiEnabled ?? true,
        upiId: pc.upiId,
        upiDisplayName: pc.upiDisplayName,
        upiMerchantName: pc.upiMerchantName,
        upiPhone: pc.upiPhone,
        qrCodeUrl: pc.qrCodeUrl,
        cashEnabled: pc.cashEnabled ?? true,
        cardEnabled: pc.cardEnabled ?? true,
      },
    })
  }

  // 3. Final Verification of Reset State
  const countBookings = await prisma.booking.count()
  const countGuests = await prisma.guest.count()
  const countPayments = await prisma.payment.count()
  const countInvoices = await prisma.invoice.count()
  const countRooms = await prisma.room.count()
  const countAvailableRooms = await prisma.room.count({ where: { status: 'Available' } })
  const countProperties = await prisma.property.count()
  const countUsers = await prisma.user.count()

  console.log('\n=========================================')
  console.log('🎉 CLEAN DATABASE RESET VERIFICATION:')
  console.log('=========================================')
  console.log(`• Old/Test Bookings:   ${countBookings} (MUST BE 0)`)
  console.log(`• Old/Test Guests:     ${countGuests} (MUST BE 0)`)
  console.log(`• Old/Test Payments:   ${countPayments} (MUST BE 0)`)
  console.log(`• Old/Test Invoices:   ${countInvoices} (MUST BE 0)`)
  console.log(`• Active Properties:   ${countProperties}`)
  console.log(`• Total Clean Rooms:   ${countRooms} (${countAvailableRooms} Available)`)
  console.log(`• User Accounts:       ${countUsers}`)
  console.log('=========================================\n')

  if (countBookings === 0 && countGuests === 0 && countPayments === 0 && countInvoices === 0) {
    console.log('✅ Clean SQL Database successfully established and verified!')
  } else {
    throw new Error('Database reset check failed: non-zero transactional records detected.')
  }
}

resetAndSeedCleanBaseline()
  .catch((e) => {
    console.error('❌ Reset failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
