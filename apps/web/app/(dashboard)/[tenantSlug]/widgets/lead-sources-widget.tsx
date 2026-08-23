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
    if (!activeTenant?.id) return;
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
    { name: "Aktif Müşteriler", count: activeCount, color: "#10b981" },
    { name: "Müşteri Adayları (Lead)", count: leadCount, color: "#8b5cf6" },
    { name: "VIP / Stratejik", count: vipCount, color: "#f59e0b" },
    { name: "Kurumsal Firmalar", count: companiesCount, color: "#06b6d4" },
    { name: "Bireysel Müşteriler", count: individualsCount, color: "#ec4899" },
  ].filter((s) => s.count > 0);

  return (
    <div className="flex h-full flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs transition-all hover:border-slate-300">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 shadow-2xs">
              <PieChart className="h-4.5 w-4.5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm">
                Müşteri & Lead Dağılımı
              </span>
              <div className="text-[11px] text-slate-500 font-medium">
                Segment ve portföy kırılımı
              </div>
            </div>
          </div>

          <Info className="h-4 w-4 text-slate-400" />
        </div>

        {isLoading ? (
          <div className="h-40 flex items-center justify-center">
            <div className="h-28 w-full animate-pulse rounded-2xl bg-slate-50" />
          </div>
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-slate-100 text-slate-400 mb-3 shadow-2xs">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">Henüz müşteri veya lead kaydı yok</h3>
            <p className="text-slate-500 text-xs mt-1 max-w-xs">
              İlk müşteri veya aday kaydınızı oluşturarak portföy dağılımınızı buradan inceleyebilirsiniz.
            </p>
            <Link
              href={`/${activeTenant?.slug || "workspace"}/customers`}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-2 font-bold text-white text-xs shadow-xs hover:bg-purple-700 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Müşteri / Aday Ekle</span>
            </Link>
          </div>
        ) : (
          <>
            {/* Donut Summary */}
            <div className="my-3 flex items-center justify-center">
              <div className="relative flex h-28 w-28 items-center justify-center">
                <div className="h-full w-full rounded-full border-8 border-purple-500/20 border-t-purple-600 animate-in" />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-extrabold text-slate-900 text-2xl">
                    {totalCustomers}
                  </span>
                  <span className="font-semibold text-[10px] text-slate-400">
                    Toplam Kayıt
                  </span>
                </div>
              </div>
            </div>

            {/* Segments list */}
            <div className="space-y-2 pt-2 text-xs">
              {segments.map((s) => {
                const pct = totalCustomers > 0 ? Math.round((s.count / totalCustomers) * 100) : 0;
                return (
                  <div className="flex items-center justify-between" key={s.name}>
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full flex-none"
                        style={{ backgroundColor: s.color }}
                      />
                      <span className="text-[11px] text-slate-600 font-medium">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-2 font-semibold">
                      <span className="font-bold text-[11px] text-slate-900">
                        {s.count}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        %{pct}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {hasData && (
        <div className="mt-4 border-slate-100 border-t pt-3 text-center">
          <Link
            href={`/${activeTenant?.slug || "workspace"}/customers`}
            className="font-bold text-purple-600 text-xs hover:text-purple-700 transition"
          >
            Tüm Müşteri Portföyünü İncele →
          </Link>
        </div>
      )}
    </div>
  );
}
