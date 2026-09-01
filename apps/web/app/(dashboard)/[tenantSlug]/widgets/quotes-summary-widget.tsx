/* Hallmark · component: quotes-summary · genre: modern-minimal · theme: Adaptive Zinc/Violet */
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
        return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 font-bold animate-pulse";
      case "Accepted":
        return "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 font-bold";
      case "Sent":
        return "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800";
      case "PendingApproval":
        return "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800";
      case "Rejected":
        return "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800";
      default:
        return "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700";
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
    <div className="flex h-full flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-2xs transition-all hover:border-zinc-300 dark:border-zinc-800/90 dark:bg-zinc-900/90 dark:hover:border-zinc-700">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-600 shadow-2xs dark:bg-violet-950/60 dark:text-violet-400">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                Teklif Yönetimi & Süreçler
              </span>
              <div className="font-medium text-[11px] text-zinc-500 dark:text-zinc-400">
                {quoteStats
                  ? `${quoteStats.totalQuotes} Toplam Teklif · ₺${Number(quoteStats.activeProposalsVolume || 0).toLocaleString("tr-TR")} Hacim`
                  : "Güncel tekliflerin durumları"}
              </div>
            </div>
          </div>

          <Link
            className="flex items-center gap-1 font-bold text-violet-600 text-xs transition hover:text-violet-700 dark:hover:text-violet-300 dark:hover:text-violet-400"
            href={`/${activeTenant?.slug || "workspace"}/quotes`}
          >
            <span>Tekliflere Git</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Quick Stats Pills */}
        <div className="mb-3.5 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-2 text-center dark:border-zinc-800/80 dark:bg-zinc-800/50">
            <span className="block font-semibold text-[9px] text-zinc-400 uppercase dark:text-zinc-500">
              Onay Bekleyen
            </span>
            <span className="font-bold text-purple-600 text-xs dark:text-purple-400">
              {quoteStats?.pendingApprovalCount ?? 0}
            </span>
          </div>
          <div className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-2 text-center dark:border-zinc-800/80 dark:bg-zinc-800/50">
            <span className="block font-semibold text-[9px] text-zinc-400 uppercase dark:text-zinc-500">
              Müşteride
            </span>
            <span className="font-bold text-blue-600 text-xs dark:text-blue-400">
              {quoteStats?.sentCount ?? 0}
            </span>
          </div>
          <div className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-2 text-center dark:border-zinc-800/80 dark:bg-zinc-800/50">
            <span className="block font-semibold text-[9px] text-zinc-400 uppercase dark:text-zinc-500">
              Kabul Edilen
            </span>
            <span className="font-bold text-emerald-600 text-xs dark:text-emerald-400">
              {quoteStats?.acceptedCount ?? 0}
            </span>
          </div>
        </div>

        {/* List of Quotes */}
        {isLoading ? (
          <div className="space-y-2 py-2">
            {[1, 2, 3].map((i) => (
              <div
                className="h-10 w-full animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800"
                key={i}
              />
            ))}
          </div>
        ) : quotes.length === 0 ? (
          <div className="py-6 text-center">
            <p className="font-semibold text-xs text-zinc-500 dark:text-zinc-400">
              Kayıtlı teklif bulunamadı.
            </p>
            <Link
              className="mt-2 inline-flex items-center gap-1 font-bold text-violet-600 text-xs hover:text-violet-700 dark:hover:text-violet-400"
              href={`/${activeTenant?.slug || "workspace"}/quotes`}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>İlk Teklifi Oluştur</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-1.5">
            {quotes.map((q) => (
              <div
                className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50/50 p-2.5 transition-colors hover:bg-zinc-50 dark:border-zinc-800/80 dark:bg-zinc-800/40 dark:hover:bg-zinc-800/70"
                key={q.id}
              >
                <div className="truncate pr-2">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-zinc-900 dark:text-zinc-100">
                    <span className="font-mono text-[11px] text-zinc-400 dark:text-zinc-500">
                      {q.quoteNumber} (R{q.revisionNumber})
                    </span>
                    <span className="truncate">{q.title}</span>
                  </div>
                  <div className="mt-0.5 truncate font-medium text-[11px] text-zinc-500 dark:text-zinc-400">
                    {q.customerName}
                  </div>
                </div>

                <div className="flex flex-none items-center gap-2">
                  <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                    ₺
                    {q.totalAmount.toLocaleString("tr-TR", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] ${getStatusBadge(q.status)}`}
                  >
                    {getStatusLabel(q.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 border-zinc-100 border-t pt-2.5 text-center dark:border-zinc-800/80">
        <Link
          className="inline-flex items-center gap-1.5 font-bold text-violet-600 text-xs transition hover:text-violet-700 dark:hover:text-violet-300 dark:hover:text-violet-400"
          href={`/${activeTenant?.slug || "workspace"}/quotes`}
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Yeni Teklif Hazırla</span>
        </Link>
      </div>
    </div>
  );
}
