import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export interface TenantContext {
  tenantId: string
  propertyId: string | null
}

export async function getTenantContext(
  req: NextRequest,
  sessionUser?: { tenantId?: string; propertyId?: string | null } | null
): Promise<TenantContext> {
  const tenantId = sessionUser?.tenantId || 'demo-tenant'
  const { searchParams } = new URL(req.url)
  const queryPropertyId = searchParams.get('propertyId')
  const headerPropertyId = req.headers.get('x-property-id')

  // If user is restricted to a property
  if (sessionUser?.propertyId) {
    try {
      const prop = await prisma.property.findFirst({
        where: { id: sessionUser.propertyId, tenantId },
      })
      if (prop) return { tenantId, propertyId: prop.id }
    } catch {
      // ignore
    }
    return { tenantId, propertyId: sessionUser.propertyId }
  }

  // Fast-path demo properties
  if (requestedId && (requestedId.startsWith('prop-demo-') || requestedId.startsWith('BLR') || requestedId === 'demo')) {
    return { tenantId, propertyId: requestedId }
  }

  if (requestedId) {
    try {
      const prop = await prisma.property.findFirst({
        where: { id: requestedId, tenantId },
      })
      if (prop) {
        return { tenantId, propertyId: prop.id }
      }
    } catch {
      // ignore
    }
    return { tenantId, propertyId: requestedId }
  }

  // Fallback: first active property belonging to this tenant
  try {
    const firstProp = await prisma.property.findFirst({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: 'asc' },
    })
    if (firstProp) {
      return {
        tenantId,
        propertyId: firstProp.id,
      }
    }
  } catch {
    // ignore
  }

  return {
    tenantId,
    propertyId: 'prop-demo-blr3396',
  }
}

export async function getTargetPropertyId(
  req: NextRequest,
  userPropertyId?: string | null,
  tenantId?: string
): Promise<string> {
  const context = await getTenantContext(req, { tenantId, propertyId: userPropertyId })
  return context.propertyId || ''
}
