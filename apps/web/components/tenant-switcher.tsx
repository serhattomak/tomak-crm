"use client";

import { Check, ChevronDown, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import type React from "react";
import { useState } from "react";
import { ApiClient } from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";

export function TenantSwitcher() {
  const router = useRouter();
  const { tenants, activeTenant, setActiveTenant, refreshTenants } =
    usePermissions();
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTenantName, setNewTenantName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectTenant = (tenant: (typeof tenants)[0]) => {
    setActiveTenant(tenant);
    setIsOpen(false);
    router.push(`/${tenant.slug}`);
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName.trim()) {
      return;
    }

    setIsLoading(true);
    const res = await ApiClient.createTenant(newTenantName.trim());
    setIsLoading(false);

    if (res.success && res.data) {
      await refreshTenants();
      setActiveTenant(res.data);
      setIsCreating(false);
      setNewTenantName("");
      setIsOpen(false);
      router.push(`/${res.data.slug}`);
    } else {
      alert(res.message || "Failed to create workspace");
    }
  };

  return (
    <div className="relative w-full">
      <button
        className="group flex w-full items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-2 text-left transition-all hover:bg-slate-100"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 font-bold text-sm text-white shadow-sm">
            {activeTenant?.name
              ? activeTenant.name.charAt(0).toUpperCase()
              : "W."}
          </div>
          <div className="min-w-0">
            <div className="truncate font-bold text-slate-900 text-xs">
              {activeTenant?.name || "Select Workspace"}
            </div>
            <div className="font-medium text-[10px] text-slate-400">
              Free Plan
            </div>
          </div>
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:text-slate-600" />
      </button>

      {isOpen && (
        <div className="fade-in slide-in-from-top-1 absolute top-full left-0 z-50 mt-1.5 w-full min-w-[240px] animate-in rounded-2xl border border-slate-200/80 bg-white py-1.5 shadow-xl">
          <div className="px-3 py-1 font-bold text-[10px] text-slate-400 uppercase tracking-wider">
            Workspaces
          </div>

          <div className="max-h-56 overflow-y-auto py-1">
            {tenants.map((tenant) => {
              const isSelected = activeTenant?.id === tenant.id;
              return (
                <button
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs transition-colors hover:bg-slate-50 ${
                    isSelected
                      ? "bg-fuchsia-50/70 font-semibold text-fuchsia-600"
                      : "text-slate-700"
                  }`}
                  key={tenant.id}
                  onClick={() => handleSelectTenant(tenant)}
                  type="button"
                >
                  <span className="truncate">{tenant.name}</span>
                  {isSelected && (
                    <Check className="h-3.5 w-3.5 shrink-0 text-fuchsia-600" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-1 border-slate-100 border-t px-1.5 pt-1.5">
            {isCreating ? (
              <form
                action="javascript:void(0);"
                className="space-y-2 p-1.5"
                onSubmit={handleCreateTenant}
              >
                <input
                  autoFocus
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-slate-900 text-xs placeholder:text-slate-400 focus:border-fuchsia-500 focus:outline-none"
                  onChange={(e) => setNewTenantName(e.target.value)}
                  placeholder="Workspace Name"
                  type="text"
                  value={newTenantName}
                />
                <div className="flex justify-end gap-1">
                  <button
                    className="px-2 py-1 text-[11px] text-slate-500 hover:text-slate-800"
                    onClick={() => setIsCreating(false)}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className="flex items-center gap-1 rounded-lg bg-slate-950 px-2.5 py-1 font-medium text-[11px] text-white hover:bg-slate-800 disabled:opacity-50"
                    disabled={isLoading}
                    type="submit"
                  >
                    {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                    Create
                  </button>
                </div>
              </form>
            ) : (
              <button
                className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 font-semibold text-fuchsia-600 text-xs transition-colors hover:bg-fuchsia-50"
                onClick={() => setIsCreating(true)}
                type="button"
              >
                <Plus className="h-3.5 w-3.5" />
                Add New Workspace
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
