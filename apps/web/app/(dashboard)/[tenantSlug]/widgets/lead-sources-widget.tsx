/* Hallmark · component: lead-sources · genre: modern-minimal · theme: Adaptive Zinc/Violet */
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
import { Info, PieChart, Users } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ApiClient } from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";
import type { DateRange } from "./dashboard-types";

interface LeadSourcesWidgetProps {
  dateRange?: DateRange;
}

export function LeadSourcesWidget({
  dateRange: _dateRange,
}: LeadSourcesWidgetProps) {
  const { activeTenant } = usePermissions();
  const [customerStats, setCustomerStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!activeTenant?.id) {
      return;
    }
    setIsLoading(true);
    try {
      const res = await ApiClient.getCustomerStats(activeTenant.id);
      if (res.success && res.data) {
        setCustomerStats(res.data);
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

  const totalCustomers = customerStats?.totalCustomers ?? 0;
  const leadCount = customerStats?.leadCustomers ?? 0;
  const activeCount = customerStats?.activeCustomers ?? 0;
  const vipCount = customerStats?.vipCount ?? 0;
  const companiesCount = customerStats?.companiesCount ?? 0;
  const individualsCount = customerStats?.individualsCount ?? 0;

  const hasData = totalCustomers > 0;

  const segments = [
    {
      className: "bg-chart-2",
      count: activeCount,
      name: "Aktif Müşteriler",
    },
    {
      className: "bg-chart-1",
      count: leadCount,
      name: "Müşteri Adayları (Lead)",
    },
    {
      className: "bg-chart-3",
      count: vipCount,
      name: "VIP / Stratejik",
    },
    {
      className: "bg-chart-5",
      count: companiesCount,
      name: "Kurumsal Firmalar",
    },
    {
      className: "bg-chart-4",
      count: individualsCount,
      name: "Bireysel Müşteriler",
    },
  ].filter((s) => s.count > 0);

  return (
    <Card className="flex h-full flex-col justify-between">
      <div>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <PieChart className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="font-semibold text-sm tracking-tight">
                Müşteri & Lead Dağılımı
              </CardTitle>
              <p className="text-2xs text-muted-foreground">
                Segment ve portföy kırılımı
              </p>
            </div>
          </div>

          <Info className="h-4 w-4 text-muted-foreground" />
        </CardHeader>

        <CardContent className="pt-0">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Skeleton className="h-28 w-full" />
            </div>
          ) : hasData ? (
            <>
              {/* Donut Summary */}
              <div className="my-2 flex items-center justify-center">
                <div className="relative flex h-24 w-24 items-center justify-center">
                  <div className="h-full w-full animate-in rounded-full border-6 border-primary/20 border-t-primary" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-bold text-foreground text-xl">
                      {totalCustomers}
                    </span>
                    <span className="font-semibold text-3xs text-muted-foreground">
                      Toplam Kayıt
                    </span>
                  </div>
                </div>
              </div>

              {/* Segments list */}
              <div className="space-y-1.5 pt-2 text-xs">
                {segments.map((s) => {
                  const pct =
                    totalCustomers > 0
                      ? Math.round((s.count / totalCustomers) * 100)
                      : 0;
                  return (
                    <div
                      className="flex items-center justify-between"
                      key={s.name}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 flex-none rounded-full ${s.className}`}
                        />
                        <span className="font-medium text-2xs text-muted-foreground">
                          {s.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 font-semibold">
                        <span className="font-semibold text-2xs text-foreground">
                          {s.count}
                        </span>
                        <span className="text-3xs text-muted-foreground">
                          %{pct}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <EmptyState
              action={
                <Button asChild size="sm" variant="outline">
                  <Link
                    href={`/${activeTenant?.slug || "workspace"}/customers`}
                  >
                    Müşteri / Aday Ekle
                  </Link>
                </Button>
              }
              description="İlk müşteri veya aday kaydınızı oluşturarak portföy dağılımınızı buradan inceleyebilirsiniz."
              icon={Users}
              title="Henüz müşteri veya lead kaydı yok"
            />
          )}
        </CardContent>
      </div>

      {hasData && (
        <CardFooter className="justify-center border-border/80 border-t pt-2 pb-3">
          <Link
            className="font-semibold text-primary text-xs transition hover:underline"
            href={`/${activeTenant?.slug || "workspace"}/customers`}
          >
            Tüm Müşteri Portföyünü İncele →
          </Link>
        </CardFooter>
      )}
    </Card>
  );
}
