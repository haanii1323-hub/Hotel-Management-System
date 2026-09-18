'use client'

import React from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  BedDouble,
  Users,
  TrendingUp,
  ShieldCheck,
  Building2,
  CreditCard,
  BarChart3,
} from 'lucide-react'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { InstallAppButton } from '@/components/ui/InstallApp'

export default function LuxuryLandingPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        color: 'var(--text)',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ========================================================================= */}
      {/* 1. TOP NAVIGATION BAR */}
      {/* ========================================================================= */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          transition: 'all 0.2s ease',
        }}
        className="luxury-nav-header backdrop-blur-md"
      >
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '14px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '20px',
          }}
        >
          {/* Generic Neoclassical Hotel Emblem & Title */}
          <Link
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              textDecoration: 'none',
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="34" height="34" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="luxury-nav-icon">
                <path d="M18 3L4 10V33H32V10L18 3Z" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9 13V33" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M15 11V33" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M21 11V33" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M27 13V33" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M2 33H34" strokeWidth="2" strokeLinecap="round" />
                <path d="M18 3V8" strokeWidth="1.5" />
              </svg>
            </div>
            <div>
              <span
                style={{
                  display: 'block',
                  fontFamily: "'Playfair Display', serif",
                  fontSize: '19px',
                  fontWeight: 800,
                  letterSpacing: '1px',
                  lineHeight: 1.1,
                }}
                className="luxury-nav-brand"
              >
                HOTEL MANAGEMENT
              </span>
              <span
                style={{
                  display: 'block',
                  fontSize: '10.5px',
                  fontWeight: 500,
                  letterSpacing: '0.6px',
                  marginTop: '1px',
                }}
                className="luxury-nav-sub"
              >
                Cloud Property Management System
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '32px',
            }}
            className="hidden md:flex"
          >
            <Link
              href="/"
              style={{
                fontSize: '14px',
                fontWeight: 600,
                textDecoration: 'none',
              }}
              className="luxury-nav-link"
            >
              Home
            </Link>
            <a
              href="#features"
              style={{
                fontSize: '14px',
                fontWeight: 500,
                textDecoration: 'none',
              }}
              className="luxury-nav-link"
            >
              Features
            </a>
            <a
              href="#why-us"
              style={{
                fontSize: '14px',
                fontWeight: 500,
                textDecoration: 'none',
              }}
              className="luxury-nav-link"
            >
              Why Us
            </a>
            <a
              href="#about"
              style={{
                fontSize: '14px',
                fontWeight: 500,
                textDecoration: 'none',
              }}
              className="luxury-nav-link"
            >
              About
            </a>
          </nav>

          {/* Right Action Section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <Link
              href="/auth"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 24px',
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                color: '#ffffff',
                border: '1px solid rgba(229, 192, 110, 0.4)',
                borderRadius: '30px',
                fontSize: '13.5px',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
                transition: 'all 0.2s ease',
              }}
              className="hover:scale-[1.04] hover:border-amber-400 active:scale-[0.98]"
            >
              <span style={{ color: '#ffffff' }}>Login</span>
              <ArrowRight size={15} color="#e5c06e" />
            </Link>

            <span
              style={{
                fontSize: '12.5px',
                fontWeight: 500,
                letterSpacing: '0.4px',
                whiteSpace: 'nowrap',
              }}
              className="hidden lg:inline-block luxury-nav-sub"
            >
              Manage · Automate · Grow
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ThemeToggle variant="pill" />
              <InstallAppButton variant="landing-badge" />
            </div>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. HERO SECTION (LUXURY HOTEL GRAND LOBBY) */}
      {/* ========================================================================= */}
      <section
        style={{
          position: 'relative',
          minHeight: '620px',
          backgroundImage: "url('/images/hero-lobby.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '85px 24px 130px',
          overflow: 'hidden',
        }}
      >
        {/* Rich Ambient Luxury Dark Overlay for Pristine High-Contrast Text Legibility */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(90deg, rgba(7, 10, 15, 0.94) 0%, rgba(7, 10, 15, 0.82) 45%, rgba(7, 10, 15, 0.42) 75%, rgba(7, 10, 15, 0.2) 100%)',
            zIndex: 1,
          }}
        />

        {/* Hero Content Container */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            maxWidth: '1280px',
            width: '100%',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          {/* Top Tagline */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: '#e5c06e',
              fontSize: '12.5px',
              fontWeight: 700,
              letterSpacing: '2.2px',
              textTransform: 'uppercase',
              marginBottom: '16px',
            }}
          >
            <span>ALL IN ONE HOTEL MANAGEMENT SYSTEM</span>
          </div>

          {/* Luxury Main Heading (Always High-Contrast White & Gold) */}
          <h1
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 'clamp(36px, 5.2vw, 64px)',
              fontWeight: 700,
              lineHeight: 1.15,
              color: '#ffffff',
              maxWidth: '820px',
              letterSpacing: '-0.5px',
              marginBottom: '20px',
              textShadow: '0 3px 12px rgba(0,0,0,0.6)',
            }}
          >
            Simplify Operations
            <br />
            <span
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontStyle: 'italic',
                color: '#e5c06e',
                fontWeight: 600,
              }}
            >
              Elevate Guest Experiences
            </span>
          </h1>

          {/* Subtitle Description */}
          <p
            style={{
              fontSize: '16px',
              lineHeight: 1.65,
              color: 'rgba(255, 255, 255, 0.92)',
              maxWidth: '560px',
              fontWeight: 400,
              marginBottom: '36px',
              textShadow: '0 2px 8px rgba(0,0,0,0.5)',
            }}
          >
            A modern Hotel Management System designed to help hotels manage bookings, guests, rooms, payments and more — all in one place.
          </p>

          {/* Luxury Action Buttons */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              flexWrap: 'wrap',
            }}
          >
            {/* Primary Get Started Button */}
            <Link
              href="/auth"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                padding: '14px 34px',
                background: 'linear-gradient(135deg, #e5be75 0%, #c99c42 100%)',
                color: '#17120a',
                borderRadius: '30px',
                fontSize: '15px',
                fontWeight: 800,
                textDecoration: 'none',
                boxShadow: '0 8px 24px rgba(201, 156, 66, 0.45)',
                transition: 'all 0.2s ease',
              }}
              className="hover:scale-[1.04] hover:shadow-[0_12px_28px_rgba(201,156,66,0.6)] active:scale-[0.98]"
            >
              <span>Get Started</span>
              <ArrowRight size={17} strokeWidth={2.5} />
            </Link>

            {/* Secondary Learn More Button */}
            <a
              href="#features"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '14px 30px',
                background: 'rgba(255, 255, 255, 0.12)',
                color: '#ffffff',
                border: '1.5px solid rgba(255, 255, 255, 0.4)',
                borderRadius: '30px',
                fontSize: '15px',
                fontWeight: 700,
                textDecoration: 'none',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
                transition: 'all 0.2s ease',
              }}
              className="hover:bg-white/25 hover:border-white active:scale-[0.98]"
            >
              <span>Learn More</span>
            </a>
          </div>
        </div>

        {/* Decorative Luxury Handwritten Script Signature (Bottom Right of Hero) */}
        <div
          style={{
            position: 'absolute',
            bottom: '36px',
            right: '48px',
            zIndex: 3,
            textAlign: 'right',
          }}
          className="hidden md:block"
        >
          <div
            style={{
              fontFamily: "'Alex Brush', cursive",
              fontSize: '34px',
              color: 'rgba(255, 255, 255, 0.92)',
              letterSpacing: '1px',
              lineHeight: 1,
              textShadow: '0 2px 10px rgba(0,0,0,0.6)',
            }}
          >
            Better Stays
            <br />
            Brighter Tomorrows
          </div>
          <div
            style={{
              width: '80px',
              height: '1.5px',
              background: '#e5c06e',
              marginLeft: 'auto',
              marginTop: '6px',
            }}
          />
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. FLOATING 4-PILLAR FEATURE BAR (OVERLAPPING BOTTOM OF HERO) */}
      {/* ========================================================================= */}
      <div
        style={{
          maxWidth: '1280px',
          width: 'calc(100% - 48px)',
          margin: '-56px auto 60px',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <div
          style={{
            background: 'var(--card)',
            borderRadius: '16px',
            border: '1px solid var(--border)',
            boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.08), 0 0 1px rgba(0, 0, 0, 0.05)',
            padding: '24px 32px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '24px',
            alignItems: 'center',
          }}
        >
          {/* Pillar 1: Room Management */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '10px',
                background: 'var(--bg-2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text)',
                flexShrink: 0,
              }}
            >
              <BedDouble size={22} strokeWidth={2} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>
                Room Management
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--text-3)', fontWeight: 500 }}>
                Real-time availability
              </div>
            </div>
          </div>

          {/* Pillar 2: Guest Management */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              borderLeft: '1px solid var(--border)',
              paddingLeft: '24px',
            }}
            className="md:border-l"
          >
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '10px',
                background: 'var(--bg-2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text)',
                flexShrink: 0,
              }}
            >
              <Users size={22} strokeWidth={2} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>
                Guest Management
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--text-3)', fontWeight: 500 }}>
                Seamless check-in/out
              </div>
            </div>
          </div>

          {/* Pillar 3: Smart Reports */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              borderLeft: '1px solid var(--border)',
              paddingLeft: '24px',
            }}
            className="md:border-l"
          >
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '10px',
                background: 'var(--bg-2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text)',
                flexShrink: 0,
              }}
            >
              <TrendingUp size={22} strokeWidth={2} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>
                Smart Reports
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--text-3)', fontWeight: 500 }}>
                Track revenue &amp; occupancy
              </div>
            </div>
          </div>

          {/* Pillar 4: Secure & Reliable */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              borderLeft: '1px solid var(--border)',
              paddingLeft: '24px',
            }}
            className="md:border-l"
          >
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '10px',
                background: 'var(--bg-2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text)',
                flexShrink: 0,
              }}
            >
              <ShieldCheck size={22} strokeWidth={2} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>
                Secure &amp; Reliable
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--text-3)', fontWeight: 500 }}>
                Your data, always safe
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. KEY FEATURES SECTION (5 GRID CARDS) */}
      {/* ========================================================================= */}
      <section
        id="features"
        style={{
          maxWidth: '1280px',
          width: '100%',
          margin: '0 auto',
          padding: '40px 24px 70px',
          textAlign: 'center',
        }}
      >
        {/* Section Header */}
        <div
          style={{
            fontSize: '11.5px',
            fontWeight: 700,
            letterSpacing: '2px',
            color: '#9ca3af',
            textTransform: 'uppercase',
            marginBottom: '10px',
          }}
        >
          KEY FEATURES
        </div>

        <h2
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 'clamp(28px, 3.8vw, 42px)',
            fontWeight: 700,
            color: 'var(--text)',
            marginBottom: '14px',
            letterSpacing: '-0.3px',
          }}
        >
          Everything You Need, In One System
        </h2>

        <p
          style={{
            fontSize: '15px',
            color: 'var(--text-2)',
            maxWidth: '680px',
            margin: '0 auto 48px',
            lineHeight: 1.6,
          }}
        >
          From bookings to billing, our hotel management system simplifies hotel operations so you can focus on what matters most — your guests.
        </p>

        {/* 5 Feature Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '20px',
            textAlign: 'center',
          }}
        >
          {/* Card 1: Booking Management */}
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '36px 20px 30px',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              transition: 'all 0.25s ease',
            }}
            className="hover:-translate-y-1 hover:shadow-lg"
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text)',
                marginBottom: '18px',
              }}
            >
              <BedDouble size={30} strokeWidth={1.8} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '10px' }}>
              Booking Management
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-3)', lineHeight: 1.55 }}>
              Manage reservations with ease and avoid double bookings.
            </p>
          </div>

          {/* Card 2: Guest Profiles */}
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '36px 20px 30px',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              transition: 'all 0.25s ease',
            }}
            className="hover:-translate-y-1 hover:shadow-lg"
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text)',
                marginBottom: '18px',
              }}
            >
              <Users size={30} strokeWidth={1.8} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '10px' }}>
              Guest Profiles
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-3)', lineHeight: 1.55 }}>
              Keep guest details, history and preferences.
            </p>
          </div>

          {/* Card 3: Room Operations */}
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '36px 20px 30px',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              transition: 'all 0.25s ease',
            }}
            className="hover:-translate-y-1 hover:shadow-lg"
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text)',
                marginBottom: '18px',
              }}
            >
              <Building2 size={30} strokeWidth={1.8} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '10px' }}>
              Room Operations
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-3)', lineHeight: 1.55 }}>
              Track room status, housekeeping and maintenance.
            </p>
          </div>

          {/* Card 4: Billing & Payments */}
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '36px 20px 30px',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              transition: 'all 0.25s ease',
            }}
            className="hover:-translate-y-1 hover:shadow-lg"
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text)',
                marginBottom: '18px',
              }}
            >
              <CreditCard size={30} strokeWidth={1.8} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '10px' }}>
              Billing &amp; Payments
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-3)', lineHeight: 1.55 }}>
              Generate invoices and manage payments seamlessly.
            </p>
          </div>

          {/* Card 5: Reports & Analytics */}
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '36px 20px 30px',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              transition: 'all 0.25s ease',
            }}
            className="hover:-translate-y-1 hover:shadow-lg"
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text)',
                marginBottom: '18px',
              }}
            >
              <BarChart3 size={30} strokeWidth={1.8} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '10px' }}>
              Reports &amp; Analytics
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-3)', lineHeight: 1.55 }}>
              Get insights on occupancy, revenue and performance.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. CALL TO ACTION BANNER (WARM CHAMPAGNE WITH BOTANICAL ARTWORK) */}
      {/* ========================================================================= */}
      <section
        id="why-us"
        style={{
          maxWidth: '1280px',
          width: 'calc(100% - 48px)',
          margin: '20px auto 70px',
        }}
      >
        <div
          style={{
            position: 'relative',
            background: 'linear-gradient(135deg, #f7ede2 0%, #fae6d3 100%)',
            borderRadius: '20px',
            border: '1px solid rgba(214, 168, 88, 0.25)',
            padding: '48px 48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '30px',
            flexWrap: 'wrap',
            overflow: 'hidden',
          }}
          className="luxury-cta-banner"
        >
          {/* Subtle Botanical Leaf SVG Art (Right Background) */}
          <div
            style={{
              position: 'absolute',
              right: '-20px',
              top: '-30px',
              bottom: '-30px',
              opacity: 0.18,
              pointerEvents: 'none',
            }}
          >
            <svg width="280" height="280" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M100 20C100 20 120 70 170 80C120 90 100 140 100 140C100 140 80 90 30 80C80 70 100 20 100 20Z"
                stroke="#6b4c27"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M130 50C130 50 145 90 190 100C145 110 130 150 130 150C130 150 115 110 70 100C115 90 130 50 130 50Z"
                stroke="#6b4c27"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path d="M40 170Q100 110 160 50" stroke="#6b4c27" strokeWidth="2" strokeLinecap="round" />
              <path d="M70 140Q90 110 120 120" stroke="#6b4c27" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M100 110Q120 80 150 90" stroke="#6b4c27" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>

          {/* Left Text */}
          <div style={{ position: 'relative', zIndex: 2, maxWidth: '640px' }}>
            <div
              style={{
                fontSize: '11.5px',
                fontWeight: 700,
                letterSpacing: '2px',
                color: '#8c6d46',
                textTransform: 'uppercase',
                marginBottom: '8px',
              }}
            >
              HOSPITALITY MADE SIMPLE
            </div>

            <h3
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 'clamp(26px, 3.2vw, 38px)',
                fontWeight: 700,
                color: '#1a160d',
                letterSpacing: '-0.3px',
                lineHeight: 1.2,
                marginBottom: '10px',
              }}
            >
              Ready to Transform Your Hotel Operations?
            </h3>

            <p style={{ fontSize: '15px', color: '#594a37', fontWeight: 500 }}>
              Join the future of smart hospitality with a modern hotel management system.
            </p>
          </div>

          {/* Right Action Button */}
          <div style={{ position: 'relative', zIndex: 2 }}>
            <Link
              href="/auth"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                padding: '14px 30px',
                background: '#111827',
                color: '#ffffff',
                border: '1px solid rgba(229, 192, 110, 0.4)',
                borderRadius: '30px',
                fontSize: '14.5px',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 8px 20px rgba(17, 24, 39, 0.35)',
                transition: 'all 0.2s ease',
              }}
              className="hover:scale-[1.04] hover:border-amber-400 active:scale-[0.98]"
            >
              <span style={{ color: '#ffffff' }}>Login to Continue</span>
              <ArrowRight size={16} color="#e5c06e" />
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. LUXURY DARK FOOTER */}
      {/* ========================================================================= */}
      <footer
        id="about"
        style={{
          marginTop: 'auto',
          background: '#0e1219',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          color: '#ffffff',
          padding: '48px 24px 32px',
        }}
      >
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '36px',
          }}
        >
          {/* Top Footer Row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '24px',
              flexWrap: 'wrap',
            }}
          >
            {/* Generic Hotel Management System Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="34" height="34" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 3L4 10V33H32V10L18 3Z" stroke="#e5c06e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M9 13V33" stroke="#e5c06e" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M15 11V33" stroke="#e5c06e" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M21 11V33" stroke="#e5c06e" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M27 13V33" stroke="#e5c06e" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M2 33H34" stroke="#e5c06e" strokeWidth="2" strokeLinecap="round" />
                  <path d="M18 3V8" stroke="#e5c06e" strokeWidth="1.5" />
                </svg>
              </div>
              <div>
                <span
                  style={{
                    display: 'block',
                    fontFamily: "'Playfair Display', serif",
                    fontSize: '18px',
                    fontWeight: 800,
                    letterSpacing: '1px',
                    lineHeight: 1.1,
                    color: '#ffffff',
                  }}
                >
                  HOTEL MANAGEMENT
                </span>
                <span
                  style={{
                    display: 'block',
                    fontSize: '10.5px',
                    fontWeight: 500,
                    letterSpacing: '0.6px',
                    color: 'rgba(255, 255, 255, 0.5)',
                    marginTop: '1px',
                  }}
                >
                  Cloud Property Operations System
                </span>
              </div>
            </div>

            {/* Nav links */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '28px',
                fontSize: '13.5px',
                color: 'rgba(255, 255, 255, 0.7)',
              }}
            >
              <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }} className="hover:text-white">
                Home
              </Link>
              <a href="#features" style={{ color: 'inherit', textDecoration: 'none' }} className="hover:text-white">
                Features
              </a>
              <a href="#about" style={{ color: 'inherit', textDecoration: 'none' }} className="hover:text-white">
                About
              </a>
              <a href="/auth" style={{ color: 'inherit', textDecoration: 'none' }} className="hover:text-white">
                Contact
              </a>
            </div>

            {/* Handwritten Signature on Footer */}
            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  fontFamily: "'Alex Brush', cursive",
                  fontSize: '32px',
                  color: '#ffffff',
                  lineHeight: 1.1,
                }}
              >
                Good Stays
                <br />
                Create Great Stories
              </div>
              <div
                style={{
                  width: '70px',
                  height: '1.5px',
                  background: '#e5c06e',
                  marginLeft: 'auto',
                  marginTop: '4px',
                }}
              />
            </div>
          </div>

          {/* Bottom Copyright & Slogan */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              paddingTop: '20px',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.45)',
              flexWrap: 'wrap',
            }}
          >
            <div>© 2026 Hotel Management System. All rights reserved.</div>
            <div>Built for a Smarter Hospitality World ♡</div>
          </div>
        </div>
      </footer>
    </div>
  )
}
