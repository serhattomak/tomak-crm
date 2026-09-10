/* Hallmark · component: pipeline-filter-bar · genre: modern-minimal · theme: Adaptive Zinc/Violet */
"use client";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Flame, Search, UserCheck, Users, X } from "lucide-react";
import type { EmployeeDto } from "@/lib/api-client";

export type PipelineFilterType = "all" | "my" | "unassigned" | "sla";

interface PipelineFilterBarProps {
  dealsCount: number;
  employees: EmployeeDto[];
  filterType: PipelineFilterType;
  onChangeFilterType: (type: PipelineFilterType) => void;
  onChangePriorityFilter: (priority: string) => void;
  onChangeSearchQuery: (query: string) => void;
  onChangeUserFilter: (userId: string) => void;
  priorityFilter: string;
  searchQuery: string;
  slaBreachedCount: number;
  unassignedCount: number;
  userFilter: string;
}

export function PipelineFilterBar({
  filterType,
  onChangeFilterType,
  dealsCount,
  unassignedCount,
  slaBreachedCount,
  searchQuery,
  onChangeSearchQuery,
  priorityFilter,
  onChangePriorityFilter,
  userFilter,
  onChangeUserFilter,
  employees,
}: PipelineFilterBarProps) {
  return (
    <div className="rounded-lg border border-border/80 bg-card p-3 shadow-xs">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Quick Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            className="h-8 text-xs"
            onClick={() => onChangeFilterType("all")}
            size="sm"
            type="button"
            variant={filterType === "all" ? "default" : "outline"}
          >
            Tüm Fırsatlar ({dealsCount})
          </Button>

          <Button
            className="h-8 gap-1.5 text-xs"
            onClick={() => onChangeFilterType("my")}
            size="sm"
            type="button"
            variant={filterType === "my" ? "default" : "outline"}
          >
            <UserCheck className="h-3.5 w-3.5" />
            Bana Atananlar
          </Button>

          <Button
            className="h-8 gap-1.5 text-xs"
            onClick={() => onChangeFilterType("unassigned")}
            size="sm"
            type="button"
            variant={filterType === "unassigned" ? "default" : "outline"}
          >
            <Users className="h-3.5 w-3.5" />
            Açık Havuz ({unassignedCount})
          </Button>

          <Button
            className="h-8 gap-1.5 text-xs"
            onClick={() => onChangeFilterType("sla")}
            size="sm"
            type="button"
            variant={filterType === "sla" ? "destructive" : "outline"}
          >
            <Flame className="h-3.5 w-3.5 text-rose-500" />
            SLA Aşanlar ({slaBreachedCount})
          </Button>
        </div>

        {/* Search and Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative min-w-[220px]">
            <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-8 pl-8 text-xs"
              onChange={(e) => onChangeSearchQuery(e.target.value)}
              placeholder="Fırsat veya müşteri ara..."
              type="text"
              value={searchQuery}
            />
            {searchQuery && (
              <button
                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => onChangeSearchQuery("")}
                type="button"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Priority filter */}
          <select
            className="h-8 rounded-md border border-input bg-background px-2.5 font-medium text-foreground text-xs shadow-xs focus:border-primary focus:outline-none"
            onChange={(e) => onChangePriorityFilter(e.target.value)}
            value={priorityFilter}
          >
            <option value="all">Öncelik: Tümü</option>
            <option value="Urgent">Acil</option>
            <option value="High">Yüksek</option>
            <option value="Medium">Orta</option>
            <option value="Low">Düşük</option>
          </select>

          {/* User filter */}
          <select
            className="h-8 rounded-md border border-input bg-background px-2.5 font-medium text-foreground text-xs shadow-xs focus:border-primary focus:outline-none"
            onChange={(e) => onChangeUserFilter(e.target.value)}
            value={userFilter}
          >
            <option value="all">Temsilci: Tümü</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.userId || emp.id}>
                {emp.fullName}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
