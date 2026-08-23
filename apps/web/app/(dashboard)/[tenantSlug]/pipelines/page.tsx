"use client";

import { ConfirmDialog } from "@workspace/ui/components/confirm-dialog";
import { toast } from "@workspace/ui/components/sonner";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  Building,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  Eye,
  Filter,
  Flame,
  HelpCircle,
  Kanban,
  Layers,
  List,
  Mail,
  MessageSquare,
  MoreHorizontal,
  MoveRight,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  Table as TableIcon,
  Tag,
  Trash2,
  TrendingDown,
  TrendingUp,
  User,
  UserCheck,
  UserPlus,
  Users,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { PermissionGate } from "@/components/permission-gate";
import {
  ApiClient,
  type DealDetailDto,
  type DealStatsResponse,
  type DealSummaryDto,
  type EmployeeDto,
  type PipelineDto,
  type PipelineStageDto,
} from "@/lib/api-client";
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
  const [filterType, setFilterType] = useState<"all" | "my" | "unassigned" | "sla">("all");
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
    if (!activeTenant?.id) return;
    setIsLoading(true);
    try {
      const [pipeRes, empRes] = await Promise.all([
        ApiClient.getPipelines(activeTenant.id),
        ApiClient.getEmployees({ pageSize: 100, status: "Active" }, activeTenant.id),
      ]);

      if (pipeRes.success && pipeRes.data && pipeRes.data.length > 0) {
        setPipelines(pipeRes.data);
        const defaultPipe = pipeRes.data.find((p) => p.isDefault) || pipeRes.data[0];
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
    if (!activeTenant?.id || !selectedPipelineId) return;
    setIsRefreshing(true);
    try {
      const [dealsRes, statsRes] = await Promise.all([
        ApiClient.getDeals({ pipelineId: selectedPipelineId, pageSize: 200 }, activeTenant.id),
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

  const activePipeline = useMemo(() => {
    return pipelines.find((p) => p.id === selectedPipelineId) || pipelines[0];
  }, [pipelines, selectedPipelineId]);

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
        if (!matchesTitle && !matchesCustomer && !matchesContact && !matchesEmail && !matchesPhone) {
          return false;
        }
      }

      // 2. Filter Type
      if (filterType === "my") {
        if (!profile?.id || deal.assignedUserId !== profile.id) return false;
      } else if (filterType === "unassigned") {
        if (deal.assignedUserId) return false;
      } else if (filterType === "sla") {
        if (!deal.isSlaBreached) return false;
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

    if (!dealId || !targetStageId || !activeTenant?.id) return;

    const currentDeal = deals.find((d) => d.id === dealId);
    if (!currentDeal || currentDeal.stageId === targetStageId) return;

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
          prev.map((d) => (d.id === dealId ? { ...d, stageId: previousStageId } : d))
        );
        toast.error(res.message || "Aşama güncellenirken hata oluştu");
      }
    } catch {
      setDeals((prev) =>
        prev.map((d) => (d.id === dealId ? { ...d, stageId: previousStageId } : d))
      );
      toast.error("İşlem gerçekleştirilemedi");
    }
  };

  // Claim deal (Assign to me)
  const handleClaimDeal = async (dealId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!profile?.id || !activeTenant?.id) {
      toast.error("Kullanıcı profiliniz bulunamadı");
      return;
    }

    try {
      const res = await ApiClient.assignDeal(
        dealId,
        { dealId, assignedUserId: profile.id },
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

  const formatCurrency = (val: number, cur = "TRY") => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: cur === "TRY" ? "TRY" : cur,
      maximumFractionDigits: 0,
    }).format(val);
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "Urgent":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "High":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Medium":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Low":
        return "bg-slate-100 text-slate-700 border-slate-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
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
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "WebForm":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Campaign":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
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
            <h1 className="font-bold text-2xl text-slate-900 tracking-tight sm:text-3xl">
              Pipeline & Satış Hunisi
            </h1>

            {/* Pipeline Selector */}
            <div className="flex items-center gap-1.5">
              <select
                value={selectedPipelineId}
                onChange={(e) => setSelectedPipelineId(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-bold text-slate-800 text-xs shadow-2xs hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {pipelines.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.isDefault ? "(Varsayılan)" : ""}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(true)}
                title="Pipeline Ayarları ve Aşamaları Düzenle"
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-2xs hover:bg-slate-50 hover:text-slate-800 transition"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>
          <p className="mt-1 text-slate-500 text-xs">
            {activePipeline?.description || "Müşteri ve canlı destek taleplerini aşamalara göre takip edin, çalışanlara akıllı dağıtın."}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Refresh */}
          <button
            type="button"
            onClick={loadDeals}
            disabled={isRefreshing}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-2xs hover:bg-slate-50 transition"
            title="Yenile"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>

          {/* View Mode Switcher */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100 p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                viewMode === "kanban"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Kanban className="h-3.5 w-3.5" />
              <span>Pano</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                viewMode === "table"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <TableIcon className="h-3.5 w-3.5" />
              <span>Tablo</span>
            </button>
          </div>

          {/* Create Deal Button */}
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white text-xs shadow-xs transition-all hover:bg-blue-700 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            <span>Yeni Fırsat Ekle</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Pipeline Value */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-medium text-slate-500 text-xs">
                Açık Fırsat Hacmi
              </span>
              <div className="mt-1 font-extrabold text-2xl text-slate-900 tracking-tight sm:text-3xl">
                {formatCurrency(stats?.totalOpenValue ?? 0, stats?.currency ?? "TRY")}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 border-slate-100 border-t pt-2 text-[11px] text-slate-500">
            <span>{stats?.openDealsCount ?? 0} Aktif Fırsat</span>
            <span>•</span>
            <span>{stats?.wonDealsCount ?? 0} Kazanılan</span>
          </div>
        </div>

        {/* Win Rate */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-medium text-slate-500 text-xs">
                Kazanma Oranı (Win Rate)
              </span>
              <div className="mt-1 font-extrabold text-2xl text-slate-900 tracking-tight sm:text-3xl">
                %{stats?.winRatePercentage ?? 0}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Award className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 border-slate-100 border-t pt-2 font-semibold text-[11px] text-emerald-600">
            <span>Başarıyla tamamlanan fırsatlar</span>
          </div>
        </div>

        {/* Unassigned Pool */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-medium text-slate-500 text-xs">
                Atanmamış / Açık Havuz
              </span>
              <div className="mt-1 font-extrabold text-2xl text-slate-900 tracking-tight sm:text-3xl">
                {deals.filter((d) => !d.assignedUserId).length}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 border-slate-100 border-t pt-2 font-semibold text-[11px] text-amber-600">
            <span>Temsilci ataması bekleyen kartlar</span>
          </div>
        </div>

        {/* SLA Breached */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-medium text-slate-500 text-xs">
                SLA Aşımı / Kritik
              </span>
              <div className="mt-1 font-extrabold text-2xl text-slate-900 tracking-tight sm:text-3xl">
                {stats?.slaBreachedCount ?? 0}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <Flame className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 border-slate-100 border-t pt-2 font-semibold text-[11px] text-rose-600">
            <span>Aşama yanıt süresi gecikenler</span>
          </div>
        </div>
      </div>

      {/* 3. Filter and Search Bar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Quick Filter Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterType("all")}
              className={`rounded-xl px-3.5 py-1.5 font-semibold text-xs transition ${
                filterType === "all"
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              Tüm Fırsatlar ({deals.length})
            </button>

            <button
              type="button"
              onClick={() => setFilterType("my")}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 font-semibold text-xs transition ${
                filterType === "my"
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <UserCheck className="h-3.5 w-3.5" />
              Bana Atananlar
            </button>

            <button
              type="button"
              onClick={() => setFilterType("unassigned")}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 font-semibold text-xs transition ${
                filterType === "unassigned"
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              Açık Havuz ({deals.filter((d) => !d.assignedUserId).length})
            </button>

            <button
              type="button"
              onClick={() => setFilterType("sla")}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 font-semibold text-xs transition ${
                filterType === "sla"
                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Flame className="h-3.5 w-3.5 text-rose-500" />
              SLA Aşanlar ({deals.filter((d) => d.isSlaBreached).length})
            </button>
          </div>

          {/* Search and Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Fırsat, müşteri veya iletişim ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-8 py-1.5 font-medium text-slate-900 placeholder-slate-400 text-xs shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Priority filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 text-xs shadow-2xs hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">Öncelik: Tümü</option>
              <option value="Urgent">Acil</option>
              <option value="High">Yüksek</option>
              <option value="Medium">Orta</option>
              <option value="Low">Düşük</option>
            </select>

            {/* User filter */}
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 text-xs shadow-2xs hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
        <div className="flex h-64 items-center justify-center rounded-3xl border border-slate-200/80 bg-white shadow-xs">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <span className="font-medium text-slate-500 text-xs">
              Pipeline ve fırsatlar yükleniyor...
            </span>
          </div>
        </div>
      ) : viewMode === "kanban" ? (
        /* Kanban Board View */
        <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
          {activePipeline?.stages?.map((stage) => {
            const stageDeals = dealsByStage[stage.id] || [];
            const stageTotal = stageDeals.reduce((sum, d) => sum + d.value, 0);
            const isDragOver = dragOverStageId === stage.id;

            return (
              <div
                key={stage.id}
                onDragOver={(e) => handleDragOver(e, stage.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage.id)}
                className={`flex w-80 shrink-0 flex-col rounded-3xl border transition-all duration-200 p-3 shadow-2xs ${
                  isDragOver
                    ? "bg-blue-50/80 border-blue-400 ring-2 ring-blue-500/20"
                    : "bg-slate-50/70 border-slate-200/80"
                }`}
              >
                {/* Column Header */}
                <div className="mb-2.5 flex items-center justify-between border-slate-200 border-b px-1 pb-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="h-3 w-3 rounded-full flex-none shadow-xs"
                      style={{ backgroundColor: stage.color || "#3B82F6" }}
                    />
                    <span className="font-bold text-slate-900 text-xs truncate">
                      {stage.name}
                    </span>
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 font-bold text-[10px] text-slate-700">
                      {stageDeals.length}
                    </span>
                  </div>

                  <div className="font-extrabold text-slate-900 text-xs">
                    {formatCurrency(stageTotal)}
                  </div>
                </div>

                {/* Stage Probability & SLA Sub-header */}
                <div className="mb-3 flex items-center justify-between rounded-xl bg-white border border-slate-200/60 px-2.5 py-1 text-[10px] text-slate-500 shadow-2xs">
                  <span className="flex items-center gap-1 font-semibold text-slate-600">
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
                <div className="flex-1 space-y-3 overflow-y-auto max-h-[calc(100vh-320px)] custom-scrollbar pr-0.5">
                  {stageDeals.map((deal) => {
                    return (
                      <div
                        key={deal.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, deal.id)}
                        onClick={() => setSelectedDealId(deal.id)}
                        className="group relative rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-all hover:border-blue-300 hover:shadow-md cursor-pointer active:scale-[0.99]"
                      >
                        {/* SLA Breach Warning */}
                        {deal.isSlaBreached && (
                          <div className="mb-2.5 flex items-center gap-1.5 rounded-lg bg-rose-50 border border-rose-200 px-2 py-1 text-[10px] font-bold text-rose-700">
                            <AlertTriangle className="h-3.5 w-3.5 text-rose-600 flex-none" />
                            <span>Aşama SLA Süresi Aşıldı!</span>
                          </div>
                        )}

                        {/* Top row: Source & Priority */}
                        <div className="flex items-center justify-between gap-2 mb-2">
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
                        <h4 className="font-bold text-slate-900 text-xs group-hover:text-blue-600 transition-colors line-clamp-2 mb-1.5">
                          {deal.title}
                        </h4>

                        {/* Customer / Company */}
                        {deal.customerName && (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-2.5">
                            {deal.customerType === "Company" ? (
                              <Building2 className="h-3.5 w-3.5 text-slate-400 flex-none" />
                            ) : (
                              <User className="h-3.5 w-3.5 text-slate-400 flex-none" />
                            )}
                            <span className="truncate font-medium text-slate-700">
                              {deal.customerName}
                            </span>
                          </div>
                        )}

                        {/* Financial Value & Tags */}
                        <div className="flex items-center justify-between border-slate-100 border-t pt-2.5 mb-2.5">
                          <span className="font-extrabold text-slate-900 text-xs">
                            {formatCurrency(deal.value, deal.currency)}
                          </span>
                          {deal.tags && deal.tags.length > 0 && (
                            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                              #{deal.tags[0]}
                            </span>
                          )}
                        </div>

                        {/* Card Footer: Assignee & Action */}
                        <div className="flex items-center justify-between pt-2 border-slate-100 border-t text-[11px]">
                          {deal.assignedUserId ? (
                            <div className="flex items-center gap-1.5 text-slate-700">
                              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 font-bold text-[10px] text-blue-700">
                                {deal.assignedUserName
                                  ? deal.assignedUserName.charAt(0).toUpperCase()
                                  : "U"}
                              </div>
                              <span className="truncate max-w-[130px] font-medium text-xs">
                                {deal.assignedUserName || "Temsilci"}
                              </span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => handleClaimDeal(deal.id, e)}
                              className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1 font-bold text-[10px] text-white shadow-2xs hover:bg-amber-600 transition"
                            >
                              <Zap className="h-2.5 w-2.5" />
                              Üzerime Al
                            </button>
                          )}

                          {/* Counters */}
                          <div className="flex items-center gap-2 text-slate-400 text-[10px]">
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
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 border-dashed bg-white/60 p-8 text-center">
                      <Kanban className="h-6 w-6 text-slate-300 mb-1.5" />
                      <p className="font-semibold text-slate-500 text-xs">
                        Bu aşamada kart yok
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
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
        <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-slate-100 border-b bg-slate-50/50 font-medium text-[11px] text-slate-500">
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
              <tbody className="divide-y divide-slate-100">
                {filteredDeals.map((deal) => (
                  <tr
                    key={deal.id}
                    onClick={() => setSelectedDealId(deal.id)}
                    className="group transition-colors hover:bg-slate-50/80 cursor-pointer"
                  >
                    <td className="py-4 pr-4 pl-6 font-bold text-slate-900 group-hover:text-blue-600">
                      {deal.title}
                    </td>
                    <td className="px-4 py-4 text-slate-700 font-medium">
                      {deal.customerName || "-"}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className="inline-flex items-center rounded-lg border px-2.5 py-0.5 font-bold text-[10px]"
                        style={{
                          backgroundColor: `${deal.stageColor}15` || "#3B82F615",
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
                          <span className="font-medium text-slate-700">
                            {deal.assignedUserName}
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center rounded-lg bg-amber-50 px-2 py-0.5 font-bold text-[10px] text-amber-700 border border-amber-200">
                          Açık Havuz
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {deal.isSlaBreached ? (
                        <span className="inline-flex items-center gap-1 text-rose-600 font-bold text-[10px]">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          SLA Aşıldı
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-[10px]">
                          <Check className="h-3.5 w-3.5" />
                          Normal
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right font-extrabold text-slate-900">
                      {formatCurrency(deal.value, deal.currency)}
                    </td>
                    <td className="py-4 pr-6 pl-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDealId(deal.id);
                        }}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 text-xs shadow-2xs hover:bg-slate-50 transition"
                      >
                        Detay
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredDeals.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-500">
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
          dealId={selectedDealId}
          tenantSlug={tenantSlug}
          onClose={() => setSelectedDealId(null)}
          onUpdated={loadDeals}
          employees={employees}
          activePipeline={activePipeline}
        />
      )}

      {/* 6. Create Deal Modal */}
      {isCreateModalOpen && (
        <CreateDealModal
          tenantSlug={tenantSlug}
          activePipeline={activePipeline}
          pipelines={pipelines}
          employees={employees}
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={() => {
            setIsCreateModalOpen(false);
            loadDeals();
          }}
        />
      )}

      {/* 7. Pipeline & Stages Settings Modal */}
      {isSettingsModalOpen && (
        <PipelineSettingsModal
          pipeline={activePipeline}
          tenantSlug={tenantSlug}
          onClose={() => setIsSettingsModalOpen(false)}
          onUpdated={() => {
            setIsSettingsModalOpen(false);
            loadInitialData();
          }}
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
    if (!activeTenant?.id) return;
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
    if (!activeTenant?.id || !deal || deal.stageId === targetStageId) return;

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
    if (!activeTenant?.id || !deal) return;
    const targetUserId = userId === "unassigned" ? undefined : userId;

    try {
      const res = await ApiClient.assignDeal(
        deal.id,
        { dealId: deal.id, assignedUserId: targetUserId },
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
    if (!newNote.trim() || !activeTenant?.id || !deal) return;

    setIsSubmittingNote(true);
    try {
      const res = await ApiClient.addDealNote(
        deal.id,
        { dealId: deal.id, content: newNote.trim() },
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
    if (!activeTenant?.id || !deal) return;
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
    <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in">
      {/* Backdrop with Click-to-Close */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Design System Confirm Dialog */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Fırsat Kartını Sil"
        description={`"${deal?.title || "Bu fırsat"}" başlıklı kart kalıcı olarak silinecektir. Bu işlem geri alınamaz.`}
        confirmText="Evet, Sil"
        cancelText="Vazgeç"
        variant="destructive"
        loading={isDeleting}
        onConfirm={handleConfirmDelete}
      />

      <div className="relative z-10 w-full md:max-w-2xl bg-white border-l border-slate-200 h-full flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-3.5 sm:p-5 border-b border-slate-200/80 bg-slate-50/80 sticky top-0 z-20 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-2xs hover:bg-slate-100 hover:text-slate-900 transition active:scale-95"
              title="Kapat & Geri Dön"
            >
              <ArrowLeft className="h-4.5 w-4.5 sm:hidden" />
              <X className="h-4.5 w-4.5 hidden sm:block" />
            </button>
            <div className="min-w-0">
              <span className="font-semibold text-[11px] text-slate-500 block truncate">
                {deal?.pipelineName || "Pipeline Fırsatı"}
              </span>
              <h2 className="font-bold text-sm sm:text-base text-slate-900 leading-tight truncate max-w-[200px] sm:max-w-md">
                {deal?.title || "Fırsat Detayı"}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsDeleteDialogOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 transition"
              title="Fırsatı Sil"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        {isLoading || !deal ? (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            <RefreshCw className="h-6 w-6 animate-spin text-blue-600 mr-2" />
            <span className="text-xs font-medium">Detaylar yükleniyor...</span>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6 pb-28 sm:pb-8 custom-scrollbar">
            {/* 1. Stage Progression Stepper */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Aşama İlerlemesi (Tıklayarak Değiştirin)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50/70 p-2.5 rounded-2xl border border-slate-200/80">
                {activePipeline?.stages?.map((stage) => {
                  const isCurrent = deal.stageId === stage.id;
                  return (
                    <button
                      key={stage.id}
                      type="button"
                      onClick={() => handleStageChange(stage.id)}
                      className={`px-3 py-2.5 rounded-xl text-left text-xs font-semibold transition-all flex flex-col justify-between ${
                        isCurrent
                          ? "bg-blue-600 text-white shadow-xs ring-2 ring-blue-400/30"
                          : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80"
                      }`}
                    >
                      <span className="truncate">{stage.name}</span>
                      <span
                        className={`text-[10px] mt-1 font-medium ${
                          isCurrent ? "text-blue-100" : "text-slate-400"
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
              <div className="rounded-2xl border border-purple-200 bg-purple-50/70 p-4 flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-purple-900">
                      Canlı Destek Oturumu Bağlantılı
                    </h4>
                    <p className="text-[11px] text-purple-700">
                      Bu kart canlı destek sohbetinden otomatik türetildi.
                    </p>
                  </div>
                </div>

                <Link
                  href={`/${tenantSlug}/messages`}
                  className="flex items-center gap-1.5 text-xs font-semibold text-purple-700 hover:text-purple-900 bg-purple-100 hover:bg-purple-200 border border-purple-300/60 px-3 py-1.5 rounded-xl transition"
                >
                  <span>Sohbete Git</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}

            {/* 3. Core Properties Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
              {/* Value */}
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Tutar</span>
                <p className="text-base font-extrabold text-slate-900 mt-0.5">
                  {new Intl.NumberFormat("tr-TR", {
                    style: "currency",
                    currency: deal.currency || "TRY",
                  }).format(deal.value)}
                </p>
              </div>

              {/* Priority */}
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Öncelik</span>
                <p className="mt-1">
                  <span
                    className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 font-bold text-[10px] ${
                      deal.priority === "Urgent"
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : deal.priority === "High"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-blue-50 text-blue-700 border-blue-200"
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
                <span className="text-[10px] text-slate-500 uppercase font-semibold">SLA Durumu</span>
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
              <div className="col-span-2 sm:col-span-3 pt-3 border-slate-100 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    Sorumlu Çalışan / Temsilci
                  </span>
                  <select
                    value={deal.assignedUserId || "unassigned"}
                    onChange={(e) => handleAssignUser(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-800 text-xs shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="unassigned">Açık Havuz (Atanmamış)</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.userId || emp.id}>
                        {emp.fullName} ({emp.departmentName || "Genel"})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 4. Customer / Contact Details */}
            {(deal.customerName || deal.contactName || deal.contactEmail || deal.contactPhone) && (
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-3">
                <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <User className="h-4 w-4 text-blue-600" />
                  Müşteri & İletişim Bilgileri
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {deal.customerName && (
                    <div>
                      <span className="text-slate-400 font-medium">Müşteri / Şirket:</span>
                      <p className="font-bold text-slate-800">{deal.customerName}</p>
                    </div>
                  )}
                  {deal.contactName && (
                    <div>
                      <span className="text-slate-400 font-medium">İlgili Kişi:</span>
                      <p className="font-bold text-slate-800">{deal.contactName}</p>
                    </div>
                  )}
                  {deal.contactEmail && (
                    <div>
                      <span className="text-slate-400 font-medium">E-Posta:</span>
                      <p className="font-semibold text-blue-600">{deal.contactEmail}</p>
                    </div>
                  )}
                  {deal.contactPhone && (
                    <div>
                      <span className="text-slate-400 font-medium">Telefon:</span>
                      <p className="font-bold text-slate-800">{deal.contactPhone}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 5. Tabs: Timeline (Aktiviteler) & Notes (Notlar) */}
            <div>
              <div className="flex border-b border-slate-200 mb-4">
                <button
                  type="button"
                  onClick={() => setActiveTab("timeline")}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
                    activeTab === "timeline"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Activity className="h-3.5 w-3.5" />
                  Aktiviteler ({deal.activities?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("notes")}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
                    activeTab === "notes"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
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
                      key={act.id}
                      className="flex items-start gap-3 text-xs bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/80"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-50 text-blue-600 flex-none mt-0.5">
                        <Activity className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{act.title}</span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {new Date(act.createdAt).toLocaleString("tr-TR")}
                          </span>
                        </div>
                        {act.description && (
                          <p className="text-slate-600 mt-1">{act.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {(!deal.activities || deal.activities.length === 0) && (
                    <p className="text-xs text-slate-400 text-center py-6">
                      Henüz aktivite kaydı yok.
                    </p>
                  )}
                </div>
              ) : (
                /* Notes Tab */
                <div className="space-y-4">
                  {/* Note Creator Form */}
                  <form onSubmit={handleAddNote} className="space-y-2">
                    <textarea
                      rows={3}
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Bu fırsat için dahili bir not ekleyin..."
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-medium text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isSubmittingNote || !newNote.trim()}
                        className="rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 transition shadow-xs"
                      >
                        {isSubmittingNote ? "Ekleniyor..." : "Not Ekle"}
                      </button>
                    </div>
                  </form>

                  {/* Notes List */}
                  <div className="space-y-2.5">
                    {deal.notes?.map((n) => (
                      <div
                        key={n.id}
                        className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs text-xs"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-blue-700">
                            {n.userName || "Kullanıcı"}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {new Date(n.createdAt).toLocaleString("tr-TR")}
                          </span>
                        </div>
                        <p className="text-slate-700 whitespace-pre-wrap">{n.content}</p>
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
  const [pipelineId, setPipelineId] = useState(activePipeline?.id || pipelines[0]?.id || "");
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

  const currentPipe = pipelines.find((p) => p.id === pipelineId) || activePipeline;

  useEffect(() => {
    const firstStage = currentPipe?.stages?.[0];
    if (firstStage) {
      setStageId(firstStage.id);
    }
  }, [currentPipe]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !pipelineId || !activeTenant?.id) {
      toast.error("Lütfen zorunlu alanları doldurun");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await ApiClient.createDeal(
        {
          pipelineId,
          stageId: stageId || undefined,
          title: title.trim(),
          value: Number(value) || 0,
          currency,
          priority,
          assignedUserId: assignedUserId === "auto" || assignedUserId === "unassigned" ? undefined : assignedUserId,
          source,
          contactName: contactName.trim() || undefined,
          contactEmail: contactEmail.trim() || undefined,
          contactPhone: contactPhone.trim() || undefined,
          initialNote: initialNote.trim() || undefined,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-lg rounded-3xl border border-slate-200/80 bg-white shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Plus className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900">Yeni Fırsat Kartı Ekle</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
          {/* Pipeline & Stage */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Pipeline
              </label>
              <select
                value={pipelineId}
                onChange={(e) => setPipelineId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {pipelines.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Başlangıç Aşaması
              </label>
              <select
                value={stageId}
                onChange={(e) => setStageId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Fırsat / İş Başlığı *
            </label>
            <input
              type="text"
              required
              placeholder="örn: Kurumsal Yazılım Lisans Teklifi"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Value & Currency & Priority */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Tahmini Tutar
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={value}
                  onChange={(e) => setValue(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 shadow-2xs"
                >
                  <option value="TRY">₺ TRY</option>
                  <option value="USD">$ USD</option>
                  <option value="EUR">€ EUR</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Öncelik
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-bold text-slate-700 shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Atama Kuralı / Sorumlu Çalışan
            </label>
            <select
              value={assignedUserId}
              onChange={(e) => setAssignedUserId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="auto">⚡ Otomatik Dağıtım (Round-Robin / Yük Dengesi)</option>
              <option value="unassigned">Açık Havuzda Bırak (Atanmamış)</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.userId || emp.id}>
                  {emp.fullName} ({emp.departmentName || "Genel"})
                </option>
              ))}
            </select>
          </div>

          {/* Contact Information (Lead) */}
          <div className="pt-3 border-slate-100 border-t space-y-3">
            <h4 className="text-xs font-bold text-blue-700">
              Potansiyel Müşteri / Kontak Bilgisi
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="İsim / Şirket Adı"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 shadow-2xs focus:border-blue-500 focus:outline-none"
              />
              <input
                type="email"
                placeholder="E-Posta"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 shadow-2xs focus:border-blue-500 focus:outline-none"
              />
              <input
                type="tel"
                placeholder="Telefon"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 shadow-2xs focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-slate-100 border-t flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 text-xs shadow-2xs hover:bg-slate-50 transition"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-5 py-2 transition shadow-xs disabled:opacity-50"
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
  const [routingStrategy, setRoutingStrategy] = useState(pipeline?.routingStrategy || "RoundRobin");
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
      id: s.id,
      name: s.name,
      orderIndex: s.orderIndex,
      color: s.color || "#3B82F6",
      probability: s.probability,
      slaHours: s.slaHours || undefined,
      isWonStage: s.isWonStage,
      isLostStage: s.isLostStage,
    })) || []
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleAddStage = () => {
    setStages((prev) => [
      ...prev,
      {
        name: "Yeni Aşama",
        orderIndex: prev.length,
        color: "#3B82F6",
        probability: 50,
        isWonStage: false,
        isLostStage: false,
      },
    ]);
  };

  const handleRemoveStage = (index: number) => {
    setStages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !activeTenant?.id || !pipeline?.id) return;

    setIsSaving(true);
    try {
      const res = await ApiClient.updatePipeline(
        pipeline.id,
        {
          id: pipeline.id,
          name: name.trim(),
          description: description.trim() || undefined,
          isActive: true,
          isDefault: pipeline.isDefault,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200/80 bg-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Settings className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900">Pipeline ve Aşama Yapılandırması</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          {/* General Pipeline Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Pipeline Adı
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Otomatik Dağıtım Algoritması (Routing)
              </label>
              <select
                value={routingStrategy}
                onChange={(e) => setRoutingStrategy(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="RoundRobin">Round-Robin (Sırayla Eşit Dağıtım)</option>
                <option value="LeastLoaded">İş Yükü Dengeli (En Az İşi Olana)</option>
                <option value="OnlineOnly">Sadece Çevrimiçi / Aktif Personele</option>
                <option value="Manual">Manuel / Açık Havuz Modeli</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Açıklama
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Pipeline'ın kullanım amacını belirtin"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 shadow-2xs focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Stages Configuration */}
          <div className="space-y-3 pt-4 border-slate-100 border-t">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-blue-600" />
                Pipeline Aşamaları ({stages.length})
              </h4>
              <button
                type="button"
                onClick={handleAddStage}
                className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl border border-blue-200 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                Aşama Ekle
              </button>
            </div>

            <div className="space-y-2.5">
              {stages.map((stage, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 flex items-center flex-wrap sm:flex-nowrap gap-3 shadow-2xs"
                >
                  <span className="text-xs font-bold text-slate-400 w-4">{idx + 1}.</span>

                  {/* Stage Name */}
                  <input
                    type="text"
                    required
                    value={stage.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setStages((prev) =>
                        prev.map((s, i) => (i === idx ? { ...s, name: val } : s))
                      );
                    }}
                    placeholder="Aşama Adı"
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-none"
                  />

                  {/* Probability */}
                  <div className="w-24 flex items-center gap-1">
                    <span className="text-[10px] font-bold text-slate-400">%</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={stage.probability}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setStages((prev) =>
                          prev.map((s, i) => (i === idx ? { ...s, probability: val } : s))
                        );
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-800 text-right"
                    />
                  </div>

                  {/* SLA Hours */}
                  <div className="w-28 flex items-center gap-1">
                    <span className="text-[10px] font-bold text-slate-400">SLA(s):</span>
                    <input
                      type="number"
                      min="1"
                      placeholder="Yok"
                      value={stage.slaHours || ""}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : undefined;
                        setStages((prev) =>
                          prev.map((s, i) => (i === idx ? { ...s, slaHours: val } : s))
                        );
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-800 text-right"
                    />
                  </div>

                  {/* Color Picker */}
                  <input
                    type="color"
                    value={stage.color}
                    onChange={(e) => {
                      const val = e.target.value;
                      setStages((prev) =>
                        prev.map((s, i) => (i === idx ? { ...s, color: val } : s))
                      );
                    }}
                    className="h-8 w-8 rounded-xl border border-slate-200 bg-white cursor-pointer p-0.5"
                    title="Aşama Rengi"
                  />

                  {/* Remove stage button */}
                  {stages.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveStage(idx)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 transition"
                      title="Aşamayı Kaldır"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-4 border-slate-100 border-t flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 text-xs shadow-2xs hover:bg-slate-50 transition"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-5 py-2 transition shadow-xs disabled:opacity-50"
            >
              {isSaving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
