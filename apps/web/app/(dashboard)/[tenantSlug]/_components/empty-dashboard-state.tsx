/* Hallmark · component: empty-dashboard-state · genre: modern-minimal · theme: Adaptive Zinc/Violet */
"use client";

import { Button } from "@workspace/ui/components/button";
import { EmptyState } from "@workspace/ui/components/empty-state";
import { LayoutGrid, Plus, RotateCcw } from "lucide-react";

interface EmptyDashboardStateProps {
  onOpenCustomize: () => void;
  onResetDefaults: () => void;
}

export function EmptyDashboardState({
  onOpenCustomize,
  onResetDefaults,
}: EmptyDashboardStateProps) {
  return (
    <div className="col-span-12">
      <EmptyState
        action={
          <div className="flex gap-2">
            <Button
              className="gap-1.5"
              onClick={onOpenCustomize}
              size="sm"
              type="button"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Widget Kataloğunu Aç</span>
            </Button>
            <Button
              className="gap-1.5"
              onClick={onResetDefaults}
              size="sm"
              type="button"
              variant="outline"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Varsayılanları Yükle</span>
            </Button>
          </div>
        }
        description="Widget kataloğunu açarak bu sekmeye dilediğiniz CRM bileşenlerini ekleyebilirsiniz."
        icon={LayoutGrid}
        title="Bu sekmede henüz aktif widget yok"
      />
    </div>
  );
}
