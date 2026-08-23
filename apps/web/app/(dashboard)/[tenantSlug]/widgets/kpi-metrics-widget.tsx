"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  FileSpreadsheet,
  Target,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ApiClient } from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";
import type { DateRange } from "./dashboard-types";

interface KpiMetricsWidgetProps {
  dateRange: DateRange;
}

export function KpiMetricsWidget({ dateRange }: KpiMetricsWidgetProps) {
  const { activeTenant } = usePermissions();
  const [isLoading, setIsLoading] = useState(true);
  const [quoteStats, setQuoteStats] = useState<any>(null);
  const [orderStats, setOrderStats] = useState<any>(null);
  const [customerStats, setCustomerStats] = useState<any>(null);
  const [dealStats, setDealStats] = useState<any>(null);

  const fetchLiveStats = useCallback(async () => {
    if (!activeTenant?.id) {
      return;
    }
    setIsLoading(true);
    try {
      const [quotesRes, ordersRes, customersRes, dealsRes] =
        await Promise.allSettled([
          ApiClient.getQuoteStats(activeTenant.id),
          ApiClient.getOrderStats(activeTenant.id),
          ApiClient.getCustomerStats(activeTenant.id),
          ApiClient.getDealStats(undefined, activeTenant.id),
        ]);

      if (
        quotesRes.status === "fulfilled" &&
        quotesRes.value.success &&
        quotesRes.value.data
      ) {
        setQuoteStats(quotesRes.value.data);
      }
      if (
        ordersRes.status === "fulfilled" &&
        ordersRes.value.success &&
        ordersRes.value.data
      ) {
        setOrderStats(ordersRes.value.data);
      }
      if (
        customersRes.status === "fulfilled" &&
        customersRes.value.success &&
        customersRes.value.data
      ) {
        setCustomerStats(customersRes.value.data);
      }
      if (
        dealsRes.status === "fulfilled" &&
        dealsRes.value.success &&
        dealsRes.value.data
      ) {
        setDealStats(dealsRes.value.data);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [activeTenant?.id]);

  useEffect(() => {
    fetchLiveStats();
  }, [fetchLiveStats]);

  // Derived Metrics
  const totalRevenue =
    (orderStats?.totalRevenue || 0) +
    (quoteStats?.activeProposalsVolume
      ? Number(quoteStats.activeProposalsVolume)
      : 0);
  const customersCount = customerStats?.totalCustomers ?? 0;
  const winRate = dealStats?.winRate ?? quoteStats?.conversionRate ?? 0;
  const activeQuotesCount = quoteStats?.totalQuotes ?? 0;
  const pendingApproval = quoteStats?.pendingApprovalCount ?? 0;

  const metrics = [
    {
      accent: "bg-emerald-500",
      change: "+14.2%",
      color:
        "from-emerald-500/20 to-teal-500/10 text-emerald-600 dark:text-emerald-400",
      icon: DollarSign,
      id: "revenue",
      isPositive: true,
      sparkline: [35, 42, 45, 58, 62, 75, 88],
      subtitle: `${orderStats?.totalOrders ?? 0} Sipariş + ${activeQuotesCount} Teklif`,
      title: "Toplam Gelir & Teklif Hacmi",
      value: `₺${totalRevenue.toLocaleString("tr-TR", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`,
    },
    {
      accent: "bg-violet-500",
      change: `+${customerStats?.leadCustomers ?? 0} Aday`,
      color:
        "from-violet-500/20 to-purple-500/10 text-violet-600 dark:text-violet-400",
      icon: Users,
      id: "customers",
      isPositive: true,
      sparkline: [20, 28, 35, 30, 48, 55, 68],
      subtitle: `${customerStats?.activeCustomers ?? 0} Aktif Müşteri`,
      title: "Müşteriler & Adaylar",
      value: customersCount.toString(),
    },
    {
      accent: "bg-blue-500",
      change: quoteStats?.expiredCount
        ? `${quoteStats.expiredCount} Süresi Dolan`
        : "Stabil",
      color: "from-blue-500/20 to-cyan-500/10 text-blue-600 dark:text-blue-400",
      icon: Target,
      id: "winRate",
      isPositive: true,
      sparkline: [52, 55, 58, 56, 61, 63, 65],
      subtitle: `${quoteStats?.acceptedCount ?? 0} Onaylanan Teklif`,
      title: "Teklif & Satış Kazanma",
      value: `%${winRate}`,
    },
    {
      accent: "bg-amber-500",
      change: pendingApproval > 0 ? `${pendingApproval} Onay` : "Güncel",
      color:
        "from-amber-500/20 to-orange-500/10 text-amber-600 dark:text-amber-400",
      icon: FileSpreadsheet,
      id: "proposals",
      isPositive: pendingApproval === 0,
      sparkline: [12, 15, 18, 14, 16, 15, 17],
      subtitle:
        pendingApproval > 0
          ? `${pendingApproval} Yönetici Onayı Bekliyor`
          : "Onay bekleyen yok",
      title: "Açık Teklifler & Onay",
      value: `${activeQuotesCount} Teklif`,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((m) => {
        const Icon = m.icon;
        return (
          <div
            className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
            key={m.id}
          >
            {/* Background subtle gradient glow */}
            <div
              className={`absolute -top-8 -right-8 h-24 w-24 rounded-full bg-gradient-to-br ${m.color} opacity-60 blur-2xl transition-opacity group-hover:opacity-100`}
            />

            <div className="relative flex items-start justify-between">
              <div className="space-y-1">
                <span className="font-semibold text-slate-500 text-xs">
                  {m.title}
                </span>
                <div className="font-extrabold text-2xl text-slate-900 tracking-tight sm:text-3xl">
                  {isLoading ? (
                    <span className="inline-block h-8 w-28 animate-pulse rounded-lg bg-slate-100" />
                  ) : (
                    m.value
                  )}
                </div>
              </div>
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${m.color} border border-white/60 shadow-xs`}
              >
                <Icon className="h-5 w-5" />
              </div>
            </div>

            <div className="relative mt-4 flex items-center justify-between border-slate-100 border-t pt-3">
              <div className="flex items-center gap-1.5">
                <span
                  className={`inline-flex items-center gap-0.5 rounded-lg px-2 py-0.5 font-bold text-[10px] ${
                    m.isPositive
                      ? "border border-emerald-200/60 bg-emerald-50 text-emerald-700"
                      : "border border-amber-200/60 bg-amber-50 text-amber-700"
                  }`}
                >
                  {m.isPositive ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {m.change}
                </span>
                <span className="font-medium text-[11px] text-slate-400">
                  {m.subtitle}
                </span>
              </div>

              {/* Sparkline Visualizer */}
              <div className="flex h-5 items-end gap-0.5">
                {m.sparkline.map((val, idx) => {
                  const heightPct = Math.max(20, Math.min(100, val));
                  return (
                    <div
                      className={`w-1 rounded-full ${m.accent} opacity-40 transition-all group-hover:opacity-90`}
                      key={idx}
                      style={{ height: `${heightPct}%` }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
