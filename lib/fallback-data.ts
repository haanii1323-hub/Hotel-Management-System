import { PROPERTIES_DATA } from '@/prisma/init'
import { format, subDays, addDays } from 'date-fns'

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
  const pData =
    PROPERTIES_DATA.find(
      (p) =>
        p.code.toLowerCase() === propertyCodeOrId?.toLowerCase() ||
        `prop-demo-${p.code.toLowerCase()}` === propertyCodeOrId
    ) || PROPERTIES_DATA[0]

  const roomsList: any[] = []
  pData.categories.forEach((cat, catIdx) => {
    cat.rooms.forEach((rNum, rIdx) => {
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

      roomsList.push({
        id: `room-${pData.code.toLowerCase()}-${rNum}`,
        number: rNum,
        propertyId: `prop-demo-${pData.code.toLowerCase()}`,
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
              id: `bkg-${pData.code}-1`,
              bookingRef: `#${pData.code}-84920`,
              guest: { name: 'Rahul Sharma', phone: '+91 98765 43210' },
              checkIn: format(subDays(new Date(), 1), 'yyyy-MM-dd'),
              checkOut: format(addDays(new Date(), 2), 'yyyy-MM-dd'),
              totalAmount: cat.rate * 3,
            }
          : null,
      })
    })
  })
  return roomsList
}

export function getFallbackDashboard(propertyCodeOrId?: string) {
  const pData =
    PROPERTIES_DATA.find(
      (p) =>
        p.code.toLowerCase() === propertyCodeOrId?.toLowerCase() ||
        `prop-demo-${p.code.toLowerCase()}` === propertyCodeOrId
    ) || PROPERTIES_DATA[0]

  const rooms = getFallbackRooms(pData.code)
  const totalRooms = rooms.length
  const occupiedRooms = rooms.filter((r) => r.status === 'Occupied').length
  const cleaningRooms = rooms.filter((r) => r.status === 'Cleaning').length
  const maintenanceRooms = rooms.filter((r) => r.status === 'Maintenance').length
  const availableRooms = rooms.filter((r) => r.status === 'Available').length
  const occupancy = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0

  const roomCategoryStats = pData.categories.map((cat, idx) => {
    const catRooms = rooms.filter((r) => r.category.name === cat.name)
    const catOccupied = catRooms.filter((r) => r.status === 'Occupied').length
    const catOcc = catRooms.length > 0 ? Math.round((catOccupied / catRooms.length) * 100) : 0
    const estRevenue = (catOccupied + 2) * cat.rate

    return {
      id: `cat-${pData.code.toLowerCase()}-${cat.name.toLowerCase()}`,
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

  return {
    hasProperties: true,
    totalProperties: 3,
    property: {
      id: `prop-demo-${pData.code.toLowerCase()}`,
      code: pData.code,
      name: pData.name,
      currencySymbol: pData.currencySymbol,
      checkInTime: pData.checkInTime,
      checkOutTime: pData.checkOutTime,
    },
    kpis: {
      totalProperties: 3,
      totalRooms,
      availableRooms,
      occupiedRooms,
      cleaningRooms,
      maintenanceRooms,
      outOfServiceRooms: 0,
      arrivingTodayCount: 4,
      inHouseCount: occupiedRooms,
      departingTodayCount: 2,
      totalBookings: 19,
      occupancy,
      totalRevenue: roomCategoryStats.reduce((sum, c) => sum + c.revenue, 0),
      directRevenue: Math.round(roomCategoryStats.reduce((sum, c) => sum + c.revenue, 0) * 0.58),
      otaRevenue: Math.round(roomCategoryStats.reduce((sum, c) => sum + c.revenue, 0) * 0.42),
      avgDailyRate: Math.round(pData.categories.reduce((sum, c) => sum + c.rate, 0) / pData.categories.length),
      revPar: Math.round(
        (roomCategoryStats.reduce((sum, c) => sum + c.revenue, 0) / (totalRooms || 1)) * (occupancy / 100)
      ),
    },
    roomCategoryStats,
    recentBookings: [
      {
        id: 'bkg-1',
        bookingRef: `#${pData.code}-90214`,
        guest: { name: 'Aditya Verma', phone: '+91 98450 11223' },
        source: 'Walk Inn',
        roomCategory: pData.categories[0].name,
        roomNumber: pData.categories[0].rooms[0],
        checkIn: format(new Date(), 'yyyy-MM-dd'),
        checkOut: format(addDays(new Date(), 2), 'yyyy-MM-dd'),
        totalAmount: pData.categories[0].rate * 2,
        paidAmount: pData.categories[0].rate * 2,
        status: 'CheckedIn',
      },
      {
        id: 'bkg-2',
        bookingRef: `#${pData.code}-90215`,
        guest: { name: 'Pooja Hegde', phone: '+91 97312 44556' },
        source: 'Booking.com',
        roomCategory: pData.categories[1] ? pData.categories[1].name : pData.categories[0].name,
        roomNumber: pData.categories[1] ? pData.categories[1].rooms[0] : pData.categories[0].rooms[1],
        checkIn: format(new Date(), 'yyyy-MM-dd'),
        checkOut: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
        totalAmount: pData.categories[1] ? pData.categories[1].rate : pData.categories[0].rate,
        paidAmount: pData.categories[1] ? pData.categories[1].rate : pData.categories[0].rate,
        status: 'Confirmed',
      },
      {
        id: 'bkg-3',
        bookingRef: `#${pData.code}-90216`,
        guest: { name: 'Karthik Rao', phone: '+91 99001 99887' },
        source: 'Agoda',
        roomCategory: pData.categories[0].name,
        roomNumber: pData.categories[0].rooms[2],
        checkIn: format(subDays(new Date(), 2), 'yyyy-MM-dd'),
        checkOut: format(subDays(new Date(), 1), 'yyyy-MM-dd'),
        totalAmount: pData.categories[0].rate,
        paidAmount: pData.categories[0].rate,
        status: 'CheckedOut',
      },
    ],
  }
}
