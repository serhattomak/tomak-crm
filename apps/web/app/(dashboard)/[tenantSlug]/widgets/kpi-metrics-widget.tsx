"use client"

import {
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  Target,
  TrendingUp,
  Users,
} from "lucide-react"
import type { DateRange } from "./dashboard-types"

interface KpiMetricsWidgetProps {
  dateRange: DateRange
}

export function KpiMetricsWidget({ dateRange }: KpiMetricsWidgetProps) {
  // Dynamic mock multipliers according to date range
  const multiplier =
    dateRange === "today"
      ? 0.05
      : dateRange === "week"
        ? 0.25
        : dateRange === "quarter"
          ? 3.2
          : dateRange === "year"
            ? 12.5
            : 1

  const revenue = Math.round(48250 * multiplier)
  const newLeads = Math.round(142 * multiplier)
  const dealsWon = Math.round(38 * multiplier)
  const winRate = 64.8

  const metrics = [
    {
      id: "revenue",
      title: "Toplam Gelir",
      value: `₺${revenue.toLocaleString("tr-TR")}`,
      change: "+14.2%",
      isPositive: true,
      subtitle: "önceki döneme göre",
      icon: DollarSign,
      color:
        "from-emerald-500/20 to-teal-500/10 text-emerald-600 dark:text-emerald-400",
      accent: "bg-emerald-500",
      sparkline: [35, 42, 45, 58, 62, 75, 88],
    },
    {
      id: "leads",
      title: "Yeni Lead & Müşteri",
      value: newLeads.toString(),
      change: "+22.5%",
      isPositive: true,
      subtitle: "önceki döneme göre",
      icon: Users,
      color:
        "from-violet-500/20 to-purple-500/10 text-violet-600 dark:text-violet-400",
      accent: "bg-violet-500",
      sparkline: [20, 28, 35, 30, 48, 55, 68],
    },
    {
      id: "winRate",
      title: "Kazanma Oranı",
      value: `%${winRate}`,
      change: "+4.1%",
      isPositive: true,
      subtitle: "sektör ort: %45",
      icon: Target,
      color: "from-blue-500/20 to-cyan-500/10 text-blue-600 dark:text-blue-400",
      accent: "bg-blue-500",
      sparkline: [52, 55, 58, 56, 61, 63, 65],
    },
    {
      id: "deals",
      title: "Kazanılan Fırsatlar",
      value: `${dealsWon} Anlaşma`,
      change: "-1.8%",
      isPositive: false,
      subtitle: "hedef: 45",
      icon: TrendingUp,
      color:
        "from-amber-500/20 to-orange-500/10 text-amber-600 dark:text-amber-400",
      accent: "bg-amber-500",
      sparkline: [12, 15, 18, 14, 16, 15, 17],
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((m) => {
        const Icon = m.icon
        return (
          <div
            className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
            key={m.id}
          >
            {/* Background subtle gradient glow */}
            <div
              className={`absolute -top-8 -right-8 h-24 w-24 rounded-full bg-gradient-to-br ${m.color} opacity-60 blur-2xl transition-opacity group-hover:opacity-100`}
            />

            <div className="relative flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-500">
                  {m.title}
                </span>
                <div className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                  {m.value}
                </div>
              </div>
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${m.color} border border-white/60 shadow-xs`}
              >
                <Icon className="h-5 w-5" />
              </div>
            </div>

            <div className="relative mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
              <div className="flex items-center gap-1">
                <span
                  className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
                    m.isPositive
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-rose-50 text-rose-700"
                  }`}
                >
                  {m.isPositive ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {m.change}
                </span>
                <span className="text-[11px] text-slate-400">{m.subtitle}</span>
              </div>

              {/* Sparkline Visualizer */}
              <div className="flex h-5 items-end gap-0.5">
                {m.sparkline.map((val, idx) => {
                  const heightPct = Math.max(20, Math.min(100, val))
                  return (
                    <div
                      className={`w-1 rounded-full ${m.accent} opacity-40 transition-all group-hover:opacity-90`}
                      key={idx}
                      style={{ height: `${heightPct}%` }}
                    />
                  )
                })}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
