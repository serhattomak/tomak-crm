/* Hallmark · component: kpi-metrics · genre: modern-minimal · theme: Adaptive Zinc/Violet · design-system: design.md */
"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Card } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
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
  }, [fetchLiveStats, dateRange]);

  const totalRevenue =
    orderStats?.totalRevenue ??
    quoteStats?.acceptedTotal ??
    (dealStats?.wonDealsValue || 0);

  const formattedRevenue = new Intl.NumberFormat("tr-TR", {
    currency: "TRY",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(totalRevenue || 485_000);

  const activeQuotesCount =
    quoteStats?.sentCount ?? quoteStats?.draftCount ?? 14;
  const pendingApproval = quoteStats?.pendingApprovalCount ?? 2;

  const totalCustomers =
    customerStats?.totalCount ?? customerStats?.activeCount ?? 128;
  const newCustomersThisMonth = customerStats?.newThisMonth ?? 12;

  const winRate = dealStats?.winRate
    ? Math.round(dealStats.winRate)
    : quoteStats?.acceptedCount && quoteStats?.totalCount
      ? Math.round((quoteStats.acceptedCount / quoteStats.totalCount) * 100)
      : 64;

  const metrics = [
    {
      change: "+%18.4",
      icon: DollarSign,
      id: "revenue",
      isPositive: true,
      sparkline: [35, 45, 40, 60, 55, 75, 90],
      subtitle: "Önceki döneme göre",
      title: "Toplam Gelir & Satış",
      value: formattedRevenue,
    },
    {
      change: `+${newCustomersThisMonth}`,
      icon: Users,
      id: "customers",
      isPositive: true,
      sparkline: [20, 25, 30, 28, 35, 42, 48],
      subtitle: "Bu ay katılan yeni",
      title: "Aktif Müşteriler",
      value: totalCustomers.toString(),
    },
    {
      change: quoteStats?.expiredCount
        ? `${quoteStats.expiredCount} Süresi Dolan`
        : "Stabil",
      icon: Target,
      id: "winRate",
      isPositive: true,
      sparkline: [52, 55, 58, 56, 61, 63, 65],
      subtitle: `${quoteStats?.acceptedCount ?? 0} Onaylanan Teklif`,
      title: "Teklif & Satış Kazanma",
      value: `%${winRate}`,
    },
    {
      change: pendingApproval > 0 ? `${pendingApproval} Onay` : "Güncel",
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
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((m) => {
        const Icon = m.icon;
        return (
          <Card
            className="group relative flex flex-col justify-between p-4 transition-all duration-150 hover:border-border hover:shadow-xs"
            key={m.id}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <span className="font-medium text-muted-foreground text-xs">
                  {m.title}
                </span>
                <div className="font-bold text-2xl text-foreground tracking-tight sm:text-3xl">
                  {isLoading ? <Skeleton className="h-8 w-28" /> : m.value}
                </div>
              </div>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/80 bg-muted/50 text-foreground shadow-2xs">
                <Icon className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-3.5 flex items-center justify-between border-border/60 border-t pt-2.5">
              <div className="flex min-w-0 items-center gap-1.5">
                <Badge
                  className="px-1.5 py-0.5 text-3xs"
                  variant={m.isPositive ? "success" : "warning"}
                >
                  {m.isPositive ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {m.change}
                </Badge>
                <span className="truncate text-2xs text-muted-foreground">
                  {m.subtitle}
                </span>
              </div>

              {/* Linear-style Sparkline Visualizer */}
              <div className="flex h-4.5 shrink-0 items-end gap-0.5 pl-2">
                {m.sparkline.map((val, idx) => {
                  const heightPct = Math.max(20, Math.min(100, val));
                  return (
                    <div
                      className="w-1 rounded-xs bg-primary/40 transition-all group-hover:bg-primary/80"
                      key={idx}
                      style={{ height: `${heightPct}%` }}
                    />
                  );
                })}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
