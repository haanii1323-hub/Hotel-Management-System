import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function getTargetPropertyId(req: NextRequest, userPropertyId?: string | null): Promise<string> {
  const { searchParams } = new URL(req.url)
  const queryPropertyId = searchParams.get('propertyId')
  const headerPropertyId = req.headers.get('x-property-id')

  // If user is locked to a specific property (e.g. staff or property admin), enforce it
  if (userPropertyId) {
    return userPropertyId
  }

  // If explicitly specified in request
  if (queryPropertyId && queryPropertyId !== 'all') {
    return queryPropertyId
  }
  if (headerPropertyId && headerPropertyId !== 'all') {
    return headerPropertyId
  }

  // Fallback to first active property
  const first = await prisma.property.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
  })

  return first?.id || ''
}
