"use client"

import React, { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { usePermissions } from "@/lib/permissions/permission-context"
import { ApiClient } from "@/lib/api-client"
import { Building2, ChevronDown, Plus, Check, Loader2 } from "lucide-react"

export function TenantSwitcher() {
  const router = useRouter()
  const params = useParams()
  const currentSlug = params?.tenantSlug as string | undefined

  const { tenants, activeTenant, setActiveTenant, refreshTenants } =
    usePermissions()
  const [isOpen, setIsOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newTenantName, setNewTenantName] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSelectTenant = (tenant: (typeof tenants)[0]) => {
    setActiveTenant(tenant)
    setIsOpen(false)
    router.push(`/${tenant.slug}`)
  }

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTenantName.trim()) return

    setIsLoading(true)
    const res = await ApiClient.createTenant(newTenantName.trim())
    setIsLoading(false)

    if (res.success && res.data) {
      await refreshTenants()
      setActiveTenant(res.data)
      setIsCreating(false)
      setNewTenantName("")
      setIsOpen(false)
      router.push(`/${res.data.slug}`)
    } else {
      alert(res.message || "Failed to create workspace")
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-56 items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-100 transition-colors hover:bg-slate-800"
      >
        <div className="flex items-center gap-2 truncate">
          <div className="rounded bg-indigo-600 p-1 text-white">
            <Building2 className="h-4 w-4" />
          </div>
          <span className="truncate">
            {activeTenant?.name || "Select Workspace"}
          </span>
        </div>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1 w-64 rounded-lg border border-slate-800 bg-slate-900 py-1 shadow-xl">
          <div className="px-3 py-1.5 text-xs font-semibold tracking-wider text-slate-400 uppercase">
            Workspaces
          </div>

          <div className="max-h-56 overflow-y-auto">
            {tenants.map((tenant) => {
              const isSelected = activeTenant?.id === tenant.id
              return (
                <button
                  key={tenant.id}
                  type="button"
                  onClick={() => handleSelectTenant(tenant)}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-slate-800 ${
                    isSelected
                      ? "bg-slate-800/50 font-medium text-indigo-400"
                      : "text-slate-200"
                  }`}
                >
                  <span className="truncate">{tenant.name}</span>
                  {isSelected && (
                    <Check className="h-4 w-4 shrink-0 text-indigo-400" />
                  )}
                </button>
              )
            })}
          </div>

          <div className="mt-1 border-t border-slate-800 pt-1">
            {isCreating ? (
              <form onSubmit={handleCreateTenant} className="space-y-2 p-2">
                <input
                  type="text"
                  placeholder="Workspace Name"
                  value={newTenantName}
                  onChange={(e) => setNewTenantName(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
                  autoFocus
                />
                <div className="flex justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="px-2 py-1 text-xs text-slate-400 hover:text-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex items-center gap-1 rounded bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                  >
                    {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                    Create
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-indigo-400 transition-colors hover:bg-slate-800"
              >
                <Plus className="h-3.5 w-3.5" />
                Create Workspace
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
