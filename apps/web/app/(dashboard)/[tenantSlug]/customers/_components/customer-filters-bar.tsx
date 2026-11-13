"use client";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Download,
  LayoutGrid,
  RotateCcw,
  Search,
  Table as TableIcon,
} from "lucide-react";

interface CustomerFiltersBarProps {
  onExport: () => void;
  onResetFilters: () => void;
  onSearchChange: (val: string) => void;
  onStatusFilterChange: (val: string) => void;
  onTierFilterChange: (val: string) => void;
  onTypeFilterChange: (val: string) => void;
  onViewModeChange: (mode: "table" | "grid") => void;
  search: string;
  statusFilter: string;
  tierFilter: string;
  typeFilter: string;
  viewMode: "table" | "grid";
}

/**
 * Customer toolbar — no card wrapper. The table below is the single surface;
 * the toolbar sits on the shell like a tool row (spec §5, Tabs).
 */
export function CustomerFiltersBar({
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  tierFilter,
  onTierFilterChange,
  onResetFilters,
  viewMode,
  onViewModeChange,
  onExport,
}: CustomerFiltersBarProps) {
  const hasActiveFilters = Boolean(
    search || statusFilter || typeFilter || tierFilter
  );

  return (
    <div className="flex flex-col justify-between gap-2.5 md:flex-row md:items-center">
      <div className="w-full md:max-w-xs">
        <Input
          className="h-8"
          leftIcon={<Search className="size-3.5" />}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Müşteri, e-posta, telefon veya şehir ara…"
          value={search}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="w-40">
          <Select
            onValueChange={onTypeFilterChange}
            value={typeFilter || "all"}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Tüm Tipler" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Tipler</SelectItem>
              <SelectItem value="Company">Kurumsal</SelectItem>
              <SelectItem value="Individual">Bireysel</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-40">
          <Select
            onValueChange={onStatusFilterChange}
            value={statusFilter || "all"}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Tüm Durumlar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Durumlar</SelectItem>
              <SelectItem value="Active">Aktif</SelectItem>
              <SelectItem value="Lead">Potansiyel Müşteri</SelectItem>
              <SelectItem value="Passive">Pasif</SelectItem>
              <SelectItem value="Churned">Kaybedildi</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-40">
          <Select
            onValueChange={onTierFilterChange}
            value={tierFilter || "all"}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Tüm Segmentler" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Segmentler</SelectItem>
              <SelectItem value="VIP">VIP</SelectItem>
              <SelectItem value="Enterprise">Enterprise</SelectItem>
              <SelectItem value="SME">KOBİ</SelectItem>
              <SelectItem value="Standard">Standart</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {hasActiveFilters ? (
          <Button
            className="gap-1 text-danger-ink hover:bg-danger-soft hover:text-danger-ink"
            onClick={onResetFilters}
            size="sm"
            type="button"
            variant="ghost"
          >
            <RotateCcw className="size-3" />
            <span>Sıfırla</span>
          </Button>
        ) : null}

        <Button
          className="gap-1.5"
          onClick={onExport}
          size="sm"
          title="CSV olarak indir"
          type="button"
          variant="outline"
        >
          <Download className="size-3.5" />
          <span className="hidden sm:inline">Dışa aktar</span>
        </Button>

        <div className="flex items-center rounded-lg bg-muted p-[3px]">
          <button
            aria-pressed={viewMode === "table"}
            className={`flex size-6 items-center justify-center rounded-md transition-colors ${
              viewMode === "table"
                ? "bg-card text-foreground shadow-card"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => onViewModeChange("table")}
            title="Tablo görünümü"
            type="button"
          >
            <TableIcon className="size-3.5" />
          </button>
          <button
            aria-pressed={viewMode === "grid"}
            className={`flex size-6 items-center justify-center rounded-md transition-colors ${
              viewMode === "grid"
                ? "bg-card text-foreground shadow-card"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => onViewModeChange("grid")}
            title="Kart görünümü"
            type="button"
          >
            <LayoutGrid className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
