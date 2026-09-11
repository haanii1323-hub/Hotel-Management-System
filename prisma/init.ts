import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export const PROPERTIES_DATA = [
  {
    code: 'BLR3396',
    name: 'Metro Inn Rooms',
    city: 'Bangalore',
    state: 'Karnataka',
    country: 'India',
    address: '42 Brigade Road, Central Business District',
    phone: '+91 80 4112 3396',
    email: 'stay@metroinnrooms.com',
    currency: 'INR',
    currencySymbol: '₹',
    taxRate: 0.0,
    checkInTime: '02:00 PM',
    checkOutTime: '12:00 PM',
    coverImage: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
    categories: [
      { name: 'Standard', rate: 2500, rooms: ['101', '102', '103', '104', '105'] },
      { name: 'Deluxe', rate: 3500, rooms: ['201', '202', '203', '204', '205'] },
      { name: 'Superior', rate: 5500, rooms: ['301', '302', '303'] },
    ],
  },
  {
    code: 'BLR3630',
    name: 'Super Hotel O Sahasra',
    city: 'Bangalore',
    state: 'Karnataka',
    country: 'India',
    address: '88 Outer Ring Road, Bellandur',
    phone: '+91 80 4660 3630',
    email: 'info@sahasrahotel.com',
    currency: 'INR',
    currencySymbol: '₹',
    taxRate: 0.0,
    checkInTime: '01:00 PM',
    checkOutTime: '11:00 AM',
    coverImage: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80',
    categories: [
      { name: 'Classic', rate: 1896, rooms: ['A101', 'A102', 'A103', 'A104'] },
      { name: 'Deluxe', rate: 2800, rooms: ['B201', 'B202', 'B203', 'B204'] },
      { name: 'Superior', rate: 4500, rooms: ['C301', 'C302'] },
    ],
  },
  {
    code: 'BLR4012',
    name: 'Grand Bangalore Hotel',
    city: 'Bangalore',
    state: 'Karnataka',
    country: 'India',
    address: '15 MG Road, Ashok Nagar',
    phone: '+91 80 2558 4012',
    email: 'reservations@grandbangalore.com',
    currency: 'INR',
    currencySymbol: '₹',
    taxRate: 0.0,
    checkInTime: '02:00 PM',
    checkOutTime: '12:00 PM',
    coverImage: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80',
    categories: [
      { name: 'Executive', rate: 4200, rooms: ['101', '102', '103', '104'] },
      { name: 'Club Suite', rate: 6800, rooms: ['201', '202', '203'] },
      { name: 'Presidential', rate: 12000, rooms: ['301'] },
    ],
  },
]

