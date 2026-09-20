'use client'

import React, { useState, useMemo } from 'react'
import AppShell from '@/components/layout/AppShell'
import useSWR from 'swr'
import {
  History,
  Search,
  Calendar,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  Download,
  Printer,
  FileText,
  User,
  Phone,
  BedDouble,
  ChevronRight,
  ArrowUpDown,
  RefreshCw,
  AlertTriangle,
  Receipt,
  Layers,
  Sparkles,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { useProperty } from '@/context/PropertyContext'
import InvoiceModal from '@/components/bookings/InvoiceModal'
import BookingDetailsModal from '@/components/bookings/BookingDetailsModal'
import SourceBadge from '@/components/ui/SourceBadge'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type DatePreset = 'all' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_month' | 'custom'
type StatusFilter = 'all' | 'CheckedOut' | 'Cancelled' | 'NoShow' | 'all_statuses'

function formatMoney(amount: number, symbol = '₹'): string {
  return `${symbol}${Number(amount || 0).toLocaleString('en-IN')}`
}

function formatDate(d: string | null | undefined): string {
  if (!d) return '—'
  try {
    const dt = typeof d === 'string' && d.length === 10 ? new Date(d + 'T12:00:00') : new Date(d)
    return format(dt, 'dd MMM yyyy')
  } catch {
    return '—'
  }
}

export default function BookingHistoryPage() {
  const { currentProperty } = useProperty()
  const currencySymbol = currentProperty?.currencySymbol || '₹'

  // Filter States
  const [datePreset, setDatePreset] = useState<DatePreset>('all')
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedChannel, setSelectedChannel] = useState<string>('all')

  // Modals
  const [selectedInvoiceBooking, setSelectedInvoiceBooking] = useState<any | null>(null)
  const [selectedDetailBooking, setSelectedDetailBooking] = useState<any | null>(null)

  // Query String construction
  const queryParams = useMemo(() => {
    const params = new URLSearchParams()
    if (currentProperty?.id) params.set('propertyId', currentProperty.id)
    params.set('preset', datePreset)
    params.set('status', statusFilter)
    if (datePreset === 'custom') {
      if (fromDate) params.set('from', fromDate)
      if (toDate) params.set('to', toDate)
    }
    if (searchQuery.trim()) params.set('search', searchQuery.trim())
    if (selectedChannel !== 'all') params.set('source', selectedChannel)
    return params.toString()
  }, [currentProperty?.id, datePreset, statusFilter, fromDate, toDate, searchQuery, selectedChannel])

  const { data, error, isLoading, mutate } = useSWR(
    currentProperty?.id ? `/api/history?${queryParams}` : null,
    fetcher,
    { revalidateOnFocus: true }
  )

  const summary = data?.summary || {
    totalBookings: 0,
    completedCount: 0,
    completedRevenue: 0,
    cancelledCount: 0,
    cancelledValue: 0,
    noShowCount: 0,
    totalCollected: 0,
    totalRoomsBooked: 0,
    totalGuests: 0,
  }

  const bookings: any[] = useMemo(() => {
    return Array.isArray(data?.bookings) ? data.bookings : []
  }, [data?.bookings])

  // Extract unique channels for filter dropdown
  const channels = useMemo(() => {
    const set = new Set<string>()
    bookings.forEach((b) => {
      if (b.source) set.add(b.source)
    })
    return Array.from(set)
  }, [bookings])

  // CSV Export
  function exportCSV() {
    if (bookings.length === 0) return
    const headers = [
      'Booking Ref',
      'Guest Name',
      'Phone',
      'Status',
      'Check In',
      'Check Out',
      'Room Category',
      'Rooms',
      'Source',
      'Total Amount',
      'Paid Amount',
      'Balance',
      'Cancellation Reason',
    ]

    const rows = bookings.map((b) => [
      `"${b.bookingRef}"`,
      `"${b.guest?.name || ''}"`,
      `"${b.guest?.phone || ''}"`,
      `"${b.status}"`,
      `"${formatDate(b.checkIn)}"`,
      `"${formatDate(b.checkOut)}"`,
      `"${b.roomCategory || ''}"`,
      `"${b.assignedRooms || b.numRooms || 1}"`,
      `"${b.source || 'Walk inn'}"`,
      `"${b.totalAmount || 0}"`,
      `"${b.paidAmount || 0}"`,
      `"${b.balanceAmount || 0}"`,
      `"${b.cancellationReason || ''}"`,
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `booking-history-${currentProperty?.code || 'hotel'}-${format(new Date(), 'yyyy-MM-dd')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <AppShell>
      <div className="history-page" style={{ paddingBottom: '60px' }}>
        {/* Page Header */}
        <div className="page-header" style={{ marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <History size={24} color="var(--red)" />
              <span>Booking History &amp; Archives</span>
            </h1>
            <div style={{ fontSize: '13px', color: 'var(--text-2)', marginTop: '3px' }}>
              {currentProperty?.name ? `${currentProperty.name} · ` : ''}Filter and audit past reservations, completed stays, and cancelled bookings by date.
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => mutate()}
              title="Refresh history list"
              style={{ gap: '6px' }}
            >
              <RefreshCw size={14} className={isLoading ? 'spinner' : ''} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              className="btn btn-ghost"
              onClick={exportCSV}
              disabled={bookings.length === 0}
              style={{ gap: '6px' }}
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* 4 KPI Summary Cards */}
        <div className="kpi-grid" style={{ marginBottom: '22px' }}>
          {/* Card 1: Total Reservations in History */}
          <div className="kpi-card">
            <div className="kpi-label">
              <span>Total Past Bookings</span>
              <History size={16} />
            </div>
            <div className="kpi-value">{isLoading ? '—' : summary.totalBookings}</div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-2)' }}>
              {summary.totalRoomsBooked} rooms · {summary.totalGuests} guests recorded
            </div>
          </div>

          {/* Card 2: Completed Stays */}
          <div className="kpi-card">
            <div className="kpi-label" style={{ color: 'var(--green)' }}>
              <span>Completed Stays</span>
              <CheckCircle2 size={16} color="var(--green)" />
            </div>
            <div className="kpi-value" style={{ color: 'var(--green)' }}>
              {isLoading ? '—' : summary.completedCount}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-2)' }}>
              {formatMoney(summary.completedRevenue, currencySymbol)} settled revenue
            </div>
          </div>

          {/* Card 3: Cancelled Bookings */}
          <div className="kpi-card">
            <div className="kpi-label" style={{ color: 'var(--red)' }}>
              <span>Cancelled Bookings</span>
              <XCircle size={16} color="var(--red)" />
            </div>
            <div className="kpi-value" style={{ color: 'var(--red)' }}>
              {isLoading ? '—' : summary.cancelledCount}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-2)' }}>
              {formatMoney(summary.cancelledValue, currencySymbol)} voided / cancelled value
            </div>
          </div>

          {/* Card 4: Total Realized Collections */}
          <div className="kpi-card">
            <div className="kpi-label" style={{ color: 'var(--blue)' }}>
              <span>Total Payments Collected</span>
              <DollarSign size={16} color="var(--blue)" />
            </div>
            <div className="kpi-value" style={{ color: 'var(--blue)' }}>
              {isLoading ? '—' : formatMoney(summary.totalCollected, currencySymbol)}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-2)' }}>
              Settled across cash, UPI, cards &amp; online
            </div>
          </div>
        </div>

        {/* Filter Control Box */}
        <div
          className="card"
          style={{
            padding: '16px 18px',
            marginBottom: '22px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {/* Row 1: Date Preset Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--text-2)', marginRight: '4px' }}>
              <Calendar size={14} color="var(--red)" />
              <span>Date Range:</span>
            </div>

            <button
              type="button"
              className={`filter-mode-pill ${datePreset === 'all' ? 'active' : ''}`}
              onClick={() => setDatePreset('all')}
            >
              All Time
            </button>
            <button
              type="button"
              className={`filter-mode-pill ${datePreset === 'today' ? 'active' : ''}`}
              onClick={() => setDatePreset('today')}
            >
              Today
            </button>
            <button
              type="button"
              className={`filter-mode-pill ${datePreset === 'yesterday' ? 'active' : ''}`}
              onClick={() => setDatePreset('yesterday')}
            >
              Yesterday
            </button>
            <button
              type="button"
              className={`filter-mode-pill ${datePreset === 'this_week' ? 'active' : ''}`}
              onClick={() => setDatePreset('this_week')}
            >
              This Week
            </button>
            <button
              type="button"
              className={`filter-mode-pill ${datePreset === 'this_month' ? 'active' : ''}`}
              onClick={() => setDatePreset('this_month')}
            >
              This Month
            </button>
            <button
              type="button"
              className={`filter-mode-pill ${datePreset === 'last_month' ? 'active' : ''}`}
              onClick={() => setDatePreset('last_month')}
            >
              Last Month
            </button>
            <button
              type="button"
              className={`filter-mode-pill ${datePreset === 'custom' ? 'active' : ''}`}
              onClick={() => setDatePreset('custom')}
            >
              Custom Dates
            </button>
          </div>

          {/* Row 1b: Custom Date Inputs (when Custom is selected) */}
          {datePreset === 'custom' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                background: 'var(--card-2)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-3)', fontWeight: 600 }}>From:</span>
                <input
                  type="date"
                  className="form-control"
                  style={{ width: '150px', padding: '5px 10px', fontSize: '12px' }}
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-3)', fontWeight: 600 }}>To:</span>
                <input
                  type="date"
                  className="form-control"
                  style={{ width: '150px', padding: '5px 10px', fontSize: '12px' }}
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>

              {(fromDate || toDate) && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setFromDate('')
                    setToDate('')
                  }}
                  style={{ fontSize: '11px', padding: '4px 8px' }}
                >
                  Clear Range
                </button>
              )}
            </div>
          )}

          {/* Row 2: Status Tabs + Search + Channel Filter */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              borderTop: '1px solid var(--border)',
              paddingTop: '12px',
              flexWrap: 'wrap',
            }}
          >
            {/* Status Tabs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`tab ${statusFilter === 'all' ? 'active' : ''}`}
                onClick={() => setStatusFilter('all')}
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                All History ({summary.completedCount + summary.cancelledCount + summary.noShowCount})
              </button>

              <button
                type="button"
                className={`tab ${statusFilter === 'CheckedOut' ? 'active' : ''}`}
                onClick={() => setStatusFilter('CheckedOut')}
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                <CheckCircle2 size={13} color={statusFilter === 'CheckedOut' ? 'var(--red)' : 'var(--green)'} />
                <span>Checked Out ({summary.completedCount})</span>
              </button>

              <button
                type="button"
                className={`tab ${statusFilter === 'Cancelled' ? 'active' : ''}`}
                onClick={() => setStatusFilter('Cancelled')}
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                <XCircle size={13} color={statusFilter === 'Cancelled' ? 'var(--red)' : 'var(--red)'} />
                <span>Cancelled ({summary.cancelledCount})</span>
              </button>

              <button
                type="button"
                className={`tab ${statusFilter === 'NoShow' ? 'active' : ''}`}
                onClick={() => setStatusFilter('NoShow')}
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                <Clock size={13} color={statusFilter === 'NoShow' ? 'var(--red)' : 'var(--amber)'} />
                <span>No Show ({summary.noShowCount})</span>
              </button>

              <button
                type="button"
                className={`tab ${statusFilter === 'all_statuses' ? 'active' : ''}`}
                onClick={() => setStatusFilter('all_statuses')}
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                All Records
              </button>
            </div>

            {/* Search and Channel Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1', justifyContent: 'flex-end', minWidth: '280px' }}>
              <div style={{ position: 'relative', flex: '1', maxWidth: '320px' }}>
                <Search
                  size={14}
                  color="var(--text-3)"
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search guest, ref #, phone, room..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    paddingLeft: '34px',
                    paddingRight: '12px',
                    fontSize: '12.5px',
                    height: '36px',
                    borderRadius: '20px',
                  }}
                />
              </div>

              {channels.length > 0 && (
                <select
                  className="form-control"
                  style={{ width: '130px', fontSize: '12px', height: '36px' }}
                  value={selectedChannel}
                  onChange={(e) => setSelectedChannel(e.target.value)}
                >
                  <option value="all">All Sources</option>
                  {channels.map((ch) => (
                    <option key={ch} value={ch}>
                      {ch}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* History Booking List */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <span className="spinner" style={{ width: 28, height: 28, margin: '0 auto 12px' }} />
            <div style={{ color: 'var(--text-2)', fontSize: '13px' }}>Loading historical records...</div>
          </div>
        ) : bookings.length === 0 ? (
          <div className="empty-state" style={{ padding: '48px 24px', textAlign: 'center' }}>
            <History size={40} style={{ margin: '0 auto 12px', color: 'var(--text-3)', opacity: 0.7 }} />
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>
              No Historical Bookings Found
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-2)', maxWidth: '440px', margin: '0 auto' }}>
              {statusFilter === 'Cancelled'
                ? 'No cancelled reservations found for the selected date range.'
                : 'There are no completed or past bookings matching your current filter criteria.'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {bookings.map((booking) => {
              const isCancelled = booking.status === 'Cancelled'
              const isCheckedOut = booking.status === 'CheckedOut'
              const isNoShow = booking.status === 'NoShow'

              return (
                <div
                  key={booking.id}
                  className="card"
                  style={{
                    padding: '16px 20px',
                    borderLeft: isCancelled
                      ? '4px solid var(--red)'
                      : isCheckedOut
                      ? '4px solid var(--green)'
                      : isNoShow
                      ? '4px solid var(--amber)'
                      : '4px solid var(--border-2)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                    {/* Left: Guest Info & Ref */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '240px' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          background: isCancelled
                            ? 'rgba(239, 68, 68, 0.12)'
                            : isCheckedOut
                            ? 'rgba(22, 163, 74, 0.12)'
                            : 'var(--card-2)',
                          color: isCancelled ? 'var(--red)' : isCheckedOut ? 'var(--green)' : 'var(--text)',
                          border: '1px solid var(--border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '14px',
                          flexShrink: 0,
                        }}
                      >
                        {booking.guest?.name ? booking.guest.name.slice(0, 2).toUpperCase() : 'GS'}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
                            {booking.guest?.name || 'Guest'}
                          </span>
                          <span
                            style={{
                              fontSize: '11px',
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              background: 'var(--card-2)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              border: '1px solid var(--border)',
                              color: 'var(--text-2)',
                            }}
                          >
                            {booking.bookingRef}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-3)', marginTop: '4px', flexWrap: 'wrap' }}>
                          {booking.guest?.phone && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Phone size={11} /> {booking.guest.phone}
                            </span>
                          )}
                          <SourceBadge source={booking.source} size="xs" />
                        </div>
                      </div>
                    </div>

                    {/* Middle: Stay Dates & Room Category */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '180px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
                        <BedDouble size={14} color="var(--red)" />
                        <span>{booking.roomCategory} ({booking.assignedRooms})</span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>
                        {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)}
                      </div>
                    </div>

                    {/* Right: Bill / Financials & Status */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)' }}>
                          {formatMoney(booking.totalAmount || 0, currencySymbol)}
                        </div>
                        <div style={{ fontSize: '11.5px', marginTop: '2px' }}>
                          {isCancelled ? (
                            <span style={{ color: 'var(--red)', fontWeight: 600 }}>Cancelled Booking</span>
                          ) : booking.isFullyPaid ? (
                            <span style={{ color: 'var(--green)', fontWeight: 600 }}>
                              Settled ({formatMoney(booking.paidAmount || 0, currencySymbol)})
                            </span>
                          ) : (
                            <span style={{ color: 'var(--amber)', fontWeight: 600 }}>
                              Paid: {formatMoney(booking.paidAmount || 0, currencySymbol)} · Due: {formatMoney(booking.balanceAmount || 0, currencySymbol)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div>
                        {isCancelled ? (
                          <span className="badge badge-red" style={{ gap: '4px', padding: '4px 10px' }}>
                            <XCircle size={12} /> Cancelled
                          </span>
                        ) : isCheckedOut ? (
                          <span className="badge badge-green" style={{ gap: '4px', padding: '4px 10px' }}>
                            <CheckCircle2 size={12} /> Checked Out
                          </span>
                        ) : isNoShow ? (
                          <span className="badge badge-amber" style={{ gap: '4px', padding: '4px 10px' }}>
                            <Clock size={12} /> No Show
                          </span>
                        ) : (
                          <span className="badge badge-blue" style={{ gap: '4px', padding: '4px 10px' }}>
                            {booking.status}
                          </span>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {!isCancelled && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => setSelectedInvoiceBooking(booking)}
                            title="View Receipt &amp; Print"
                            style={{ gap: '5px' }}
                          >
                            <Printer size={13} />
                            <span>Receipt</span>
                          </button>
                        )}

                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setSelectedDetailBooking(booking)}
                          title="View Full Booking Audit &amp; Details"
                          style={{ gap: '5px' }}
                        >
                          <FileText size={13} />
                          <span>Details</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Cancellation Reason Note Box (if cancelled) */}
                  {isCancelled && (booking.cancellationReason || booking.notes) && (
                    <div
                      style={{
                        marginTop: '12px',
                        padding: '8px 12px',
                        background: 'rgba(239, 68, 68, 0.06)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: 'var(--red)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                      }}
                    >
                      <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <strong>Cancellation Audit Note:</strong> {booking.cancellationReason || booking.notes}
                        {booking.cancelledAt && (
                          <span style={{ fontSize: '11px', opacity: 0.85, marginLeft: '8px' }}>
                            (Recorded on {formatDate(booking.cancelledAt)})
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Invoice / Receipt Modal */}
      {selectedInvoiceBooking && (
        <InvoiceModal
          booking={selectedInvoiceBooking}
          collected={selectedInvoiceBooking.paidAmount}
          balance={selectedInvoiceBooking.balanceAmount}
          onClose={() => setSelectedInvoiceBooking(null)}
        />
      )}

      {/* Full Booking Details Modal */}
      {selectedDetailBooking && (
        <BookingDetailsModal
          booking={selectedDetailBooking}
          onClose={() => setSelectedDetailBooking(null)}
          onCheckin={() => {}}
          onCheckout={() => {}}
          onCollectPayment={() => {}}
          onSuccess={() => mutate()}
        />
      )}
    </AppShell>
  )
}
