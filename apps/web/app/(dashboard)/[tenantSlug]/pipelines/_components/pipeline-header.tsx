"use client";

import { Button } from "@workspace/ui/components/button";
import { Combobox } from "@workspace/ui/components/combobox";
import {
  Kanban,
  Plus,
  RefreshCw,
  Settings,
  Table as TableIcon,
} from "lucide-react";
import type { PipelineDto } from "@/lib/api-client";

interface PipelineHeaderProps {
  activePipeline?: PipelineDto;
  isRefreshing: boolean;
  onChangeViewMode: (mode: "kanban" | "table") => void;
  onOpenCreate: () => void;
  onOpenSettings: () => void;
  onRefresh: () => void;
  onSelectPipeline: (id: string) => void;
  pipelines: PipelineDto[];
  selectedPipelineId: string;
  viewMode: "kanban" | "table";
}

export function PipelineHeader({
  pipelines,
  selectedPipelineId,
  onSelectPipeline,
  activePipeline,
  onOpenSettings,
  isRefreshing,
  onRefresh,
  viewMode,
  onChangeViewMode,
  onOpenCreate,
}: PipelineHeaderProps) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="font-bold text-2xl text-foreground tracking-tight sm:text-3xl">
            Pipeline & Satış Hunisi
          </h1>

          {/* Pipeline Selector */}
          <div className="flex items-center gap-1.5">
            <Combobox
              aria-label="Pipeline seçici"
              onChange={onSelectPipeline}
              options={pipelines.map((p) => ({
                label: p.isDefault ? `${p.name} (Varsayılan)` : p.name,
                value: p.id,
              }))}
              triggerClassName="h-8"
              value={selectedPipelineId}
            />

            <Button
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={onOpenSettings}
              size="icon"
              title="Pipeline Ayarları ve Aşamaları Düzenle"
              type="button"
              variant="outline"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="mt-1 text-muted-foreground text-xs">
          {activePipeline?.description ||
            "Müşteri ve canlı destek taleplerini aşamalara göre takip edin, çalışanlara akıllı dağıtın."}
        </p>
      </div>

      {/* Action Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Refresh */}
        <Button
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          disabled={isRefreshing}
          onClick={onRefresh}
          size="icon"
          title="Yenile"
          type="button"
          variant="outline"
        >
          <RefreshCw
            className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
        </Button>

        {/* View Mode Switcher */}
        <div className="flex items-center rounded-lg border border-border/80 bg-muted/60 p-0.5">
          <button
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium text-xs transition-colors ${
              viewMode === "kanban"
                ? "bg-card font-semibold text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => onChangeViewMode("kanban")}
            type="button"
          >
            <Kanban className="h-3.5 w-3.5" />
            <span>Pano</span>
          </button>
          <button
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium text-xs transition-colors ${
              viewMode === "table"
                ? "bg-card font-semibold text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => onChangeViewMode("table")}
            type="button"
          >
            <TableIcon className="h-3.5 w-3.5" />
            <span>Tablo</span>
          </button>
        </div>

        {/* Create Deal Button */}
        <Button
          className="gap-1.5"
          onClick={onOpenCreate}
          size="sm"
          type="button"
        >
          <Plus className="h-4 w-4" />
          <span>Yeni Fırsat Ekle</span>
        </Button>
      </div>
    </div>
  );
}
