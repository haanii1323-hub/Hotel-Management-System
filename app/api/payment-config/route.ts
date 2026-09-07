import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantContext } from '@/lib/property-helper'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const { tenantId, propertyId } = await getTenantContext(req, session?.user as any)

    if (!propertyId) {
      return NextResponse.json({
        isConfigured: false,
        propertyId: null,
        upiEnabled: false,
        cashEnabled: true,
        cardEnabled: false,
        bankTransferEnabled: false,
        chequeEnabled: false,
        otherEnabled: false,
      })
    }

    const config = await prisma.paymentConfig.findUnique({
      where: { propertyId },
    })

    if (!config) {
      return NextResponse.json({
        isConfigured: false,
        propertyId,
        tenantId,
        upiEnabled: false,
        upiId: null,
        upiDisplayName: null,
        upiMerchantName: null,
        upiPhone: null,
        qrCodeUrl: null,
        qrCodeFileName: null,
        cashEnabled: true,
        cardEnabled: false,
        bankTransferEnabled: false,
        chequeEnabled: false,
        otherEnabled: false,
        cardProvider: null,
        cardInstructions: null,
        bankAccountName: null,
        bankName: null,
        bankAccountNumber: null,
        bankIfsc: null,
        bankBranch: null,
        bankAccountType: 'Current',
        paymentInstructions: null,
      })
    }

    // Determine if fully configured
    const hasUpi = Boolean(config.upiId?.trim()) || Boolean(config.qrCodeUrl)
    const hasBank = Boolean(config.bankAccountNumber?.trim())

    return NextResponse.json({
      ...config,
      isConfigured: hasUpi || hasBank || config.cashEnabled || config.cardEnabled,
    })
  } catch (error: any) {
    console.error('Error fetching payment config:', error)
    return NextResponse.json({ error: 'Failed to fetch payment configuration' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = (session.user as any)?.role || 'staff'
    if (!['owner', 'superadmin', 'admin', 'manager'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden: Only hotel owners or managers can modify payment settings' }, { status: 403 })
    }

    const { tenantId, propertyId: defaultPropId } = await getTenantContext(req, session?.user as any)
    const body = await req.json()
    const propertyId = body.propertyId || defaultPropId

    if (!propertyId) {
      return NextResponse.json({ error: 'No active property selected' }, { status: 400 })
    }

    // Verify property belongs to tenant
    const property = await prisma.property.findFirst({
      where: { id: propertyId, tenantId },
    })
    if (!property) {
      return NextResponse.json({ error: 'Property not found or unauthorized' }, { status: 404 })
    }

    const {
      upiEnabled = true,
      upiId,
      upiDisplayName,
      upiMerchantName,
      upiPhone,
      qrCodeUrl,
      qrCodeFileName,
      cashEnabled = true,
      cardEnabled = true,
      bankTransferEnabled = false,
      chequeEnabled = false,
      otherEnabled = false,
      cardProvider,
      cardInstructions,
      bankAccountName,
      bankName,
      bankAccountNumber,
      bankIfsc,
      bankBranch,
      bankAccountType = 'Current',
      paymentInstructions,
    } = body

    const config = await prisma.paymentConfig.upsert({
      where: { propertyId },
      create: {
        propertyId,
        tenantId,
        upiEnabled: Boolean(upiEnabled),
        upiId: upiId?.trim() || null,
        upiDisplayName: upiDisplayName?.trim() || null,
        upiMerchantName: upiMerchantName?.trim() || null,
        upiPhone: upiPhone?.trim() || null,
        qrCodeUrl: qrCodeUrl || null,
        qrCodeFileName: qrCodeFileName || null,
        cashEnabled: Boolean(cashEnabled),
        cardEnabled: Boolean(cardEnabled),
        bankTransferEnabled: Boolean(bankTransferEnabled),
        chequeEnabled: Boolean(chequeEnabled),
        otherEnabled: Boolean(otherEnabled),
        cardProvider: cardProvider?.trim() || null,
        cardInstructions: cardInstructions?.trim() || null,
        bankAccountName: bankAccountName?.trim() || null,
        bankName: bankName?.trim() || null,
        bankAccountNumber: bankAccountNumber?.trim() || null,
        bankIfsc: bankIfsc?.trim() || null,
        bankBranch: bankBranch?.trim() || null,
        bankAccountType: bankAccountType?.trim() || 'Current',
        paymentInstructions: paymentInstructions?.trim() || null,
      },
      update: {
        upiEnabled: Boolean(upiEnabled),
        upiId: upiId !== undefined ? (upiId?.trim() || null) : undefined,
        upiDisplayName: upiDisplayName !== undefined ? (upiDisplayName?.trim() || null) : undefined,
        upiMerchantName: upiMerchantName !== undefined ? (upiMerchantName?.trim() || null) : undefined,
        upiPhone: upiPhone !== undefined ? (upiPhone?.trim() || null) : undefined,
        qrCodeUrl: qrCodeUrl !== undefined ? (qrCodeUrl || null) : undefined,
        qrCodeFileName: qrCodeFileName !== undefined ? (qrCodeFileName || null) : undefined,
        cashEnabled: Boolean(cashEnabled),
        cardEnabled: Boolean(cardEnabled),
        bankTransferEnabled: Boolean(bankTransferEnabled),
        chequeEnabled: Boolean(chequeEnabled),
        otherEnabled: Boolean(otherEnabled),
        cardProvider: cardProvider !== undefined ? (cardProvider?.trim() || null) : undefined,
        cardInstructions: cardInstructions !== undefined ? (cardInstructions?.trim() || null) : undefined,
        bankAccountName: bankAccountName !== undefined ? (bankAccountName?.trim() || null) : undefined,
        bankName: bankName !== undefined ? (bankName?.trim() || null) : undefined,
        bankAccountNumber: bankAccountNumber !== undefined ? (bankAccountNumber?.trim() || null) : undefined,
        bankIfsc: bankIfsc !== undefined ? (bankIfsc?.trim() || null) : undefined,
        bankBranch: bankBranch !== undefined ? (bankBranch?.trim() || null) : undefined,
        bankAccountType: bankAccountType !== undefined ? (bankAccountType?.trim() || 'Current') : undefined,
        paymentInstructions: paymentInstructions !== undefined ? (paymentInstructions?.trim() || null) : undefined,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Payment configuration saved successfully',
      config,
    })
  } catch (error: any) {
    console.error('Error saving payment config:', error)
    return NextResponse.json({ error: error.message || 'Failed to save payment configuration' }, { status: 500 })
  }
}
