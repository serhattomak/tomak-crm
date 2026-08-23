"use client";

import { ArrowRight, Filter, Layers, Plus } from "lucide-react";
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
            const pct = Math.max(10, Math.round((count / maxDeals) * 100));
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

  const hasData = totalCount > 0 || totalValue > 0;

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
                Satış Hunisi (Pipeline Aşamaları)
              </span>
              <div className="text-[11px] text-slate-500 font-medium">
                {hasData
                  ? `Toplam Hacim: ₺${totalValue.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`
                  : "Aşamalardaki aktif satış fırsatları"}
              </div>
            </div>
          </div>

          {hasData && (
            <span className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 font-bold text-[11px] text-slate-700 shadow-2xs">
              {totalCount} Aktif Fırsat
            </span>
          )}
        </div>

        {/* Funnel Visualizer */}
        {isLoading ? (
          <div className="space-y-3 py-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 w-full animate-pulse rounded-2xl bg-slate-50" />
            ))}
          </div>
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-slate-100 text-slate-400 mb-2.5 shadow-2xs">
              <Layers className="h-6 w-6" />
            </div>
            <h4 className="font-bold text-slate-800 text-xs">Henüz satış fırsatı bulunmuyor</h4>
            <p className="text-slate-400 text-[11px] mt-0.5 max-w-xs">
              Pipeline aşamalarınıza yeni fırsatlar ekleyerek dönüşüm oranlarınızı ve satış huninizi takip edin.
            </p>
            <Link
              href={`/${activeTenant?.slug || "workspace"}/pipelines`}
              className="mt-3 inline-flex items-center gap-1.5 rounded-2xl bg-indigo-600 px-3.5 py-1.5 font-bold text-white text-xs shadow-xs hover:bg-indigo-700 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Satış Fırsatı Ekle</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-2.5 pt-2">
            {stages.map((stage) => (
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

      {hasData && (
        <div className="mt-4 border-slate-100 border-t pt-3 text-center">
          <Link
            href={`/${activeTenant?.slug || "workspace"}/pipelines`}
            className="flex items-center justify-center gap-1 font-bold text-indigo-600 text-xs hover:text-indigo-700 transition"
          >
            <span>Pipeline Kanban Görünümünü Aç</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
