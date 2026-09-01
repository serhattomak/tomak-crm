/* Hallmark · component: sales-gauge · genre: modern-minimal · theme: Adaptive Zinc/Violet */
"use client";

import { ArrowRight, Plus, Sparkles, Target, Trophy } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ApiClient } from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";
import type { DateRange } from "./dashboard-types";

interface SalesGaugeWidgetProps {
  dateRange?: DateRange;
}

export function SalesGaugeWidget({
  dateRange: _dateRange,
}: SalesGaugeWidgetProps) {
  const { activeTenant } = usePermissions();
  const [orderStats, setOrderStats] = useState<any>(null);
  const [quoteStats, setQuoteStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!activeTenant?.id) {
      return;
    }
    setIsLoading(true);
    try {
      const [ordersRes, quotesRes] = await Promise.allSettled([
        ApiClient.getOrderStats(activeTenant.id),
        ApiClient.getQuoteStats(activeTenant.id),
      ]);
      if (ordersRes.status === "fulfilled" && ordersRes.value.success) {
        setOrderStats(ordersRes.value.data);
      }
      if (quotesRes.status === "fulfilled" && quotesRes.value.success) {
        setQuoteStats(quotesRes.value.data);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [activeTenant?.id]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const totalRevenue =
    (orderStats?.totalRevenue || 0) +
    (quoteStats?.activeProposalsVolume
      ? Number(quoteStats.activeProposalsVolume)
      : 0);
  const totalOrders = orderStats?.totalOrders || 0;
  const targetRevenue = 250_000; // Benchmark period target
  const currentScore =
    targetRevenue > 0
      ? Math.min(100, Math.round((totalRevenue / targetRevenue) * 100))
      : 0;
  const hasData = totalRevenue > 0 || totalOrders > 0;

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-2xs transition-all hover:border-zinc-300 dark:border-zinc-800/90 dark:bg-zinc-900/90 dark:hover:border-zinc-700">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-600 shadow-2xs dark:bg-violet-950/60 dark:text-violet-400">
              <Trophy className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                Satış Hedef Performansı
              </span>
              <div className="font-medium text-[11px] text-zinc-500 dark:text-zinc-400">
                Dönemsel Kota & Hedef Takibi
              </div>
            </div>
          </div>

          {hasData && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/60 bg-emerald-50 px-2.5 py-0.5 font-bold text-[10px] text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/60 dark:text-emerald-300">
              <Sparkles className="h-3 w-3" />
              Aktif
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-28 w-full animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
          </div>
        ) : hasData ? (
          <>
            {/* Speedometer Radial Gauge */}
            <div className="relative my-2 flex flex-col items-center justify-center">
              <svg className="w-44 overflow-visible" viewBox="0 0 200 120">
                <defs>
                  <linearGradient
                    id="salesGaugeGrad"
                    x1="0%"
                    x2="100%"
                    y1="100%"
                    y2="0%"
                  >
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="50%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                </defs>

                {/* Background track */}
                <path
                  className="stroke-zinc-100 dark:stroke-zinc-800"
                  d="M 20,110 A 80,80 0 0,1 180,110"
                  fill="none"
                  strokeLinecap="round"
                  strokeWidth="14"
                />
                {/* Active Neon track */}
                <path
                  d="M 20,110 A 80,80 0 0,1 168,60"
                  fill="none"
                  stroke="url(#salesGaugeGrad)"
                  strokeLinecap="round"
                  strokeWidth="14"
                />
              </svg>

              {/* Centered Score */}
              <div className="absolute top-10 flex flex-col items-center text-center">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-3xl text-zinc-900 tracking-tight dark:text-zinc-100">
                    %{currentScore}
                  </span>
                </div>
                <span className="font-medium text-[11px] text-zinc-400 dark:text-zinc-500">
                  Gerçekleşen: ₺
                  {totalRevenue.toLocaleString("tr-TR", {
                    maximumFractionDigits: 0,
                    minimumFractionDigits: 0,
                  })}
                </span>
              </div>
            </div>

            {/* Highlights */}
            <div className="mt-2 space-y-2 rounded-xl border border-zinc-100 bg-zinc-50/70 p-3 text-xs dark:border-zinc-800/80 dark:bg-zinc-800/50">
              <div className="flex items-center justify-between">
                <span className="font-medium text-zinc-600 dark:text-zinc-400">
                  Tamamlanan Siparişler:
                </span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">
                  {totalOrders} Adet
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-violet-500 to-fuchsia-500"
                  style={{ width: `${Math.max(5, currentScore)}%` }}
                />
              </div>
              <p className="font-medium text-[11px] text-zinc-500 leading-relaxed dark:text-zinc-400">
                Dönemsel hedefin %{currentScore}&apos;una ulaşıldı.
              </p>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 shadow-2xs dark:bg-zinc-800 dark:text-zinc-500">
              <Target className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-xs text-zinc-800 dark:text-zinc-200">
              Henüz kota veya sipariş verisi yok
            </h3>
            <p className="mt-1 max-w-xs text-[11px] text-zinc-500 dark:text-zinc-400">
              İlk siparişinizi oluşturarak veya teklifleri kapatıp dönemsel
              hedef yüzdenizi takip etmeye başlayın.
            </p>
            <Link
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 py-1.5 font-bold text-white text-xs shadow-xs transition hover:bg-violet-700 active:scale-95"
              href={`/${activeTenant?.slug || "workspace"}/orders`}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Sipariş / Teklif Oluştur</span>
            </Link>
          </div>
        )}
      </div>

      {hasData && (
        <Link
          className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white py-2 font-bold text-xs text-zinc-800 shadow-2xs transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          href={`/${activeTenant?.slug || "workspace"}/orders`}
        >
          <span>Sipariş ve Hedef Detayları</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}
