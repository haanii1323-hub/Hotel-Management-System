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
    taxRate: 12.0,
    checkInTime: '02:00 PM',
    checkOutTime: '12:00 PM',
    coverImage: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
    categories: [
      { name: 'Standard', rate: 2500, rooms: ['101', '102', '103', '104', '105'] },
      { name: 'Deluxe', rate: 3500, rooms: ['201', '202', '203', '204', '205'] },
      { name: 'Suite', rate: 5500, rooms: ['301', '302', '303'] },
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
    taxRate: 18.0,
    checkInTime: '01:00 PM',
    checkOutTime: '11:00 AM',
    coverImage: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80',
    categories: [
      { name: 'Classic', rate: 1896, rooms: ['A101', 'A102', 'A103', 'A104'] },
      { name: 'Deluxe', rate: 2800, rooms: ['B201', 'B202', 'B203', 'B204'] },
      { name: 'Suite', rate: 4500, rooms: ['C301', 'C302'] },
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
    taxRate: 18.0,
    checkInTime: '02:00 PM',
    checkOutTime: '12:00 PM',
    coverImage: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80',
    categories: [
      { name: 'Executive', rate: 4200, rooms: ['GB-101', 'GB-102', 'GB-103', 'GB-104'] },
      { name: 'Deluxe', rate: 5500, rooms: ['GB-201', 'GB-202', 'GB-203'] },
      { name: 'Presidential Suite', rate: 9500, rooms: ['GB-301', 'GB-302'] },
    ],
  },
  {
    code: 'BLR4218',
    name: 'Royal Palace Bangalore',
    city: 'Bangalore',
    state: 'Karnataka',
    country: 'India',
    address: 'Palace Cross Road, Vasanth Nagar',
    phone: '+91 80 2234 4218',
    email: 'concierge@royalpalaceblr.com',
    currency: 'INR',
    currencySymbol: '₹',
    taxRate: 18.0,
    checkInTime: '02:00 PM',
    checkOutTime: '11:00 AM',
    coverImage: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80',
    categories: [
      { name: 'Royal Classic', rate: 3800, rooms: ['RP-101', 'RP-102', 'RP-103'] },
      { name: 'Palace Suite', rate: 6800, rooms: ['RP-201', 'RP-202', 'RP-203'] },
    ],
  },
  {
    code: 'BLR4382',
    name: 'City View Residency',
    city: 'Bangalore',
    state: 'Karnataka',
    country: 'India',
    address: '12 Indiranagar 100 Feet Road',
    phone: '+91 80 4115 4382',
    email: 'frontdesk@cityviewresidency.in',
    currency: 'INR',
    currencySymbol: '₹',
    taxRate: 12.0,
    checkInTime: '12:00 PM',
    checkOutTime: '11:00 AM',
    coverImage: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=800&q=80',
    categories: [
      { name: 'Standard', rate: 2100, rooms: ['CV-101', 'CV-102', 'CV-103', 'CV-104'] },
      { name: 'Deluxe City View', rate: 3200, rooms: ['CV-201', 'CV-202', 'CV-203'] },
    ],
  },
  {
    code: 'BLR4521',
    name: 'Airport Gateway Hotel',
    city: 'Bangalore',
    state: 'Karnataka',
    country: 'India',
    address: 'NH 44, Airport Toll Road, Devanahalli',
    phone: '+91 80 6711 4521',
    email: 'stay@airportgateway.com',
    currency: 'INR',
    currencySymbol: '₹',
    taxRate: 12.0,
    checkInTime: '01:00 PM',
    checkOutTime: '11:00 AM',
    coverImage: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=800&q=80',
    categories: [
      { name: 'Transit Room', rate: 1900, rooms: ['AG-101', 'AG-102', 'AG-103', 'AG-104'] },
      { name: 'Business Deluxe', rate: 2900, rooms: ['AG-201', 'AG-202', 'AG-203'] },
    ],
  },
  {
    code: 'BLR4675',
    name: 'Urban Stay Bangalore',
    city: 'Bangalore',
    state: 'Karnataka',
    country: 'India',
    address: '7th Sector, HSR Layout',
    phone: '+91 80 4220 4675',
    email: 'hello@urbanstay.in',
    currency: 'INR',
    currencySymbol: '₹',
    taxRate: 12.0,
    checkInTime: '02:00 PM',
    checkOutTime: '11:00 AM',
    coverImage: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
    categories: [
      { name: 'Urban Studio', rate: 2400, rooms: ['US-101', 'US-102', 'US-103', 'US-104'] },
      { name: 'Urban Suite', rate: 3900, rooms: ['US-201', 'US-202'] },
    ],
  },
  {
    code: 'BLR4890',
    name: 'Park View Residency',
    city: 'Bangalore',
    state: 'Karnataka',
    country: 'India',
    address: 'Near Cubbon Park, Kasturba Road',
    phone: '+91 80 2211 4890',
    email: 'info@parkviewresidency.com',
    currency: 'INR',
    currencySymbol: '₹',
    taxRate: 12.0,
    checkInTime: '12:00 PM',
    checkOutTime: '11:00 AM',
    coverImage: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=800&q=80',
    categories: [
      { name: 'Park View Classic', rate: 2700, rooms: ['PV-101', 'PV-102', 'PV-103'] },
      { name: 'Park Deluxe', rate: 3800, rooms: ['PV-201', 'PV-202'] },
    ],
  },
  {
    code: 'BLR5011',
    name: 'Central Suites Bangalore',
    city: 'Bangalore',
    state: 'Karnataka',
    country: 'India',
    address: 'Koramangala 4th Block',
    phone: '+91 80 4333 5011',
    email: 'suites@centralsuites.in',
    currency: 'INR',
    currencySymbol: '₹',
    taxRate: 12.0,
    checkInTime: '01:00 PM',
    checkOutTime: '11:00 AM',
    coverImage: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80',
    categories: [
      { name: 'Studio Suite', rate: 3100, rooms: ['CS-101', 'CS-102', 'CS-103'] },
      { name: 'Executive Suite', rate: 4600, rooms: ['CS-201', 'CS-202'] },
    ],
  },
  {
    code: 'BLR5188',
    name: 'Lakeside Hotel',
    city: 'Bangalore',
    state: 'Karnataka',
    country: 'India',
    address: 'Ulsoor Lake Promenade, Halasuru',
    phone: '+91 80 2530 5188',
    email: 'lakeside@apexinn.com',
    currency: 'INR',
    currencySymbol: '₹',
    taxRate: 12.0,
    checkInTime: '02:00 PM',
    checkOutTime: '12:00 PM',
    coverImage: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=800&q=80',
    categories: [
      { name: 'Lakeview Classic', rate: 2900, rooms: ['LH-101', 'LH-102', 'LH-103'] },
      { name: 'Lakeview Suite', rate: 4800, rooms: ['LH-201', 'LH-202'] },
    ],
  },
  {
    code: 'BLR5294',
    name: 'The Grand Residency',
    city: 'Bangalore',
    state: 'Karnataka',
    country: 'India',
    address: 'Richmond Circle, Richmond Town',
    phone: '+91 80 4110 5294',
    email: 'stay@grandresidency.in',
    currency: 'INR',
    currencySymbol: '₹',
    taxRate: 18.0,
    checkInTime: '02:00 PM',
    checkOutTime: '11:00 AM',
    coverImage: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=800&q=80',
    categories: [
      { name: 'Grand Deluxe', rate: 3600, rooms: ['GR-101', 'GR-102', 'GR-103'] },
      { name: 'Signature Suite', rate: 6200, rooms: ['GR-201', 'GR-202'] },
    ],
  },
  {
    code: 'BLR5412',
    name: 'Skyline Business Hotel',
    city: 'Bangalore',
    state: 'Karnataka',
    country: 'India',
    address: 'Electronic City Phase 1, Hosur Road',
    phone: '+91 80 6790 5412',
    email: 'business@skylinehotel.in',
    currency: 'INR',
    currencySymbol: '₹',
    taxRate: 12.0,
    checkInTime: '01:00 PM',
    checkOutTime: '11:00 AM',
    coverImage: 'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=800&q=80',
    categories: [
      { name: 'Corporate Standard', rate: 2600, rooms: ['SB-101', 'SB-102', 'SB-103'] },
      { name: 'Business Suite', rate: 4200, rooms: ['SB-201', 'SB-202'] },
    ],
  },
]

