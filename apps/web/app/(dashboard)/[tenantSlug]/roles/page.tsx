"use client";

import { ConfirmDialog } from "@workspace/ui/components/confirm-dialog";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { PageContainer } from "@workspace/ui/components/page-container";
import { toast } from "@workspace/ui/components/sonner";
import { Check, Loader2, Lock, Plus, Shield, Trash2, X } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { PermissionGate } from "@/components/permission-gate";
import {
  ApiClient,
  type PermissionGroupDto,
  type RoleDto,
} from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";

export default function RolesManagementPage() {
  const { activeTenant, refreshProfile } = usePermissions();
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [permissionGroups, setPermissionGroups] = useState<
    PermissionGroupDto[]
  >([]);
  const [selectedRole, setSelectedRole] = useState<RoleDto | null>(null);
  const [selectedPermIds, setSelectedPermIds] = useState<Set<string>>(
    new Set()
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Confirm Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmText?: string;
    variant?: "destructive" | "warning" | "default";
    onConfirm: () => void | Promise<void>;
  }>({
    description: "",
    onConfirm: () => {},
    open: false,
    title: "",
  });

  // Create Role Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const loadData = useCallback(async () => {
    if (!activeTenant) {
      return;
    }
    setIsLoading(true);

    const [rolesRes, permsRes] = await Promise.all([
      ApiClient.getRoles(activeTenant.id),
      ApiClient.getAllPermissions(),
    ]);

    if (rolesRes.success && rolesRes.data) {
      setRoles(rolesRes.data);
      if (rolesRes.data.length > 0 && !selectedRole) {
        const first = rolesRes.data[0];
        if (first) {
          setSelectedRole(first);
          setSelectedPermIds(new Set(first.permissions.map((p) => p.id)));
        }
      }
    }

    if (permsRes.success && permsRes.data) {
      setPermissionGroups(permsRes.data);
    }

    setIsLoading(false);
  }, [activeTenant, selectedRole]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectRole = (role: RoleDto) => {
    setSelectedRole(role);
    setSelectedPermIds(new Set(role.permissions.map((p) => p.id)));
    setStatusMsg(null);
  };

  const togglePermission = (permId: string) => {
    const next = new Set(selectedPermIds);
    if (next.has(permId)) {
      next.delete(permId);
    } else {
      next.add(permId);
    }
    setSelectedPermIds(next);
  };

  const handleSavePermissions = async () => {
    if (!(activeTenant && selectedRole)) {
      return;
    }

    setIsSaving(true);
    setStatusMsg(null);

    const res = await ApiClient.updateRolePermissions(
      selectedRole.id,
      selectedRole.name,
      selectedRole.description,
      Array.from(selectedPermIds),
      activeTenant.id
    );

    setIsSaving(false);

    if (res.success) {
      setStatusMsg({
        text: "Role permissions saved and Redis cache invalidated!",
        type: "success",
      });
      await loadData();
      await refreshProfile();
    } else {
      setStatusMsg({
        text: res.message || "Failed to save permissions.",
        type: "error",
      });
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(activeTenant && newRoleName.trim())) {
      return;
    }

    setIsCreating(true);
    const res = await ApiClient.createRole(
      newRoleName.trim(),
      newRoleDesc.trim(),
      [],
      activeTenant.id
    );
    setIsCreating(false);

    if (res.success) {
      setIsCreateOpen(false);
      setNewRoleName("");
      setNewRoleDesc("");
      toast.success("Rol başarıyla oluşturuldu.");
      await loadData();
    } else {
      toast.error(res.message || "Rol oluşturulamadı.");
    }
  };

  const handleDeleteRole = (roleId: string) => {
    if (!activeTenant) {
      return;
    }

    setConfirmDialog({
      confirmText: "Rolü Sil",
      description:
        "Bu rolü silmek istediğinize emin misiniz? Bu role sahip kullanıcıların yetkileri etkilenecektir.",
      onConfirm: async () => {
        const res = await ApiClient.deleteRole(roleId, activeTenant.id);
        if (res.success) {
          toast.success("Rol başarıyla silindi.");
          setSelectedRole(null);
          await loadData();
        } else {
          toast.error(res.message || "Rol silinemedi.");
        }
        setConfirmDialog((prev) => ({ ...prev, open: false }));
      },
      open: true,
      title: "Rolü Sil",
      variant: "destructive",
    });
  };

  return (
    <PageContainer className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2.5 font-bold text-2xl text-zinc-900 tracking-tight dark:text-zinc-100">
            <Shield className="h-6 w-6 text-blue-500" />
            Roles & Permissions Matrix
          </h1>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Configure fine-grained PBAC / RBAC permission policies. Changes
            automatically update Redis cache.
          </p>
        </div>

        <PermissionGate permission="Roles.Create">
          <button
            className="flex items-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 font-semibold text-white text-xs shadow-xs transition-colors hover:bg-zinc-800"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="h-4 w-4" />
            New Role
          </button>
        </PermissionGate>
      </div>

      {statusMsg && (
        <div
          className={`rounded-xl p-3.5 font-medium text-xs ${
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
        <div className="space-y-2 rounded-2xl border border-border bg-card p-4 shadow-xs md:col-span-4">
          <div className="mb-2 px-2 font-bold text-2xs text-zinc-400 uppercase tracking-wider dark:text-zinc-500">
            Available Roles ({roles.length})
          </div>

          {isLoading ? (
            <div className="p-4 text-center text-xs text-zinc-400 dark:text-zinc-500">
              <Loader2 className="mx-auto h-4 w-4 animate-spin text-blue-500" />
            </div>
          ) : (
            <div className="space-y-1.5">
              {roles.map((role) => {
                const isSelected = selectedRole?.id === role.id;
                return (
                  <div
                    className={`cursor-pointer rounded-xl border p-3 transition-all ${ isSelected ? "border-blue-200 bg-blue-50/70 text-blue-950 shadow-2xs" : "border-border bg-card text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/50" }`}
                    key={role.id}
                    onClick={() => handleSelectRole(role)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                        {role.name}
                        {role.isDefault && (
                          <span title="System default role">
                            <Lock className="h-3 w-3 text-amber-500" />
                          </span>
                        )}
                      </span>
                      <span className="font-mono text-2xs text-zinc-400 dark:text-zinc-500">
                        {role.memberCount} member
                        {role.memberCount === 1 ? "" : "s"}
                      </span>
                    </div>
                    {role.description && (
                      <p className="mt-1 line-clamp-2 text-2xs text-zinc-500 dark:text-zinc-400">
                        {role.description}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Permissions Matrix */}
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-xs md:col-span-8">
          {selectedRole ? (
            <div>
              <div className="mb-6 flex items-center justify-between border-border border-b pb-4">
                <div>
                  <h2 className="flex items-center gap-2 font-bold text-base text-zinc-900 dark:text-zinc-100">
                    {selectedRole.name}
                    {selectedRole.isDefault && (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-semibold text-3xs text-amber-700">
                        System Default
                      </span>
                    )}
                  </h2>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {selectedRole.description || "No description provided."}
                  </p>
                </div>

                {!selectedRole.isDefault && (
                  <PermissionGate permission="Roles.Delete">
                    <button
                      className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-zinc-500"
                      onClick={() => handleDeleteRole(selectedRole.id)}
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
                  <div className="space-y-3" key={group.module}>
                    <div className="flex items-center gap-1.5 font-bold text-2xs text-blue-600 uppercase tracking-wider">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                      {group.module} Module
                    </div>

                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {group.permissions.map((perm) => {
                        const isChecked = selectedPermIds.has(perm.id);
                        return (
                          <label
                            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all ${ isChecked ? "border-blue-200 bg-blue-50/50 text-zinc-900 shadow-2xs dark:text-zinc-100" : "border-border bg-card text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800/50" }`}
                            key={perm.id}
                          >
                            <input
                              checked={isChecked}
                              className="mt-0.5 rounded border-border text-blue-600 focus:ring-blue-500"
                              onChange={() => togglePermission(perm.id)}
                              type="checkbox"
                            />
                            <div>
                              <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                                {perm.name}
                              </div>
                              <div className="font-mono text-3xs text-blue-600/90">
                                {perm.code}
                              </div>
                              {perm.description && (
                                <div className="mt-0.5 text-2xs text-zinc-500 dark:text-zinc-400">
                                  {perm.description}
                                </div>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Bar */}
              <div className="mt-6 flex items-center justify-between border-border border-t pt-4">
                <span className="font-medium text-xs text-zinc-500 dark:text-zinc-400">
                  {selectedPermIds.size} permission
                  {selectedPermIds.size === 1 ? "" : "s"} selected
                </span>

                <PermissionGate permission="Roles.Update">
                  <button
                    className="flex items-center gap-1.5 rounded-xl bg-zinc-950 px-5 py-2.5 font-semibold text-white text-xs shadow-xs transition-colors hover:bg-zinc-800 disabled:opacity-50"
                    disabled={isSaving}
                    onClick={handleSavePermissions}
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
            <div className="p-12 text-center text-xs text-zinc-400 dark:text-zinc-500">
              Select a role from the left panel to configure its permission
              matrix.
            </div>
          )}
        </div>
      </div>

      {/* Create Role Modal */}
      {isCreateOpen && (
        <Dialog
          onOpenChange={(open) => {
            if (!open) {
              setIsCreateOpen(false);
            }
          }}
          open
        >
          <DialogContent
            aria-describedby={undefined}
            className="max-h-[90vh] w-full space-y-4 overflow-y-auto gap-0 p-6 sm:max-w-md"
            showCloseButton={false}
          >
            <div className="flex items-center justify-between border-border border-b pb-3">
              <DialogTitle className="flex items-center gap-2 font-bold text-base text-zinc-900 dark:text-zinc-100">
                <Shield className="h-4 w-4 text-blue-500" />
                Create Custom Role
              </DialogTitle>
              <DialogClose asChild>
                <button
                  className="text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </DialogClose>
            </div>

            <form
              action="javascript:void(0);"
              className="space-y-4"
              onSubmit={handleCreateRole}
            >
              <div>
                <label className="mb-1.5 block font-semibold text-xs text-zinc-800 dark:text-zinc-200">
                  Role Name
                </label>
                <input
                  className="w-full rounded-xl border border-border bg-zinc-50 px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:bg-zinc-800/50 dark:bg-zinc-900 dark:text-zinc-100 dark:text-zinc-500"
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g. Sales Manager"
                  required
                  type="text"
                  value={newRoleName}
                />
              </div>

              <div>
                <label className="mb-1.5 block font-semibold text-xs text-zinc-800 dark:text-zinc-200">
                  Description
                </label>
                <textarea
                  className="w-full rounded-xl border border-border bg-zinc-50 px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:bg-zinc-800/50 dark:bg-zinc-900 dark:text-zinc-100 dark:text-zinc-500"
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  placeholder="Responsibilities and access scope..."
                  rows={3}
                  value={newRoleDesc}
                />
              </div>

              <div className="flex justify-end gap-2 border-border border-t pt-3">
                <button
                  className="px-4 py-2 font-semibold text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  onClick={() => setIsCreateOpen(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="flex items-center gap-1.5 rounded-xl bg-zinc-950 px-4 py-2 font-semibold text-white text-xs hover:bg-zinc-800 disabled:opacity-50"
                  disabled={isCreating}
                  type="submit"
                >
                  {isCreating && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  Create Role
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        confirmText={confirmDialog.confirmText}
        description={confirmDialog.description}
        onConfirm={confirmDialog.onConfirm}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
        open={confirmDialog.open}
        title={confirmDialog.title}
        variant={confirmDialog.variant}
      />
    </PageContainer>
  );
}
