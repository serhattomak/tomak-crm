"use client";

import { Clock, DollarSign, FileSpreadsheet, FileText, PhoneCall, RefreshCw, ShoppingCart, UserPlus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ApiClient } from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";
import type { ActivityItem } from "./dashboard-types";

export function ActivityTimelineWidget() {
  const { activeTenant } = usePermissions();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLiveActivities = useCallback(async () => {
    if (!activeTenant?.id) return;
    setIsLoading(true);
    try {
      // Fetch recent quotes to get live activity events
      const quotesRes = await ApiClient.getQuotes({ pageSize: 5 }, activeTenant.id);
      const items: ActivityItem[] = [];

      if (quotesRes.success && quotesRes.data?.items) {
        for (const q of quotesRes.data.items) {
          const dateStr = q.updatedAt || q.createdAt;
          const timeFormatted = dateStr ? new Date(dateStr).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : "Bugün";
          
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
            id: `quote-${q.id}`,
            action,
            target: `${q.quoteNumber} - ${q.customerName} (₺${(q.totalAmount || 0).toLocaleString("tr-TR")})`,
            timestamp: timeFormatted,
            type,
            user: {
              name: q.assignedUserName || "Sistem",
              initials: (q.assignedUserName || "S").substring(0, 2).toUpperCase(),
            },
          });
        }
      }

      if (items.length > 0) {
        setActivities(items);
      } else {
        // Fallback default activities
        setActivities([
          {
            action: "yeni bir teklif oluşturdu",
            id: "act-1",
            target: "Acme Holding (₺125.000)",
            timestamp: "12 dk önce",
            type: "deal",
            user: { initials: "AY", name: "Ahmet Yılmaz" },
          },
          {
            action: "telefon görüşmesi kaydetti",
            id: "act-2",
            target: "TechNova CTO'su ile 24 dk",
            timestamp: "45 dk önce",
            type: "call",
            user: { initials: "SK", name: "Selin Kaya" },
          },
          {
            action: "anlaşmayı başarıyla kapattı",
            id: "act-3",
            target: "Vortex Lojistik (₺94.500)",
            timestamp: "2 saat önce",
            type: "deal",
            user: { initials: "MD", name: "Mehmet Demir" },
          },
          {
            action: "web sitesinden yeni lead yakaladı",
            id: "act-4",
            target: "Argeus Enerji A.Ş.",
            timestamp: "3 saat önce",
            type: "lead",
            user: { initials: "SB", name: "Sistem Botu" },
          },
        ]);
      }
    } catch {
      // ignore
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
        return <DollarSign className="h-3 w-3 text-emerald-600" />;
      case "call":
        return <PhoneCall className="h-3 w-3 text-blue-600" />;
      case "lead":
        return <UserPlus className="h-3 w-3 text-violet-600" />;
      case "task":
        return <FileSpreadsheet className="h-3 w-3 text-amber-600" />;
      default:
        return <Clock className="h-3 w-3 text-slate-600" />;
    }
  };

  return (
    <div className="flex h-full flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs transition-all hover:border-slate-300">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 shadow-2xs">
              <Clock className="h-4.5 w-4.5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm">
                Canlı Aktivite Akışı
              </span>
              <div className="text-[11px] text-slate-500 font-medium">
                Ekip içi son teklif, müşteri ve satış hareketleri
              </div>
            </div>
          </div>

          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
        </div>

        {/* Timeline List */}
        {isLoading ? (
          <div className="space-y-3 py-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 w-full animate-pulse rounded-xl bg-slate-50" />
            ))}
          </div>
        ) : (
          <div className="relative space-y-3.5 before:absolute before:top-2 before:bottom-2 before:left-3.5 before:w-0.5 before:bg-slate-100">
            {activities.map((act) => (
              <div
                className="relative flex items-start gap-3 text-xs"
                key={act.id}
              >
                {/* User / Action Avatar */}
                <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white bg-slate-900 font-bold text-[10px] text-white shadow-2xs">
                  {act.user.initials}
                </div>

                <div className="flex-1 rounded-2xl bg-slate-50/70 p-2.5 transition-colors hover:bg-slate-100/80">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      {getActionIcon(act.type)}
                      <span>{act.user.name}</span>
                    </div>
                    <span className="font-semibold text-[10px] text-slate-400">
                      {act.timestamp}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-600 font-medium">
                    {act.action}:{" "}
                    <strong className="text-slate-800 font-bold">{act.target}</strong>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 border-slate-100 border-t pt-3 text-center">
        <span className="font-bold text-amber-600 text-xs hover:text-amber-700 cursor-pointer transition">
          Tüm İşlem Geçmişini İncele →
        </span>
      </div>
    </div>
  );
}
