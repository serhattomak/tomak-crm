"use client";

import { Button } from "@workspace/ui/components/button";
import { Combobox } from "@workspace/ui/components/combobox";
import { Input } from "@workspace/ui/components/input";
import { SelectField } from "@workspace/ui/components/select";
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
    <div>
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
            <Flame className="h-3.5 w-3.5 text-danger" />
            SLA Aşanlar ({slaBreachedCount})
          </Button>
        </div>

        {/* Search and Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
          {/* Search Input */}
          <div className="relative w-full sm:w-56">
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
                aria-label="Aramayı temizle"
                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => onChangeSearchQuery("")}
                type="button"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Priority filter */}
          <div className="w-40">
            <SelectField
              aria-label="Öncelik filtresi"
              onChange={onChangePriorityFilter}
              options={[
                { label: "Öncelik: Tümü", value: "all" },
                { label: "Acil", value: "Urgent" },
                { label: "Yüksek", value: "High" },
                { label: "Orta", value: "Medium" },
                { label: "Düşük", value: "Low" },
              ]}
              placeholder="Öncelik: Tümü"
              triggerClassName="h-8 px-2.5 font-medium"
              value={priorityFilter}
            />
          </div>

          {/* User filter */}
          <div className="w-44">
            <Combobox
              aria-label="Temsilci filtresi"
              onChange={onChangeUserFilter}
              options={[
                { label: "Temsilci: Tümü", value: "all" },
                ...employees.map((emp) => ({
                  label: emp.fullName,
                  value: emp.userId || emp.id,
                })),
              ]}
              placeholder="Temsilci: Tümü"
              triggerClassName="h-8 px-2.5 font-medium"
              value={userFilter}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