export async function ensureInitialData() {
  console.log('⚡ Initializing Multi-Company / Multi-Property PMS database...')

  // 1. Ensure SuperAdmin user
  const adminEmail = 'admin@apexinn.com'
  let admin = await prisma.user.findUnique({ where: { email: adminEmail } })
  if (!admin) {
    const passwordHash = await bcrypt.hash('admin123', 10)
    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        name: 'Umme hani',
        role: 'superadmin',
      },
    })
    console.log('✅ SuperAdmin created: admin@apexinn.com / admin123')
  }

  // 2. Ensure all 12 properties exist with rooms, categories, and sample data
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0)
  const tomorrow = new Date(today.getTime() + 86400000)
  const yesterday = new Date(today.getTime() - 86400000)
  const twoDaysLater = new Date(today.getTime() + 2 * 86400000)
  const threeDaysAgo = new Date(today.getTime() - 3 * 86400000)

  for (const pData of PROPERTIES_DATA) {
    let property = await prisma.property.findUnique({ where: { code: pData.code } })
    if (!property) {
      property = await prisma.property.create({
        data: {
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
      console.log(`  🏨 Created Property: ${property.name} (${property.code})`)
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

    // Seed realistic property-specific sample bookings if empty
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
        const inHouseBooking = await prisma.booking.create({
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

  console.log('✅ Multi-property database initialization completed successfully!')
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
