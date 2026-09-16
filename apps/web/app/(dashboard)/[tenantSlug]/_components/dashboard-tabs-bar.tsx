"use client";

import { Button } from "@workspace/ui/components/button";
import { ChevronDown, Download, Filter, Plus, RotateCcw } from "lucide-react";
import { useState } from "react";
import type { DashboardTab, DateRange } from "../widgets/dashboard-types";

interface DashboardTabsBarProps {
  activeTab: DashboardTab;
  dateRange: DateRange;
  dateRangeLabels: Record<DateRange, string>;
  onOpenCustomize: () => void;
  onResetDefaults: () => void;
  onSelectDateRange: (range: DateRange) => void;
  onSelectTab: (tab: DashboardTab) => void;
  tabs: { id: DashboardTab; label: string }[];
}

export function DashboardTabsBar({
  activeTab,
  onSelectTab,
  tabs,
  onOpenCustomize,
  dateRange,
  onSelectDateRange,
  dateRangeLabels,
  onResetDefaults,
}: DashboardTabsBarProps) {
  const [showDateDropdown, setShowDateDropdown] = useState(false);

  return (
    <div className="flex flex-col justify-between gap-3 border-border/70 border-b pb-3 sm:flex-row sm:items-center print:hidden">
      {/* Pill Tabs */}
      <div className="flex w-fit items-center gap-1 rounded-lg bg-muted/60 p-1">
        {tabs.map((tab) => (
          <button
            className={`rounded-md px-3 py-1 font-medium text-xs transition-all ${activeTab === tab.id ? "bg-card font-semibold text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"}`}
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
        <button
          className="flex items-center gap-1 rounded-md px-2.5 py-1 font-medium text-muted-foreground text-xs transition-colors hover:text-foreground"
          onClick={onOpenCustomize}
          type="button"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Widget Ekle</span>
        </button>
      </div>

      {/* Date Filter & Export */}
      <div className="flex items-center gap-2">
        {/* Dynamic Date Range Dropdown */}
        <div className="relative">
          <Button
            className="gap-1.5 font-medium"
            onClick={() => setShowDateDropdown(!showDateDropdown)}
            size="sm"
            type="button"
            variant="outline"
          >
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{dateRangeLabels[dateRange]}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>

          {showDateDropdown && (
            <div className="fade-in absolute right-0 z-30 mt-1.5 w-44 animate-in rounded-lg border border-border bg-popover p-1 shadow-lg">
              {(Object.keys(dateRangeLabels) as DateRange[]).map((range) => (
                <button
                  className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left font-medium text-xs transition-colors ${
                    dateRange === range
                      ? "bg-primary/10 font-semibold text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                  key={range}
                  onClick={() => {
                    onSelectDateRange(range);
                    setShowDateDropdown(false);
                  }}
                  type="button"
                >
                  <span>{dateRangeLabels[range]}</span>
                  {dateRange === range && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Reset Layout */}
        <Button
          className="gap-1.5 font-medium"
          onClick={onResetDefaults}
          size="sm"
          title="Pano yerleşimini varsayılan fabrika ayarlarına döndür"
          type="button"
          variant="outline"
        >
          <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="hidden sm:inline">Düzeni Sıfırla</span>
        </Button>

        {/* Quick PDF / Print Export */}
        <Button
          className="gap-1.5 font-medium"
          onClick={() => window.print()}
          size="sm"
          type="button"
          variant="outline"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Rapor Al</span>
        </Button>
      </div>
    </div>
  );
}
