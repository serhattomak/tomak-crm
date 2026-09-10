/* Hallmark · component: pipeline-kanban-board · genre: modern-minimal · theme: Adaptive Zinc/Violet */
"use client";

import { Award, Clock, Kanban } from "lucide-react";
import type React from "react";
import type { DealSummaryDto, PipelineStageDto } from "@/lib/api-client";
import { PipelineDealCard } from "./pipeline-deal-card";
import { formatCurrency } from "./pipeline-helpers";

interface PipelineKanbanBoardProps {
  dealsByStage: Record<string, DealSummaryDto[]>;
  dragOverStageId: string | null;
  onClaimDeal: (dealId: string, e: React.MouseEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent, stageId: string) => void;
  onDragStart: (e: React.DragEvent, dealId: string) => void;
  onDrop: (e: React.DragEvent, stageId: string) => void;
  onSelectDeal: (dealId: string) => void;
  stages?: PipelineStageDto[];
}

export function PipelineKanbanBoard({
  stages = [],
  dealsByStage,
  dragOverStageId,
  onDragOver,
  onDragLeave,
  onDrop,
  onSelectDeal,
  onDragStart,
  onClaimDeal,
}: PipelineKanbanBoardProps) {
  return (
    <div className="custom-scrollbar flex gap-4 overflow-x-auto pb-4">
      {stages.map((stage) => {
        const stageDeals = dealsByStage[stage.id] || [];
        const stageTotal = stageDeals.reduce((sum, d) => sum + d.value, 0);
        const isDragOver = dragOverStageId === stage.id;

        return (
          <div
            className={`flex w-80 shrink-0 flex-col rounded-lg border p-3 shadow-2xs transition-colors duration-150 ${
              isDragOver
                ? "border-primary/60 bg-primary/5 ring-1 ring-primary/20"
                : "border-border/80 bg-muted/30"
            }`}
            key={stage.id}
            onDragLeave={onDragLeave}
            onDragOver={(e) => onDragOver(e, stage.id)}
            onDrop={(e) => onDrop(e, stage.id)}
          >
            {/* Column Header */}
            <div className="mb-2.5 flex items-center justify-between border-border/70 border-b px-1 pb-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <div
                  className="h-2.5 w-2.5 flex-none rounded-full shadow-xs"
                  style={{ backgroundColor: stage.color || "#3B82F6" }}
                />
                <span className="truncate font-semibold text-foreground text-xs">
                  {stage.name}
                </span>
                <span className="rounded-md bg-muted px-1.5 py-0.5 font-semibold text-[10px] text-muted-foreground">
                  {stageDeals.length}
                </span>
              </div>

              <div className="font-semibold text-foreground text-xs">
                {formatCurrency(stageTotal)}
              </div>
            </div>

            {/* Stage Probability & SLA Sub-header */}
            <div className="mb-3 flex items-center justify-between rounded-md border border-border/80 bg-card px-2.5 py-1 text-[10px] text-muted-foreground shadow-2xs">
              <span className="flex items-center gap-1 font-medium">
                <Award className="h-3 w-3 text-primary" />
                Kazanma: %{stage.probability}
              </span>
              {stage.slaHours ? (
                <span className="flex items-center gap-1 font-medium text-amber-600">
                  <Clock className="h-3 w-3" />
                  SLA: {stage.slaHours} saat
                </span>
              ) : (
                <span>SLA: Süresiz</span>
              )}
            </div>

            {/* Card Drop List */}
            <div className="custom-scrollbar max-h-[calc(100vh-320px)] flex-1 space-y-2.5 overflow-y-auto pr-0.5">
              {stageDeals.map((deal) => (
                <PipelineDealCard
                  deal={deal}
                  key={deal.id}
                  onClaimDeal={onClaimDeal}
                  onDragStart={onDragStart}
                  onSelectDeal={onSelectDeal}
                />
              ))}

              {stageDeals.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-lg border border-border/80 border-dashed bg-card/60 p-6 text-center">
                  <Kanban className="mb-1.5 h-5 w-5 text-muted-foreground" />
                  <p className="font-medium text-muted-foreground text-xs">
                    Bu aşamada kart yok
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    Kart sürükleyip bırakabilirsiniz
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
