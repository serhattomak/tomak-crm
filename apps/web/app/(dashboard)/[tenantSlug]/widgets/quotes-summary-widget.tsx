/* Hallmark · component: quotes-summary · genre: modern-minimal · theme: Adaptive Zinc/Violet */
"use client";

import { Badge } from "@workspace/ui/components/badge";
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

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "RevisionRequested":
        return "warning" as const;
      case "Accepted":
        return "success" as const;
      case "Sent":
      case "PendingApproval":
        return "accent" as const;
      case "Rejected":
        return "destructive" as const;
      default:
        return "neutral" as const;
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
    <Card className="flex h-full flex-col justify-between">
      <div>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="font-semibold text-sm tracking-tight">
                Teklif Yönetimi & Süreçler
              </CardTitle>
              <p className="text-2xs text-muted-foreground">
                {quoteStats
                  ? `${quoteStats.totalQuotes} Toplam Teklif · ₺${Number(quoteStats.activeProposalsVolume || 0).toLocaleString("tr-TR")} Hacim`
                  : "Güncel tekliflerin durumları"}
              </p>
            </div>
          </div>

          <Link
            className="flex items-center gap-1 font-semibold text-primary text-xs transition hover:underline"
            href={`/${activeTenant?.slug || "workspace"}/quotes`}
          >
            <span>Tekliflere Git</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Quick Stats Pills */}
          <div className="mb-3.5 grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-border/80 bg-muted/40 p-2 text-center">
              <span className="block font-medium text-3xs text-muted-foreground uppercase">
                Onay Bekleyen
              </span>
              <span className="font-bold text-primary text-xs">
                {quoteStats?.pendingApprovalCount ?? 0}
              </span>
            </div>
            <div className="rounded-lg border border-border/80 bg-muted/40 p-2 text-center">
              <span className="block font-medium text-3xs text-muted-foreground uppercase">
                Müşteride
              </span>
              <span className="font-bold text-foreground text-xs">
                {quoteStats?.sentCount ?? 0}
              </span>
            </div>
            <div className="rounded-lg border border-border/80 bg-muted/40 p-2 text-center">
              <span className="block font-medium text-3xs text-muted-foreground uppercase">
                Kabul Edilen
              </span>
              <span className="font-bold text-emerald-700 text-xs dark:text-emerald-300">
                {quoteStats?.acceptedCount ?? 0}
              </span>
            </div>
          </div>

          {/* List of Quotes */}
          {isLoading ? (
            <div className="space-y-2 py-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : quotes.length === 0 ? (
            <EmptyState
              action={
                <Button asChild size="sm" variant="outline">
                  <Link href={`/${activeTenant?.slug || "workspace"}/quotes`}>
                    İlk Teklifi Oluştur
                  </Link>
                </Button>
              }
              description="Henüz kayıtlı bir teklif bulunamadı."
              icon={FileSpreadsheet}
              title="Kayıtlı teklif yok"
            />
          ) : (
            <div className="space-y-1.5">
              {quotes.map((q) => (
                <div
                  className="flex items-center justify-between rounded-lg border border-border/80 bg-card p-2.5 transition-colors hover:bg-muted/40"
                  key={q.id}
                >
                  <div className="truncate pr-2">
                    <div className="flex items-center gap-1.5 font-semibold text-foreground text-xs">
                      <span className="font-mono text-2xs text-muted-foreground">
                        {q.quoteNumber} (R{q.revisionNumber})
                      </span>
                      <span className="truncate">{q.title}</span>
                    </div>
                    <div className="mt-0.5 truncate font-medium text-2xs text-muted-foreground">
                      {q.customerName}
                    </div>
                  </div>

                  <div className="flex flex-none items-center gap-2">
                    <span className="font-semibold text-foreground text-xs">
                      ₺
                      {q.totalAmount.toLocaleString("tr-TR", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                    <Badge
                      className="px-1.5 py-0 text-3xs"
                      variant={getStatusVariant(q.status)}
                    >
                      {getStatusLabel(q.status)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </div>

      <CardFooter className="justify-center border-border/80 border-t pt-2 pb-3">
        <Link
          className="inline-flex items-center gap-1.5 font-semibold text-primary text-xs transition hover:underline"
          href={`/${activeTenant?.slug || "workspace"}/quotes`}
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Yeni Teklif Hazırla</span>
        </Link>
      </CardFooter>
    </Card>
  );
}
