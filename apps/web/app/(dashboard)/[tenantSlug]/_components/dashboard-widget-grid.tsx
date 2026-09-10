/* Hallmark · component: dashboard-widget-grid · genre: modern-minimal · theme: Adaptive Zinc/Violet */
"use client";

import type React from "react";
import { ActivityTimelineWidget } from "../widgets/activity-timeline-widget";
import type { DateRange } from "../widgets/dashboard-types";
import { DealsTableWidget } from "../widgets/deals-table-widget";
import { DraggableWidgetWrapper } from "../widgets/draggable-widget-wrapper";
import { KpiMetricsWidget } from "../widgets/kpi-metrics-widget";
import { LeadSourcesWidget } from "../widgets/lead-sources-widget";
import { PipelineFunnelWidget } from "../widgets/pipeline-funnel-widget";
import { QuotesSummaryWidget } from "../widgets/quotes-summary-widget";
import { RevenueChartWidget } from "../widgets/revenue-chart-widget";
import { SalesGaugeWidget } from "../widgets/sales-gauge-widget";
import { TasksChecklistWidget } from "../widgets/tasks-checklist-widget";
import { TeamLeaderboardWidget } from "../widgets/team-leaderboard-widget";
import { UpcomingMeetingsWidget } from "../widgets/upcoming-meetings-widget";
import { WIDGET_REGISTRY } from "../widgets/widget-registry";
import { EmptyDashboardState } from "./empty-dashboard-state";

interface DashboardWidgetGridProps {
  currentTabWidgets: string[];
  dateRange: DateRange;
  draggedWidgetId: string | null;
  dragOverWidgetId: string | null;
  dropPosition: "before" | "after" | null;
  onDragEnd: () => void;
  onDragLeave: (e: React.DragEvent, targetWidgetId: string) => void;
  onDragOver: (e: React.DragEvent, targetWidgetId: string) => void;
  onDragStart: (e: React.DragEvent, widgetId: string) => void;
  onDrop: (e: React.DragEvent, targetWidgetId: string) => void;
  onMoveWidget: (widgetId: string, direction: "up" | "down") => void;
  onOpenCustomize: () => void;
  onResetDefaults: () => void;
  onToggleWidget: (widgetId: string) => void;
}

export function DashboardWidgetGrid({
  currentTabWidgets,
  dateRange,
  draggedWidgetId,
  dragOverWidgetId,
  dropPosition,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  onToggleWidget,
  onMoveWidget,
  onOpenCustomize,
  onResetDefaults,
}: DashboardWidgetGridProps) {
  if (currentTabWidgets.length === 0) {
    return (
      <div className="grid grid-flow-dense grid-cols-12 gap-5 print:grid print:grid-cols-12 print:gap-4 print:overflow-visible">
        <EmptyDashboardState
          onOpenCustomize={onOpenCustomize}
          onResetDefaults={onResetDefaults}
        />
      </div>
    );
  }

  const isRevenueChartActive = currentTabWidgets.includes("revenue-chart");
  const isSalesGaugeActive = currentTabWidgets.includes("sales-gauge");
  const isLeadSourcesActive = currentTabWidgets.includes("lead-sources");
  const isTasksActive = currentTabWidgets.includes("tasks-checklist");

  return (
    <div className="grid grid-flow-dense grid-cols-12 gap-5 print:grid print:grid-cols-12 print:gap-4 print:overflow-visible">
      {currentTabWidgets.map((widgetId, index) => {
        let spanClass = "col-span-12 lg:col-span-6";
        let widgetContent: React.ReactNode = null;

        switch (widgetId) {
          case "kpi-metrics":
            spanClass = "col-span-12";
            widgetContent = <KpiMetricsWidget dateRange={dateRange} />;
            break;

          case "revenue-chart":
            spanClass = isSalesGaugeActive
              ? "col-span-12 lg:col-span-8"
              : "col-span-12";
            widgetContent = <RevenueChartWidget dateRange={dateRange} />;
            break;

          case "sales-gauge":
            spanClass = isRevenueChartActive
              ? "col-span-12 lg:col-span-4"
              : "col-span-12 lg:col-span-6";
            widgetContent = <SalesGaugeWidget dateRange={dateRange} />;
            break;

          case "pipeline-funnel":
            spanClass = "col-span-12 lg:col-span-6";
            widgetContent = <PipelineFunnelWidget dateRange={dateRange} />;
            break;

          case "deals-table":
            spanClass = "col-span-12 lg:col-span-6";
            widgetContent = <DealsTableWidget />;
            break;

          case "quotes-summary":
            spanClass = "col-span-12 lg:col-span-6";
            widgetContent = <QuotesSummaryWidget />;
            break;

          case "lead-sources":
            spanClass = isTasksActive
              ? "col-span-12 lg:col-span-4"
              : "col-span-12 lg:col-span-6";
            widgetContent = <LeadSourcesWidget dateRange={dateRange} />;
            break;

          case "tasks-checklist":
            spanClass = isLeadSourcesActive
              ? "col-span-12 lg:col-span-8"
              : "col-span-12";
            widgetContent = <TasksChecklistWidget />;
            break;

          case "upcoming-meetings":
            spanClass = "col-span-12 lg:col-span-6";
            widgetContent = <UpcomingMeetingsWidget />;
            break;

          case "activity-timeline":
            spanClass = "col-span-12 lg:col-span-6";
            widgetContent = <ActivityTimelineWidget />;
            break;

          case "team-leaderboard":
            spanClass = "col-span-12 lg:col-span-6";
            widgetContent = <TeamLeaderboardWidget />;
            break;

          default:
            return null;
        }

        const meta = WIDGET_REGISTRY.find((w) => w.id === widgetId);
        const isFirst = index === 0;
        const isLast = index === currentTabWidgets.length - 1;

        return (
          <DraggableWidgetWrapper
            dropPosition={dragOverWidgetId === widgetId ? dropPosition : null}
            isDragging={draggedWidgetId === widgetId}
            isDragOver={dragOverWidgetId === widgetId}
            isFirst={isFirst}
            isLast={isLast}
            key={widgetId}
            onDragEnd={onDragEnd}
            onDragLeave={(e) => onDragLeave(e, widgetId)}
            onDragOver={(e) => onDragOver(e, widgetId)}
            onDragStart={(e) => onDragStart(e, widgetId)}
            onDrop={(e) => onDrop(e, widgetId)}
            onHide={() => onToggleWidget(widgetId)}
            onMoveDown={() => onMoveWidget(widgetId, "down")}
            onMoveUp={() => onMoveWidget(widgetId, "up")}
            spanClass={spanClass}
            widgetId={widgetId}
            widgetTitle={meta?.title}
          >
            {widgetContent}
          </DraggableWidgetWrapper>
        );
      })}
    </div>
  );
}
