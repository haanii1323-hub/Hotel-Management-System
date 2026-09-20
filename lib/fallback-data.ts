import { PROPERTIES_DATA } from '@/prisma/init'
import { format, subDays, addDays } from 'date-fns'

// Safe date string helper
function getISODate(d: Date, hour = 12): string {
  const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour, 0, 0)
  return dt.toISOString()
}

export function getPropertyData(propertyCodeOrId?: string) {
  if (!propertyCodeOrId) return PROPERTIES_DATA[0]
  const clean = propertyCodeOrId.toLowerCase().replace(/^prop-demo-/, '').trim()
  return (
    PROPERTIES_DATA.find(
      (p) =>
        p.code.toLowerCase() === clean ||
        `prop-demo-${p.code.toLowerCase()}` === propertyCodeOrId.toLowerCase() ||
        p.name.toLowerCase().includes(clean)
    ) || PROPERTIES_DATA[0]
  )
}

export function getFallbackProperties() {
  return PROPERTIES_DATA.map((p, idx) => {
    const totalRooms = p.categories.reduce((sum, c) => sum + c.rooms.length, 0)
    return {
      id: `prop-demo-${p.code.toLowerCase()}`,
      tenantId: 'demo-tenant',
      code: p.code,
      name: p.name,
      city: p.city,
      state: p.state,
      country: p.country,
      address: p.address,
      phone: p.phone,
      email: p.email,
      website: `https://${p.code.toLowerCase()}.apexinn.com`,
      currency: p.currency,
      currencySymbol: p.currencySymbol,
      timezone: 'Asia/Kolkata',
      taxRate: p.taxRate,
      checkInTime: p.checkInTime,
      checkOutTime: p.checkOutTime,
      coverImage: p.coverImage,
      logo: null,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      _count: {
        rooms: totalRooms,
        bookings: 18 + idx * 4,
        categories: p.categories.length,
      },
    }
  })
}

export function getFallbackRooms(propertyCodeOrId?: string) {
  const pData = getPropertyData(propertyCodeOrId)
  const propId = `prop-demo-${pData.code.toLowerCase()}`
  const now = new Date()

  const roomsList: any[] = []
  pData.categories.forEach((cat, catIdx) => {
    cat.rooms.forEach((rNum, rIdx) => {
      // Create a nice distribution of statuses
      const isOccupied = rIdx === 0
      const isCleaning = rIdx === 1
      const isMaintenance = rIdx === 2 && catIdx === 0
      const status = isOccupied
        ? 'Occupied'
        : isCleaning
        ? 'Cleaning'
        : isMaintenance
        ? 'Maintenance'
        : 'Available'

      const guestNames = ['Rahul Sharma', 'Ananya Deshmukh', 'Vikram Seth', 'Pooja Hegde', 'Arjun Kapoor']
      const guestName = guestNames[(catIdx * 3 + rIdx) % guestNames.length]

      roomsList.push({
        id: `room-${pData.code.toLowerCase()}-${rNum}`,
        number: rNum,
        propertyId: propId,
        categoryId: `cat-${pData.code.toLowerCase()}-${cat.name.toLowerCase().replace(/\s+/g, '-')}`,
        category: {
          id: `cat-${pData.code.toLowerCase()}-${cat.name.toLowerCase().replace(/\s+/g, '-')}`,
          name: cat.name,
          nightlyRate: cat.rate,
        },
        status,
        cleaningPriority: isCleaning ? 'High' : 'Normal',
        cleaningNotes: isCleaning ? 'Guest checked out. Clean linens and restock amenities.' : null,
        currentBooking: isOccupied
          ? {
              id: `bkg-${pData.code}-inhouse-${rNum}`,
              bookingRef: `#${pData.code}-${84000 + parseInt(rNum.replace(/\D/g, '') || '10')}`,
              guest: { name: guestName, phone: '+91 98765 43210' },
              checkIn: getISODate(subDays(now, 1)),
              checkOut: getISODate(addDays(now, 2)),
              totalAmount: cat.rate * 3,
            }
          : null,
      })
    })
  })
  return roomsList
}

