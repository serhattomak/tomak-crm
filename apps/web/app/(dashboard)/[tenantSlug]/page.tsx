/* Hallmark · genre: modern-minimal · macrostructure: Workbench · theme: Adaptive Zinc/Violet · design-system: design.md · designed-as-app */
"use client";

import {
  CheckCircle2,
  ChevronDown,
  Download,
  Filter,
  LayoutGrid,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { DashboardSharePopover } from "@/components/dashboard-share-popover";
import { NotificationCenter } from "@/components/notification-center";
import {
  InviteMemberModal,
  TeamMembersStack,
} from "@/components/team-members-stack";
import { usePermissions } from "@/lib/permissions/permission-context";
import { ActivityTimelineWidget } from "./widgets/activity-timeline-widget";
import { CustomizeWidgetsModal } from "./widgets/customize-widgets-modal";
import type { DashboardTab, DateRange } from "./widgets/dashboard-types";
import { DealsTableWidget } from "./widgets/deals-table-widget";
import { DraggableWidgetWrapper } from "./widgets/draggable-widget-wrapper";
import { KpiMetricsWidget } from "./widgets/kpi-metrics-widget";
import { LeadSourcesWidget } from "./widgets/lead-sources-widget";
import { PipelineFunnelWidget } from "./widgets/pipeline-funnel-widget";
import {
  QuickActionsWidget,
  type QuickActionType,
} from "./widgets/quick-actions-widget";
import { QuickCreateModal } from "./widgets/quick-create-modal";
import { QuotesSummaryWidget } from "./widgets/quotes-summary-widget";
import { RevenueChartWidget } from "./widgets/revenue-chart-widget";
import { SalesGaugeWidget } from "./widgets/sales-gauge-widget";
import { TasksChecklistWidget } from "./widgets/tasks-checklist-widget";
import { TeamLeaderboardWidget } from "./widgets/team-leaderboard-widget";
import { UpcomingMeetingsWidget } from "./widgets/upcoming-meetings-widget";
import {
  DEFAULT_WIDGET_IDS_BY_TAB,
  WIDGET_REGISTRY,
} from "./widgets/widget-registry";

export default function WorkspaceOverviewPage() {
  const params = useParams();
  const tenantSlug = (params?.tenantSlug as string) || "workspace";
  const { activeTenant, profile } = usePermissions();

  const [activeTab, setActiveTab] = useState<DashboardTab>("Overview");
  const [dateRange, setDateRange] = useState<DateRange>("month");
  const [showDateDropdown, setShowDateDropdown] = useState(false);

  // Modals state
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [quickCreateType, setQuickCreateType] =
    useState<QuickActionType | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Drag and Drop State
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null);
  const [dragOverWidgetId, setDragOverWidgetId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<"before" | "after" | null>(
    null
  );

  // Widget layouts stored per tab and tenant
  const [widgetsByTab, setWidgetsByTab] = useState<Record<string, string[]>>(
    DEFAULT_WIDGET_IDS_BY_TAB
  );

  useEffect(() => {
    try {
      const storageKey = `crm_dashboard_layout_${tenantSlug}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setWidgetsByTab(JSON.parse(saved));
      }
    } catch {
      // ignore storage errors
    }
  }, [tenantSlug]);

  // Save layout helper
  const saveWidgets = (newLayout: Record<string, string[]>) => {
    setWidgetsByTab(newLayout);
    try {
      const storageKey = `crm_dashboard_layout_${tenantSlug}`;
      localStorage.setItem(storageKey, JSON.stringify(newLayout));
    } catch {
      // ignore storage errors
    }
  };

  const currentTabWidgets =
    widgetsByTab[activeTab] || DEFAULT_WIDGET_IDS_BY_TAB[activeTab] || [];

  const handleToggleWidget = (widgetId: string) => {
    const isCurrentlyActive = currentTabWidgets.includes(widgetId);
    const updated = isCurrentlyActive
      ? currentTabWidgets.filter((id) => id !== widgetId)
      : [...currentTabWidgets, widgetId];

    const newLayout = {
      ...widgetsByTab,
      [activeTab]: updated,
    };
    saveWidgets(newLayout);
  };

  const handleMoveWidget = (widgetId: string, direction: "up" | "down") => {
    const currentIndex = currentTabWidgets.indexOf(widgetId);
    if (currentIndex === -1) {
      return;
    }
    const targetIndex =
      direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= currentTabWidgets.length) {
      return;
    }

    const updated = [...currentTabWidgets];
    const removed = updated.splice(currentIndex, 1)[0];
    if (!removed) {
      return;
    }
    updated.splice(targetIndex, 0, removed);

    const newLayout = {
      ...widgetsByTab,
      [activeTab]: updated,
    };
    saveWidgets(newLayout);
  };

  const handleResetDefaults = () => {
    const newLayout = {
      ...widgetsByTab,
      [activeTab]: DEFAULT_WIDGET_IDS_BY_TAB[activeTab] || [],
    };
    saveWidgets(newLayout);
    showToast("Pano varsayılan widget düzenine sıfırlandı.");
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Drag and Drop Event Handlers
  const handleDragStart = (e: React.DragEvent, widgetId: string) => {
    setDraggedWidgetId(widgetId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", widgetId);
  };

  const handleDragEnd = () => {
    setDraggedWidgetId(null);
    setDragOverWidgetId(null);
    setDropPosition(null);
  };

  const handleDragOver = (e: React.DragEvent, targetWidgetId: string) => {
    e.preventDefault();
    if (!draggedWidgetId || draggedWidgetId === targetWidgetId) {
      return;
    }

    e.dataTransfer.dropEffect = "move";
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const pos = e.clientY < midY ? "before" : "after";

    if (dragOverWidgetId !== targetWidgetId || dropPosition !== pos) {
      setDragOverWidgetId(targetWidgetId);
      setDropPosition(pos);
    }
  };

  const handleDragLeave = (e: React.DragEvent, targetWidgetId: string) => {
    const relatedTarget = e.relatedTarget as Node | null;
    if (relatedTarget && e.currentTarget.contains(relatedTarget)) {
      return;
    }
    if (dragOverWidgetId === targetWidgetId) {
      setDragOverWidgetId(null);
      setDropPosition(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetWidgetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData("text/plain") || draggedWidgetId;
    if (!sourceId || sourceId === targetWidgetId) {
      handleDragEnd();
      return;
    }

    const currentList = [...currentTabWidgets];
    const sourceIndex = currentList.indexOf(sourceId);
    const targetIndex = currentList.indexOf(targetWidgetId);

    if (sourceIndex === -1 || targetIndex === -1) {
      handleDragEnd();
      return;
    }

    // Remove item from source
    const [movedItem] = currentList.splice(sourceIndex, 1);
    if (!movedItem) {
      handleDragEnd();
      return;
    }

    // Re-find target index
    const newTargetIndex = currentList.indexOf(targetWidgetId);
    const insertIndex =
      dropPosition === "after" ? newTargetIndex + 1 : newTargetIndex;

    currentList.splice(insertIndex, 0, movedItem);

    const newLayout = {
      ...widgetsByTab,
      [activeTab]: currentList,
    };

    saveWidgets(newLayout);
    showToast("Pano widget düzeni güncellendi.");
    handleDragEnd();
  };

  const tabs: { id: DashboardTab; label: string }[] = [
    { id: "Overview", label: "Genel Bakış" },
    { id: "Sales", label: "Satış & Pipeline" },
    { id: "Activities", label: "Aktiviteler & Takım" },
  ];

  const dateRangeLabels: Record<DateRange, string> = {
    month: "Bu Ay (Ağustos)",
    quarter: "Bu Çeyrek (Q3)",
    today: "Bugün",
    week: "Bu Hafta",
    year: "Bu Yıl (2026)",
  };

  const renderWidget = (widgetId: string) => {
    const isRevenueChartActive = currentTabWidgets.includes("revenue-chart");
    const isSalesGaugeActive = currentTabWidgets.includes("sales-gauge");
    const isLeadSourcesActive = currentTabWidgets.includes("lead-sources");
    const isTasksActive = currentTabWidgets.includes("tasks-checklist");

    let spanClass = "col-span-12 lg:col-span-6";
    let widgetContent: React.ReactNode = null;

    switch (widgetId) {
      case "kpi-metrics":
        spanClass = "col-span-12";
        widgetContent = <KpiMetricsWidget dateRange={dateRange} />;
        break;

      case "revenue-chart":
        spanClass = isSalesGaugeActive
          ? "col-span-12 lg:col-span-8"
          : "col-span-12";
        widgetContent = <RevenueChartWidget dateRange={dateRange} />;
        break;

      case "sales-gauge":
        spanClass = isRevenueChartActive
          ? "col-span-12 lg:col-span-4"
          : "col-span-12 lg:col-span-6";
        widgetContent = <SalesGaugeWidget dateRange={dateRange} />;
        break;

      case "pipeline-funnel":
        spanClass = "col-span-12 lg:col-span-6";
        widgetContent = <PipelineFunnelWidget dateRange={dateRange} />;
        break;

      case "deals-table":
        spanClass = "col-span-12 lg:col-span-6";
        widgetContent = <DealsTableWidget />;
        break;

      case "quotes-summary":
        spanClass = "col-span-12 lg:col-span-6";
        widgetContent = <QuotesSummaryWidget />;
        break;

      case "lead-sources":
        spanClass = isTasksActive
          ? "col-span-12 lg:col-span-4"
          : "col-span-12 lg:col-span-6";
        widgetContent = <LeadSourcesWidget dateRange={dateRange} />;
        break;

      case "tasks-checklist":
        spanClass = isLeadSourcesActive
          ? "col-span-12 lg:col-span-8"
          : "col-span-12";
        widgetContent = <TasksChecklistWidget />;
        break;

      case "upcoming-meetings":
        spanClass = "col-span-12 lg:col-span-6";
        widgetContent = <UpcomingMeetingsWidget />;
        break;

      case "activity-timeline":
        spanClass = "col-span-12 lg:col-span-6";
        widgetContent = <ActivityTimelineWidget />;
        break;

      case "team-leaderboard":
        spanClass = "col-span-12 lg:col-span-6";
        widgetContent = <TeamLeaderboardWidget />;
        break;

      default:
        return null;
    }

    const meta = WIDGET_REGISTRY.find((w) => w.id === widgetId);
    const index = currentTabWidgets.indexOf(widgetId);
    const isFirst = index === 0;
    const isLast = index === currentTabWidgets.length - 1;

    return (
      <DraggableWidgetWrapper
        dropPosition={dragOverWidgetId === widgetId ? dropPosition : null}
        isDragging={draggedWidgetId === widgetId}
        isDragOver={dragOverWidgetId === widgetId}
        isFirst={isFirst}
        isLast={isLast}
        key={widgetId}
        onDragEnd={handleDragEnd}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDragStart={handleDragStart}
        onDrop={handleDrop}
        onHide={() => handleToggleWidget(widgetId)}
        onMoveDown={() => handleMoveWidget(widgetId, "down")}
        onMoveUp={() => handleMoveWidget(widgetId, "up")}
        spanClass={spanClass}
        widgetId={widgetId}
        widgetTitle={meta?.title}
      >
        {widgetContent}
      </DraggableWidgetWrapper>
    );
  };

  return (
    <div className="space-y-6 overflow-x-clip">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="slide-in-from-top-4 fixed top-6 right-6 z-50 flex animate-in items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 text-white text-xs shadow-2xl dark:bg-white dark:text-zinc-900">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 dark:text-emerald-600" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Executive Printable Report Header (Visible Only When Printing) */}
      <div className="mb-8 hidden border-zinc-900 border-b-2 pb-5 print:block">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 font-black text-lg text-white">
                {(activeTenant?.name || tenantSlug || "C")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div>
                <h1 className="font-black text-2xl text-zinc-900 tracking-tight">
                  {activeTenant?.name || tenantSlug.toUpperCase()}
                </h1>
                <p className="font-semibold text-xs text-zinc-600">
                  CRM Pano Yönetici & Performans Raporu
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-4 font-medium text-xs text-zinc-700">
              <div>
                Pano Sekmesi:{" "}
                <strong className="font-bold text-zinc-900">
                  {tabs.find((t) => t.id === activeTab)?.label || activeTab}
                </strong>
              </div>
              <div>
                Dönem:{" "}
                <strong className="font-bold text-zinc-900">
                  {dateRangeLabels[dateRange]}
                </strong>
              </div>
            </div>
          </div>

          <div className="text-right text-xs text-zinc-600">
            <div className="font-bold text-zinc-900">Rapor Tarihi</div>
            <div>
              {new Date().toLocaleDateString("tr-TR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </div>
            <div className="mt-1 text-[11px] text-zinc-400">
              Hazırlayan: {profile?.fullName || "Yetkili Kullanıcı"}
            </div>
            <div className="mt-2 inline-block rounded-md bg-zinc-100 px-2 py-0.5 font-bold text-[9px] text-zinc-600 uppercase tracking-wider">
              Gizli & Kurum İçi
            </div>
          </div>
        </div>
      </div>

      {/* 1. Top Header Row (Tactile Linear Style) */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-2xl text-zinc-900 tracking-tight sm:text-3xl dark:text-zinc-100">
              Dashboard
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full border border-violet-200/70 bg-violet-50 px-2.5 py-0.5 font-bold text-[11px] text-violet-700 dark:border-violet-800/60 dark:bg-violet-950/60 dark:text-violet-300">
              <Sparkles className="h-3 w-3 text-violet-500" />
              {activeTenant?.name || "Ana Çalışma Alanı"}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Hoş geldiniz,{" "}
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              {profile?.fullName || "Serhat Dev"}
            </span>
            . Bugünün CRM özet ve performans durumu.
          </p>
        </div>

        {/* Action Controls Toolbar */}
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {/* Interactive Share Dashboard Popover */}
          <DashboardSharePopover activeTab={activeTab} dateRange={dateRange} />

          {/* Interactive Notification Center */}
          <NotificationCenter />

          {/* Interactive Member Avatars Stack & Popover */}
          <TeamMembersStack onOpenInvite={() => setIsInviteModalOpen(true)} />

          {/* Quick Invite Button */}
          <button
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-200/80 bg-white text-zinc-600 shadow-2xs transition-all hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 active:scale-95 dark:border-zinc-800 dark:bg-zinc-800/80 dark:text-zinc-300 dark:hover:bg-zinc-700"
            onClick={() => setIsInviteModalOpen(true)}
            title="Ekip Arkadaşı Davet Et"
            type="button"
          >
            <UserPlus className="h-3.5 w-3.5" />
          </button>

          {/* Customize Widgets Button */}
          <button
            className="flex items-center gap-1.5 rounded-xl border border-zinc-200/80 bg-white px-3 py-1.5 font-semibold text-xs text-zinc-700 shadow-2xs transition-colors hover:bg-zinc-50 hover:text-violet-600 dark:border-zinc-800 dark:bg-zinc-800/80 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-violet-300"
            onClick={() => setIsCustomizeModalOpen(true)}
            type="button"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Widgetları Düzenle</span>
          </button>
        </div>
      </div>

      {/* 2. Subheader Tabs & Filters Bar */}
      <div className="flex flex-col justify-between gap-3 border-zinc-200/70 border-b pb-3.5 sm:flex-row sm:items-center dark:border-zinc-800 print:hidden">
        {/* Pill Tabs */}
        <div className="flex w-fit items-center gap-1 rounded-xl bg-zinc-100/80 p-1 dark:bg-zinc-800/60">
          {tabs.map((tab) => (
            <button
              className={`rounded-lg px-3.5 py-1.5 font-semibold text-xs transition-all ${
                activeTab === tab.id
                  ? "bg-white text-zinc-900 shadow-2xs dark:bg-zinc-700 dark:text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 dark:hover:text-zinc-400"
              }`}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
          <button
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-semibold text-xs text-zinc-500 transition-colors hover:bg-white/50 hover:text-zinc-900 dark:hover:bg-zinc-700/50 dark:hover:text-zinc-200 dark:hover:text-zinc-400"
            onClick={() => setIsCustomizeModalOpen(true)}
            type="button"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Widget Ekle</span>
          </button>
        </div>

        {/* Date Filter & Export */}
        <div className="flex items-center gap-2">
          {/* Dynamic Date Range Dropdown */}
          <div className="relative">
            <button
              className="flex items-center gap-1.5 rounded-xl border border-zinc-200/80 bg-white px-3 py-1.5 font-semibold text-xs text-zinc-700 shadow-2xs hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/80 dark:text-zinc-300 dark:hover:bg-zinc-700"
              onClick={() => setShowDateDropdown(!showDateDropdown)}
              type="button"
            >
              <Filter className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
              <span>{dateRangeLabels[dateRange]}</span>
              <ChevronDown className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
            </button>

            {showDateDropdown && (
              <div className="fade-in absolute right-0 z-30 mt-1.5 w-44 animate-in rounded-xl border border-zinc-200/80 bg-white p-1.5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
                {(Object.keys(dateRangeLabels) as DateRange[]).map((range) => (
                  <button
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left font-medium text-xs transition-colors ${
                      dateRange === range
                        ? "bg-violet-50 font-bold text-violet-700 dark:bg-violet-950/60 dark:text-violet-300"
                        : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 dark:hover:text-zinc-400"
                    }`}
                    key={range}
                    onClick={() => {
                      setDateRange(range);
                      setShowDateDropdown(false);
                    }}
                    type="button"
                  >
                    <span>{dateRangeLabels[range]}</span>
                    {dateRange === range && (
                      <span className="h-1.5 w-1.5 rounded-full bg-violet-600 dark:bg-violet-400" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reset Layout */}
          <button
            className="flex items-center gap-1.5 rounded-xl border border-zinc-200/80 bg-white px-3 py-1.5 font-semibold text-xs text-zinc-700 shadow-2xs transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/80 dark:text-zinc-300 dark:hover:bg-zinc-700"
            onClick={handleResetDefaults}
            title="Pano yerleşimini varsayılan fabrika ayarlarına döndür"
            type="button"
          >
            <RotateCcw className="h-3.5 w-3.5 text-zinc-400" />
            <span className="hidden sm:inline">Düzeni Sıfırla</span>
          </button>

          {/* Quick PDF / Print Export */}
          <button
            className="flex items-center gap-1.5 rounded-xl border border-zinc-200/80 bg-white px-3 py-1.5 font-semibold text-xs text-zinc-700 shadow-2xs hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/80 dark:text-zinc-300 dark:hover:bg-zinc-700"
            onClick={() => window.print()}
            type="button"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Rapor Al</span>
          </button>
        </div>
      </div>

      {/* 3. Quick Action Dock (Visible in Overview Tab) */}
      {activeTab === "Overview" && (
        <QuickActionsWidget
          onOpenQuickCreate={(type) => setQuickCreateType(type)}
        />
      )}

      {/* 4. Main Dynamic Bento Grid of Widgets */}
      <div className="grid grid-flow-dense grid-cols-12 gap-5 print:grid print:grid-cols-12 print:gap-4 print:overflow-visible">
        {currentTabWidgets.length === 0 ? (
          <div className="col-span-12 flex flex-col items-center justify-center rounded-2xl border border-zinc-200 border-dashed bg-zinc-50/50 p-12 text-center dark:border-zinc-800 dark:bg-zinc-800/40 dark:bg-zinc-900/50">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-zinc-400 shadow-2xs dark:bg-zinc-800 dark:text-zinc-500">
              <LayoutGrid className="h-6 w-6" />
            </div>
            <h3 className="mt-3 font-bold text-sm text-zinc-900 dark:text-zinc-100">
              Bu sekmede henüz aktif widget yok
            </h3>
            <p className="mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
              Widget kataloğunu açarak bu sekmeye dilediğiniz CRM bileşenlerini
              ekleyebilirsiniz.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 font-semibold text-white text-xs shadow-xs transition-all hover:bg-violet-700 active:scale-[0.98]"
                onClick={() => setIsCustomizeModalOpen(true)}
                type="button"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Widget Kataloğunu Aç</span>
              </button>
              <button
                className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-4 py-2 font-semibold text-xs text-zinc-700 shadow-2xs hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                onClick={handleResetDefaults}
                type="button"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Varsayılanları Yükle</span>
              </button>
            </div>
          </div>
        ) : (
          currentTabWidgets.map((widgetId) => renderWidget(widgetId))
        )}
      </div>

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
    </div>
  );
}
