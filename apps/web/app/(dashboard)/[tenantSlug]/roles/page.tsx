"use client"

import React, { useEffect, useState, useCallback } from "react"
import { usePermissions } from "@/lib/permissions/permission-context"
import {
  ApiClient,
  type RoleDto,
  type PermissionGroupDto,
} from "@/lib/api-client"
import { PermissionGate } from "@/components/permission-gate"
import { Shield, Plus, Check, Loader2, Trash2, X, Lock } from "lucide-react"

export default function RolesManagementPage() {
  const { activeTenant, refreshProfile } = usePermissions()
  const [roles, setRoles] = useState<RoleDto[]>([])
  const [permissionGroups, setPermissionGroups] = useState<
    PermissionGroupDto[]
  >([])
  const [selectedRole, setSelectedRole] = useState<RoleDto | null>(null)
  const [selectedPermIds, setSelectedPermIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [statusMsg, setStatusMsg] = useState<{
    type: "success" | "error"
    text: string
  } | null>(null)

  // Create Role Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newRoleName, setNewRoleName] = useState("")
  const [newRoleDesc, setNewRoleDesc] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  const loadData = useCallback(async () => {
    if (!activeTenant) return
    setIsLoading(true)

    const [rolesRes, permsRes] = await Promise.all([
      ApiClient.getRoles(activeTenant.id),
      ApiClient.getAllPermissions(),
    ])

    if (rolesRes.success && rolesRes.data) {
      setRoles(rolesRes.data)
      if (rolesRes.data.length > 0 && !selectedRole) {
        const first = rolesRes.data[0]
        if (first) {
          setSelectedRole(first)
          setSelectedPermIds(new Set(first.permissions.map((p) => p.id)))
        }
      }
    }

    if (permsRes.success && permsRes.data) {
      setPermissionGroups(permsRes.data)
    }

    setIsLoading(false)
  }, [activeTenant, selectedRole])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSelectRole = (role: RoleDto) => {
    setSelectedRole(role)
    setSelectedPermIds(new Set(role.permissions.map((p) => p.id)))
    setStatusMsg(null)
  }

  const togglePermission = (permId: string) => {
    const next = new Set(selectedPermIds)
    if (next.has(permId)) {
      next.delete(permId)
    } else {
      next.add(permId)
    }
    setSelectedPermIds(next)
  }

  const handleSavePermissions = async () => {
    if (!activeTenant || !selectedRole) return

    setIsSaving(true)
    setStatusMsg(null)

    const res = await ApiClient.updateRolePermissions(
      selectedRole.id,
      selectedRole.name,
      selectedRole.description,
      Array.from(selectedPermIds),
      activeTenant.id
    )

    setIsSaving(false)

    if (res.success) {
      setStatusMsg({
        type: "success",
        text: "Role permissions saved and Redis cache invalidated!",
      })
      await loadData()
      await refreshProfile()
    } else {
      setStatusMsg({
        type: "error",
        text: res.message || "Failed to save permissions.",
      })
    }
  }

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeTenant || !newRoleName.trim()) return

    setIsCreating(true)
    const res = await ApiClient.createRole(
      newRoleName.trim(),
      newRoleDesc.trim(),
      [],
      activeTenant.id
    )
    setIsCreating(false)

    if (res.success) {
      setIsCreateOpen(false)
      setNewRoleName("")
      setNewRoleDesc("")
      await loadData()
    } else {
      alert(res.message || "Failed to create role.")
    }
  }

  const handleDeleteRole = async (roleId: string) => {
    if (!activeTenant || !confirm("Are you sure you want to delete this role?"))
      return

    const res = await ApiClient.deleteRole(roleId, activeTenant.id)
    if (res.success) {
      setSelectedRole(null)
      await loadData()
    } else {
      alert(res.message || "Failed to delete role.")
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-slate-900">
            <Shield className="h-6 w-6 text-orange-500" />
            Roles & Permissions Matrix
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Configure fine-grained PBAC / RBAC permission policies. Changes
            automatically update Redis cache.
          </p>
        </div>

        <PermissionGate permission="Roles.Create">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            New Role
          </button>
        </PermissionGate>
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

      {/* Main Grid: Roles List (Left) and Matrix (Right) */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        {/* Roles List */}
        <div className="space-y-2 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs md:col-span-4">
          <div className="mb-2 px-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
            Available Roles ({roles.length})
          </div>

          {isLoading ? (
            <div className="p-4 text-center text-xs text-slate-400">
              <Loader2 className="mx-auto h-4 w-4 animate-spin text-orange-500" />
            </div>
          ) : (
            <div className="space-y-1.5">
              {roles.map((role) => {
                const isSelected = selectedRole?.id === role.id
                return (
                  <div
                    key={role.id}
                    onClick={() => handleSelectRole(role)}
                    className={`cursor-pointer rounded-xl border p-3 transition-all ${
                      isSelected
                        ? "border-orange-200 bg-orange-50/70 text-orange-950 shadow-2xs"
                        : "border-slate-100 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                        {role.name}
                        {role.isDefault && (
                          <span title="System default role">
                            <Lock className="h-3 w-3 text-amber-500" />
                          </span>
                        )}
                      </span>
                      <span className="font-mono text-[11px] text-slate-400">
                        {role.memberCount} member
                        {role.memberCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {role.description && (
                      <p className="mt-1 line-clamp-2 text-[11px] text-slate-500">
                        {role.description}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Permissions Matrix */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs md:col-span-8">
          {selectedRole ? (
            <div>
              <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                    {selectedRole.name}
                    {selectedRole.isDefault && (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                        System Default
                      </span>
                    )}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {selectedRole.description || "No description provided."}
                  </p>
                </div>

                {!selectedRole.isDefault && (
                  <PermissionGate permission="Roles.Delete">
                    <button
                      onClick={() => handleDeleteRole(selectedRole.id)}
                      className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                      title="Delete Role"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </PermissionGate>
                )}
              </div>

              {/* Permission Groups */}
              <div className="max-h-[460px] space-y-6 overflow-y-auto pr-2">
                {permissionGroups.map((group) => (
                  <div key={group.module} className="space-y-3">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-orange-600 uppercase">
                      <span className="h-1.5 w-1.5 rounded-full bg-orange-500"></span>
                      {group.module} Module
                    </div>

                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {group.permissions.map((perm) => {
                        const isChecked = selectedPermIds.has(perm.id)
                        return (
                          <label
                            key={perm.id}
                            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all ${
                              isChecked
                                ? "border-orange-200 bg-orange-50/50 text-slate-900 shadow-2xs"
                                : "border-slate-100 bg-white text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => togglePermission(perm.id)}
                              className="mt-0.5 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                            />
                            <div>
                              <div className="text-xs font-semibold text-slate-900">
                                {perm.name}
                              </div>
                              <div className="font-mono text-[10px] text-orange-600/90">
                                {perm.code}
                              </div>
                              {perm.description && (
                                <div className="mt-0.5 text-[11px] text-slate-500">
                                  {perm.description}
                                </div>
                              )}
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Bar */}
              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                <span className="text-xs font-medium text-slate-500">
                  {selectedPermIds.size} permission
                  {selectedPermIds.size !== 1 ? "s" : ""} selected
                </span>

                <PermissionGate permission="Roles.Update">
                  <button
                    onClick={handleSavePermissions}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 rounded-xl bg-slate-950 px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-slate-800 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    Save & Invalidate Cache
                  </button>
                </PermissionGate>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-slate-400">
              Select a role from the left panel to configure its permission
              matrix.
            </div>
          )}
        </div>
      </div>

      {/* Create Role Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                <Shield className="h-4 w-4 text-orange-500" />
                Create Custom Role
              </h2>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-800">
                  Role Name
                </label>
                <input
                  type="text"
                  required
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g. Sales Manager"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-800">
                  Description
                </label>
                <textarea
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  placeholder="Responsibilities and access scope..."
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex items-center gap-1.5 rounded-xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {isCreating && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  Create Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
