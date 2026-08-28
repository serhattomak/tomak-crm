/* Hallmark · component: activity-timeline · genre: modern-minimal · theme: Adaptive Zinc/Violet */
"use client";

import {
  Clock,
  DollarSign,
  FileSpreadsheet,
  PhoneCall,
  Plus,
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
      const quotesRes = await ApiClient.getQuotes(
        { pageSize: 6 },
        activeTenant.id
      );
      const items: ActivityItem[] = [];

      if (quotesRes.success && quotesRes.data?.items) {
        for (const q of quotesRes.data.items) {
          const dateStr = q.updatedAt || q.createdAt;
          const timeFormatted = dateStr
            ? new Date(dateStr).toLocaleTimeString("tr-TR", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "Bugün";

          let action = "yeni teklif oluşturdu";
          let type: ActivityItem["type"] = "deal";
          if (q.status === "RevisionRequested") {
            action = "müşteriden revizyon talebi geldi";
            type = "task";
          } else if (q.status === "Accepted") {
            action = "teklif onaylandı & siparişe hazır";
            type = "deal";
          } else if (q.status === "Sent") {
            action = "müşteriye dijital teklif iletildi";
            type = "call";
          }

          items.push({
            action,
            id: `quote-${q.id}`,
            target: `${q.quoteNumber} - ${q.customerName} (₺${(q.totalAmount || 0).toLocaleString("tr-TR")})`,
            timestamp: timeFormatted,
            type,
            user: {
              initials: (q.assignedUserName || "S")
                .substring(0, 2)
                .toUpperCase(),
              name: q.assignedUserName || "Sistem",
            },
          });
        }
      }

      setActivities(items);
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
        return <DollarSign className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />;
      case "call":
        return <PhoneCall className="h-3 w-3 text-blue-600 dark:text-blue-400" />;
      case "lead":
        return <UserPlus className="h-3 w-3 text-violet-600 dark:text-violet-400" />;
      case "task":
        return <FileSpreadsheet className="h-3 w-3 text-amber-600 dark:text-amber-400" />;
      default:
        return <Clock className="h-3 w-3 text-zinc-600 dark:text-zinc-400" />;
    }
  };

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-2xs transition-all hover:border-zinc-300 dark:border-zinc-800/90 dark:bg-zinc-900/90 dark:hover:border-zinc-700">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400 shadow-2xs dark:bg-violet-950/60 dark:text-violet-400">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-zinc-900 text-sm dark:text-zinc-100">
                Canlı Aktivite Akışı
              </span>
              <div className="font-medium text-[11px] text-zinc-500 dark:text-zinc-400">
                Ekip içi son teklif, müşteri ve satış hareketleri
              </div>
            </div>
          </div>

          <button
            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            onClick={() => fetchLiveActivities()}
            title="Yenile"
            type="button"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Timeline List */}
        {isLoading ? (
          <div className="space-y-2.5 py-3">
            {[1, 2, 3].map((i) => (
              <div
                className="h-10 w-full animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800"
                key={i}
              />
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-7 text-center">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 shadow-2xs dark:bg-zinc-800 dark:text-zinc-500">
              <Clock className="h-5 w-5" />
            </div>
            <h4 className="font-bold text-zinc-800 text-xs dark:text-zinc-200">
              Henüz aktivite veya işlem kaydı bulunmuyor
            </h4>
            <p className="mt-0.5 max-w-xs text-[11px] text-zinc-400 dark:text-zinc-500">
              Oluşturulan teklifler, onaylar ve müşteri etkileşimleri otomatik
              olarak bu akışta toplanır.
            </p>
            <Link
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-1.5 font-bold text-white text-xs shadow-xs transition hover:bg-violet-700 active:scale-95"
              href={`/${activeTenant?.slug || "workspace"}/quotes`}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Teklif Oluştur</span>
            </Link>
          </div>
        ) : (
          <div className="relative max-h-72 space-y-2.5 overflow-y-auto pr-1 before:absolute before:top-2 before:bottom-2 before:left-3.5 before:w-0.5 before:bg-zinc-100 dark:before:bg-zinc-800">
            {activities.map((act) => (
              <div
                className="relative flex items-start gap-2.5 text-xs"
                key={act.id}
              >
                <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white bg-zinc-900 font-bold text-[9px] text-white shadow-2xs dark:border-zinc-800 dark:bg-zinc-100 dark:text-zinc-900">
                  {act.user.initials}
                </div>

                <div className="flex-1 rounded-xl bg-zinc-50/70 p-2.5 transition-colors hover:bg-zinc-100/80 dark:bg-zinc-800/50 dark:hover:bg-zinc-800/80">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-zinc-100">
                      {getActionIcon(act.type)}
                      <span>{act.user.name}</span>
                    </div>
                    <span className="font-semibold text-[10px] text-zinc-400 dark:text-zinc-500">
                      {act.timestamp}
                    </span>
                  </div>
                  <p className="mt-0.5 font-medium text-[11px] text-zinc-600 dark:text-zinc-400">
                    {act.action}:{" "}
                    <strong className="font-bold text-zinc-800 dark:text-zinc-200">
                      {act.target}
                    </strong>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {activities.length > 0 && (
        <div className="mt-3 border-t border-zinc-100 pt-2.5 text-center dark:border-zinc-800/80">
          <Link
            className="font-bold text-violet-600 text-xs transition hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
            href={`/${activeTenant?.slug || "workspace"}/quotes`}
          >
            Tüm İşlem Geçmişini İncele →
          </Link>
        </div>
      )}
    </div>
  );
}
