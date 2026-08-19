"use client"

import {
  ArrowRight,
  Bell,
  CheckCircle2,
  ChevronDown,
  Download,
  Filter,
  Info,
  Plus,
  RotateCcw,
  Share2,
  SlidersHorizontal,
  Sparkles,
  UserPlus,
} from "lucide-react"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { usePermissions } from "@/lib/permissions/permission-context"
import { ActivityTimelineWidget } from "./widgets/activity-timeline-widget"
import { CustomizeWidgetsModal } from "./widgets/customize-widgets-modal"
import type { DashboardTab, DateRange } from "./widgets/dashboard-types"
import { DealsTableWidget } from "./widgets/deals-table-widget"
import { KpiMetricsWidget } from "./widgets/kpi-metrics-widget"
import { LeadSourcesWidget } from "./widgets/lead-sources-widget"
import { PipelineFunnelWidget } from "./widgets/pipeline-funnel-widget";
import { QuickCreateModal } from "./widgets/quick-create-modal";
import { RevenueChartWidget } from "./widgets/revenue-chart-widget";
import { SalesGaugeWidget } from "./widgets/sales-gauge-widget"
import { TasksChecklistWidget } from "./widgets/tasks-checklist-widget"
import { TeamLeaderboardWidget } from "./widgets/team-leaderboard-widget"
import { UpcomingMeetingsWidget } from "./widgets/upcoming-meetings-widget"
import { DEFAULT_WIDGET_IDS_BY_TAB } from "./widgets/widget-registry"

