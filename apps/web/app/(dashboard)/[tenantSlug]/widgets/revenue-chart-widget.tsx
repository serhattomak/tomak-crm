/* Hallmark · component: revenue-chart · genre: modern-minimal · theme: Adaptive Zinc/Violet */
"use client";

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
import { BarChart3, Info } from "lucide-react";
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
    <Card className="flex h-full flex-col justify-between">
      <div>
        {/* Header and Controls */}
        <CardHeader className="flex flex-col justify-between gap-3 pb-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <CardTitle className="font-semibold text-sm tracking-tight">
                  Gelir & Satış Performansı
                </CardTitle>
                <Info className="h-3 w-3 text-muted-foreground" />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Dönemsel gerçekleşen satış ve teklif analitiği
              </p>
            </div>
          </div>

          {hasData && (
            <div className="flex items-center gap-1">
              <Button
                className="h-7 px-2.5 text-xs"
                onClick={() => setActiveMetric("revenue")}
                size="sm"
                type="button"
                variant={activeMetric === "revenue" ? "default" : "outline"}
              >
                Gelir (₺)
              </Button>
              <Button
                className="h-7 px-2.5 text-xs"
                onClick={() => setActiveMetric("deals")}
                size="sm"
                type="button"
                variant={activeMetric === "deals" ? "default" : "outline"}
              >
                Siparişler
              </Button>
            </div>
          )}
        </CardHeader>

        {/* Content Area */}
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="flex h-44 items-center justify-center">
              <Skeleton className="h-28 w-full" />
            </div>
          ) : hasData ? (
            <div className="relative pt-2 pb-1">
              <div className="grid grid-cols-2 gap-3 py-2 sm:grid-cols-4">
                <div className="rounded-lg border border-border/80 bg-muted/40 p-3">
                  <span className="block font-medium text-[11px] text-muted-foreground">
                    Toplam Sipariş Geliri
                  </span>
                  <span className="mt-1 block font-bold text-base text-foreground tracking-tight">
                    ₺
                    {(orderStats?.totalRevenue || 0).toLocaleString("tr-TR", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="rounded-lg border border-border/80 bg-muted/40 p-3">
                  <span className="block font-medium text-[11px] text-muted-foreground">
                    Tahsil Edilen
                  </span>
                  <span className="mt-1 block font-bold text-base text-emerald-500 tracking-tight">
                    ₺
                    {(orderStats?.paidRevenue || 0).toLocaleString("tr-TR", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="rounded-lg border border-border/80 bg-muted/40 p-3">
                  <span className="block font-medium text-[11px] text-muted-foreground">
                    Aktif Teklif Hacmi
                  </span>
                  <span className="mt-1 block font-bold text-base text-primary tracking-tight">
                    ₺
                    {Number(
                      quoteStats?.activeProposalsVolume || 0
                    ).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="rounded-lg border border-border/80 bg-muted/40 p-3">
                  <span className="block font-medium text-[11px] text-muted-foreground">
                    Toplam Sipariş
                  </span>
                  <span className="mt-1 block font-bold text-base text-foreground tracking-tight">
                    {totalOrders} Adet
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              action={
                <Button asChild size="sm" variant="outline">
                  <Link href={`/${activeTenant?.slug || "workspace"}/quotes`}>
                    Teklif Oluştur
                  </Link>
                </Button>
              }
              description="Müşterilerinize teklif hazırlayarak veya onaylanan teklifleri siparişe dönüştürerek gelir grafiklerinizi buradan takip edebilirsiniz."
              icon={BarChart3}
              title="Henüz satış veya ciro kaydı bulunmuyor"
            />
          )}
        </CardContent>
      </div>

      {hasData && (
        <CardFooter className="flex flex-wrap items-center justify-between gap-4 border-border/80 border-t pt-2 pb-3 text-xs">
          <div className="flex items-center gap-5">
            <div>
              <span className="font-medium text-[10px] text-muted-foreground">
                Toplam İşlem:
              </span>
              <div className="font-semibold text-foreground text-xs">
                ₺
                {totalRevenue.toLocaleString("tr-TR", {
                  minimumFractionDigits: 2,
                })}
              </div>
            </div>
            <div>
              <span className="font-medium text-[10px] text-muted-foreground">
                Teslim Edilen:
              </span>
              <div className="font-semibold text-emerald-500 text-xs">
                {orderStats?.deliveredOrders ?? 0} Sipariş
              </div>
            </div>
          </div>

          <Link
            className="flex items-center gap-1 font-semibold text-primary text-xs transition hover:underline"
            href={`/${activeTenant?.slug || "workspace"}/orders`}
          >
            <span>Tüm Siparişleri İncele →</span>
          </Link>
        </CardFooter>
      )}
    </Card>
  );
}