export function getFallbackBookings(
  propertyCodeOrId?: string,
  statusFilter?: string | null,
  filters?: { search?: string; category?: string; source?: string }
) {
  const pData = getPropertyData(propertyCodeOrId)
  const propId = `prop-demo-${pData.code.toLowerCase()}`
  const now = new Date()

  const rawBookings: any[] = [
    // 1. InHouse Bookings (CheckedIn)
    {
      id: `bkg-${pData.code}-inh-1`,
      bookingRef: `#${pData.code}-7291`,
      propertyId: propId,
      guestId: 'gst-101',
      guest: {
        id: 'gst-101',
        name: 'Rahul Sharma',
        phone: '+91 98450 11223',
        email: 'rahul.sharma@example.com',
        address: 'Indiranagar, Bangalore',
        idProofType: 'Aadhaar',
        idProofNumber: 'XXXX-XXXX-4812',
      },
      source: 'Walk inn',
      roomCategory: pData.categories[0].name,
      roomId: `room-${pData.code.toLowerCase()}-${pData.categories[0].rooms[0]}`,
      checkIn: getISODate(subDays(now, 1)),
      checkOut: getISODate(addDays(now, 1)),
      status: 'CheckedIn',
      numRooms: 1,
      adults: 2,
      kids: 0,
      nightlyRate: pData.categories[0].rate,
      taxAmount: 0,
      discountAmount: 0,
      extraMattressCount: 0,
      extraMattressRate: 500,
      earlyCheckIn: 0,
      lateCheckOut: 0,
      totalAmount: pData.categories[0].rate * 2,
      paidAmount: pData.categories[0].rate * 2,
      paymentStatus: 'Paid',
      notes: 'Requested quiet room away from elevator',
      bookingRooms: [
        {
          id: `br-${pData.code}-1`,
          roomId: `room-${pData.code.toLowerCase()}-${pData.categories[0].rooms[0]}`,
          room: {
            id: `room-${pData.code.toLowerCase()}-${pData.categories[0].rooms[0]}`,
            number: pData.categories[0].rooms[0],
            category: { name: pData.categories[0].name },
          },
        },
      ],
      payments: [
        {
          id: 'pay-1',
          amount: pData.categories[0].rate * 2,
          method: 'UPI',
          notes: 'Advance paid at check-in',
          createdAt: getISODate(subDays(now, 1)),
        },
      ],
      property: {
        id: propId,
        code: pData.code,
        name: pData.name,
        currencySymbol: pData.currencySymbol,
      },
    },
    {
      id: `bkg-${pData.code}-inh-2`,
      bookingRef: `#${pData.code}-7292`,
      propertyId: propId,
      guestId: 'gst-102',
      guest: {
        id: 'gst-102',
        name: 'Dr. Priya Nair',
        phone: '+91 97312 88441',
        email: 'priya.nair@apollo.org',
        address: 'Kochi, Kerala',
        idProofType: 'Passport',
        idProofNumber: 'Z8472910',
      },
      source: 'GOMMT',
      roomCategory: pData.categories[1] ? pData.categories[1].name : pData.categories[0].name,
      roomId: `room-${pData.code.toLowerCase()}-${pData.categories[1] ? pData.categories[1].rooms[0] : pData.categories[0].rooms[1]}`,
      checkIn: getISODate(subDays(now, 2)),
      checkOut: getISODate(now), // Departing Today!
      status: 'CheckedIn',
      numRooms: 1,
      adults: 1,
      kids: 0,
      nightlyRate: pData.categories[1] ? pData.categories[1].rate : pData.categories[0].rate,
      taxAmount: 0,
      discountAmount: 200,
      extraMattressCount: 0,
      extraMattressRate: 500,
      earlyCheckIn: 0,
      lateCheckOut: 0,
      totalAmount: (pData.categories[1] ? pData.categories[1].rate : pData.categories[0].rate) * 2 - 200,
      paidAmount: (pData.categories[1] ? pData.categories[1].rate : pData.categories[0].rate) * 2 - 200,
      paymentStatus: 'Paid',
      notes: 'Medical conference delegate. Flight at 6 PM.',
      bookingRooms: [
        {
          id: `br-${pData.code}-2`,
          roomId: `room-${pData.code.toLowerCase()}-${pData.categories[1] ? pData.categories[1].rooms[0] : pData.categories[0].rooms[1]}`,
          room: {
            id: `room-${pData.code.toLowerCase()}-${pData.categories[1] ? pData.categories[1].rooms[0] : pData.categories[0].rooms[1]}`,
            number: pData.categories[1] ? pData.categories[1].rooms[0] : pData.categories[0].rooms[1],
            category: { name: pData.categories[1] ? pData.categories[1].name : pData.categories[0].name },
          },
        },
      ],
      payments: [
        {
          id: 'pay-2',
          amount: (pData.categories[1] ? pData.categories[1].rate : pData.categories[0].rate) * 2 - 200,
          method: 'Credit Card',
          notes: 'OTA prepaid',
          createdAt: getISODate(subDays(now, 2)),
        },
      ],
      property: {
        id: propId,
        code: pData.code,
        name: pData.name,
        currencySymbol: pData.currencySymbol,
      },
    },

    // 2. Upcoming Bookings (Arriving Today & Later)
    {
      id: `bkg-${pData.code}-up-1`,
      bookingRef: `#${pData.code}-8310`,
      propertyId: propId,
      guestId: 'gst-103',
      guest: {
        id: 'gst-103',
        name: 'Amitabh Sen',
        phone: '+91 99001 55667',
        email: 'amitabh.sen@tcs.com',
        address: 'Salt Lake, Kolkata',
        idProofType: 'Aadhaar',
        idProofNumber: 'XXXX-XXXX-9921',
      },
      source: 'B.COM',
      roomCategory: pData.categories[0].name,
      roomId: null,
      checkIn: getISODate(now), // Arriving Today!
      checkOut: getISODate(addDays(now, 2)),
      status: 'Upcoming',
      numRooms: 1,
      adults: 2,
      kids: 1,
      nightlyRate: pData.categories[0].rate,
      taxAmount: 0,
      discountAmount: 0,
      extraMattressCount: 1,
      extraMattressRate: 500,
      earlyCheckIn: 0,
      lateCheckOut: 0,
      totalAmount: pData.categories[0].rate * 2 + 1000,
      paidAmount: 2000,
      paymentStatus: 'Partial',
      notes: 'Will arrive around 3 PM. Needs extra mattress for child.',
      bookingRooms: [],
      payments: [
        {
          id: 'pay-3',
          amount: 2000,
          method: 'Net Banking',
          notes: 'Deposit received',
          createdAt: getISODate(subDays(now, 3)),
        },
      ],
      property: {
        id: propId,
        code: pData.code,
        name: pData.name,
        currencySymbol: pData.currencySymbol,
      },
    },
    {
      id: `bkg-${pData.code}-up-2`,
      bookingRef: `#${pData.code}-8311`,
      propertyId: propId,
      guestId: 'gst-104',
      guest: {
        id: 'gst-104',
        name: 'Vikram & Sneha Singhal',
        phone: '+91 98110 33445',
        email: 'vikram.singhal@gmail.com',
        address: 'Vasant Vihar, New Delhi',
      },
      source: 'AIRBNB',
      roomCategory: pData.categories[pData.categories.length - 1].name,
      roomId: null,
      checkIn: getISODate(now), // Arriving Today!
      checkOut: getISODate(addDays(now, 3)),
      status: 'Upcoming',
      numRooms: 1,
      adults: 2,
      kids: 0,
      nightlyRate: pData.categories[pData.categories.length - 1].rate,
      taxAmount: 0,
      discountAmount: 500,
      extraMattressCount: 0,
      extraMattressRate: 500,
      earlyCheckIn: 0,
      lateCheckOut: 0,
      totalAmount: pData.categories[pData.categories.length - 1].rate * 3 - 500,
      paidAmount: pData.categories[pData.categories.length - 1].rate * 3 - 500,
      paymentStatus: 'Paid',
      notes: 'Anniversary celebration. Early check-in requested if available.',
      bookingRooms: [],
      payments: [
        {
          id: 'pay-4',
          amount: pData.categories[pData.categories.length - 1].rate * 3 - 500,
          method: 'Airbnb Payout',
          notes: 'Paid via Airbnb',
          createdAt: getISODate(subDays(now, 2)),
        },
      ],
      property: {
        id: propId,
        code: pData.code,
        name: pData.name,
        currencySymbol: pData.currencySymbol,
      },
    },
    {
      id: `bkg-${pData.code}-up-3`,
      bookingRef: `#${pData.code}-8312`,
      propertyId: propId,
      guestId: 'gst-105',
      guest: {
        id: 'gst-105',
        name: 'Sunil Gavaskar',
        phone: '+91 98220 99881',
        email: 'sunil.g@corp.in',
        address: 'Bandra, Mumbai',
      },
      source: 'Corporate',
      roomCategory: pData.categories[0].name,
      roomId: null,
      checkIn: getISODate(addDays(now, 2)), // Arriving later
      checkOut: getISODate(addDays(now, 5)),
      status: 'Upcoming',
      numRooms: 1,
      adults: 1,
      kids: 0,
      nightlyRate: pData.categories[0].rate,
      taxAmount: 0,
      discountAmount: 0,
      extraMattressCount: 0,
      extraMattressRate: 500,
      earlyCheckIn: 0,
      lateCheckOut: 0,
      totalAmount: pData.categories[0].rate * 3,
      paidAmount: 0,
      paymentStatus: 'Pending',
      notes: 'Corporate billing account #CORP-984',
      bookingRooms: [],
      payments: [],
      property: {
        id: propId,
        code: pData.code,
        name: pData.name,
        currencySymbol: pData.currencySymbol,
      },
    },

    // 3. Completed Bookings (CheckedOut)
    {
      id: `bkg-${pData.code}-comp-1`,
      bookingRef: `#${pData.code}-6410`,
      propertyId: propId,
      guestId: 'gst-106',
      guest: {
        id: 'gst-106',
        name: 'Meera Nambiar',
        phone: '+91 98480 77112',
        email: 'meera.nambiar@gmail.com',
        address: 'Chennai, Tamil Nadu',
      },
      source: 'OYO',
      roomCategory: pData.categories[0].name,
      roomId: `room-${pData.code.toLowerCase()}-${pData.categories[0].rooms[1]}`,
      checkIn: getISODate(subDays(now, 4)),
      checkOut: getISODate(subDays(now, 1)),
      status: 'CheckedOut',
      numRooms: 1,
      adults: 2,
      kids: 0,
      nightlyRate: pData.categories[0].rate,
      taxAmount: 0,
      discountAmount: 300,
      extraMattressCount: 0,
      extraMattressRate: 500,
      earlyCheckIn: 0,
      lateCheckOut: 0,
      totalAmount: pData.categories[0].rate * 3 - 300,
      paidAmount: pData.categories[0].rate * 3 - 300,
      paymentStatus: 'Paid',
      notes: 'Smooth checkout, appreciated room cleanliness.',
      bookingRooms: [
        {
          id: `br-${pData.code}-3`,
          roomId: `room-${pData.code.toLowerCase()}-${pData.categories[0].rooms[1]}`,
          room: {
            id: `room-${pData.code.toLowerCase()}-${pData.categories[0].rooms[1]}`,
            number: pData.categories[0].rooms[1],
            category: { name: pData.categories[0].name },
          },
        },
      ],
      payments: [
        {
          id: 'pay-5',
          amount: pData.categories[0].rate * 3 - 300,
          method: 'UPI',
          notes: 'Settled bill at departure',
          createdAt: getISODate(subDays(now, 1)),
        },
      ],
      property: {
        id: propId,
        code: pData.code,
        name: pData.name,
        currencySymbol: pData.currencySymbol,
      },
    },
    {
      id: `bkg-${pData.code}-comp-2`,
      bookingRef: `#${pData.code}-6411`,
      propertyId: propId,
      guestId: 'gst-107',
      guest: {
        id: 'gst-107',
        name: 'Rohan Deshpande',
        phone: '+91 97654 33221',
        email: 'rohan.deshpande@outlook.com',
        address: 'Pune, Maharashtra',
      },
      source: 'Agoda',
      roomCategory: pData.categories[1] ? pData.categories[1].name : pData.categories[0].name,
      roomId: `room-${pData.code.toLowerCase()}-${pData.categories[1] ? pData.categories[1].rooms[1] : pData.categories[0].rooms[2]}`,
      checkIn: getISODate(subDays(now, 5)),
      checkOut: getISODate(subDays(now, 2)),
      status: 'CheckedOut',
      numRooms: 1,
      adults: 1,
      kids: 0,
      nightlyRate: pData.categories[1] ? pData.categories[1].rate : pData.categories[0].rate,
      taxAmount: 0,
      discountAmount: 0,
      extraMattressCount: 0,
      extraMattressRate: 500,
      earlyCheckIn: 0,
      lateCheckOut: 0,
      totalAmount: (pData.categories[1] ? pData.categories[1].rate : pData.categories[0].rate) * 3,
      paidAmount: (pData.categories[1] ? pData.categories[1].rate : pData.categories[0].rate) * 3,
      paymentStatus: 'Paid',
      notes: 'GST invoice requested and emailed.',
      bookingRooms: [
        {
          id: `br-${pData.code}-4`,
          roomId: `room-${pData.code.toLowerCase()}-${pData.categories[1] ? pData.categories[1].rooms[1] : pData.categories[0].rooms[2]}`,
          room: {
            id: `room-${pData.code.toLowerCase()}-${pData.categories[1] ? pData.categories[1].rooms[1] : pData.categories[0].rooms[2]}`,
            number: pData.categories[1] ? pData.categories[1].rooms[1] : pData.categories[0].rooms[2],
            category: { name: pData.categories[1] ? pData.categories[1].name : pData.categories[0].name },
          },
        },
      ],
      payments: [
        {
          id: 'pay-6',
          amount: (pData.categories[1] ? pData.categories[1].rate : pData.categories[0].rate) * 3,
          method: 'Credit Card',
          notes: 'Prepaid voucher',
          createdAt: getISODate(subDays(now, 5)),
        },
      ],
      property: {
        id: propId,
        code: pData.code,
        name: pData.name,
        currencySymbol: pData.currencySymbol,
      },
    },
  ]

  let result = rawBookings

  // Filter by status
  if (statusFilter === 'Upcoming') {
    result = result.filter((b) => b.status === 'Upcoming')
  } else if (statusFilter === 'InHouse' || statusFilter === 'CheckedIn') {
    result = result.filter((b) => b.status === 'CheckedIn')
  } else if (statusFilter === 'Completed' || statusFilter === 'CheckedOut') {
    result = result.filter((b) => ['CheckedOut', 'Cancelled', 'NoShow'].includes(b.status))
  } else if (statusFilter && statusFilter !== 'All') {
    result = result.filter((b) => b.status === statusFilter)
  }

  // Filter by source
  if (filters?.source && filters.source !== 'All') {
    result = result.filter((b) => b.source?.toLowerCase() === filters.source?.toLowerCase())
  }

  // Filter by category
  if (filters?.category && filters.category !== 'All') {
    result = result.filter((b) => b.roomCategory?.toLowerCase() === filters.category?.toLowerCase())
  }

  // Filter by search query
  if (filters?.search && filters.search.trim()) {
    const q = filters.search.trim().toLowerCase().replace(/^#/, '')
    result = result.filter(
      (b) =>
        b.guest?.name?.toLowerCase().includes(q) ||
        b.guest?.phone?.includes(q) ||
        b.guest?.email?.toLowerCase().includes(q) ||
        b.bookingRef?.toLowerCase().includes(q) ||
        b.roomCategory?.toLowerCase().includes(q)
    )
  }

  return result
}

export function getFallbackDashboard(propertyCodeOrId?: string) {
  const pData = getPropertyData(propertyCodeOrId)
  const propId = `prop-demo-${pData.code.toLowerCase()}`
  const now = new Date()
  const todayStr = format(now, 'yyyy-MM-dd')

  const rooms = getFallbackRooms(pData.code)
  const allBookings = getFallbackBookings(pData.code)

  const totalPhysicalRooms = rooms.length
  const totalRooms = totalPhysicalRooms
  const sellableRooms = totalPhysicalRooms
  const occupiedRooms = rooms.filter((r) => r.status === 'Occupied').length
  const cleaningRooms = rooms.filter((r) => r.status === 'Cleaning').length
  const maintenanceRooms = rooms.filter((r) => r.status === 'Maintenance').length
  const availableRooms = Math.max(0, sellableRooms - occupiedRooms - cleaningRooms - maintenanceRooms)
  const occupancy = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0

  const upcomingBookings = allBookings.filter((b) => b.status === 'Upcoming')
  const inHouseBookings = allBookings.filter((b) => b.status === 'CheckedIn')
  const completedBookings = allBookings.filter((b) => ['CheckedOut', 'NoShow', 'Cancelled'].includes(b.status))

  const arrivingToday = upcomingBookings.filter((b) => b.checkIn.slice(0, 10) <= todayStr)
  const departingToday = inHouseBookings.filter((b) => b.checkOut.slice(0, 10) <= todayStr)

  const roomCategoryStats = pData.categories.map((cat) => {
    const catRooms = rooms.filter((r) => r.category.name === cat.name)
    const catOccupied = catRooms.filter((r) => r.status === 'Occupied').length
    const catOcc = catRooms.length > 0 ? Math.round((catOccupied / catRooms.length) * 100) : 0
    const estRevenue = (catOccupied + 2) * cat.rate

    return {
      id: `cat-${pData.code.toLowerCase()}-${cat.name.toLowerCase().replace(/\s+/g, '-')}`,
      name: cat.name,
      nightlyRate: cat.rate,
      totalRooms: catRooms.length,
      availableRooms: catRooms.filter((r) => r.status === 'Available').length,
      occupiedRooms: catOccupied,
      cleaningRooms: catRooms.filter((r) => r.status === 'Cleaning').length,
      maintenanceRooms: catRooms.filter((r) => r.status === 'Maintenance').length,
      occupancy: catOcc,
      revenue: estRevenue,
    }
  })

  const totalRevenue = allBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0)
  const collectedToday = allBookings.reduce((sum, b) => sum + (b.paidAmount || 0), 0)

  return {
    hasProperties: true,
    totalProperties: 3,
    property: {
      id: propId,
      code: pData.code,
      name: pData.name,
      city: pData.city,
      currencySymbol: pData.currencySymbol,
      taxRate: pData.taxRate,
      checkInTime: pData.checkInTime,
      checkOutTime: pData.checkOutTime,
    },
    kpis: {
      totalProperties: 3,
      totalPhysicalRooms,
      totalRooms,
      sellableRooms,
      bookedRoomsToday: occupiedRooms,
      availableRooms,
      occupiedRooms,
      cleaningRooms,
      maintenanceRooms,
      outOfServiceRooms: 0,
      overbookedRooms: 0,
      isOverbooked: false,
      overbookingStatus: 'OPTIMAL',
      arrivingTodayCount: arrivingToday.length,
      inHouseCount: inHouseBookings.length,
      departingTodayCount: departingToday.length,
      totalBookings: allBookings.length,
      occupancy,
      totalRevenue,
      collectedToday,
      directRevenue: Math.round(totalRevenue * 0.58),
      otaRevenue: Math.round(totalRevenue * 0.42),
      avgDailyRate: Math.round(pData.categories.reduce((sum, c) => sum + c.rate, 0) / pData.categories.length),
      revPar: Math.round((totalRevenue / (totalRooms || 1)) * (occupancy / 100)),
    },
    roomCategoryStats,
    arrivingToday,
    departingToday,
    inHouseBookings,
    upcomingBookings,
    recentBookings: allBookings.slice(0, 10),
  }
}

