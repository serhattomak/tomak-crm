"use client"

import React, { useState, useEffect } from "react"
import { usePermissions } from "@/lib/permissions/permission-context"
import { ApiClient } from "@/lib/api-client"
import { PermissionGate } from "@/components/permission-gate"
import { Settings, Building2, Check, Loader2 } from "lucide-react"

export default function WorkspaceSettingsPage() {
  const { activeTenant, refreshTenants } = usePermissions()
  const [name, setName] = useState("")
  const [logoUrl, setLogoUrl] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [statusMsg, setStatusMsg] = useState<{
    type: "success" | "error"
    text: string
  } | null>(null)

  useEffect(() => {
    if (activeTenant) {
      setName(activeTenant.name)
      setLogoUrl(activeTenant.logoUrl || "")
    }
  }, [activeTenant])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeTenant || !name.trim()) return

    setIsSaving(true)
    setStatusMsg(null)

    const res = await ApiClient.updateTenant(
      activeTenant.id,
      name.trim(),
      logoUrl.trim() || undefined,
      activeTenant.id
    )
    setIsSaving(false)

    if (res.success) {
      setStatusMsg({
        type: "success",
        text: "Workspace settings updated successfully!",
      })
      await refreshTenants()
    } else {
      setStatusMsg({
        type: "error",
        text: res.message || "Failed to update workspace settings.",
      })
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-slate-900">
          <Settings className="h-6 w-6 text-orange-500" />
          Workspace Settings
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Update basic details and branding preferences for this workspace.
        </p>
      </div>

      {statusMsg && (
        <div
          className={`rounded-xl p-3.5 text-xs font-medium ${
            statusMsg.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {statusMsg.text}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-800">
              Workspace Name
            </label>
            <div className="relative">
              <Building2 className="absolute top-3 left-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pr-3 pl-9 text-xs text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-800">
              Workspace Slug
            </label>
            <input
              type="text"
              disabled
              value={activeTenant?.slug || ""}
              className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100/70 px-3 py-2.5 font-mono text-xs text-slate-500"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Slug is permanent and used in URL paths and database partition
              keys.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-800">
              Logo URL
            </label>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:bg-white focus:outline-none"
            />
          </div>

          <PermissionGate permission="Tenants.Update">
            <div className="flex justify-end border-t border-slate-100 pt-3">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-1.5 rounded-xl bg-slate-950 px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-slate-800 disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                Save Changes
              </button>
            </div>
          </PermissionGate>
        </form>
      </div>
    </div>
  )
}
