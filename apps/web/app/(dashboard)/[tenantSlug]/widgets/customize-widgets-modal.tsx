/* Hallmark · component: customize-widgets-modal · genre: modern-minimal · theme: Adaptive Zinc/Violet */
"use client";

import {
  BarChart3,
  Briefcase,
  Calendar,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Clock,
  FileSpreadsheet,
  Filter,
  Gauge,
  PieChart,
  RotateCcw,
  Search,
  SlidersHorizontal,
  TrendingUp,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { DashboardTab } from "./dashboard-types";
import { WIDGET_REGISTRY } from "./widget-registry";

interface CustomizeWidgetsModalProps {
  activeTab: DashboardTab;
  activeWidgetIds: string[];
  isOpen: boolean;
  onClose: () => void;
  onMoveWidget?: (widgetId: string, direction: "up" | "down") => void;
  onResetDefaults: () => void;
  onToggleWidget: (widgetId: string) => void;
}

export function CustomizeWidgetsModal({
  isOpen,
  onClose,
  activeTab,
  activeWidgetIds,
  onToggleWidget,
  onResetDefaults,
  onMoveWidget,
}: CustomizeWidgetsModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Close on Escape key - must be called unconditionally at top level
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const categories: { id: string; label: string }[] = [
    { id: "all", label: "Tümü" },
    { id: "Sales", label: "Satış & Gelir" },
    { id: "Leads", label: "Lead & Müşteri" },
    { id: "Activities", label: "Aktiviteler" },
    { id: "Team", label: "Takım" },
    { id: "General", label: "Genel" },
  ];

  const getWidgetIcon = (iconName: string) => {
    switch (iconName) {
      case "TrendingUp":
        return <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case "BarChart3":
        return <BarChart3 className="h-4 w-4 text-violet-600 dark:text-violet-400" />;
      case "Gauge":
        return <Gauge className="h-4 w-4 text-fuchsia-600 dark:text-fuchsia-400" />;
      case "Filter":
        return <Filter className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />;
      case "Briefcase":
        return <Briefcase className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />;
      case "PieChart":
        return <PieChart className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
      case "CheckSquare":
        return <CheckSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case "Calendar":
        return <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      case "Clock":
        return <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
      case "Trophy":
        return <Trophy className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
      case "FileSpreadsheet":
        return <FileSpreadsheet className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
      case "Zap":
        return <Zap className="h-4 w-4 text-amber-500 dark:text-amber-400" />;
      default:
        return <SlidersHorizontal className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />;
    }
  };

  // Sort widgets: active widgets in their current tab order first, then inactive widgets
  const sortedWidgets = [...WIDGET_REGISTRY].sort((a, b) => {
    const aIndex = activeWidgetIds.indexOf(a.id);
    const bIndex = activeWidgetIds.indexOf(b.id);
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    if (aIndex !== -1) {
      return -1;
    }
    if (bIndex !== -1) {
      return 1;
    }
    return 0;
  });

  const filteredWidgets = sortedWidgets.filter((w) => {
    const matchesCategory =
      selectedCategory === "all" || w.category === selectedCategory;
    const matchesSearch =
      w.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="fade-in fixed inset-0 z-50 flex animate-in items-center justify-center overflow-y-auto p-2 sm:p-4">
      {/* Backdrop with Click-to-Close */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="relative z-10 my-auto flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 p-4 sm:p-5 dark:border-zinc-800">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-800 shadow-2xs dark:bg-zinc-800 dark:text-zinc-200">
              <SlidersHorizontal className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate font-bold text-zinc-900 text-sm sm:text-base dark:text-zinc-100">
                Dashboard Widget Düzenini Özelleştir
              </h2>
              <p className="truncate text-zinc-500 text-xs dark:text-zinc-400">
                <strong className="font-semibold text-violet-600 dark:text-violet-400">
                  {activeTab}
                </strong>{" "}
                sekmesinde görüntülenecek panelleri ve yerleşim sırasını
                belirleyin ({activeWidgetIds.length} aktif)
              </p>
            </div>
          </div>

          <button
            className="shrink-0 rounded-xl p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div className="space-y-2.5 border-b border-zinc-100 bg-zinc-50/50 dark:bg-zinc-800/40 p-4 dark:border-zinc-800 dark:bg-zinc-800/40">
          <div className="relative">
            <Search className="absolute top-2.5 left-3 h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
            <input
              className="w-full rounded-xl border border-zinc-200 bg-white py-1.5 pr-4 pl-9 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Widget ara..."
              type="text"
              value={searchQuery}
            />
          </div>

          {/* Category Pills */}
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                className={`rounded-lg px-2.5 py-1 font-semibold text-xs transition-all ${
                  selectedCategory === cat.id
                    ? "bg-zinc-900 text-white shadow-2xs dark:bg-zinc-100 dark:text-zinc-900"
                    : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                }`}
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                type="button"
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Widget Grid List */}
        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {filteredWidgets.map((widget) => {
            const activeIndex = activeWidgetIds.indexOf(widget.id);
            const isActive = activeIndex !== -1;
            const isFirst = activeIndex === 0;
            const isLast = activeIndex === activeWidgetIds.length - 1;

            return (
              <div
                className={`flex items-center justify-between gap-3 rounded-xl border p-3 transition-all duration-150 ${
                  isActive
                    ? "border-violet-200 bg-violet-50/40 shadow-2xs dark:border-violet-800/60 dark:bg-violet-950/30"
                    : "border-zinc-200/80 bg-white opacity-80 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-800/50 dark:hover:border-zinc-700"
                }`}
                key={widget.id}
              >
                <div className="flex min-w-0 items-start gap-2.5">
                  {/* Reorder Buttons (only for active widgets) */}
                  {isActive && onMoveWidget ? (
                    <div className="flex flex-col items-center gap-0.5 pt-0.5">
                      <button
                        className="rounded p-0.5 text-zinc-400 transition hover:bg-violet-100 hover:text-violet-700 disabled:pointer-events-none disabled:opacity-30 dark:hover:bg-violet-900/60 dark:hover:text-violet-300"
                        disabled={isFirst}
                        onClick={() => onMoveWidget(widget.id, "up")}
                        title="Yukarı Taşı"
                        type="button"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      <span className="font-bold text-[9px] text-violet-700 dark:text-violet-300">
                        #{activeIndex + 1}
                      </span>
                      <button
                        className="rounded p-0.5 text-zinc-400 transition hover:bg-violet-100 hover:text-violet-700 disabled:pointer-events-none disabled:opacity-30 dark:hover:bg-violet-900/60 dark:hover:text-violet-300"
                        disabled={isLast}
                        onClick={() => onMoveWidget(widget.id, "down")}
                        title="Aşağı Taşı"
                        type="button"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-4" />
                  )}

                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-zinc-200/80 bg-white shadow-2xs dark:border-zinc-700 dark:bg-zinc-800">
                    {getWidgetIcon(widget.iconName)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-bold text-zinc-900 text-xs dark:text-zinc-100">
                        {widget.title}
                      </span>
                      <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-bold text-[9px] text-zinc-500 dark:bg-zinc-700 dark:text-zinc-300">
                        {widget.category}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-zinc-500 leading-snug dark:text-zinc-400">
                      {widget.description}
                    </p>
                  </div>
                </div>

                {/* Toggle Switch */}
                <div className="flex flex-none items-center gap-2">
                  <button
                    className={`flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                      isActive ? "bg-violet-600" : "bg-zinc-300 dark:bg-zinc-700"
                    }`}
                    onClick={() => onToggleWidget(widget.id)}
                    type="button"
                  >
                    <div
                      className={`h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform duration-200 ${
                        isActive ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-100 p-4 dark:border-zinc-800">
          <button
            className="flex items-center gap-1.5 font-semibold text-zinc-500 text-xs transition-colors hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            onClick={onResetDefaults}
            type="button"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Varsayılana Sıfırla</span>
          </button>

          <button
            className="rounded-xl bg-violet-600 px-4 py-2 font-bold text-white text-xs shadow-xs transition-all hover:bg-violet-700 active:scale-95"
            onClick={onClose}
            type="button"
          >
            Kaydet & Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
