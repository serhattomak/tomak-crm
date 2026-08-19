"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { usePermissions } from "@/lib/permissions/permission-context"
import { ApiClient } from "@/lib/api-client"
import { ChevronDown, Plus, Check, Loader2, Sparkles } from "lucide-react"

export function TenantSwitcher() {
  const router = useRouter()
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
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="group flex w-full items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-2 text-left transition-all hover:bg-slate-100"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-sm font-bold text-white shadow-sm">
            {activeTenant?.name
              ? activeTenant.name.charAt(0).toUpperCase()
              : "W."}
          </div>
          <div className="min-w-0">
            <div className="truncate text-xs font-bold text-slate-900">
              {activeTenant?.name || "Select Workspace"}
            </div>
            <div className="text-[10px] font-medium text-slate-400">
              Free Plan
            </div>
          </div>
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:text-slate-600" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1.5 w-full min-w-[240px] animate-in rounded-2xl border border-slate-200/80 bg-white py-1.5 shadow-xl fade-in slide-in-from-top-1">
          <div className="px-3 py-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            Workspaces
          </div>

          <div className="max-h-56 overflow-y-auto py-1">
            {tenants.map((tenant) => {
              const isSelected = activeTenant?.id === tenant.id
              return (
                <button
                  key={tenant.id}
                  type="button"
                  onClick={() => handleSelectTenant(tenant)}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs transition-colors hover:bg-slate-50 ${
                    isSelected
                      ? "bg-orange-50/60 font-semibold text-orange-600"
                      : "text-slate-700"
                  }`}
                >
                  <span className="truncate">{tenant.name}</span>
                  {isSelected && (
                    <Check className="h-3.5 w-3.5 shrink-0 text-orange-600" />
                  )}
                </button>
              )
            })}
          </div>

          <div className="mt-1 border-t border-slate-100 px-1.5 pt-1.5">
            {isCreating ? (
              <form onSubmit={handleCreateTenant} className="space-y-2 p-1.5">
                <input
                  type="text"
                  placeholder="Workspace Name"
                  value={newTenantName}
                  onChange={(e) => setNewTenantName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:outline-none"
                  autoFocus
                />
                <div className="flex justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="px-2 py-1 text-[11px] text-slate-500 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex items-center gap-1 rounded-lg bg-slate-950 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-slate-800 disabled:opacity-50"
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
                className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold text-orange-600 transition-colors hover:bg-orange-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Add New Workspace
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
