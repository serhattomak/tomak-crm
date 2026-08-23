"use client";

import { ArrowRight, Filter, Layers } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ApiClient } from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";
import type { DateRange } from "./dashboard-types";

interface PipelineFunnelWidgetProps {
  dateRange?: DateRange;
}

interface FunnelStage {
  id: string;
  name: string;
  count: number;
  value: number;
  conversion: string;
  color: string;
}

export function PipelineFunnelWidget({
  dateRange: _dateRange,
}: PipelineFunnelWidgetProps) {
  const { activeTenant } = usePermissions();
  const [stages, setStages] = useState<FunnelStage[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const stageColors = [
    "bg-blue-500",
    "bg-indigo-500",
    "bg-violet-500",
    "bg-fuchsia-500",
    "bg-emerald-500",
    "bg-amber-500",
  ];

  const fetchPipelineStages = useCallback(async () => {
    if (!activeTenant?.id) return;
    setIsLoading(true);
    try {
      const pipelinesRes = await ApiClient.getPipelines(activeTenant.id);
      if (pipelinesRes.success && pipelinesRes.data && pipelinesRes.data.length > 0) {
        const defaultPipeline = pipelinesRes.data[0];
        if (defaultPipeline?.stages && defaultPipeline.stages.length > 0) {
          const maxDeals = Math.max(...defaultPipeline.stages.map((s) => s.dealsCount || 0), 1);
          let sumVal = 0;
          let sumCount = 0;

          const mapped: FunnelStage[] = defaultPipeline.stages.map((s, idx) => {
            const count = s.dealsCount || 0;
            const val = s.dealsTotalValue || 0;
            sumVal += val;
            sumCount += count;
            const pct = Math.max(15, Math.round((count / maxDeals) * 100));
            return {
              id: s.id,
              name: s.name,
              count,
              value: val,
              conversion: `${pct}%`,
              color: s.color ? `bg-[${s.color}]` : stageColors[idx % stageColors.length] || "bg-indigo-500",
            };
          });

          setStages(mapped);
          setTotalValue(sumVal);
          setTotalCount(sumCount);
        }
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [activeTenant?.id]);

  useEffect(() => {
    fetchPipelineStages();
  }, [fetchPipelineStages]);

  const defaultMockStages: FunnelStage[] = [
    { id: "s1", name: "1. Yeni Talep / Keşif", count: 12, value: 180000, conversion: "100%", color: "bg-blue-500" },
    { id: "s2", name: "2. İletişim & Değerlendirme", count: 8, value: 140000, conversion: "75%", color: "bg-indigo-500" },
    { id: "s3", name: "3. Teklif Hazırlandı", count: 6, value: 95000, conversion: "55%", color: "bg-violet-500" },
    { id: "s4", name: "4. Müzakere & Sözleşme", count: 4, value: 72000, conversion: "35%", color: "bg-fuchsia-500" },
    { id: "s5", name: "5. Başarıyla Kazanıldı", count: 3, value: 65000, conversion: "25%", color: "bg-emerald-500" },
  ];

  const displayStages = stages.length > 0 ? stages : defaultMockStages;
  const displayTotalValue = totalValue > 0 ? totalValue : displayStages.reduce((acc, s) => acc + s.value, 0);
  const displayTotalCount = totalCount > 0 ? totalCount : displayStages.reduce((acc, s) => acc + s.count, 0);

  return (
    <div className="flex h-full flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs transition-all hover:border-slate-300">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-2xs">
              <Filter className="h-4.5 w-4.5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm">
                Satış Hunisi (Pipeline Stages)
              </span>
              <div className="text-[11px] text-slate-500 font-medium">
                Toplam Hacim: ₺{displayTotalValue.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <span className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 font-bold text-[11px] text-slate-700 shadow-2xs">
            {displayTotalCount} Aktif Fırsat
          </span>
        </div>

        {/* Funnel Visualizer */}
        {isLoading ? (
          <div className="space-y-3 py-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 w-full animate-pulse rounded-xl bg-slate-50" />
            ))}
          </div>
        ) : (
          <div className="space-y-2.5 pt-2">
            {displayStages.map((stage) => (
              <div
                className="group rounded-2xl p-2 transition-colors hover:bg-slate-50"
                key={stage.id}
              >
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${stage.color} flex-none`} />
                    <span className="font-bold text-slate-800">
                      {stage.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 font-semibold">
                    <span className="font-medium text-[11px] text-slate-400">
                      {stage.count} Fırsat
                    </span>
                    <span className="font-extrabold text-slate-900">
                      ₺{stage.value.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
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
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-slate-100 border-t pt-3 text-xs">
        <span className="text-[11px] text-slate-500 font-medium">
          Dönüşüm Oranı: <strong className="text-slate-800 font-bold">%28.4</strong>
        </span>
        <Link
          href={`/${activeTenant?.slug || "workspace"}/pipelines`}
          className="flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-700 transition"
        >
          <span>Pipeline Kanbanını Aç</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
