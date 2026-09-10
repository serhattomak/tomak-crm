/* Hallmark · component: deals-table · genre: modern-minimal · theme: Adaptive Zinc/Violet · design-system: design.md */
"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { EmptyState } from "@workspace/ui/components/empty-state";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
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
        const quotesRes = await ApiClient.getQuotes(
          { pageSize: 5 },
          activeTenant.id
        );
        if (
          quotesRes.success &&
          quotesRes.data?.items &&
          quotesRes.data.items.length > 0
        ) {
          setDeals(
            quotesRes.data.items.map((q: any) => ({
              assignedUserName: q.assignedUserName,
              currency: q.currency || "TRY",
              customerName: q.customerName || "Müşteri",
              id: q.id,
              probability:
                q.status === "Approved" || q.status === "Accepted"
                  ? 90
                  : q.status === "Draft"
                    ? 30
                    : 60,
              stageName:
                q.status === "Approved" || q.status === "Accepted"
                  ? "Kazanıldı"
                  : q.status === "Draft"
                    ? "Taslak"
                    : "Teklif Verildi",
              title: q.title || `Teklif #${q.quoteNumber || q.id.slice(0, 6)}`,
              value: q.totalAmount || 0,
            }))
          );
        } else {
          setDeals([]);
        }
      }
    } catch {
      setDeals([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeTenant?.id]);

  useEffect(() => {
    fetchLiveDeals();
  }, [fetchLiveDeals]);

  const totalValue = deals.reduce((acc, d) => acc + (d.value || 0), 0);

  return (
    <Card className="flex h-full flex-col justify-between">
      <div>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md border border-border/80 bg-muted/60 text-primary shadow-2xs">
              <Building2 className="h-3.5 w-3.5" />
            </div>
            <div>
              <CardTitle className="text-sm">
                Sıcak Fırsatlar & Teklifler
              </CardTitle>
              <CardDescription className="text-[11px]">
                En yüksek potansiyelli anlaşmalar ve teklifler
              </CardDescription>
            </div>
          </div>

          <Button
            asChild
            className="h-7 gap-1 text-primary text-xs hover:text-primary"
            size="sm"
            variant="ghost"
          >
            <Link href={`/${activeTenant?.slug || "workspace"}/pipelines`}>
              <span>Tümünü Gör</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </CardHeader>

        <CardContent className="pt-0">
          {isLoading ? (
            <div className="space-y-2 py-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton className="h-10 w-full" key={i} />
              ))}
            </div>
          ) : deals.length === 0 ? (
            <EmptyState
              icon={FileSpreadsheet}
              title="Henüz fırsat veya teklif bulunmuyor"
              description="Satış hunisinden yeni anlaşmalar ekleyebilirsiniz."
              action={
                <Button asChild size="sm">
                  <Link
                    href={`/${activeTenant?.slug || "workspace"}/pipelines`}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    <span>Fırsat Ekle</span>
                  </Link>
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-8 text-[10px]">
                    Anlaşma & Müşteri
                  </TableHead>
                  <TableHead className="h-8 text-[10px]">Tutar</TableHead>
                  <TableHead className="h-8 text-[10px]">Aşama</TableHead>
                  <TableHead className="h-8 text-[10px]">Olasılık</TableHead>
                  <TableHead className="h-8 text-right text-[10px]">
                    Temsilci
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deals.map((deal) => (
                  <TableRow key={deal.id}>
                    <TableCell className="py-2">
                      <div className="max-w-[150px] truncate font-semibold text-foreground sm:max-w-xs">
                        {deal.title}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Building2 className="h-3 w-3 flex-none text-muted-foreground/70" />
                        <span className="truncate">{deal.customerName}</span>
                      </div>
                    </TableCell>

                    <TableCell className="whitespace-nowrap py-2 font-semibold text-foreground">
                      ₺
                      {deal.value.toLocaleString("tr-TR", {
                        minimumFractionDigits: 2,
                      })}
                    </TableCell>

                    <TableCell className="whitespace-nowrap py-2">
                      <Badge size="sm" variant="accent">
                        {deal.stageName}
                      </Badge>
                    </TableCell>

                    <TableCell className="whitespace-nowrap py-2">
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-10 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${deal.probability}%` }}
                          />
                        </div>
                        <span className="font-medium text-[11px] text-muted-foreground">
                          %{deal.probability}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="whitespace-nowrap py-2 text-right">
                      <div className="flex items-center justify-end">
                        <div
                          className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-primary/20 font-bold text-[10px] text-primary shadow-2xs"
                          title={deal.assignedUserName || "Temsilci"}
                        >
                          {(deal.assignedUserName || "T")
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </div>

      <div className="flex items-center justify-between border-border/70 border-t px-4 py-2.5 font-medium text-[11px] text-muted-foreground">
        <span>{deals.length} anlaşmanın potansiyeli:</span>
        <strong className="font-semibold text-foreground">
          ₺{totalValue.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
        </strong>
      </div>
    </Card>
  );
}
