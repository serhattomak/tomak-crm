"use client";

import { Toaster } from "@workspace/ui/components/sonner";
import {
  Banknote,
  BarChart3,
  Boxes,
  Briefcase,
  Building2,
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  FileSpreadsheet,
  Flame,
  HelpCircle,
  Kanban,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  MessageCircleQuestion,
  MessageSquare,
  Network,
  Package,
  Search,
  Settings,
  Shield,
  ShoppingCart,
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
import type React from "react";
import { Suspense, useEffect, useState } from "react";
import { CommandPalette } from "@/components/command-palette";
import { PermissionGate } from "@/components/permission-gate";
import { ShortcutsHelpModal } from "@/components/shortcuts-help-modal";
import { TenantSwitcher } from "@/components/tenant-switcher";
import {
  PermissionProvider,
  usePermissions,
} from "@/lib/permissions/permission-context";
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

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Close mobile drawer when pathname changes
  useEffect(() => {
    setIsMobileDrawerOpen(false);
  }, [pathname]);

  // Global Keyboard Navigation & Shortcuts Listener
  useEffect(() => {
    let keyBuffer: string[] = [];
    let bufferTimeout: NodeJS.Timeout | null = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Command Palette Toggle (⌘K / Ctrl+K)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      // 2. Shortcuts Help (? key)
      if (
        e.key === "?" &&
        !isCommandPaletteOpen &&
        !(
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement
        )
      ) {
        e.preventDefault();
        setIsShortcutsHelpOpen((prev) => !prev);
        return;
      }

      // 3. Escape closes modals
      if (e.key === "Escape") {
        if (isCommandPaletteOpen) setIsCommandPaletteOpen(false);
        if (isShortcutsHelpOpen) setIsShortcutsHelpOpen(false);
        if (isMobileDrawerOpen) setIsMobileDrawerOpen(false);
        return;
      }

      // 4. Two-key sequence shortcuts (G+H, G+P, G+Q, etc.)
      const isInput =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable;

      if (!isInput && !e.metaKey && !e.ctrlKey && !e.altKey) {
        keyBuffer.push(e.key.toLowerCase());

        if (bufferTimeout) {
          clearTimeout(bufferTimeout);
        }

        bufferTimeout = setTimeout(() => {
          keyBuffer = [];
        }, 1000);

        const seq = keyBuffer.join("");

        if (seq === "gh") {
          e.preventDefault();
          router.push(`/${tenantSlug}`);
          keyBuffer = [];
        } else if (seq === "gp") {
          e.preventDefault();
          router.push(`/${tenantSlug}/pipelines`);
          keyBuffer = [];
        } else if (seq === "gq") {
          e.preventDefault();
          router.push(`/${tenantSlug}/quotes`);
          keyBuffer = [];
        } else if (seq === "gc") {
          e.preventDefault();
          router.push(`/${tenantSlug}/customers`);
          keyBuffer = [];
        } else if (seq === "go") {
          e.preventDefault();
          router.push(`/${tenantSlug}/orders`);
          keyBuffer = [];
        } else if (seq === "gt") {
          e.preventDefault();
          router.push(`/${tenantSlug}/attendance`);
          keyBuffer = [];
        } else if (seq === "gl") {
          e.preventDefault();
          router.push(`/${tenantSlug}/leaves`);
          keyBuffer = [];
        } else if (seq === "gs") {
          e.preventDefault();
          router.push(`/${tenantSlug}/settings`);
          keyBuffer = [];
        } else if (seq === "nc") {
          e.preventDefault();
          router.push(`/${tenantSlug}/customers?create=true`);
          keyBuffer = [];
        } else if (seq === "nq") {
          e.preventDefault();
          router.push(`/${tenantSlug}/quotes?create=true`);
          keyBuffer = [];
        } else if (seq === "nd") {
          e.preventDefault();
          router.push(`/${tenantSlug}/pipelines?create=true`);
          keyBuffer = [];
        } else if (seq === "nl") {
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
  }, [router, tenantSlug, isCommandPaletteOpen, isShortcutsHelpOpen, isMobileDrawerOpen]);

  // Bottom navigation items on mobile
  const mobileBottomNav = [
    { href: `/${tenantSlug}`, icon: LayoutDashboard, label: "Anasayfa", exact: true },
    { href: `/${tenantSlug}/pipelines`, icon: Kanban, label: "Fırsatlar" },
    { href: `/${tenantSlug}/quotes`, icon: FileSpreadsheet, label: "Teklifler" },
    { href: `/${tenantSlug}/customers`, icon: Users2, label: "Müşteriler" },
  ];

  return (
    <PermissionProvider initialTenantSlug={tenantSlug}>
      <Toaster position="top-right" richColors />
      <div className="flex h-screen w-full flex-col md:flex-row gap-0 md:gap-3 overflow-hidden bg-[#f4f5f8] md:p-3 font-sans text-slate-900 antialiased">
        {/* Mobile Top Header Bar */}
        <header className="flex md:hidden items-center justify-between px-3 py-2.5 bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-2xs">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition active:scale-95 shadow-2xs"
              title="Menüyü Aç"
              type="button"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <TenantSwitcher />
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition active:scale-95"
              title="Arama (⌘K)"
              type="button"
            >
              <Search className="h-4.5 w-4.5" />
            </button>
          </div>
        </header>

        {/* Mobile Off-Canvas Sliding Drawer / Sheet */}
        {isMobileDrawerOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm animate-in fade-in transition-opacity"
              onClick={() => setIsMobileDrawerOpen(false)}
            />

            {/* Drawer Content */}
            <div className="relative flex w-4/5 max-w-xs flex-1 flex-col justify-between overflow-y-auto bg-white p-4 shadow-2xl animate-in slide-in-from-left duration-200 z-10">
              <div className="space-y-4">
                {/* Header & Close */}
                <div className="flex items-center justify-between border-slate-100 border-b pb-3">
                  <TenantSwitcher />
                  <button
                    onClick={() => setIsMobileDrawerOpen(false)}
                    className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                    type="button"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Quick Search */}
                <button
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200/90 bg-slate-50/90 py-2 pr-2.5 pl-3 text-slate-500 text-xs shadow-2xs"
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    setIsCommandPaletteOpen(true);
                  }}
                  type="button"
                >
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-slate-400" />
                    <span className="font-medium text-slate-400">Hızlı Arama (⌘K)...</span>
                  </div>
                </button>

                {/* Full Menus */}
                <DashboardNavigation onItemClick={() => setIsMobileDrawerOpen(false)} />
              </div>

              {/* User Account / Signout */}
              <div className="pt-4">
                <DashboardBottom />
              </div>
            </div>
          </div>
        )}

        {/* Desktop Left Floating Sidebar */}
        <aside className="hidden md:flex w-64 shrink-0 flex-col justify-between overflow-y-auto rounded-[28px] border border-slate-200/80 bg-white p-3.5 shadow-sm">
          <div className="space-y-4">
            {/* Workspace Switcher Header */}
            <div className="flex items-center justify-between gap-2">
              <TenantSwitcher />
            </div>

            {/* Interactive Search Bar Trigger */}
            <button
              className="group relative flex w-full items-center justify-between rounded-xl border border-slate-200/90 bg-slate-50/90 py-2 pr-2.5 pl-3 text-slate-500 text-xs shadow-2xs transition-all hover:border-blue-300 hover:bg-white hover:text-slate-800 hover:shadow-xs focus:outline-none"
              onClick={() => setIsCommandPaletteOpen(true)}
              type="button"
            >
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-slate-400 transition-colors group-hover:text-blue-600" />
                <span className="font-medium text-slate-400 transition-colors group-hover:text-slate-600">
                  Hızlı Arama & Komutlar...
                </span>
              </div>
              <div className="flex items-center gap-0.5 rounded-md border border-slate-200/80 bg-white px-1.5 py-0.5 font-bold text-[10px] text-slate-400 shadow-2xs transition-colors group-hover:border-blue-200 group-hover:text-blue-600">
                <span>⌘</span>
                <span>K</span>
              </div>
            </button>

            {/* Navigation Menus */}
            <Suspense
              fallback={
                <div className="h-48 animate-pulse rounded-2xl bg-slate-5" />
              }
            >
              <DashboardNavigation />
            </Suspense>
          </div>

          {/* Bottom User Profile */}
          <DashboardBottom />
        </aside>

        {/* Main Content Viewport */}
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto rounded-none md:rounded-[28px] border-0 md:border border-slate-200/80 bg-white shadow-none md:shadow-sm">
          <div className="flex-1 p-3.5 sm:p-6 md:p-8 pb-24 md:pb-8">{children}</div>
        </div>

        {/* Mobile Bottom Navigation Bar */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden items-center justify-around border-t border-slate-200/90 bg-white/95 backdrop-blur-lg px-2 py-1.5 shadow-[0_-4px_16px_rgba(0,0,0,0.05)] safe-bottom">
          {mobileBottomNav.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 rounded-xl px-2.5 py-1 text-[10px] font-semibold transition-all ${
                  isActive
                    ? "text-blue-600 font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <div className={`p-1 rounded-lg transition-all ${isActive ? "bg-blue-50 text-blue-600 shadow-2xs" : ""}`}>
                  <item.icon className="h-4 w-4" />
                </div>
                <span>{item.label}</span>
              </Link>
            );
          })}
          {/* Menu Drawer Opener */}
          <button
            onClick={() => setIsMobileDrawerOpen(true)}
            className="flex flex-col items-center gap-1 rounded-xl px-2.5 py-1 text-[10px] font-semibold text-slate-500 hover:text-slate-800 transition-all"
            type="button"
          >
            <div className="p-1 rounded-lg">
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
    </PermissionProvider>
  );
}

