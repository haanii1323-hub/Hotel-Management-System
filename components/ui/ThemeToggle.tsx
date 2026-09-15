'use client'

import React from 'react'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'

interface Props {
  variant?: 'button' | 'pill' | 'card'
  className?: string
  style?: React.CSSProperties
}

export default function ThemeToggle({ variant = 'button', className = '', style = {} }: Props) {
  const { theme, toggleTheme, isDark } = useTheme()

  if (variant === 'pill') {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          background: 'var(--card-2)',
          border: '1px solid var(--border)',
          borderRadius: '9999px',
          padding: '3px',
          gap: '2px',
          ...style,
        }}
        className={className}
      >
        <button
          type="button"
          onClick={() => isDark && toggleTheme()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 10px',
            borderRadius: '9999px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            border: 'none',
            background: !isDark ? 'var(--card)' : 'transparent',
            color: !isDark ? 'var(--text)' : 'var(--text-3)',
            boxShadow: !isDark ? 'var(--shadow-sm)' : 'none',
            transition: 'all 0.2s ease',
          }}
        >
          <Sun size={13} color={!isDark ? '#e11d48' : 'currentColor'} />
          <span>Light</span>
        </button>

        <button
          type="button"
          onClick={() => !isDark && toggleTheme()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 10px',
            borderRadius: '9999px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            border: 'none',
            background: isDark ? 'var(--card)' : 'transparent',
            color: isDark ? 'var(--text)' : 'var(--text-3)',
            boxShadow: isDark ? 'var(--shadow-sm)' : 'none',
            transition: 'all 0.2s ease',
          }}
        >
          <Moon size={13} color={isDark ? '#fbbf24' : 'currentColor'} />
          <span>Dark</span>
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`theme-toggle-btn ${className}`}
      title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '34px',
        height: '34px',
        borderRadius: '8px',
        background: 'var(--card-2)',
        border: '1px solid var(--border)',
        color: isDark ? '#fbbf24' : '#e11d48',
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        flexShrink: 0,
        ...style,
      }}
    >
      {isDark ? (
        <Sun size={16} strokeWidth={2.2} />
      ) : (
        <Moon size={16} strokeWidth={2.2} />
      )}
    </button>
  )
}
