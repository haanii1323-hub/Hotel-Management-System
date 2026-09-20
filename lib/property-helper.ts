import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export interface TenantContext {
  tenantId: string
  propertyId: string | null
}

export async function getTenantContext(
  req: NextRequest,
  sessionUser?: { tenantId?: string; propertyId?: string | null; role?: string } | null
): Promise<TenantContext> {
  const { searchParams } = new URL(req.url)
  const queryPropertyId = searchParams.get('propertyId')
  const headerPropertyId = req.headers.get('x-property-id')
  const cookiePropertyId = req.cookies.get('apex_property_id')?.value

  // 1. Explicitly requested property from query params, headers, or cookies
  const requestedId =
    queryPropertyId && queryPropertyId !== 'all'
      ? queryPropertyId
      : headerPropertyId && headerPropertyId !== 'all'
      ? headerPropertyId
      : cookiePropertyId && cookiePropertyId !== 'all'
      ? cookiePropertyId
      : sessionUser?.propertyId || null

  if (requestedId) {
    try {
      const prop = await prisma.property.findUnique({ where: { id: requestedId } })
      if (prop) {
        return {
          tenantId: prop.tenantId,
          propertyId: prop.id,
        }
      }
    } catch {}
  }

  // 2. Look up the tenant's primary property from SQL
  const tenantId = sessionUser?.tenantId || 'demo-tenant'
  try {
    const prop = await prisma.property.findFirst({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: 'asc' },
    })
    if (prop) {
      return {
        tenantId: prop.tenantId,
        propertyId: prop.id,
      }
    }
  } catch {}

  return {
    tenantId,
    propertyId: sessionUser?.propertyId || null,
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
