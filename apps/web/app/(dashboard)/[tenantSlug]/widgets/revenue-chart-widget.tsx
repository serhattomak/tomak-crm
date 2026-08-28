/* Hallmark · component: revenue-chart · genre: modern-minimal · theme: Adaptive Zinc/Violet */
"use client";

import { BarChart3, Info, Plus, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ApiClient } from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";
import type { DateRange } from "./dashboard-types";

interface RevenueChartWidgetProps {
  dateRange?: DateRange;
}

export function RevenueChartWidget({
  dateRange: _dateRange,
}: RevenueChartWidgetProps) {
  const { activeTenant } = usePermissions();
  const [activeMetric, setActiveMetric] = useState<
    "revenue" | "deals" | "margin"
  >("revenue");
  const [isLoading, setIsLoading] = useState(true);
  const [orderStats, setOrderStats] = useState<any>(null);
  const [quoteStats, setQuoteStats] = useState<any>(null);

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
  const hasData = totalRevenue > 0 || totalOrders > 0;

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-2xs transition-all hover:border-zinc-300 dark:border-zinc-800/90 dark:bg-zinc-900/90 dark:hover:border-zinc-700">
      <div>
        {/* Header and Controls */}
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400 shadow-2xs dark:bg-violet-950/60 dark:text-violet-400">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-bold text-zinc-900 text-sm dark:text-zinc-100">
                <span>Gelir & Satış Performansı</span>
                <Info className="h-3 w-3 text-zinc-400 dark:text-zinc-500" />
              </div>
              <span className="font-medium text-[11px] text-zinc-500 dark:text-zinc-400">
                Dönemsel gerçekleşen satış ve teklif analitiği
              </span>
            </div>
          </div>

          {hasData && (
            <div className="flex items-center rounded-xl bg-zinc-100/90 p-0.5 text-xs dark:bg-zinc-800/80">
              <button
                className={`rounded-lg px-3 py-1 font-semibold transition-all ${
                  activeMetric === "revenue"
                    ? "bg-white text-zinc-900 shadow-2xs dark:bg-zinc-700 dark:text-zinc-100"
                    : "text-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-400 dark:hover:text-zinc-200"
                }`}
                onClick={() => setActiveMetric("revenue")}
                type="button"
              >
                Gelir (₺)
              </button>
              <button
                className={`rounded-lg px-3 py-1 font-semibold transition-all ${
                  activeMetric === "deals"
                    ? "bg-white text-zinc-900 shadow-2xs dark:bg-zinc-700 dark:text-zinc-100"
                    : "text-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-400 dark:hover:text-zinc-200"
                }`}
                onClick={() => setActiveMetric("deals")}
                type="button"
              >
                Siparişler
              </button>
            </div>
          )}
        </div>

        {/* Content Area */}
        {isLoading ? (
          <div className="flex h-44 items-center justify-center">
            <div className="h-28 w-full animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
          </div>
        ) : hasData ? (
          <div className="relative pt-2 pb-1">
            <div className="grid grid-cols-2 gap-3 py-2 sm:grid-cols-4">
              <div className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-3.5 dark:border-zinc-800/80 dark:bg-zinc-800/50">
                <span className="block font-semibold text-[11px] text-zinc-500 dark:text-zinc-400">
                  Toplam Sipariş Geliri
                </span>
                <span className="mt-1 block font-bold text-zinc-900 text-lg dark:text-zinc-100">
                  ₺
                  {(orderStats?.totalRevenue || 0).toLocaleString("tr-TR", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-3.5 dark:border-zinc-800/80 dark:bg-zinc-800/50">
                <span className="block font-semibold text-[11px] text-zinc-500 dark:text-zinc-400">
                  Tahsil Edilen
                </span>
                <span className="mt-1 block font-bold text-emerald-600 text-lg dark:text-emerald-400">
                  ₺
                  {(orderStats?.paidRevenue || 0).toLocaleString("tr-TR", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-3.5 dark:border-zinc-800/80 dark:bg-zinc-800/50">
                <span className="block font-semibold text-[11px] text-zinc-500 dark:text-zinc-400">
                  Aktif Teklif Hacmi
                </span>
                <span className="mt-1 block font-bold text-violet-600 text-lg dark:text-violet-400">
                  ₺
                  {Number(
                    quoteStats?.activeProposalsVolume || 0
                  ).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-3.5 dark:border-zinc-800/80 dark:bg-zinc-800/50">
                <span className="block font-semibold text-[11px] text-zinc-500 dark:text-zinc-400">
                  Toplam Sipariş
                </span>
                <span className="mt-1 block font-bold text-zinc-900 text-lg dark:text-zinc-100">
                  {totalOrders} Adet
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 shadow-2xs dark:bg-zinc-800 dark:text-zinc-500">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-zinc-800 text-xs dark:text-zinc-200">
              Henüz satış veya ciro kaydı bulunmuyor
            </h3>
            <p className="mt-1 max-w-sm text-zinc-500 text-[11px] dark:text-zinc-400">
              Müşterilerinize teklif hazırlayarak veya onaylanan teklifleri
              siparişe dönüştürerek gelir grafiklerinizi buradan takip
              edebilirsiniz.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Link
                className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 py-1.5 font-bold text-white text-xs shadow-xs transition hover:bg-violet-700 active:scale-95"
                href={`/${activeTenant?.slug || "workspace"}/quotes`}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Teklif Oluştur</span>
              </Link>
              <Link
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-1.5 font-bold text-zinc-700 text-xs shadow-2xs transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                href={`/${activeTenant?.slug || "workspace"}/orders`}
              >
                <span>Siparişler</span>
              </Link>
            </div>
          </div>
        )}
      </div>

      {hasData && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4 border-t border-zinc-100 pt-3 text-xs dark:border-zinc-800/80">
          <div className="flex items-center gap-5">
            <div>
              <span className="font-medium text-[10px] text-zinc-400 dark:text-zinc-500">
                Toplam İşlem:
              </span>
              <div className="font-bold text-zinc-900 text-xs dark:text-zinc-100">
                ₺
                {totalRevenue.toLocaleString("tr-TR", {
                  minimumFractionDigits: 2,
                })}
              </div>
            </div>
            <div>
              <span className="font-medium text-[10px] text-zinc-400 dark:text-zinc-500">
                Teslim Edilen:
              </span>
              <div className="font-bold text-emerald-600 text-xs dark:text-emerald-400">
                {orderStats?.deliveredOrders ?? 0} Sipariş
              </div>
            </div>
          </div>

          <Link
            className="flex items-center gap-1 font-bold text-violet-600 transition hover:text-violet-700 dark:hover:text-violet-400 text-xs"
            href={`/${activeTenant?.slug || "workspace"}/orders`}
          >
            <span>Tüm Siparişleri İncele →</span>
          </Link>
        </div>
      )}
    </div>
  );
}
