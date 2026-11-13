/* Dashboard workspace shell — one floating card: 232px sidebar + top bar +
   scroll viewport. System: .scratch/ui-refresh-2026-11/spec.md (shell §4).
   Padding is owned by `PageContainer`; this layout only provides the shell and
   the mobile bottom-nav clearance. */
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
import { KeyboardShortcutsListener } from "@/components/layout/keyboard-shortcuts-listener";
import { MobileBottomNav, MobileDrawer } from "@/components/layout/mobile-nav";
import {
  type NavigationHub,
  getActiveHubFromPathname,
  getHubNavItems,
  getNavigationHubs,
} from "@/components/layout/nav-config";
import { Sidebar } from "@/components/layout/sidebar";
import { WorkspaceTopBar } from "@/components/layout/workspace-top-bar";
import { ShortcutsHelpModal } from "@/components/shortcuts-help-modal";
import { LabelProvider, useLabels } from "@/lib/labels/label-context";
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
  const tNav = useTranslations("navigation");
  const { getModuleDisplayName, isModuleEnabled } = useLabels();
  const navigationHubs = useMemo(() => getNavigationHubs(tHubs), [tHubs]);
  const currentHubMeta =
    navigationHubs.find((hub) => hub.id === activeHub) || navigationHubs[0]!;

  const items = useMemo(
    () =>
      getHubNavItems(
        activeHub,
        tenantSlug,
        tNav,
        getModuleDisplayName,
        isModuleEnabled
      ),
    [activeHub, getModuleDisplayName, isModuleEnabled, tenantSlug, tNav]
  );

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
      <div className="flex h-screen w-full flex-col overflow-hidden bg-background font-sans text-foreground antialiased md:p-2.5 print:m-0 print:block print:h-auto print:overflow-visible print:bg-background print:p-0">
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

        {/* One floating shell: sidebar + top bar + content */}
        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-card md:rounded-2xl md:border md:border-border md:shadow-shell print:block print:h-auto print:overflow-visible print:rounded-none print:border-0 print:shadow-none">
          <Sidebar
            activeHub={activeHub}
            collapsed={isSidebarCollapsed}
            currentHubMeta={currentHubMeta}
            hubs={navigationHubs}
            items={items}
            onOpenShortcutsHelp={handleOpenShortcutsHelp}
            onSelectHub={handleSelectHub}
            onToggleCollapse={handleToggleCollapse}
            tenantSlug={tenantSlug}
          />

          <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <WorkspaceTopBar
              collapsed={isSidebarCollapsed}
              hubName={currentHubMeta.name}
              items={items}
              onOpenCommandPalette={handleOpenCommandPalette}
              onOpenShortcutsHelp={handleOpenShortcutsHelp}
              onToggleCollapse={handleToggleCollapse}
            />

            <div className="min-h-0 flex-1 overflow-y-auto pb-24 md:pb-0 print:overflow-visible print:pb-0">
              {children}
            </div>
          </main>
        </div>

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
