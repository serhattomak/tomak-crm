/* Hallmark · component: lead-sources · genre: modern-minimal · theme: Adaptive Zinc/Violet */
"use client";

import { Info, PieChart, Plus, Users } from "lucide-react";
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
    { color: "#10b981", count: activeCount, name: "Aktif Müşteriler" },
    { color: "#8b5cf6", count: leadCount, name: "Müşteri Adayları (Lead)" },
    { color: "#f59e0b", count: vipCount, name: "VIP / Stratejik" },
    { color: "#06b6d4", count: companiesCount, name: "Kurumsal Firmalar" },
    { color: "#ec4899", count: individualsCount, name: "Bireysel Müşteriler" },
  ].filter((s) => s.count > 0);

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-2xs transition-all hover:border-zinc-300 dark:border-zinc-800/90 dark:bg-zinc-900/90 dark:hover:border-zinc-700">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-600 shadow-2xs dark:bg-violet-950/60 dark:text-violet-400">
              <PieChart className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                Müşteri & Lead Dağılımı
              </span>
              <div className="font-medium text-[11px] text-zinc-500 dark:text-zinc-400">
                Segment ve portföy kırılımı
              </div>
            </div>
          </div>

          <Info className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
        </div>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-28 w-full animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
          </div>
        ) : hasData ? (
          <>
            {/* Donut Summary */}
            <div className="my-2 flex items-center justify-center">
              <div className="relative flex h-24 w-24 items-center justify-center">
                <div className="h-full w-full animate-in rounded-full border-6 border-violet-500/20 border-t-violet-600 dark:border-violet-400/20 dark:border-t-violet-400" />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-bold text-xl text-zinc-900 dark:text-zinc-100">
                    {totalCustomers}
                  </span>
                  <span className="font-semibold text-[9px] text-zinc-400 dark:text-zinc-500">
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
                        className="h-2 w-2 flex-none rounded-full"
                        style={{ backgroundColor: s.color }}
                      />
                      <span className="font-medium text-[11px] text-zinc-600 dark:text-zinc-300">
                        {s.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-semibold">
                      <span className="font-bold text-[11px] text-zinc-900 dark:text-zinc-100">
                        {s.count}
                      </span>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                        %{pct}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 shadow-2xs dark:bg-zinc-800 dark:text-zinc-500">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-xs text-zinc-800 dark:text-zinc-200">
              Henüz müşteri veya lead kaydı yok
            </h3>
            <p className="mt-1 max-w-xs text-[11px] text-zinc-500 dark:text-zinc-400">
              İlk müşteri veya aday kaydınızı oluşturarak portföy dağılımınızı
              buradan inceleyebilirsiniz.
            </p>
            <Link
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 py-1.5 font-bold text-white text-xs shadow-xs transition hover:bg-violet-700 active:scale-95"
              href={`/${activeTenant?.slug || "workspace"}/customers`}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Müşteri / Aday Ekle</span>
            </Link>
          </div>
        )}
      </div>

      {hasData && (
        <div className="mt-3 border-zinc-100 border-t pt-2.5 text-center dark:border-zinc-800/80">
          <Link
            className="font-bold text-violet-600 text-xs transition hover:text-violet-700 dark:hover:text-violet-300 dark:hover:text-violet-400"
            href={`/${activeTenant?.slug || "workspace"}/customers`}
          >
            Tüm Müşteri Portföyünü İncele →
          </Link>
        </div>
      )}
    </div>
  );
}
