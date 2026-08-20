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
  Flame,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Mail,
  MessageCircleQuestion,
  MessageSquare,
  Network,
  Package,
  Search,
  Settings,
  Shield,
  ShoppingCart,
  UserCheck,
  Users,
  Users2,
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
import { PermissionProvider } from "@/lib/permissions/permission-context";
import { createClient } from "@/lib/supabase/client";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const params = useParams();
  const tenantSlug = (params?.tenantSlug as string) || "";

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false);

  // Global Keyboard Navigation & Shortcuts Listener
  useEffect(() => {
    let keyBuffer: string[] = [];
    let bufferTimeout: NodeJS.Timeout | null = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Command Palette: Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      // Check if user is actively typing in an editable field
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;

      if (isInput) {
        return;
      }

      // 2. Slash (/) to focus Command Palette
      if (e.key === "/" && !isCommandPaletteOpen && !isShortcutsHelpOpen) {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
        return;
      }

      // 3. Question mark (?) to toggle Shortcuts Help Modal
      if (e.key === "?" && !isCommandPaletteOpen) {
        e.preventDefault();
        setIsShortcutsHelpOpen((prev) => !prev);
        return;
      }

      // 4. Sequence Shortcuts (e.g. G then D, G then M, N then M)
      const key = e.key.toLowerCase();
      if (key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        keyBuffer.push(key);

        if (bufferTimeout) {
          clearTimeout(bufferTimeout);
        }
        bufferTimeout = setTimeout(() => {
          keyBuffer = [];
        }, 800);

        const seq = keyBuffer.join("");

        // Navigation Sequence (g + key)
        if (seq === "gd") {
          e.preventDefault();
          router.push(`/${tenantSlug}`);
          keyBuffer = [];
        } else if (seq === "gm") {
          e.preventDefault();
          router.push(`/${tenantSlug}/customers`);
          keyBuffer = [];
        } else if (seq === "gs") {
          e.preventDefault();
          router.push(`/${tenantSlug}/orders`);
          keyBuffer = [];
        } else if (seq === "gu") {
          e.preventDefault();
          router.push(`/${tenantSlug}/products`);
          keyBuffer = [];
        } else if (seq === "gi") {
          e.preventDefault();
          router.push(`/${tenantSlug}/leaves`);
          keyBuffer = [];
        } else if (seq === "gb") {
          e.preventDefault();
          router.push(`/${tenantSlug}/payroll`);
          keyBuffer = [];
        } else if (seq === "gv") {
          e.preventDefault();
          router.push(`/${tenantSlug}/attendance`);
          keyBuffer = [];
        } else if (seq === "go") {
          e.preventDefault();
          router.push(`/${tenantSlug}/organization`);
          keyBuffer = [];
        } else if (seq === "ga") {
          e.preventDefault();
          router.push(`/${tenantSlug}/settings`);
          keyBuffer = [];
        }
        // Creation Sequence (n + key)
        else if (seq === "nm") {
          e.preventDefault();
          router.push(`/${tenantSlug}/customers?create=true`);
          keyBuffer = [];
        } else if (seq === "ns") {
          e.preventDefault();
          router.push(`/${tenantSlug}/orders?create=true`);
          keyBuffer = [];
        } else if (seq === "ni") {
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
  }, [router, tenantSlug, isCommandPaletteOpen, isShortcutsHelpOpen]);

  return (
    <PermissionProvider initialTenantSlug={tenantSlug}>
      <Toaster position="top-right" richColors />
      <div className="flex h-screen gap-3 overflow-hidden bg-[#f4f5f8] p-2 font-sans text-slate-900 antialiased sm:p-3">
        {/* Left Floating Sidebar */}
        <aside className="flex w-64 shrink-0 flex-col justify-between overflow-y-auto rounded-[28px] border border-slate-200/80 bg-white p-3.5 shadow-sm">
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
                <div className="h-48 animate-pulse rounded-2xl bg-slate-50" />
              }
            >
              <DashboardNavigation />
            </Suspense>
          </div>

          {/* Bottom Sidebar Actions & Upgrade Card */}
          <DashboardBottom />
        </aside>

        {/* Main Content Viewport */}
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto rounded-[28px] border border-slate-200/80 bg-white shadow-sm">
          <div className="flex-1 p-6 md:p-8">{children}</div>
        </div>
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

function DashboardNavigation() {
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
      pathname.startsWith(`/${tenantSlug}/products`)
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
  const salesMenu = [
    {
      exact: true,
      href: `/${tenantSlug}`,
      icon: LayoutDashboard,
      name: "Dashboard",
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
  ];

  // 2. İnsan Kaynakları & Bordro
  const hrMenu = [
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
  const toolsMenu = [
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
  const managementMenu = [
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
          <div className="mt-1 space-y-0.5">
            {salesMenu.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname?.startsWith(item.href);

              return (
                <Link
                  className={`flex items-center justify-between rounded-xl px-3 py-2 font-medium text-xs transition-all ${
                    isActive
                      ? "bg-blue-50 font-semibold text-blue-600 shadow-2xs dark:bg-blue-950/60 dark:text-blue-400"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-muted/40 dark:hover:text-foreground"
                  }`}
                  href={item.href}
                  key={item.name}
                  prefetch={false}
                >
                  <div className="flex items-center gap-2.5">
                    <item.icon
                      className={`h-4 w-4 ${isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500"}`}
                    />
                    <span>{item.name}</span>
                  </div>
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
          <div className="mt-1 space-y-0.5">
            {hrMenu.map((item) => {
              const isOrgPage = pathname === `/${tenantSlug}/organization`;
              const isActive = item.tab
                ? isOrgPage && currentTab === item.tab
                : pathname === item.href ||
                  pathname?.startsWith(`${item.href}/`);

              const linkContent = (
                <Link
                  className={`flex items-center justify-between rounded-xl px-3 py-2 font-medium text-xs transition-all ${
                    isActive
                      ? "bg-blue-50 font-semibold text-blue-600 shadow-2xs dark:bg-blue-950/60 dark:text-blue-400"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-muted/40 dark:hover:text-foreground"
                  }`}
                  href={item.href}
                  key={item.name}
                  prefetch={false}
                >
                  <div className="flex items-center gap-2.5">
                    <item.icon
                      className={`h-4 w-4 ${isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500"}`}
                    />
                    <span>{item.name}</span>
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
          <div className="mt-1 space-y-0.5">
            {toolsMenu.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link
                  className={`flex items-center justify-between rounded-xl px-3 py-2 font-medium text-xs transition-all ${
                    isActive
                      ? "bg-blue-50 font-semibold text-blue-600 shadow-2xs dark:bg-blue-950/60 dark:text-blue-400"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-muted/40 dark:hover:text-foreground"
                  }`}
                  href={item.href}
                  key={item.name}
                  prefetch={false}
                >
                  <div className="flex items-center gap-2.5">
                    <item.icon
                      className={`h-4 w-4 ${isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500"}`}
                    />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 font-bold text-[10px] text-slate-600 dark:bg-muted dark:text-slate-300">
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
          <div className="mt-1 space-y-0.5">
            {managementMenu.map((item) => {
              const isActive = pathname === item.href;

              const linkContent = (
                <Link
                  className={`flex items-center justify-between rounded-xl px-3 py-2 font-medium text-xs transition-all ${
                    isActive
                      ? "bg-blue-50 font-semibold text-blue-600 shadow-2xs dark:bg-blue-950/60 dark:text-blue-400"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-muted/40 dark:hover:text-foreground"
                  }`}
                  href={item.href}
                  key={item.name}
                  prefetch={false}
                >
                  <div className="flex items-center gap-2.5">
                    <item.icon
                      className={`h-4 w-4 ${isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500"}`}
                    />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 font-bold text-[10px] text-slate-600 dark:bg-muted dark:text-slate-300">
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

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="space-y-2 border-slate-100 border-t pt-4">
      <div className="space-y-0.5 font-medium text-slate-600 text-xs">
        <Link
          className="flex items-center gap-2.5 rounded-xl px-3 py-1.5 transition-colors hover:bg-slate-50"
          href="#help"
        >
          <HelpCircle className="h-4 w-4 text-slate-400" />
          Help center
        </Link>
        <Link
          className="flex items-center gap-2.5 rounded-xl px-3 py-1.5 transition-colors hover:bg-slate-50"
          href="#feedback"
        >
          <MessageCircleQuestion className="h-4 w-4 text-slate-400" />
          Feedback
        </Link>
        <button
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-1.5 text-left text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 text-slate-400 group-hover:text-red-500" />
          Sign Out
        </button>
      </div>

      {/* Upgrade & Unlock features Card */}
      <div className="group flex cursor-pointer items-center justify-between rounded-2xl border border-fuchsia-200/60 bg-gradient-to-r from-fuchsia-500/10 via-purple-500/10 to-cyan-500/10 p-3 transition-all hover:border-fuchsia-300">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 via-purple-600 to-cyan-500 text-white shadow-fuchsia-500/30 shadow-sm">
            <Flame className="h-4 w-4" />
          </div>
          <div>
            <div className="font-bold text-[11px] text-slate-900 leading-tight">
              Upgrade & unlock
            </div>
            <div className="text-[10px] text-slate-500">all features</div>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-slate-400 transition-all group-hover:translate-x-0.5 group-hover:text-fuchsia-600" />
      </div>
    </div>
  );
}
