"use client";

import { PageContainer } from "@workspace/ui/components/page-container";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { toast } from "@workspace/ui/components/sonner";
import { useParams, useSearchParams } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ApiClient,
  type DealStatsResponse,
  type DealSummaryDto,
  type EmployeeDto,
  type PipelineDto,
} from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";
import { CreateDealModal } from "./_components/create-deal-modal";
import { DealDetailDrawer } from "./_components/deal-detail-drawer";
import {
  PipelineFilterBar,
  type PipelineFilterType,
} from "./_components/pipeline-filter-bar";
import { PipelineHeader } from "./_components/pipeline-header";
import { PipelineKanbanBoard } from "./_components/pipeline-kanban-board";
import { PipelineSettingsModal } from "./_components/pipeline-settings-modal";
import { PipelineStatsBanner } from "./_components/pipeline-stats-banner";
import { PipelineTableView } from "./_components/pipeline-table-view";

export default function PipelinesPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tenantSlug = (params?.tenantSlug as string) || "";
  const { activeTenant, profile } = usePermissions();

  // State
  const [pipelines, setPipelines] = useState<PipelineDto[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>("");
  const [deals, setDeals] = useState<DealSummaryDto[]>([]);
  const [stats, setStats] = useState<DealStatsResponse | null>(null);
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // View mode: 'kanban' | 'table'
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<PipelineFilterType>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");

  // Modals & Panels
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(
    () => searchParams.get("create") === "true"
  );
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(
    () => searchParams.get("dealId") || null
  );

  // Drag & drop state
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);

  // Load Pipelines and Employees
  const loadInitialData = useCallback(async () => {
    if (!activeTenant?.id) {
      return;
    }
    setIsLoading(true);
    try {
      const [pipeRes, empRes] = await Promise.all([
        ApiClient.getPipelines(activeTenant.id),
        ApiClient.getEmployees(
          { pageSize: 100, status: "Active" },
          activeTenant.id
        ),
      ]);

      if (pipeRes.success && pipeRes.data && pipeRes.data.length > 0) {
        setPipelines(pipeRes.data);
        const defaultPipe =
          pipeRes.data.find((p) => p.isDefault) || pipeRes.data[0];
        if (defaultPipe) {
          setSelectedPipelineId((prev) => (prev ? prev : defaultPipe.id));
        }
      }

      if (empRes.success && empRes.data) {
        setEmployees(empRes.data.items);
      }
    } catch {
      toast.error("Pipeline verileri yüklenirken hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  }, [activeTenant]);

  // Load Deals & Stats for selected pipeline
  const loadDeals = useCallback(async () => {
    if (!(activeTenant?.id && selectedPipelineId)) {
      return;
    }
    setIsRefreshing(true);
    try {
      const [dealsRes, statsRes] = await Promise.all([
        ApiClient.getDeals(
          { pageSize: 200, pipelineId: selectedPipelineId },
          activeTenant.id
        ),
        ApiClient.getDealStats(selectedPipelineId, activeTenant.id),
      ]);

      if (dealsRes.success && dealsRes.data) {
        setDeals(dealsRes.data.items);
      }
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
    } catch {
      toast.error("Fırsatlar yüklenirken hata oluştu.");
    } finally {
      setIsRefreshing(false);
    }
  }, [activeTenant, selectedPipelineId]);

  useEffect(() => {
    if (activeTenant?.id) {
      loadInitialData();
    }
  }, [activeTenant?.id, loadInitialData]);

  useEffect(() => {
    if (selectedPipelineId && activeTenant?.id) {
      loadDeals();
    }
  }, [selectedPipelineId, activeTenant?.id, loadDeals]);

  const activePipeline = useMemo(
    () => pipelines.find((p) => p.id === selectedPipelineId) || pipelines[0],
    [pipelines, selectedPipelineId]
  );

  // Filtered deals
  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = deal.title.toLowerCase().includes(q);
        const matchesCustomer = deal.customerName?.toLowerCase().includes(q);
        const matchesContact = deal.contactName?.toLowerCase().includes(q);
        const matchesEmail = deal.contactEmail?.toLowerCase().includes(q);
        const matchesPhone = deal.contactPhone?.includes(q);
        if (
          !(
            matchesTitle ||
            matchesCustomer ||
            matchesContact ||
            matchesEmail ||
            matchesPhone
          )
        ) {
          return false;
        }
      }

      // 2. Filter Type
      if (filterType === "my") {
        if (!profile?.id || deal.assignedUserId !== profile.id) {
          return false;
        }
      } else if (filterType === "unassigned") {
        if (deal.assignedUserId) {
          return false;
        }
      } else if (filterType === "sla" && !deal.isSlaBreached) {
        return false;
      }

      // 3. Priority
      if (priorityFilter !== "all" && deal.priority !== priorityFilter) {
        return false;
      }

      // 4. Assigned User
      if (userFilter !== "all" && deal.assignedUserId !== userFilter) {
        return false;
      }

      return true;
    });
  }, [deals, searchQuery, filterType, priorityFilter, userFilter, profile]);

  // Stage grouped deals for Kanban
  const dealsByStage = useMemo(() => {
    const map: Record<string, DealSummaryDto[]> = {};
    if (activePipeline?.stages) {
      for (const stage of activePipeline.stages) {
        map[stage.id] = [];
      }
    }
    for (const deal of filteredDeals) {
      const stageList = map[deal.stageId];
      if (stageList) {
        stageList.push(deal);
      } else {
        map[deal.stageId] = [deal];
      }
    }
    return map;
  }, [activePipeline, filteredDeals]);

  // Drag & Drop
  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    e.dataTransfer.setData("text/plain", dealId);
    setDraggedDealId(dealId);
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    if (dragOverStageId !== stageId) {
      setDragOverStageId(stageId);
    }
  };

  const handleDragLeave = () => {
    setDragOverStageId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    setDragOverStageId(null);
    const dealId = e.dataTransfer.getData("text/plain") || draggedDealId;
    setDraggedDealId(null);

    if (!(dealId && targetStageId && activeTenant?.id)) {
      return;
    }

    const currentDeal = deals.find((d) => d.id === dealId);
    if (!currentDeal || currentDeal.stageId === targetStageId) {
      return;
    }

    // Optimistic UI update
    const previousStageId = currentDeal.stageId;
    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, stageId: targetStageId } : d))
    );

    try {
      const res = await ApiClient.moveDealStage(
        dealId,
        { dealId, targetStageId },
        activeTenant.id
      );

      if (res.success) {
        toast.success("Fırsat aşaması güncellendi");
        loadDeals();
      } else {
        // Revert
        setDeals((prev) =>
          prev.map((d) =>
            d.id === dealId ? { ...d, stageId: previousStageId } : d
          )
        );
        toast.error(res.message || "Aşama güncellenirken hata oluştu");
      }
    } catch {
      setDeals((prev) =>
        prev.map((d) =>
          d.id === dealId ? { ...d, stageId: previousStageId } : d
        )
      );
      toast.error("İşlem gerçekleştirilemedi");
    }
  };

  // Claim deal (Assign to me)
  const handleClaimDeal = async (dealId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!(profile?.id && activeTenant?.id)) {
      toast.error("Kullanıcı profiliniz bulunamadı");
      return;
    }

    try {
      const res = await ApiClient.assignDeal(
        dealId,
        { assignedUserId: profile.id, dealId },
        activeTenant.id
      );
      if (res.success) {
        toast.success("Fırsat üzerinize alındı");
        loadDeals();
      } else {
        toast.error(res.message || "Atama başarısız");
      }
    } catch {
      toast.error("İşlem sırasında hata oluştu");
    }
  };

  const unassignedCount = deals.filter((d) => !d.assignedUserId).length;
  const slaBreachedCount = deals.filter((d) => d.isSlaBreached).length;

  return (
    <PageContainer className="space-y-6">
      {/* 1. Header Section */}
      <PipelineHeader
        activePipeline={activePipeline}
        isRefreshing={isRefreshing}
        onChangeViewMode={setViewMode}
        onOpenCreate={() => setIsCreateModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onRefresh={loadDeals}
        onSelectPipeline={setSelectedPipelineId}
        pipelines={pipelines}
        selectedPipelineId={selectedPipelineId}
        viewMode={viewMode}
      />

      {/* 2. KPI Summary Cards */}
      <PipelineStatsBanner stats={stats} unassignedCount={unassignedCount} />

      {/* 3. Filter and Search Bar */}
      <PipelineFilterBar
        dealsCount={deals.length}
        employees={employees}
        filterType={filterType}
        onChangeFilterType={setFilterType}
        onChangePriorityFilter={setPriorityFilter}
        onChangeSearchQuery={setSearchQuery}
        onChangeUserFilter={setUserFilter}
        priorityFilter={priorityFilter}
        searchQuery={searchQuery}
        slaBreachedCount={slaBreachedCount}
        unassignedCount={unassignedCount}
        userFilter={userFilter}
      />

      {/* 4. Deals View (Kanban Board or Table View) */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center rounded-lg border border-border/80 bg-card shadow-xs">
          <div className="flex flex-col items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <span className="font-medium text-muted-foreground text-xs">
              Pipeline ve fırsatlar yükleniyor...
            </span>
          </div>
        </div>
      ) : viewMode === "kanban" ? (
        <PipelineKanbanBoard
          dealsByStage={dealsByStage}
          dragOverStageId={dragOverStageId}
          onClaimDeal={handleClaimDeal}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDragStart={handleDragStart}
          onDrop={handleDrop}
          onSelectDeal={setSelectedDealId}
          stages={activePipeline?.stages}
        />
      ) : (
        <PipelineTableView
          deals={filteredDeals}
          onSelectDeal={setSelectedDealId}
        />
      )}

      {/* 5. Deal Detail Slide-Over Drawer */}
      {selectedDealId && (
        <DealDetailDrawer
          activePipeline={activePipeline}
          dealId={selectedDealId}
          employees={employees}
          onClose={() => setSelectedDealId(null)}
          onUpdated={loadDeals}
          tenantSlug={tenantSlug}
        />
      )}

      {/* 6. Create Deal Modal */}
      {isCreateModalOpen && (
        <CreateDealModal
          activePipeline={activePipeline}
          employees={employees}
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={() => {
            setIsCreateModalOpen(false);
            loadDeals();
          }}
          pipelines={pipelines}
          tenantSlug={tenantSlug}
        />
      )}

      {/* 7. Pipeline & Stages Settings Modal */}
      {isSettingsModalOpen && (
        <PipelineSettingsModal
          onClose={() => setIsSettingsModalOpen(false)}
          onUpdated={() => {
            setIsSettingsModalOpen(false);
            loadInitialData();
          }}
          pipeline={activePipeline}
          tenantSlug={tenantSlug}
        />
      )}
    </PageContainer>
  );
}
