/* Hallmark · genre: modern-minimal · macrostructure: Workbench · theme: Adaptive Zinc/Violet · design-system: design.md · designed-as-app */
"use client";

import { Toaster } from "@workspace/ui/components/sonner";
import {
  Banknote,
  BarChart3,
  Boxes,
  Briefcase,
  Calendar,
  Car,
  ChevronLeft,
  ChevronRight,
  Clock,
  Command,
  FileSpreadsheet,
  Kanban,
  Keyboard,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  Moon,
  Network,
  Package,
  Search,
  Settings,
  Shield,
  ShoppingCart,
  Sun,
  Tag,
  Truck,
  Users,
  Users2,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { useTheme } from "next-themes";
import type React from "react";
import { Suspense, useEffect, useState, useSyncExternalStore } from "react";
import { CommandPalette } from "@/components/command-palette";
import { LanguageSwitcher } from "@/components/language-switcher";
import { NotificationCenter } from "@/components/notification-center";
import { PermissionGate } from "@/components/permission-gate";
import { ShortcutsHelpModal } from "@/components/shortcuts-help-modal";
import { TenantSwitcher } from "@/components/tenant-switcher";
import { LabelProvider, useLabels } from "@/lib/labels/label-context";
import { RealtimeNotificationProvider } from "@/lib/notifications/realtime-notification-context";
import {
  PermissionProvider,
  usePermissions,
} from "@/lib/permissions/permission-context";
import { createClient } from "@/lib/supabase/client";

export type NavigationHub = "crm" | "ops" | "hrm" | "comm" | "sys";

interface HubDefinition {
  badge?: string | null;
  defaultHref: (slug: string) => string;
  description: string;
  icon: React.ElementType;
  id: NavigationHub;
  label: string;
  name: string;
}

const NAVIGATION_HUBS: HubDefinition[] = [
  {
    defaultHref: (slug) => `/${slug}`,
    description: "Pipeline, Teklifler ve Müşteriler",
    icon: LayoutDashboard,
    id: "crm",
    label: "CRM",
    name: "CRM & Satış",
  },
  {
    defaultHref: (slug) => `/${slug}/vehicles`,
    description: "Araçlar, Projeler ve Kargo",
    icon: Car,
    id: "ops",
    label: "OPS",
    name: "Operasyon & Araçlar",
  },
  {
    defaultHref: (slug) => `/${slug}/attendance`,
    description: "PDKS, İzinler ve Bordro",
    icon: Users2,
    id: "hrm",
    label: "HRM",
    name: "İnsan Kaynakları",
  },
  {
    badge: "33",
    defaultHref: (slug) => `/${slug}/tickets`,
    description: "Destek Masası ve Mesajlar",
    icon: MessageSquare,
    id: "comm",
    label: "CMS",
    name: "Destek & İletişim",
  },
  {
    defaultHref: (slug) => `/${slug}/users`,
    description: "Kullanıcılar, Roller ve Ayarlar",
    icon: Shield,
    id: "sys",
    label: "SYS",
    name: "Sistem & Yönetim",
  },
];

function getActiveHubFromPathname(
  pathname: string,
  tenantSlug: string
): NavigationHub {
  if (!(pathname && tenantSlug)) {
    return "crm";
  }

  if (
    pathname.includes(`/${tenantSlug}/attendance`) ||
    pathname.includes(`/${tenantSlug}/leaves`) ||
    pathname.includes(`/${tenantSlug}/payroll`) ||
    pathname.includes(`/${tenantSlug}/organization`) ||
    pathname.includes(`/${tenantSlug}/compliance`) ||
    pathname.includes(`/${tenantSlug}/recruitment`)
  ) {
    return "hrm";
  }

  if (
    pathname.includes(`/${tenantSlug}/vehicles`) ||
    pathname.includes(`/${tenantSlug}/projects`) ||
    pathname.includes(`/${tenantSlug}/products`) ||
    pathname.includes(`/${tenantSlug}/shipments`)
  ) {
    return "ops";
  }

  if (
    pathname.includes(`/${tenantSlug}/tickets`) ||
    pathname.includes(`/${tenantSlug}/messages`) ||
    pathname.includes(`/${tenantSlug}/email`) ||
    pathname.includes(`/${tenantSlug}/automations`) ||
    pathname.includes(`/${tenantSlug}/analytics`) ||
    pathname.includes(`/${tenantSlug}/integration`)
  ) {
    return "comm";
  }

  if (
    pathname.includes(`/${tenantSlug}/users`) ||
    pathname.includes(`/${tenantSlug}/roles`) ||
    pathname.includes(`/${tenantSlug}/settings`)
  ) {
    return "sys";
  }

  return "crm";
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const tenantSlug = (params?.tenantSlug as string) || "";

  return (
    <PermissionProvider initialTenantSlug={tenantSlug}>
      <LabelProvider tenantSlug={tenantSlug}>
        <Toaster position="top-right" richColors />
        <DashboardLayoutInner tenantSlug={tenantSlug}>
          {children}
        </DashboardLayoutInner>
      </LabelProvider>
    </PermissionProvider>
  );
}

function DashboardLayoutInner({
  children,
  tenantSlug,
}: {
  children: React.ReactNode;
  tenantSlug: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const { profile, activeTenant } = usePermissions();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [activeHub, setActiveHub] = useState<NavigationHub>(() =>
    getActiveHubFromPathname(pathname || "", tenantSlug)
  );
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("crm_sidebar_collapsed");
        if (saved !== null) {
          return saved === "true";
        }
      } catch {
        // ignore
      }
    }
    return false;
  });

  // Keep activeHub in sync when pathname changes
  useEffect(() => {
    const detected = getActiveHubFromPathname(pathname || "", tenantSlug);
    setActiveHub(detected);
  }, [pathname, tenantSlug]);

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("crm_sidebar_collapsed", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Global Keyboard Navigation & Shortcuts Listener
  useEffect(() => {
    let keyBuffer: string[] = [];
    let bufferTimeout: NodeJS.Timeout | null = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement ||
        (e.target as HTMLElement)?.isContentEditable;

      // 1. Command Palette Toggle (⌘K / Ctrl+K)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      // 2. Open Search with / when not in an input
      if (
        e.key === "/" &&
        !isInput &&
        !isCommandPaletteOpen &&
        !isShortcutsHelpOpen
      ) {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
        return;
      }

      // 3. Open Shortcuts Modal with ? when not in an input
      if (
        e.key === "?" &&
        !isInput &&
        !isCommandPaletteOpen &&
        !isShortcutsHelpOpen
      ) {
        e.preventDefault();
        setIsShortcutsHelpOpen(true);
        return;
      }

      // 4. Escape Key: Close open dialogs or clear selection
      if (e.key === "Escape") {
        if (isCommandPaletteOpen) {
          setIsCommandPaletteOpen(false);
        }
        if (isShortcutsHelpOpen) {
          setIsShortcutsHelpOpen(false);
        }
        if (isMobileDrawerOpen) {
          setIsMobileDrawerOpen(false);
        }
        return;
      }

      // 5. Sequence Shortcuts (e.g., G D, G P, N C)
      if (!(isInput || e.metaKey || e.ctrlKey || e.altKey)) {
        keyBuffer.push(e.key.toLowerCase());
        if (bufferTimeout) {
          clearTimeout(bufferTimeout);
        }
        bufferTimeout = setTimeout(() => {
          keyBuffer = [];
        }, 1000);

        const seq = keyBuffer.join("");

        // Navigation sequences (G + ...)
        if (seq === "gd") {
          e.preventDefault();
          router.push(`/${tenantSlug}`);
          keyBuffer = [];
        } else if (seq === "gp") {
          e.preventDefault();
          router.push(`/${tenantSlug}/pipelines`);
          keyBuffer = [];
        } else if (seq === "gc") {
          e.preventDefault();
          router.push(`/${tenantSlug}/customers`);
          keyBuffer = [];
        } else if (seq === "gq") {
          e.preventDefault();
          router.push(`/${tenantSlug}/quotes`);
          keyBuffer = [];
        } else if (seq === "go") {
          e.preventDefault();
          router.push(`/${tenantSlug}/orders`);
          keyBuffer = [];
        } else if (seq === "ga") {
          e.preventDefault();
          router.push(`/${tenantSlug}/attendance`);
          keyBuffer = [];
        } else if (seq === "gl") {
          e.preventDefault();
          router.push(`/${tenantSlug}/leaves`);
          keyBuffer = [];
        } else if (seq === "gv") {
          e.preventDefault();
          router.push(`/${tenantSlug}/vehicles`);
          keyBuffer = [];
        } else if (seq === "gs") {
          e.preventDefault();
          router.push(`/${tenantSlug}/settings`);
          keyBuffer = [];
        }

        // Quick Creation sequences (N + ...)
        else if (seq === "nc") {
          e.preventDefault();
          router.push(`/${tenantSlug}/customers?create=true`);
          keyBuffer = [];
        } else if (seq === "nd") {
          e.preventDefault();
          router.push(`/${tenantSlug}/pipelines?create=true`);
          keyBuffer = [];
        } else if (seq === "nq") {
          e.preventDefault();
          router.push(`/${tenantSlug}/quotes?create=true`);
          keyBuffer = [];
        } else if (seq === "ni" || seq === "nl") {
          e.preventDefault();
          router.push(`/${tenantSlug}/leaves?create=true`);
          keyBuffer = [];
        } else if (seq === "nu") {
          e.preventDefault();
          router.push(`/${tenantSlug}/products?create=true`);
          keyBuffer = [];
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (bufferTimeout) {
        clearTimeout(bufferTimeout);
      }
    };
  }, [
    router,
    tenantSlug,
    isCommandPaletteOpen,
    isShortcutsHelpOpen,
    isMobileDrawerOpen,
  ]);

  const userInitials = profile?.fullName
    ? profile.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "SD";

  const currentHubMeta =
    NAVIGATION_HUBS.find((h) => h.id === activeHub) || NAVIGATION_HUBS[0]!;

  // Bottom navigation items on mobile
  const mobileBottomNav = [
    {
      exact: true,
      href: `/${tenantSlug}`,
      icon: LayoutDashboard,
      label: "Anasayfa",
    },
    { href: `/${tenantSlug}/pipelines`, icon: Kanban, label: "Fırsatlar" },
    {
      href: `/${tenantSlug}/quotes`,
      icon: FileSpreadsheet,
      label: "Teklifler",
    },
    { href: `/${tenantSlug}/customers`, icon: Users2, label: "Müşteriler" },
  ];

  return (
    <RealtimeNotificationProvider
      tenantId={activeTenant?.id}
      tenantSlug={tenantSlug}
    >
      <div className="flex h-screen w-full flex-col overflow-hidden bg-zinc-100/70 font-sans text-zinc-900 antialiased md:flex-row md:gap-3 md:p-3 dark:bg-zinc-950 dark:text-zinc-100 print:m-0 print:block print:h-auto print:overflow-visible print:bg-white print:p-0">
        {/* Mobile Top Header Bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-zinc-200/80 border-b bg-white/95 px-3.5 py-2.5 backdrop-blur-md md:hidden dark:border-zinc-800/80 dark:bg-zinc-900/95 print:hidden">
          <div className="flex min-w-0 items-center gap-2">
            <button
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-200/80 bg-zinc-50 text-zinc-700 shadow-2xs transition-all hover:bg-zinc-100 active:scale-95 dark:border-zinc-800 dark:bg-zinc-800/80 dark:text-zinc-300"
              onClick={() => setIsMobileDrawerOpen(true)}
              title="Menüyü Aç"
              type="button"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <TenantSwitcher />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200/80 bg-zinc-50 text-zinc-600 transition-all hover:bg-zinc-100 active:scale-95 dark:border-zinc-800 dark:bg-zinc-800/80 dark:text-zinc-300"
              onClick={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
              title={
                mounted && resolvedTheme === "dark" ? "Açık Tema" : "Koyu Tema"
              }
              type="button"
            >
              {mounted && resolvedTheme === "dark" ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-zinc-600 dark:text-zinc-300" />
              )}
            </button>
            <LanguageSwitcher variant="minimal" />
            <NotificationCenter buttonClassName="relative flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200/80 bg-zinc-50 text-zinc-600 transition-all hover:bg-zinc-100 active:scale-95 dark:border-zinc-800 dark:bg-zinc-800/80 dark:text-zinc-300" />
            <button
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200/80 bg-zinc-50 text-zinc-600 transition-all hover:bg-zinc-100 active:scale-95 dark:border-zinc-800 dark:bg-zinc-800/80 dark:text-zinc-300"
              onClick={() => setIsCommandPaletteOpen(true)}
              title="Arama (⌘K veya /)"
              type="button"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Mobile Off-Canvas Sliding Drawer / Sheet */}
        {isMobileDrawerOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden print:hidden">
            <div
              className="fade-in fixed inset-0 animate-in bg-zinc-950/70 backdrop-blur-sm transition-opacity"
              onClick={() => setIsMobileDrawerOpen(false)}
            />

            <div className="slide-in-from-left relative z-10 flex w-4/5 max-w-xs flex-1 animate-in flex-col justify-between overflow-y-auto bg-white p-4 shadow-2xl duration-200 dark:bg-zinc-900">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-zinc-200/80 border-b pb-3 dark:border-zinc-800">
                  <TenantSwitcher />
                  <button
                    className="rounded-full p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                    onClick={() => setIsMobileDrawerOpen(false)}
                    type="button"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Hub Selection Pills for Mobile */}
                <div className="grid grid-cols-5 gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800/80">
                  {NAVIGATION_HUBS.map((hub) => (
                    <button
                      className={`flex flex-col items-center justify-center rounded-lg py-1.5 font-bold text-[10px] transition-all ${
                        activeHub === hub.id
                          ? "bg-white text-violet-700 shadow-2xs dark:bg-zinc-700 dark:text-violet-300"
                          : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                      }`}
                      key={hub.id}
                      onClick={() => setActiveHub(hub.id)}
                      type="button"
                    >
                      <hub.icon className="h-3.5 w-3.5" />
                      <span className="mt-0.5">{hub.label}</span>
                    </button>
                  ))}
                </div>

                <button
                  className="flex w-full items-center justify-between rounded-xl border border-zinc-200/90 bg-zinc-50/90 py-2 pr-2.5 pl-3 text-xs text-zinc-500 shadow-2xs dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-400"
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    setIsCommandPaletteOpen(true);
                  }}
                  type="button"
                >
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-zinc-400" />
                    <span className="font-medium text-zinc-400">
                      Hızlı Arama (⌘K)...
                    </span>
                  </div>
                </button>

                <DashboardNavigation
                  activeHub={activeHub}
                  isCollapsed={false}
                  onItemClick={() => setIsMobileDrawerOpen(false)}
                />
              </div>

              <div className="pt-4">
                <DashboardBottom isCollapsed={false} />
              </div>
            </div>
          </div>
        )}

        {/* Desktop Left Collapsible Dual-Rail Workspace Navigation */}
        <aside className="relative z-30 hidden shrink-0 rounded-[24px] border border-zinc-200/80 bg-white shadow-xs md:flex dark:border-zinc-800/80 dark:bg-zinc-900 print:hidden">
          {/* 1. Primary Left Hub Rail (w-16 / 64px) */}
          <div className="flex w-16 shrink-0 flex-col justify-between rounded-l-[24px] border-zinc-100 border-r bg-zinc-50/60 p-2.5 dark:border-zinc-800/80 dark:bg-zinc-900/90">
            {/* Top: Tenant Switcher & Hub Launchers */}
            <div className="flex flex-col items-center gap-2.5">
              <TenantSwitcher isCollapsed={true} />

              {/* Prominent Expand Button when Collapsed */}
              {isSidebarCollapsed && (
                <button
                  className="fade-in zoom-in-90 flex h-8 w-8 animate-in items-center justify-center rounded-xl border border-violet-200/80 bg-violet-50 text-violet-700 shadow-2xs transition-all duration-150 hover:bg-violet-100 active:scale-95 dark:border-violet-800/60 dark:bg-violet-950/60 dark:text-violet-300"
                  onClick={() => setIsSidebarCollapsed(false)}
                  title="Menüyü Genişlet"
                  type="button"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}

              <div className="h-px w-8 bg-zinc-200/80 dark:bg-zinc-800" />

              {/* 5 Hub Launcher Buttons with Design System Floating Tooltips */}
              <div className="flex flex-col items-center gap-2">
                {NAVIGATION_HUBS.map((hub) => {
                  const isHubActive = activeHub === hub.id;
                  const HubIcon = hub.icon;

                  return (
                    <div className="group/hub relative" key={hub.id}>
                      <button
                        className={`group relative flex h-11 w-11 flex-col items-center justify-center rounded-2xl transition-all duration-200 ${
                          isHubActive
                            ? "bg-violet-600 text-white shadow-md shadow-violet-500/20 dark:bg-violet-600 dark:text-white"
                            : "text-zinc-500 hover:bg-zinc-200/60 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                        }`}
                        onClick={() => {
                          setActiveHub(hub.id);
                          if (isSidebarCollapsed) {
                            setIsSidebarCollapsed(false);
                          }
                        }}
                        type="button"
                      >
                        {/* Active Indicator Bar on Left */}
                        {isHubActive && (
                          <span className="absolute top-1/2 -left-2.5 h-5 w-1 -translate-y-1/2 rounded-r-full bg-violet-600 dark:bg-violet-400" />
                        )}

                        <HubIcon className="h-4 w-4 shrink-0 transition-transform duration-150 group-hover:scale-110" />
                        <span
                          className={`mt-0.5 font-bold text-[9px] leading-none tracking-tight ${
                            isHubActive
                              ? "text-white"
                              : "text-zinc-400 group-hover:text-zinc-700 dark:text-zinc-500 dark:group-hover:text-zinc-300"
                          }`}
                        >
                          {hub.label}
                        </span>

                        {/* Hub Notification Badge */}
                        {hub.badge && (
                          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 font-bold text-[9px] text-white ring-2 ring-white dark:ring-zinc-900">
                            {hub.badge}
                          </span>
                        )}
                      </button>

                      {/* Design System Floating Tooltip (Linear/Stripe style) */}
                      <div className="pointer-events-none absolute top-1/2 left-full z-50 ml-3.5 -translate-x-1 -translate-y-1/2 whitespace-nowrap rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5 font-semibold text-white text-xs opacity-0 shadow-xl transition-all duration-150 group-hover/hub:translate-x-0 group-hover/hub:opacity-100 dark:border-zinc-700 dark:bg-zinc-100 dark:text-zinc-900">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold">{hub.name}</span>
                          <span className="font-normal text-[10px] text-zinc-400 dark:text-zinc-500">
                            • {hub.description}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom: Language Switcher, Theme Toggle & Profile Avatar */}
            <div className="flex flex-col items-center gap-2.5 border-zinc-200/80 border-t pt-2.5 dark:border-zinc-800">
              {/* Language Switcher */}
              <LanguageSwitcher variant="minimal" />

              {/* Theme Toggle */}
              <button
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200/70 bg-white text-zinc-600 shadow-2xs transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                onClick={() =>
                  setTheme(resolvedTheme === "dark" ? "light" : "dark")
                }
                title={resolvedTheme === "dark" ? "Açık Tema" : "Koyu Tema"}
                type="button"
              >
                {mounted && resolvedTheme === "dark" ? (
                  <Sun className="h-4 w-4 text-amber-400" />
                ) : (
                  <Moon className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                )}
              </button>

              {/* User Profile Avatar / Settings Link */}
              <Link
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 font-bold text-white text-xs shadow-2xs transition hover:opacity-90"
                href={`/${tenantSlug || "workspace"}/settings`}
                title={`${profile?.fullName || "Profil"} - Ayarlar`}
              >
                {userInitials}
              </Link>
            </div>
          </div>

          {/* 2. Secondary Sub-Navigation Rail (~235px, Collapsible) */}
          <div
            className={`flex flex-col justify-between overflow-hidden rounded-r-[24px] bg-white p-3.5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] dark:bg-zinc-900 ${
              isSidebarCollapsed
                ? "pointer-events-none w-0 border-none p-0 opacity-0"
                : "w-[235px] opacity-100"
            }`}
          >
            <div className="flex flex-1 flex-col overflow-hidden">
              {/* Secondary Header with Active Hub Title & Collapse Toggle */}
              <div className="mb-3 flex shrink-0 items-center justify-between gap-1.5">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400">
                    <currentHubMeta.icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="truncate font-bold text-xs text-zinc-900 dark:text-zinc-100">
                    {currentHubMeta.name}
                  </span>
                </div>

                <button
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                  onClick={toggleSidebarCollapse}
                  title="Menüyü Daralt"
                  type="button"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </div>

              {/* Quick Search Shortcut Button */}
              <div className="mb-3 shrink-0">
                <button
                  className="group relative flex h-8 w-full items-center justify-between rounded-xl border border-zinc-200/90 bg-zinc-50/90 px-2.5 text-xs text-zinc-500 shadow-2xs transition-all hover:border-violet-300 hover:bg-white hover:text-zinc-800 focus:outline-none dark:border-zinc-800 dark:bg-zinc-800/50 dark:hover:border-violet-600/50 dark:hover:bg-zinc-800"
                  onClick={() => setIsCommandPaletteOpen(true)}
                  type="button"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Search className="h-3.5 w-3.5 shrink-0 text-zinc-400 transition-colors group-hover:text-violet-600 dark:group-hover:text-violet-400" />
                    <span className="truncate text-[11px] text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300">
                      Hızlı Arama...
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5 rounded-md border border-zinc-200/80 bg-white px-1.5 py-0.5 font-bold text-[9px] text-zinc-400 shadow-2xs dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
                    <Command className="h-2.5 w-2.5" />
                    <span>K</span>
                  </div>
                </button>
              </div>

              {/* Sub-Menu Items List: Completely eliminates vertical scrollbar */}
              <div className="no-scrollbar flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden pr-0.5">
                <Suspense
                  fallback={
                    <div className="h-48 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
                  }
                >
                  <DashboardNavigation
                    activeHub={activeHub}
                    isCollapsed={false}
                  />
                </Suspense>
              </div>
            </div>

            {/* Secondary Bottom Helper */}
            <div className="mt-2 shrink-0 border-zinc-100 border-t pt-2 dark:border-zinc-800">
              <div className="flex items-center justify-between px-1">
                <button
                  className="flex items-center gap-1 font-medium text-[10px] text-zinc-400 transition hover:text-zinc-700 dark:hover:text-zinc-300"
                  onClick={() => setIsShortcutsHelpOpen(true)}
                  type="button"
                >
                  <Keyboard className="h-3 w-3" />
                  <span>Kısayollar (?)</span>
                </button>

                <span className="font-bold text-[9px] text-violet-600/70 uppercase tracking-wider dark:text-violet-400/70">
                  {currentHubMeta.label}
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Viewport Canvas */}
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto rounded-none border-0 border-zinc-200/80 bg-white shadow-none md:rounded-[24px] md:border md:shadow-2xs dark:border-zinc-800/80 dark:bg-zinc-900 print:block print:h-auto print:overflow-visible print:rounded-none print:border-none print:p-0 print:shadow-none">
          <div className="flex-1 p-3.5 pb-24 sm:p-6 md:p-7 md:pb-8 print:p-0 print:pb-0">
            {children}
          </div>
        </div>

        {/* Mobile Bottom Navigation Bar */}
        <nav className="safe-bottom fixed right-0 bottom-0 left-0 z-40 flex items-center justify-around border-zinc-200/90 border-t bg-white/95 px-2 py-1.5 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] backdrop-blur-lg md:hidden dark:border-zinc-800 dark:bg-zinc-900/95 print:hidden">
          {mobileBottomNav.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname?.startsWith(item.href);
            return (
              <Link
                className={`flex flex-col items-center gap-1 rounded-xl px-2.5 py-1 font-semibold text-[10px] transition-all ${
                  isActive
                    ? "font-bold text-violet-600 dark:text-violet-400"
                    : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 dark:hover:text-zinc-400"
                }`}
                href={item.href}
                key={item.href}
              >
                <div
                  className={`rounded-lg p-1 transition-all ${
                    isActive
                      ? "bg-violet-50 text-violet-600 shadow-2xs dark:bg-violet-950/60 dark:text-violet-400"
                      : ""
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                </div>
                <span>{item.label}</span>
              </Link>
            );
          })}
          <button
            className="flex flex-col items-center gap-1 rounded-xl px-2.5 py-1 font-semibold text-[10px] text-zinc-500 transition-all hover:text-zinc-800 dark:hover:text-zinc-400"
            onClick={() => setIsMobileDrawerOpen(true)}
            type="button"
          >
            <div className="rounded-lg p-1">
              <Menu className="h-4 w-4" />
            </div>
            <span>Daha Fazla</span>
          </button>
        </nav>
      </div>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onOpenShortcutsHelp={() => setIsShortcutsHelpOpen(true)}
      />

      {/* Keyboard Shortcuts Cheat Sheet Modal */}
      <ShortcutsHelpModal
        isOpen={isShortcutsHelpOpen}
        onClose={() => setIsShortcutsHelpOpen(false)}
      />
    </RealtimeNotificationProvider>
  );
}

interface NavItem {
  badge?: string | null;
  exact?: boolean;
  href: string;
  icon: React.ElementType;
  moduleKey?: string;
  name: string;
  permission?: string;
  tab?: string;
}

function DashboardNavigation({
  activeHub = "crm",
  onItemClick,
  isCollapsed = false,
}: {
  activeHub?: NavigationHub;
  onItemClick?: () => void;
  isCollapsed?: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams();
  const tenantSlug = (params?.tenantSlug as string) || "";
  const currentTab = searchParams.get("tab") || "chart";

  const { getModuleDisplayName, isModuleEnabled } = useLabels();

  // 1. CRM / Satış Hub'ı
  const salesMenu: NavItem[] = [
    {
      exact: true,
      href: `/${tenantSlug}`,
      icon: LayoutDashboard,
      name: "Dashboard",
    },
    {
      badge: null,
      href: `/${tenantSlug}/pipelines`,
      icon: Kanban,
      moduleKey: "pipelines",
      name: getModuleDisplayName("pipelines", "Pipeline & Akış"),
      permission: "Pipelines.View",
    },
    {
      badge: null,
      href: `/${tenantSlug}/quotes`,
      icon: FileSpreadsheet,
      moduleKey: "quotes",
      name: getModuleDisplayName("quotes", "Teklifler"),
      permission: "Quotes.View",
    },
    {
      badge: null,
      href: `/${tenantSlug}/customers`,
      icon: Users2,
      moduleKey: "customers",
      name: getModuleDisplayName("customers", "Müşteriler"),
    },
    {
      badge: null,
      href: `/${tenantSlug}/orders`,
      icon: ShoppingCart,
      moduleKey: "orders",
      name: getModuleDisplayName("orders", "Siparişler"),
    },
    {
      badge: null,
      href: `/${tenantSlug}/promotions`,
      icon: Tag,
      moduleKey: "promotions",
      name: getModuleDisplayName("promotions", "Kampanya & Kuponlar"),
      permission: "Promotions.View",
    },
  ].filter((item) => !item.moduleKey || isModuleEnabled(item.moduleKey));

  // 2. Operasyon & Araçlar Hub'ı
  const opsMenu: NavItem[] = [
    {
      badge: null,
      href: `/${tenantSlug}/vehicles`,
      icon: Car,
      name: "Otomotiv & Araçlar",
      permission: "Vehicles.View",
    },
    {
      badge: null,
      href: `/${tenantSlug}/projects`,
      icon: Briefcase,
      name: "Projeler & Backlog",
      permission: "Projects.View",
    },
    {
      badge: null,
      href: `/${tenantSlug}/products`,
      icon: Package,
      moduleKey: "products",
      name: getModuleDisplayName("products", "Ürün & Hizmetler"),
    },
    {
      badge: null,
      href: `/${tenantSlug}/shipments`,
      icon: Truck,
      moduleKey: "shipping",
      name: getModuleDisplayName("shipping", "Kargo & Sevkiyat"),
      permission: "Shipment.View",
    },
  ].filter((item) => !item.moduleKey || isModuleEnabled(item.moduleKey));

  // 3. İnsan Kaynakları & Bordro Hub'ı
  const hrMenu: NavItem[] = [
    {
      badge: null,
      href: `/${tenantSlug}/attendance`,
      icon: Clock,
      moduleKey: "attendance",
      name: getModuleDisplayName("attendance", "Vardiya & PDKS"),
      permission: "Attendance.View",
    },
    {
      badge: null,
      href: `/${tenantSlug}/leaves`,
      icon: Calendar,
      moduleKey: "leaves",
      name: getModuleDisplayName("leaves", "İzinler & Takvim"),
      permission: "Leaves.View",
    },
    {
      badge: null,
      href: `/${tenantSlug}/payroll`,
      icon: Banknote,
      moduleKey: "payroll",
      name: getModuleDisplayName("payroll", "Bordro & Maaşlar"),
      permission: "Payroll.View",
    },
    {
      badge: null,
      href: `/${tenantSlug}/organization?tab=chart`,
      icon: Network,
      moduleKey: "organization",
      name: "Organizasyon",
      permission: "Organization.ViewChart",
      tab: "chart",
    },
    {
      badge: null,
      href: `/${tenantSlug}/recruitment`,
      icon: Briefcase,
      name: "İşe Alım",
      permission: "Recruitment.View",
    },
  ].filter((item) => !item.moduleKey || isModuleEnabled(item.moduleKey));

  // 4. CMS & İletişim Hub'ı
  const toolsMenu: NavItem[] = [
    {
      badge: null,
      href: `/${tenantSlug}/tickets`,
      icon: LifeBuoy,
      moduleKey: "tickets",
      name: getModuleDisplayName("tickets", "Destek Masası"),
      permission: "Tickets.View",
    },
    {
      badge: "33",
      href: `/${tenantSlug}/messages`,
      icon: MessageSquare,
      moduleKey: "chat",
      name: getModuleDisplayName("chat", "Mesajlar & Sohbet"),
    },
    {
      href: `/${tenantSlug}/email`,
      icon: Mail,
      name: "E-Posta",
    },
    {
      href: `/${tenantSlug}/analytics`,
      icon: BarChart3,
      name: "Raporlar & Analitik",
    },
    {
      href: `/${tenantSlug}/integration`,
      icon: Boxes,
      name: "Entegrasyonlar",
    },
  ].filter((item) => !item.moduleKey || isModuleEnabled(item.moduleKey));

  // 5. Sistem & Yönetim Hub'ı
  const managementMenu: NavItem[] = [
    {
      badge: "6",
      href: `/${tenantSlug}/users`,
      icon: Users,
      name: "Ekip & Üyeler",
      permission: "Users.View",
    },
    {
      badge: "4",
      href: `/${tenantSlug}/roles`,
      icon: Shield,
      name: "Roller & Yetkiler",
      permission: "Roles.View",
    },
    {
      badge: null,
      href: `/${tenantSlug}/settings`,
      icon: Settings,
      name: "Şirket Ayarları",
      permission: "Tenants.Update",
    },
  ];

  const getMenuForActiveHub = () => {
    switch (activeHub) {
      case "ops":
        return opsMenu;
      case "hrm":
        return hrMenu;
      case "comm":
        return toolsMenu;
      case "sys":
        return managementMenu;
      case "crm":
      default:
        return salesMenu;
    }
  };

  const currentItems = getMenuForActiveHub();

  const renderNavList = (items: NavItem[]) => {
    return items.map((item) => {
      const isOrgPage = pathname === `/${tenantSlug}/organization`;
      const isActive = item.tab
        ? isOrgPage && currentTab === item.tab
        : item.exact
          ? pathname === item.href
          : pathname === item.href || pathname?.startsWith(`${item.href}/`);

      const linkContent = (
        <Link
          className={`group relative flex h-9 w-full items-center rounded-xl border text-xs transition-all duration-150 ${
            isCollapsed ? "justify-center px-0" : "gap-2.5 px-2.5"
          } ${
            isActive
              ? "border-violet-200/80 bg-violet-50/90 font-semibold text-violet-700 shadow-2xs dark:border-violet-800/60 dark:bg-violet-950/60 dark:text-violet-300"
              : "border-transparent font-medium text-zinc-600 hover:border-zinc-200/60 hover:bg-zinc-100/80 hover:text-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-800/60 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-200"
          }`}
          href={item.href}
          key={item.name}
          onClick={onItemClick}
          prefetch={false}
          title={isCollapsed ? item.name : undefined}
        >
          {/* Active indicator bar */}
          <span
            className={`absolute top-1/2 left-1 h-4 w-1 -translate-y-1/2 rounded-full bg-violet-600 transition-opacity duration-150 dark:bg-violet-400 ${
              isActive && !isCollapsed
                ? "opacity-100"
                : "pointer-events-none opacity-0"
            }`}
          />

          {/* Icon in fixed anchor box */}
          <div className="flex h-5 w-5 shrink-0 items-center justify-center">
            <item.icon
              className={`h-4 w-4 shrink-0 transition-colors duration-150 ${
                isActive
                  ? "text-violet-600 dark:text-violet-400"
                  : "text-zinc-400 group-hover:text-zinc-700 dark:text-zinc-500 dark:group-hover:text-zinc-300"
              }`}
            />
          </div>

          {/* Label and Badge */}
          <div
            className={`flex min-w-0 flex-1 items-center justify-between overflow-hidden transition-all duration-200 ${
              isCollapsed
                ? "pointer-events-none max-w-0 -translate-x-2 opacity-0"
                : "max-w-xs translate-x-0 opacity-100"
            }`}
          >
            <span className="truncate whitespace-nowrap text-xs">
              {item.name}
            </span>
            {item.badge && (
              <span
                className={`ml-2 shrink-0 rounded-full px-1.5 py-0.5 font-bold text-[10px] ${
                  isActive
                    ? "bg-violet-100 text-violet-800 dark:bg-violet-900/80 dark:text-violet-200"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                }`}
              >
                {item.badge}
              </span>
            )}
          </div>
        </Link>
      );

      if (item.permission) {
        return (
          <PermissionGate key={item.name} permission={item.permission}>
            {linkContent}
          </PermissionGate>
        );
      }

      return linkContent;
    });
  };

  return <div className="space-y-1">{renderNavList(currentItems)}</div>;
}

function DashboardBottom({
  isCollapsed = false,
  onOpenShortcuts,
}: {
  isCollapsed?: boolean;
  onOpenShortcuts?: () => void;
}) {
  const router = useRouter();
  const params = useParams();
  const tenantSlug = (params?.tenantSlug as string) || "";
  const { profile, activeTenant } = usePermissions();
  const { resolvedTheme, setTheme } = useTheme();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const userInitials = profile?.fullName
    ? profile.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "SD";

  return (
    <div className="space-y-2 border-zinc-100 border-t pt-2.5 dark:border-zinc-800">
      {/* Theme and Shortcuts quick bar */}
      <div
        className={`flex items-center transition-all duration-300 ${
          isCollapsed ? "justify-center" : "justify-between px-1"
        }`}
      >
        <button
          className={`flex h-8 items-center justify-center rounded-xl border border-zinc-200/80 bg-zinc-50 text-zinc-600 transition-all hover:bg-zinc-100 active:scale-95 dark:border-zinc-800 dark:bg-zinc-800/80 dark:text-zinc-300 ${
            isCollapsed ? "w-8 px-0" : "gap-1.5 px-2.5 font-medium text-[11px]"
          }`}
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          title={resolvedTheme === "dark" ? "Açık Tema" : "Koyu Tema"}
          type="button"
        >
          {resolvedTheme === "dark" ? (
            <Sun className="h-3.5 w-3.5 shrink-0 text-amber-400" />
          ) : (
            <Moon className="h-3.5 w-3.5 shrink-0 text-zinc-600 dark:text-zinc-400" />
          )}
          <span
            className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
              isCollapsed
                ? "pointer-events-none max-w-0 opacity-0"
                : "max-w-xs opacity-100"
            }`}
          >
            {resolvedTheme === "dark" ? "Açık Tema" : "Koyu Tema"}
          </span>
        </button>

        {!isCollapsed && onOpenShortcuts && (
          <button
            className="flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-[11px] text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            onClick={onOpenShortcuts}
            title="Klavye Kısayolları (?)"
            type="button"
          >
            <Keyboard className="h-3.5 w-3.5 shrink-0" />
            <span>Kısayol (?)</span>
          </button>
        )}
      </div>

      {/* User Profile & Account Card */}
      <div
        className={`group flex items-center rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-1.5 transition-all duration-300 hover:border-zinc-300 hover:bg-zinc-100/70 dark:border-zinc-800 dark:bg-zinc-800/60 dark:hover:border-zinc-700 ${
          isCollapsed
            ? "justify-center border-transparent bg-transparent p-0"
            : "justify-between"
        }`}
      >
        <Link
          className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden"
          href={`/${tenantSlug || "workspace"}/settings`}
          title={`${profile?.fullName || "Profil"} - Ayarlar`}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 font-bold text-white text-xs shadow-2xs">
            {userInitials}
          </div>
          <div
            className={`min-w-0 overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              isCollapsed
                ? "pointer-events-none max-w-0 opacity-0"
                : "max-w-xs opacity-100"
            }`}
          >
            <div className="truncate font-bold text-xs text-zinc-900 dark:text-zinc-100">
              {profile?.fullName || "Serhat Dev"}
            </div>
            <div className="truncate font-medium text-[10px] text-zinc-500 dark:text-zinc-400">
              {activeTenant?.name || "Ana Çalışma Alanı"}
            </div>
          </div>
        </Link>

        <div
          className={`flex items-center gap-0.5 overflow-hidden transition-all duration-300 ${
            isCollapsed
              ? "pointer-events-none max-w-0 opacity-0"
              : "max-w-xs opacity-100"
          }`}
        >
          <Link
            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-white hover:text-zinc-800 hover:shadow-2xs dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
            href={`/${tenantSlug || "workspace"}/settings`}
            title="Şirket & Hesap Ayarları"
          >
            <Settings className="h-3.5 w-3.5" />
          </Link>
          <button
            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/60 dark:hover:text-rose-400"
            onClick={handleLogout}
            title="Güvenli Çıkış Yap"
            type="button"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
