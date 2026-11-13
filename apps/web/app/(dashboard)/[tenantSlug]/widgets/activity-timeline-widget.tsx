"use client";

import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
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
import {
  Clock,
  DollarSign,
  FileSpreadsheet,
  PhoneCall,
  RefreshCw,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ApiClient } from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";
import type { ActivityItem } from "./dashboard-types";

export function ActivityTimelineWidget() {
  const { activeTenant } = usePermissions();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLiveActivities = useCallback(async () => {
    if (!activeTenant?.id) {
      return;
    }
    setIsLoading(true);
    try {
      const [quotesRes, dealsRes, customersRes, ordersRes] =
        await Promise.allSettled([
          ApiClient.getQuotes({ pageSize: 4 }, activeTenant.id),
          ApiClient.getDeals({ pageSize: 4 }, activeTenant.id),
          ApiClient.getCustomers(activeTenant.id, { pageSize: 4 }),
          ApiClient.getOrders({ pageSize: 4 }, activeTenant.id),
        ]);

      const items: (ActivityItem & { rawDate: Date })[] = [];

      // 1. Process Quotes
      if (
        quotesRes.status === "fulfilled" &&
        quotesRes.value.success &&
        quotesRes.value.data?.items
      ) {
        for (const q of quotesRes.value.data.items) {
          const date = new Date(q.updatedAt || q.createdAt || Date.now());
          const timeFormatted = date.toLocaleTimeString("tr-TR", {
            hour: "2-digit",
            minute: "2-digit",
          });

          let action = "yeni teklif oluşturdu";
          let type: ActivityItem["type"] = "deal";
          if (q.status === "RevisionRequested") {
            action = "revizyon talebi geldi";
            type = "task";
          } else if (q.status === "Accepted") {
            action = "teklif onaylandı & siparişe dönüştürüldü";
            type = "deal";
          } else if (q.status === "Sent") {
            action = "müşteriye dijital teklif iletti";
            type = "call";
          }

          items.push({
            action,
            id: `quote-${q.id}`,
            rawDate: date,
            target: `${q.quoteNumber} - ${q.customerName} (₺${(q.totalAmount || 0).toLocaleString("tr-TR")})`,
            timestamp: timeFormatted,
            type,
            user: {
              initials: (q.assignedUserName || "ST")
                .substring(0, 2)
                .toUpperCase(),
              name: q.assignedUserName || "Satış Ekibi",
            },
          });
        }
      }

      // 2. Process Deals
      if (
        dealsRes.status === "fulfilled" &&
        dealsRes.value.success &&
        dealsRes.value.data?.items
      ) {
        for (const d of dealsRes.value.data.items) {
          const date = new Date(d.updatedAt || d.createdAt || Date.now());
          const timeFormatted = date.toLocaleTimeString("tr-TR", {
            hour: "2-digit",
            minute: "2-digit",
          });

          let action = "satış fırsatı açtı";
          if (d.status === "Won") {
            action = "fırsatı kazandı 🏆";
          } else if (d.status === "Lost") {
            action = "fırsatı kapattı (Kayıp)";
          } else if (d.stageName) {
            action = `fırsatı '${d.stageName}' aşamasına taşıdı`;
          }

          items.push({
            action,
            id: `deal-${d.id}`,
            rawDate: date,
            target: `${d.title} (₺${(d.value || 0).toLocaleString("tr-TR")})`,
            timestamp: timeFormatted,
            type: "deal",
            user: {
              initials: (d.assignedUserName || "F")
                .substring(0, 2)
                .toUpperCase(),
              name: d.assignedUserName || "Fırsat Yöneticisi",
            },
          });
        }
      }

      // 3. Process Customers
      if (
        customersRes.status === "fulfilled" &&
        customersRes.value.success &&
        customersRes.value.data?.items
      ) {
        for (const c of customersRes.value.data.items) {
          const date = new Date(c.createdAt || Date.now());
          const timeFormatted = date.toLocaleTimeString("tr-TR", {
            hour: "2-digit",
            minute: "2-digit",
          });

          items.push({
            action: "yeni müşteri kaydetti",
            id: `cust-${c.id}`,
            rawDate: date,
            target: `${c.name} (${c.type === "Individual" ? "Bireysel" : "Kurumsal"})`,
            timestamp: timeFormatted,
            type: "lead",
            user: {
              initials: "CRM",
              name: "Müşteri Sistemi",
            },
          });
        }
      }

      // 4. Process Orders
      if (
        ordersRes.status === "fulfilled" &&
        ordersRes.value.success &&
        ordersRes.value.data?.items
      ) {
        for (const o of ordersRes.value.data.items) {
          const date = new Date(o.createdAt || Date.now());
          const timeFormatted = date.toLocaleTimeString("tr-TR", {
            hour: "2-digit",
            minute: "2-digit",
          });

          items.push({
            action: `sipariş oluşturuldu (${o.status})`,
            id: `ord-${o.id}`,
            rawDate: date,
            target: `${o.orderNumber || "Sipariş"} - ₺${(o.totalAmount || 0).toLocaleString("tr-TR")}`,
            timestamp: timeFormatted,
            type: "task",
            user: {
              initials: (o.customerName || "S").substring(0, 2).toUpperCase(),
              name: o.customerName || "Müşteri",
            },
          });
        }
      }

      // Sort all activities chronologically descending
      const sorted = items
        .sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime())
        .slice(0, 7);

      setActivities(sorted);
    } catch {
      setActivities([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeTenant?.id]);

  useEffect(() => {
    fetchLiveActivities();
  }, [fetchLiveActivities]);

  const getActionIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "deal":
        return <DollarSign className="h-3 w-3 text-success-ink" />;
      case "call":
        return <PhoneCall className="h-3 w-3 text-info-ink" />;
      case "lead":
        return <UserPlus className="h-3 w-3 text-info-ink" />;
      case "task":
        return <FileSpreadsheet className="h-3 w-3 text-warning-ink" />;
      default:
        return <Clock className="h-3 w-3 text-muted-foreground" />;
    }
  };

  return (
    <Card className="flex h-full flex-col justify-between">
      <div>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="font-semibold text-sm tracking-tight">
                Canlı Aktivite Akışı
              </CardTitle>
              <p className="text-2xs text-muted-foreground">
                Teklif, müşteri, fırsat ve sipariş hareketleri
              </p>
            </div>
          </div>

          <Button
            className="h-7 w-7 text-muted-foreground"
            onClick={() => fetchLiveActivities()}
            size="icon"
            title="Yenile"
            variant="ghost"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </CardHeader>

        {/* Timeline List */}
        <CardContent>
          {isLoading ? (
            <div className="space-y-2.5 py-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : activities.length === 0 ? (
            <EmptyState
              action={
                <Button asChild size="sm" variant="outline">
                  <Link href={`/${activeTenant?.slug || "workspace"}/quotes`}>
                    Teklif Oluştur
                  </Link>
                </Button>
              }
              description="Oluşturulan teklifler, fırsatlar ve müşteri etkileşimleri otomatik olarak bu canlı akışta toplanır."
              icon={Clock}
              title="Henüz işlem kaydı bulunmuyor"
            />
          ) : (
            <div className="relative max-h-72 space-y-2.5 overflow-y-auto pr-1 before:absolute before:top-2 before:bottom-2 before:left-3.5 before:w-0.5 before:bg-muted">
              {activities.map((act) => (
                <div
                  className="relative flex items-start gap-2.5 text-xs"
                  key={act.id}
                >
                  <Avatar className="relative z-10 h-6 w-6 font-bold text-3xs">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {act.user.initials}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 rounded-lg border border-border bg-card p-2.5 transition-colors hover:bg-muted/60">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 font-semibold text-foreground">
                        {getActionIcon(act.type)}
                        <span>{act.user.name}</span>
                      </div>
                      <span className="font-medium text-3xs text-muted-foreground">
                        {act.timestamp}
                      </span>
                    </div>
                    <p className="mt-0.5 font-normal text-2xs text-muted-foreground">
                      {act.action}:{" "}
                      <strong className="font-semibold text-foreground">
                        {act.target}
                      </strong>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </div>

      {activities.length > 0 && (
        <CardFooter className="justify-center border-border border-t pt-2 pb-3">
          <Link
            className="font-semibold text-primary text-xs transition hover:underline"
            href={`/${activeTenant?.slug || "workspace"}/pipelines`}
          >
            Tüm Satış ve Fırsatları İncele →
          </Link>
        </CardFooter>
      )}
    </Card>
  );
}
