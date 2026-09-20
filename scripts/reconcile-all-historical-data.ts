import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'
import {
  getFallbackProperties,
  getFallbackRooms,
  getFallbackBookings,
  getFallbackGuests,
} from '../lib/fallback-data'

interface MasterDataset {
  meta: {
    generatedAt: string
    version: string
    sources: string[]
  }
  counts: Record<string, number>
  data: {
    tenants: any[]
    properties: any[]
    users: any[]
    categories: any[]
    rooms: any[]
    guests: any[]
    bookings: any[]
    bookingRooms: any[]
    payments: any[]
    invoices: any[]
    paymentConfigs: any[]
    roomStatusLogs: any[]
    bookingStatusLogs: any[]
  }
}

async function reconcileAllHistoricalData() {
  console.log('🔍 ========================================================')
  console.log('🚀 HISTORICAL DATA RECONCILIATION & MASTER ARCHIVE BUILDER')
  console.log('🔍 ========================================================\n')

  const sourcesUsed: string[] = []

  // 1. Source A: JSON Backup (backup-latest.json)
  const backupPath = path.join(__dirname, '../backups/backup-latest.json')
  let jsonBackupData: any = null
  if (fs.existsSync(backupPath)) {
    console.log(`📂 [Source 1] Loading JSON Backup: ${backupPath}`)
    jsonBackupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8')).data
    sourcesUsed.push('backups/backup-latest.json')
    console.log(`   ✓ Found ${jsonBackupData.bookings?.length || 0} Bookings, ${jsonBackupData.guests?.length || 0} Guests, ${jsonBackupData.rooms?.length || 0} Rooms`)
  }

  // 2. Source B: SQLite V1 dev.db
  const sqliteDbPath = path.join(__dirname, '../prisma/dev.db')
  const sqliteData: any = {
    users: [],
    categories: [],
    rooms: [],
    guests: [],
    bookings: [],
    bookingRooms: [],
    payments: [],
    invoices: [],
    roomStatusLogs: [],
    bookingStatusLogs: [],
  }

  if (fs.existsSync(sqliteDbPath)) {
    console.log(`\n📂 [Source 2] Reading SQLite V1 Database: ${sqliteDbPath}`)
    sourcesUsed.push('prisma/dev.db')
    try {
      const tables = ['User', 'RoomCategory', 'Room', 'Guest', 'Booking', 'BookingRoom', 'Payment', 'Invoice', 'RoomStatusLog', 'BookingStatusLog']
      for (const t of tables) {
        const selectCols = getTableColumns(t)
        const raw = execSync(`sqlite3 "${sqliteDbPath}" "SELECT json_group_array(json_object(${selectCols})) FROM ${t};"`, { encoding: 'utf-8' }).trim()
        if (raw && raw !== '[]') {
          const parsed = JSON.parse(raw)
          const key = mapTableToKey(t)
          sqliteData[key] = parsed
          console.log(`   ✓ Extracted ${parsed.length} records from SQLite ${t}`)
        }
      }
    } catch (err: any) {
      console.warn(`   ⚠️ SQLite extraction warning: ${err.message}`)
    }
  }

  // 3. Source C: Fallback Data Layer (Current live production properties and demo dataset)
  console.log('\n📂 [Source 3] Loading Fallback Multi-Property Data Layer (BLR3396, BLR3630, BLR4012)...')
  sourcesUsed.push('lib/fallback-data.ts')
  const fallbackProps = getFallbackProperties()
  const fallbackRooms = [
    ...getFallbackRooms('prop-demo-blr3396'),
    ...getFallbackRooms('prop-demo-blr3630'),
    ...getFallbackRooms('prop-demo-blr4012'),
  ]
  const fallbackGuests = [
    ...getFallbackGuests('prop-demo-blr3396'),
    ...getFallbackGuests('prop-demo-blr3630'),
    ...getFallbackGuests('prop-demo-blr4012'),
  ]
  const fallbackBookings = [
    ...getFallbackBookings('prop-demo-blr3396'),
    ...getFallbackBookings('prop-demo-blr3630'),
    ...getFallbackBookings('prop-demo-blr4012'),
  ]
  console.log(`   ✓ Found ${fallbackProps.length} Properties, ${fallbackRooms.length} Rooms, ${fallbackGuests.length} Guests, ${fallbackBookings.length} Bookings`)

  // =========================================================================
  // RECONCILIATION & UNION MERGE (Topological Order with Zero Data Loss)
  // =========================================================================
  console.log('\n🔄 Merging and reconciling all historical records into Master Archive...')

  const tenantsMap = new Map<string, any>()
  const propertiesMap = new Map<string, any>()
  const usersMap = new Map<string, any>()
  const categoriesMap = new Map<string, any>()
  const roomsMap = new Map<string, any>()
  const guestsMap = new Map<string, any>()
  const bookingsMap = new Map<string, any>()
  const bookingRoomsMap = new Map<string, any>()
  const paymentsMap = new Map<string, any>()
  const invoicesMap = new Map<string, any>()
  const paymentConfigsMap = new Map<string, any>()
  const roomStatusLogsMap = new Map<string, any>()
  const bookingStatusLogsMap = new Map<string, any>()

  // 1. Tenants
  if (jsonBackupData?.tenants) {
    for (const t of jsonBackupData.tenants) {
      tenantsMap.set(t.id, { ...t, origin: 'backup_json' })
    }
  }
  if (!tenantsMap.has('demo-tenant')) {
    tenantsMap.set('demo-tenant', {
      id: 'demo-tenant',
      name: 'Demo Hospitality Group',
      slug: 'demo',
      isDemo: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      origin: 'init',
    })
  }

  // 2. Properties
  if (jsonBackupData?.properties) {
    for (const p of jsonBackupData.properties) {
      propertiesMap.set(p.id, { ...p, origin: 'backup_json' })
    }
  }
  for (const fp of fallbackProps) {
    if (!propertiesMap.has(fp.id)) {
      propertiesMap.set(fp.id, { ...fp, origin: 'fallback_data' })
    }
  }

  // 3. Users
  if (jsonBackupData?.users) {
    for (const u of jsonBackupData.users) {
      usersMap.set(u.id, { ...u, origin: 'backup_json' })
    }
  }
  for (const su of sqliteData.users) {
    const id = su.id || `sqlite-user-${su.email}`
    if (!usersMap.has(id)) {
      usersMap.set(id, {
        ...su,
        id,
        tenantId: su.tenantId || 'demo-tenant',
        origin: 'sqlite_v1',
      })
    }
  }

  // 4. Room Categories
  if (jsonBackupData?.categories) {
    for (const c of jsonBackupData.categories) {
      categoriesMap.set(c.id, { ...c, origin: 'backup_json' })
    }
  }
  for (const sc of sqliteData.categories) {
    const id = sc.id || `sqlite-cat-${sc.name}`
    if (!categoriesMap.has(id)) {
      categoriesMap.set(id, {
        ...sc,
        id,
        rate: sc.nightlyRate || sc.rate || 2000,
        propertyId: sc.propertyId || 'prop-demo-blr3396',
        origin: 'sqlite_v1',
      })
    }
  }

  // 5. Rooms
  if (jsonBackupData?.rooms) {
    for (const r of jsonBackupData.rooms) {
      roomsMap.set(r.id, { ...r, origin: 'backup_json' })
    }
  }
  for (const sr of sqliteData.rooms) {
    const id = sr.id || `sqlite-room-${sr.number}`
    if (!roomsMap.has(id)) {
      roomsMap.set(id, {
        ...sr,
        id,
        propertyId: sr.propertyId || 'prop-demo-blr3396',
        floor: sr.floor || 1,
        bedType: sr.bedType || 'King Bed',
        origin: 'sqlite_v1',
      })
    }
  }
  for (const fr of fallbackRooms) {
    if (!roomsMap.has(fr.id)) {
      roomsMap.set(fr.id, { ...fr, origin: 'fallback_data' })
    }
  }

  // 6. Guests
  if (jsonBackupData?.guests) {
    for (const g of jsonBackupData.guests) {
      guestsMap.set(g.id, { ...g, origin: 'backup_json' })
    }
  }
  for (const sg of sqliteData.guests) {
    const id = sg.id || `sqlite-guest-${sg.phone || sg.name}`
    if (!guestsMap.has(id)) {
      guestsMap.set(id, {
        ...sg,
        id,
        propertyId: sg.propertyId || 'prop-demo-blr3396',
        origin: 'sqlite_v1',
      })
    }
  }
  for (const fg of fallbackGuests) {
    if (!guestsMap.has(fg.id)) {
      guestsMap.set(fg.id, { ...fg, origin: 'fallback_data' })
    }
  }

  // 7. Bookings
  if (jsonBackupData?.bookings) {
    for (const b of jsonBackupData.bookings) {
      bookingsMap.set(b.id, { ...b, origin: 'backup_json' })
    }
  }
  for (const sb of sqliteData.bookings) {
    const id = sb.id || `sqlite-booking-${sb.bookingRef}`
    if (!bookingsMap.has(id)) {
      bookingsMap.set(id, {
        ...sb,
        id,
        propertyId: sb.propertyId || 'prop-demo-blr3396',
        tenantId: sb.tenantId || 'demo-tenant',
        origin: 'sqlite_v1',
      })
    }
  }
  for (const fb of fallbackBookings) {
    if (!bookingsMap.has(fb.id)) {
      bookingsMap.set(fb.id, { ...fb, origin: 'fallback_data' })
    }
  }

  // 8. BookingRooms
  if (jsonBackupData?.bookingRooms) {
    for (const br of jsonBackupData.bookingRooms) {
      bookingRoomsMap.set(br.id, { ...br, origin: 'backup_json' })
    }
  }
  for (const sbr of sqliteData.bookingRooms) {
    const id = sbr.id || `sqlite-br-${sbr.bookingId}-${sbr.roomId}`
    if (!bookingRoomsMap.has(id)) {
      bookingRoomsMap.set(id, { ...sbr, id, origin: 'sqlite_v1' })
    }
  }

  // 9. Payments
  if (jsonBackupData?.payments) {
    for (const p of jsonBackupData.payments) {
      paymentsMap.set(p.id, { ...p, origin: 'backup_json' })
    }
  }
  for (const sp of sqliteData.payments) {
    const id = sp.id || `sqlite-payment-${sp.bookingId}`
    if (!paymentsMap.has(id)) {
      paymentsMap.set(id, {
        ...sp,
        id,
        propertyId: sp.propertyId || 'prop-demo-blr3396',
        origin: 'sqlite_v1',
      })
    }
  }

  // 10. Invoices
  if (jsonBackupData?.invoices) {
    for (const inv of jsonBackupData.invoices) {
      invoicesMap.set(inv.id, { ...inv, origin: 'backup_json' })
    }
  }
  for (const sinv of sqliteData.invoices) {
    const id = sinv.id || `sqlite-inv-${sinv.bookingId}`
    if (!invoicesMap.has(id)) {
      invoicesMap.set(id, {
        ...sinv,
        id,
        propertyId: sinv.propertyId || 'prop-demo-blr3396',
        totalAmount: sinv.totalAmount || 0,
        paidAmount: sinv.paidAmount || 0,
        taxAmount: sinv.taxAmount || 0,
        origin: 'sqlite_v1',
      })
    }
  }

  // 11. PaymentConfigs
  if (jsonBackupData?.paymentConfigs) {
    for (const pc of jsonBackupData.paymentConfigs) {
      paymentConfigsMap.set(pc.id, { ...pc, origin: 'backup_json' })
    }
  }

  // 12. Audit Logs
  if (jsonBackupData?.roomStatusLogs) {
    for (const rsl of jsonBackupData.roomStatusLogs) {
      roomStatusLogsMap.set(rsl.id, { ...rsl, origin: 'backup_json' })
    }
  }
  for (const srsl of sqliteData.roomStatusLogs) {
    const id = srsl.id || `sqlite-rsl-${srsl.roomId}-${srsl.createdAt}`
    if (!roomStatusLogsMap.has(id)) {
      roomStatusLogsMap.set(id, {
        ...srsl,
        id,
        fromStatus: srsl.oldStatus || srsl.fromStatus || 'Available',
        toStatus: srsl.newStatus || srsl.toStatus || 'Available',
        origin: 'sqlite_v1',
      })
    }
  }

  if (jsonBackupData?.bookingStatusLogs) {
    for (const bsl of jsonBackupData.bookingStatusLogs) {
      bookingStatusLogsMap.set(bsl.id, { ...bsl, origin: 'backup_json' })
    }
  }
  for (const sbsl of sqliteData.bookingStatusLogs) {
    const id = sbsl.id || `sqlite-bsl-${sbsl.bookingId}-${sbsl.createdAt}`
    if (!bookingStatusLogsMap.has(id)) {
      bookingStatusLogsMap.set(id, {
        ...sbsl,
        id,
        fromStatus: sbsl.oldStatus || sbsl.fromStatus || 'Upcoming',
        toStatus: sbsl.newStatus || sbsl.toStatus || 'Upcoming',
        origin: 'sqlite_v1',
      })
    }
  }

  // Assemble Master Dataset
  const masterDataset: MasterDataset = {
    meta: {
      generatedAt: new Date().toISOString(),
      version: '1.0.0-master-unified',
      sources: sourcesUsed,
    },
    counts: {
      tenants: tenantsMap.size,
      properties: propertiesMap.size,
      users: usersMap.size,
      categories: categoriesMap.size,
      rooms: roomsMap.size,
      guests: guestsMap.size,
      bookings: bookingsMap.size,
      bookingRooms: bookingRoomsMap.size,
      payments: paymentsMap.size,
      invoices: invoicesMap.size,
      paymentConfigs: paymentConfigsMap.size,
      roomStatusLogs: roomStatusLogsMap.size,
      bookingStatusLogs: bookingStatusLogsMap.size,
    },
    data: {
      tenants: Array.from(tenantsMap.values()),
      properties: Array.from(propertiesMap.values()),
      users: Array.from(usersMap.values()),
      categories: Array.from(categoriesMap.values()),
      rooms: Array.from(roomsMap.values()),
      guests: Array.from(guestsMap.values()),
      bookings: Array.from(bookingsMap.values()),
      bookingRooms: Array.from(bookingRoomsMap.values()),
      payments: Array.from(paymentsMap.values()),
      invoices: Array.from(invoicesMap.values()),
      paymentConfigs: Array.from(paymentConfigsMap.values()),
      roomStatusLogs: Array.from(roomStatusLogsMap.values()),
      bookingStatusLogs: Array.from(bookingStatusLogsMap.values()),
    },
  }

  const masterArchivePath = path.join(__dirname, '../backups/master-archive-complete-timeline.json')
  fs.writeFileSync(masterArchivePath, JSON.stringify(masterDataset, null, 2), 'utf-8')

  console.log('\n✅ Master Historical Archive Successfully Generated!')
  console.log(`📁 File: ${masterArchivePath}`)
  console.log('📊 Reconciled Master Counts:', masterDataset.counts)

  return masterDataset
}

