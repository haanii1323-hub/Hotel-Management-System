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
    // Verify it belongs to their tenant
    const prop = await prisma.property.findFirst({
      where: { id: sessionUser.propertyId, tenantId },
    })
    if (prop) return { tenantId, propertyId: prop.id }
  }

  const requestedId =
    queryPropertyId && queryPropertyId !== 'all'
      ? queryPropertyId
      : headerPropertyId && headerPropertyId !== 'all'
      ? headerPropertyId
      : null

  if (requestedId) {
    // Verify requested property belongs strictly to this tenant
    const prop = await prisma.property.findFirst({
      where: { id: requestedId, tenantId },
    })
    if (prop) {
      return { tenantId, propertyId: prop.id }
    }
  }

  // Fallback: first active property belonging to this tenant
  const firstProp = await prisma.property.findFirst({
    where: { tenantId, isActive: true },
    orderBy: { createdAt: 'asc' },
  })

  return {
    tenantId,
    propertyId: firstProp?.id || null,
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
