"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { PageContainer } from "@workspace/ui/components/page-container";
import { SelectField } from "@workspace/ui/components/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  Layers,
  Play,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  TrendingUp,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ApiClient,
  type AutomationExecutionResultDto,
  type ExecutionItemDto,
  type WorkflowStatsDto,
  type WorkflowSummaryDto,
  type WorkflowTemplateDto,
} from "@/lib/api-client";

export default function AutomationsPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = (params?.tenantSlug as string) || "";

  const [activeTab, setActiveTab] = useState<
    "workflows" | "executions" | "templates"
  >("workflows");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

  const [stats, setStats] = useState<WorkflowStatsDto | null>(null);
  const [workflows, setWorkflows] = useState<WorkflowSummaryDto[]>([]);
  const [templates, setTemplates] = useState<WorkflowTemplateDto[]>([]);
  const [executions, setExecutions] = useState<ExecutionItemDto[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Recipe Drawer State
  const [isRecipeDrawerOpen, setIsRecipeDrawerOpen] = useState(false);
  // Quick Dry-run Simulation State
  const [simulatingWorkflow, setSimulatingWorkflow] =
    useState<WorkflowSummaryDto | null>(null);
  const [simulationResult, setSimulationResult] =
    useState<AutomationExecutionResultDto | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Load Data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statsRes, workflowsRes, templatesRes, executionsRes] =
        await Promise.all([
          ApiClient.getWorkflowStats(tenantSlug),
          ApiClient.getWorkflows(
            {
              category:
                selectedCategory === "all" ? undefined : selectedCategory,
              isActive:
                statusFilter === "all" ? undefined : statusFilter === "active",
              search: searchQuery || undefined,
            },
            tenantSlug
          ),
          ApiClient.getWorkflowTemplates(tenantSlug),
          ApiClient.getWorkflowExecutions({ pageSize: 30 }, tenantSlug),
        ]);

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
      if (workflowsRes.success && workflowsRes.data) {
        setWorkflows(workflowsRes.data.items || []);
      }
      if (templatesRes.success && templatesRes.data) {
        setTemplates(templatesRes.data);
      }
      if (executionsRes.success && executionsRes.data) {
        setExecutions(executionsRes.data.items || []);
      }
    } catch {
      toast.error("Otomasyon verileri yüklenirken hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  }, [tenantSlug, selectedCategory, statusFilter, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Search debounce / trigger
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  // Toggle Workflow Status
  const handleToggle = async (wf: WorkflowSummaryDto, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = !wf.isActive;
    // Optimistic update
    setWorkflows((prev) =>
      prev.map((item) =>
        item.id === wf.id ? { ...item, isActive: newStatus } : item
      )
    );

    try {
      const res = await ApiClient.toggleWorkflow(wf.id, newStatus, tenantSlug);
      if (res.success) {
        toast.success(
          newStatus ? "Akış başarıyla aktifleştirildi." : "Akış pasife alındı."
        );
        // Refresh stats
        ApiClient.getWorkflowStats(tenantSlug).then(
          (s) => s.data && setStats(s.data)
        );
      } else {
        // Rollback
        setWorkflows((prev) =>
          prev.map((item) =>
            item.id === wf.id ? { ...item, isActive: wf.isActive } : item
          )
        );
        toast.error("Durum güncellenirken hata oluştu.");
      }
    } catch {
      setWorkflows((prev) =>
        prev.map((item) =>
          item.id === wf.id ? { ...item, isActive: wf.isActive } : item
        )
      );
      toast.error("Bağlantı hatası.");
    }
  };

  // Delete Workflow
  const handleDelete = async (
    id: string,
    name: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (
      !confirm(`"${name}" otomasyonunu silmek istediğinizden emin misiniz?`)
    ) {
      return;
    }

    try {
      const res = await ApiClient.deleteWorkflow(id, tenantSlug);
      if (res.success) {
        toast.success("Otomasyon başarıyla silindi.");
        setWorkflows((prev) => prev.filter((w) => w.id !== id));
        ApiClient.getWorkflowStats(tenantSlug).then(
          (s) => s.data && setStats(s.data)
        );
      } else {
        toast.error("Silinirken bir hata oluştu.");
      }
    } catch {
      toast.error("Bağlantı hatası.");
    }
  };

  // Use Template
  const handleUseTemplate = async (tmpl: WorkflowTemplateDto) => {
    try {
      const res = await ApiClient.createWorkflow(
        {
          actions: tmpl.actions,
          category: tmpl.category,
          color: tmpl.color,
          conditions: tmpl.conditions,
          description: tmpl.description,
          icon: tmpl.icon,
          isActive: false, // create as draft
          name: tmpl.name,
          triggerConfig: tmpl.triggerConfig,
          triggerType: tmpl.triggerType,
        },
        tenantSlug
      );

      if (res.success && res.data) {
        toast.success(
          "Şablon aktarıldı! Düzenleme ekranına yönlendiriliyorsunuz..."
        );
        setIsRecipeDrawerOpen(false);
        router.push(`/${tenantSlug}/automations/${res.data.id}`);
      } else {
        toast.error("Şablon oluşturulamadı.");
      }
    } catch {
      toast.error("Bir hata meydana geldi.");
    }
  };

  // Run Quick Simulation
  const handleQuickSimulate = async (
    wf: WorkflowSummaryDto,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    setSimulatingWorkflow(wf);
    setSimulationResult(null);
    setIsSimulating(true);

    try {
      const res = await ApiClient.testWorkflow(
        wf.id,
        {
          entityType: wf.triggerType.split(".")[0],
          id: wf.id,
          mockContext: {
            customerName: "Örnek Müşteri (Ahmet Yılmaz)",
            priority: "Urgent",
            status: "Completed",
            tier: "VIP",
            totalAmount: 15_400,
          },
        },
        tenantSlug
      );

      if (res.success && res.data) {
        setSimulationResult(res.data);
      } else {
        toast.error("Simülasyon çalıştırılamadı.");
      }
    } catch {
      toast.error("Simülasyon sırasında hata oluştu.");
    } finally {
      setIsSimulating(false);
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category?.toLowerCase()) {
      case "customer":
        return (
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700 text-xs dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            Müşteri
          </span>
        );
      case "sales":
        return (
          <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 font-semibold text-blue-700 text-xs dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
            Satış & Sipariş
          </span>
        );
      case "support":
        return (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-semibold text-amber-700 text-xs dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            Destek Masası
          </span>
        );
      case "operations":
        return (
          <span className="rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 font-semibold text-purple-700 text-xs dark:border-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
            Operasyon
          </span>
        );
      default:
        return (
          <span className="rounded-full border border-zinc-200 bg-zinc-100 px-2 py-0.5 font-semibold text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
            {category || "Genel"}
          </span>
        );
    }
  };

  const getTriggerLabel = (type: string) => {
    switch (type) {
      case "Customer.Created":
        return "👤 Yeni Müşteri Eklendiğinde";
      case "Customer.Updated":
        return "🔄 Müşteri Güncellendiğinde";
      case "Order.Created":
        return "🛍️ Yeni Sipariş Oluştuğunda";
      case "Order.StatusChanged":
        return "📦 Sipariş Durumu Değiştiğinde";
      case "Ticket.Created":
        return "🎫 Yeni Destek Bileti Açıldığında";
      case "Ticket.SlaBreached":
        return "⏱️ SLA Süresi Aşıldığında";
      case "Deal.StageChanged":
        return "📊 Fırsat Aşaması Değiştiğinde";
      case "Webhook.Inbound":
        return "🌐 Harici Webhook Tetiklendiğinde";
      default:
        return `⚡ ${type}`;
    }
  };

  return (
    <PageContainer className="space-y-6">
      {/* 1. Header & Hero Section */}
      <div className="flex flex-col gap-4 border-zinc-200 border-b pb-6 md:flex-row md:items-center md:justify-between dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-2.5 text-white shadow-blue-500/20 shadow-md">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="flex items-center gap-2 font-bold text-2xl text-zinc-900 tracking-tight dark:text-zinc-100">
                Otomasyon & İş Akışları
                <span className="rounded-full bg-blue-100 px-2 py-0.5 font-semibold text-blue-700 text-xs dark:bg-blue-950/60 dark:text-blue-400">
                  v2.0 Canlı
                </span>
              </h1>
              <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                CRM olaylarına dayalı tetikleyiciler, koşul kuralları ve çok
                kanallı otomatik aksiyon motoru.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3.5 py-2 font-medium text-indigo-700 text-sm shadow-xs transition-all hover:bg-indigo-100"
            onClick={() => setIsRecipeDrawerOpen(true)}
          >
            <Sparkles className="h-4 w-4 text-indigo-600" />
            <span>Tarif Kütüphanesi</span>
          </button>

          <button
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-medium text-sm text-white shadow-blue-600/20 shadow-md transition-all hover:bg-blue-700 hover:shadow-blue-600/30 hover:shadow-lg"
            onClick={() => router.push(`/${tenantSlug}/automations/new`)}
          >
            <Plus className="h-4 w-4" />
            <span>Yeni Akış Oluştur</span>
          </button>
        </div>
      </div>

      {/* 2. Executive KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs dark:border-zinc-800/90 dark:bg-zinc-900">
          <div className="mb-2 flex items-center justify-between font-semibold text-xs text-zinc-500 dark:text-zinc-400">
            <span>AKTİF AKIŞLAR</span>
            <div className="h-2 w-2 animate-ping rounded-full bg-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-bold text-2xl text-zinc-900 dark:text-zinc-100">
              {stats?.activeWorkflows ?? 0}
            </span>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              / {stats?.totalWorkflows ?? 0} Akış
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1 font-medium text-emerald-600 text-xs">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Çalışır durumda</span>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs dark:border-zinc-800/90 dark:bg-zinc-900">
          <div className="mb-2 flex items-center justify-between font-semibold text-xs text-zinc-500 dark:text-zinc-400">
            <span>BUGÜNKÜ ÇALIŞMA</span>
            <Activity className="h-4 w-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-bold text-2xl text-blue-600">
              {stats?.executionsToday ?? 0}
            </span>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              tetikleme
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
            <span>Toplam {stats?.totalExecutionsAllTime ?? 0} işlem</span>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs dark:border-zinc-800/90 dark:bg-zinc-900">
          <div className="mb-2 flex items-center justify-between font-semibold text-xs text-zinc-500 dark:text-zinc-400">
            <span>BAŞARI ORANI</span>
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-bold text-2xl text-zinc-900 dark:text-zinc-100">
              %{stats?.successRate ?? 100}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1 font-medium text-emerald-600 text-xs">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Sıfır kritik hata</span>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-gradient-to-br bg-white from-indigo-50/50 via-white to-blue-50/50 p-4 shadow-xs dark:border-zinc-800/90 dark:bg-zinc-900">
          <div className="mb-2 flex items-center justify-between font-semibold text-indigo-700 text-xs">
            <span>TASARRUF EDİLEN SÜRE</span>
            <Clock className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-bold text-2xl text-indigo-900">
              ~{stats?.estimatedHoursSaved ?? 0}
            </span>
            <span className="font-medium text-indigo-600 text-xs">Saat/Ay</span>
          </div>
          <div className="mt-2 flex items-center gap-1 font-medium text-indigo-600 text-xs">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Manuel iş gücü tasarrufu</span>
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs & Filtering Toolbar */}
      <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200/80 bg-white p-2 shadow-xs md:flex-row md:items-center md:justify-between dark:border-zinc-800/90 dark:bg-zinc-900">
        {/* Main Tabs */}
        <div className="flex items-center gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800/80">
          <button
            className={`rounded-lg px-3.5 py-1.5 font-medium text-sm transition-all ${
              activeTab === "workflows"
                ? "bg-white font-semibold text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-zinc-100"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
            onClick={() => setActiveTab("workflows")}
          >
            İş Akışlarım ({workflows.length})
          </button>
          <button
            className={`rounded-lg px-3.5 py-1.5 font-medium text-sm transition-all ${
              activeTab === "executions"
                ? "bg-white font-semibold text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-zinc-100"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
            onClick={() => setActiveTab("executions")}
          >
            Çalışma Günlüğü & Denetim ({executions.length})
          </button>
          <button
            className={`rounded-lg px-3.5 py-1.5 font-medium text-sm transition-all ${
              activeTab === "templates"
                ? "bg-white font-semibold text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-zinc-100"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
            onClick={() => setActiveTab("templates")}
          >
            Hazır Tarifler ({templates.length})
          </button>
        </div>

        {/* Search & Category Filter */}
        {activeTab === "workflows" && (
          <div className="flex items-center gap-2.5">
            {/* Category Dropdown */}
            <div className="w-[160px]">
              <SelectField
                onChange={(value) => setSelectedCategory(value)}
                options={[
                  { label: "Tüm Kategoriler", value: "all" },
                  { label: "Müşteri", value: "Customer" },
                  { label: "Satış & Sipariş", value: "Sales" },
                  { label: "Destek Masası", value: "Support" },
                  { label: "Operasyon", value: "Operations" },
                ]}
                placeholder="Tüm Kategoriler"
                value={selectedCategory}
              />
            </div>

            {/* Status Filter */}
            <div className="w-[150px]">
              <SelectField
                onChange={(value) =>
                  setStatusFilter(value as "all" | "active" | "inactive")
                }
                options={[
                  { label: "Tüm Durumlar", value: "all" },
                  { label: "Sadece Aktifler", value: "active" },
                  { label: "Sadece Pasifler", value: "inactive" },
                ]}
                placeholder="Tüm Durumlar"
                value={statusFilter}
              />
            </div>

            {/* Search Input */}
            <form className="relative" onSubmit={handleSearch}>
              <input
                className="w-48 rounded-xl border border-zinc-200 bg-zinc-50/50 py-1.5 pr-3 pl-8 text-xs focus:border-blue-500 focus:bg-white focus:outline-none md:w-60 dark:border-zinc-800 dark:bg-zinc-800/30 dark:bg-zinc-900"
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Akış veya tetikleyici ara..."
                type="text"
                value={searchQuery}
              />
              <Search className="absolute top-2.5 left-2.5 h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
            </form>

            <button
              className="rounded-xl border border-zinc-200 p-2 text-zinc-500 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
              onClick={loadData}
              title="Yenile"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* 4. Tab 1: Workflows List View */}
      {activeTab === "workflows" && (
        <div className="space-y-3">
          {isLoading ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
              <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-blue-600" />
              <p className="font-medium text-sm text-zinc-600 dark:text-zinc-400">
                Otomasyon akışları yükleniyor...
              </p>
            </div>
          ) : workflows.length === 0 ? (
            <div className="mx-auto max-w-lg rounded-2xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                Henüz bir otomasyon akışı yok
              </h3>
              <p className="mt-1 mb-5 text-sm text-zinc-500 dark:text-zinc-400">
                Müşteri ekleme, sipariş tamamlama veya destek bileti açıldığında
                otomatik aksiyonlar çalıştırın.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  className="rounded-xl border border-zinc-200 px-4 py-2 font-medium text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
                  onClick={() => setIsRecipeDrawerOpen(true)}
                >
                  Tarif Kütüphanesine Göz At
                </button>
                <button
                  className="rounded-xl bg-blue-600 px-4 py-2 font-medium text-sm text-white hover:bg-blue-700"
                  onClick={() => router.push(`/${tenantSlug}/automations/new`)}
                >
                  Sıfırdan Akış Oluştur
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {workflows.map((wf) => (
                <div
                  className={`group relative flex cursor-pointer flex-col justify-between rounded-2xl border bg-white p-5 transition-all duration-200 hover:shadow-md dark:bg-zinc-900 ${
                    wf.isActive
                      ? "border-zinc-200 hover:border-blue-300 dark:border-zinc-800/90"
                      : "border-zinc-200 bg-zinc-50 opacity-80 dark:border-zinc-800/50 dark:bg-zinc-800/50"
                  }`}
                  key={wf.id}
                  onClick={() =>
                    router.push(`/${tenantSlug}/automations/${wf.id}`)
                  }
                >
                  {/* Top Bar: Icon, Title, Status Toggle */}
                  <div>
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold text-white shadow-xs ${
                            wf.color === "emerald"
                              ? "bg-emerald-600"
                              : wf.color === "amber"
                                ? "bg-amber-600"
                                : wf.color === "purple"
                                  ? "bg-purple-600"
                                  : wf.color === "red"
                                    ? "bg-red-600"
                                    : "bg-blue-600"
                          }`}
                        >
                          <Zap className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-base text-zinc-900 transition-colors group-hover:text-blue-600 dark:text-zinc-100">
                              {wf.name}
                            </h3>
                            {getCategoryBadge(wf.category)}
                          </div>
                          <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500 dark:text-zinc-400">
                            {wf.description || "Açıklama belirtilmemiş."}
                          </p>
                        </div>
                      </div>

                      {/* On/Off Switch */}
                      <div
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          wf.isActive
                            ? "bg-emerald-500"
                            : "bg-zinc-300 dark:bg-zinc-700"
                        }`}
                        onClick={(e) => handleToggle(wf, e)}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out dark:bg-zinc-900 ${
                            wf.isActive ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </div>
                    </div>

                    {/* Trigger & Step Summary */}
                    <div className="mb-4 space-y-2 rounded-xl border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/50">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-zinc-500 dark:text-zinc-400">
                          Tetikleyici:
                        </span>
                        <span className="rounded-md border border-zinc-200 bg-white px-2 py-0.5 font-semibold text-zinc-800 shadow-2xs dark:border-zinc-800/60 dark:bg-zinc-900 dark:text-zinc-200">
                          {getTriggerLabel(wf.triggerType)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between border-zinc-200 border-t pt-1 text-xs text-zinc-600 dark:border-zinc-800/50 dark:text-zinc-400">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1 font-medium">
                            <SlidersHorizontal className="h-3 w-3 text-zinc-400 dark:text-zinc-500" />
                            {wf.conditionsCount} Koşul
                          </span>
                          <span className="flex items-center gap-1 font-medium text-blue-600">
                            <Layers className="h-3 w-3" />
                            {wf.actionsCount} Aksiyon Adımı
                          </span>
                        </div>
                        <span className="font-mono text-[11px] text-zinc-400 dark:text-zinc-500">
                          {wf.executionCount} kez çalıştı
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Bar: Action buttons & Run date */}
                  <div className="flex items-center justify-between border-zinc-100 border-t pt-2 text-xs text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
                    <div>
                      {wf.lastExecutedAt ? (
                        <span>
                          Son:{" "}
                          {new Date(wf.lastExecutedAt).toLocaleDateString(
                            "tr-TR"
                          )}{" "}
                          {new Date(wf.lastExecutedAt).toLocaleTimeString(
                            "tr-TR",
                            { hour: "2-digit", minute: "2-digit" }
                          )}
                        </span>
                      ) : (
                        <span>Henüz tetiklenmedi</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        className="flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1 font-medium text-zinc-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-zinc-800 dark:text-zinc-400"
                        onClick={(e) => handleQuickSimulate(wf, e)}
                        title="Simüle Et / Test Et"
                      >
                        <Play className="h-3 w-3 fill-current" />
                        <span>Test</span>
                      </button>

                      <button
                        className="rounded-lg p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:text-zinc-500"
                        onClick={(e) => handleDelete(wf.id, wf.name, e)}
                        title="Sil"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>

                      <div className="p-1 text-zinc-400 transition-colors group-hover:text-blue-600 dark:text-zinc-500">
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. Tab 2: Executions History & Audit Logs */}
      {activeTab === "executions" && (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-zinc-100 border-b bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-800/30">
            <div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                Son Çalışma Günlüğü (Audit Trail)
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Olay tetiklemeleri, koşul doğrulama sonuçları ve aksiyon yürütme
                süreleri.
              </p>
            </div>
            <button
              className="flex items-center gap-1 rounded-lg border border-zinc-200 px-3 py-1 font-medium text-xs text-zinc-600 hover:bg-white dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900"
              onClick={loadData}
            >
              <RefreshCw className="h-3 w-3" />
              <span>Yenile</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-400">
              <thead className="border-zinc-200 border-b bg-zinc-50 font-semibold text-zinc-500 uppercase dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Tarih / Saat</th>
                  <th className="px-4 py-3">Akış Adı</th>
                  <th className="px-4 py-3">Tetikleyici Kaynağı</th>
                  <th className="px-4 py-3">Varlık</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3">Aksiyonlar</th>
                  <th className="px-4 py-3">Süre</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {executions.length === 0 ? (
                  <tr>
                    <td
                      className="py-8 text-center text-zinc-400 dark:text-zinc-500"
                      colSpan={7}
                    >
                      Henüz çalışma kaydı bulunmuyor.
                    </td>
                  </tr>
                ) : (
                  executions.map((exec) => (
                    <tr
                      className="transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50"
                      key={exec.id}
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-zinc-500 dark:text-zinc-400">
                        {new Date(exec.createdAt).toLocaleDateString("tr-TR")}{" "}
                        {new Date(exec.createdAt).toLocaleTimeString("tr-TR")}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-bold text-zinc-900 dark:text-zinc-100">
                        {exec.workflowName}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-[11px] text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          {exec.triggerSource}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {exec.entityType ? (
                          <span className="font-medium text-zinc-700 dark:text-zinc-300">
                            {exec.entityType} ({exec.entityId?.substring(0, 8)})
                          </span>
                        ) : (
                          <span className="text-zinc-400 dark:text-zinc-500">
                            -
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {exec.status === "Success" ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-medium text-[11px] text-emerald-700">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            Başarılı
                          </span>
                        ) : exec.status === "Skipped" ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-medium text-[11px] text-amber-700">
                            <AlertCircle className="h-3 w-3 text-amber-600" />
                            Koşul Sağlanmadı
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 font-medium text-[11px] text-red-700">
                            <XCircle className="h-3 w-3 text-red-600" />
                            Hata
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                          {exec.actionsExecutedCount} adım
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-zinc-500 dark:text-zinc-400">
                        {exec.executionDurationMs} ms
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. Tab 3: Recipe Hub / Template Gallery */}
      {activeTab === "templates" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((tmpl) => (
            <div
              className="group flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
              key={tmpl.id}
            >
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold text-white shadow-xs ${
                      tmpl.color === "amber"
                        ? "bg-amber-600"
                        : tmpl.color === "emerald"
                          ? "bg-emerald-600"
                          : tmpl.color === "red"
                            ? "bg-red-600"
                            : tmpl.color === "purple"
                              ? "bg-purple-600"
                              : "bg-blue-600"
                    }`}
                  >
                    <Sparkles className="h-5 w-5" />
                  </div>
                  {getCategoryBadge(tmpl.category)}
                </div>

                <h3 className="font-bold text-base text-zinc-900 transition-colors group-hover:text-blue-600 dark:text-zinc-100">
                  {tmpl.name}
                </h3>
                <p className="mt-1 mb-4 text-xs text-zinc-500 leading-relaxed dark:text-zinc-400">
                  {tmpl.description}
                </p>

                <div className="mb-4 space-y-1.5 rounded-xl border border-zinc-100 bg-zinc-50 p-2.5 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 dark:text-zinc-500">
                      Tetikleyici:
                    </span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {getTriggerLabel(tmpl.triggerType)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 dark:text-zinc-500">
                      Aksiyonlar:
                    </span>
                    <span className="font-semibold text-blue-600">
                      {tmpl.actions.length} Adım
                    </span>
                  </div>
                </div>
              </div>

              <button
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 py-2 font-medium text-white text-xs shadow-xs transition-all hover:bg-blue-600 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                onClick={() => handleUseTemplate(tmpl)}
              >
                <span>Bu Şablonu Kullan</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 7. Recipe Hub Sliding Drawer Modal */}
      {isRecipeDrawerOpen && (
        <Sheet
          onOpenChange={(open) => {
            if (!open) {
              setIsRecipeDrawerOpen(false);
            }
          }}
          open
        >
          <SheetContent
            aria-describedby={undefined}
            className="data-[side=right]:w-full max-w-xl justify-between overflow-y-auto p-6 data-[side=right]:sm:max-w-xl"
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between border-zinc-100 border-b pb-4 dark:border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <SheetTitle className="font-bold text-lg text-zinc-900 dark:text-zinc-100">
                      Tarif Kütüphanesi
                    </SheetTitle>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Önceden optimize edilmiş hazır otomasyon tarifleri
                    </p>
                  </div>
                </div>
                <SheetClose asChild>
                  <button
                    className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-400"
                    type="button"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </SheetClose>
              </div>

              <div className="space-y-3">
                {templates.map((tmpl) => (
                  <div
                    className="rounded-2xl border border-zinc-200 bg-white p-4 transition-all hover:border-blue-300 hover:shadow-sm dark:border-zinc-800/90 dark:bg-zinc-900"
                    key={tmpl.id}
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                          {tmpl.name}
                        </h4>
                        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                          {tmpl.description}
                        </p>
                      </div>
                      {getCategoryBadge(tmpl.category)}
                    </div>

                    <div className="mt-3 flex items-center justify-between border-zinc-100 border-t pt-3 text-xs dark:border-zinc-800">
                      <span className="font-mono text-zinc-500 dark:text-zinc-400">
                        {tmpl.actions.length} Otomatik Adım
                      </span>
                      <button
                        className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 font-semibold text-white text-xs shadow-xs transition-all hover:bg-blue-700"
                        onClick={() => handleUseTemplate(tmpl)}
                      >
                        <Plus className="h-3 w-3" />
                        <span>Kullan</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-zinc-100 border-t pt-4 dark:border-zinc-800">
              <button
                className="w-full py-2 text-center font-medium text-xs text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                onClick={() => setIsRecipeDrawerOpen(false)}
              >
                Kapat
              </button>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* 8. Quick Simulation / Dry-run Modal */}
      {simulatingWorkflow && (
        <Dialog
          onOpenChange={(open) => {
            if (!open) {
              setSimulatingWorkflow(null);
            }
          }}
          open
        >
          <DialogContent
            aria-describedby={undefined}
            className="max-h-[90vh] w-full space-y-4 overflow-y-auto gap-0 p-6 sm:max-w-lg"
            showCloseButton={false}
          >
            <div className="flex items-center justify-between border-zinc-100 border-b pb-3 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                  <Play className="h-4 w-4 fill-current" />
                </div>
                <div>
                  <DialogTitle className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                    Akış Simülasyonu (Dry-Run)
                  </DialogTitle>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {simulatingWorkflow.name}
                  </p>
                </div>
              </div>
              <DialogClose asChild>
                <button
                  className="rounded-full p-1 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-400"
                  type="button"
                >
                  <X className="h-5 w-5" />
                </button>
              </DialogClose>
            </div>

            {isSimulating ? (
              <div className="space-y-3 py-12 text-center">
                <RefreshCw className="mx-auto h-6 w-6 animate-spin text-blue-600" />
                <p className="font-medium text-xs text-zinc-600 dark:text-zinc-400">
                  Koşullar ve aksiyon zinciri simüle ediliyor...
                </p>
              </div>
            ) : simulationResult ? (
              <div className="space-y-3">
                <div
                  className={`rounded-2xl border p-3.5 text-xs ${
                    simulationResult.status === "Success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : simulationResult.status === "Skipped"
                        ? "border-amber-200 bg-amber-50 text-amber-900"
                        : "border-red-200 bg-red-50 text-red-900"
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2 font-bold">
                    {simulationResult.status === "Success" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : simulationResult.status === "Skipped" ? (
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span>Simülasyon Sonucu: {simulationResult.status}</span>
                  </div>
                  <p className="text-[11px] opacity-90">
                    {simulationResult.conditionsSummary}
                  </p>
                </div>

                <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/50">
                  <span className="font-semibold text-[11px] text-zinc-400 uppercase dark:text-zinc-500">
                    Yürütülen Adımlar ({simulationResult.stepLogs.length})
                  </span>
                  {simulationResult.stepLogs.map((log, idx) => (
                    <div
                      className="flex items-start justify-between rounded-lg border border-zinc-200/80 bg-white p-2.5 text-xs dark:border-zinc-800/90 dark:bg-zinc-900"
                      key={idx}
                    >
                      <div>
                        <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                          {log.stepTitle}
                        </div>
                        <div className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                          {log.message}
                        </div>
                      </div>
                      <span className="font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
                        {log.executionDurationMs}ms
                      </span>
                    </div>
                  ))}
                </div>

                <p className="text-center text-[11px] text-zinc-400 dark:text-zinc-500">
                  * Dry-Run modunda gerçek e-posta veya webhook fırlatılmaz,
                  yalnızca kural testi yapılır.
                </p>
              </div>
            ) : null}

            <div className="flex justify-end pt-2">
              <button
                className="rounded-xl bg-zinc-100 px-4 py-2 font-semibold text-xs text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                onClick={() => setSimulatingWorkflow(null)}
              >
                Kapat
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </PageContainer>
  );
}
