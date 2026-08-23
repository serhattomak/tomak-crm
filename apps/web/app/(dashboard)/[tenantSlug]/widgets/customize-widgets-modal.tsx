"use client";

import {
  BarChart3,
  Briefcase,
  Calendar,
  CheckSquare,
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
import { useState } from "react";
import type { DashboardTab } from "./dashboard-types";
import { WIDGET_REGISTRY } from "./widget-registry";

interface CustomizeWidgetsModalProps {
  activeTab: DashboardTab;
  activeWidgetIds: string[];
  isOpen: boolean;
  onClose: () => void;
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
}: CustomizeWidgetsModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

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
        return <TrendingUp className="h-4 w-4 text-emerald-600" />;
      case "BarChart3":
        return <BarChart3 className="h-4 w-4 text-violet-600" />;
      case "Gauge":
        return <Gauge className="h-4 w-4 text-fuchsia-600" />;
      case "Filter":
        return <Filter className="h-4 w-4 text-indigo-600" />;
      case "Briefcase":
        return <Briefcase className="h-4 w-4 text-cyan-600" />;
      case "PieChart":
        return <PieChart className="h-4 w-4 text-purple-600" />;
      case "CheckSquare":
        return <CheckSquare className="h-4 w-4 text-emerald-600" />;
      case "Calendar":
        return <Calendar className="h-4 w-4 text-blue-600" />;
      case "Clock":
        return <Clock className="h-4 w-4 text-amber-600" />;
      case "Trophy":
        return <Trophy className="h-4 w-4 text-amber-600" />;
      case "FileSpreadsheet":
        return <FileSpreadsheet className="h-4 w-4 text-amber-600" />;
      case "Zap":
        return <Zap className="h-4 w-4 text-amber-500" />;
      default:
        return <SlidersHorizontal className="h-4 w-4 text-slate-600" />;
    }
  };

  const filteredWidgets = WIDGET_REGISTRY.filter((w) => {
    const matchesCategory =
      selectedCategory === "all" || w.category === selectedCategory;
    const matchesSearch =
      w.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="fade-in fixed inset-0 z-50 flex animate-in items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-3xl border border-slate-200/80 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-slate-100 border-b p-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-slate-800">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900">
                Dashboard Widgetlarını Özelleştir
              </h2>
              <p className="text-slate-500 text-xs">
                <strong className="font-semibold text-violet-600">
                  {activeTab}
                </strong>{" "}
                sekmesinde görüntülenecek panelleri seçin (
                {activeWidgetIds.length} aktif)
              </p>
            </div>
          </div>

          <button
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div className="space-y-3 border-slate-100 border-b bg-slate-50/50 p-5">
          <div className="relative">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
            <input
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pr-4 pl-9 text-xs placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
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
                className={`rounded-xl px-3 py-1 font-semibold text-xs transition-all ${
                  selectedCategory === cat.id
                    ? "bg-slate-900 text-white shadow-xs"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
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
        <div className="flex-1 space-y-2.5 overflow-y-auto p-5">
          {filteredWidgets.map((widget) => {
            const isActive = activeWidgetIds.includes(widget.id);
            return (
              <div
                className={`flex items-center justify-between gap-3 rounded-2xl border p-4 transition-all duration-150 ${
                  isActive
                    ? "border-violet-200 bg-violet-50/40 shadow-xs"
                    : "border-slate-200/80 bg-white hover:border-slate-300"
                }`}
                key={widget.id}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-white shadow-2xs">
                    {getWidgetIcon(widget.iconName)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs">
                        {widget.title}
                      </span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-[9px] text-slate-500">
                        {widget.category}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500 leading-snug">
                      {widget.description}
                    </p>
                  </div>
                </div>

                {/* Toggle Switch */}
                <button
                  className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                    isActive ? "bg-violet-600" : "bg-slate-200"
                  }`}
                  onClick={() => onToggleWidget(widget.id)}
                  type="button"
                >
                  <div
                    className={`h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                      isActive ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-slate-100 border-t p-5">
          <button
            className="flex items-center gap-1.5 font-semibold text-slate-500 text-xs transition-colors hover:text-slate-800"
            onClick={onResetDefaults}
            type="button"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Varsayılana Sıfırla</span>
          </button>

          <button
            className="rounded-xl bg-blue-600 px-5 py-2 font-semibold text-white text-xs shadow-xs transition-all hover:bg-blue-700 active:scale-[0.98]"
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
