"use client"

import React from "react"
import { usePermissions } from "@/lib/permissions/permission-context"

interface PermissionGateProps {
  permission?: string
  anyOf?: string[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function PermissionGate({
  permission,
  anyOf,
  children,
  fallback = null,
}: PermissionGateProps) {
  const { hasPermission, hasAnyPermission, isLoading } = usePermissions()

  if (isLoading) {
    return null
  }

  if (permission && !hasPermission(permission)) {
    return <>{fallback}</>
  }

  if (anyOf && anyOf.length > 0 && !hasAnyPermission(anyOf)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
