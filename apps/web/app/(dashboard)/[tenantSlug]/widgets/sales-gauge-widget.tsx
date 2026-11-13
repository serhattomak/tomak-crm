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
import { ArrowRight, Sparkles, Target, Trophy } from "lucide-react";
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
    <Card className="flex h-full flex-col justify-between">
      <div>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <Trophy className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="font-semibold text-sm tracking-tight">
                Satış Hedef Performansı
              </CardTitle>
              <p className="text-2xs text-muted-foreground">
                Dönemsel Kota & Hedef Takibi
              </p>
            </div>
          </div>

          {hasData && (
            <Badge className="gap-1 text-3xs" variant="success">
              <Sparkles className="h-3 w-3" />
              Aktif
            </Badge>
          )}
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Skeleton className="h-28 w-full" />
            </div>
          ) : hasData ? (
            <>
              {/* Speedometer Radial Gauge */}
              <div className="relative my-2 flex flex-col items-center justify-center">
                <svg className="w-44 overflow-visible" viewBox="0 0 200 120">
                  {/* Track + value arc share one path; the arc length is the truth,
                      not a hardcoded end point. */}
                  <path
                    className="stroke-muted"
                    d="M 20,110 A 80,80 0 0,1 180,110"
                    fill="none"
                    strokeLinecap="round"
                    strokeWidth="12"
                  />
                  <path
                    d="M 20,110 A 80,80 0 0,1 180,110"
                    fill="none"
                    stroke="var(--primary)"
                    strokeDasharray="251.33"
                    strokeDashoffset={251.33 * (1 - currentScore / 100)}
                    strokeLinecap="round"
                    strokeWidth="12"
                  />
                </svg>

                {/* Centered Score */}
                <div className="absolute top-10 flex flex-col items-center text-center">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-3xl text-foreground tabular-nums tracking-tight">
                      %{currentScore}
                    </span>
                  </div>
                  <span className="font-medium text-2xs text-muted-foreground">
                    Gerçekleşen: ₺
                    {totalRevenue.toLocaleString("tr-TR", {
                      maximumFractionDigits: 0,
                      minimumFractionDigits: 0,
                    })}
                  </span>
                </div>
              </div>

              {/* Highlights */}
              <div className="mt-2 space-y-2 rounded-lg bg-muted/60 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-muted-foreground">
                    Tamamlanan Siparişler:
                  </span>
                  <span className="font-semibold text-foreground">
                    {totalOrders} Adet
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.max(5, currentScore)}%` }}
                  />
                </div>
                <p className="font-medium text-2xs text-muted-foreground leading-relaxed">
                  Dönemsel hedefin %{currentScore}&apos;una ulaşıldı.
                </p>
              </div>
            </>
          ) : (
            <EmptyState
              action={
                <Button asChild size="sm" variant="outline">
                  <Link href={`/${activeTenant?.slug || "workspace"}/orders`}>
                    Sipariş / Teklif Oluştur
                  </Link>
                </Button>
              }
              description="İlk siparişinizi oluşturarak veya teklifleri kapatıp dönemsel hedef yüzdenizi takip etmeye başlayın."
              icon={Target}
              title="Henüz kota veya sipariş verisi yok"
            />
          )}
        </CardContent>
      </div>

      {hasData && (
        <CardFooter className="justify-center border-border border-t pt-2 pb-3">
          <Link
            className="flex items-center justify-center gap-1.5 font-semibold text-primary text-xs transition hover:underline"
            href={`/${activeTenant?.slug || "workspace"}/orders`}
          >
            <span>Sipariş ve Hedef Detayları</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardFooter>
      )}
    </Card>
  );
}