export default function WorkspaceOverviewPage() {
  const params = useParams()
  const tenantSlug = (params?.tenantSlug as string) || "workspace"
  const { activeTenant, profile } = usePermissions()

  const [activeTab, setActiveTab] = useState<DashboardTab>("Overview")
  const [dateRange, setDateRange] = useState<DateRange>("month")
  const [showDateDropdown, setShowDateDropdown] = useState(false)

  // Modals state
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false)
  const [quickCreateType, setQuickCreateType] = useState<
    "lead" | "deal" | "task" | "proposal" | null
  >(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Widget layouts stored per tab and tenant
  const [widgetsByTab, setWidgetsByTab] = useState<Record<string, string[]>>(
    DEFAULT_WIDGET_IDS_BY_TAB
  )

  // Load configuration from LocalStorage
  useEffect(() => {
    try {
      const storageKey = `crm_dashboard_layout_${tenantSlug}`
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        setWidgetsByTab(JSON.parse(saved))
      }
    } catch {
      // ignore storage errors
    }
  }, [tenantSlug])

  // Save layout helper
  const saveWidgets = (newLayout: Record<string, string[]>) => {
    setWidgetsByTab(newLayout)
    try {
      const storageKey = `crm_dashboard_layout_${tenantSlug}`
      localStorage.setItem(storageKey, JSON.stringify(newLayout))
    } catch {
      // ignore storage errors
    }
  }

  const currentTabWidgets =
    widgetsByTab[activeTab] || DEFAULT_WIDGET_IDS_BY_TAB[activeTab] || []

  const handleToggleWidget = (widgetId: string) => {
    const isCurrentlyActive = currentTabWidgets.includes(widgetId)
    const updated = isCurrentlyActive
      ? currentTabWidgets.filter((id) => id !== widgetId)
      : [...currentTabWidgets, widgetId]

    const newLayout = {
      ...widgetsByTab,
      [activeTab]: updated,
    }
    saveWidgets(newLayout)
  }

  const handleResetDefaults = () => {
    const newLayout = {
      ...widgetsByTab,
      [activeTab]: DEFAULT_WIDGET_IDS_BY_TAB[activeTab] || [],
    }
    saveWidgets(newLayout)
  }

  const showToast = (message: string) => {
    setToastMessage(message)
    setTimeout(() => {
      setToastMessage(null)
    }, 4000)
  }

  const tabs: { id: DashboardTab; label: string }[] = [
    { id: "Overview", label: "Genel Bakış" },
    { id: "Sales", label: "Satış & Pipeline" },
    { id: "Activities", label: "Aktiviteler & Takım" },
  ]

  const dateRangeLabels: Record<DateRange, string> = {
    today: "Bugün",
    week: "Bu Hafta",
    month: "Bu Ay (Ağustos)",
    quarter: "Bu Çeyrek (Q3)",
    year: "Bu Yıl (2026)",
  }

  const renderWidget = (widgetId: string) => {
    switch (widgetId) {
      case "kpi-metrics":
        return (
          <div className="col-span-12" key="kpi-metrics">
            <KpiMetricsWidget dateRange={dateRange} />
          </div>
        )

      case "revenue-chart":
        return (
          <div className="col-span-12 lg:col-span-8" key="revenue-chart">
            <RevenueChartWidget dateRange={dateRange} />
          </div>
        )

      case "sales-gauge":
        return (
          <div className="col-span-12 lg:col-span-4" key="sales-gauge">
            <SalesGaugeWidget dateRange={dateRange} />
          </div>
        )

      case "pipeline-funnel":
        return (
          <div className="col-span-12 lg:col-span-6" key="pipeline-funnel">
            <PipelineFunnelWidget dateRange={dateRange} />
          </div>
        )

      case "deals-table":
        return (
          <div className="col-span-12 lg:col-span-6" key="deals-table">
            <DealsTableWidget />
          </div>
        )

      case "lead-sources":
        return (
          <div className="col-span-12 lg:col-span-4" key="lead-sources">
            <LeadSourcesWidget dateRange={dateRange} />
          </div>
        )

      case "tasks-checklist":
        return (
          <div className="col-span-12 lg:col-span-8" key="tasks-checklist">
            <TasksChecklistWidget />
          </div>
        )

      case "upcoming-meetings":
        return (
          <div className="col-span-12 lg:col-span-6" key="upcoming-meetings">
            <UpcomingMeetingsWidget />
          </div>
        )

      case "activity-timeline":
        return (
          <div className="col-span-12 lg:col-span-6" key="activity-timeline">
            <ActivityTimelineWidget />
          </div>
        )

      case "team-leaderboard":
        return (
          <div className="col-span-12 lg:col-span-6" key="team-leaderboard">
            <TeamLeaderboardWidget />
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex animate-in items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-xs text-white shadow-2xl slide-in-from-top-4">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* 1. Top Header Row */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Dashboard
            </h1>
            <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-bold text-violet-700">
              {activeTenant?.name || "Ana Çalışma Alanı"}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Hoş geldiniz,{" "}
            <span className="font-semibold text-slate-800">
              {profile?.fullName || "Serhat Dev"}
            </span>
            . Bugünün CRM özet ve performans durumu.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 shadow-2xs transition-colors hover:bg-slate-50"
            title="Paylaş"
            type="button"
          >
            <Share2 className="h-4 w-4" />
          </button>

          <button
            className="relative flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 shadow-2xs transition-colors hover:bg-slate-50"
            title="Bildirimler"
            type="button"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-fuchsia-500 ring-2 ring-white" />
          </button>

          {/* Member Avatars Stack */}
          <div className="flex items-center -space-x-2 px-1">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-900 text-xs font-semibold text-white shadow-xs"
              title="Serhat Dev"
            >
              S
            </div>
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-indigo-600 text-xs font-semibold text-white shadow-xs"
              title="Ahmet Yılmaz"
            >
              A
            </div>
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-fuchsia-500 text-xs font-semibold text-white shadow-xs"
              title="Selin Kaya"
            >
              S
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[10px] font-bold text-slate-700 shadow-xs">
              +4
            </div>
          </div>

          <button
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 shadow-2xs transition-colors hover:bg-slate-50"
            onClick={() => setQuickCreateType("lead")}
            title="Üye / Lead Ekle"
            type="button"
          >
            <UserPlus className="h-4 w-4" />
          </button>

          <button
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50 hover:text-violet-600"
            onClick={() => setIsCustomizeModalOpen(true)}
            type="button"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Widgetları Düzenle</span>
          </button>
        </div>
      </div>

      {/* 2. Subheader Tabs & Filters Bar */}
      <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
        {/* Pill Tabs */}
        <div className="flex w-fit items-center gap-1 rounded-2xl bg-slate-100/90 p-1">
          {tabs.map((tab) => (
            <button
              className={`rounded-xl px-4 py-1.5 text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
          <button
            className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-white/50 hover:text-slate-900"
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
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
              onClick={() => setShowDateDropdown(!showDateDropdown)}
              type="button"
            >
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <span>{dateRangeLabels[dateRange]}</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {showDateDropdown && (
              <div className="absolute right-0 z-30 mt-1.5 w-44 animate-in rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-xl fade-in">
                {(Object.keys(dateRangeLabels) as DateRange[]).map((range) => (
                  <button
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-medium transition-colors ${
                      dateRange === range
                        ? "bg-violet-50 font-bold text-violet-700"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                    key={range}
                    onClick={() => {
                      setDateRange(range)
                      setShowDateDropdown(false)
                    }}
                    type="button"
                  >
                    <span>{dateRangeLabels[range]}</span>
                    {dateRange === range && (
                      <span className="h-1.5 w-1.5 rounded-full bg-violet-600" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            className="flex items-center gap-1.5 rounded-xl bg-slate-950 px-3.5 py-1.5 text-xs font-medium text-white shadow-xs transition-colors hover:bg-slate-800"
            onClick={() =>
              showToast("Dashboard PDF/Excel raporu indiriliyor...")
            }
            type="button"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Rapor Al</span>
          </button>
        </div>
      </div>

      {/* 3. Main Dynamic Grid of Widgets */}
      <div className="grid grid-cols-12 gap-6">
        {currentTabWidgets.length === 0 ? (
          <div className="col-span-12 flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200/80 bg-slate-50/50 p-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-xs">
              <SlidersHorizontal className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-sm font-bold text-slate-900">
              Bu sekmede henüz aktif widget yok
            </h3>
            <p className="mt-1 max-w-sm text-xs text-slate-500">
              Widget kataloğunu açarak bu sekmeye dilediğiniz CRM bileşenlerini
              ekleyebilirsiniz.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800"
                onClick={() => setIsCustomizeModalOpen(true)}
                type="button"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Widget Kataloğunu Aç</span>
              </button>
              <button
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
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
    </div>
  )
}