export function getFallbackEarnings(propertyCodeOrId?: string) {
  const pData = getPropertyData(propertyCodeOrId)
  const allBookings = getFallbackBookings(pData.code)

  const totalRevenue = allBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0)
  const collectedToday = allBookings.reduce((sum, b) => sum + (b.paidAmount || 0), 0)
  const pendingAmount = Math.max(0, totalRevenue - collectedToday)

  const channelBreakdown = [
    { source: 'Walk inn', bookings: 4, revenue: Math.round(totalRevenue * 0.35), share: 35 },
    { source: 'GOMMT', bookings: 3, revenue: Math.round(totalRevenue * 0.25), share: 25 },
    { source: 'B.COM', bookings: 2, revenue: Math.round(totalRevenue * 0.2), share: 20 },
    { source: 'AIRBNB', bookings: 2, revenue: Math.round(totalRevenue * 0.12), share: 12 },
    { source: 'OYO', bookings: 1, revenue: Math.round(totalRevenue * 0.08), share: 8 },
  ]

  return {
    kpis: {
      totalRevenue,
      collectedToday,
      pendingAmount,
      totalBookings: allBookings.length,
      avgBookingValue: Math.round(totalRevenue / (allBookings.length || 1)),
    },
    channelBreakdown,
    recentTransactions: allBookings.flatMap((b) =>
      (b.payments || []).map((p: any) => ({
        id: p.id,
        bookingRef: b.bookingRef,
        guestName: b.guest?.name || 'Guest',
        amount: p.amount,
        method: p.method,
        date: p.createdAt,
        notes: p.notes,
      }))
    ),
  }
}

export function getFallbackReports(propertyCodeOrId?: string) {
  const pData = getPropertyData(propertyCodeOrId)
  const dashboard = getFallbackDashboard(pData.code)
  const earnings = getFallbackEarnings(pData.code)

  return {
    property: dashboard.property,
    kpis: dashboard.kpis,
    roomCategoryStats: dashboard.roomCategoryStats,
    channelBreakdown: earnings.channelBreakdown,
  }
}

export function getFallbackGuests(propertyCodeOrId?: string) {
  const pData = getPropertyData(propertyCodeOrId)
  const bookings = getFallbackBookings(pData.code)

  return bookings.map((b) => ({
    id: b.guest.id,
    name: b.guest.name,
    phone: b.guest.phone,
    email: b.guest.email,
    address: b.guest.address,
    idProofType: b.guest.idProofType,
    idProofNumber: b.guest.idProofNumber,
    lastBookingRef: b.bookingRef,
    lastStay: b.checkIn,
    totalStays: 1,
    totalSpent: b.totalAmount,
    propertyId: b.propertyId,
  }))
}