function getTableColumns(tableName: string): string {
  switch (tableName) {
    case 'User':
      return "'id', id, 'email', email, 'name', name, 'role', role, 'passwordHash', passwordHash, 'createdAt', createdAt, 'updatedAt', updatedAt"
    case 'RoomCategory':
      return "'id', id, 'name', name, 'nightlyRate', nightlyRate, 'totalRooms', totalRooms, 'createdAt', createdAt, 'updatedAt', updatedAt"
    case 'Room':
      return "'id', id, 'number', number, 'status', status, 'categoryId', categoryId, 'createdAt', createdAt, 'updatedAt', updatedAt"
    case 'Guest':
      return "'id', id, 'name', name, 'phone', phone, 'email', email, 'createdAt', createdAt, 'updatedAt', updatedAt"
    case 'Booking':
      return "'id', id, 'bookingRef', bookingRef, 'source', source, 'roomCategory', roomCategory, 'numRooms', numRooms, 'checkIn', checkIn, 'checkOut', checkOut, 'adults', adults, 'kids', kids, 'nightlyRate', nightlyRate, 'totalAmount', totalAmount, 'notes', notes, 'status', status, 'guestId', guestId, 'createdAt', createdAt, 'updatedAt', updatedAt"
    case 'BookingRoom':
      return "'id', id, 'bookingId', bookingId, 'roomId', roomId, 'createdAt', createdAt"
    case 'Payment':
      return "'id', id, 'amount', amount, 'mode', mode, 'status', status, 'utrRef', utrRef, 'notes', notes, 'bookingId', bookingId, 'createdAt', createdAt, 'updatedAt', updatedAt"
    case 'Invoice':
      return "'id', id, 'invoiceNo', invoiceNo, 'bookingId', bookingId, 'generatedAt', generatedAt"
    case 'RoomStatusLog':
      return "'id', id, 'roomId', roomId, 'oldStatus', oldStatus, 'newStatus', newStatus, 'changedBy', changedBy, 'createdAt', createdAt"
    case 'BookingStatusLog':
      return "'id', id, 'bookingId', bookingId, 'oldStatus', oldStatus, 'newStatus', newStatus, 'changedBy', changedBy, 'createdAt', createdAt"
    default:
      return "'id', id"
  }
}

function mapTableToKey(tableName: string): string {
  switch (tableName) {
    case 'User': return 'users'
    case 'RoomCategory': return 'categories'
    case 'Room': return 'rooms'
    case 'Guest': return 'guests'
    case 'Booking': return 'bookings'
    case 'BookingRoom': return 'bookingRooms'
    case 'Payment': return 'payments'
    case 'Invoice': return 'invoices'
    case 'RoomStatusLog': return 'roomStatusLogs'
    case 'BookingStatusLog': return 'bookingStatusLogs'
    default: return tableName.toLowerCase()
  }
}

reconcileAllHistoricalData().catch((err) => {
  console.error('❌ Reconciliation failed:', err)
  process.exit(1)
})
