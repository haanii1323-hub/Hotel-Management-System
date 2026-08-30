'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import useSWR, { useSWRConfig } from 'swr'

export interface Property {
  id: string
  code: string
  name: string
  city: string
  state: string
  country: string
  address?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  currency: string
  currencySymbol: string
  timezone: string
  taxRate: number
  checkInTime: string
  checkOutTime: string
  coverImage?: string | null
  logo?: string | null
  isActive: boolean
  _count?: {
    rooms: number
    bookings: number
    categories: number
  }
}

interface PropertyContextType {
  currentProperty: Property | null
  properties: Property[]
  isLoading: boolean
  isSwitching: boolean
  switchProperty: (propertyId: string) => Promise<void>
  reloadProperties: () => Promise<void>
}

const PropertyContext = createContext<PropertyContextType>({
  currentProperty: null,
  properties: [],
  isLoading: true,
  isSwitching: false,
  switchProperty: async () => {},
  reloadProperties: async () => {},
})

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function PropertyProvider({ children }: { children: React.ReactNode }) {
  const { data: propertiesData, mutate: mutateProperties, isLoading } = useSWR<Property[]>(
    '/api/properties',
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 5000 }
  )

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isSwitching, setIsSwitching] = useState(false)
  const { mutate: globalMutate } = useSWRConfig()

  // Load initial selection from localStorage / cookie on mount
  useEffect(() => {
    const saved = localStorage.getItem('apex_selected_property_id')
    if (saved) {
      setSelectedId(saved)
      document.cookie = `apex_property_id=${saved}; path=/; max-age=31536000`
    }
  }, [])

  // Auto-select first active property if none selected or if selected property not found
  const properties = propertiesData || []
  const currentProperty =
    properties.find((p) => p.id === selectedId) ||
    properties.find((p) => p.isActive) ||
    properties[0] ||
    null

  useEffect(() => {
    if (currentProperty && currentProperty.id !== selectedId) {
      setSelectedId(currentProperty.id)
      localStorage.setItem('apex_selected_property_id', currentProperty.id)
      document.cookie = `apex_property_id=${currentProperty.id}; path=/; max-age=31536000`
    }
  }, [currentProperty, selectedId])

  async function switchProperty(propertyId: string) {
    if (propertyId === selectedId) return
    setIsSwitching(true)
    setSelectedId(propertyId)
    localStorage.setItem('apex_selected_property_id', propertyId)
    document.cookie = `apex_property_id=${propertyId}; path=/; max-age=31536000`

    // Invalidate all SWR API caches so all screens update to this property's data
    await globalMutate(
      (key) => typeof key === 'string' && key.startsWith('/api/'),
      undefined,
      { revalidate: true }
    )

    setTimeout(() => {
      setIsSwitching(false)
    }, 250)
  }

  async function reloadProperties() {
    await mutateProperties()
  }

  return (
    <PropertyContext.Provider
      value={{
        currentProperty,
        properties,
        isLoading,
        isSwitching,
        switchProperty,
        reloadProperties,
      }}
    >
      {children}
    </PropertyContext.Provider>
  )
}

export function useProperty() {
  return useContext(PropertyContext)
}
