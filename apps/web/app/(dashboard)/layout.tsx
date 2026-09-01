/* Hallmark · genre: modern-minimal · macrostructure: Workbench · theme: Adaptive Zinc/Violet · design-system: design.md · designed-as-app */
"use client";

import { Toaster } from "@workspace/ui/components/sonner";
import {
  Banknote,
  BarChart3,
  Boxes,
  Briefcase,
  Building2,
  Calendar,
  Car,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Command,
  FileSpreadsheet,
  HelpCircle,
  Kanban,
  Keyboard,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Mail,
  Menu,
  MessageCircleQuestion,
  MessageSquare,
  Moon,
  Network,
  Package,
  Scale,
  Search,
  Settings,
  Shield,
  ShoppingCart,
  Sun,
  Tag,
  Truck,
  UserCheck,
  Users,
  Users2,
  X,
  Zap,
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
import { NotificationCenter } from "@/components/notification-center";
import { PermissionGate } from "@/components/permission-gate";
import { ShortcutsHelpModal } from "@/components/shortcuts-help-modal";
import { TenantSwitcher } from "@/components/tenant-switcher";
import {
  PermissionProvider,
  usePermissions,
} from "@/lib/permissions/permission-context";
import { LabelProvider, useLabels } from "@/lib/labels/label-context";
import { createClient } from "@/lib/supabase/client";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const tenantSlug = (params?.tenantSlug as string) || "";
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
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

      // 2. '/' shortcut opens Command Palette when not typing in input
      if (e.key === "/" && !isInput && !isCommandPaletteOpen) {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
        return;
      }

      // 3. Shortcuts Help (? key)
      if (e.key === "?" && !isInput && !isCommandPaletteOpen) {
        e.preventDefault();
        setIsShortcutsHelpOpen((prev) => !prev);
        return;
      }

      // 4. Escape closes open modals
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

      // 5. Two-key sequence shortcuts (GD/GH, GM/GC, GS/GO, GP, GQ, GU, GI/GL, GV/GT, GB, GA, NM/NC, ND, NQ, NI/NL, NU)
      if (!(isInput || e.metaKey || e.ctrlKey || e.altKey)) {
        keyBuffer.push(e.key.toLowerCase());

        if (bufferTimeout) {
          clearTimeout(bufferTimeout);
        }

        bufferTimeout = setTimeout(() => {
          keyBuffer = [];
        }, 1000);

        const seq = keyBuffer.join("");

        // Dashboard (GD / GH)
        if (seq === "gd" || seq === "gh") {
          e.preventDefault();
          router.push(`/${tenantSlug}`);
          keyBuffer = [];
        }
        // Pipelines (GP)
        else if (seq === "gp") {
          e.preventDefault();
          router.push(`/${tenantSlug}/pipelines`);
          keyBuffer = [];
        }
        // Quotes (GQ)
        else if (seq === "gq") {
          e.preventDefault();
          router.push(`/${tenantSlug}/quotes`);
          keyBuffer = [];
        }
        // Customers (GM / GC)
        else if (seq === "gm" || seq === "gc") {
          e.preventDefault();
          router.push(`/${tenantSlug}/customers`);
          keyBuffer = [];
        }
        // Orders (GS / GO)
        else if (seq === "gs" || seq === "go") {
          e.preventDefault();
          router.push(`/${tenantSlug}/orders`);
          keyBuffer = [];
        }
        // Products (GU)
        else if (seq === "gu") {
          e.preventDefault();
          router.push(`/${tenantSlug}/products`);
          keyBuffer = [];
        }
        // Leaves (GI / GL)
        else if (seq === "gi" || seq === "gl") {
          e.preventDefault();
          router.push(`/${tenantSlug}/leaves`);
          keyBuffer = [];
        }
        // Attendance / PDKS (GV / GT)
        else if (seq === "gv" || seq === "gt") {
          e.preventDefault();
          router.push(`/${tenantSlug}/attendance`);
          keyBuffer = [];
        }
        // Payroll (GB)
        else if (seq === "gb") {
          e.preventDefault();
          router.push(`/${tenantSlug}/payroll`);
          keyBuffer = [];
        }
        // Organization (GOR)
        else if (seq === "gor") {
          e.preventDefault();
          router.push(`/${tenantSlug}/organization`);
          keyBuffer = [];
        }
        // Settings (GA)
        else if (seq === "ga") {
          e.preventDefault();
          router.push(`/${tenantSlug}/settings`);
          keyBuffer = [];
        }
        // New Customer (NM / NC)
        else if (seq === "nm" || seq === "nc") {
          e.preventDefault();
          router.push(`/${tenantSlug}/customers?create=true`);
          keyBuffer = [];
        }
        // New Deal / Pipeline (ND)
        else if (seq === "nd") {
          e.preventDefault();
          router.push(`/${tenantSlug}/pipelines?create=true`);
          keyBuffer = [];
        }
        // New Quote (NQ)
        else if (seq === "nq") {
          e.preventDefault();
          router.push(`/${tenantSlug}/quotes?create=true`);
          keyBuffer = [];
        }
        // New Leave (NI / NL)
        else if (seq === "ni" || seq === "nl") {
          e.preventDefault();
          router.push(`/${tenantSlug}/leaves?create=true`);
          keyBuffer = [];
        }
        // New Product (NU)
        else if (seq === "nu") {
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
    <PermissionProvider initialTenantSlug={tenantSlug}>
      <LabelProvider tenantSlug={tenantSlug}>
        <Toaster position="top-right" richColors />
        <div className="flex h-screen w-full flex-col overflow-hidden bg-zinc-100/70 font-sans text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100 md:flex-row md:p-3 md:gap-3 print:h-auto print:overflow-visible print:bg-white print:p-0 print:m-0 print:block">
          {/* Mobile Top Header Bar */}
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-zinc-200/80 bg-white/95 px-3.5 py-2.5 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-900/95 md:hidden print:hidden">
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
                title={mounted && resolvedTheme === "dark" ? "Açık Tema" : "Koyu Tema"}
                type="button"
              >
                {mounted && resolvedTheme === "dark" ? (
                  <Sun className="h-4 w-4 text-amber-400" />
                ) : (
                  <Moon className="h-4 w-4 text-zinc-600 dark:text-zinc-300" />
                )}
              </button>
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
                  <div className="flex items-center justify-between border-b border-zinc-200/80 pb-3 dark:border-zinc-800">
                    <TenantSwitcher />
                    <button
                      className="rounded-full p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                      onClick={() => setIsMobileDrawerOpen(false)}
                      type="button"
                    >
                      <X className="h-5 w-5" />
                    </button>
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

          {/* Desktop Left Collapsible Sidebar with Fluid Spring Transition */}
          {/* Desktop Left Collapsible Sidebar with Fluid Spring Transition */}
          <aside
            className={`relative hidden shrink-0 flex-col justify-between rounded-[24px] border border-zinc-200/80 bg-white p-3 shadow-xs transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] dark:border-zinc-800/80 dark:bg-zinc-900 md:flex print:hidden ${
              isSidebarCollapsed ? "w-[72px]" : "w-64"
            }`}
          >
            <div className="flex flex-1 flex-col overflow-hidden">
              {/* Workspace Switcher & Collapse Toggle Row */}
              <div className="mb-2.5 flex shrink-0 items-center justify-between gap-1.5">
                <div className="min-w-0 flex-1">
                  <TenantSwitcher isCollapsed={isSidebarCollapsed} />
                </div>
                {!isSidebarCollapsed && (
                  <button
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-200/80 bg-zinc-50/80 text-zinc-500 transition-all hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-900 active:scale-95 dark:border-zinc-800 dark:bg-zinc-800/80 dark:text-zinc-400 dark:hover:bg-zinc-700"
                    onClick={toggleSidebarCollapse}
                    title="Menüyü Daralt"
                    type="button"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Quick Search / Expand Row (Always h-9 in both modes) */}
              <div className="mb-2.5 shrink-0">
                {!isSidebarCollapsed ? (
                  <button
                    className="group relative flex h-9 w-full items-center justify-between rounded-xl border border-zinc-200/90 bg-zinc-50/90 px-2.5 text-xs text-zinc-500 shadow-2xs transition-all hover:border-violet-300 hover:bg-white hover:text-zinc-800 hover:shadow-xs focus:outline-none dark:border-zinc-800 dark:bg-zinc-800/50 dark:hover:border-violet-600/50 dark:hover:bg-zinc-800"
                    onClick={() => setIsCommandPaletteOpen(true)}
                    type="button"
                  >
                    <div className="flex items-center gap-2">
                      <Search className="h-3.5 w-3.5 text-zinc-400 transition-colors group-hover:text-violet-600 dark:group-hover:text-violet-400" />
                      <span className="font-medium text-zinc-400 transition-colors group-hover:text-zinc-600 dark:group-hover:text-zinc-300 text-[11px] whitespace-nowrap">
                        Hızlı Arama...
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5 rounded-md border border-zinc-200/80 bg-white px-1.5 py-0.5 font-bold text-[10px] text-zinc-400 shadow-2xs transition-colors group-hover:border-violet-200 group-hover:text-violet-600 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
                      <Command className="h-2.5 w-2.5" />
                      <span>K</span>
                    </div>
                  </button>
                ) : (
                  <button
                    className="flex h-9 w-9 mx-auto items-center justify-center rounded-xl border border-zinc-200/80 bg-zinc-50/80 text-zinc-500 transition-all hover:border-violet-300 hover:bg-violet-50 hover:text-violet-600 active:scale-95 dark:border-zinc-800 dark:bg-zinc-800/80 dark:text-zinc-400 dark:hover:bg-zinc-700"
                    onClick={toggleSidebarCollapse}
                    title="Menüyü Genişlet"
                    type="button"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Navigation Menus with Smooth Scroll */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden pr-0.5">
                <Suspense
                  fallback={
                    <div className="h-48 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
                  }
                >
                  <DashboardNavigation isCollapsed={isSidebarCollapsed} />
                </Suspense>
              </div>
            </div>

            {/* Bottom User Profile & Preferences */}
            <div className="mt-3 shrink-0 border-t border-zinc-100 pt-2 dark:border-zinc-800">
              <DashboardBottom
                isCollapsed={isSidebarCollapsed}
                onOpenShortcuts={() => setIsShortcutsHelpOpen(true)}
              />
            </div>
          </aside>

          {/* Main Content Viewport Canvas */}
          <div className="flex min-w-0 flex-1 flex-col overflow-y-auto rounded-none border-0 border-zinc-200/80 bg-white shadow-none md:rounded-[24px] md:border md:shadow-2xs dark:border-zinc-800/80 dark:bg-zinc-900 print:h-auto print:overflow-visible print:border-none print:shadow-none print:p-0 print:rounded-none print:block">
            <div className="flex-1 p-3.5 pb-24 sm:p-6 md:p-7 md:pb-8 print:p-0 print:pb-0">
              {children}
            </div>
          </div>

          {/* Mobile Bottom Navigation Bar */}
          <nav className="safe-bottom fixed right-0 bottom-0 left-0 z-40 flex items-center justify-around border-t border-zinc-200/90 bg-white/95 px-2 py-1.5 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] backdrop-blur-lg dark:border-zinc-800 dark:bg-zinc-900/95 md:hidden print:hidden">
            {mobileBottomNav.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname?.startsWith(item.href);
              return (
                <Link
                  className={`flex flex-col items-center gap-1 rounded-xl px-2.5 py-1 font-semibold text-[10px] transition-all ${
                    isActive
                      ? "font-bold text-violet-600 dark:text-violet-400"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-400 dark:hover:text-zinc-200"
                  }`}
                  href={item.href}
                  key={item.href}
                >
                  <div
                    className={`rounded-lg p-1 transition-all ${
                      isActive
                        ? "bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400 shadow-2xs dark:bg-violet-950/60 dark:text-violet-400"
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
      </LabelProvider>
    </PermissionProvider>
  );
}

interface NavItem {
  badge?: string | null;
  exact?: boolean;
  href: string;
  icon: React.ElementType;
  name: string;
  permission?: string;
  tab?: string;
  moduleKey?: string;
}

function DashboardNavigation({
  onItemClick,
  isCollapsed = false,
}: {
  onItemClick?: () => void;
  isCollapsed?: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams();
  const tenantSlug = (params?.tenantSlug as string) || "";
  const currentTab = searchParams.get("tab") || "chart";

  const [closedSections, setClosedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (sectionKey: string) => {
    setClosedSections((prev) => ({
      ...prev,
      [sectionKey]: !(prev[sectionKey] ?? false),
    }));
  };

  const isSectionOpen = (sectionKey: string) => {
    return !closedSections[sectionKey];
  };

  const { getModuleDisplayName, isModuleEnabled } = useLabels();

  // 1. Genel & Satış CRM
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
      name: getModuleDisplayName("pipelines", "Pipeline & Akış"),
      permission: "Pipelines.View",
      moduleKey: "pipelines",
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
      href: `/${tenantSlug}/vehicles`,
      icon: Car,
      name: "Otomotiv & Araçlar",
      permission: "Vehicles.View",
    },
    {
      badge: null,
      href: `/${tenantSlug}/quotes`,
      icon: FileSpreadsheet,
      name: getModuleDisplayName("quotes", "Teklifler"),
      permission: "Quotes.View",
      moduleKey: "quotes",
    },
    {
      badge: null,
      href: `/${tenantSlug}/customers`,
      icon: Users2,
      name: getModuleDisplayName("customers", "Müşteriler"),
      moduleKey: "customers",
    },
    {
      badge: null,
      href: `/${tenantSlug}/orders`,
      icon: ShoppingCart,
      name: getModuleDisplayName("orders", "Siparişler"),
      moduleKey: "orders",
    },
    {
      badge: null,
      href: `/${tenantSlug}/products`,
      icon: Package,
      name: getModuleDisplayName("products", "Ürün & Hizmetler"),
      moduleKey: "products",
    },
    {
      badge: null,
      href: `/${tenantSlug}/promotions`,
      icon: Tag,
      name: getModuleDisplayName("promotions", "Kampanya & Kuponlar"),
      permission: "Promotions.View",
      moduleKey: "promotions",
    },
    {
      badge: null,
      href: `/${tenantSlug}/shipments`,
      icon: Truck,
      name: getModuleDisplayName("shipping", "Kargo & Sevkiyat"),
      permission: "Shipment.View",
      moduleKey: "shipping",
    },
  ].filter((item) => !item.moduleKey || isModuleEnabled(item.moduleKey));

  // 2. İnsan Kaynakları & Bordro
  const hrMenu: NavItem[] = [
    {
      badge: null,
      href: `/${tenantSlug}/attendance`,
      icon: Clock,
      name: getModuleDisplayName("attendance", "Vardiya & PDKS"),
      permission: "Attendance.View",
      moduleKey: "attendance",
    },
    {
      badge: null,
      href: `/${tenantSlug}/leaves`,
      icon: Calendar,
      name: getModuleDisplayName("leaves", "İzinler & Takvim"),
      permission: "Leaves.View",
      moduleKey: "leaves",
    },
    {
      badge: null,
      href: `/${tenantSlug}/payroll`,
      icon: Banknote,
      name: getModuleDisplayName("payroll", "Bordro & Maaşlar"),
      permission: "Payroll.View",
      moduleKey: "payroll",
    },
    {
      badge: null,
      href: `/${tenantSlug}/organization?tab=employees`,
      icon: UserCheck,
      name: "Çalışanlar & Kadro",
      permission: "Employees.View",
      tab: "employees",
      moduleKey: "organization",
    },
    {
      badge: null,
      href: `/${tenantSlug}/organization?tab=departments`,
      icon: Building2,
      name: "Departmanlar",
      permission: "Departments.View",
      tab: "departments",
      moduleKey: "organization",
    },
    {
      badge: null,
      href: `/${tenantSlug}/organization?tab=positions`,
      icon: Briefcase,
      name: "Pozisyonlar & Ünvanlar",
      permission: "JobPositions.Manage",
      tab: "positions",
      moduleKey: "organization",
    },
    {
      badge: null,
      href: `/${tenantSlug}/organization?tab=chart`,
      icon: Network,
      name: "Org Şeması",
      permission: "Organization.ViewChart",
      tab: "chart",
      moduleKey: "organization",
    },
    {
      badge: null,
      href: `/${tenantSlug}/compliance`,
      icon: Scale,
      name: getModuleDisplayName("compliance", "Mevzuat & İş Hukuku"),
      permission: "Compliance.View",
      moduleKey: "compliance",
    },
    {
      badge: null,
      href: `/${tenantSlug}/recruitment`,
      icon: Briefcase,
      name: "İşe Alım",
      permission: "Recruitment.View",
    },
  ].filter((item) => !item.moduleKey || isModuleEnabled(item.moduleKey));

  // 3. İletişim & Araçlar
  const toolsMenu: NavItem[] = [
    {
      badge: null,
      href: `/${tenantSlug}/tickets`,
      icon: LifeBuoy,
      name: getModuleDisplayName("tickets", "Destek Masası"),
      permission: "Tickets.View",
      moduleKey: "tickets",
    },
    {
      badge: "33",
      href: `/${tenantSlug}/messages`,
      icon: MessageSquare,
      name: getModuleDisplayName("chat", "Mesajlar"),
      moduleKey: "chat",
    },
    {
      href: `/${tenantSlug}/email`,
      icon: Mail,
      name: "E-Posta",
    },
    {
      href: `/${tenantSlug}/automations`,
      icon: Zap,
      name: getModuleDisplayName("automations", "Otomasyon"),
      permission: "Automations.View",
      moduleKey: "automations",
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

  // 4. Sistem & Yönetim
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
          className={`group relative flex h-9 w-full items-center rounded-xl border text-xs transition-all duration-200 ${
            isCollapsed ? "justify-center px-0" : "px-2.5 gap-2.5"
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
            className={`absolute top-1/2 left-1 h-4 w-1 -translate-y-1/2 rounded-full bg-violet-600 transition-opacity duration-200 dark:bg-violet-400 ${
              isActive && !isCollapsed
                ? "opacity-100"
                : "opacity-0 pointer-events-none"
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

          {/* Fluid label + badge container with smooth width/opacity transition */}
          <div
            className={`flex min-w-0 flex-1 items-center justify-between overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              isCollapsed
                ? "max-w-0 opacity-0 -translate-x-2 pointer-events-none"
                : "max-w-xs opacity-100 translate-x-0"
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

  return (
    <div className="space-y-3">
      {/* 1. GENEL & SATIŞ CRM */}
      <div>
        {!isCollapsed ? (
          <button
            className="flex w-full cursor-pointer select-none items-center justify-between px-2 py-1 font-bold text-[10px] text-zinc-400 uppercase tracking-wider transition-colors hover:text-zinc-700 dark:hover:text-zinc-300"
            onClick={() => toggleSection("sales")}
            type="button"
          >
            <span className="truncate whitespace-nowrap">Genel & Satış CRM</span>
            <ChevronDown
              className={`h-3 w-3 shrink-0 text-zinc-400 transition-transform duration-200 ${
                isSectionOpen("sales") ? "rotate-0 transform" : "-rotate-90"
              }`}
            />
          </button>
        ) : (
          <div className="my-1.5 border-t border-zinc-200/60 dark:border-zinc-800/60 mx-1.5" />
        )}

        {(isCollapsed || isSectionOpen("sales")) && (
          <div className="mt-0.5 space-y-0.5">
            {renderNavList(salesMenu)}
          </div>
        )}
      </div>

      {/* 2. İNSAN KAYNAKLARI & BORDRO */}
      <div>
        {!isCollapsed ? (
          <button
            className="flex w-full cursor-pointer select-none items-center justify-between px-2 py-1 font-bold text-[10px] text-zinc-400 uppercase tracking-wider transition-colors hover:text-zinc-700 dark:hover:text-zinc-300"
            onClick={() => toggleSection("hr")}
            type="button"
          >
            <span className="truncate whitespace-nowrap">İnsan Kaynakları & Bordro</span>
            <ChevronDown
              className={`h-3 w-3 shrink-0 text-zinc-400 transition-transform duration-200 ${
                isSectionOpen("hr") ? "rotate-0 transform" : "-rotate-90"
              }`}
            />
          </button>
        ) : (
          <div className="my-1.5 border-t border-zinc-200/60 dark:border-zinc-800/60 mx-1.5" />
        )}

        {(isCollapsed || isSectionOpen("hr")) && (
          <div className="mt-0.5 space-y-0.5">
            {renderNavList(hrMenu)}
          </div>
        )}
      </div>

      {/* 3. İLETİŞİM & ARAÇLAR */}
      <div>
        {!isCollapsed ? (
          <button
            className="flex w-full cursor-pointer select-none items-center justify-between px-2 py-1 font-bold text-[10px] text-zinc-400 uppercase tracking-wider transition-colors hover:text-zinc-700 dark:hover:text-zinc-300"
            onClick={() => toggleSection("tools")}
            type="button"
          >
            <span className="truncate whitespace-nowrap">İletişim & Araçlar</span>
            <ChevronDown
              className={`h-3 w-3 shrink-0 text-zinc-400 transition-transform duration-200 ${
                isSectionOpen("tools") ? "rotate-0 transform" : "-rotate-90"
              }`}
            />
          </button>
        ) : (
          <div className="my-1.5 border-t border-zinc-200/60 dark:border-zinc-800/60 mx-1.5" />
        )}

        {(isCollapsed || isSectionOpen("tools")) && (
          <div className="mt-0.5 space-y-0.5">
            {renderNavList(toolsMenu)}
          </div>
        )}
      </div>

      {/* 4. SİSTEM & YÖNETİM */}
      <div>
        {!isCollapsed ? (
          <button
            className="flex w-full cursor-pointer select-none items-center justify-between px-2 py-1 font-bold text-[10px] text-zinc-400 uppercase tracking-wider transition-colors hover:text-zinc-700 dark:hover:text-zinc-300"
            onClick={() => toggleSection("management")}
            type="button"
          >
            <span className="truncate whitespace-nowrap">Sistem & Yönetim</span>
            <ChevronDown
              className={`h-3 w-3 shrink-0 text-zinc-400 transition-transform duration-200 ${
                isSectionOpen("management") ? "rotate-0 transform" : "-rotate-90"
              }`}
            />
          </button>
        ) : (
          <div className="my-1.5 border-t border-zinc-200/60 dark:border-zinc-800/60 mx-1.5" />
        )}

        {(isCollapsed || isSectionOpen("management")) && (
          <div className="mt-0.5 space-y-0.5">
            {renderNavList(managementMenu)}
          </div>
        )}
      </div>
    </div>
  );
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
    <div className="space-y-2 border-t border-zinc-100 pt-2.5 dark:border-zinc-800">
      {/* Theme and Shortcuts quick bar */}
      <div
        className={`flex items-center transition-all duration-300 ${
          isCollapsed ? "justify-center" : "justify-between px-1"
        }`}
      >
        <button
          className={`flex h-8 items-center justify-center rounded-xl border border-zinc-200/80 bg-zinc-50 text-zinc-600 transition-all hover:bg-zinc-100 active:scale-95 dark:border-zinc-800 dark:bg-zinc-800/80 dark:text-zinc-300 ${
            isCollapsed ? "w-8 px-0" : "px-2.5 gap-1.5 text-[11px] font-medium"
          }`}
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          title={resolvedTheme === "dark" ? "Açık Tema" : "Koyu Tema"}
          type="button"
        >
          {resolvedTheme === "dark" ? (
            <Sun className="h-3.5 w-3.5 text-amber-400 shrink-0" />
          ) : (
            <Moon className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-400 shrink-0" />
          )}
          <span
            className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
              isCollapsed
                ? "max-w-0 opacity-0 pointer-events-none"
                : "max-w-xs opacity-100"
            }`}
          >
            {resolvedTheme === "dark" ? "Açık Tema" : "Koyu Tema"}
          </span>
        </button>

        {!isCollapsed && onOpenShortcuts && (
          <button
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:text-zinc-300 dark:hover:bg-zinc-800"
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
                ? "max-w-0 opacity-0 pointer-events-none"
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
              ? "max-w-0 opacity-0 pointer-events-none"
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
