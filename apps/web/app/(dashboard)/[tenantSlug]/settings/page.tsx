"use client";

import { Building2, Check, Loader2, Settings } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { PermissionGate } from "@/components/permission-gate";
import { ApiClient } from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";

export default function WorkspaceSettingsPage() {
  const { activeTenant, refreshTenants } = usePermissions();
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (activeTenant) {
      setName(activeTenant.name);
      setLogoUrl(activeTenant.logoUrl || "");
    }
  }, [activeTenant]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(activeTenant && name.trim())) {
      return;
    }

    setIsSaving(true);
    setStatusMsg(null);

    const res = await ApiClient.updateTenant(
      activeTenant.id,
      name.trim(),
      logoUrl.trim() || undefined,
      activeTenant.id
    );
    setIsSaving(false);

    if (res.success) {
      setStatusMsg({
        text: "Workspace settings updated successfully!",
        type: "success",
      });
      await refreshTenants();
    } else {
      setStatusMsg({
        text: res.message || "Failed to update workspace settings.",
        type: "error",
      });
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2.5 font-bold text-2xl text-zinc-900 dark:text-zinc-100 tracking-tight">
          <Settings className="h-6 w-6 text-fuchsia-500" />
          Workspace Settings
        </h1>
        <p className="mt-1 text-zinc-500 dark:text-zinc-400 text-xs">
          Update basic details and branding preferences for this workspace.
        </p>
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

      <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-6 shadow-xs">
        <form
          action="javascript:void(0);"
          className="space-y-4"
          onSubmit={handleSave}
        >
          <div>
            <label className="mb-1.5 block font-semibold text-zinc-800 dark:text-zinc-200 text-xs">
              Workspace Name
            </label>
            <div className="relative">
              <Building2 className="absolute top-3 left-3 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
              <input
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 py-2.5 pr-3 pl-9 text-zinc-900 dark:text-zinc-100 text-xs placeholder:text-zinc-400 dark:text-zinc-500 focus:border-fuchsia-500 focus:bg-white dark:bg-zinc-900 focus:outline-none"
                onChange={(e) => setName(e.target.value)}
                required
                type="text"
                value={name}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block font-semibold text-zinc-800 dark:text-zinc-200 text-xs">
              Workspace Slug
            </label>
            <input
              className="w-full cursor-not-allowed rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800/70 px-3 py-2.5 font-mono text-zinc-500 dark:text-zinc-400 text-xs"
              disabled
              type="text"
              value={activeTenant?.slug || ""}
            />
            <p className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
              Slug is permanent and used in URL paths and database partition
              keys.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block font-semibold text-zinc-800 dark:text-zinc-200 text-xs">
              Logo URL
            </label>
            <input
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2.5 text-zinc-900 dark:text-zinc-100 text-xs placeholder:text-zinc-400 dark:text-zinc-500 focus:border-fuchsia-500 focus:bg-white dark:bg-zinc-900 focus:outline-none"
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              type="url"
              value={logoUrl}
            />
          </div>

          <PermissionGate permission="Tenants.Update">
            <div className="flex justify-end border-zinc-100 dark:border-zinc-800 border-t pt-3">
              <button
                className="flex items-center gap-1.5 rounded-xl bg-slate-950 px-5 py-2.5 font-semibold text-white text-xs shadow-xs transition-colors hover:bg-slate-800 disabled:opacity-50"
                disabled={isSaving}
                type="submit"
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
  );
}
