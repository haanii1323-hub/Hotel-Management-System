import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantContext } from '@/lib/property-helper'

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5MB

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = (session.user as any)?.role || 'staff'
    if (!['owner', 'superadmin', 'admin', 'manager'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden: Only hotel owners or managers can upload QR codes' }, { status: 403 })
    }

    const { tenantId, propertyId: defaultPropId } = await getTenantContext(req, session?.user as any)

    const contentType = req.headers.get('content-type') || ''
    let dataUrl = ''
    let fileName = 'hotel-qr.png'
    let propertyId = defaultPropId

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const file = formData.get('file') as File | null
      const requestedPropId = formData.get('propertyId') as string | null
      if (requestedPropId) propertyId = requestedPropId

      if (!file) {
        return NextResponse.json({ error: 'No image file uploaded' }, { status: 400 })
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json({ error: 'Invalid file format. Please upload PNG, JPG, JPEG, or WebP.' }, { status: 400 })
      }

      if (file.size > MAX_SIZE_BYTES) {
        return NextResponse.json({ error: 'Image size exceeds 5MB limit.' }, { status: 400 })
      }

      fileName = file.name || 'qr-code.png'
      const bytes = await file.arrayBuffer()
      const base64 = Buffer.from(bytes).toString('base64')
      dataUrl = `data:${file.type};base64,${base64}`
    } else {
      const body = await req.json()
      if (body.propertyId) propertyId = body.propertyId
      if (!body.qrCodeDataUrl) {
        return NextResponse.json({ error: 'Missing QR image data' }, { status: 400 })
      }
      dataUrl = body.qrCodeDataUrl
      fileName = body.fileName || 'hotel-qr.png'

      // Validate data URL format
      const match = dataUrl.match(/^data:(image\/(png|jpeg|jpg|webp));base64,/)
      if (!match) {
        return NextResponse.json({ error: 'Invalid image format. Supported: PNG, JPG, WebP.' }, { status: 400 })
      }
    }

    if (!propertyId) {
      return NextResponse.json({ error: 'No active property found' }, { status: 400 })
    }

    // Verify property ownership
    const property = await prisma.property.findFirst({
      where: { id: propertyId, tenantId },
    })
    if (!property) {
      return NextResponse.json({ error: 'Property not found or unauthorized' }, { status: 404 })
    }

    // Upsert into PaymentConfig
    const config = await prisma.paymentConfig.upsert({
      where: { propertyId },
      create: {
        propertyId,
        tenantId,
        upiEnabled: true,
        qrCodeUrl: dataUrl,
        qrCodeFileName: fileName,
        cashEnabled: true,
        cardEnabled: true,
      },
      update: {
        qrCodeUrl: dataUrl,
        qrCodeFileName: fileName,
        upiEnabled: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Hotel QR code uploaded successfully',
      qrCodeUrl: config.qrCodeUrl,
      fileName: config.qrCodeFileName,
    })
  } catch (error: any) {
    console.error('Error uploading QR code:', error)
    return NextResponse.json({ error: error.message || 'Failed to upload QR code' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { tenantId, propertyId } = await getTenantContext(req, session?.user as any)
    if (!propertyId) {
      return NextResponse.json({ error: 'No active property' }, { status: 400 })
    }

    // Clear QR from config
    await prisma.paymentConfig.updateMany({
      where: { propertyId, tenantId },
      data: {
        qrCodeUrl: null,
        qrCodeFileName: null,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'QR code removed successfully',
    })
  } catch (error: any) {
    console.error('Error removing QR code:', error)
    return NextResponse.json({ error: 'Failed to remove QR code' }, { status: 500 })
  }
}
