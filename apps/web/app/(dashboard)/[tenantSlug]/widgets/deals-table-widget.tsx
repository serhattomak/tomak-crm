"use client";

import { ArrowRight, Building2, FileSpreadsheet, Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ApiClient } from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";

interface DealRow {
  id: string;
  title: string;
  customerName: string;
  value: number;
  currency: string;
  stageName: string;
  stageColor?: string;
  probability: number;
  assignedUserName?: string;
}

export function DealsTableWidget() {
  const { activeTenant } = usePermissions();
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLiveDeals = useCallback(async () => {
    if (!activeTenant?.id) return;
    setIsLoading(true);
    try {
      // 1. Fetch real deals
      const dealsRes = await ApiClient.getDeals({ pageSize: 5 }, activeTenant.id);
      if (dealsRes.success && dealsRes.data?.items && dealsRes.data.items.length > 0) {
        setDeals(
          dealsRes.data.items.map((d: any) => ({
            id: d.id,
            title: d.title,
            customerName: d.customerName || "Bireysel / Şirket",
            value: d.value || 0,
            currency: d.currency || "TRY",
            stageName: d.stageName || d.status || "Açık",
            stageColor: d.stageColor,
            probability: d.probability || 50,
            assignedUserName: d.assignedUserName,
          }))
        );
      } else {
        // Fallback: Fetch recent quotes if deals empty
        const quotesRes = await ApiClient.getQuotes({ pageSize: 5 }, activeTenant.id);
        if (quotesRes.success && quotesRes.data?.items) {
          setDeals(
            quotesRes.data.items.map((q) => ({
              id: q.id,
              title: `${q.quoteNumber} (R${q.revisionNumber}) - ${q.title}`,
              customerName: q.customerName,
              value: q.totalAmount || 0,
              currency: q.currency || "TRY",
              stageName: q.status === "Draft" ? "Taslak" : q.status === "PendingApproval" ? "Onay Bekliyor" : q.status === "Sent" ? "Müşteride" : q.status === "Accepted" ? "Kabul Edildi" : q.status,
              probability: q.status === "Accepted" ? 100 : q.status === "Sent" ? 75 : 40,
              assignedUserName: q.assignedUserName,
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
              <div className="text-[11px] text-slate-500 font-medium">
                En yüksek potansiyelli anlaşmalar ve teklifler
              </div>
            </div>
          </div>

          <Link
            href={`/${activeTenant?.slug || "workspace"}/pipelines`}
            className="flex items-center gap-1 font-bold text-cyan-600 text-xs hover:text-cyan-700 transition"
          >
            <span>Tümünü Gör</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Deals Table */}
        {isLoading ? (
          <div className="space-y-3 py-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 w-full animate-pulse rounded-xl bg-slate-50" />
            ))}
          </div>
        ) : deals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileSpreadsheet className="h-8 w-8 text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700 text-xs">Henüz fırsat veya teklif bulunmuyor</p>
            <p className="text-slate-400 text-[11px] mt-0.5">Satış hunisinden yeni anlaşmalar ekleyebilirsiniz.</p>
            <Link
              href={`/${activeTenant?.slug || "workspace"}/pipelines`}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-cyan-600 px-3 py-1.5 font-bold text-white text-xs shadow-xs hover:bg-cyan-700 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Fırsat Ekle</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-slate-100 border-b text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
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
                      <div className="font-bold text-slate-900 truncate max-w-[160px] sm:max-w-xs">
                        {deal.title}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                        <Building2 className="h-3 w-3 text-slate-400 flex-none" />
                        <span className="truncate">{deal.customerName}</span>
                      </div>
                    </td>

                    <td className="py-3 pr-3 whitespace-nowrap">
                      <span className="font-extrabold text-slate-900">
                        ₺{deal.value.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                      </span>
                    </td>

                    <td className="py-3 pr-3 whitespace-nowrap">
                      <span
                        className="inline-flex items-center rounded-lg border border-cyan-200 bg-cyan-50 px-2 py-0.5 font-bold text-[10px] text-cyan-700"
                      >
                        {deal.stageName}
                      </span>
                    </td>

                    <td className="py-3 pr-3 whitespace-nowrap">
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

                    <td className="py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <div
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 font-bold text-[10px] text-white shadow-2xs"
                          title={deal.assignedUserName || "Temsilci"}
                        >
                          {(deal.assignedUserName || "T").charAt(0).toUpperCase()}
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

      <div className="mt-4 border-slate-100 border-t pt-3 text-[11px] text-slate-400 font-medium flex items-center justify-between">
        <span>{deals.length} anlaşmanın potansiyeli:</span>
        <strong className="text-slate-800 font-bold">
          ₺{totalValue.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
        </strong>
      </div>
    </div>
  );
}
