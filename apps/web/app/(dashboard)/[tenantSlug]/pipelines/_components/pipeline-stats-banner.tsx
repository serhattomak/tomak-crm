"use client";

import { Card } from "@workspace/ui/components/card";
import { Award, Flame, TrendingUp, Users } from "lucide-react";
import type { DealStatsResponse } from "@/lib/api-client";
import { formatCurrency } from "./pipeline-helpers";

interface PipelineStatsBannerProps {
  stats: DealStatsResponse | null;
  unassignedCount: number;
}

export function PipelineStatsBanner({
  stats,
  unassignedCount,
}: PipelineStatsBannerProps) {
  const openValue = stats ? stats.totalOpenValue : 0;
  const currency = stats ? stats.currency : "TRY";
  const openCount = stats ? stats.openDealsCount : 0;
  const wonCount = stats ? stats.wonDealsCount : 0;
  const winRate = stats ? stats.winRatePercentage : 0;
  const slaCount = stats ? stats.slaBreachedCount : 0;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Pipeline Value */}
      <Card className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="block font-semibold text-3xs text-muted-foreground uppercase tracking-wider">
              Açık Fırsat Hacmi
            </span>
            <div className="mt-1.5 font-semibold text-2xl text-foreground tabular-nums tracking-tight">
              {formatCurrency(openValue, currency)}
            </div>
          </div>
          <div className="flex size-7 items-center justify-center rounded-md bg-accent-soft text-accent-foreground">
            <TrendingUp className="size-3.5" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 border-border border-t pt-2.5 text-2xs text-muted-foreground">
          <span>{openCount} Aktif Fırsat</span>
          <span className="text-border">•</span>
          <span>{wonCount} Kazanılan</span>
        </div>
      </Card>

      {/* Win Rate */}
      <Card className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="block font-semibold text-3xs text-muted-foreground uppercase tracking-wider">
              Kazanma Oranı
            </span>
            <div className="mt-1.5 font-semibold text-2xl text-foreground tabular-nums tracking-tight">
              %{winRate}
            </div>
          </div>
          <div className="flex size-7 items-center justify-center rounded-md bg-success-soft text-success-ink">
            <Award className="size-3.5" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 border-border border-t pt-2.5 font-medium text-2xs text-success-ink">
          <span>Başarıyla tamamlanan fırsatlar</span>
        </div>
      </Card>

      {/* Unassigned Pool */}
      <Card className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="block font-semibold text-3xs text-muted-foreground uppercase tracking-wider">
              Açık Havuz
            </span>
            <div className="mt-1.5 font-semibold text-2xl text-foreground tabular-nums tracking-tight">
              {unassignedCount}
            </div>
          </div>
          <div className="flex size-7 items-center justify-center rounded-md bg-warning-soft text-warning-ink">
            <Users className="size-3.5" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 border-border border-t pt-2.5 font-medium text-2xs text-warning-ink">
          <span>Temsilci ataması bekleyen kartlar</span>
        </div>
      </Card>

      {/* SLA Breached */}
      <Card className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="block font-semibold text-3xs text-muted-foreground uppercase tracking-wider">
              SLA Aşımı
            </span>
            <div className="mt-1.5 font-semibold text-2xl text-foreground tabular-nums tracking-tight">
              {slaCount}
            </div>
          </div>
          <div className="flex size-7 items-center justify-center rounded-md bg-danger-soft text-danger-ink">
            <Flame className="size-3.5" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 border-border border-t pt-2.5 font-medium text-2xs text-danger-ink">
          <span>Aşama yanıt süresi gecikenler</span>
        </div>
      </Card>
    </div>
  );
}
