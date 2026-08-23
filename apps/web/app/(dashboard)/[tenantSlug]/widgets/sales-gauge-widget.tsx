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
    <div className="flex h-full flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs transition-all hover:border-slate-300">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-fuchsia-50 text-fuchsia-600 shadow-2xs">
              <Trophy className="h-4.5 w-4.5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm">
                Satış Hedef Performansı
              </span>
              <div className="font-medium text-[11px] text-slate-500">
                Dönemsel Kota & Hedef Takibi
              </div>
            </div>
          </div>

          {hasData && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 font-bold text-[10px] text-emerald-700">
              <Sparkles className="h-3 w-3" />
              Aktif
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-28 w-full animate-pulse rounded-2xl bg-slate-50" />
          </div>
        ) : hasData ? (
          <>
            {/* Speedometer Radial Gauge */}
            <div className="relative my-3 flex flex-col items-center justify-center">
              <svg className="w-48 overflow-visible" viewBox="0 0 200 120">
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
                  d="M 20,110 A 80,80 0 0,1 180,110"
                  fill="none"
                  stroke="#f1f5f9"
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
              <div className="absolute top-12 flex flex-col items-center text-center">
                <div className="flex items-center gap-1">
                  <span className="font-extrabold text-4xl text-slate-900 tracking-tight">
                    %{currentScore}
                  </span>
                </div>
                <span className="font-medium text-[11px] text-slate-400">
                  Gerçekleşen: ₺
                  {totalRevenue.toLocaleString("tr-TR", {
                    maximumFractionDigits: 0,
                    minimumFractionDigits: 0,
                  })}
                </span>
              </div>
            </div>

            {/* Motivational message & Highlights */}
            <div className="mt-2 space-y-2 rounded-2xl bg-slate-50 p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-600">
                  Tamamlanan Siparişler:
                </span>
                <span className="font-bold text-slate-900">
                  {totalOrders} Adet
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-violet-500 to-fuchsia-500"
                  style={{ width: `${Math.max(5, currentScore)}%` }}
                />
              </div>
              <p className="font-medium text-[11px] text-slate-500 leading-relaxed">
                Dönemsel hedefin %{currentScore}&apos;una ulaşıldı.
              </p>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-3xl bg-slate-100 text-slate-400 shadow-2xs">
              <Target className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">
              Henüz kota veya sipariş verisi yok
            </h3>
            <p className="mt-1 max-w-xs text-slate-500 text-xs">
              İlk siparişinizi oluşturarak veya teklifleri kapatıp dönemsel
              hedef yüzdenizi takip etmeye başlayın.
            </p>
            <Link
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-fuchsia-600 px-3.5 py-2 font-bold text-white text-xs shadow-xs transition hover:bg-fuchsia-700"
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
          className="mt-4 flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white py-2.5 font-bold text-slate-800 text-xs shadow-2xs transition-colors hover:bg-slate-50 hover:text-fuchsia-600"
          href={`/${activeTenant?.slug || "workspace"}/orders`}
        >
          <span>Sipariş ve Hedef Detayları</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}
