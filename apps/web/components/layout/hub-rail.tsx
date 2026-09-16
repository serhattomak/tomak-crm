"use client";

import { ChevronRight, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { LanguageSwitcher } from "@/components/language-switcher";
import { TenantSwitcher } from "@/components/tenant-switcher";
import { usePermissions } from "@/lib/permissions/permission-context";
import type { HubDefinition, NavigationHub } from "./nav-config";

interface HubRailProps {
  activeHub: NavigationHub;
  hubs: HubDefinition[];
  isSidebarCollapsed: boolean;
  mounted: boolean;
  onExpandSidebar: () => void;
  onSelectHub: (hub: NavigationHub) => void;
  tenantSlug: string;
}

export function HubRail({
  activeHub,
  onSelectHub,
  isSidebarCollapsed,
  onExpandSidebar,
  hubs,
  tenantSlug,
  mounted,
}: HubRailProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const { profile } = usePermissions();
  const tHubs = useTranslations("hubs");

  const userInitials = profile?.fullName
    ? profile.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "SD";

  return (
    <div className="flex w-16 shrink-0 flex-col justify-between rounded-l-lg border-border/80 border-r bg-muted/40 p-2.5 transition-colors">
      {/* Top Section: Tenant Switcher & Hub Launchers */}
      <div className="flex flex-col items-center gap-2">
        <TenantSwitcher isCollapsed={true} />

        {/* Prominent Expand Button when Collapsed */}
        {mounted && isSidebarCollapsed && (
          <button
            className="fade-in zoom-in-95 flex h-8 w-8 animate-in items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary shadow-2xs transition-all hover:bg-primary/20 active:scale-95"
            onClick={onExpandSidebar}
            title={tHubs("expandMenu")}
            type="button"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        <div className="h-px w-7 bg-border/80" />

        {/* 5 Hub Launcher Buttons with Linear-style Floating Tooltips */}
        <div className="flex flex-col items-center gap-1.5">
          {hubs.map((hub) => {
            const isHubActive = activeHub === hub.id;
            const HubIcon = hub.icon;

            return (
              <div className="group/hub relative" key={hub.id}>
                <button
                  aria-label={hub.name}
                  className={`group relative flex h-10 w-10 flex-col items-center justify-center rounded-lg transition-all duration-150 active:scale-95 ${
                    isHubActive
                      ? "bg-primary font-semibold text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                  onClick={() => onSelectHub(hub.id)}
                  type="button"
                >
                  {/* Left Active Indicator */}
                  {isHubActive && (
                    <span className="absolute top-1/2 -left-2.5 h-4 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
                  )}

                  <HubIcon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-105" />
                  <span
                    className={`mt-0.5 font-bold text-3xs leading-none tracking-tight ${
                      isHubActive
                        ? "text-primary-foreground"
                        : "text-muted-foreground/80 group-hover:text-foreground"
                    }`}
                  >
                    {hub.label}
                  </span>

                  {/* Hub Notification Badge */}
                  {hub.badge && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 font-bold text-3xs text-white ring-2 ring-background">
                      {hub.badge}
                    </span>
                  )}
                </button>

                {/* Linear/Stripe Floating Tooltip */}
                <div className="pointer-events-none absolute top-1/2 left-full z-50 ml-3 -translate-x-1 -translate-y-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2.5 py-1 font-medium text-popover-foreground text-xs opacity-0 shadow-md transition-all duration-150 group-hover/hub:translate-x-0 group-hover/hub:opacity-100">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-foreground">
                      {hub.name}
                    </span>
                    <span className="font-normal text-3xs text-muted-foreground">
                      • {hub.description}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Section: Language, Theme & User Profile Avatar */}
      <div className="flex flex-col items-center gap-2 border-border/80 border-t pt-2.5">
        <LanguageSwitcher variant="minimal" />

        {/* Theme Toggle */}
        <button
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/70 bg-card text-muted-foreground shadow-2xs transition-all hover:bg-muted hover:text-foreground active:scale-95"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          suppressHydrationWarning
          title={
            mounted && resolvedTheme === "dark" ? "Açık Tema" : "Koyu Tema"
          }
          type="button"
        >
          {mounted && resolvedTheme === "dark" ? (
            <Sun className="h-3.5 w-3.5 text-amber-500" />
          ) : (
            <Moon className="h-3.5 w-3.5" />
          )}
        </button>

        {/* Profile Avatar / Settings Shortcut */}
        <Link
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground text-xs shadow-2xs transition-all hover:opacity-90 active:scale-95"
          href={`/${tenantSlug || "workspace"}/settings`}
          title={`${profile?.fullName || "Profil"} - Ayarlar`}
        >
          {userInitials}
        </Link>
      </div>
    </div>
  );
}