interface NavItem {
  name: string;
  href: string;
  icon: any;
  badge?: string | null;
  exact?: boolean;
  permission?: string;
  tab?: string;
}

function DashboardNavigation({
  onItemClick,
}: {
  onItemClick?: () => void;
} = {}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams();
  const tenantSlug = (params?.tenantSlug as string) || "";
  const currentTab = searchParams.get("tab") || "chart";

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    hr: true,
    management: true,
    sales: true,
    tools: true,
  });

  // Ensure the section containing the active page is always open
  useEffect(() => {
    if (!pathname) {
      return;
    }

    if (
      pathname === `/${tenantSlug}` ||
      pathname.startsWith(`/${tenantSlug}/customers`) ||
      pathname.startsWith(`/${tenantSlug}/orders`) ||
      pathname.startsWith(`/${tenantSlug}/products`) ||
      pathname.startsWith(`/${tenantSlug}/shipments`)
    ) {
      setOpenSections((prev) => ({ ...prev, sales: true }));
    } else if (
      pathname.startsWith(`/${tenantSlug}/attendance`) ||
      pathname.startsWith(`/${tenantSlug}/leaves`) ||
      pathname.startsWith(`/${tenantSlug}/payroll`) ||
      pathname.startsWith(`/${tenantSlug}/organization`)
    ) {
      setOpenSections((prev) => ({ ...prev, hr: true }));
    } else if (
      pathname.startsWith(`/${tenantSlug}/messages`) ||
      pathname.startsWith(`/${tenantSlug}/email`) ||
      pathname.startsWith(`/${tenantSlug}/automation`) ||
      pathname.startsWith(`/${tenantSlug}/analytics`) ||
      pathname.startsWith(`/${tenantSlug}/integration`)
    ) {
      setOpenSections((prev) => ({ ...prev, tools: true }));
    } else if (
      pathname.startsWith(`/${tenantSlug}/users`) ||
      pathname.startsWith(`/${tenantSlug}/roles`) ||
      pathname.startsWith(`/${tenantSlug}/settings`)
    ) {
      setOpenSections((prev) => ({ ...prev, management: true }));
    }
  }, [pathname, tenantSlug]);

  const toggleSection = (sectionKey: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

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
      name: "Pipeline & Akış",
      permission: "Pipelines.View",
    },
    {
      badge: null,
      href: `/${tenantSlug}/quotes`,
      icon: FileSpreadsheet,
      name: "Teklifler",
      permission: "Quotes.View",
    },
    {
      badge: null,
      href: `/${tenantSlug}/customers`,
      icon: Users2,
      name: "Müşteriler",
    },
    {
      badge: null,
      href: `/${tenantSlug}/orders`,
      icon: ShoppingCart,
      name: "Siparişler",
    },
    {
      badge: null,
      href: `/${tenantSlug}/products`,
      icon: Package,
      name: "Ürün & Hizmetler",
    },
    {
      badge: null,
      href: `/${tenantSlug}/shipments`,
      icon: Truck,
      name: "Kargo & Sevkiyat",
      permission: "Shipment.View",
    },
  ];

  // 2. İnsan Kaynakları & Bordro
  const hrMenu: NavItem[] = [
    {
      badge: null,
      href: `/${tenantSlug}/attendance`,
      icon: Clock,
      name: "Vardiya & PDKS",
      permission: "Attendance.View",
    },
    {
      badge: null,
      href: `/${tenantSlug}/leaves`,
      icon: Calendar,
      name: "İzinler & Takvim",
      permission: "Leaves.View",
    },
    {
      badge: null,
      href: `/${tenantSlug}/payroll`,
      icon: Banknote,
      name: "Bordro & Maaşlar",
      permission: "Payroll.View",
    },
    {
      badge: null,
      href: `/${tenantSlug}/organization?tab=employees`,
      icon: UserCheck,
      name: "Çalışanlar & Kadro",
      permission: "Employees.View",
      tab: "employees",
    },
    {
      badge: null,
      href: `/${tenantSlug}/organization?tab=departments`,
      icon: Building2,
      name: "Departmanlar",
      permission: "Departments.View",
      tab: "departments",
    },
    {
      badge: null,
      href: `/${tenantSlug}/organization?tab=positions`,
      icon: Briefcase,
      name: "Pozisyonlar & Ünvanlar",
      permission: "JobPositions.Manage",
      tab: "positions",
    },
    {
      badge: null,
      href: `/${tenantSlug}/organization?tab=chart`,
      icon: Network,
      name: "Org Şeması",
      permission: "Organization.ViewChart",
      tab: "chart",
    },
  ];

  // 3. İletişim & Araçlar
  const toolsMenu: NavItem[] = [
    {
      badge: "33",
      href: `/${tenantSlug}/messages`,
      icon: MessageSquare,
      name: "Mesajlar",
    },
    {
      href: `/${tenantSlug}/email`,
      icon: Mail,
      name: "E-Posta",
    },
    {
      href: `/${tenantSlug}/automation`,
      icon: Zap,
      name: "Otomasyon",
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
  ];

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

  return (
    <div className="space-y-4">
      {/* 1. GENEL & SATIŞ CRM */}
      <div>
        <button
          className="flex w-full cursor-pointer select-none items-center justify-between px-3 py-1.5 font-bold text-[11px] text-slate-400 uppercase tracking-wider transition-colors hover:text-slate-700 dark:text-muted-foreground dark:hover:text-foreground"
          onClick={() => toggleSection("sales")}
          type="button"
        >
          <span>Genel & Satış CRM</span>
          <ChevronDown
            className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
              openSections.sales ? "rotate-0 transform" : "-rotate-90"
            }`}
          />
        </button>

        {openSections.sales && (
          <div className="mt-1 space-y-1">
            {salesMenu.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname?.startsWith(item.href);

              return (
                <Link
                  className={`group relative flex items-center justify-between rounded-2xl px-3 py-2 text-xs transition-all duration-200 ${
                    isActive
                      ? "bg-white font-bold text-blue-700 shadow-[0_3px_10px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] border border-slate-200/90 ring-1 ring-black/[0.02] translate-y-[-0.5px]"
                      : "font-medium text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
                  }`}
                  href={item.href}
                  key={item.name}
                  onClick={onItemClick}
                  prefetch={false}
                >
                  {isActive && (
                    <span className="absolute left-1 top-1/2 -translate-y-1/2 h-4 w-1 rounded-full bg-blue-600 shadow-blue-500/50 shadow-xs" />
                  )}
                  <div className="flex items-center gap-2.5 pl-1.5">
                    <item.icon
                      className={`h-4 w-4 transition-colors ${
                        isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                      }`}
                    />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`rounded-full px-2 py-0.5 font-bold text-[10px] ${
                        isActive
                          ? "bg-blue-100 text-blue-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. İNSAN KAYNAKLARI & BORDRO */}
      <div>
        <button
          className="flex w-full cursor-pointer select-none items-center justify-between px-3 py-1.5 font-bold text-[11px] text-slate-400 uppercase tracking-wider transition-colors hover:text-slate-700 dark:text-muted-foreground dark:hover:text-foreground"
          onClick={() => toggleSection("hr")}
          type="button"
        >
          <span>İnsan Kaynakları & Bordro</span>
          <ChevronDown
            className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
              openSections.hr ? "rotate-0 transform" : "-rotate-90"
            }`}
          />
        </button>

        {openSections.hr && (
          <div className="mt-1 space-y-1">
            {hrMenu.map((item) => {
              const isOrgPage = pathname === `/${tenantSlug}/organization`;
              const isActive = item.tab
                ? isOrgPage && currentTab === item.tab
                : pathname === item.href ||
                  pathname?.startsWith(`${item.href}/`);

              const linkContent = (
                <Link
                  className={`group relative flex items-center justify-between rounded-2xl px-3 py-2 text-xs transition-all duration-200 ${
                    isActive
                      ? "bg-white font-bold text-blue-700 shadow-[0_3px_10px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] border border-slate-200/90 ring-1 ring-black/[0.02] translate-y-[-0.5px]"
                      : "font-medium text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
                  }`}
                  href={item.href}
                  key={item.name}
                  onClick={onItemClick}
                  prefetch={false}
                >
                  {isActive && (
                    <span className="absolute left-1 top-1/2 -translate-y-1/2 h-4 w-1 rounded-full bg-blue-600 shadow-blue-500/50 shadow-xs" />
                  )}
                  <div className="flex items-center gap-2.5 pl-1.5">
                    <item.icon
                      className={`h-4 w-4 transition-colors ${
                        isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                      }`}
                    />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`rounded-full px-2 py-0.5 font-bold text-[10px] ${
                        isActive
                          ? "bg-blue-100 text-blue-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
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
            })}
          </div>
        )}
      </div>

      {/* 3. İLETİŞİM & ARAÇLAR */}
      <div>
        <button
          className="flex w-full cursor-pointer select-none items-center justify-between px-3 py-1.5 font-bold text-[11px] text-slate-400 uppercase tracking-wider transition-colors hover:text-slate-700 dark:text-muted-foreground dark:hover:text-foreground"
          onClick={() => toggleSection("tools")}
          type="button"
        >
          <span>İletişim & Araçlar</span>
          <ChevronDown
            className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
              openSections.tools ? "rotate-0 transform" : "-rotate-90"
            }`}
          />
        </button>

        {openSections.tools && (
          <div className="mt-1 space-y-1">
            {toolsMenu.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link
                  className={`group relative flex items-center justify-between rounded-2xl px-3 py-2 text-xs transition-all duration-200 ${
                    isActive
                      ? "bg-white font-bold text-blue-700 shadow-[0_3px_10px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] border border-slate-200/90 ring-1 ring-black/[0.02] translate-y-[-0.5px]"
                      : "font-medium text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
                  }`}
                  href={item.href}
                  key={item.name}
                  onClick={onItemClick}
                  prefetch={false}
                >
                  {isActive && (
                    <span className="absolute left-1 top-1/2 -translate-y-1/2 h-4 w-1 rounded-full bg-blue-600 shadow-blue-500/50 shadow-xs" />
                  )}
                  <div className="flex items-center gap-2.5 pl-1.5">
                    <item.icon
                      className={`h-4 w-4 transition-colors ${
                        isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                      }`}
                    />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`rounded-full px-2 py-0.5 font-bold text-[10px] ${
                        isActive
                          ? "bg-blue-100 text-blue-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. SİSTEM & YÖNETİM */}
      <div>
        <button
          className="flex w-full cursor-pointer select-none items-center justify-between px-3 py-1.5 font-bold text-[11px] text-slate-400 uppercase tracking-wider transition-colors hover:text-slate-700 dark:text-muted-foreground dark:hover:text-foreground"
          onClick={() => toggleSection("management")}
          type="button"
        >
          <span>Sistem & Yönetim</span>
          <ChevronDown
            className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
              openSections.management ? "rotate-0 transform" : "-rotate-90"
            }`}
          />
        </button>

        {openSections.management && (
          <div className="mt-1 space-y-1">
            {managementMenu.map((item) => {
              const isActive = pathname === item.href;

              const linkContent = (
                <Link
                  className={`group relative flex items-center justify-between rounded-2xl px-3 py-2 text-xs transition-all duration-200 ${
                    isActive
                      ? "bg-white font-bold text-blue-700 shadow-[0_3px_10px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] border border-slate-200/90 ring-1 ring-black/[0.02] translate-y-[-0.5px]"
                      : "font-medium text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
                  }`}
                  href={item.href}
                  key={item.name}
                  onClick={onItemClick}
                  prefetch={false}
                >
                  {isActive && (
                    <span className="absolute left-1 top-1/2 -translate-y-1/2 h-4 w-1 rounded-full bg-blue-600 shadow-blue-500/50 shadow-xs" />
                  )}
                  <div className="flex items-center gap-2.5 pl-1.5">
                    <item.icon
                      className={`h-4 w-4 transition-colors ${
                        isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                      }`}
                    />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`rounded-full px-2 py-0.5 font-bold text-[10px] ${
                        isActive
                          ? "bg-blue-100 text-blue-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
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
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function DashboardBottom() {
  const router = useRouter();
  const params = useParams();
  const tenantSlug = (params?.tenantSlug as string) || "";
  const { profile, activeTenant } = usePermissions();

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
    <div className="space-y-3 border-slate-100 border-t pt-3">
      {/* User Profile & Account Card */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/80 p-2.5 shadow-2xs transition-all hover:bg-slate-100/70 hover:border-slate-300">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 font-bold text-xs text-white shadow-2xs">
            {userInitials}
          </div>
          <div className="min-w-0 truncate">
            <div className="font-bold text-xs text-slate-900 truncate">
              {profile?.fullName || "Serhat Dev"}
            </div>
            <div className="text-[10px] text-slate-500 font-medium truncate">
              {activeTenant?.name || "Ana Çalışma Alanı"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-0.5 flex-none">
          <Link
            href={`/${tenantSlug || "workspace"}/settings`}
            title="Şirket & Hesap Ayarları"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-800 hover:shadow-2xs transition"
          >
            <Settings className="h-4 w-4" />
          </Link>
          <button
            onClick={handleLogout}
            title="Güvenli Çıkış Yap"
            type="button"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Help & Feedback Footer Links */}
      <div className="flex items-center justify-between px-2 text-[11px] font-medium text-slate-400">
        <Link
          className="flex items-center gap-1 transition-colors hover:text-slate-700"
          href="#help"
        >
          <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
          <span>Yardım</span>
        </Link>
        <span className="text-slate-300">•</span>
        <Link
          className="flex items-center gap-1 transition-colors hover:text-slate-700"
          href="#feedback"
        >
          <MessageCircleQuestion className="h-3.5 w-3.5 text-slate-400" />
          <span>Geri Bildirim</span>
        </Link>
      </div>
    </div>
  );
}
