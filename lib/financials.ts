import { format } from 'date-fns'

export interface BookingFinancials {
  d1: Date | null
  d2: Date | null
  nights: number
  isSameDay: boolean
  numRooms: number
  nightlyRate: number
  baseRoomCharges: number
  earlyCheckIn: number
  lateCheckOut: number
  extraMattress: number
  extraMattressCount: number
  extraMattressRate: number
  addOnsTotal: number
  grossTotal: number
  discount: number
  tax: number
  totalAmount: number
  collected: number
  balance: number
  lineItems: Array<{
    id: string
    description: string
    subtext?: string
    qty: number | string
    duration?: string
    rate?: number
    amount: number
  }>
}

export function parseBookingDate(d: string | Date | null | undefined): Date | null {
  if (!d) return null
  if (typeof d === 'string') {
    const match = d.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) {
      const year = parseInt(match[1], 10)
      const month = parseInt(match[2], 10) - 1
      const day = parseInt(match[3], 10)
      return new Date(year, month, day, 12, 0, 0)
    }
  }
  const dt = new Date(d)
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 12, 0, 0)
}

export function fmtDate(d: string | Date | null | undefined, fmtStr: string = 'dd MMM yyyy'): string {
  const parsed = parseBookingDate(d)
  if (!parsed) return '—'
  return format(parsed, fmtStr)
}

export function fmtCurrency(amount: number): string {
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`
}

export function calculateBookingFinancials(booking: any, overrideCollected?: number): BookingFinancials {
  if (!booking) {
    return {
      d1: null,
      d2: null,
      nights: 1,
      isSameDay: false,
      numRooms: 1,
      nightlyRate: 0,
      baseRoomCharges: 0,
      earlyCheckIn: 0,
      lateCheckOut: 0,
      extraMattress: 0,
      extraMattressCount: 0,
      extraMattressRate: 0,
      addOnsTotal: 0,
      grossTotal: 0,
      discount: 0,
      tax: 0,
      totalAmount: 0,
      collected: 0,
      balance: 0,
      lineItems: [],
    }
  }

  const d1 = parseBookingDate(booking.checkIn)
  const d2 = parseBookingDate(booking.checkOut)
  const isSameDay = !!(d1 && d2 && d1.toDateString() === d2.toDateString())
  const nights = d1 && d2 ? Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000)) : 1

  const numRooms = Math.max(1, Number(booking.numRooms || 1))
  const nightlyRate = Number(booking.nightlyRate || 0)
  const discount = Number(booking.discountAmount || 0)
  const tax = Number(booking.taxAmount || 0)
  const totalAmount = Number(booking.totalAmount || 0)

  // Parse add-on charges from booking notes
  const notes = booking.notes || ''
  let earlyCheckIn = 0
  let lateCheckOut = 0
  let extraMattress = 0
  let extraMattressCount = 0
  let extraMattressRate = 0

  const earlyMatch = notes.match(/Early Check-in:\s*₹?(\d+(?:\.\d+)?)/i)
  if (earlyMatch) {
    earlyCheckIn = parseFloat(earlyMatch[1])
  }

  const lateMatch = notes.match(/Late Checkout:\s*₹?(\d+(?:\.\d+)?)/i)
  if (lateMatch) {
    lateCheckOut = parseFloat(lateMatch[1])
  }

  const mattressMatch = notes.match(/Extra Mattress\s*(?:\((\d+)×\s*₹?(\d+)\))?:\s*₹?(\d+(?:\.\d+)?)/i)
  if (mattressMatch) {
    extraMattressCount = mattressMatch[1] ? parseInt(mattressMatch[1], 10) : 1
    extraMattressRate = mattressMatch[2] ? parseFloat(mattressMatch[2]) : 500
    extraMattress = parseFloat(mattressMatch[3])
  }

  const addOnsTotal = earlyCheckIn + lateCheckOut + extraMattress

  // Base Room Charges Calculation
  let baseRoomCharges = 0
  if (nightlyRate > 0) {
    baseRoomCharges = nightlyRate * nights * numRooms
  }

  // Fallback / reconciliation if nightlyRate is 0 or base charges are missing
  if (baseRoomCharges === 0 || (!earlyCheckIn && !lateCheckOut && !extraMattress && baseRoomCharges !== (totalAmount + discount - tax))) {
    baseRoomCharges = Math.max(0, totalAmount + discount - tax - addOnsTotal)
  }

  const grossTotal = baseRoomCharges + addOnsTotal + tax

  // Payments collected
  const collected =
    overrideCollected !== undefined
      ? overrideCollected
      : booking.payments?.reduce(
          (s: number, p: any) => s + (p.status !== 'Pending' ? Number(p.amount || 0) : 0),
          0
        ) || 0

  const balance = Math.max(0, totalAmount - collected)

  // Itemized line items list for receipts and invoices
  const lineItems: Array<{
    id: string
    description: string
    subtext?: string
    qty: number | string
    duration?: string
    rate?: number
    amount: number
  }> = []

  // 1. Room reservation charge
  lineItems.push({
    id: 'room-charges',
    description: booking.roomCategory || 'Room Reservation',
    subtext: `${numRooms} Room${numRooms > 1 ? 's' : ''} · ${isSameDay ? 'Same-day stay (1D)' : `${nights} Night${nights > 1 ? 's' : ''}`}`,
    qty: numRooms,
    duration: isSameDay ? '1 Day' : `${nights}N`,
    rate: nightlyRate > 0 ? nightlyRate : Math.round(baseRoomCharges / (nights * numRooms)),
    amount: baseRoomCharges,
  })

  // 2. Early Check-in Add-on
  if (earlyCheckIn > 0) {
    lineItems.push({
      id: 'early-checkin',
      description: 'Early Check-in Service',
      subtext: 'Special early arrival request',
      qty: 1,
      duration: 'One-time',
      amount: earlyCheckIn,
    })
  }

  // 3. Late Checkout Add-on
  if (lateCheckOut > 0) {
    lineItems.push({
      id: 'late-checkout',
      description: 'Late Checkout Service',
      subtext: 'Extended checkout request',
      qty: 1,
      duration: 'One-time',
      amount: lateCheckOut,
    })
  }

  // 4. Extra Mattress Add-on
  if (extraMattress > 0) {
    lineItems.push({
      id: 'extra-mattress',
      description: `Extra Mattress (${extraMattressCount}×)`,
      subtext: `${extraMattressCount} Mattress @ ${fmtCurrency(extraMattressRate)}/N × ${nights}N`,
      qty: extraMattressCount,
      duration: `${nights}N`,
      rate: extraMattressRate,
      amount: extraMattress,
    })
  }

  return {
    d1,
    d2,
    nights,
    isSameDay,
    numRooms,
    nightlyRate,
    baseRoomCharges,
    earlyCheckIn,
    lateCheckOut,
    extraMattress,
    extraMattressCount,
    extraMattressRate,
    addOnsTotal,
    grossTotal,
    discount,
    tax,
    totalAmount,
    collected,
    balance,
    lineItems,
  }
}
