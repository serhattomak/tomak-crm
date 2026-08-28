/* Hallmark · component: pipeline-funnel · genre: modern-minimal · theme: Adaptive Zinc/Violet */
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
  color: string;
  conversion: string;
  count: number;
  id: string;
  name: string;
  value: number;
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
    if (!activeTenant?.id) {
      return;
    }
    setIsLoading(true);
    try {
      const pipelinesRes = await ApiClient.getPipelines(activeTenant.id);
      if (
        pipelinesRes.success &&
        pipelinesRes.data &&
        pipelinesRes.data.length > 0
      ) {
        const defaultPipeline = pipelinesRes.data[0];
        if (defaultPipeline?.stages && defaultPipeline.stages.length > 0) {
          const maxDeals = Math.max(
            ...defaultPipeline.stages.map((s) => s.dealsCount || 0),
            1
          );
          let sumVal = 0;
          let sumCount = 0;

          const mapped: FunnelStage[] = defaultPipeline.stages.map((s, idx) => {
            const count = s.dealsCount || 0;
            const val = s.dealsTotalValue || 0;
            sumVal += val;
            sumCount += count;
            const pct = Math.max(10, Math.round((count / maxDeals) * 100));
            return {
              color: s.color
                ? `bg-[${s.color}]`
                : stageColors[idx % stageColors.length] || "bg-indigo-500",
              conversion: `${pct}%`,
              count,
              id: s.id,
              name: s.name,
              value: val,
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
    <div className="flex h-full flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-2xs transition-all hover:border-zinc-300 dark:border-zinc-800/90 dark:bg-zinc-900/90 dark:hover:border-zinc-700">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400 shadow-2xs dark:bg-violet-950/60 dark:text-violet-400">
              <Filter className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-zinc-900 text-sm dark:text-zinc-100">
                Satış Hunisi (Pipeline Aşamaları)
              </span>
              <div className="font-medium text-[11px] text-zinc-500 dark:text-zinc-400">
                {hasData
                  ? `Toplam Hacim: ₺${totalValue.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`
                  : "Aşamalardaki aktif satış fırsatları"}
              </div>
            </div>
          </div>

          {hasData && (
            <span className="rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-1 font-bold text-[11px] text-zinc-700 shadow-2xs dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
              {totalCount} Aktif Fırsat
            </span>
          )}
        </div>

        {/* Funnel Visualizer */}
        {isLoading ? (
          <div className="space-y-2.5 py-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                className="h-10 w-full animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800"
                key={i}
              />
            ))}
          </div>
        ) : hasData ? (
          <div className="space-y-2 pt-1">
            {stages.map((stage) => (
              <div
                className="group rounded-xl p-2 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                key={stage.id}
              >
                <div className="mb-1 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${stage.color} flex-none`}
                    />
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">
                      {stage.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 font-semibold">
                    <span className="font-medium text-[11px] text-zinc-400 dark:text-zinc-500">
                      {stage.count} Fırsat
                    </span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">
                      ₺
                      {stage.value.toLocaleString("tr-TR", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>

                {/* Progress bar representing funnel width */}
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className={`h-full rounded-full ${stage.color} transition-all duration-500`}
                    style={{ width: stage.conversion }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-7 text-center">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 shadow-2xs dark:bg-zinc-800 dark:text-zinc-500">
              <Layers className="h-5 w-5" />
            </div>
            <h4 className="font-bold text-zinc-800 text-xs dark:text-zinc-200">
              Henüz satış fırsatı bulunmuyor
            </h4>
            <p className="mt-0.5 max-w-xs text-[11px] text-zinc-400 dark:text-zinc-500">
              Pipeline aşamalarınıza yeni fırsatlar ekleyerek dönüşüm
              oranlarınızı ve satış huninizi takip edin.
            </p>
            <Link
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 py-1.5 font-bold text-white text-xs shadow-xs transition hover:bg-violet-700 active:scale-95"
              href={`/${activeTenant?.slug || "workspace"}/pipelines`}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Satış Fırsatı Ekle</span>
            </Link>
          </div>
        )}
      </div>

      {hasData && (
        <div className="mt-3 border-t border-zinc-100 pt-2.5 text-center dark:border-zinc-800/80">
          <Link
            className="flex items-center justify-center gap-1 font-bold text-violet-600 text-xs transition hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
            href={`/${activeTenant?.slug || "workspace"}/pipelines`}
          >
            <span>Pipeline Kanban Görünümünü Aç</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
