"use client";

import { ConfirmDialog } from "@workspace/ui/components/confirm-dialog";
import { toast } from "@workspace/ui/components/sonner";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Award,
  Building2,
  Check,
  Clock,
  ExternalLink,
  Flame,
  Kanban,
  Layers,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Table as TableIcon,
  Trash2,
  TrendingUp,
  User,
  UserCheck,
  Users,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ApiClient,
  type DealDetailDto,
  type DealStatsResponse,
  type DealSummaryDto,
  type EmployeeDto,
  type PipelineDto,
} from "@/lib/api-client";
import { SalesRepPicker } from "@/components/entity-picker-modal";
import { usePermissions } from "@/lib/permissions/permission-context";

export default function PipelinesPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenantSlug = (params?.tenantSlug as string) || "";
  const { activeTenant, profile, hasPermission } = usePermissions();

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
  const [filterType, setFilterType] = useState<
    "all" | "my" | "unassigned" | "sla"
  >("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");

  // Modals & Drawers
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Drag & drop state
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);

  // Check URL query params for ?create=true or ?dealId=...
  useEffect(() => {
    if (searchParams.get("create") === "true") {
      setIsCreateModalOpen(true);
    }
    const dealIdParam = searchParams.get("dealId");
    if (dealIdParam) {
      setSelectedDealId(dealIdParam);
    }
  }, [searchParams]);

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
  }, [activeTenant?.id]);

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
  }, [activeTenant?.id, selectedPipelineId]);

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
  }, [deals, searchQuery, filterType, priorityFilter, userFilter, profile?.id]);

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

  // Handle Drag & Drop
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

  const formatCurrency = (val: number, cur = "TRY") =>
    new Intl.NumberFormat("tr-TR", {
      currency: cur === "TRY" ? "TRY" : cur,
      maximumFractionDigits: 0,
      style: "currency",
    }).format(val);

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "Urgent":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800";
      case "High":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800";
      case "Medium":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800";
      case "Low":
        return "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800";
      default:
        return "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800";
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "Urgent":
        return "Acil";
      case "High":
        return "Yüksek";
      case "Medium":
        return "Orta";
      case "Low":
        return "Düşük";
      default:
        return priority;
    }
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case "LiveChat":
        return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800";
      case "WebForm":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800";
      case "Campaign":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800";
      default:
        return "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800";
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case "LiveChat":
        return "Canlı Destek";
      case "WebForm":
        return "Web Formu";
      case "Campaign":
        return "Kampanya";
      default:
        return "Manuel";
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Section */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-bold text-2xl text-zinc-900 dark:text-zinc-100 tracking-tight sm:text-3xl">
              Pipeline & Satış Hunisi
            </h1>

            {/* Pipeline Selector */}
            <div className="flex items-center gap-1.5">
              <select
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 font-bold text-zinc-800 dark:text-zinc-200 text-xs shadow-2xs hover:bg-zinc-50 dark:hover:bg-zinc-800/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => setSelectedPipelineId(e.target.value)}
                value={selectedPipelineId}
              >
                {pipelines.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.isDefault ? "(Varsayılan)" : ""}
                  </option>
                ))}
              </select>

              <button
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 shadow-2xs transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-zinc-800 dark:hover:text-zinc-200"
                onClick={() => setIsSettingsModalOpen(true)}
                title="Pipeline Ayarları ve Aşamaları Düzenle"
                type="button"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>
          <p className="mt-1 text-zinc-500 dark:text-zinc-400 text-xs">
            {activePipeline?.description ||
              "Müşteri ve canlı destek taleplerini aşamalara göre takip edin, çalışanlara akıllı dağıtın."}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Refresh */}
          <button
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 shadow-2xs transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            disabled={isRefreshing}
            onClick={loadDeals}
            title="Yenile"
            type="button"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </button>

          {/* View Mode Switcher */}
          <div className="flex items-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 p-1 shadow-2xs">
            <button
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold text-xs transition-all ${
                viewMode === "kanban"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
              onClick={() => setViewMode("kanban")}
              type="button"
            >
              <Kanban className="h-3.5 w-3.5" />
              <span>Pano</span>
            </button>
            <button
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold text-xs transition-all ${
                viewMode === "table"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
              onClick={() => setViewMode("table")}
              type="button"
            >
              <TableIcon className="h-3.5 w-3.5" />
              <span>Tablo</span>
            </button>
          </div>

          {/* Create Deal Button */}
          <button
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white text-xs shadow-xs transition-all hover:bg-blue-700 active:scale-[0.98]"
            onClick={() => setIsCreateModalOpen(true)}
            type="button"
          >
            <Plus className="h-4 w-4" />
            <span>Yeni Fırsat Ekle</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Pipeline Value */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-medium text-zinc-500 dark:text-zinc-400 text-xs">
                Açık Fırsat Hacmi
              </span>
              <div className="mt-1 font-extrabold text-2xl text-zinc-900 dark:text-zinc-100 tracking-tight sm:text-3xl">
                {formatCurrency(
                  stats?.totalOpenValue ?? 0,
                  stats?.currency ?? "TRY"
                )}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 border-zinc-100 dark:border-zinc-800 border-t pt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
            <span>{stats?.openDealsCount ?? 0} Aktif Fırsat</span>
            <span>•</span>
            <span>{stats?.wonDealsCount ?? 0} Kazanılan</span>
          </div>
        </div>

        {/* Win Rate */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-medium text-zinc-500 dark:text-zinc-400 text-xs">
                Kazanma Oranı (Win Rate)
              </span>
              <div className="mt-1 font-extrabold text-2xl text-zinc-900 dark:text-zinc-100 tracking-tight sm:text-3xl">
                %{stats?.winRatePercentage ?? 0}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <Award className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 border-zinc-100 dark:border-zinc-800 border-t pt-2 font-semibold text-[11px] text-emerald-600">
            <span>Başarıyla tamamlanan fırsatlar</span>
          </div>
        </div>

        {/* Unassigned Pool */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-medium text-zinc-500 dark:text-zinc-400 text-xs">
                Atanmamış / Açık Havuz
              </span>
              <div className="mt-1 font-extrabold text-2xl text-zinc-900 dark:text-zinc-100 tracking-tight sm:text-3xl">
                {deals.filter((d) => !d.assignedUserId).length}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 border-zinc-100 dark:border-zinc-800 border-t pt-2 font-semibold text-[11px] text-amber-600">
            <span>Temsilci ataması bekleyen kartlar</span>
          </div>
        </div>

        {/* SLA Breached */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-medium text-zinc-500 dark:text-zinc-400 text-xs">
                SLA Aşımı / Kritik
              </span>
              <div className="mt-1 font-extrabold text-2xl text-zinc-900 dark:text-zinc-100 tracking-tight sm:text-3xl">
                {stats?.slaBreachedCount ?? 0}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
              <Flame className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 border-zinc-100 dark:border-zinc-800 border-t pt-2 font-semibold text-[11px] text-rose-600">
            <span>Aşama yanıt süresi gecikenler</span>
          </div>
        </div>
      </div>

      {/* 3. Filter and Search Bar */}
      <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-4 shadow-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Quick Filter Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              className={`rounded-xl px-3.5 py-1.5 font-semibold text-xs transition ${
                filterType === "all"
                  ? "border border-blue-200 bg-blue-50 text-blue-700"
                  : "border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              }`}
              onClick={() => setFilterType("all")}
              type="button"
            >
              Tüm Fırsatlar ({deals.length})
            </button>

            <button
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 font-semibold text-xs transition ${
                filterType === "my"
                  ? "border border-blue-200 bg-blue-50 text-blue-700"
                  : "border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              }`}
              onClick={() => setFilterType("my")}
              type="button"
            >
              <UserCheck className="h-3.5 w-3.5" />
              Bana Atananlar
            </button>

            <button
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 font-semibold text-xs transition ${
                filterType === "unassigned"
                  ? "border border-amber-200 bg-amber-50 text-amber-700"
                  : "border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              }`}
              onClick={() => setFilterType("unassigned")}
              type="button"
            >
              <Users className="h-3.5 w-3.5" />
              Açık Havuz ({deals.filter((d) => !d.assignedUserId).length})
            </button>

            <button
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 font-semibold text-xs transition ${
                filterType === "sla"
                  ? "border border-rose-200 bg-rose-50 text-rose-700"
                  : "border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              }`}
              onClick={() => setFilterType("sla")}
              type="button"
            >
              <Flame className="h-3.5 w-3.5 text-rose-500" />
              SLA Aşanlar ({deals.filter((d) => d.isSlaBreached).length})
            </button>
          </div>

          {/* Search and Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
              <input
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-1.5 pr-8 pl-9 font-medium text-zinc-900 dark:text-zinc-100 text-xs placeholder-slate-400 shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Fırsat, müşteri veya iletişim ara..."
                type="text"
                value={searchQuery}
              />
              {searchQuery && (
                <button
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-400"
                  onClick={() => setSearchQuery("")}
                  type="button"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Priority filter */}
            <select
              className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 font-medium text-zinc-700 dark:text-zinc-300 text-xs shadow-2xs hover:bg-zinc-50 dark:hover:bg-zinc-800/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              onChange={(e) => setPriorityFilter(e.target.value)}
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
              className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 font-medium text-zinc-700 dark:text-zinc-300 text-xs shadow-2xs hover:bg-zinc-50 dark:hover:bg-zinc-800/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              onChange={(e) => setUserFilter(e.target.value)}
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

      {/* 4. Deals View (Kanban Board or Table View) */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center rounded-3xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 shadow-xs">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <span className="font-medium text-zinc-500 dark:text-zinc-400 text-xs">
              Pipeline ve fırsatlar yükleniyor...
            </span>
          </div>
        </div>
      ) : viewMode === "kanban" ? (
        /* Kanban Board View */
        <div className="custom-scrollbar flex gap-4 overflow-x-auto pb-4">
          {activePipeline?.stages?.map((stage) => {
            const stageDeals = dealsByStage[stage.id] || [];
            const stageTotal = stageDeals.reduce((sum, d) => sum + d.value, 0);
            const isDragOver = dragOverStageId === stage.id;

            return (
              <div
                className={`flex w-80 shrink-0 flex-col rounded-3xl border p-3 shadow-2xs transition-all duration-200 ${
                  isDragOver
                    ? "border-blue-400 bg-blue-50/80 ring-2 ring-blue-500/20"
                    : "border-zinc-200/80 dark:border-zinc-800/90 bg-zinc-50/70 dark:bg-zinc-800/40"
                }`}
                key={stage.id}
                onDragLeave={handleDragLeave}
                onDragOver={(e) => handleDragOver(e, stage.id)}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
                {/* Column Header */}
                <div className="mb-2.5 flex items-center justify-between border-zinc-200 dark:border-zinc-800 border-b px-1 pb-2.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <div
                      className="h-3 w-3 flex-none rounded-full shadow-xs"
                      style={{ backgroundColor: stage.color || "#3B82F6" }}
                    />
                    <span className="truncate font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                      {stage.name}
                    </span>
                    <span className="rounded-full bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 font-bold text-[10px] text-zinc-800 dark:text-zinc-100 shadow-2xs">
                      {stageDeals.length}
                    </span>
                  </div>

                  <div className="font-extrabold text-zinc-900 dark:text-zinc-100 text-xs">
                    {formatCurrency(stageTotal)}
                  </div>
                </div>

                {/* Stage Probability & SLA Sub-header */}
                <div className="mb-3 flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-900 px-2.5 py-1 text-[10px] text-zinc-500 dark:text-zinc-400 shadow-2xs">
                  <span className="flex items-center gap-1 font-semibold text-zinc-600 dark:text-zinc-400">
                    <Award className="h-3 w-3 text-blue-600" />
                    Kazanma: %{stage.probability}
                  </span>
                  {stage.slaHours ? (
                    <span className="flex items-center gap-1 font-semibold text-amber-600">
                      <Clock className="h-3 w-3" />
                      SLA: {stage.slaHours} saat
                    </span>
                  ) : (
                    <span>SLA: Süresiz</span>
                  )}
                </div>

                {/* Card Drop List */}
                <div className="custom-scrollbar max-h-[calc(100vh-320px)] flex-1 space-y-3 overflow-y-auto pr-0.5">
                  {stageDeals.map((deal) => {
                    return (
                      <div
                        className="group relative cursor-pointer rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-4 shadow-2xs transition-all hover:border-blue-300 hover:shadow-md active:scale-[0.99]"
                        draggable
                        key={deal.id}
                        onClick={() => setSelectedDealId(deal.id)}
                        onDragStart={(e) => handleDragStart(e, deal.id)}
                      >
                        {/* SLA Breach Warning */}
                        {deal.isSlaBreached && (
                          <div className="mb-2.5 flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 font-bold text-[10px] text-rose-700">
                            <AlertTriangle className="h-3.5 w-3.5 flex-none text-rose-600" />
                            <span>Aşama SLA Süresi Aşıldı!</span>
                          </div>
                        )}

                        {/* Top row: Source & Priority */}
                        <div className="mb-2 flex items-center justify-between gap-2">
                          {/* Source pill */}
                          <span
                            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 font-bold text-[10px] ${getSourceBadge(
                              deal.source
                            )}`}
                          >
                            {deal.source === "LiveChat" && (
                              <MessageSquare className="h-2.5 w-2.5" />
                            )}
                            {getSourceLabel(deal.source)}
                          </span>

                          {/* Priority */}
                          <span
                            className={`inline-flex items-center rounded-lg border px-2 py-0.5 font-bold text-[10px] ${getPriorityBadge(
                              deal.priority
                            )}`}
                          >
                            {getPriorityLabel(deal.priority)}
                          </span>
                        </div>

                        {/* Deal Title */}
                        <h4 className="mb-1.5 line-clamp-2 font-bold text-zinc-900 dark:text-zinc-100 text-xs transition-colors group-hover:text-blue-600">
                          {deal.title}
                        </h4>

                        {/* Customer / Company */}
                        {deal.customerName && (
                          <div className="mb-2.5 flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                            {deal.customerType === "Company" ? (
                              <Building2 className="h-3.5 w-3.5 flex-none text-zinc-400 dark:text-zinc-500" />
                            ) : (
                              <User className="h-3.5 w-3.5 flex-none text-zinc-400 dark:text-zinc-500" />
                            )}
                            <span className="truncate font-medium text-zinc-700 dark:text-zinc-300">
                              {deal.customerName}
                            </span>
                          </div>
                        )}

                        {/* Financial Value & Tags */}
                        <div className="mb-2.5 flex items-center justify-between border-zinc-100 dark:border-zinc-800 border-t pt-2.5">
                          <span className="font-extrabold text-zinc-900 dark:text-zinc-100 text-xs">
                            {formatCurrency(deal.value, deal.currency)}
                          </span>
                          {deal.tags && deal.tags.length > 0 && (
                            <span className="rounded-md bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 font-medium text-[10px] text-zinc-600 dark:text-zinc-400">
                              #{deal.tags[0]}
                            </span>
                          )}
                        </div>

                        {/* Card Footer: Assignee & Action */}
                        <div className="flex items-center justify-between border-zinc-100 dark:border-zinc-800 border-t pt-2 text-[11px]">
                          {deal.assignedUserId ? (
                            <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 font-bold text-[10px] text-blue-700">
                                {deal.assignedUserName
                                  ? deal.assignedUserName
                                      .charAt(0)
                                      .toUpperCase()
                                  : "U"}
                              </div>
                              <span className="max-w-[130px] truncate font-medium text-xs">
                                {deal.assignedUserName || "Temsilci"}
                              </span>
                            </div>
                          ) : (
                            <button
                              className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1 font-bold text-[10px] text-white shadow-2xs transition hover:bg-amber-600"
                              onClick={(e) => handleClaimDeal(deal.id, e)}
                              type="button"
                            >
                              <Zap className="h-2.5 w-2.5" />
                              Üzerime Al
                            </button>
                          )}

                          {/* Counters */}
                          <div className="flex items-center gap-2 text-[10px] text-zinc-400 dark:text-zinc-500">
                            {deal.notesCount > 0 && (
                              <span className="flex items-center gap-0.5 font-medium">
                                <MessageSquare className="h-3 w-3" />
                                {deal.notesCount}
                              </span>
                            )}
                            {deal.activitiesCount > 0 && (
                              <span className="flex items-center gap-0.5 font-medium">
                                <Activity className="h-3 w-3" />
                                {deal.activitiesCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {stageDeals.length === 0 && (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200 dark:border-zinc-800 border-dashed bg-white dark:bg-zinc-900/60 p-8 text-center">
                      <Kanban className="mb-1.5 h-6 w-6 text-slate-300" />
                      <p className="font-semibold text-zinc-500 dark:text-zinc-400 text-xs">
                        Bu aşamada kart yok
                      </p>
                      <p className="mt-0.5 text-[10px] text-zinc-400 dark:text-zinc-500">
                        Kart sürükleyip bırakabilirsiniz
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="overflow-hidden rounded-3xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-zinc-100 dark:border-zinc-800 border-b bg-zinc-50/50 dark:bg-zinc-800/30 font-medium text-[11px] text-zinc-500 dark:text-zinc-400">
                <tr>
                  <th className="py-3.5 pr-4 pl-6">Fırsat Başlığı</th>
                  <th className="px-4 py-3.5">Müşteri / Şirket</th>
                  <th className="px-4 py-3.5">Aşama</th>
                  <th className="px-4 py-3.5">Öncelik</th>
                  <th className="px-4 py-3.5">Kaynak</th>
                  <th className="px-4 py-3.5">Atanan Sorumlu</th>
                  <th className="px-4 py-3.5">SLA Durumu</th>
                  <th className="px-4 py-3.5 text-right">Tahmini Tutar</th>
                  <th className="py-3.5 pr-6 pl-4 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredDeals.map((deal) => (
                  <tr
                    className="group cursor-pointer transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50"
                    key={deal.id}
                    onClick={() => setSelectedDealId(deal.id)}
                  >
                    <td className="py-4 pr-4 pl-6 font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600">
                      {deal.title}
                    </td>
                    <td className="px-4 py-4 font-medium text-zinc-700 dark:text-zinc-300">
                      {deal.customerName || "-"}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className="inline-flex items-center rounded-lg border px-2.5 py-0.5 font-bold text-[10px]"
                        style={{
                          backgroundColor:
                            `${deal.stageColor}15` || "#3B82F615",
                          borderColor: `${deal.stageColor}35` || "#3B82F635",
                          color: deal.stageColor || "#1E40AF",
                        }}
                      >
                        {deal.stageName}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center rounded-lg border px-2 py-0.5 font-bold text-[10px] ${getPriorityBadge(
                          deal.priority
                        )}`}
                      >
                        {getPriorityLabel(deal.priority)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center rounded-lg border px-2 py-0.5 font-bold text-[10px] ${getSourceBadge(
                          deal.source
                        )}`}
                      >
                        {getSourceLabel(deal.source)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {deal.assignedUserId ? (
                        <div className="flex items-center gap-1.5">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 font-bold text-[10px] text-blue-700">
                            {deal.assignedUserName?.charAt(0) || "U"}
                          </div>
                          <span className="font-medium text-zinc-700 dark:text-zinc-300">
                            {deal.assignedUserName}
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center rounded-lg border border-amber-200 bg-amber-50 px-2 py-0.5 font-bold text-[10px] text-amber-700">
                          Açık Havuz
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {deal.isSlaBreached ? (
                        <span className="inline-flex items-center gap-1 font-bold text-[10px] text-rose-600">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          SLA Aşıldı
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-bold text-[10px] text-emerald-600">
                          <Check className="h-3.5 w-3.5" />
                          Normal
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right font-extrabold text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(deal.value, deal.currency)}
                    </td>
                    <td className="py-4 pr-6 pl-4 text-right">
                      <button
                        className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 font-semibold text-zinc-700 dark:text-zinc-300 text-xs shadow-2xs transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDealId(deal.id);
                        }}
                        type="button"
                      >
                        Detay
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredDeals.length === 0 && (
                  <tr>
                    <td
                      className="py-12 text-center text-zinc-500 dark:text-zinc-400"
                      colSpan={9}
                    >
                      Arama kriterlerinize uygun fırsat bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
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
    </div>
  );
}

// ============================================================================
// DEAL DETAIL DRAWER (Design System Uyumlu Sağ Çekmece)
// ============================================================================
function DealDetailDrawer({
  dealId,
  tenantSlug,
  onClose,
  onUpdated,
  employees,
  activePipeline,
}: {
  dealId: string;
  tenantSlug: string;
  onClose: () => void;
  onUpdated: () => void;
  employees: EmployeeDto[];
  activePipeline?: PipelineDto;
}) {
  const { activeTenant, profile } = usePermissions();
  const [deal, setDeal] = useState<DealDetailDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"timeline" | "notes">("timeline");
  const [newNote, setNewNote] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!activeTenant?.id) {
      return;
    }
    setIsLoading(true);
    try {
      const res = await ApiClient.getDealById(dealId, activeTenant.id);
      if (res.success && res.data) {
        setDeal(res.data);
      } else {
        toast.error("Fırsat detayları alınamadı");
      }
    } catch {
      toast.error("Detay yüklenirken hata oluştu");
    } finally {
      setIsLoading(false);
    }
  }, [activeTenant?.id, dealId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  // Stage change directly from drawer stepper
  const handleStageChange = async (targetStageId: string) => {
    if (!(activeTenant?.id && deal) || deal.stageId === targetStageId) {
      return;
    }

    try {
      const res = await ApiClient.moveDealStage(
        deal.id,
        { dealId: deal.id, targetStageId },
        activeTenant.id
      );
      if (res.success) {
        toast.success("Aşama başarıyla değiştirildi");
        fetchDetail();
        onUpdated();
      } else {
        toast.error(res.message || "Aşama değiştirilemedi");
      }
    } catch {
      toast.error("İşlem gerçekleştirilemedi");
    }
  };

  // Re-assign representative
  const handleAssignUser = async (userId: string) => {
    if (!(activeTenant?.id && deal)) {
      return;
    }
    const targetUserId = userId === "unassigned" ? undefined : userId;

    try {
      const res = await ApiClient.assignDeal(
        deal.id,
        { assignedUserId: targetUserId, dealId: deal.id },
        activeTenant.id
      );
      if (res.success) {
        toast.success("Temsilci ataması güncellendi");
        fetchDetail();
        onUpdated();
      } else {
        toast.error(res.message || "Atama güncellenemedi");
      }
    } catch {
      toast.error("İşlem sırasında hata oluştu");
    }
  };

  // Add internal note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(newNote.trim() && activeTenant?.id && deal)) {
      return;
    }

    setIsSubmittingNote(true);
    try {
      const res = await ApiClient.addDealNote(
        deal.id,
        { content: newNote.trim(), dealId: deal.id },
        activeTenant.id
      );
      if (res.success) {
        toast.success("Not eklendi");
        setNewNote("");
        fetchDetail();
        onUpdated();
      } else {
        toast.error(res.message || "Not eklenemedi");
      }
    } catch {
      toast.error("Hata oluştu");
    } finally {
      setIsSubmittingNote(false);
    }
  };

  // Confirm Delete Deal
  const handleConfirmDelete = async () => {
    if (!(activeTenant?.id && deal)) {
      return;
    }
    setIsDeleting(true);
    try {
      const res = await ApiClient.deleteDeal(deal.id, activeTenant.id);
      if (res.success) {
        toast.success("Fırsat başarıyla silindi");
        setIsDeleteDialogOpen(false);
        onClose();
        onUpdated();
      } else {
        toast.error(res.message || "Fırsat silinemedi");
      }
    } catch {
      toast.error("Hata oluştu");
    } finally {
      setIsDeleting(false);
    }
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fade-in fixed inset-0 z-50 flex animate-in justify-end">
      {/* Backdrop with Click-to-Close */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Design System Confirm Dialog */}
      <ConfirmDialog
        cancelText="Vazgeç"
        confirmText="Evet, Sil"
        description={`"${deal?.title || "Bu fırsat"}" başlıklı kart kalıcı olarak silinecektir. Bu işlem geri alınamaz.`}
        loading={isDeleting}
        onConfirm={handleConfirmDelete}
        onOpenChange={setIsDeleteDialogOpen}
        open={isDeleteDialogOpen}
        title="Fırsat Kartını Sil"
        variant="destructive"
      />

      <div className="slide-in-from-right relative z-10 flex h-full w-full animate-in flex-col overflow-hidden border-zinc-200 dark:border-zinc-800 border-l bg-white dark:bg-zinc-900 shadow-2xl duration-200 md:max-w-2xl">
        {/* Drawer Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between gap-2 border-zinc-200/80 dark:border-zinc-800/90 border-b bg-zinc-50/80 dark:bg-zinc-800/50 p-3.5 sm:p-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 shadow-2xs transition hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 active:scale-95"
              onClick={onClose}
              title="Kapat & Geri Dön"
              type="button"
            >
              <ArrowLeft className="h-4.5 w-4.5 sm:hidden" />
              <X className="hidden h-4.5 w-4.5 sm:block" />
            </button>
            <div className="min-w-0">
              <span className="block truncate font-semibold text-[11px] text-zinc-500 dark:text-zinc-400">
                {deal?.pipelineName || "Pipeline Fırsatı"}
              </span>
              <h2 className="max-w-[200px] truncate font-bold text-zinc-900 dark:text-zinc-100 text-sm leading-tight sm:max-w-md sm:text-base">
                {deal?.title || "Fırsat Detayı"}
              </h2>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-400 dark:text-zinc-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
              onClick={() => setIsDeleteDialogOpen(true)}
              title="Fırsatı Sil"
              type="button"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        {isLoading || !deal ? (
          <div className="flex flex-1 items-center justify-center text-zinc-500 dark:text-zinc-400">
            <RefreshCw className="mr-2 h-6 w-6 animate-spin text-blue-600" />
            <span className="font-medium text-xs">Detaylar yükleniyor...</span>
          </div>
        ) : (
          <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-4 pb-28 sm:p-5 sm:pb-8">
            {/* 1. Stage Progression Stepper */}
            <div>
              <label className="mb-2 block font-bold text-[11px] text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                Aşama İlerlemesi (Tıklayarak Değiştirin)
              </label>
              <div className="grid grid-cols-2 gap-2 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-zinc-50/70 dark:bg-zinc-800/40 p-2.5 sm:grid-cols-4">
                {activePipeline?.stages?.map((stage) => {
                  const isCurrent = deal.stageId === stage.id;
                  return (
                    <button
                      className={`flex flex-col justify-between rounded-xl px-3 py-2.5 text-left font-semibold text-xs transition-all ${
                        isCurrent
                          ? "bg-blue-600 text-white shadow-xs ring-2 ring-blue-400/30"
                          : "border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      }`}
                      key={stage.id}
                      onClick={() => handleStageChange(stage.id)}
                      type="button"
                    >
                      <span className="truncate">{stage.name}</span>
                      <span
                        className={`mt-1 font-medium text-[10px] ${
                          isCurrent ? "text-blue-100" : "text-zinc-400 dark:text-zinc-500"
                        }`}
                      >
                        %{stage.probability} Olasılık
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Live Chat Integration Banner (if deal from chat) */}
            {deal.source === "LiveChat" && (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-purple-200 bg-purple-50/70 p-4 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-purple-900 text-xs">
                      Canlı Destek Oturumu Bağlantılı
                    </h4>
                    <p className="text-[11px] text-purple-700">
                      Bu kart canlı destek sohbetinden otomatik türetildi.
                    </p>
                  </div>
                </div>

                <Link
                  className="flex items-center gap-1.5 rounded-xl border border-purple-300/60 bg-purple-100 px-3 py-1.5 font-semibold text-purple-700 text-xs transition hover:bg-purple-200 hover:text-purple-900"
                  href={`/${tenantSlug}/messages`}
                >
                  <span>Sohbete Git</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}

            {/* 3. Core Properties Grid */}
            <div className="grid grid-cols-2 gap-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-4 shadow-xs sm:grid-cols-3">
              {/* Value */}
              <div>
                <span className="font-semibold text-[10px] text-zinc-500 dark:text-zinc-400 uppercase">
                  Tutar
                </span>
                <p className="mt-0.5 font-extrabold text-base text-zinc-900 dark:text-zinc-100">
                  {new Intl.NumberFormat("tr-TR", {
                    currency: deal.currency || "TRY",
                    style: "currency",
                  }).format(deal.value)}
                </p>
              </div>

              {/* Priority */}
              <div>
                <span className="font-semibold text-[10px] text-zinc-500 dark:text-zinc-400 uppercase">
                  Öncelik
                </span>
                <p className="mt-1">
                  <span
                    className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 font-bold text-[10px] ${
                      deal.priority === "Urgent"
                        ? "border-rose-200 bg-rose-50 text-rose-700"
                        : deal.priority === "High"
                          ? "border-amber-200 bg-amber-50 text-amber-700"
                          : "border-blue-200 bg-blue-50 text-blue-700"
                    }`}
                  >
                    {deal.priority === "Urgent"
                      ? "Acil"
                      : deal.priority === "High"
                        ? "Yüksek"
                        : "Orta"}
                  </span>
                </p>
              </div>

              {/* SLA Status */}
              <div>
                <span className="font-semibold text-[10px] text-zinc-500 dark:text-zinc-400 uppercase">
                  SLA Durumu
                </span>
                <p className="mt-1">
                  {deal.isSlaBreached ? (
                    <span className="inline-flex items-center gap-1 font-bold text-[10px] text-rose-600">
                      <AlertTriangle className="h-3.5 w-3.5" /> Süre Aşıldı
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-bold text-[10px] text-emerald-600">
                      <Check className="h-3.5 w-3.5" /> Uygun
                    </span>
                  )}
                </p>
              </div>

              {/* Assigned Representative */}
              <div className="col-span-2 border-zinc-100 dark:border-zinc-800 border-t pt-3 sm:col-span-3">
                <div className="space-y-1.5">
                  <span className="font-bold text-zinc-700 dark:text-zinc-300 text-xs">
                    Sorumlu Çalışan / Satış Temsilcisi
                  </span>
                  <SalesRepPicker
                    employees={employees}
                    onChange={(empId) => handleAssignUser(empId || "unassigned")}
                    placeholder="Temsilci arayın veya seçin..."
                    value={deal.assignedUserId || ""}
                  />
                </div>
              </div>
            </div>

            {/* 4. Customer / Contact Details */}
            {(deal.customerName ||
              deal.contactName ||
              deal.contactEmail ||
              deal.contactPhone) && (
              <div className="space-y-3 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-4 shadow-xs">
                <h4 className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                  <User className="h-4 w-4 text-blue-600" />
                  Müşteri & İletişim Bilgileri
                </h4>
                <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                  {deal.customerName && (
                    <div>
                      <span className="font-medium text-zinc-400 dark:text-zinc-500">
                        Müşteri / Şirket:
                      </span>
                      <p className="font-bold text-zinc-800 dark:text-zinc-200">
                        {deal.customerName}
                      </p>
                    </div>
                  )}
                  {deal.contactName && (
                    <div>
                      <span className="font-medium text-zinc-400 dark:text-zinc-500">
                        İlgili Kişi:
                      </span>
                      <p className="font-bold text-zinc-800 dark:text-zinc-200">
                        {deal.contactName}
                      </p>
                    </div>
                  )}
                  {deal.contactEmail && (
                    <div>
                      <span className="font-medium text-zinc-400 dark:text-zinc-500">
                        E-Posta:
                      </span>
                      <p className="font-semibold text-blue-600">
                        {deal.contactEmail}
                      </p>
                    </div>
                  )}
                  {deal.contactPhone && (
                    <div>
                      <span className="font-medium text-zinc-400 dark:text-zinc-500">
                        Telefon:
                      </span>
                      <p className="font-bold text-zinc-800 dark:text-zinc-200">
                        {deal.contactPhone}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 5. Tabs: Timeline (Aktiviteler) & Notes (Notlar) */}
            <div>
              <div className="mb-4 flex border-zinc-200 dark:border-zinc-800 border-b">
                <button
                  className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 font-bold text-xs transition ${
                    activeTab === "timeline"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                  }`}
                  onClick={() => setActiveTab("timeline")}
                  type="button"
                >
                  <Activity className="h-3.5 w-3.5" />
                  Aktiviteler ({deal.activities?.length || 0})
                </button>
                <button
                  className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 font-bold text-xs transition ${
                    activeTab === "notes"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                  }`}
                  onClick={() => setActiveTab("notes")}
                  type="button"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Notlar ({deal.notes?.length || 0})
                </button>
              </div>

              {activeTab === "timeline" ? (
                /* Activities Timeline */
                <div className="space-y-3">
                  {deal.activities?.map((act) => (
                    <div
                      className="flex items-start gap-3 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-zinc-50/70 dark:bg-zinc-800/40 p-3.5 text-xs"
                      key={act.id}
                    >
                      <div className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                        <Activity className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-zinc-900 dark:text-zinc-100">
                            {act.title}
                          </span>
                          <span className="font-medium text-[10px] text-zinc-400 dark:text-zinc-500">
                            {new Date(act.createdAt).toLocaleString("tr-TR")}
                          </span>
                        </div>
                        {act.description && (
                          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                            {act.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {(!deal.activities || deal.activities.length === 0) && (
                    <p className="py-6 text-center text-zinc-400 dark:text-zinc-500 text-xs">
                      Henüz aktivite kaydı yok.
                    </p>
                  )}
                </div>
              ) : (
                /* Notes Tab */
                <div className="space-y-4">
                  {/* Note Creator Form */}
                  <form className="space-y-2" onSubmit={handleAddNote}>
                    <textarea
                      className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 font-medium text-zinc-900 dark:text-zinc-100 text-xs placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Bu fırsat için dahili bir not ekleyin..."
                      rows={3}
                      value={newNote}
                    />
                    <div className="flex justify-end">
                      <button
                        className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white text-xs shadow-xs transition hover:bg-blue-700 disabled:opacity-50"
                        disabled={isSubmittingNote || !newNote.trim()}
                        type="submit"
                      >
                        {isSubmittingNote ? "Ekleniyor..." : "Not Ekle"}
                      </button>
                    </div>
                  </form>

                  {/* Notes List */}
                  <div className="space-y-2.5">
                    {deal.notes?.map((n) => (
                      <div
                        className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-3.5 text-xs shadow-2xs"
                        key={n.id}
                      >
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className="font-bold text-blue-700">
                            {n.userName || "Kullanıcı"}
                          </span>
                          <span className="font-medium text-[10px] text-zinc-400 dark:text-zinc-500">
                            {new Date(n.createdAt).toLocaleString("tr-TR")}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
                          {n.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// CREATE DEAL QUICK MODAL (Design System Uyumlu)
// ============================================================================
function CreateDealModal({
  tenantSlug,
  activePipeline,
  pipelines,
  employees,
  onClose,
  onCreated,
}: {
  tenantSlug: string;
  activePipeline?: PipelineDto;
  pipelines: PipelineDto[];
  employees: EmployeeDto[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const { activeTenant } = usePermissions();
  const [pipelineId, setPipelineId] = useState(
    activePipeline?.id || pipelines[0]?.id || ""
  );
  const [stageId, setStageId] = useState("");
  const [title, setTitle] = useState("");
  const [value, setValue] = useState<number>(0);
  const [currency, setCurrency] = useState("TRY");
  const [priority, setPriority] = useState("Medium");
  const [assignedUserId, setAssignedUserId] = useState<string>("auto");
  const [source, setSource] = useState("Manual");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [initialNote, setInitialNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentPipe =
    pipelines.find((p) => p.id === pipelineId) || activePipeline;

  useEffect(() => {
    const firstStage = currentPipe?.stages?.[0];
    if (firstStage) {
      setStageId(firstStage.id);
    }
  }, [currentPipe]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(title.trim() && pipelineId && activeTenant?.id)) {
      toast.error("Lütfen zorunlu alanları doldurun");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await ApiClient.createDeal(
        {
          assignedUserId:
            assignedUserId === "auto" || assignedUserId === "unassigned"
              ? undefined
              : assignedUserId,
          contactEmail: contactEmail.trim() || undefined,
          contactName: contactName.trim() || undefined,
          contactPhone: contactPhone.trim() || undefined,
          currency,
          initialNote: initialNote.trim() || undefined,
          pipelineId,
          priority,
          source,
          stageId: stageId || undefined,
          title: title.trim(),
          value: Number(value) || 0,
        },
        activeTenant.id
      );

      if (res.success) {
        toast.success("Fırsat kartı başarıyla oluşturuldu");
        onCreated();
      } else {
        toast.error(res.message || "Fırsat oluşturulamadı");
      }
    } catch {
      toast.error("Hata oluştu");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fade-in fixed inset-0 z-50 flex animate-in items-center justify-center overflow-y-auto p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative z-10 my-auto flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-zinc-100 dark:border-zinc-800 border-b bg-zinc-50/50 dark:bg-zinc-800/30 p-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Plus className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
              Yeni Fırsat Kartı Ekle
            </h3>
          </div>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          className="custom-scrollbar space-y-4 overflow-y-auto p-6"
          onSubmit={handleSubmit}
        >
          {/* Pipeline & Stage */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-bold text-zinc-700 dark:text-zinc-300 text-xs">
                Pipeline
              </label>
              <select
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 font-medium text-zinc-800 dark:text-zinc-200 text-xs shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                onChange={(e) => setPipelineId(e.target.value)}
                value={pipelineId}
              >
                {pipelines.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block font-bold text-zinc-700 dark:text-zinc-300 text-xs">
                Başlangıç Aşaması
              </label>
              <select
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 font-medium text-zinc-800 dark:text-zinc-200 text-xs shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                onChange={(e) => setStageId(e.target.value)}
                value={stageId}
              >
                {currentPipe?.stages?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (%{s.probability})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="mb-1 block font-bold text-zinc-700 dark:text-zinc-300 text-xs">
              Fırsat / İş Başlığı *
            </label>
            <input
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 font-medium text-zinc-900 dark:text-zinc-100 text-xs placeholder-slate-400 shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              onChange={(e) => setTitle(e.target.value)}
              placeholder="örn: Kurumsal Yazılım Lisans Teklifi"
              required
              type="text"
              value={title}
            />
          </div>

          {/* Value & Currency & Priority */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block font-bold text-zinc-700 dark:text-zinc-300 text-xs">
                Tahmini Tutar
              </label>
              <div className="flex gap-2">
                <input
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 font-medium text-zinc-900 dark:text-zinc-100 text-xs shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  min="0"
                  onChange={(e) => setValue(Number(e.target.value))}
                  step="100"
                  type="number"
                  value={value}
                />
                <select
                  className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2.5 font-bold text-zinc-700 dark:text-zinc-300 text-xs shadow-2xs"
                  onChange={(e) => setCurrency(e.target.value)}
                  value={currency}
                >
                  <option value="TRY">₺ TRY</option>
                  <option value="USD">$ USD</option>
                  <option value="EUR">€ EUR</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block font-bold text-zinc-700 dark:text-zinc-300 text-xs">
                Öncelik
              </label>
              <select
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2 py-2 font-bold text-zinc-700 dark:text-zinc-300 text-xs shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                onChange={(e) => setPriority(e.target.value)}
                value={priority}
              >
                <option value="Low">Düşük</option>
                <option value="Medium">Orta</option>
                <option value="High">Yüksek</option>
                <option value="Urgent">Acil</option>
              </select>
            </div>
          </div>

          {/* Representative Assignment */}
          <div>
            <label className="mb-1 block font-bold text-zinc-700 dark:text-zinc-300 text-xs">
              Atama Kuralı / Sorumlu Çalışan
            </label>
            <select
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 font-medium text-zinc-800 dark:text-zinc-200 text-xs shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              onChange={(e) => setAssignedUserId(e.target.value)}
              value={assignedUserId}
            >
              <option value="auto">
                ⚡ Otomatik Dağıtım (Round-Robin / Yük Dengesi)
              </option>
              <option value="unassigned">Açık Havuzda Bırak (Atanmamış)</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.userId || emp.id}>
                  {emp.fullName} ({emp.departmentName || "Genel"})
                </option>
              ))}
            </select>
          </div>

          {/* Contact Information (Lead) */}
          <div className="space-y-3 border-zinc-100 dark:border-zinc-800 border-t pt-3">
            <h4 className="font-bold text-blue-700 text-xs">
              Potansiyel Müşteri / Kontak Bilgisi
            </h4>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <input
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 font-medium text-zinc-900 dark:text-zinc-100 text-xs placeholder-slate-400 shadow-2xs focus:border-blue-500 focus:outline-none"
                onChange={(e) => setContactName(e.target.value)}
                placeholder="İsim / Şirket Adı"
                type="text"
                value={contactName}
              />
              <input
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 font-medium text-zinc-900 dark:text-zinc-100 text-xs placeholder-slate-400 shadow-2xs focus:border-blue-500 focus:outline-none"
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="E-Posta"
                type="email"
                value={contactEmail}
              />
              <input
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 font-medium text-zinc-900 dark:text-zinc-100 text-xs placeholder-slate-400 shadow-2xs focus:border-blue-500 focus:outline-none"
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="Telefon"
                type="tel"
                value={contactPhone}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 border-zinc-100 dark:border-zinc-800 border-t pt-4">
            <button
              className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2 font-semibold text-zinc-700 dark:text-zinc-300 text-xs shadow-2xs transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              onClick={onClose}
              type="button"
            >
              Vazgeç
            </button>
            <button
              className="rounded-xl bg-blue-600 px-5 py-2 font-semibold text-white text-xs shadow-xs transition hover:bg-blue-700 disabled:opacity-50"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Kaydediliyor..." : "Fırsatı Oluştur"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// PIPELINE & STAGES CONFIGURATION MODAL (Design System Uyumlu)
// ============================================================================
function PipelineSettingsModal({
  pipeline,
  tenantSlug,
  onClose,
  onUpdated,
}: {
  pipeline?: PipelineDto;
  tenantSlug: string;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const { activeTenant } = usePermissions();
  const [name, setName] = useState(pipeline?.name || "");
  const [description, setDescription] = useState(pipeline?.description || "");
  const [routingStrategy, setRoutingStrategy] = useState(
    pipeline?.routingStrategy || "RoundRobin"
  );
  const [stages, setStages] = useState<
    {
      id?: string;
      name: string;
      orderIndex: number;
      color: string;
      probability: number;
      slaHours?: number;
      isWonStage: boolean;
      isLostStage: boolean;
    }[]
  >(
    pipeline?.stages?.map((s) => ({
      color: s.color || "#3B82F6",
      id: s.id,
      isLostStage: s.isLostStage,
      isWonStage: s.isWonStage,
      name: s.name,
      orderIndex: s.orderIndex,
      probability: s.probability,
      slaHours: s.slaHours || undefined,
    })) || []
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleAddStage = () => {
    setStages((prev) => [
      ...prev,
      {
        color: "#3B82F6",
        isLostStage: false,
        isWonStage: false,
        name: "Yeni Aşama",
        orderIndex: prev.length,
        probability: 50,
      },
    ]);
  };

  const handleRemoveStage = (index: number) => {
    setStages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(name.trim() && activeTenant?.id && pipeline?.id)) {
      return;
    }

    setIsSaving(true);
    try {
      const res = await ApiClient.updatePipeline(
        pipeline.id,
        {
          description: description.trim() || undefined,
          id: pipeline.id,
          isActive: true,
          isDefault: pipeline.isDefault,
          name: name.trim(),
          routingStrategy,
          stages: stages.map((s, idx) => ({
            ...s,
            orderIndex: idx,
          })),
        },
        activeTenant.id
      );

      if (res.success) {
        toast.success("Pipeline ve aşama ayarları kaydedildi");
        onUpdated();
      } else {
        toast.error(res.message || "Kaydedilemedi");
      }
    } catch {
      toast.error("Hata oluştu");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fade-in fixed inset-0 z-50 flex animate-in items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between border-zinc-100 dark:border-zinc-800 border-b bg-zinc-50/50 dark:bg-zinc-800/30 p-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Settings className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
              Pipeline ve Aşama Yapılandırması
            </h3>
          </div>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          className="custom-scrollbar flex-1 space-y-5 overflow-y-auto p-6"
          onSubmit={handleSave}
        >
          {/* General Pipeline Settings */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block font-bold text-zinc-700 dark:text-zinc-300 text-xs">
                Pipeline Adı
              </label>
              <input
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 font-medium text-zinc-900 dark:text-zinc-100 text-xs shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                onChange={(e) => setName(e.target.value)}
                required
                type="text"
                value={name}
              />
            </div>

            <div>
              <label className="mb-1 block font-bold text-zinc-700 dark:text-zinc-300 text-xs">
                Otomatik Dağıtım Algoritması (Routing)
              </label>
              <select
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 font-medium text-zinc-800 dark:text-zinc-200 text-xs shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                onChange={(e) => setRoutingStrategy(e.target.value)}
                value={routingStrategy}
              >
                <option value="RoundRobin">
                  Round-Robin (Sırayla Eşit Dağıtım)
                </option>
                <option value="LeastLoaded">
                  İş Yükü Dengeli (En Az İşi Olana)
                </option>
                <option value="OnlineOnly">
                  Sadece Çevrimiçi / Aktif Personele
                </option>
                <option value="Manual">Manuel / Açık Havuz Modeli</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block font-bold text-zinc-700 dark:text-zinc-300 text-xs">
                Açıklama
              </label>
              <input
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 font-medium text-zinc-900 dark:text-zinc-100 text-xs placeholder-slate-400 shadow-2xs focus:border-blue-500 focus:outline-none"
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Pipeline'ın kullanım amacını belirtin"
                type="text"
                value={description}
              />
            </div>
          </div>

          {/* Stages Configuration */}
          <div className="space-y-3 border-zinc-100 dark:border-zinc-800 border-t pt-4">
            <div className="flex items-center justify-between">
              <h4 className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                <Layers className="h-4 w-4 text-blue-600" />
                Pipeline Aşamaları ({stages.length})
              </h4>
              <button
                className="flex items-center gap-1 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 font-semibold text-blue-600 text-xs transition hover:bg-blue-100 hover:text-blue-700"
                onClick={handleAddStage}
                type="button"
              >
                <Plus className="h-3.5 w-3.5" />
                Aşama Ekle
              </button>
            </div>

            <div className="space-y-2.5">
              {stages.map((stage, idx) => (
                <div
                  className="flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-zinc-50/70 dark:bg-zinc-800/40 p-3.5 shadow-2xs sm:flex-nowrap"
                  key={idx}
                >
                  <span className="w-4 font-bold text-zinc-400 dark:text-zinc-500 text-xs">
                    {idx + 1}.
                  </span>

                  {/* Stage Name */}
                  <input
                    className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 font-medium text-zinc-900 dark:text-zinc-100 text-xs focus:border-blue-500 focus:outline-none"
                    onChange={(e) => {
                      const val = e.target.value;
                      setStages((prev) =>
                        prev.map((s, i) =>
                          i === idx ? { ...s, name: val } : s
                        )
                      );
                    }}
                    placeholder="Aşama Adı"
                    required
                    type="text"
                    value={stage.name}
                  />

                  {/* Probability */}
                  <div className="flex w-24 items-center gap-1">
                    <span className="font-bold text-[10px] text-zinc-400 dark:text-zinc-500">
                      %
                    </span>
                    <input
                      className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2 py-1.5 text-right font-bold text-zinc-800 dark:text-zinc-200 text-xs"
                      max="100"
                      min="0"
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setStages((prev) =>
                          prev.map((s, i) =>
                            i === idx ? { ...s, probability: val } : s
                          )
                        );
                      }}
                      type="number"
                      value={stage.probability}
                    />
                  </div>

                  {/* SLA Hours */}
                  <div className="flex w-28 items-center gap-1">
                    <span className="font-bold text-[10px] text-zinc-400 dark:text-zinc-500">
                      SLA(s):
                    </span>
                    <input
                      className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2 py-1.5 text-right font-bold text-zinc-800 dark:text-zinc-200 text-xs"
                      min="1"
                      onChange={(e) => {
                        const val = e.target.value
                          ? Number(e.target.value)
                          : undefined;
                        setStages((prev) =>
                          prev.map((s, i) =>
                            i === idx ? { ...s, slaHours: val } : s
                          )
                        );
                      }}
                      placeholder="Yok"
                      type="number"
                      value={stage.slaHours || ""}
                    />
                  </div>

                  {/* Color Picker */}
                  <input
                    className="h-8 w-8 cursor-pointer rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-0.5"
                    onChange={(e) => {
                      const val = e.target.value;
                      setStages((prev) =>
                        prev.map((s, i) =>
                          i === idx ? { ...s, color: val } : s
                        )
                      );
                    }}
                    title="Aşama Rengi"
                    type="color"
                    value={stage.color}
                  />

                  {/* Remove stage button */}
                  {stages.length > 2 && (
                    <button
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                      onClick={() => handleRemoveStage(idx)}
                      title="Aşamayı Kaldır"
                      type="button"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-end gap-2 border-zinc-100 dark:border-zinc-800 border-t pt-4">
            <button
              className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2 font-semibold text-zinc-700 dark:text-zinc-300 text-xs shadow-2xs transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              onClick={onClose}
              type="button"
            >
              Vazgeç
            </button>
            <button
              className="rounded-xl bg-blue-600 px-5 py-2 font-semibold text-white text-xs shadow-xs transition hover:bg-blue-700 disabled:opacity-50"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
