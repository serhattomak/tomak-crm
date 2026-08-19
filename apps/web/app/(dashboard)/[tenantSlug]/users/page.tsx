"use client"

import React, { useEffect, useState, useCallback } from "react"
import { usePermissions } from "@/lib/permissions/permission-context"
import { ApiClient, type TenantUserDto, type RoleDto } from "@/lib/api-client"
import { PermissionGate } from "@/components/permission-gate"
import { Users, UserPlus, Shield, Mail, Loader2, X } from "lucide-react"

export default function UsersManagementPage() {
  const { activeTenant } = usePermissions()
  const [users, setUsers] = useState<TenantUserDto[]>([])
  const [roles, setRoles] = useState<RoleDto[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Invite Modal
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRoleId, setInviteRoleId] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error"
    text: string
  } | null>(null)

  const loadData = useCallback(async () => {
    if (!activeTenant) return
    setIsLoading(true)

    const [usersRes, rolesRes] = await Promise.all([
      ApiClient.getTenantUsers(activeTenant.id),
      ApiClient.getRoles(activeTenant.id),
    ])

    if (usersRes.success && usersRes.data) {
      setUsers(usersRes.data)
    }

    if (rolesRes.success && rolesRes.data) {
      setRoles(rolesRes.data)
      if (rolesRes.data.length > 0 && !inviteRoleId) {
        setInviteRoleId(rolesRes.data[0]?.id || "")
      }
    }

    setIsLoading(false)
  }, [activeTenant, inviteRoleId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeTenant || !inviteEmail.trim() || !inviteRoleId) return

    setIsSubmitting(true)
    setStatusMessage(null)

    const res = await ApiClient.inviteUser(
      inviteEmail.trim(),
      inviteRoleId,
      activeTenant.id
    )
    setIsSubmitting(false)

    if (res.success) {
      setStatusMessage({ type: "success", text: "User invited successfully!" })
      setInviteEmail("")
      setIsInviteOpen(false)
      await loadData()
    } else {
      setStatusMessage({
        type: "error",
        text: res.message || "Failed to invite user.",
      })
    }
  }

  const handleRoleChange = async (userId: string, newRoleId: string) => {
    if (!activeTenant) return
    const res = await ApiClient.assignUserRole(
      userId,
      newRoleId,
      activeTenant.id
    )
    if (res.success) {
      await loadData()
    } else {
      alert(res.message || "Failed to update role.")
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-slate-900">
            <Users className="h-6 w-6 text-orange-500" />
            Team Members
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Manage workspace members and their access roles.
          </p>
        </div>

        <PermissionGate permission="Users.Invite">
          <button
            onClick={() => {
              setIsInviteOpen(true)
              setStatusMessage(null)
            }}
            className="flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-slate-800"
          >
            <UserPlus className="h-4 w-4" />
            Invite Member
          </button>
        </PermissionGate>
      </div>

      {statusMessage && (
        <div
          className={`rounded-xl p-3.5 text-xs font-medium ${
            statusMessage.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* Users Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-8 text-center text-xs text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
            Loading team members...
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              <tr>
                <th className="px-6 py-3.5">User</th>
                <th className="px-6 py-3.5">Email</th>
                <th className="px-6 py-3.5">Assigned Role</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="transition-colors hover:bg-slate-50/70"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-100 text-xs font-bold text-orange-700">
                        {(user.fullName || user.email).charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-slate-900">
                        {user.fullName || "—"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-slate-500">
                    {user.email}
                  </td>
                  <td className="px-6 py-4">
                    <PermissionGate
                      permission="Roles.Assign"
                      fallback={
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                          {user.roles.map((r) => r.name).join(", ") ||
                            "No Role"}
                        </span>
                      }
                    >
                      <select
                        value={user.roles[0]?.id || ""}
                        onChange={(e) =>
                          handleRoleChange(user.id, e.target.value)
                        }
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-800 focus:border-orange-500 focus:outline-none"
                      >
                        {roles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    </PermissionGate>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        user.isActive
                          ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-400">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Invite Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                <UserPlus className="h-4 w-4 text-orange-500" />
                Invite New Member
              </h2>
              <button
                onClick={() => setIsInviteOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-800">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute top-3 left-3 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="teammate@company.com"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pr-3 pl-9 text-xs text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-800">
                  Initial Role
                </label>
                <div className="relative">
                  <Shield className="absolute top-3 left-3 h-4 w-4 text-slate-400" />
                  <select
                    value={inviteRoleId}
                    onChange={(e) => setInviteRoleId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pr-3 pl-9 text-xs text-slate-900 focus:border-orange-500 focus:bg-white focus:outline-none"
                  >
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name} - {role.description || "Standard role"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 rounded-xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {isSubmitting && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
