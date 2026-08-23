"use client";

import { ArrowRight, FileSpreadsheet, Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ApiClient } from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";

interface QuoteSummaryItem {
  createdAt: string;
  currency: string;
  customerName: string;
  id: string;
  quoteNumber: string;
  revisionNumber: number;
  status: string;
  title: string;
  totalAmount: number;
}

export function QuotesSummaryWidget() {
  const { activeTenant } = usePermissions();
  const [quotes, setQuotes] = useState<QuoteSummaryItem[]>([]);
  const [quoteStats, setQuoteStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchQuotesData = useCallback(async () => {
    if (!activeTenant?.id) {
      return;
    }
    setIsLoading(true);
    try {
      const [quotesRes, statsRes] = await Promise.allSettled([
        ApiClient.getQuotes({ pageSize: 4 }, activeTenant.id),
        ApiClient.getQuoteStats(activeTenant.id),
      ]);

      if (
        quotesRes.status === "fulfilled" &&
        quotesRes.value.success &&
        quotesRes.value.data?.items
      ) {
        setQuotes(
          quotesRes.value.data.items.map((q) => ({
            createdAt: q.createdAt,
            currency: q.currency,
            customerName: q.customerName,
            id: q.id,
            quoteNumber: q.quoteNumber,
            revisionNumber: q.revisionNumber,
            status: q.status,
            title: q.title,
            totalAmount: q.totalAmount,
          }))
        );
      }

      if (
        statsRes.status === "fulfilled" &&
        statsRes.value.success &&
        statsRes.value.data
      ) {
        setQuoteStats(statsRes.value.data);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [activeTenant?.id]);

  useEffect(() => {
    fetchQuotesData();
  }, [fetchQuotesData]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "RevisionRequested":
        return "bg-amber-100 text-amber-800 border-amber-300 font-bold animate-pulse";
      case "Accepted":
        return "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold";
      case "Sent":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "PendingApproval":
        return "bg-purple-100 text-purple-800 border-purple-300";
      case "Rejected":
        return "bg-rose-100 text-rose-800 border-rose-300";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "RevisionRequested":
        return "Revizyon İstendi";
      case "Accepted":
        return "Kabul Edildi";
      case "Sent":
        return "Müşteride";
      case "PendingApproval":
        return "Onay Bekliyor";
      case "Rejected":
        return "Reddedildi";
      default:
        return "Taslak";
    }
  };

  return (
    <div className="flex h-full flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs transition-all hover:border-slate-300">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 shadow-2xs">
              <FileSpreadsheet className="h-4.5 w-4.5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm">
                Teklif Yönetimi & Süreçler
              </span>
              <div className="font-medium text-[11px] text-slate-500">
                {quoteStats
                  ? `${quoteStats.totalQuotes} Toplam Teklif · ₺${Number(quoteStats.activeProposalsVolume || 0).toLocaleString("tr-TR")} Hacim`
                  : "Güncel tekliflerin durumları"}
              </div>
            </div>
          </div>

          <Link
            className="flex items-center gap-1 font-bold text-amber-600 text-xs transition hover:text-amber-700"
            href={`/${activeTenant?.slug || "workspace"}/quotes`}
          >
            <span>Tekliflere Git</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Quick Stats Pills */}
        <div className="mb-4 grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-2.5 text-center">
            <span className="block font-semibold text-[10px] text-slate-400 uppercase">
              Onay Bekleyen
            </span>
            <span className="font-extrabold text-purple-700 text-sm">
              {quoteStats?.pendingApprovalCount ?? 0}
            </span>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-2.5 text-center">
            <span className="block font-semibold text-[10px] text-slate-400 uppercase">
              Müşteride
            </span>
            <span className="font-extrabold text-blue-700 text-sm">
              {quoteStats?.sentCount ?? 0}
            </span>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-2.5 text-center">
            <span className="block font-semibold text-[10px] text-slate-400 uppercase">
              Kabul Edilen
            </span>
            <span className="font-extrabold text-emerald-700 text-sm">
              {quoteStats?.acceptedCount ?? 0}
            </span>
          </div>
        </div>

        {/* List of Quotes */}
        {isLoading ? (
          <div className="space-y-2.5 py-2">
            {[1, 2, 3].map((i) => (
              <div
                className="h-10 w-full animate-pulse rounded-xl bg-slate-50"
                key={i}
              />
            ))}
          </div>
        ) : quotes.length === 0 ? (
          <div className="py-6 text-center">
            <p className="font-semibold text-slate-500 text-xs">
              Kayıtlı teklif bulunamadı.
            </p>
            <Link
              className="mt-2 inline-flex items-center gap-1 font-bold text-amber-600 text-xs hover:text-amber-700"
              href={`/${activeTenant?.slug || "workspace"}/quotes`}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>İlk Teklifi Oluştur</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {quotes.map((q) => (
              <div
                className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/40 p-2.5 transition-colors hover:bg-slate-50"
                key={q.id}
              >
                <div className="truncate pr-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                    <span className="font-mono text-slate-500">
                      {q.quoteNumber} (R{q.revisionNumber})
                    </span>
                    <span className="truncate">{q.title}</span>
                  </div>
                  <div className="mt-0.5 truncate font-medium text-[11px] text-slate-500">
                    {q.customerName}
                  </div>
                </div>

                <div className="flex flex-none items-center gap-2.5">
                  <span className="font-extrabold text-slate-900 text-xs">
                    ₺
                    {q.totalAmount.toLocaleString("tr-TR", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[10px] ${getStatusBadge(q.status)}`}
                  >
                    {getStatusLabel(q.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 border-slate-100 border-t pt-3 text-center">
        <Link
          className="inline-flex items-center gap-1.5 font-bold text-amber-600 text-xs transition hover:text-amber-700"
          href={`/${activeTenant?.slug || "workspace"}/quotes`}
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Yeni Teklif Hazırla</span>
        </Link>
      </div>
    </div>
  );
}
