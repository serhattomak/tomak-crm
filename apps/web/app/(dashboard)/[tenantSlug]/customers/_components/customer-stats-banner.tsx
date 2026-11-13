"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Card } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { TrendingUp, UserCheck, UserPlus, Users } from "lucide-react";
import type { CustomerStatsDto } from "@/lib/api-client";

interface CustomerStatsBannerProps {
  loading: boolean;
  stats: CustomerStatsDto | null;
}

/**
 * Customer KPIs — the reference metric card: micro label, tabular number,
 * quiet footer rule. No hover state; these are not interactive.
 */
export function CustomerStatsBanner({
  stats,
  loading,
}: CustomerStatsBannerProps) {
  const activeRate = stats?.totalCustomers
    ? Math.round((stats.activeCustomers / stats.totalCustomers) * 100)
    : 0;

  const metrics = [
    {
      footer: (
        <div className="flex items-center gap-2 text-2xs text-muted-foreground">
          <span>{stats?.companiesCount ?? 0} Şirket</span>
          <span className="text-border">•</span>
          <span>{stats?.individualsCount ?? 0} Bireysel</span>
        </div>
      ),
      icon: Users,
      label: "Toplam Müşteri",
      skeletonWidth: "w-20",
      value: stats?.totalCustomers ?? 0,
    },
    {
      footer: (
        <div className="flex items-center gap-1.5">
          <Badge size="sm" variant="success">
            %{activeRate} Aktiflik
          </Badge>
          <span className="text-2xs text-muted-foreground">oranı</span>
        </div>
      ),
      icon: UserCheck,
      label: "Aktif Müşteri",
      skeletonWidth: "w-20",
      value: stats?.activeCustomers ?? 0,
    },
    {
      footer: (
        <div className="flex items-center gap-1.5">
          <Badge size="sm" variant="accent">
            Dönüşüm
          </Badge>
          <span className="text-2xs text-muted-foreground">bekleyen aday</span>
        </div>
      ),
      icon: UserPlus,
      label: "Potansiyel Müşteri",
      skeletonWidth: "w-20",
      value: stats?.leadCustomers ?? 0,
    },
    {
      footer: (
        <div className="flex items-center gap-1.5 text-2xs text-muted-foreground">
          <span>Ort. değer</span>
          <strong className="font-semibold text-foreground tabular-nums">
            ₺{(stats?.averageRevenuePerCustomer ?? 0).toLocaleString("tr-TR")}
          </strong>
        </div>
      ),
      icon: TrendingUp,
      label: "Toplam Hacim",
      skeletonWidth: "w-28",
      value: `₺${(stats?.totalRevenue ?? 0).toLocaleString("tr-TR")}`,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <Card className="p-4" key={metric.label}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 space-y-1.5">
              <span className="block font-semibold text-3xs text-muted-foreground uppercase tracking-wider">
                {metric.label}
              </span>
              <div className="font-semibold text-2xl text-foreground tracking-tight tabular-nums">
                {loading ? (
                  <Skeleton className={`h-7 ${metric.skeletonWidth}`} />
                ) : (
                  metric.value
                )}
              </div>
            </div>
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <metric.icon className="size-3.5" />
            </div>
          </div>
          <div className="mt-3 border-border border-t pt-2.5">
            {metric.footer}
          </div>
        </Card>
      ))}
    </div>
  );
}
