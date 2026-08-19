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
        <h1 className="flex items-center gap-2.5 text-2xl font-bold text-slate-100">
          <Settings className="h-6 w-6 text-indigo-400" />
          Workspace Settings
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Update basic details and preferences for this workspace.
        </p>
      </div>

      {statusMsg && (
        <div
          className={`rounded-lg p-3 text-sm ${
            statusMsg.type === "success"
              ? "border border-emerald-800/60 bg-emerald-950/60 text-emerald-300"
              : "border border-red-800/60 bg-red-950/60 text-red-300"
          }`}
        >
          {statusMsg.text}
        </div>
      )}

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-300">
              Workspace Name
            </label>
            <div className="relative">
              <Building2 className="absolute top-3 left-3 h-4 w-4 text-slate-500" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 py-2 pr-3 pl-9 text-sm text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-300">
              Workspace Slug
            </label>
            <input
              type="text"
              disabled
              value={activeTenant?.slug || ""}
              className="w-full cursor-not-allowed rounded-lg border border-slate-800/80 bg-slate-950/50 px-3 py-2 font-mono text-sm text-slate-500"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Slug is permanent and used in URL paths.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-300">
              Logo URL
            </label>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <PermissionGate permission="Tenants.Update">
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-600/20 transition-colors hover:bg-indigo-500 disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
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
