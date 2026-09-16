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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Pipeline Value */}
      <Card className="rounded-lg border-border/80 p-4 shadow-xs">
        <div className="flex items-start justify-between">
          <div>
            <span className="font-medium text-muted-foreground text-xs">
              Açık Fırsat Hacmi
            </span>
            <div className="mt-1 font-bold text-2xl text-foreground tracking-tight sm:text-3xl">
              {formatCurrency(openValue, currency)}
            </div>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <TrendingUp className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 border-border/60 border-t pt-2 text-2xs text-muted-foreground">
          <span>{openCount} Aktif Fırsat</span>
          <span>•</span>
          <span>{wonCount} Kazanılan</span>
        </div>
      </Card>

      {/* Win Rate */}
      <Card className="rounded-lg border-border/80 p-4 shadow-xs">
        <div className="flex items-start justify-between">
          <div>
            <span className="font-medium text-muted-foreground text-xs">
              Kazanma Oranı (Win Rate)
            </span>
            <div className="mt-1 font-bold text-2xl text-foreground tracking-tight sm:text-3xl">
              %{winRate}
            </div>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
            <Award className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 border-border/60 border-t pt-2 font-medium text-2xs text-emerald-700 dark:text-emerald-300">
          <span>Başarıyla tamamlanan fırsatlar</span>
        </div>
      </Card>

      {/* Unassigned Pool */}
      <Card className="rounded-lg border-border/80 p-4 shadow-xs">
        <div className="flex items-start justify-between">
          <div>
            <span className="font-medium text-muted-foreground text-xs">
              Atanmamış / Açık Havuz
            </span>
            <div className="mt-1 font-bold text-2xl text-foreground tracking-tight sm:text-3xl">
              {unassignedCount}
            </div>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400">
            <Users className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 border-border/60 border-t pt-2 font-medium text-2xs text-amber-700 dark:text-amber-400">
          <span>Temsilci ataması bekleyen kartlar</span>
        </div>
      </Card>

      {/* SLA Breached */}
      <Card className="rounded-lg border-border/80 p-4 shadow-xs">
        <div className="flex items-start justify-between">
          <div>
            <span className="font-medium text-muted-foreground text-xs">
              SLA Aşımı / Kritik
            </span>
            <div className="mt-1 font-bold text-2xl text-foreground tracking-tight sm:text-3xl">
              {slaCount}
            </div>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <Flame className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 border-border/60 border-t pt-2 font-medium text-2xs text-rose-600 dark:text-rose-400">
          <span>Aşama yanıt süresi gecikenler</span>
        </div>
      </Card>
    </div>
  );
}
