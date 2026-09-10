/* Hallmark · hook: use-dashboard-layout · genre: modern-minimal */
"use client";

import type React from "react";
import { useEffect, useState } from "react";
import type { DashboardTab } from "../widgets/dashboard-types";
import { DEFAULT_WIDGET_IDS_BY_TAB } from "../widgets/widget-registry";

export function useDashboardLayout(
  tenantSlug: string,
  activeTab: DashboardTab,
  onNotify?: (message: string) => void
) {
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null);
  const [dragOverWidgetId, setDragOverWidgetId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<"before" | "after" | null>(
    null
  );

  const [widgetsByTab, setWidgetsByTab] = useState<Record<string, string[]>>(
    DEFAULT_WIDGET_IDS_BY_TAB
  );

  useEffect(() => {
    try {
      const storageKey = `crm_dashboard_layout_${tenantSlug}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setWidgetsByTab(JSON.parse(saved));
      }
    } catch {
      // ignore storage errors
    }
  }, [tenantSlug]);

  const saveWidgets = (newLayout: Record<string, string[]>) => {
    setWidgetsByTab(newLayout);
    try {
      const storageKey = `crm_dashboard_layout_${tenantSlug}`;
      localStorage.setItem(storageKey, JSON.stringify(newLayout));
    } catch {
      // ignore storage errors
    }
  };

  const currentTabWidgets =
    widgetsByTab[activeTab] || DEFAULT_WIDGET_IDS_BY_TAB[activeTab] || [];

  const handleToggleWidget = (widgetId: string) => {
    const isCurrentlyActive = currentTabWidgets.includes(widgetId);
    const updated = isCurrentlyActive
      ? currentTabWidgets.filter((id) => id !== widgetId)
      : [...currentTabWidgets, widgetId];

    const newLayout = {
      ...widgetsByTab,
      [activeTab]: updated,
    };
    saveWidgets(newLayout);
  };

  const handleMoveWidget = (widgetId: string, direction: "up" | "down") => {
    const currentIndex = currentTabWidgets.indexOf(widgetId);
    if (currentIndex === -1) {
      return;
    }
    const targetIndex =
      direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= currentTabWidgets.length) {
      return;
    }

    const updated = [...currentTabWidgets];
    const removed = updated.splice(currentIndex, 1)[0];
    if (!removed) {
      return;
    }
    updated.splice(targetIndex, 0, removed);

    const newLayout = {
      ...widgetsByTab,
      [activeTab]: updated,
    };
    saveWidgets(newLayout);
  };

  const handleResetDefaults = () => {
    const newLayout = {
      ...widgetsByTab,
      [activeTab]: DEFAULT_WIDGET_IDS_BY_TAB[activeTab] || [],
    };
    saveWidgets(newLayout);
    onNotify?.("Pano varsayılan widget düzenine sıfırlandı.");
  };

  const handleDragStart = (e: React.DragEvent, widgetId: string) => {
    setDraggedWidgetId(widgetId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", widgetId);
  };

  const handleDragEnd = () => {
    setDraggedWidgetId(null);
    setDragOverWidgetId(null);
    setDropPosition(null);
  };

  const handleDragOver = (e: React.DragEvent, targetWidgetId: string) => {
    e.preventDefault();
    if (!draggedWidgetId || draggedWidgetId === targetWidgetId) {
      return;
    }

    e.dataTransfer.dropEffect = "move";
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const pos = e.clientY < midY ? "before" : "after";

    if (dragOverWidgetId !== targetWidgetId || dropPosition !== pos) {
      setDragOverWidgetId(targetWidgetId);
      setDropPosition(pos);
    }
  };

  const handleDragLeave = (e: React.DragEvent, targetWidgetId: string) => {
    const relatedTarget = e.relatedTarget as Node | null;
    if (relatedTarget && e.currentTarget.contains(relatedTarget)) {
      return;
    }
    if (dragOverWidgetId === targetWidgetId) {
      setDragOverWidgetId(null);
      setDropPosition(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetWidgetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData("text/plain") || draggedWidgetId;
    if (!sourceId || sourceId === targetWidgetId) {
      handleDragEnd();
      return;
    }

    const currentList = [...currentTabWidgets];
    const sourceIndex = currentList.indexOf(sourceId);
    const targetIndex = currentList.indexOf(targetWidgetId);

    if (sourceIndex === -1 || targetIndex === -1) {
      handleDragEnd();
      return;
    }

    const [movedItem] = currentList.splice(sourceIndex, 1);
    if (!movedItem) {
      handleDragEnd();
      return;
    }

    const newTargetIndex = currentList.indexOf(targetWidgetId);
    const insertIndex =
      dropPosition === "after" ? newTargetIndex + 1 : newTargetIndex;

    currentList.splice(insertIndex, 0, movedItem);

    const newLayout = {
      ...widgetsByTab,
      [activeTab]: currentList,
    };

    saveWidgets(newLayout);
    onNotify?.("Pano widget düzeni güncellendi.");
    handleDragEnd();
  };

  return {
    currentTabWidgets,
    draggedWidgetId,
    dragOverWidgetId,
    dropPosition,
    handleDragEnd,
    handleDragLeave,
    handleDragOver,
    handleDragStart,
    handleDrop,
    handleMoveWidget,
    handleResetDefaults,
    handleToggleWidget,
  };
}