export async function ensureInitialData() {
  console.log('⚡ Initializing Multi-Tenant PMS database...')

  // 1. Ensure Demo Tenant exists
  const demoTenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: { isDemo: true, name: 'Demo Hospitality Group' },
    create: {
      id: 'demo-tenant',
      name: 'Demo Hospitality Group',
      slug: 'demo',
      isDemo: true,
    },
  })

  // 2. Ensure Demo Admin Users exist
  const passwordHash = await bcrypt.hash('admin123', 10)
  await prisma.user.upsert({
    where: { email: 'admin@apexinn.com' },
    update: { tenantId: demoTenant.id, passwordHash, role: 'owner' },
    create: {
      email: 'admin@apexinn.com',
      passwordHash,
      name: 'Demo Admin',
      role: 'owner',
      tenantId: demoTenant.id,
    },
  })

  await prisma.user.upsert({
    where: { email: 'demo@apexinn.com' },
    update: { tenantId: demoTenant.id, passwordHash, role: 'owner' },
    create: {
      email: 'demo@apexinn.com',
      passwordHash,
      name: 'Demo User',
      role: 'owner',
      tenantId: demoTenant.id,
    },
  })

  // 3. Ensure Demo Properties exist under Demo Tenant
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0)
  const tomorrow = new Date(today.getTime() + 86400000)
  const yesterday = new Date(today.getTime() - 86400000)
  const twoDaysLater = new Date(today.getTime() + 2 * 86400000)
  const threeDaysAgo = new Date(today.getTime() - 3 * 86400000)

  for (const pData of PROPERTIES_DATA) {
    let property = await prisma.property.findFirst({
      where: { tenantId: demoTenant.id, code: pData.code },
    })

    if (!property) {
      property = await prisma.property.create({
        data: {
          tenantId: demoTenant.id,
          code: pData.code,
          name: pData.name,
          city: pData.city,
          state: pData.state,
          country: pData.country,
          address: pData.address,
          phone: pData.phone,
          email: pData.email,
          currency: pData.currency,
          currencySymbol: pData.currencySymbol,
          taxRate: pData.taxRate,
          checkInTime: pData.checkInTime,
          checkOutTime: pData.checkOutTime,
          coverImage: pData.coverImage,
        },
      })
      console.log(`  🏨 Created Demo Property: ${property.name} (${property.code})`)
    }

    // Ensure Categories & Rooms
    for (const cat of pData.categories) {
      let category = await prisma.roomCategory.findUnique({
        where: { propertyId_name: { propertyId: property.id, name: cat.name } },
      })
      if (!category) {
        category = await prisma.roomCategory.create({
          data: {
            propertyId: property.id,
            name: cat.name,
            nightlyRate: cat.rate,
            totalRooms: cat.rooms.length,
          },
        })
      }

      for (const rNum of cat.rooms) {
        const room = await prisma.room.findUnique({
          where: { propertyId_number: { propertyId: property.id, number: rNum } },
        })
        if (!room) {
          await prisma.room.create({
            data: {
              propertyId: property.id,
              number: rNum,
              categoryId: category.id,
              status: 'Available',
            },
          })
        }
      }
    }

    // Seed realistic demo bookings if empty
    const bookingCount = await prisma.booking.count({ where: { propertyId: property.id } })
    if (bookingCount === 0) {
      const allRooms = await prisma.room.findMany({ where: { propertyId: property.id } })
      if (allRooms.length >= 3) {
        // 1. In-house Booking
        const guest1 = await prisma.guest.create({
          data: {
            propertyId: property.id,
            name: `${pData.name.split(' ')[0]} Guest 1`,
            phone: '9876543210',
            email: 'guest1@example.com',
          },
        })
        await prisma.booking.create({
          data: {
            propertyId: property.id,
            bookingRef: `#${pData.code.slice(0, 3)}${Date.now().toString().slice(-5)}A`,
            guestId: guest1.id,
            status: 'CheckedIn',
            source: 'Walk inn',
            checkIn: yesterday,
            checkOut: tomorrow,
            nightlyRate: pData.categories[0].rate,
            totalAmount: pData.categories[0].rate * 2,
            roomCategory: pData.categories[0].name,
            bookingRooms: {
              create: [{ roomId: allRooms[0].id }],
            },
            payments: {
              create: [
                {
                  amount: pData.categories[0].rate * 2,
                  mode: 'UPI',
                  status: 'Paid',
                  utrRef: 'UTR' + Date.now().toString().slice(-8),
                },
              ],
            },
          },
        })
        await prisma.room.update({
          where: { id: allRooms[0].id },
          data: { status: 'Occupied' },
        })

        // 2. Upcoming Booking
        const guest2 = await prisma.guest.create({
          data: {
            propertyId: property.id,
            name: `${pData.name.split(' ')[0]} Guest 2`,
            phone: '9876543211',
            email: 'guest2@example.com',
          },
        })
        await prisma.booking.create({
          data: {
            propertyId: property.id,
            bookingRef: `#${pData.code.slice(0, 3)}${Date.now().toString().slice(-5)}B`,
            guestId: guest2.id,
            status: 'Upcoming',
            source: 'Direct Web',
            checkIn: today,
            checkOut: twoDaysLater,
            nightlyRate: pData.categories[0].rate,
            totalAmount: pData.categories[0].rate * 2,
            roomCategory: pData.categories[0].name,
            bookingRooms: {
              create: [{ roomId: allRooms[1].id }],
            },
          },
        })

        // 3. Completed Booking
        const guest3 = await prisma.guest.create({
          data: {
            propertyId: property.id,
            name: `${pData.name.split(' ')[0]} Guest 3`,
            phone: '9876543212',
            email: 'guest3@example.com',
          },
        })
        await prisma.booking.create({
          data: {
            propertyId: property.id,
            bookingRef: `#${pData.code.slice(0, 3)}${Date.now().toString().slice(-5)}C`,
            guestId: guest3.id,
            status: 'CheckedOut',
            source: 'Booking.com',
            checkIn: threeDaysAgo,
            checkOut: yesterday,
            nightlyRate: pData.categories[1] ? pData.categories[1].rate : pData.categories[0].rate,
            totalAmount: (pData.categories[1] ? pData.categories[1].rate : pData.categories[0].rate) * 2,
            roomCategory: pData.categories[1] ? pData.categories[1].name : pData.categories[0].name,
            bookingRooms: {
              create: [{ roomId: allRooms[2].id }],
            },
            payments: {
              create: [
                {
                  amount: (pData.categories[1] ? pData.categories[1].rate : pData.categories[0].rate) * 2,
                  mode: 'Cash',
                  status: 'Paid',
                },
              ],
            },
            invoices: {
              create: [
                {
                  invoiceNo: `INV-${pData.code}-${Date.now().toString().slice(-4)}`,
                },
              ],
            },
          },
        })
      }
    }
  }

  console.log('✅ Multi-tenant database initialization completed successfully!')
}

if (require.main === module) {
  ensureInitialData()
    .catch((e) => {
      console.error('Database initialization error:', e)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}
