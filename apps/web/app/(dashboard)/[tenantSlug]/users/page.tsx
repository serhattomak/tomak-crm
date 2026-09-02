"use client";

import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { toast } from "@workspace/ui/components/sonner";
import { Loader2, Mail, UserPlus, Users, X } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { PermissionGate } from "@/components/permission-gate";
import { ApiClient, type RoleDto, type TenantUserDto } from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";

export default function UsersManagementPage() {
  const { activeTenant } = usePermissions();
  const [users, setUsers] = useState<TenantUserDto[]>([]);
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Invite Modal
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    if (!activeTenant) {
      return;
    }
    setIsLoading(true);

    const [usersRes, rolesRes] = await Promise.all([
      ApiClient.getTenantUsers(activeTenant.id),
      ApiClient.getRoles(activeTenant.id),
    ]);

    if (usersRes.success && usersRes.data) {
      setUsers(usersRes.data);
    }

    if (rolesRes.success && rolesRes.data) {
      setRoles(rolesRes.data);
      if (rolesRes.data.length > 0 && !inviteRoleId) {
        setInviteRoleId(rolesRes.data[0]?.id || "");
      }
    }

    setIsLoading(false);
  }, [activeTenant, inviteRoleId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(activeTenant && inviteEmail.trim() && inviteRoleId)) {
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    const res = await ApiClient.inviteUser(
      inviteEmail.trim(),
      inviteRoleId,
      activeTenant.id
    );
    setIsSubmitting(false);

    if (res.success) {
      toast.success("Kullanıcı daveti gönderildi.");
      setInviteEmail("");
      setIsInviteOpen(false);
      await loadData();
    } else {
      toast.error(res.message || "Kullanıcı davet edilemedi.");
    }
  };

  const handleRoleChange = async (userId: string, newRoleId: string) => {
    if (!activeTenant) {
      return;
    }
    const res = await ApiClient.assignUserRole(
      userId,
      newRoleId,
      activeTenant.id
    );
    if (res.success) {
      toast.success("Kullanıcı rolü güncellendi.");
      await loadData();
    } else {
      toast.error(res.message || "Rol güncellenemedi.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2.5 font-bold text-2xl text-zinc-900 tracking-tight dark:text-zinc-100">
            <Users className="h-6 w-6 text-fuchsia-500" />
            Team Members
          </h1>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Manage workspace members and their access roles.
          </p>
        </div>

        <PermissionGate permission="Users.Invite">
          <button
            className="flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 font-semibold text-white text-xs shadow-xs transition-colors hover:bg-slate-800"
            onClick={() => {
              setIsInviteOpen(true);
              setStatusMessage(null);
            }}
          >
            <UserPlus className="h-4 w-4" />
            Invite Member
          </button>
        </PermissionGate>
      </div>

      {statusMessage && (
        <div
          className={`rounded-xl p-3.5 font-medium text-xs ${
            statusMessage.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* Users Table */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-xs dark:border-zinc-800/90 dark:bg-zinc-900">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-8 text-center text-xs text-zinc-400 dark:text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin text-fuchsia-500" />
            Loading team members...
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="border-zinc-200/80 border-b bg-zinc-50/90 font-semibold text-[11px] text-zinc-600 uppercase tracking-wider dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-300">
              <tr>
                <th className="px-6 py-3.5">User</th>
                <th className="px-6 py-3.5">Email</th>
                <th className="px-6 py-3.5">Assigned Role</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {users.map((user) => (
                <tr
                  className="transition-colors hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40"
                  key={user.id}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-fuchsia-100 font-bold text-fuchsia-700 text-xs">
                        {(user.fullName || user.email).charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {user.fullName || "—"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-zinc-500 dark:text-zinc-400">
                    {user.email}
                  </td>
                  <td className="px-6 py-4">
                    <PermissionGate
                      fallback={
                        <span className="rounded-lg bg-zinc-100 px-2.5 py-1 font-medium text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          {user.roles.map((r) => r.name).join(", ") ||
                            "No Role"}
                        </span>
                      }
                      permission="Roles.Assign"
                    >
                      <Select
                        onValueChange={(val) =>
                          handleRoleChange(user.id, val === "none" ? "" : val)
                        }
                        value={user.roles[0]?.id || "none"}
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
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-bold text-[10px] ${
                        user.isActive
                          ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                      }`}
                    >
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-zinc-400 dark:text-zinc-500">
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
          <div className="w-full max-w-md space-y-4 rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-zinc-100 border-b pb-3 dark:border-zinc-800">
              <h2 className="flex items-center gap-2 font-bold text-base text-zinc-900 dark:text-zinc-100">
                <UserPlus className="h-4 w-4 text-indigo-500" />
                Invite New Member
              </h2>
              <button
                className="text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
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
                <Label className="mb-1.5" required>
                  Email Address
                </Label>
                <Input
                  leftIcon={<Mail />}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="teammate@company.com"
                  required
                  type="email"
                  value={inviteEmail}
                />
              </div>

              <div>
                <Label className="mb-1.5">Initial Role</Label>
                <Select onValueChange={setInviteRoleId} value={inviteRoleId}>
                  <SelectTrigger>
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

              <div className="flex justify-end gap-2 border-zinc-100 border-t pt-3 dark:border-zinc-800">
                <button
                  className="px-4 py-2 font-semibold text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  onClick={() => setIsInviteOpen(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 font-semibold text-white text-xs shadow-xs transition-colors hover:bg-blue-700 disabled:opacity-50"
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
  );
}
