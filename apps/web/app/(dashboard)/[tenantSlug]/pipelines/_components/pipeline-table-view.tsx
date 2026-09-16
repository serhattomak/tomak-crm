/* Hallmark · component: pipeline-table-view · genre: modern-minimal · theme: Adaptive Zinc/Violet */
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
    <div className="overflow-hidden rounded-lg border border-border/80 bg-card shadow-xs">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
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
              <TableCell className="py-3.5 pl-6 font-medium text-foreground">
                {deal.title}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {deal.customerName || "-"}
              </TableCell>
              <TableCell>
                <span
                  className="inline-flex items-center rounded-md border px-2 py-0.5 font-medium text-3xs"
                  style={{
                    backgroundColor: deal.stageColor
                      ? `${deal.stageColor}15`
                      : "#3B82F615",
                    borderColor: deal.stageColor
                      ? `${deal.stageColor}35`
                      : "#3B82F635",
                    color: deal.stageColor || "#1E40AF",
                  }}
                >
                  {deal.stageName}
                </span>
              </TableCell>
              <TableCell>
                <span
                  className={`inline-flex items-center rounded-md border px-2 py-0.5 font-medium text-3xs ${getPriorityBadgeClass(
                    deal.priority
                  )}`}
                >
                  {getPriorityLabel(deal.priority)}
                </span>
              </TableCell>
              <TableCell>
                <span
                  className={`inline-flex items-center rounded-md border px-2 py-0.5 font-medium text-3xs ${getSourceBadgeClass(
                    deal.source
                  )}`}
                >
                  {getSourceLabel(deal.source)}
                </span>
              </TableCell>
              <TableCell>
                {deal.assignedUserId ? (
                  <div className="flex items-center gap-1.5">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="bg-primary/10 text-3xs text-primary">
                        {deal.assignedUserName?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs">{deal.assignedUserName}</span>
                  </div>
                ) : (
                  <Badge
                    className="text-3xs text-amber-700 dark:text-amber-400"
                    variant="outline"
                  >
                    Açık Havuz
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                {deal.isSlaBreached ? (
                  <span className="inline-flex items-center gap-1 font-medium text-3xs text-destructive">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    SLA Aşıldı
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-medium text-3xs text-emerald-700 dark:text-emerald-300">
                    <Check className="h-3.5 w-3.5" />
                    Normal
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right font-semibold text-foreground">
                {formatCurrency(deal.value, deal.currency)}
              </TableCell>
              <TableCell className="pr-6 text-right">
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
