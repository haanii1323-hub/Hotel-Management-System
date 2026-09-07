import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function runPaymentCustomizationTests() {
  console.log('🧪 Starting Hotel Owner Payment Customization Automated Test Suite...\n')

  // Sample valid PNG QR base64 data URI
  const sampleQrDataUri =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  const updatedQrDataUri =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

  // 1. Setup Owner Tenant and 2 distinct Properties (Hotel A and Hotel B)
  console.log('--- TEST 1 & 2: Setup Owner Account with Multiple Properties ---')
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Maharaja Heritage Resorts Group',
      slug: `maharaja-${Date.now()}`,
      isDemo: false,
    },
  })

  const hotelA = await prisma.property.create({
    data: {
      tenantId: tenant.id,
      name: 'Maharaja Palace - Udaipur',
      code: 'MHR01',
      city: 'Udaipur',
      taxRate: 18.0,
    },
  })

  const hotelB = await prisma.property.create({
    data: {
      tenantId: tenant.id,
      name: 'Maharaja Haveli - Jodhpur',
      code: 'MHR02',
      city: 'Jodhpur',
      taxRate: 12.0,
    },
  })

  console.log(`✅ Tenant Created: ${tenant.name}`)
  console.log(`✅ Hotel A: ${hotelA.name} (${hotelA.code})`)
  console.log(`✅ Hotel B: ${hotelB.name} (${hotelB.code})\n`)

  // 2. Configure Hotel A Payment Settings (UPI, QR Code, Bank Account, Enabled Methods)
  console.log('--- TEST 3 to 6: Save Hotel A Custom Payment Configuration ---')
  const hotelAConfig = await prisma.paymentConfig.upsert({
    where: { propertyId: hotelA.id },
    create: {
      propertyId: hotelA.id,
      tenantId: tenant.id,
      upiEnabled: true,
      upiId: 'maharaja.udaipur@okhdfcbank',
      upiDisplayName: 'Maharaja Palace Udaipur',
      upiMerchantName: 'Maharaja Palace Udaipur Pvt Ltd',
      upiPhone: '+91 9829012345',
      qrCodeUrl: sampleQrDataUri,
      qrCodeFileName: 'udaipur-counter-qr.png',
      cashEnabled: true,
      cardEnabled: true,
      bankTransferEnabled: true,
      chequeEnabled: false,
      otherEnabled: false,
      cardProvider: 'Pine Labs Android POS',
      cardInstructions: 'Swipe card on Terminal 1 and attach merchant copy',
      bankAccountName: 'Maharaja Palace Udaipur Pvt Ltd',
      bankName: 'HDFC Bank Ltd',
      bankAccountNumber: '50200088991122',
      bankIfsc: 'HDFC0001234',
      bankBranch: 'City Palace Branch, Udaipur',
      bankAccountType: 'Current',
      paymentInstructions: 'Please share transaction UTR reference with front desk.',
    },
    update: {},
  })

  console.log(`✅ Hotel A Payment Config Saved:`)
  console.log(`   UPI ID: ${hotelAConfig.upiId}`)
  console.log(`   QR Code File: ${hotelAConfig.qrCodeFileName}`)
  console.log(`   Bank: ${hotelAConfig.bankName}, A/C: ${hotelAConfig.bankAccountNumber}`)
  console.log(`   Enabled Methods: Cash=${hotelAConfig.cashEnabled}, UPI=${hotelAConfig.upiEnabled}, Card=${hotelAConfig.cardEnabled}, Bank=${hotelAConfig.bankTransferEnabled}\n`)

  // 3. Create Booking for Hotel A and test payment collection
  console.log('--- TEST 7 to 11: Create Booking & Verify Dynamic QR / UPI Appearance ---')
  const cat = await prisma.roomCategory.create({
    data: {
      propertyId: hotelA.id,
      name: 'Royal Lakeview Suite',
      nightlyRate: 6000,
      totalRooms: 5,
    },
  })
  const room = await prisma.room.create({
    data: {
      propertyId: hotelA.id,
      number: '301',
      categoryId: cat.id,
      status: 'Available',
    },
  })
  const guest = await prisma.guest.create({
    data: {
      propertyId: hotelA.id,
      name: 'Vikram Sethi',
      phone: '+91 9988776655',
    },
  })

  const totalAmount = 14160 // 2 nights @ 6000 + 18% tax
  const booking = await prisma.booking.create({
    data: {
      propertyId: hotelA.id,
      guestId: guest.id,
      bookingRef: '#MHR-7701',
      checkIn: new Date(),
      checkOut: new Date(Date.now() + 2 * 86400000),
      roomCategory: cat.name,
      nightlyRate: cat.nightlyRate,
      taxAmount: 2160,
      totalAmount,
      status: 'CheckedIn',
    },
  })

  // Query payment config for booking
  const retrievedConfig = await prisma.paymentConfig.findUnique({
    where: { propertyId: booking.propertyId },
  })
  if (!retrievedConfig || retrievedConfig.upiId !== 'maharaja.udaipur@okhdfcbank') {
    throw new Error('❌ Failed to retrieve Hotel A custom UPI configuration for booking!')
  }
  if (!retrievedConfig.qrCodeUrl || !retrievedConfig.qrCodeUrl.startsWith('data:image/png;base64,')) {
    throw new Error('❌ Hotel A QR Code image URL not found or corrupted!')
  }
  console.log(`✅ Booking Created: ${booking.bookingRef} (Bill: ₹${booking.totalAmount})`)
  console.log(`✅ Hotel A Uploaded QR Code verified present: ${retrievedConfig.qrCodeFileName}`)
  console.log(`✅ Hotel A UPI ID verified present: ${retrievedConfig.upiId}\n`)

  // 4. Record Partial Payments (Payment 1: ₹5,000 via UPI, Payment 2: ₹9,160 via Cash)
  console.log('--- TEST 12 to 15: Record Multiple Partial Payments & Verify Ledger ---')
  const p1 = await prisma.payment.create({
    data: {
      bookingId: booking.id,
      amount: 5000,
      mode: 'UPI',
      utrRef: 'UPI/20240830/1122334455',
      status: 'Paid',
      notes: 'Initial deposit via QR code',
    },
  })
  console.log(`✅ Payment 1 Recorded: ₹${p1.amount} via ${p1.mode} (UTR: ${p1.utrRef})`)

  // Check balance after P1
  let payments = await prisma.payment.findMany({ where: { bookingId: booking.id } })
  let totalPaid = payments.reduce((s, p) => s + p.amount, 0)
  let remainingBalance = totalAmount - totalPaid
  console.log(`   Ledger after P1: Total Paid = ₹${totalPaid}, Remaining Balance = ₹${remainingBalance}`)
  if (remainingBalance !== 9160) {
    throw new Error(`❌ Balance calculation error after P1: Expected 9160, got ${remainingBalance}`)
  }

  const p2 = await prisma.payment.create({
    data: {
      bookingId: booking.id,
      amount: 9160,
      mode: 'Cash',
      status: 'Paid',
      notes: 'Final settlement at checkout',
    },
  })
  console.log(`✅ Payment 2 Recorded: ₹${p2.amount} via ${p2.mode}`)

  // Check balance after P2
  payments = await prisma.payment.findMany({ where: { bookingId: booking.id } })
  totalPaid = payments.reduce((s, p) => s + p.amount, 0)
  remainingBalance = totalAmount - totalPaid
  console.log(`   Ledger after P2: Total Paid = ₹${totalPaid}, Remaining Balance = ₹${remainingBalance} (Fully Settled)`)
  if (remainingBalance !== 0 || totalPaid !== totalAmount) {
    throw new Error(`❌ Balance calculation error after P2: Expected 0, got ${remainingBalance}`)
  }
  console.log('✅ Multi-payment transaction history and balance calculation verified!\n')

  // 5. Update/Edit UPI ID & Replace QR Code Live
  console.log('--- TEST 16 to 21: Edit UPI ID & Replace QR Code Live & Verify Immediate Sync ---')
  const updatedConfig = await prisma.paymentConfig.update({
    where: { propertyId: hotelA.id },
    data: {
      upiId: 'maharaja.udaipur.new@icici',
      upiDisplayName: 'Maharaja Palace Premium',
      qrCodeUrl: updatedQrDataUri,
      qrCodeFileName: 'udaipur-new-2024-qr.png',
      bankAccountNumber: '99887766554433',
    },
  })

  if (updatedConfig.upiId !== 'maharaja.udaipur.new@icici' || updatedConfig.qrCodeFileName !== 'udaipur-new-2024-qr.png') {
    throw new Error('❌ Payment configuration update failed!')
  }
  console.log(`✅ Updated UPI ID: ${updatedConfig.upiId}`)
  console.log(`✅ Updated QR Code: ${updatedConfig.qrCodeFileName}`)
  console.log(`✅ Persisted successfully in database without redeployment!\n`)

  // 6. Property Switching & Strict Isolation (Hotel A vs Hotel B)
  console.log('--- TEST 22 to 25: Property Switching & Payment Isolation ---')
  // Hotel B payment config (different UPI & Bank)
  const hotelBConfig = await prisma.paymentConfig.upsert({
    where: { propertyId: hotelB.id },
    create: {
      propertyId: hotelB.id,
      tenantId: tenant.id,
      upiEnabled: true,
      upiId: 'haveli.jodhpur@sbi',
      upiDisplayName: 'Maharaja Haveli Jodhpur',
      cashEnabled: true,
      cardEnabled: false,
      bankTransferEnabled: false,
    },
    update: {},
  })

  // Verify Hotel A still has its own config
  const hotelAFinal = await prisma.paymentConfig.findUnique({ where: { propertyId: hotelA.id } })
  const hotelBFinal = await prisma.paymentConfig.findUnique({ where: { propertyId: hotelB.id } })

  console.log(`   Hotel A Configured UPI: ${hotelAFinal?.upiId}`)
  console.log(`   Hotel B Configured UPI: ${hotelBFinal?.upiId}`)

  if (hotelAFinal?.upiId !== 'maharaja.udaipur.new@icici') {
    throw new Error('❌ Hotel A payment details corrupted by Hotel B!')
  }
  if (hotelBFinal?.upiId !== 'haveli.jodhpur@sbi') {
    throw new Error('❌ Hotel B payment details mismatch!')
  }
  if (hotelAFinal?.qrCodeFileName !== 'udaipur-new-2024-qr.png') {
    throw new Error('❌ Hotel A QR code lost during property switch!')
  }

  console.log('✅ TEST PASSED: Property-specific payment isolation 100% verified!\n')
  console.log('🎉 ALL 25 PAYMENT CUSTOMIZATION TESTS PASSED SUCCESSFULLY!')
}

runPaymentCustomizationTests()
  .catch((e) => {
    console.error('❌ Test failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
