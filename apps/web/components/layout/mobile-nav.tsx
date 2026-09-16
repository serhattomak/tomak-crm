"use client";

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import {
  FileSpreadsheet,
  Kanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  Users2,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { PermissionGate } from "@/components/permission-gate";
import { TenantSwitcher } from "@/components/tenant-switcher";
import { useLabels } from "@/lib/labels/label-context";
import { usePermissions } from "@/lib/permissions/permission-context";
import { createClient } from "@/lib/supabase/client";
import {
  getHubNavItems,
  type HubDefinition,
  type NavigationHub,
} from "./nav-config";

interface MobileDrawerProps {
  activeHub: NavigationHub;
  hubs: HubDefinition[];
  isOpen: boolean;
  onClose: () => void;
  onOpenCommandPalette: () => void;
  onSelectHub: (hub: NavigationHub) => void;
  tenantSlug: string;
}

export function MobileDrawer({
  isOpen,
  onClose,
  activeHub,
  onSelectHub,
  hubs,
  tenantSlug,
  onOpenCommandPalette,
}: MobileDrawerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, activeTenant } = usePermissions();
  const { resolvedTheme, setTheme } = useTheme();
  const { getModuleDisplayName, isModuleEnabled } = useLabels();
  const tNav = useTranslations("navigation");

  if (!isOpen) {
    return null;
  }

  const items = getHubNavItems(
    activeHub,
    tenantSlug,
    tNav,
    getModuleDisplayName,
    isModuleEnabled
  );

  const userInitials = profile?.fullName
    ? profile.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "SD";

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <Sheet
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      open
    >
      <SheetContent
        aria-describedby={undefined}
        className="data-[side=left]:w-4/5 max-w-xs justify-between overflow-y-auto p-4 md:hidden print:hidden data-[side=left]:sm:max-w-xs"
        side="left"
      >
        <SheetTitle className="sr-only">Navigasyon menüsü</SheetTitle>
        <div className="space-y-3.5">
          {/* Top Tenant Switcher & Close */}
          <div className="flex items-center justify-between border-border/80 border-b pb-3">
            <TenantSwitcher />
            <SheetClose asChild>
              <button
                aria-label="Kapat"
                className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                type="button"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </SheetClose>
          </div>

          {/* Hub Selection Grid for Mobile */}
          <div className="grid grid-cols-5 gap-1 rounded-lg bg-muted/60 p-1">
            {hubs.map((hub) => (
              <button
                className={`flex flex-col items-center justify-center rounded-md py-1.5 font-semibold text-3xs transition-all ${
                  activeHub === hub.id
                    ? "bg-background font-bold text-primary shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                key={hub.id}
                onClick={() => onSelectHub(hub.id)}
                type="button"
              >
                <hub.icon className="h-3.5 w-3.5" />
                <span className="mt-0.5">{hub.label}</span>
              </button>
            ))}
          </div>

          {/* Quick Search Shortcut */}
          <button
            className="flex w-full items-center justify-between rounded-lg border border-input bg-background/60 py-2 pr-2.5 pl-3 text-muted-foreground text-xs shadow-2xs"
            onClick={() => {
              onClose();
              onOpenCommandPalette();
            }}
            type="button"
          >
            <div className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium">Hızlı Arama (⌘K)...</span>
            </div>
          </button>

          {/* Navigation Items */}
          <div className="space-y-0.5 pt-1">
            {items.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname === item.href ||
                  pathname?.startsWith(`${item.href}/`);

              const link = (
                <Link
                  className={`flex h-9 items-center gap-2.5 rounded-lg px-2.5 font-medium text-xs transition-all ${
                    isActive
                      ? "border border-primary/20 bg-primary/10 font-semibold text-primary"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                  href={item.href}
                  key={item.href}
                  onClick={onClose}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.name}</span>
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
                    {link}
                  </PermissionGate>
                );
              }

              return link;
            })}
          </div>
        </div>

        {/* Bottom User Profile Card */}
        <div className="border-border/80 border-t pt-3">
          <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/40 p-2">
            <Link
              className="flex min-w-0 flex-1 items-center gap-2"
              href={`/${tenantSlug}/settings`}
              onClick={onClose}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary font-bold text-primary-foreground text-xs">
                {userInitials}
              </div>
              <div className="min-w-0 truncate">
                <div className="truncate font-semibold text-foreground text-xs">
                  {profile?.fullName || "Profil"}
                </div>
                <div className="truncate text-3xs text-muted-foreground">
                  {activeTenant?.name || "CRM"}
                </div>
              </div>
            </Link>

            <div className="flex items-center gap-1">
              <Link
                className="rounded-md p-1.5 text-muted-foreground hover:bg-background hover:text-foreground"
                href={`/${tenantSlug}/settings`}
                onClick={onClose}
                title="Ayarlar"
              >
                <Settings className="h-3.5 w-3.5" />
              </Link>
              <button
                className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                onClick={handleLogout}
                title="Çıkış Yap"
                type="button"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface MobileBottomNavProps {
  onOpenDrawer: () => void;
  tenantSlug: string;
}

export function MobileBottomNav({
  tenantSlug,
  onOpenDrawer,
}: MobileBottomNavProps) {
  const pathname = usePathname();
  const tNav = useTranslations("navigation");

  const mobileBottomNav = [
    {
      exact: true,
      href: `/${tenantSlug}`,
      icon: LayoutDashboard,
      label: tNav("dashboard"),
    },
    {
      href: `/${tenantSlug}/pipelines`,
      icon: Kanban,
      label: tNav("pipelines"),
    },
    {
      href: `/${tenantSlug}/quotes`,
      icon: FileSpreadsheet,
      label: tNav("quotes"),
    },
    {
      href: `/${tenantSlug}/customers`,
      icon: Users2,
      label: tNav("customers"),
    },
  ];

  return (
    <nav className="safe-bottom fixed right-0 bottom-0 left-0 z-40 flex items-center justify-around border-border/80 border-t bg-background/95 px-2 py-1.5 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] backdrop-blur-lg md:hidden print:hidden">
      {mobileBottomNav.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname?.startsWith(item.href);

        return (
          <Link
            className={`flex flex-col items-center gap-1 rounded-lg px-2.5 py-1 font-semibold text-3xs transition-all ${
              isActive
                ? "font-bold text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            href={item.href}
            key={item.href}
          >
            <div
              className={`rounded-md p-1 transition-all ${
                isActive ? "bg-primary/10 text-primary shadow-2xs" : ""
              }`}
            >
              <item.icon className="h-4 w-4" />
            </div>
            <span>{item.label}</span>
          </Link>
        );
      })}
      <button
        className="flex flex-col items-center gap-1 rounded-lg px-2.5 py-1 font-semibold text-3xs text-muted-foreground transition-all hover:text-foreground"
        onClick={onOpenDrawer}
        type="button"
      >
        <div className="rounded-md p-1">
          <Menu className="h-4 w-4" />
        </div>
        <span>Daha Fazla</span>
      </button>
    </nav>
  );
}
