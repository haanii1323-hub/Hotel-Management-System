import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('⚡ Initializing database (preserving existing user bookings & records)...')

  // 1. Ensure Admin User exists
  const existingUser = await prisma.user.findUnique({
    where: { email: 'admin@apexinn.com' },
  })

  if (!existingUser) {
    const passwordHash = await bcrypt.hash('admin123', 10)
    await prisma.user.create({
      data: {
        email: 'admin@apexinn.com',
        passwordHash,
        name: 'Admin',
        role: 'admin',
      },
    })
    console.log('✅ Admin user created (admin@apexinn.com / admin123)')
  } else {
    console.log('✅ Admin user ready')
  }

  // 2. Ensure Room Categories exist
  const categoriesData = [
    { name: 'Deluxe', nightlyRate: 800, totalRooms: 5 },
    { name: 'Classic', nightlyRate: 1896, totalRooms: 8 },
    { name: 'Suite', nightlyRate: 3900, totalRooms: 2 },
  ]

  const categories: Record<string, any> = {}
  for (const cat of categoriesData) {
    const existing = await prisma.roomCategory.findUnique({
      where: { name: cat.name },
    })
    if (!existing) {
      categories[cat.name] = await prisma.roomCategory.create({ data: cat })
    } else {
      categories[cat.name] = existing
    }
  }
  console.log('✅ Categories verified')

  // 3. Ensure All 15 Rooms exist
  const roomsData = [
    { number: 'DELUXE_001', category: 'Deluxe' },
    { number: 'DELUXE_1', category: 'Deluxe' },
    { number: 'DELUXE_2', category: 'Deluxe' },
    { number: 'DELUXE_3', category: 'Deluxe' },
    { number: 'DELUXE_4', category: 'Deluxe' },
    { number: 'CLASSIC_1', category: 'Classic' },
    { number: 'CLASSIC_2', category: 'Classic' },
    { number: 'CLASSIC_3', category: 'Classic' },
    { number: 'CLASSIC_4', category: 'Classic' },
    { number: 'CLASSIC_5', category: 'Classic' },
    { number: 'CLASSIC_6', category: 'Classic' },
    { number: 'CLASSIC_7', category: 'Classic' },
    { number: 'CLASSIC_8', category: 'Classic' },
    { number: 'SUITE_1', category: 'Suite' },
    { number: 'SUITE_2', category: 'Suite' },
  ]

  for (const r of roomsData) {
    const existing = await prisma.room.findUnique({
      where: { number: r.number },
    })
    if (!existing) {
      await prisma.room.create({
        data: {
          number: r.number,
          categoryId: categories[r.category].id,
          status: 'Available',
        },
      })
    }
  }
  console.log('✅ Room inventory verified (existing bookings preserved)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
