"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { Check, ChevronDown, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import type React from "react";
import { useState } from "react";
import { ApiClient } from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";

interface TenantSwitcherProps {
  isCollapsed?: boolean;
}

export function TenantSwitcher({ isCollapsed = false }: TenantSwitcherProps) {
  const router = useRouter();
  const { tenants, activeTenant, setActiveTenant, refreshTenants } =
    usePermissions();
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTenantName, setNewTenantName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setIsCreating(false);
    }
  };

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
      alert(res.message || "Çalışma alanı oluşturulamadı");
    }
  };

  const initials = activeTenant?.name
    ? activeTenant.name.slice(0, 2).toUpperCase()
    : "CR";

  return (
    <Popover onOpenChange={handleOpenChange} open={isOpen}>
      <PopoverTrigger asChild>
        <button
          className={`group relative flex h-11 w-full items-center rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-1.5 text-left transition-all duration-300 hover:border-zinc-300 hover:bg-zinc-100/80 active:scale-[0.99] dark:border-zinc-800 dark:bg-zinc-800/60 dark:hover:border-zinc-700 dark:hover:bg-zinc-800 ${
            isCollapsed
              ? "justify-center border-transparent bg-transparent p-0"
              : "justify-between px-2"
          }`}
          title={`Çalışma Alanı: ${activeTenant?.name || "Seçin"}`}
          type="button"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 font-bold text-white text-xs shadow-2xs ring-2 ring-violet-500/20 transition-transform group-hover:scale-105">
              {initials.charAt(0)}
            </div>
            <div
              className={`min-w-0 overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                isCollapsed
                  ? "pointer-events-none max-w-0 -translate-x-2 opacity-0"
                  : "max-w-xs translate-x-0 opacity-100"
              }`}
            >
              <div className="truncate font-bold text-xs text-zinc-900 dark:text-zinc-100">
                {activeTenant?.name || "Çalışma Alanı Seçin"}
              </div>
              <div className="truncate font-medium text-[10px] text-zinc-400 dark:text-zinc-500">
                Kurumsal Workspace
              </div>
            </div>
          </div>
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 text-zinc-400 transition-all duration-300 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 ${
              isOpen ? "rotate-180" : ""
            } ${isCollapsed ? "hidden opacity-0" : "opacity-100"}`}
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className={`gap-0 p-0 py-2 ${
          isCollapsed
            ? "w-72"
            : "w-(--radix-popover-trigger-width) min-w-[240px]"
        }`}
        side={isCollapsed ? "right" : "bottom"}
        sideOffset={isCollapsed ? 14 : 6}
      >
        <div className="flex items-center justify-between px-3.5 py-1 font-bold text-[10px] text-zinc-400 uppercase tracking-wider dark:text-zinc-500">
          <span>Çalışma Alanları</span>
          <span className="font-mono text-[9px] text-zinc-400">
            {tenants.length} Alan
          </span>
        </div>

        <div className="max-h-56 overflow-y-auto py-1">
          {tenants.map((tenant) => {
            const isSelected = activeTenant?.id === tenant.id;
            return (
              <button
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/60 ${
                  isSelected
                    ? "bg-violet-50/70 font-semibold text-violet-700 dark:bg-violet-950/60 dark:text-violet-300"
                    : "text-zinc-700 dark:text-zinc-300"
                }`}
                key={tenant.id}
                onClick={() => handleSelectTenant(tenant)}
                type="button"
              >
                <div className="flex items-center gap-2 truncate">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-zinc-100 font-bold text-[10px] text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    {tenant.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate">{tenant.name}</span>
                </div>
                {isSelected && (
                  <Check className="h-3.5 w-3.5 shrink-0 text-violet-600 dark:text-violet-400" />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-1 border-zinc-100 border-t px-1.5 pt-1.5 dark:border-zinc-800">
          {isCreating ? (
            <form
              action="javascript:void(0);"
              className="space-y-2 p-1.5"
              onSubmit={handleCreateTenant}
            >
              <input
                autoFocus
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                onChange={(e) => setNewTenantName(e.target.value)}
                placeholder="Çalışma Alanı Adı..."
                type="text"
                value={newTenantName}
              />
              <div className="flex justify-end gap-1">
                <button
                  className="px-2 py-1 text-[11px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 dark:hover:text-zinc-400"
                  onClick={() => setIsCreating(false)}
                  type="button"
                >
                  Vazgeç
                </button>
                <button
                  className="flex items-center gap-1 rounded-lg bg-violet-600 px-2.5 py-1 font-medium text-[11px] text-white hover:bg-violet-700 disabled:opacity-50"
                  disabled={isLoading}
                  type="submit"
                >
                  {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                  Oluştur
                </button>
              </div>
            </form>
          ) : (
            <button
              className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 font-semibold text-violet-600 text-xs transition-colors hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-950/50"
              onClick={() => setIsCreating(true)}
              type="button"
            >
              <Plus className="h-3.5 w-3.5" />
              Yeni Çalışma Alanı Ekle
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
