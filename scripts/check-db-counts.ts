import { prisma } from '../lib/prisma'

async function checkDatabaseStats() {
  const tenants = await prisma.tenant.count()
  const users = await prisma.user.count()
  const properties = await prisma.property.count()
  const categories = await prisma.roomCategory.count()
  const rooms = await prisma.room.count()
  const guests = await prisma.guest.count()
  const bookings = await prisma.booking.count()
  const bookingRooms = await prisma.bookingRoom.count()
  const payments = await prisma.payment.count()
  const paymentConfigs = await prisma.paymentConfig.count()

  console.log('📊 Current Live Database Record Counts:')
  console.log({
    tenants,
    users,
    properties,
    categories,
    rooms,
    guests,
    bookings,
    bookingRooms,
    payments,
    paymentConfigs,
  })
}

checkDatabaseStats()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
