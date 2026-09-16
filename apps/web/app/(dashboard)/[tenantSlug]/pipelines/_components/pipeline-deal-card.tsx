"use client";

import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Activity,
  AlertTriangle,
  Building2,
  MessageSquare,
  User,
  Zap,
} from "lucide-react";
import type React from "react";
import type { DealSummaryDto } from "@/lib/api-client";
import {
  formatCurrency,
  getPriorityBadgeClass,
  getPriorityLabel,
  getSourceBadgeClass,
  getSourceLabel,
} from "./pipeline-helpers";

interface PipelineDealCardProps {
  deal: DealSummaryDto;
  onClaimDeal: (dealId: string, e: React.MouseEvent) => void;
  onDragStart: (e: React.DragEvent, dealId: string) => void;
  onSelectDeal: (dealId: string) => void;
}

export function PipelineDealCard({
  deal,
  onSelectDeal,
  onDragStart,
  onClaimDeal,
}: PipelineDealCardProps) {
  return (
    <div
      className="group relative cursor-pointer rounded-lg border border-border/80 bg-card p-3.5 shadow-2xs transition-all hover:border-primary/50 hover:shadow-xs active:scale-[0.99]"
      draggable
      onClick={() => onSelectDeal(deal.id)}
      onDragStart={(e) => onDragStart(e, deal.id)}
    >
      {/* SLA Breach Warning */}
      {deal.isSlaBreached && (
        <div className="mb-2 flex items-center gap-1.5 rounded-md border border-destructive/20 bg-destructive/10 px-2 py-0.5 font-medium text-3xs text-destructive">
          <AlertTriangle className="h-3 w-3 flex-none" />
          <span>Aşama SLA Süresi Aşıldı!</span>
        </div>
      )}

      {/* Top row: Source & Priority */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-medium text-3xs ${getSourceBadgeClass(
            deal.source
          )}`}
        >
          {deal.source === "LiveChat" && (
            <MessageSquare className="h-2.5 w-2.5" />
          )}
          {getSourceLabel(deal.source)}
        </span>

        <span
          className={`inline-flex items-center rounded-md border px-2 py-0.5 font-medium text-3xs ${getPriorityBadgeClass(
            deal.priority
          )}`}
        >
          {getPriorityLabel(deal.priority)}
        </span>
      </div>

      {/* Deal Title */}
      <h4 className="mb-1 line-clamp-2 font-medium text-foreground text-xs transition-colors group-hover:text-primary">
        {deal.title}
      </h4>

      {/* Customer / Company */}
      {deal.customerName && (
        <div className="mb-2 flex items-center gap-1.5 text-2xs text-muted-foreground">
          {deal.customerType === "Company" ? (
            <Building2 className="h-3.5 w-3.5 flex-none" />
          ) : (
            <User className="h-3.5 w-3.5 flex-none" />
          )}
          <span className="truncate">{deal.customerName}</span>
        </div>
      )}

      {/* Financial Value & Tags */}
      <div className="mb-2 flex items-center justify-between border-border/60 border-t pt-2">
        <span className="font-semibold text-foreground text-xs">
          {formatCurrency(deal.value, deal.currency)}
        </span>
        {deal.tags && deal.tags.length > 0 && (
          <Badge className="text-3xs" variant="secondary">
            #{deal.tags[0]}
          </Badge>
        )}
      </div>

      {/* Card Footer: Assignee & Action */}
      <div className="flex items-center justify-between border-border/60 border-t pt-2 text-2xs">
        {deal.assignedUserId ? (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Avatar className="h-5 w-5">
              <AvatarFallback className="bg-primary/10 text-3xs text-primary">
                {deal.assignedUserName ? deal.assignedUserName.charAt(0) : "U"}
              </AvatarFallback>
            </Avatar>
            <span className="max-w-[120px] truncate text-xs">
              {deal.assignedUserName || "Temsilci"}
            </span>
          </div>
        ) : (
          <Button
            className="h-6 gap-1 rounded-md px-2 text-3xs"
            onClick={(e) => onClaimDeal(deal.id, e)}
            size="xs"
            type="button"
            variant="outline"
          >
            <Zap className="h-2.5 w-2.5" />
            Üzerime Al
          </Button>
        )}

        {/* Counters */}
        <div className="flex items-center gap-2 text-3xs text-muted-foreground">
          {deal.notesCount > 0 && (
            <span className="flex items-center gap-0.5">
              <MessageSquare className="h-3 w-3" />
              {deal.notesCount}
            </span>
          )}
          {deal.activitiesCount > 0 && (
            <span className="flex items-center gap-0.5">
              <Activity className="h-3 w-3" />
              {deal.activitiesCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
