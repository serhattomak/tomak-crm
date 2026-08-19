"use client";

import { BarChart3, Download, Info } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "./dashboard-types";

interface RevenueChartWidgetProps {
  dateRange?: DateRange;
}

export function RevenueChartWidget({ dateRange: _dateRange }: RevenueChartWidgetProps) {
  const [activeMetric, setActiveMetric] = useState<"revenue" | "deals" | "margin">("revenue");
  const [hoveredMonth, setHoveredMonth] = useState<string>("Haz");

  const monthlyData = [
    { m: "Oca", revenue: 24500, deals: 18, margin: 42, height: "h-14" },
    { m: "Şub", revenue: 31200, deals: 24, margin: 45, height: "h-20" },
    { m: "Mar", revenue: 28400, deals: 21, margin: 40, height: "h-16" },
    { m: "Nis", revenue: 38900, deals: 29, margin: 48, height: "h-24" },
    { m: "May", revenue: 22100, deals: 15, margin: 38, height: "h-12" },
    { m: "Haz", revenue: 48250, deals: 38, margin: 52, height: "h-28" },
    { m: "Tem", revenue: 34100, deals: 26, margin: 44, height: "h-20" },
    { m: "Ağu", revenue: 41800, deals: 32, margin: 50, height: "h-26" },
    { m: "Eyl", revenue: 29400, deals: 22, margin: 41, height: "h-16" },
    { m: "Eki", revenue: 36700, deals: 28, margin: 46, height: "h-22" },
    { m: "Kas", revenue: 26300, deals: 19, margin: 39, height: "h-14" },
    { m: "Ara", revenue: 33500, deals: 25, margin: 43, height: "h-18" },
  ];

  const currentHovered = monthlyData.find((d) => d.m === hoveredMonth) ?? {
    m: "Haz",
    revenue: 48250,
    deals: 38,
    margin: 52,
    height: "h-28",
  };

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs transition-all hover:border-slate-300">
      <div>
        {/* Header and Controls */}
        <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                <span>Gelir & Performans Analizi</span>
                <Info className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <span className="text-[11px] text-slate-500">
                Aylık gerçekleşen satış ve hedef karşılaştırması
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Metric Switcher */}
            <div className="flex items-center rounded-xl bg-slate-100 p-0.5 text-xs">
              <button
                className={`rounded-lg px-2.5 py-1 font-medium transition-all ${
                  activeMetric === "revenue"
                    ? "bg-white font-semibold text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                onClick={() => setActiveMetric("revenue")}
                type="button"
              >
                Gelir (₺)
              </button>
              <button
                className={`rounded-lg px-2.5 py-1 font-medium transition-all ${
                  activeMetric === "deals"
                    ? "bg-white font-semibold text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                onClick={() => setActiveMetric("deals")}
                type="button"
              >
                Anlaşmalar
              </button>
              <button
                className={`rounded-lg px-2.5 py-1 font-medium transition-all ${
                  activeMetric === "margin"
                    ? "bg-white font-semibold text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                onClick={() => setActiveMetric("margin")}
                type="button"
              >
                Kâr Marjı %
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Tooltip & Interactive Bar Chart */}
        <div className="relative pt-6 pb-2">
          {/* Y Axis Grid Lines */}
          <div className="mb-2 space-y-6 font-mono text-[10px] text-slate-400">
            {["₺50K", "₺40K", "₺30K", "₺20K", "₺10K", "0"].map((label) => (
              <div className="flex items-center gap-3" key={label}>
                <span className="w-9 text-right">{label}</span>
                <div className="flex-1 border-slate-100 border-b border-dashed" />
              </div>
            ))}
          </div>

          {/* Bars */}
          <div className="-mt-36 grid h-36 grid-cols-12 items-end gap-1.5 pr-2 pl-12 sm:gap-3">
            {monthlyData.map((bar) => {
              const isHovered = bar.m === hoveredMonth;
              return (
                <div
                  className="group relative flex cursor-pointer flex-col items-center gap-2"
                  key={bar.m}
                  onMouseEnter={() => setHoveredMonth(bar.m)}
                >
                  {/* Tooltip on Hover */}
                  {isHovered && (
                    <div className="fade-in absolute -top-16 z-30 min-w-[120px] -translate-x-1/2 rounded-xl bg-slate-950 px-3 py-2 text-white shadow-xl">
                      <div className="font-semibold text-[10px] text-slate-400">{bar.m} 2026</div>
                      <div className="mt-0.5 flex items-center justify-between gap-2 font-bold text-xs">
                        <span>₺{bar.revenue.toLocaleString("tr-TR")}</span>
                        <span className="text-emerald-400 font-semibold text-[10px]">
                          {bar.deals} anlaşma
                        </span>
                      </div>
                      <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-slate-950" />
                    </div>
                  )}

                  <div className="flex h-36 w-full items-end justify-center">
                    <div
                      className={`w-full max-w-[28px] ${bar.height} rounded-2xl transition-all duration-200 ${
                        isHovered
                          ? "bg-gradient-to-t from-violet-600 via-purple-500 to-fuchsia-500 shadow-fuchsia-500/30 shadow-lg scale-105"
                          : "bg-slate-100 hover:bg-slate-200"
                      }`}
                      style={
                        !isHovered
                          ? {
                              backgroundImage:
                                "repeating-linear-gradient(45deg, #e2e8f0, #e2e8f0 2px, #f8fafc 2px, #f8fafc 6px)",
                            }
                          : undefined
                      }
                    />
                  </div>
                  <span
                    className={`font-semibold text-[11px] transition-colors ${
                      isHovered
                        ? "font-bold text-violet-700 dark:text-violet-400"
                        : "text-slate-400 group-hover:text-slate-700"
                    }`}
                  >
                    {bar.m}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Summary Footer */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-slate-100 border-t pt-4 text-xs">
        <div className="flex items-center gap-6">
          <div>
            <span className="text-slate-400 text-[11px]">Seçili Ay ({currentHovered.m}):</span>
            <div className="font-bold text-slate-900 text-sm">
              ₺{currentHovered.revenue.toLocaleString("tr-TR")}
            </div>
          </div>
          <div>
            <span className="text-slate-400 text-[11px]">Başarılı Satış:</span>
            <div className="font-bold text-slate-900 text-sm">{currentHovered.deals} Adet</div>
          </div>
          <div>
            <span className="text-slate-400 text-[11px]">Net Kâr Marjı:</span>
            <div className="font-bold text-emerald-600 text-sm">%{currentHovered.margin}</div>
          </div>
        </div>

        <button
          className="flex items-center gap-1 font-semibold text-violet-600 hover:text-violet-700"
          type="button"
        >
          <span>Tüm Raporu İndir</span>
          <Download className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
