import { format } from 'date-fns'
import { fmtDate, fmtCurrency, BookingFinancials } from './financials'

interface PrintReceiptOptions {
  property: any
  booking: any
  financials: BookingFinancials
  receiptNo: string
  payments?: any[]
  payment?: any
  config?: any
  type?: 'invoice' | 'receipt'
}

export function printReceiptDocument({
  property,
  booking,
  financials,
  receiptNo,
  payments,
  payment,
  config,
  type = 'invoice',
}: PrintReceiptOptions) {
  if (typeof window === 'undefined') return

  const hotelName = property?.name || booking?.property?.name || 'Hotel'
  const addressParts = [
    property?.address || booking?.property?.address,
    property?.city || booking?.property?.city,
    property?.state || booking?.property?.state,
    property?.country || booking?.property?.country,
  ].filter(Boolean)
  const hotelAddress = addressParts.length > 0 ? addressParts.join(', ') : ''
  const hotelPhone = property?.phone || booking?.property?.phone || ''
  const hotelEmail = property?.email || booking?.property?.email || ''
  const propertyCode = property?.code || booking?.property?.code || ''
  const hotelLogo =
    property?.coverImage ||
    property?.logo ||
    booking?.property?.coverImage ||
    booking?.property?.logo ||
    ''

  const guestName = booking?.guest?.name || 'Guest'
  const guestPhone = booking?.guest?.phone || '—'
  const guestEmail = booking?.guest?.email || '—'
  const guestAddress = booking?.guest?.address || '—'

  const checkInStr = fmtDate(booking?.checkIn)
  const checkOutStr = fmtDate(booking?.checkOut)
  const stayDuration = financials.isSameDay ? 'Same-day Stay (1 Day)' : `${financials.nights} Night${financials.nights > 1 ? 's' : ''}`
  const roomCategory = booking?.roomCategory || 'Superior'
  const numRooms = financials.numRooms || 1
  const assignedRooms =
    booking?.bookingRooms && booking.bookingRooms.length > 0
      ? booking.bookingRooms
          .map((br: any) => br.room?.number || br.room?.roomNumber)
          .filter(Boolean)
          .join(', ')
      : '—'

  const allPayments = payments || booking?.payments || (payment ? [payment] : [])
  const title = 'RECEIPT'
  const printDate = format(new Date(), 'dd MMM yyyy, hh:mm a')

  // Generate HTML for line items
  const lineItemsHtml = financials.lineItems
    .map(
      (item, idx) => `
      <tr>
        <td style="text-align: center; width: 40px; padding: 6px 8px; border-bottom: 1px solid #e5e7eb;">${idx + 1}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e5e7eb;">
          <div style="font-weight: 600; color: #111827;">${item.description}</div>
          ${item.subtext ? `<div style="font-size: 11px; color: #6b7280; margin-top: 2px;">${item.subtext}</div>` : ''}
        </td>
        <td style="text-align: center; width: 60px; padding: 6px 8px; border-bottom: 1px solid #e5e7eb;">${item.qty}</td>
        <td style="text-align: right; width: 110px; padding: 6px 8px; border-bottom: 1px solid #e5e7eb;">${item.rate ? fmtCurrency(item.rate) : '—'}</td>
        <td style="text-align: right; width: 110px; padding: 6px 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #111827;">${fmtCurrency(item.amount)}</td>
      </tr>
    `
    )
    .join('')

  // Generate HTML for payment records
  const paymentRowsHtml = allPayments
    .map(
      (p: any) => `
      <tr style="font-size: 11.5px;">
        <td style="padding: 4px 8px; border-bottom: 1px solid #f3f4f6;">${p.createdAt ? format(new Date(p.createdAt), 'dd MMM yyyy, hh:mm a') : '—'}</td>
        <td style="padding: 4px 8px; border-bottom: 1px solid #f3f4f6; font-weight: 600; color: #111827;">${p.mode || 'Cash'}</td>
        <td style="padding: 4px 8px; border-bottom: 1px solid #f3f4f6; font-family: monospace; color: #4b5563;">${p.utrRef || '—'}</td>
        <td style="padding: 4px 8px; border-bottom: 1px solid #f3f4f6; color: ${p.status === 'Paid' ? '#15803d' : '#b45309'}; font-weight: 600;">${p.status || 'Paid'}</td>
        <td style="padding: 4px 8px; border-bottom: 1px solid #f3f4f6; text-align: right; font-weight: 700; color: #111827;">${fmtCurrency(p.amount)}</td>
      </tr>
    `
    )
    .join('')

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${receiptNo} - ${hotelName}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm 10mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #111827;
      background: #ffffff;
      font-size: 12px;
      line-height: 1.35;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .receipt-wrapper {
      width: 100%;
      max-width: 780px;
      margin: 0 auto;
      padding: 4px;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      border-bottom: 2px solid #111827;
      padding-bottom: 8px;
    }
    .hotel-name {
      font-size: 18px;
      font-weight: 800;
      color: #111827;
      letter-spacing: -0.3px;
    }
    .hotel-sub {
      font-size: 11px;
      color: #4b5563;
      margin-top: 2px;
    }
    .receipt-title {
      font-size: 15px;
      font-weight: 800;
      color: #111827;
      text-align: right;
      letter-spacing: 0.5px;
    }
    .receipt-no {
      font-size: 13px;
      font-weight: 700;
      color: #374151;
      text-align: right;
      margin-top: 2px;
    }
    .receipt-date {
      font-size: 11px;
      color: #6b7280;
      text-align: right;
      margin-top: 2px;
    }
    .grid-section {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
    }
    .grid-col {
      width: 50%;
      vertical-align: top;
      padding: 8px 12px;
    }
    .grid-col + .grid-col {
      border-left: 1px solid #e5e7eb;
    }
    .section-title {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 700;
      color: #6b7280;
      margin-bottom: 4px;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 3px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2px;
      font-size: 11.5px;
    }
    .info-label {
      color: #4b5563;
    }
    .info-value {
      font-weight: 600;
      color: #111827;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
    }
    .items-table th {
      background: #f3f4f6;
      font-size: 10.5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 700;
      color: #374151;
      padding: 6px 8px;
      border-top: 1px solid #d1d5db;
      border-bottom: 1.5px solid #9ca3af;
      text-align: left;
    }
    .totals-wrapper {
      width: 100%;
      display: flex;
      justify-content: flex-end;
      margin-bottom: 10px;
    }
    .totals-table {
      width: 300px;
      border-collapse: collapse;
    }
    .totals-table td {
      padding: 3px 0;
      font-size: 12px;
    }
    .totals-table .bold-row td {
      font-weight: 800;
      font-size: 14px;
      border-top: 1.5px solid #111827;
      padding-top: 4px;
      margin-top: 4px;
    }
    .payments-section {
      width: 100%;
      margin-bottom: 10px;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      background: #ffffff;
      overflow: hidden;
    }
    .payments-header {
      background: #f9fafb;
      padding: 6px 10px;
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #4b5563;
      border-bottom: 1px solid #e5e7eb;
    }
    .payments-table {
      width: 100%;
      border-collapse: collapse;
    }
    .payments-table th {
      font-size: 10px;
      text-transform: uppercase;
      color: #6b7280;
      padding: 4px 8px;
      background: #fafafa;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    .footer-note {
      text-align: center;
      font-size: 10px;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
      padding-top: 8px;
      margin-top: 8px;
    }
  </style>
</head>
<body>
  <div class="receipt-wrapper">
    <!-- Header -->
    <table class="header-table">
      <tr>
        <td style="vertical-align: top;">
          <div style="display: flex; align-items: center; gap: 10px;">
            ${
              hotelLogo
                ? `<img src="${hotelLogo}" alt="${hotelName}" style="width: 44px; height: 44px; border-radius: 6px; object-fit: cover; border: 1px solid #e5e7eb;" />`
                : ''
            }
            <div>
              <div class="hotel-name">${hotelName}</div>
              ${hotelAddress || propertyCode ? `<div class="hotel-sub">${[hotelAddress, propertyCode ? `Code: ${propertyCode}` : ''].filter(Boolean).join(' · ')}</div>` : ''}
              ${hotelPhone || hotelEmail ? `<div class="hotel-sub">${[hotelPhone ? `Phone: ${hotelPhone}` : '', hotelEmail ? `Email: ${hotelEmail}` : ''].filter(Boolean).join(' · ')}</div>` : ''}
            </div>
          </div>
        </td>
        <td style="vertical-align: top;">
          <div class="receipt-title">${title}</div>
          <div class="receipt-no">${receiptNo}</div>
          <div class="receipt-date">${printDate}</div>
        </td>
      </tr>
    </table>

    <!-- Guest & Stay 2-Column Box -->
    <table class="grid-section">
      <tr>
        <td class="grid-col">
          <div class="section-title">Billed To / Guest Details</div>
          <div class="info-row">
            <span class="info-label">Guest Name:</span>
            <span class="info-value">${guestName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Contact Phone:</span>
            <span class="info-value">${guestPhone}</span>
          </div>
          ${guestEmail !== '—' ? `<div class="info-row"><span class="info-label">Email:</span><span class="info-value">${guestEmail}</span></div>` : ''}
          ${guestAddress !== '—' ? `<div class="info-row"><span class="info-label">Address:</span><span class="info-value">${guestAddress}</span></div>` : ''}
        </td>
        <td class="grid-col">
          <div class="section-title">Reservation &amp; Stay Details</div>
          <div class="info-row">
            <span class="info-label">Booking Reference:</span>
            <span class="info-value">${booking?.bookingRef || '—'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Category &amp; Rooms:</span>
            <span class="info-value">${numRooms} × ${roomCategory} ${assignedRooms !== '—' ? `(Room ${assignedRooms})` : ''}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Stay Duration:</span>
            <span class="info-value">${checkInStr} to ${checkOutStr} (${stayDuration})</span>
          </div>
          <div class="info-row">
            <span class="info-label">Booking Channel:</span>
            <span class="info-value">${booking?.source || 'Walk inn'}</span>
          </div>
        </td>
      </tr>
    </table>

    <!-- Itemized Line Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="text-align: center;">#</th>
          <th>Particulars / Description</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Rate (₹)</th>
          <th style="text-align: right;">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${lineItemsHtml}
      </tbody>
    </table>

    ${
      booking?.notes
        ? `<div style="font-size: 10.5px; color: #4b5563; background: #f9fafb; padding: 4px 8px; border: 1px solid #e5e7eb; border-radius: 4px; margin-bottom: 8px;">
            <strong>Notes / Particulars:</strong> ${booking.notes}
          </div>`
        : ''
    }

    <!-- Financial Totals Summary -->
    <div class="totals-wrapper">
      <table class="totals-table">
        ${
          financials.discount > 0 || financials.addOnsTotal > 0
            ? `
          <tr>
            <td style="color: #4b5563;">Gross Charges:</td>
            <td style="text-align: right; font-weight: 500;">${fmtCurrency(financials.grossTotal)}</td>
          </tr>`
            : ''
        }
        ${
          financials.discount > 0
            ? `
          <tr>
            <td style="color: #15803d;">Discount Applied:</td>
            <td style="text-align: right; color: #15803d; font-weight: 600;">- ${fmtCurrency(financials.discount)}</td>
          </tr>`
            : ''
        }
        <tr class="bold-row">
          <td>Total Net Payable:</td>
          <td style="text-align: right;">${fmtCurrency(financials.totalAmount)}</td>
        </tr>
        <tr>
          <td style="color: #15803d; font-weight: 600; padding-top: 4px;">Total Received:</td>
          <td style="text-align: right; color: #15803d; font-weight: 700; padding-top: 4px;">${fmtCurrency(financials.collected)}</td>
        </tr>
        <tr style="border-top: 1px solid #e5e7eb;">
          <td style="font-weight: 700; color: ${financials.balance > 0 ? '#b45309' : '#15803d'}; padding-top: 4px;">Balance Due:</td>
          <td style="text-align: right; font-weight: 800; color: ${financials.balance > 0 ? '#b45309' : '#15803d'}; padding-top: 4px;">
            ${financials.balance > 0 ? fmtCurrency(financials.balance) : '₹0 (Settled)'}
          </td>
        </tr>
      </table>
    </div>

    <!-- Payment Records Breakdown -->
    ${
      allPayments.length > 0
        ? `
    <div class="payments-section">
      <div class="payments-header">Payment Transactions (${allPayments.length})</div>
      <table class="payments-table">
        <thead>
          <tr>
            <th>Date &amp; Time</th>
            <th>Mode</th>
            <th>Reference / UTR</th>
            <th>Status</th>
            <th style="text-align: right;">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${paymentRowsHtml}
        </tbody>
      </table>
    </div>
    `
        : ''
    }

    <!-- Footer -->
    <div class="footer-note">
      This is a computer-generated receipt issued for ${hotelName}. Thank you for staying with us!
    </div>
  </div>
</body>
</html>
  `

  // Use a dedicated hidden iframe to print cleanly on exactly Page 1
  let iframe = document.getElementById('apex-receipt-print-frame') as HTMLIFrameElement
  if (!iframe) {
    iframe = document.createElement('iframe')
    iframe.id = 'apex-receipt-print-frame'
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0px'
    iframe.style.height = '0px'
    iframe.style.border = 'none'
    iframe.style.visibility = 'hidden'
    document.body.appendChild(iframe)
  }

  const doc = iframe.contentWindow?.document
  if (doc) {
    doc.open()
    doc.write(html)
    doc.close()

    setTimeout(() => {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
    }, 250)
  } else {
    window.print()
  }
}
