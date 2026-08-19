"use client"

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react"
import {
  ApiClient,
  type UserProfileDto,
  type TenantDto,
} from "@/lib/api-client"

interface PermissionContextType {
  profile: UserProfileDto | null
  activeTenant: TenantDto | null
  tenants: TenantDto[]
  isLoading: boolean
  hasPermission: (permissionCode: string) => boolean
  hasAnyPermission: (permissionCodes: string[]) => boolean
  setActiveTenant: (tenant: TenantDto) => void
  refreshProfile: () => Promise<void>
  refreshTenants: () => Promise<void>
}

const PermissionContext = createContext<PermissionContextType | undefined>(
  undefined
)

export function PermissionProvider({
  children,
  initialTenantSlug,
}: {
  children: React.ReactNode
  initialTenantSlug?: string
}) {
  const [profile, setProfile] = useState<UserProfileDto | null>(null)
  const [tenants, setTenants] = useState<TenantDto[]>([])
  const [activeTenant, setActiveTenantState] = useState<TenantDto | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const refreshTenants = useCallback(async () => {
    const res = await ApiClient.getMyTenants()
    if (res.success && res.data) {
      setTenants(res.data)
      if (!activeTenant && res.data.length > 0) {
        const found = initialTenantSlug
          ? res.data.find((t) => t.slug === initialTenantSlug) || res.data[0]
          : res.data[0]
        setActiveTenantState(found || null)
      }
    }
  }, [activeTenant, initialTenantSlug])

  const refreshProfile = useCallback(async () => {
    if (!activeTenant) return
    const res = await ApiClient.getProfile(activeTenant.id)
    if (res.success && res.data) {
      setProfile(res.data)
    }
  }, [activeTenant])

  const setActiveTenant = (tenant: TenantDto) => {
    setActiveTenantState(tenant)
  }

  useEffect(() => {
    const init = async () => {
      setIsLoading(true)
      await refreshTenants()
      setIsLoading(false)
    }
    init()
  }, [refreshTenants])

  useEffect(() => {
    if (activeTenant) {
      refreshProfile()
    }
  }, [activeTenant, refreshProfile])

  const hasPermission = (permissionCode: string): boolean => {
    if (!profile) return false
    return profile.permissions.includes(permissionCode)
  }

  const hasAnyPermission = (permissionCodes: string[]): boolean => {
    if (!profile) return false
    return permissionCodes.some((code) => profile.permissions.includes(code))
  }

  return (
    <PermissionContext.Provider
      value={{
        profile,
        activeTenant,
        tenants,
        isLoading,
        hasPermission,
        hasAnyPermission,
        setActiveTenant,
        refreshProfile,
        refreshTenants,
      }}
    >
      {children}
    </PermissionContext.Provider>
  )
}

export function usePermissions() {
  const context = useContext(PermissionContext)
  if (!context) {
    throw new Error("usePermissions must be used within a PermissionProvider")
  }
  return context
}
