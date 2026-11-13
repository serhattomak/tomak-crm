"use client";

import { cn } from "@workspace/ui/lib/utils";
import { Keyboard, PanelLeftClose, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { PermissionGate } from "@/components/permission-gate";
import { TenantSwitcher } from "@/components/tenant-switcher";
import { usePermissions } from "@/lib/permissions/permission-context";
import type { HubDefinition, NavItem, NavigationHub } from "./nav-config";

interface SidebarProps {
  activeHub: NavigationHub;
  collapsed: boolean;
  currentHubMeta: HubDefinition;
  hubs: HubDefinition[];
  items: NavItem[];
  onOpenShortcutsHelp: () => void;
  onSelectHub: (hub: NavigationHub) => void;
  onToggleCollapse: () => void;
  tenantSlug: string;
}

/**
 * Single workspace sidebar — shell spec §4 (.scratch/ui-refresh-2026-11/spec.md).
 * Replaces the old 64px hub rail + 225px sub-nav pair: one 232px surface, a
 * five-slot hub strip, the active hub's items, and the account block.
 */
export function Sidebar({
  activeHub,
  collapsed,
  currentHubMeta,
  hubs,
  items,
  onOpenShortcutsHelp,
  onSelectHub,
  onToggleCollapse,
  tenantSlug,
}: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "chart";
  const { activeTenant, profile } = usePermissions();

  const initials = profile?.fullName
    ? profile.fullName
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "SD";

  const isOrganizationPage = pathname === `/${tenantSlug}/organization`;

  const isActive = (item: NavItem) => {
    if (item.tab) {
      return isOrganizationPage && currentTab === item.tab;
    }
    if (item.exact) {
      return pathname === item.href;
    }
    return (
      pathname === item.href || Boolean(pathname?.startsWith(`${item.href}/`))
    );
  };

  return (
    <aside
      className={cn(
        "hidden w-[232px] shrink-0 flex-col border-border border-r bg-card md:flex print:hidden",
        collapsed && "md:hidden"
      )}
      data-slot="sidebar"
    >
      <div className="flex items-center gap-1 px-2.5 pt-2.5">
        <div className="min-w-0 flex-1">
          <TenantSwitcher />
        </div>
        <button
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onClick={onToggleCollapse}
          title="Menüyü daralt"
          type="button"
        >
          <PanelLeftClose className="size-3.5" />
        </button>
      </div>

      <div className="px-2.5 pt-2">
        <div
          aria-label="Modül grupları"
          className="flex gap-0.5 rounded-lg bg-muted p-[3px]"
          role="tablist"
        >
          {hubs.map((hub) => {
            const isHubActive = activeHub === hub.id;
            return (
              <button
                aria-selected={isHubActive}
                className={cn(
                  "h-6 flex-1 rounded-md font-semibold text-3xs transition-colors",
                  isHubActive
                    ? "bg-card text-foreground shadow-card"
                    : "text-muted-foreground hover:text-foreground"
                )}
                key={hub.id}
                onClick={() => onSelectHub(hub.id)}
                role="tab"
                title={hub.name}
                type="button"
              >
                {hub.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between px-4 pt-4 pb-1.5">
        <span className="truncate font-semibold text-3xs text-muted-foreground uppercase tracking-wider">
          {currentHubMeta.name}
        </span>
        <span className="text-3xs text-muted-foreground tabular-nums">
          {items.length}
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 pb-2">
        <div className="space-y-0.5">
          {items.map((item) => {
            const active = isActive(item);
            const link = (
              <Link
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex h-[30px] items-center gap-2 rounded-md px-2 text-xs transition-colors",
                  active
                    ? "bg-muted font-semibold text-foreground"
                    : "font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
                href={item.href}
              >
                <item.icon
                  className={cn(
                    "size-3.5 shrink-0",
                    active
                      ? "text-foreground"
                      : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                <span className="truncate">{item.name}</span>
                {item.badge ? (
                  <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded bg-card px-1 font-semibold text-3xs text-muted-foreground tabular-nums shadow-2xs">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );

            return item.permission ? (
              <PermissionGate
                fallback={null}
                key={item.href}
                permission={item.permission}
              >
                {link}
              </PermissionGate>
            ) : (
              <div key={item.href}>{link}</div>
            );
          })}
        </div>
      </nav>

      <div className="shrink-0 border-border border-t px-2.5 py-2">
        <button
          className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-2xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onClick={onOpenShortcutsHelp}
          type="button"
        >
          <Keyboard className="size-3.5" />
          Kısayollar
          <span className="ml-auto rounded border border-border px-1 text-3xs">
            ?
          </span>
        </button>
        <Link
          className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-2xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          href={`/${tenantSlug}/settings`}
        >
          <Settings className="size-3.5" />
          Ayarlar
        </Link>
        <Link
          className="mt-1 flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted"
          href={`/${tenantSlug}/settings`}
        >
          <span className="brand-mark flex size-7 shrink-0 items-center justify-center rounded-full font-semibold text-2xs text-white">
            {initials}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold text-2xs">
              {profile?.fullName || "Kullanıcı"}
            </span>
            <span className="block truncate text-3xs text-muted-foreground">
              {activeTenant?.name || tenantSlug}
            </span>
          </span>
        </Link>
      </div>
    </aside>
  );
}
