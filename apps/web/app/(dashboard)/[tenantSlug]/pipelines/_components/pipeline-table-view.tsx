"use client";

import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { AlertTriangle, Check } from "lucide-react";
import type { DealSummaryDto } from "@/lib/api-client";
import {
  formatCurrency,
  getPriorityBadgeClass,
  getPriorityLabel,
  getSourceBadgeClass,
  getSourceLabel,
} from "./pipeline-helpers";

interface PipelineTableViewProps {
  deals: DealSummaryDto[];
  onSelectDeal: (dealId: string) => void;
}

export function PipelineTableView({
  deals,
  onSelectDeal,
}: PipelineTableViewProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-6">Fırsat Başlığı</TableHead>
            <TableHead>Müşteri / Şirket</TableHead>
            <TableHead>Aşama</TableHead>
            <TableHead>Öncelik</TableHead>
            <TableHead>Kaynak</TableHead>
            <TableHead>Atanan Sorumlu</TableHead>
            <TableHead>SLA Durumu</TableHead>
            <TableHead className="text-right">Tahmini Tutar</TableHead>
            <TableHead className="pr-6 text-right">İşlemler</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deals.map((deal) => (
            <TableRow
              className="cursor-pointer transition-colors"
              key={deal.id}
              onClick={() => onSelectDeal(deal.id)}
            >
              <TableCell className="py-2 pl-6 font-medium text-foreground">
                {deal.title}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {deal.customerName || "-"}
              </TableCell>
              <TableCell>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-0.5 font-medium text-3xs text-muted-foreground">
                  <i
                    className="size-1.5 flex-none rounded-full"
                    style={{
                      backgroundColor: deal.stageColor || "var(--chart-1)",
                    }}
                  />
                  {deal.stageName}
                </span>
              </TableCell>
              <TableCell>
                <span
                  className={`inline-flex items-center rounded-md px-2 py-0.5 font-medium text-3xs ${getPriorityBadgeClass(
                    deal.priority
                  )}`}
                >
                  {getPriorityLabel(deal.priority)}
                </span>
              </TableCell>
              <TableCell>
                <span
                  className={`inline-flex items-center rounded-md px-2 py-0.5 font-medium text-3xs ${getSourceBadgeClass(
                    deal.source
                  )}`}
                >
                  {getSourceLabel(deal.source)}
                </span>
              </TableCell>
              <TableCell>
                {deal.assignedUserId ? (
                  <div className="flex items-center gap-1.5">
                    <Avatar className="size-5">
                      <AvatarFallback className="bg-accent-soft text-3xs text-accent-foreground">
                        {deal.assignedUserName?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs">{deal.assignedUserName}</span>
                  </div>
                ) : (
                  <Badge size="sm" variant="warning">
                    Açık Havuz
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                {deal.isSlaBreached ? (
                  <span className="inline-flex items-center gap-1 font-medium text-3xs text-danger-ink">
                    <AlertTriangle className="size-3.5" />
                    SLA Aşıldı
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-medium text-3xs text-success-ink">
                    <Check className="size-3.5" />
                    Normal
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right font-semibold text-foreground tabular-nums">
                {formatCurrency(deal.value, deal.currency)}
              </TableCell>
              <TableCell className="py-2 pr-6 text-right">
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectDeal(deal.id);
                  }}
                  size="xs"
                  type="button"
                  variant="outline"
                >
                  Detay
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {deals.length === 0 && (
            <TableRow>
              <TableCell
                className="py-10 text-center text-muted-foreground"
                colSpan={9}
              >
                Arama kriterlerinize uygun fırsat bulunamadı.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
