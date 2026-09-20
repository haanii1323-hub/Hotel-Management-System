import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getPropertyData, getFallbackProperties } from './fallback-data'

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
    const prop = getPropertyData(requestedId)
    if (prop) {
      return {
        tenantId: prop.tenantId || sessionUser?.tenantId || 'demo-tenant',
        propertyId: prop.id,
      }
    }
  }

  // 2. If user has a tenant, pick their tenant's primary property
  const tenantId = sessionUser?.tenantId || 'demo-tenant'
  const tenantProps = getFallbackProperties(tenantId)
  if (tenantProps && tenantProps.length > 0) {
    return {
      tenantId,
      propertyId: tenantProps[0].id,
    }
  }

  const allProps = getFallbackProperties()
  return {
    tenantId: allProps[0]?.tenantId || 'demo-tenant',
    propertyId: allProps[0]?.id || '',
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
