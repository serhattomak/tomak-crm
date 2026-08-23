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
    <div className="flex h-full flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs transition-all hover:border-slate-300">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600 shadow-2xs">
              <Building2 className="h-4.5 w-4.5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm">
                Sıcak Fırsatlar & Teklifler
              </span>
              <div className="font-medium text-[11px] text-slate-500">
                En yüksek potansiyelli anlaşmalar ve teklifler
              </div>
            </div>
          </div>

          <Link
            className="flex items-center gap-1 font-bold text-cyan-600 text-xs transition hover:text-cyan-700"
            href={`/${activeTenant?.slug || "workspace"}/pipelines`}
          >
            <span>Tümünü Gör</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Deals Table */}
        {isLoading ? (
          <div className="space-y-3 py-4">
            {[1, 2, 3].map((i) => (
              <div
                className="h-12 w-full animate-pulse rounded-xl bg-slate-50"
                key={i}
              />
            ))}
          </div>
        ) : deals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileSpreadsheet className="mb-2 h-8 w-8 text-slate-300" />
            <p className="font-semibold text-slate-700 text-xs">
              Henüz fırsat veya teklif bulunmuyor
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Satış hunisinden yeni anlaşmalar ekleyebilirsiniz.
            </p>
            <Link
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-cyan-600 px-3 py-1.5 font-bold text-white text-xs shadow-xs transition hover:bg-cyan-700"
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
                <tr className="border-slate-100 border-b font-semibold text-[11px] text-slate-400 uppercase tracking-wider">
                  <th className="pb-2.5">Anlaşma & Müşteri</th>
                  <th className="pb-2.5">Tutar</th>
                  <th className="pb-2.5">Aşama</th>
                  <th className="pb-2.5">Olasılık</th>
                  <th className="pb-2.5 text-right">Temsilci</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deals.map((deal) => (
                  <tr
                    className="group transition-colors hover:bg-slate-50/80"
                    key={deal.id}
                  >
                    <td className="py-3 pr-3">
                      <div className="max-w-[160px] truncate font-bold text-slate-900 sm:max-w-xs">
                        {deal.title}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
                        <Building2 className="h-3 w-3 flex-none text-slate-400" />
                        <span className="truncate">{deal.customerName}</span>
                      </div>
                    </td>

                    <td className="whitespace-nowrap py-3 pr-3">
                      <span className="font-extrabold text-slate-900">
                        ₺
                        {deal.value.toLocaleString("tr-TR", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </td>

                    <td className="whitespace-nowrap py-3 pr-3">
                      <span className="inline-flex items-center rounded-lg border border-cyan-200 bg-cyan-50 px-2 py-0.5 font-bold text-[10px] text-cyan-700">
                        {deal.stageName}
                      </span>
                    </td>

                    <td className="whitespace-nowrap py-3 pr-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-12 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-cyan-500"
                            style={{ width: `${deal.probability}%` }}
                          />
                        </div>
                        <span className="font-bold text-[11px] text-slate-600">
                          %{deal.probability}
                        </span>
                      </div>
                    </td>

                    <td className="whitespace-nowrap py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <div
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 font-bold text-[10px] text-white shadow-2xs"
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

      <div className="mt-4 flex items-center justify-between border-slate-100 border-t pt-3 font-medium text-[11px] text-slate-400">
        <span>{deals.length} anlaşmanın potansiyeli:</span>
        <strong className="font-bold text-slate-800">
          ₺{totalValue.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
        </strong>
      </div>
    </div>
  );
}
