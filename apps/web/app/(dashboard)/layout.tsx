/* Dashboard workspace shell — dual-rail navigation + canonical content viewport.
   Padding is owned by `PageContainer`; this layout provides the scroll viewport
   and the mobile bottom-nav clearance only. System: docs/crm-ui-standards.md (ADR-0004). */
"use client";

import { Toaster } from "@workspace/ui/components/sonner";
import { useParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import type React from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { CommandPalette } from "@/components/command-palette";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { HubRail } from "@/components/layout/hub-rail";
import { KeyboardShortcutsListener } from "@/components/layout/keyboard-shortcuts-listener";
import { MobileBottomNav, MobileDrawer } from "@/components/layout/mobile-nav";
import {
  type NavigationHub,
  getActiveHubFromPathname,
  getNavigationHubs,
} from "@/components/layout/nav-config";
import { SubNavRail } from "@/components/layout/sub-nav-rail";
import { ShortcutsHelpModal } from "@/components/shortcuts-help-modal";
import { LabelProvider } from "@/lib/labels/label-context";
import { RealtimeNotificationProvider } from "@/lib/notifications/realtime-notification-context";
import { PermissionProvider } from "@/lib/permissions/permission-context";

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
  const pathname = usePathname();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const [activeHub, setActiveHub] = useState<NavigationHub>(() =>
    getActiveHubFromPathname(pathname || "", tenantSlug)
  );

  // Restore sidebar state from local storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("crm_sidebar_collapsed");
      if (saved !== null) {
        setIsSidebarCollapsed(saved === "true");
      }
    } catch {
      // ignore
    }
  }, []);

  const setSidebarCollapsedState = useCallback((collapsed: boolean) => {
    setIsSidebarCollapsed(collapsed);
    try {
      localStorage.setItem("crm_sidebar_collapsed", String(collapsed));
    } catch {
      // ignore
    }
  }, []);

  // Sync activeHub with current route changes
  useEffect(() => {
    const detected = getActiveHubFromPathname(pathname || "", tenantSlug);
    setActiveHub(detected);
  }, [pathname, tenantSlug]);

  const tHubs = useTranslations("hubs");
  const navigationHubs = useMemo(() => getNavigationHubs(tHubs), [tHubs]);
  const currentHubMeta =
    navigationHubs.find((h) => h.id === activeHub) || navigationHubs[0]!;

  const handleOpenCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen(true);
  }, []);

  const handleCloseCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen(false);
  }, []);

  const handleOpenShortcutsHelp = useCallback(() => {
    setIsShortcutsHelpOpen(true);
  }, []);

  const handleCloseShortcutsHelp = useCallback(() => {
    setIsShortcutsHelpOpen(false);
  }, []);

  const handleOpenMobileDrawer = useCallback(() => {
    setIsMobileDrawerOpen(true);
  }, []);

  const handleCloseMobileDrawer = useCallback(() => {
    setIsMobileDrawerOpen(false);
  }, []);

  const handleExpandSidebar = useCallback(() => {
    setSidebarCollapsedState(false);
  }, [setSidebarCollapsedState]);

  const handleToggleCollapse = useCallback(() => {
    setSidebarCollapsedState(!isSidebarCollapsed);
  }, [isSidebarCollapsed, setSidebarCollapsedState]);

  const handleSelectHub = useCallback(
    (hub: NavigationHub) => {
      setActiveHub(hub);
      if (isSidebarCollapsed) {
        setSidebarCollapsedState(false);
      }
    },
    [isSidebarCollapsed, setSidebarCollapsedState]
  );

  return (
    <RealtimeNotificationProvider tenantSlug={tenantSlug}>
      <div className="flex h-screen w-full flex-col overflow-hidden bg-muted/40 font-sans text-foreground antialiased md:flex-row md:gap-3 md:p-3 print:m-0 print:block print:h-auto print:overflow-visible print:bg-background print:p-0">
        {/* Mobile Header Bar */}
        <DashboardHeader
          mounted={mounted}
          onOpenCommandPalette={handleOpenCommandPalette}
          onOpenMobileDrawer={handleOpenMobileDrawer}
        />

        {/* Mobile Drawer (Left Sheet) */}
        <MobileDrawer
          activeHub={activeHub}
          hubs={navigationHubs}
          isOpen={isMobileDrawerOpen}
          onClose={handleCloseMobileDrawer}
          onOpenCommandPalette={handleOpenCommandPalette}
          onSelectHub={handleSelectHub}
          tenantSlug={tenantSlug}
        />

        {/* Desktop Left Collapsible Dual-Rail Workspace Navigation */}
        <aside className="relative z-30 hidden shrink-0 rounded-lg border border-border/80 bg-card shadow-2xs md:flex print:hidden">
          {/* Primary Left Hub Rail (w-16 / 64px) */}
          <HubRail
            activeHub={activeHub}
            hubs={navigationHubs}
            isSidebarCollapsed={isSidebarCollapsed}
            mounted={mounted}
            onExpandSidebar={handleExpandSidebar}
            onSelectHub={handleSelectHub}
            tenantSlug={tenantSlug}
          />

          {/* Secondary Sub-Navigation Rail (Collapsible) */}
          <SubNavRail
            activeHub={activeHub}
            currentHubMeta={currentHubMeta}
            isSidebarCollapsed={isSidebarCollapsed}
            onOpenCommandPalette={handleOpenCommandPalette}
            onOpenShortcutsHelp={handleOpenShortcutsHelp}
            onToggleCollapse={handleToggleCollapse}
            tenantSlug={tenantSlug}
          />
        </aside>

        {/* Main Content Viewport Canvas */}
        <main className="flex min-w-0 flex-1 flex-col overflow-y-auto rounded-none border-0 border-border/80 bg-card shadow-none md:rounded-lg md:border md:shadow-2xs print:block print:h-auto print:overflow-visible print:rounded-none print:border-none print:p-0 print:shadow-none">
          <div className="flex-1 pb-24 md:pb-0 print:p-0">{children}</div>
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav
          onOpenDrawer={handleOpenMobileDrawer}
          tenantSlug={tenantSlug}
        />
      </div>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={handleCloseCommandPalette}
        onOpenShortcutsHelp={handleOpenShortcutsHelp}
      />

      {/* Keyboard Shortcuts Cheat Sheet Modal */}
      <ShortcutsHelpModal
        isOpen={isShortcutsHelpOpen}
        onClose={handleCloseShortcutsHelp}
      />

      {/* Global Keyboard Navigation Listener */}
      <KeyboardShortcutsListener
        isCommandPaletteOpen={isCommandPaletteOpen}
        isMobileDrawerOpen={isMobileDrawerOpen}
        isShortcutsHelpOpen={isShortcutsHelpOpen}
        setIsCommandPaletteOpen={setIsCommandPaletteOpen}
        setIsMobileDrawerOpen={setIsMobileDrawerOpen}
        setIsShortcutsHelpOpen={setIsShortcutsHelpOpen}
        tenantSlug={tenantSlug}
      />
    </RealtimeNotificationProvider>
  );
}
