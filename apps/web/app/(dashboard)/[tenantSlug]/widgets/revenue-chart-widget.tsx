"use client";

import { BarChart3, Info, Plus } from "lucide-react";
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
    <div className="flex h-full flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs transition-all hover:border-slate-300">
      <div>
        {/* Header and Controls */}
        <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 shadow-2xs">
              <BarChart3 className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                <span>Gelir & Satış Performansı</span>
                <Info className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <span className="font-medium text-[11px] text-slate-500">
                Dönemsel gerçekleşen satış ve teklif analitiği
              </span>
            </div>
          </div>

          {hasData && (
            <div className="flex items-center rounded-2xl bg-slate-100 p-0.5 text-xs">
              <button
                className={`rounded-xl px-3 py-1 font-semibold transition-all ${
                  activeMetric === "revenue"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                onClick={() => setActiveMetric("revenue")}
                type="button"
              >
                Gelir (₺)
              </button>
              <button
                className={`rounded-xl px-3 py-1 font-semibold transition-all ${
                  activeMetric === "deals"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
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
          <div className="flex h-48 items-center justify-center">
            <div className="h-32 w-full animate-pulse rounded-2xl bg-slate-50" />
          </div>
        ) : hasData ? (
          <div className="relative pt-6 pb-2">
            <div className="grid grid-cols-2 gap-3 py-4 sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                <span className="block font-semibold text-[11px] text-slate-500">
                  Toplam Sipariş Geliri
                </span>
                <span className="mt-1 block font-extrabold text-slate-900 text-xl">
                  ₺
                  {(orderStats?.totalRevenue || 0).toLocaleString("tr-TR", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                <span className="block font-semibold text-[11px] text-slate-500">
                  Tahsil Edilen
                </span>
                <span className="mt-1 block font-extrabold text-emerald-600 text-xl">
                  ₺
                  {(orderStats?.paidRevenue || 0).toLocaleString("tr-TR", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                <span className="block font-semibold text-[11px] text-slate-500">
                  Aktif Teklif Hacmi
                </span>
                <span className="mt-1 block font-extrabold text-violet-600 text-xl">
                  ₺
                  {Number(
                    quoteStats?.activeProposalsVolume || 0
                  ).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                <span className="block font-semibold text-[11px] text-slate-500">
                  Toplam Sipariş
                </span>
                <span className="mt-1 block font-extrabold text-slate-900 text-xl">
                  {totalOrders} Adet
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-3xl bg-slate-100 text-slate-400 shadow-2xs">
              <BarChart3 className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">
              Henüz satış veya ciro kaydı bulunmuyor
            </h3>
            <p className="mt-1 max-w-sm text-slate-500 text-xs">
              Müşterilerinize teklif hazırlayarak veya onaylanan teklifleri
              siparişe dönüştürerek gelir grafiklerinizi buradan takip
              edebilirsiniz.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <Link
                className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 font-bold text-white text-xs shadow-xs transition hover:bg-violet-700"
                href={`/${activeTenant?.slug || "workspace"}/quotes`}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Teklif Oluştur</span>
              </Link>
              <Link
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 font-bold text-slate-700 text-xs shadow-2xs transition hover:bg-slate-50"
                href={`/${activeTenant?.slug || "workspace"}/orders`}
              >
                <span>Siparişler</span>
              </Link>
            </div>
          </div>
        )}
      </div>

      {hasData && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-slate-100 border-t pt-4 text-xs">
          <div className="flex items-center gap-6">
            <div>
              <span className="font-medium text-[11px] text-slate-400">
                Toplam İşlem:
              </span>
              <div className="font-bold text-slate-900 text-sm">
                ₺
                {totalRevenue.toLocaleString("tr-TR", {
                  minimumFractionDigits: 2,
                })}
              </div>
            </div>
            <div>
              <span className="font-medium text-[11px] text-slate-400">
                Teslim Edilen:
              </span>
              <div className="font-bold text-emerald-600 text-sm">
                {orderStats?.deliveredOrders ?? 0} Sipariş
              </div>
            </div>
          </div>

          <Link
            className="flex items-center gap-1 font-bold text-violet-600 transition hover:text-violet-700"
            href={`/${activeTenant?.slug || "workspace"}/orders`}
          >
            <span>Tüm Siparişleri İncele →</span>
          </Link>
        </div>
      )}
    </div>
  );
}
