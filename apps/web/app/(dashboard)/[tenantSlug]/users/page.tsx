"use client"

import React, { useEffect, useState, useCallback } from "react"
import { usePermissions } from "@/lib/permissions/permission-context"
import { ApiClient, type TenantUserDto, type RoleDto } from "@/lib/api-client"
import { PermissionGate } from "@/components/permission-gate"
import { Users, UserPlus, Shield, Mail, Loader2, Check, X } from "lucide-react"

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold text-slate-100">
            <Users className="h-6 w-6 text-indigo-400" />
            Team Members
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage members and role assignments for this workspace.
          </p>
        </div>

        <PermissionGate permission="Users.Invite">
          <button
            onClick={() => {
              setIsInviteOpen(true)
              setStatusMessage(null)
            }}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-600/20 transition-colors hover:bg-indigo-500"
          >
            <UserPlus className="h-4 w-4" />
            Invite Member
          </button>
        </PermissionGate>
      </div>

      {statusMessage && (
        <div
          className={`rounded-lg p-3 text-sm ${
            statusMessage.type === "success"
              ? "border border-emerald-800/60 bg-emerald-950/60 text-emerald-300"
              : "border border-red-800/60 bg-red-950/60 text-red-300"
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* Users Table */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-xl">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-8 text-center text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
            Loading team members...
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-xs font-semibold tracking-wider text-slate-400 uppercase">
              <tr>
                <th className="px-6 py-3.5">User</th>
                <th className="px-6 py-3.5">Email</th>
                <th className="px-6 py-3.5">Assigned Role</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="transition-colors hover:bg-slate-800/30"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-indigo-500/30 bg-indigo-600/20 text-xs font-semibold text-indigo-300">
                        {(user.fullName || user.email).charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-200">
                        {user.fullName || "—"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-400">
                    {user.email}
                  </td>
                  <td className="px-6 py-4">
                    <PermissionGate
                      permission="Roles.Assign"
                      fallback={
                        <span className="rounded bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300">
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
                        className="rounded border border-slate-800 bg-slate-950 px-2.5 py-1 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
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
                      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                        user.isActive
                          ? "border border-emerald-800/60 bg-emerald-950/80 text-emerald-400"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-100">
                <UserPlus className="h-5 w-5 text-indigo-400" />
                Invite New Member
              </h2>
              <button
                onClick={() => setIsInviteOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute top-3 left-3 h-4 w-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="teammate@company.com"
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 py-2 pr-3 pl-9 text-sm text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300">
                  Initial Role
                </label>
                <div className="relative">
                  <Shield className="absolute top-3 left-3 h-4 w-4 text-slate-500" />
                  <select
                    value={inviteRoleId}
                    onChange={(e) => setInviteRoleId(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 py-2 pr-3 pl-9 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                  >
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name} - {role.description || "Standard role"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
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
