"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import {
  BarChart3,
  Briefcase,
  Calendar,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Clock,
  FileSpreadsheet,
  Filter,
  Gauge,
  PieChart,
  RotateCcw,
  Search,
  SlidersHorizontal,
  TrendingUp,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { DashboardTab } from "./dashboard-types";
import { WIDGET_REGISTRY } from "./widget-registry";

interface CustomizeWidgetsModalProps {
  activeTab: DashboardTab;
  activeWidgetIds: string[];
  isOpen: boolean;
  onClose: () => void;
  onMoveWidget?: (widgetId: string, direction: "up" | "down") => void;
  onResetDefaults: () => void;
  onToggleWidget: (widgetId: string) => void;
}

export function CustomizeWidgetsModal({
  isOpen,
  onClose,
  activeTab,
  activeWidgetIds,
  onToggleWidget,
  onResetDefaults,
  onMoveWidget,
}: CustomizeWidgetsModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Close on Escape key - must be called unconditionally at top level
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const categories: { id: string; label: string }[] = [
    { id: "all", label: "Tümü" },
    { id: "Sales", label: "Satış & Gelir" },
    { id: "Leads", label: "Lead & Müşteri" },
    { id: "Activities", label: "Aktiviteler" },
    { id: "Team", label: "Takım" },
    { id: "General", label: "Genel" },
  ];

  const getWidgetIcon = (iconName: string) => {
    switch (iconName) {
      case "TrendingUp":
        return (
          <TrendingUp className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
        );
      case "BarChart3":
        return (
          <BarChart3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        );
      case "Gauge":
        return <Gauge className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      case "Filter":
        return (
          <Filter className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
        );
      case "Briefcase":
        return (
          <Briefcase className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
        );
      case "PieChart":
        return (
          <PieChart className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        );
      case "CheckSquare":
        return (
          <CheckSquare className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
        );
      case "Calendar":
        return (
          <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        );
      case "Clock":
        return <Clock className="h-4 w-4 text-amber-700 dark:text-amber-400" />;
      case "Trophy":
        return (
          <Trophy className="h-4 w-4 text-amber-700 dark:text-amber-400" />
        );
      case "FileSpreadsheet":
        return (
          <FileSpreadsheet className="h-4 w-4 text-amber-700 dark:text-amber-400" />
        );
      case "Zap":
        return <Zap className="h-4 w-4 text-amber-500 dark:text-amber-400" />;
      default:
        return (
          <SlidersHorizontal className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
        );
    }
  };

  // Sort widgets: active widgets in their current tab order first, then inactive widgets
  const sortedWidgets = [...WIDGET_REGISTRY].sort((a, b) => {
    const aIndex = activeWidgetIds.indexOf(a.id);
    const bIndex = activeWidgetIds.indexOf(b.id);
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    if (aIndex !== -1) {
      return -1;
    }
    if (bIndex !== -1) {
      return 1;
    }
    return 0;
  });

  const filteredWidgets = sortedWidgets.filter((w) => {
    const matchesCategory =
      selectedCategory === "all" || w.category === selectedCategory;
    const matchesSearch =
      w.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      open
    >
      <DialogContent
        aria-describedby={undefined}
        className="flex max-h-[88vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-border/80 border-b p-4 sm:p-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
              <SlidersHorizontal className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="truncate font-semibold text-foreground text-sm sm:text-base">
                Dashboard Widget Düzenini Özelleştir
              </DialogTitle>
              <p className="truncate text-muted-foreground text-xs">
                <strong className="font-semibold text-primary">
                  {activeTab}
                </strong>{" "}
                sekmesinde görüntülenecek panelleri ve yerleşim sırasını
                belirleyin ({activeWidgetIds.length} aktif)
              </p>
            </div>
          </div>

          <DialogClose asChild>
            <Button
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              size="icon"
              type="button"
              variant="ghost"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogClose>
        </div>

        {/* Filter and Search Bar */}
        <div className="space-y-2.5 border-border/80 border-b bg-muted/30 p-4">
          <div className="relative">
            <Search className="absolute top-2.5 left-3 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="h-9 pl-9 text-xs"
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Widget ara..."
              type="text"
              value={searchQuery}
            />
          </div>

          {/* Category Pills */}
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <Button
                className="h-7 rounded-md px-2.5 text-xs"
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                size="sm"
                type="button"
                variant={selectedCategory === cat.id ? "default" : "outline"}
              >
                {cat.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Widget Grid List */}
        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {filteredWidgets.map((widget) => {
            const activeIndex = activeWidgetIds.indexOf(widget.id);
            const isActive = activeIndex !== -1;
            const isFirst = activeIndex === 0;
            const isLast = activeIndex === activeWidgetIds.length - 1;

            return (
              <div
                className={`flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors ${isActive ? "border-primary/40 bg-primary/5" : "border-border/70 bg-card hover:border-border"}`}
                key={widget.id}
              >
                <div className="flex min-w-0 items-start gap-2.5">
                  {/* Reorder Buttons (only for active widgets) */}
                  {isActive && onMoveWidget ? (
                    <div className="flex flex-col items-center gap-0.5 pt-0.5">
                      <Button
                        className="h-5 w-5 text-muted-foreground hover:text-foreground"
                        disabled={isFirst}
                        onClick={() => onMoveWidget(widget.id, "up")}
                        size="icon"
                        title="Yukarı Taşı"
                        type="button"
                        variant="ghost"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <span className="font-semibold text-3xs text-primary">
                        #{activeIndex + 1}
                      </span>
                      <Button
                        className="h-5 w-5 text-muted-foreground hover:text-foreground"
                        disabled={isLast}
                        onClick={() => onMoveWidget(widget.id, "down")}
                        size="icon"
                        title="Aşağı Taşı"
                        type="button"
                        variant="ghost"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="w-4" />
                  )}

                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/80 bg-background">
                    {getWidgetIcon(widget.iconName)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium text-foreground text-xs">
                        {widget.title}
                      </span>
                      <Badge className="text-3xs" variant="secondary">
                        {widget.category}
                      </Badge>
                    </div>
                    <p className="mt-0.5 truncate text-2xs text-muted-foreground leading-snug">
                      {widget.description}
                    </p>
                  </div>
                </div>

                {/* Toggle Switch */}
                <div className="flex flex-none items-center gap-2">
                  <button
                    className={`flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                      isActive ? "bg-primary" : "bg-muted"
                    }`}
                    onClick={() => onToggleWidget(widget.id)}
                    type="button"
                  >
                    <div
                      className={`h-4 w-4 transform rounded-full bg-background shadow-xs transition-transform duration-200 ${
                        isActive ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-border/80 border-t p-4">
          <Button
            className="gap-1.5 text-muted-foreground"
            onClick={onResetDefaults}
            size="sm"
            type="button"
            variant="ghost"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Varsayılana Sıfırla</span>
          </Button>

          <Button onClick={onClose} size="sm" type="button">
            Kaydet & Kapat
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
