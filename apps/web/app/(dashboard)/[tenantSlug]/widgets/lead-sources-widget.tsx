"use client";

import { Info, PieChart } from "lucide-react";
import type { DateRange } from "./dashboard-types";

interface LeadSourcesWidgetProps {
  dateRange?: DateRange;
}

export function LeadSourcesWidget({ dateRange: _dateRange }: LeadSourcesWidgetProps) {
  const sources = [
    { name: "Google & Arama", count: 48, percentage: 38, color: "#8b5cf6" },
    { name: "Referans & Tavsiye", count: 32, percentage: 25, color: "#06b6d4" },
    { name: "LinkedIn & Sosyal", count: 25, percentage: 20, color: "#ec4899" },
    { name: "Doğrudan Web & Kampanya", count: 14, percentage: 11, color: "#10b981" },
    { name: "Diğer Kanallar", count: 8, percentage: 6, color: "#f59e0b" },
  ];

  const totalLeads = sources.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs transition-all hover:border-slate-300">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <PieChart className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm">Lead Kaynak Dağılımı</span>
              <div className="text-[11px] text-slate-500">Müşteri Adayı Kazanım Kanalları</div>
            </div>
          </div>

          <Info className="h-4 w-4 text-slate-400" />
        </div>

        {/* Donut Chart Visualizer + Centered Total */}
        <div className="my-3 flex items-center justify-center">
          <div className="relative flex h-32 w-32 items-center justify-center">
            <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
              {/* Segments */}
              {/* Google (38%) */}
              <circle
                cx="50"
                cy="50"
                fill="none"
                r="38"
                stroke="#8b5cf6"
                strokeDasharray="238"
                strokeDashoffset="0"
                strokeWidth="16"
              />
              {/* Referans (25%) */}
              <circle
                cx="50"
                cy="50"
                fill="none"
                r="38"
                stroke="#06b6d4"
                strokeDasharray="238"
                strokeDashoffset="90"
                strokeWidth="16"
              />
              {/* LinkedIn (20%) */}
              <circle
                cx="50"
                cy="50"
                fill="none"
                r="38"
                stroke="#ec4899"
                strokeDasharray="238"
                strokeDashoffset="150"
                strokeWidth="16"
              />
              {/* Kampanya (11%) */}
              <circle
                cx="50"
                cy="50"
                fill="none"
                r="38"
                stroke="#10b981"
                strokeDasharray="238"
                strokeDashoffset="198"
                strokeWidth="16"
              />
              {/* Diger (6%) */}
              <circle
                cx="50"
                cy="50"
                fill="none"
                r="38"
                stroke="#f59e0b"
                strokeDasharray="238"
                strokeDashoffset="224"
                strokeWidth="16"
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-extrabold text-xl text-slate-900">{totalLeads}</span>
              <span className="text-[10px] text-slate-400 font-medium">Toplam Lead</span>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-2 pt-2 text-xs">
          {sources.map((s) => (
            <div className="flex items-center justify-between" key={s.name}>
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <span className="text-slate-600 text-[11px]">{s.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 text-[11px]">{s.count}</span>
                <span className="text-[10px] text-slate-400">%{s.percentage}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 border-slate-100 border-t pt-3 text-center">
        <span className="font-semibold text-violet-600 text-xs">
          En yüksek dönüşüm: Referans kanalı (%54)
        </span>
      </div>
    </div>
  );
}
