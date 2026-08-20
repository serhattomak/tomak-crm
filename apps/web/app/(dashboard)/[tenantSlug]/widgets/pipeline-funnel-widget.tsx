"use client";

import { ArrowRight, Filter } from "lucide-react";
import type { DateRange } from "./dashboard-types";

interface PipelineFunnelWidgetProps {
  dateRange?: DateRange;
}

export function PipelineFunnelWidget({
  dateRange: _dateRange,
}: PipelineFunnelWidgetProps) {
  const stages = [
    {
      barWidth: "w-full",
      color: "bg-blue-500",
      conversion: "100%",
      count: 48,
      id: "discovery",
      name: "1. Yeni Talep / Keşif",
      value: 360_000,
    },
    {
      barWidth: "w-[85%]",
      color: "bg-indigo-500",
      conversion: "75%",
      count: 36,
      id: "contacted",
      name: "2. İletişim & Değerlendirme",
      value: 285_000,
    },
    {
      barWidth: "w-[68%]",
      color: "bg-violet-500",
      conversion: "50%",
      count: 24,
      id: "proposal",
      name: "3. Teklif Hazırlandı",
      value: 210_000,
    },
    {
      barWidth: "w-[50%]",
      color: "bg-fuchsia-500",
      conversion: "31%",
      count: 15,
      id: "negotiation",
      name: "4. Müzakere & Sözleşme",
      value: 155_000,
    },
    {
      barWidth: "w-[35%]",
      color: "bg-emerald-500",
      conversion: "23%",
      count: 11,
      id: "won",
      name: "5. Başarıyla Kazanıldı",
      value: 118_000,
    },
  ];

  const totalPipelineValue = stages.reduce((acc, s) => acc + s.value, 0);

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs transition-all hover:border-slate-300">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Filter className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm">
                Satış Hunisi (Pipeline Stages)
              </span>
              <div className="text-[11px] text-slate-500">
                Toplam Hacim: ₺{totalPipelineValue.toLocaleString("tr-TR")}
              </div>
            </div>
          </div>

          <span className="rounded-xl border border-slate-200 px-2.5 py-1 font-semibold text-[11px] text-slate-600">
            {stages[0]?.count ?? 0} Aktif Fırsat
          </span>
        </div>

        {/* Funnel Visualizer */}
        <div className="space-y-3 pt-2">
          {stages.map((stage) => (
            <div
              className="group rounded-xl p-2 transition-colors hover:bg-slate-50"
              key={stage.id}
            >
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${stage.color}`} />
                  <span className="font-semibold text-slate-800">
                    {stage.name}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-[11px] text-slate-400">
                    {stage.count} Fırsat
                  </span>
                  <span className="font-bold text-slate-900">
                    ₺{stage.value.toLocaleString("tr-TR")}
                  </span>
                </div>
              </div>

              {/* Progress bar representing funnel width */}
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${stage.color} transition-all duration-500`}
                  style={{ width: stage.conversion }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-slate-100 border-t pt-3 text-xs">
        <span className="text-[11px] text-slate-500">
          Toplam Dönüşüm Oranı: %23
        </span>
        <button
          className="flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-700"
          type="button"
        >
          <span>Pipeline Kanbanını Aç</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
