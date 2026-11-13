"use client";

import { PageContainer } from "@workspace/ui/components/page-container";
import { CheckCircle2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { InviteMemberModal } from "@/components/team-members-stack";
import { usePermissions } from "@/lib/permissions/permission-context";
import { DashboardHeader } from "./_components/dashboard-header";
import { DashboardTabsBar } from "./_components/dashboard-tabs-bar";
import { DashboardWidgetGrid } from "./_components/dashboard-widget-grid";
import { PrintableDashboardHeader } from "./_components/printable-dashboard-header";
import { useDashboardLayout } from "./_components/use-dashboard-layout";
import { CustomizeWidgetsModal } from "./widgets/customize-widgets-modal";
import type { DashboardTab, DateRange } from "./widgets/dashboard-types";
import {
  QuickActionsWidget,
  type QuickActionType,
} from "./widgets/quick-actions-widget";
import { QuickCreateModal } from "./widgets/quick-create-modal";

const TABS: { id: DashboardTab; label: string }[] = [
  { id: "Overview", label: "Genel Bakış" },
  { id: "Sales", label: "Satış & Pipeline" },
  { id: "Activities", label: "Aktiviteler & Takım" },
];

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  month: "Bu Ay (Ağustos)",
  quarter: "Bu Çeyrek (Q3)",
  today: "Bugün",
  week: "Bu Hafta",
  year: "Bu Yıl (2026)",
};

export default function WorkspaceOverviewPage() {
  const params = useParams();
  const tenantSlug = (params?.tenantSlug as string) || "workspace";
  const { activeTenant, profile } = usePermissions();

  const [activeTab, setActiveTab] = useState<DashboardTab>("Overview");
  const [dateRange, setDateRange] = useState<DateRange>("month");

  // Modals state
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [quickCreateType, setQuickCreateType] =
    useState<QuickActionType | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Drag and Drop & Layout Management Hook
  const {
    currentTabWidgets,
    draggedWidgetId,
    dragOverWidgetId,
    dropPosition,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleToggleWidget,
    handleMoveWidget,
    handleResetDefaults,
  } = useDashboardLayout(tenantSlug, activeTab, showToast);

  return (
    <PageContainer className="space-y-5 overflow-x-clip">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="slide-in-from-top-4 fixed top-6 right-6 z-50 flex animate-in items-center gap-2 rounded-lg border border-border bg-popover px-4 py-3 text-popover-foreground text-xs shadow-xl">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Executive Printable Report Header (Visible Only When Printing) */}
      <PrintableDashboardHeader
        activeTab={activeTab}
        dateRange={dateRange}
        dateRangeLabel={DATE_RANGE_LABELS[dateRange]}
        tabLabel={TABS.find((t) => t.id === activeTab)?.label || activeTab}
        tenantName={activeTenant?.name || ""}
        tenantSlug={tenantSlug}
        userName={profile?.fullName || ""}
      />

      {/* Top Header Row */}
      <DashboardHeader
        activeTab={activeTab}
        dateRange={dateRange}
        onOpenCustomize={() => setIsCustomizeModalOpen(true)}
        onOpenInvite={() => setIsInviteModalOpen(true)}
        tenantName={activeTenant?.name || ""}
        userName={profile?.fullName || ""}
      />

      {/* Subheader Tabs & Filters Bar */}
      <DashboardTabsBar
        activeTab={activeTab}
        dateRange={dateRange}
        dateRangeLabels={DATE_RANGE_LABELS}
        onOpenCustomize={() => setIsCustomizeModalOpen(true)}
        onResetDefaults={handleResetDefaults}
        onSelectDateRange={(range) => setDateRange(range)}
        onSelectTab={(tab) => setActiveTab(tab)}
        tabs={TABS}
      />

      {/* Quick Action Dock (Visible in Overview Tab) */}
      {activeTab === "Overview" && (
        <QuickActionsWidget
          onOpenQuickCreate={(type) => setQuickCreateType(type)}
        />
      )}

      {/* Main Dynamic Bento Grid of Widgets */}
      <DashboardWidgetGrid
        currentTabWidgets={currentTabWidgets}
        dateRange={dateRange}
        draggedWidgetId={draggedWidgetId}
        dragOverWidgetId={dragOverWidgetId}
        dropPosition={dropPosition}
        onDragEnd={handleDragEnd}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDragStart={handleDragStart}
        onDrop={handleDrop}
        onMoveWidget={handleMoveWidget}
        onOpenCustomize={() => setIsCustomizeModalOpen(true)}
        onResetDefaults={handleResetDefaults}
        onToggleWidget={handleToggleWidget}
      />

      {/* Customize Widgets Modal */}
      <CustomizeWidgetsModal
        activeTab={activeTab}
        activeWidgetIds={currentTabWidgets}
        isOpen={isCustomizeModalOpen}
        onClose={() => setIsCustomizeModalOpen(false)}
        onMoveWidget={handleMoveWidget}
        onResetDefaults={handleResetDefaults}
        onToggleWidget={handleToggleWidget}
      />

      {/* Quick Create Lead / Deal / Task Modal */}
      <QuickCreateModal
        isOpen={quickCreateType !== null}
        onClose={() => setQuickCreateType(null)}
        onSuccess={(msg) => showToast(msg)}
        type={quickCreateType}
      />

      {/* Invite Member Modal */}
      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
      />
    </PageContainer>
  );
}
