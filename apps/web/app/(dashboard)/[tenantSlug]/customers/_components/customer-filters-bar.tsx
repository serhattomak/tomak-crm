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
    <div className="flex flex-col justify-between gap-3 rounded-lg border border-border/80 bg-card p-3 shadow-2xs md:flex-row md:items-center">
      {/* Search Input */}
      <div className="max-w-md flex-1">
        <Input
          leftIcon={<Search className="h-4 w-4" />}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Müşteri adı, e-posta, telefon veya şehir ara..."
          value={search}
        />
      </div>

      {/* Filter Dropdowns & View Mode */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Type Filter */}
        <div className="w-32 sm:w-36">
          <Select
            onValueChange={onTypeFilterChange}
            value={typeFilter || "all"}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Tüm Tipler" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Tipler</SelectItem>
              <SelectItem value="Company">Kurumsal (Şirket)</SelectItem>
              <SelectItem value="Individual">Bireysel (Şahıs)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status Filter */}
        <div className="w-32 sm:w-36">
          <Select
            onValueChange={onStatusFilterChange}
            value={statusFilter || "all"}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Tüm Statüler" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Statüler</SelectItem>
              <SelectItem value="Active">Aktif</SelectItem>
              <SelectItem value="Lead">Potansiyel (Lead)</SelectItem>
              <SelectItem value="Passive">Pasif</SelectItem>
              <SelectItem value="Churned">Kaybedildi</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tier Filter */}
        <div className="w-32 sm:w-36">
          <Select
            onValueChange={onTierFilterChange}
            value={tierFilter || "all"}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Tüm Segmentler" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Segmentler</SelectItem>
              <SelectItem value="VIP">VIP</SelectItem>
              <SelectItem value="Enterprise">Enterprise</SelectItem>
              <SelectItem value="SME">KOBİ (SME)</SelectItem>
              <SelectItem value="Standard">Standart</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Reset Filters */}
        {hasActiveFilters && (
          <Button
            className="gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onResetFilters}
            size="sm"
            type="button"
            variant="outline"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Sıfırla</span>
          </Button>
        )}

        {/* Export CSV */}
        <Button
          className="gap-1 text-xs"
          onClick={onExport}
          size="sm"
          title="CSV Olarak İndir"
          type="button"
          variant="outline"
        >
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Dışa Aktar</span>
        </Button>

        {/* View Mode Toggle */}
        <div className="flex items-center rounded-md border border-border/80 bg-muted/60 p-0.5">
          <button
            className={`rounded p-1 transition-all ${
              viewMode === "table"
                ? "bg-card text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => onViewModeChange("table")}
            title="Tablo Görünümü"
            type="button"
          >
            <TableIcon className="h-3.5 w-3.5" />
          </button>
          <button
            className={`rounded p-1 transition-all ${
              viewMode === "grid"
                ? "bg-card text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => onViewModeChange("grid")}
            title="Kart Görünümü"
            type="button"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
