/* Hallmark · component: pipeline-funnel · genre: modern-minimal · theme: Adaptive Zinc/Violet */
"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { EmptyState } from "@workspace/ui/components/empty-state";
import { Skeleton } from "@workspace/ui/components/skeleton";
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
    <Card className="flex h-full flex-col justify-between">
      <div>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Filter className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="font-semibold text-sm tracking-tight">
                Satış Hunisi (Pipeline Aşamaları)
              </CardTitle>
              <p className="text-[11px] text-muted-foreground">
                {hasData
                  ? `Toplam Hacim: ₺${totalValue.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`
                  : "Aşamalardaki aktif satış fırsatları"}
              </p>
            </div>
          </div>

          {hasData && (
            <Badge className="text-[11px]" variant="accent">
              {totalCount} Aktif Fırsat
            </Badge>
          )}
        </CardHeader>

        {/* Funnel Visualizer */}
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="space-y-2.5 py-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : hasData ? (
            <div className="space-y-2 pt-1">
              {stages.map((stage) => (
                <div
                  className="group rounded-lg p-2 transition-colors hover:bg-muted/40"
                  key={stage.id}
                >
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${stage.color} flex-none`}
                      />
                      <span className="font-semibold text-foreground">
                        {stage.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 font-semibold">
                      <span className="font-medium text-[11px] text-muted-foreground">
                        {stage.count} Fırsat
                      </span>
                      <span className="font-semibold text-foreground">
                        ₺
                        {stage.value.toLocaleString("tr-TR", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar representing funnel width */}
                  <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${stage.color} transition-all duration-500`}
                      style={{ width: stage.conversion }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              action={
                <Button asChild size="sm" variant="outline">
                  <Link
                    href={`/${activeTenant?.slug || "workspace"}/pipelines`}
                  >
                    Satış Fırsatı Ekle
                  </Link>
                </Button>
              }
              description="Pipeline aşamalarınıza yeni fırsatlar ekleyerek dönüşüm oranlarınızı ve satış huninizi takip edin."
              icon={Layers}
              title="Henüz satış fırsatı bulunmuyor"
            />
          )}
        </CardContent>
      </div>

      {hasData && (
        <CardFooter className="justify-center border-border/80 border-t pt-2 pb-3">
          <Link
            className="flex items-center justify-center gap-1 font-semibold text-primary text-xs transition hover:underline"
            href={`/${activeTenant?.slug || "workspace"}/pipelines`}
          >
            <span>Pipeline Kanban Görünümünü Aç</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardFooter>
      )}
    </Card>
  );
}
