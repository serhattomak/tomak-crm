"use client"

import { Loader2, Mail, Shield, UserPlus, Users, X } from "lucide-react"
import type React from "react"
import { useCallback, useEffect, useState } from "react"
import { PermissionGate } from "@/components/permission-gate"
import { ApiClient, type RoleDto, type TenantUserDto } from "@/lib/api-client"
import { usePermissions } from "@/lib/permissions/permission-context"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { toast } from "@workspace/ui/components/sonner"

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
    if (!activeTenant) {
      return
    }
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
    if (!(activeTenant && inviteEmail.trim() && inviteRoleId)) {
      return
    }

    setIsSubmitting(true)
    setStatusMessage(null)

    const res = await ApiClient.inviteUser(
      inviteEmail.trim(),
      inviteRoleId,
      activeTenant.id
    )
    setIsSubmitting(false)

    if (res.success) {
      toast.success("Kullanıcı daveti gönderildi.")
      setInviteEmail("")
      setIsInviteOpen(false)
      await loadData()
    } else {
      toast.error(res.message || "Kullanıcı davet edilemedi.")
    }
  }

  const handleRoleChange = async (userId: string, newRoleId: string) => {
    if (!activeTenant) {
      return
    }
    const res = await ApiClient.assignUserRole(
      userId,
      newRoleId,
      activeTenant.id
    )
    if (res.success) {
      toast.success("Kullanıcı rolü güncellendi.")
      await loadData()
    } else {
      toast.error(res.message || "Rol güncellenemedi.")
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-slate-900">
            <Users className="h-6 w-6 text-fuchsia-500" />
            Team Members
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Manage workspace members and their access roles.
          </p>
        </div>

        <PermissionGate permission="Users.Invite">
          <button
            className="flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-slate-800"
            onClick={() => {
              setIsInviteOpen(true)
              setStatusMessage(null)
            }}
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
            <Loader2 className="h-4 w-4 animate-spin text-fuchsia-500" />
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
                  className="transition-colors hover:bg-slate-50/70"
                  key={user.id}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-fuchsia-100 text-xs font-bold text-fuchsia-700">
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
                      fallback={
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                          {user.roles.map((r) => r.name).join(", ") ||
                            "No Role"}
                        </span>
                      }
                      permission="Roles.Assign"
                    >
                      <Select
                        value={user.roles[0]?.id || "none"}
                        onValueChange={(val) =>
                          handleRoleChange(user.id, val === "none" ? "" : val)
                        }
                      >
                        <SelectTrigger className="h-8 w-40">
                          <SelectValue placeholder="Rol Seçiniz" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Rolsüz</SelectItem>
                          {roles.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                <UserPlus className="h-4 w-4 text-indigo-500" />
                Invite New Member
              </h2>
              <button
                className="text-slate-400 hover:text-slate-700"
                onClick={() => setIsInviteOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              action="javascript:void(0);"
              className="space-y-4"
              onSubmit={handleInvite}
            >
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-800">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute top-3 left-3 h-4 w-4 text-slate-400" />
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-3 pl-9 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="teammate@company.com"
                    required
                    type="email"
                    value={inviteEmail}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-800">
                  Initial Role
                </label>
                <Select value={inviteRoleId} onValueChange={setInviteRoleId}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Rol Seçiniz" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name} - {role.description || "Standard role"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                  onClick={() => setIsInviteOpen(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  disabled={isSubmitting}
                  type="submit"
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
