/* Hallmark · component: deals-table · genre: modern-minimal · theme: Adaptive Zinc/Violet */
"use client";

import { ArrowRight, Building2, FileSpreadsheet, Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ApiClient } from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";

interface DealRow {
  assignedUserName?: string;
  currency: string;
  customerName: string;
  id: string;
  probability: number;
  stageColor?: string;
  stageName: string;
  title: string;
  value: number;
}

export function DealsTableWidget() {
  const { activeTenant } = usePermissions();
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLiveDeals = useCallback(async () => {
    if (!activeTenant?.id) {
      return;
    }
    setIsLoading(true);
    try {
      // 1. Fetch real deals
      const dealsRes = await ApiClient.getDeals(
        { pageSize: 5 },
        activeTenant.id
      );
      if (
        dealsRes.success &&
        dealsRes.data?.items &&
        dealsRes.data.items.length > 0
      ) {
        setDeals(
          dealsRes.data.items.map((d: any) => ({
            assignedUserName: d.assignedUserName,
            currency: d.currency || "TRY",
            customerName: d.customerName || "Bireysel / Şirket",
            id: d.id,
            probability: d.probability || 50,
            stageColor: d.stageColor,
            stageName: d.stageName || d.status || "Açık",
            title: d.title,
            value: d.value || 0,
          }))
        );
      } else {
        // Fallback: Fetch recent quotes if deals empty
        const quotesRes = await ApiClient.getQuotes(
          { pageSize: 5 },
          activeTenant.id
        );
        if (quotesRes.success && quotesRes.data?.items) {
          setDeals(
            quotesRes.data.items.map((q) => ({
              assignedUserName: q.assignedUserName,
              currency: q.currency || "TRY",
              customerName: q.customerName,
              id: q.id,
              probability:
                q.status === "Accepted" ? 100 : q.status === "Sent" ? 75 : 40,
              stageName:
                q.status === "Draft"
                  ? "Taslak"
                  : q.status === "PendingApproval"
                    ? "Onay Bekliyor"
                    : q.status === "Sent"
                      ? "Müşteride"
                      : q.status === "Accepted"
                        ? "Kabul Edildi"
                        : q.status,
              title: `${q.quoteNumber} (R${q.revisionNumber}) - ${q.title}`,
              value: q.totalAmount || 0,
            }))
          );
        }
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [activeTenant?.id]);

  useEffect(() => {
    fetchLiveDeals();
  }, [fetchLiveDeals]);

  const totalValue = deals.reduce((acc, d) => acc + d.value, 0);

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-2xs transition-all hover:border-zinc-300 dark:border-zinc-800/90 dark:bg-zinc-900/90 dark:hover:border-zinc-700">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400 shadow-2xs dark:bg-violet-950/60 dark:text-violet-400">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-zinc-900 text-sm dark:text-zinc-100">
                Sıcak Fırsatlar & Teklifler
              </span>
              <div className="font-medium text-[11px] text-zinc-500 dark:text-zinc-400">
                En yüksek potansiyelli anlaşmalar ve teklifler
              </div>
            </div>
          </div>

          <Link
            className="flex items-center gap-1 font-bold text-violet-600 text-xs transition hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
            href={`/${activeTenant?.slug || "workspace"}/pipelines`}
          >
            <span>Tümünü Gör</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Deals Table */}
        {isLoading ? (
          <div className="space-y-2.5 py-3">
            {[1, 2, 3].map((i) => (
              <div
                className="h-11 w-full animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800"
                key={i}
              />
            ))}
          </div>
        ) : deals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-7 text-center">
            <FileSpreadsheet className="mb-2 h-7 w-7 text-zinc-300 dark:text-zinc-600" />
            <p className="font-semibold text-zinc-700 text-xs dark:text-zinc-300">
              Henüz fırsat veya teklif bulunmuyor
            </p>
            <p className="mt-0.5 text-[11px] text-zinc-400 dark:text-zinc-500">
              Satış hunisinden yeni anlaşmalar ekleyebilirsiniz.
            </p>
            <Link
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-1.5 font-bold text-white text-xs shadow-xs transition hover:bg-violet-700"
              href={`/${activeTenant?.slug || "workspace"}/pipelines`}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Fırsat Ekle</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-100 font-semibold text-[10px] text-zinc-400 uppercase tracking-wider dark:border-zinc-800">
                  <th className="pb-2">Anlaşma & Müşteri</th>
                  <th className="pb-2">Tutar</th>
                  <th className="pb-2">Aşama</th>
                  <th className="pb-2">Olasılık</th>
                  <th className="pb-2 text-right">Temsilci</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {deals.map((deal) => (
                  <tr
                    className="group transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40"
                    key={deal.id}
                  >
                    <td className="py-2.5 pr-3">
                      <div className="max-w-[160px] truncate font-bold text-zinc-900 dark:text-zinc-100 sm:max-w-xs">
                        {deal.title}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                        <Building2 className="h-3 w-3 flex-none text-zinc-400 dark:text-zinc-500" />
                        <span className="truncate">{deal.customerName}</span>
                      </div>
                    </td>

                    <td className="whitespace-nowrap py-2.5 pr-3">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        ₺
                        {deal.value.toLocaleString("tr-TR", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </td>

                    <td className="whitespace-nowrap py-2.5 pr-3">
                      <span className="inline-flex items-center rounded-md border border-violet-200/70 bg-violet-50 px-2 py-0.5 font-bold text-[10px] text-violet-700 dark:border-violet-800/60 dark:bg-violet-950/60 dark:text-violet-300">
                        {deal.stageName}
                      </span>
                    </td>

                    <td className="whitespace-nowrap py-2.5 pr-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-12 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                          <div
                            className="h-full rounded-full bg-violet-500 dark:bg-violet-400"
                            style={{ width: `${deal.probability}%` }}
                          />
                        </div>
                        <span className="font-bold text-[11px] text-zinc-600 dark:text-zinc-400">
                          %{deal.probability}
                        </span>
                      </div>
                    </td>

                    <td className="whitespace-nowrap py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <div
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 font-bold text-[10px] text-white shadow-2xs dark:bg-zinc-100 dark:text-zinc-900"
                          title={deal.assignedUserName || "Temsilci"}
                        >
                          {(deal.assignedUserName || "T")
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-2.5 font-medium text-[11px] text-zinc-400 dark:border-zinc-800/80 dark:text-zinc-500">
        <span>{deals.length} anlaşmanın potansiyeli:</span>
        <strong className="font-bold text-zinc-800 dark:text-zinc-200">
          ₺{totalValue.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
        </strong>
      </div>
    </div>
  );
}
