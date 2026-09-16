"use client";

import { ChevronLeft, Command, Keyboard, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { PermissionGate } from "@/components/permission-gate";
import { useLabels } from "@/lib/labels/label-context";
import {
  getHubNavItems,
  type HubDefinition,
  type NavigationHub,
} from "./nav-config";

interface SubNavRailProps {
  activeHub: NavigationHub;
  currentHubMeta: HubDefinition;
  isSidebarCollapsed: boolean;
  onItemClick?: () => void;
  onOpenCommandPalette: () => void;
  onOpenShortcutsHelp: () => void;
  onToggleCollapse: () => void;
  tenantSlug: string;
}

export function SubNavRail({
  activeHub,
  currentHubMeta,
  isSidebarCollapsed,
  onToggleCollapse,
  onOpenCommandPalette,
  onOpenShortcutsHelp,
  onItemClick,
  tenantSlug,
}: SubNavRailProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "chart";
  const { getModuleDisplayName, isModuleEnabled } = useLabels();
  const tNav = useTranslations("navigation");
  const tHubs = useTranslations("hubs");

  const HubIcon = currentHubMeta.icon;
  const items = getHubNavItems(
    activeHub,
    tenantSlug,
    tNav,
    getModuleDisplayName,
    isModuleEnabled
  );

  return (
    <div
      className={`flex flex-col justify-between overflow-hidden rounded-r-lg bg-card p-3 transition-all duration-250 ease-out ${ isSidebarCollapsed ? "pointer-events-none w-0 border-none p-0 opacity-0" : "w-[225px] opacity-100" }`}
    >
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Hub Header & Collapse Button */}
        <div className="mb-2.5 flex shrink-0 items-center justify-between gap-1.5">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <HubIcon className="h-3.5 w-3.5" />
            </div>
            <span className="truncate font-semibold text-foreground text-xs">
              {currentHubMeta.name}
            </span>
          </div>

          <button
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
            onClick={onToggleCollapse}
            title={tHubs("collapseMenu")}
            type="button"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* ⌘K Quick Search Trigger */}
        <div className="mb-2.5 shrink-0">
          <button
            className="group flex h-8 w-full items-center justify-between rounded-md border border-input bg-muted/40 px-2.5 text-muted-foreground text-xs shadow-2xs transition-all hover:border-primary/40 hover:bg-background hover:text-foreground focus:outline-none"
            onClick={onOpenCommandPalette}
            type="button"
          >
            <div className="flex min-w-0 items-center gap-2">
              <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
              <span className="truncate text-2xs text-muted-foreground group-hover:text-foreground">
                {tHubs("quickSearch")}
              </span>
            </div>
            <div className="flex items-center gap-0.5 rounded border border-border bg-background px-1.5 py-0.5 font-semibold text-3xs text-muted-foreground shadow-2xs">
              <Command className="h-2.5 w-2.5" />
              <span>K</span>
            </div>
          </button>
        </div>

        {/* Nav Items List */}
        <div className="flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden pr-0.5 text-xs">
          {items.map((item) => {
            const isOrgPage = pathname === `/${tenantSlug}/organization`;
            let isActive = false;
            if (item.tab) {
              isActive = isOrgPage && currentTab === item.tab;
            } else if (item.exact) {
              isActive = pathname === item.href;
            } else {
              isActive =
                pathname === item.href ||
                Boolean(pathname?.startsWith(`${item.href}/`));
            }

            const linkContent = (
              <Link
                className={`group relative flex h-8.5 w-full items-center gap-2.5 rounded-md px-2.5 text-xs transition-all duration-150 ${
                  isActive
                    ? "border border-primary/20 bg-primary/10 font-semibold text-primary shadow-2xs"
                    : "border border-transparent font-medium text-muted-foreground hover:border-border/60 hover:bg-muted/60 hover:text-foreground"
                }`}
                href={item.href}
                onClick={onItemClick}
              >
                <item.icon
                  className={`h-3.5 w-3.5 shrink-0 transition-transform group-hover:scale-105 ${
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground group-hover:text-foreground"
                  }`}
                />
                <span className="truncate text-2xs">{item.name}</span>

                {item.badge ? (
                  <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/15 px-1 font-semibold text-3xs text-primary">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );

            if (item.permission) {
              return (
                <PermissionGate
                  fallback={null}
                  key={item.href}
                  permission={item.permission}
                >
                  {linkContent}
                </PermissionGate>
              );
            }

            return <div key={item.href}>{linkContent}</div>;
          })}
        </div>
      </div>

      {/* Secondary Bottom Helper */}
      <div className="mt-2 shrink-0 border-border/80 border-t pt-2">
        <div className="flex items-center justify-between px-1">
          <button
            className="flex items-center gap-1 font-medium text-3xs text-muted-foreground transition hover:text-foreground"
            onClick={onOpenShortcutsHelp}
            type="button"
          >
            <Keyboard className="h-3 w-3" />
            <span>Kısayollar (?)</span>
          </button>

          <span className="font-semibold text-3xs text-primary/70 uppercase tracking-wider">
            {currentHubMeta.label}
          </span>
        </div>
      </div>
    </div>
  );
}
