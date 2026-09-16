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

export function CustomerStatsBanner({
  stats,
  loading,
}: CustomerStatsBannerProps) {
  const activeRate = stats?.totalCustomers
    ? Math.round((stats.activeCustomers / stats.totalCustomers) * 100)
    : 0;

  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Total Customers */}
      <Card className="flex flex-col justify-between p-4 transition-all duration-150 hover:border-border hover:shadow-xs">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <span className="font-medium text-muted-foreground text-xs">
              Toplam Müşteri
            </span>
            <div className="font-bold text-2xl text-foreground tracking-tight sm:text-3xl">
              {loading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                (stats?.totalCustomers ?? 0)
              )}
            </div>
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/80 bg-muted/50 text-foreground shadow-2xs">
            <Users className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 border-border/60 border-t pt-2 text-2xs text-muted-foreground">
          <span>{stats?.companiesCount ?? 0} Şirket</span>
          <span>•</span>
          <span>{stats?.individualsCount ?? 0} Bireysel</span>
        </div>
      </Card>

      {/* 2. Active Customers */}
      <Card className="flex flex-col justify-between p-4 transition-all duration-150 hover:border-border hover:shadow-xs">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <span className="font-medium text-muted-foreground text-xs">
              Aktif Müşteriler
            </span>
            <div className="font-bold text-2xl text-foreground tracking-tight sm:text-3xl">
              {loading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                (stats?.activeCustomers ?? 0)
              )}
            </div>
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/80 bg-muted/50 text-foreground shadow-2xs">
            <UserCheck className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1.5 border-border/60 border-t pt-2">
          <Badge size="sm" variant="success">
            %{activeRate} Aktiflik
          </Badge>
          <span className="text-2xs text-muted-foreground">oranı sağlandı</span>
        </div>
      </Card>

      {/* 3. Lead Customers */}
      <Card className="flex flex-col justify-between p-4 transition-all duration-150 hover:border-border hover:shadow-xs">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <span className="font-medium text-muted-foreground text-xs">
              Potansiyel Müşteri
            </span>
            <div className="font-bold text-2xl text-foreground tracking-tight sm:text-3xl">
              {loading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                (stats?.leadCustomers ?? 0)
              )}
            </div>
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/80 bg-muted/50 text-foreground shadow-2xs">
            <UserPlus className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1.5 border-border/60 border-t pt-2">
          <Badge size="sm" variant="accent">
            Dönüşüm Bekleyen
          </Badge>
          <span className="text-2xs text-muted-foreground">aday müşteri</span>
        </div>
      </Card>

      {/* 4. Total Volume / Revenue */}
      <Card className="flex flex-col justify-between p-4 transition-all duration-150 hover:border-border hover:shadow-xs">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <span className="font-medium text-muted-foreground text-xs">
              Toplam Müşteri Hacmi
            </span>
            <div className="font-bold text-2xl text-foreground tracking-tight sm:text-3xl">
              {loading ? (
                <Skeleton className="h-8 w-28" />
              ) : (
                `₺${(stats?.totalRevenue ?? 0).toLocaleString("tr-TR")}`
              )}
            </div>
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/80 bg-muted/50 text-foreground shadow-2xs">
            <TrendingUp className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 border-border/60 border-t pt-2 text-2xs text-muted-foreground">
          <span>Ort. Müşteri Değeri:</span>
          <strong className="font-semibold text-foreground">
            ₺{(stats?.averageRevenuePerCustomer ?? 0).toLocaleString("tr-TR")}
          </strong>
        </div>
      </Card>
    </div>
  );
}
