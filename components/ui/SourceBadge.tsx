'use client'

import React from 'react'

interface SourceBadgeProps {
  source?: string | null
  size?: 'xs' | 'sm' | 'md'
  showDot?: boolean
  className?: string
  style?: React.CSSProperties
}

interface SourceConfig {
  label: string
  className: string
  color: string
  bg: string
  border: string
  dotColor: string
}

export function getSourceConfig(source?: string | null): SourceConfig {
  const s = (source || 'Walk inn').trim()
  const lower = s.toLowerCase()

  if (lower.includes('oyo')) {
    return {
      label: 'OYO',
      className: 'badge-source-oyo',
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.12)',
      border: 'rgba(239, 68, 68, 0.3)',
      dotColor: '#ef4444',
    }
  }

  if (lower.includes('gommt') || lower.includes('makemytrip') || lower.includes('mmt') || lower.includes('goibibo')) {
    return {
      label: s || 'GOMMT',
      className: 'badge-source-gommt',
      color: '#f97316',
      bg: 'rgba(249, 115, 22, 0.12)',
      border: 'rgba(249, 115, 22, 0.3)',
      dotColor: '#f97316',
    }
  }

  if (lower.includes('b.com') || lower.includes('booking.com') || lower.includes('booking')) {
    return {
      label: s || 'B.COM',
      className: 'badge-source-bcom',
      color: '#3b82f6',
      bg: 'rgba(59, 130, 246, 0.12)',
      border: 'rgba(59, 130, 246, 0.3)',
      dotColor: '#3b82f6',
    }
  }

  if (lower.includes('airbnb')) {
    return {
      label: 'AIRBNB',
      className: 'badge-source-airbnb',
      color: '#f43f5e',
      bg: 'rgba(244, 63, 94, 0.12)',
      border: 'rgba(244, 63, 94, 0.3)',
      dotColor: '#f43f5e',
    }
  }

  if (lower.includes('brevistay')) {
    return {
      label: 'BREVISTAY',
      className: 'badge-source-brevistay',
      color: '#a855f7',
      bg: 'rgba(168, 85, 247, 0.12)',
      border: 'rgba(168, 85, 247, 0.3)',
      dotColor: '#a855f7',
    }
  }

  if (lower.includes('b2b')) {
    return {
      label: 'B2B',
      className: 'badge-source-b2b',
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.12)',
      border: 'rgba(16, 185, 129, 0.3)',
      dotColor: '#10b981',
    }
  }

  if (lower.includes('cleartrip')) {
    return {
      label: 'CLEARTRIP',
      className: 'badge-source-cleartrip',
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.12)',
      border: 'rgba(245, 158, 11, 0.3)',
      dotColor: '#f59e0b',
    }
  }

  if (lower.includes('yatra')) {
    return {
      label: 'YATRA',
      className: 'badge-source-yatra',
      color: '#ea580c',
      bg: 'rgba(234, 88, 12, 0.12)',
      border: 'rgba(234, 88, 12, 0.3)',
      dotColor: '#ea580c',
    }
  }

  if (lower.includes('expedia')) {
    return {
      label: 'EXPEDIA',
      className: 'badge-source-expedia',
      color: '#eab308',
      bg: 'rgba(234, 179, 8, 0.14)',
      border: 'rgba(234, 179, 8, 0.35)',
      dotColor: '#eab308',
    }
  }

  if (lower.includes('agoda')) {
    return {
      label: 'AGODA',
      className: 'badge-source-agoda',
      color: '#06b6d4',
      bg: 'rgba(6, 182, 212, 0.12)',
      border: 'rgba(6, 182, 212, 0.3)',
      dotColor: '#06b6d4',
    }
  }

  if (lower.includes('fab')) {
    return {
      label: 'Fab',
      className: 'badge-source-fab',
      color: '#d946ef',
      bg: 'rgba(217, 70, 239, 0.12)',
      border: 'rgba(217, 70, 239, 0.3)',
      dotColor: '#d946ef',
    }
  }

  if (lower.includes('corporate') || lower.includes('corp')) {
    return {
      label: 'Corporate',
      className: 'badge-source-corporate',
      color: '#94a3b8',
      bg: 'rgba(100, 116, 139, 0.14)',
      border: 'rgba(100, 116, 139, 0.3)',
      dotColor: '#94a3b8',
    }
  }

  if (lower.includes('direct') || lower.includes('web')) {
    return {
      label: s || 'Direct Web',
      className: 'badge-source-direct',
      color: '#22c55e',
      bg: 'rgba(34, 197, 94, 0.12)',
      border: 'rgba(34, 197, 94, 0.3)',
      dotColor: '#22c55e',
    }
  }

  // Default: Walk inn
  return {
    label: s || 'Walk inn',
    className: 'badge-source-walkin',
    color: '#14b8a6',
    bg: 'rgba(20, 184, 166, 0.12)',
    border: 'rgba(20, 184, 166, 0.3)',
    dotColor: '#14b8a6',
  }
}

export default function SourceBadge({
  source,
  size = 'sm',
  showDot = true,
  className = '',
  style = {},
}: SourceBadgeProps) {
  const config = getSourceConfig(source)

  const sizeStyles: Record<string, { padding: string; fontSize: string; dotSize: number }> = {
    xs: { padding: '1px 6px', fontSize: '10px', dotSize: 5 },
    sm: { padding: '2px 8px', fontSize: '11px', dotSize: 6 },
    md: { padding: '4px 10px', fontSize: '12px', dotSize: 7 },
  }

  const s = sizeStyles[size] || sizeStyles.sm

  return (
    <span
      className={`badge-source ${config.className} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: s.padding,
        fontSize: s.fontSize,
        fontWeight: 600,
        borderRadius: '6px',
        letterSpacing: '0.2px',
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
        ...style,
      }}
      title={`Booking Source: ${config.label}`}
    >
      {showDot && (
        <span
          style={{
            width: `${s.dotSize}px`,
            height: `${s.dotSize}px`,
            borderRadius: '50%',
            backgroundColor: 'currentColor',
            flexShrink: 0,
            opacity: 0.9,
          }}
        />
      )}
      <span>{config.label}</span>
    </span>
  )
}
