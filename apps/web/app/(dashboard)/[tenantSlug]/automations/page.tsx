"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Zap,
  Plus,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Search,
  Activity,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Trash2,
  SlidersHorizontal,
  RefreshCw,
  Layers,
  ChevronRight,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  ApiClient,
  WorkflowSummaryDto,
  WorkflowStatsDto,
  WorkflowTemplateDto,
  ExecutionItemDto,
  AutomationExecutionResultDto,
} from "@/lib/api-client";
import { toast } from "sonner";

export default function AutomationsPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = (params?.tenantSlug as string) || "";

  const [activeTab, setActiveTab] = useState<"workflows" | "executions" | "templates">("workflows");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const [stats, setStats] = useState<WorkflowStatsDto | null>(null);
  const [workflows, setWorkflows] = useState<WorkflowSummaryDto[]>([]);
  const [templates, setTemplates] = useState<WorkflowTemplateDto[]>([]);
  const [executions, setExecutions] = useState<ExecutionItemDto[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Recipe Drawer State
  const [isRecipeDrawerOpen, setIsRecipeDrawerOpen] = useState(false);
  // Quick Dry-run Simulation State
  const [simulatingWorkflow, setSimulatingWorkflow] = useState<WorkflowSummaryDto | null>(null);
  const [simulationResult, setSimulationResult] = useState<AutomationExecutionResultDto | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Load Data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statsRes, workflowsRes, templatesRes, executionsRes] = await Promise.all([
        ApiClient.getWorkflowStats(tenantSlug),
        ApiClient.getWorkflows(
          {
            category: selectedCategory !== "all" ? selectedCategory : undefined,
            isActive: statusFilter === "all" ? undefined : statusFilter === "active",
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
      prev.map((item) => (item.id === wf.id ? { ...item, isActive: newStatus } : item))
    );

    try {
      const res = await ApiClient.toggleWorkflow(wf.id, newStatus, tenantSlug);
      if (res.success) {
        toast.success(newStatus ? "Akış başarıyla aktifleştirildi." : "Akış pasife alındı.");
        // Refresh stats
        ApiClient.getWorkflowStats(tenantSlug).then((s) => s.data && setStats(s.data));
      } else {
        // Rollback
        setWorkflows((prev) =>
          prev.map((item) => (item.id === wf.id ? { ...item, isActive: wf.isActive } : item))
        );
        toast.error("Durum güncellenirken hata oluştu.");
      }
    } catch {
      setWorkflows((prev) =>
        prev.map((item) => (item.id === wf.id ? { ...item, isActive: wf.isActive } : item))
      );
      toast.error("Bağlantı hatası.");
    }
  };

  // Delete Workflow
  const handleDelete = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`"${name}" otomasyonunu silmek istediğinizden emin misiniz?`)) return;

    try {
      const res = await ApiClient.deleteWorkflow(id, tenantSlug);
      if (res.success) {
        toast.success("Otomasyon başarıyla silindi.");
        setWorkflows((prev) => prev.filter((w) => w.id !== id));
        ApiClient.getWorkflowStats(tenantSlug).then((s) => s.data && setStats(s.data));
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
          name: tmpl.name,
          description: tmpl.description,
          category: tmpl.category,
          icon: tmpl.icon,
          color: tmpl.color,
          isActive: false, // create as draft
          triggerType: tmpl.triggerType,
          triggerConfig: tmpl.triggerConfig,
          conditions: tmpl.conditions,
          actions: tmpl.actions,
        },
        tenantSlug
      );

      if (res.success && res.data) {
        toast.success("Şablon aktarıldı! Düzenleme ekranına yönlendiriliyorsunuz...");
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
  const handleQuickSimulate = async (wf: WorkflowSummaryDto, e: React.MouseEvent) => {
    e.stopPropagation();
    setSimulatingWorkflow(wf);
    setSimulationResult(null);
    setIsSimulating(true);

    try {
      const res = await ApiClient.testWorkflow(
        wf.id,
        {
          id: wf.id,
          entityType: wf.triggerType.split(".")[0],
          mockContext: {
            customerName: "Örnek Müşteri (Ahmet Yılmaz)",
            totalAmount: 15400,
            tier: "VIP",
            status: "Completed",
            priority: "Urgent",
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
        return <span className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 border px-2 py-0.5 rounded-full text-xs font-semibold">Müşteri</span>;
      case "sales":
        return <span className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800 border px-2 py-0.5 rounded-full text-xs font-semibold">Satış & Sipariş</span>;
      case "support":
        return <span className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 border px-2 py-0.5 rounded-full text-xs font-semibold">Destek Masası</span>;
      case "operations":
        return <span className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800 border px-2 py-0.5 rounded-full text-xs font-semibold">Operasyon</span>;
      default:
        return <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 border px-2 py-0.5 rounded-full text-xs font-semibold">{category || "Genel"}</span>;
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
    <div className="flex-1 space-y-6 p-4 md:p-8 max-w-7xl mx-auto">
      {/* 1. Header & Hero Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-2xl shadow-md shadow-blue-500/20">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
                Otomasyon & İş Akışları
                <span className="bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 text-xs font-semibold px-2 py-0.5 rounded-full">
                  v2.0 Canlı
                </span>
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                CRM olaylarına dayalı tetikleyiciler, koşul kuralları ve çok kanallı otomatik aksiyon motoru.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsRecipeDrawerOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-indigo-200 bg-indigo-50/70 text-indigo-700 hover:bg-indigo-100 font-medium text-sm transition-all shadow-xs"
          >
            <Sparkles className="h-4 w-4 text-indigo-600" />
            <span>Tarif Kütüphanesi</span>
          </button>

          <button
            onClick={() => router.push(`/${tenantSlug}/automations/new`)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-all shadow-md shadow-blue-600/20 hover:shadow-lg hover:shadow-blue-600/30"
          >
            <Plus className="h-4 w-4" />
            <span>Yeni Akış Oluştur</span>
          </button>
        </div>
      </div>

      {/* 2. Executive KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 p-4 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-semibold mb-2">
            <span>AKTİF AKIŞLAR</span>
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {stats?.activeWorkflows ?? 0}
            </span>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">/ {stats?.totalWorkflows ?? 0} Akış</span>
          </div>
          <div className="mt-2 text-xs text-emerald-600 flex items-center gap-1 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Çalışır durumda</span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 p-4 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-semibold mb-2">
            <span>BUGÜNKÜ ÇALIŞMA</span>
            <Activity className="h-4 w-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-600">
              {stats?.executionsToday ?? 0}
            </span>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">tetikleme</span>
          </div>
          <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
            <span>Toplam {stats?.totalExecutionsAllTime ?? 0} işlem</span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 p-4 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-semibold mb-2">
            <span>BAŞARI ORANI</span>
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              %{stats?.successRate ?? 100}
            </span>
          </div>
          <div className="mt-2 text-xs text-emerald-600 flex items-center gap-1 font-medium">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Sıfır kritik hata</span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 p-4 shadow-xs bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/50">
          <div className="flex items-center justify-between text-indigo-700 text-xs font-semibold mb-2">
            <span>TASARRUF EDİLEN SÜRE</span>
            <Clock className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-indigo-900">
              ~{stats?.estimatedHoursSaved ?? 0}
            </span>
            <span className="text-xs text-indigo-600 font-medium">Saat/Ay</span>
          </div>
          <div className="mt-2 text-xs text-indigo-600 flex items-center gap-1 font-medium">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Manuel iş gücü tasarrufu</span>
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs & Filtering Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-zinc-900 p-2 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 shadow-xs">
        {/* Main Tabs */}
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("workflows")}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "workflows"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs font-semibold"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            İş Akışlarım ({workflows.length})
          </button>
          <button
            onClick={() => setActiveTab("executions")}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "executions"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs font-semibold"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            Çalışma Günlüğü & Denetim ({executions.length})
          </button>
          <button
            onClick={() => setActiveTab("templates")}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "templates"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs font-semibold"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            Hazır Tarifler ({templates.length})
          </button>
        </div>

        {/* Search & Category Filter */}
        {activeTab === "workflows" && (
          <div className="flex items-center gap-2.5">
            {/* Category Dropdown */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-medium bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-blue-500"
            >
              <option value="all">Tüm Kategoriler</option>
              <option value="Customer">Müşteri</option>
              <option value="Sales">Satış & Sipariş</option>
              <option value="Support">Destek Masası</option>
              <option value="Operations">Operasyon</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
              className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-medium bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-blue-500"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="active">Sadece Aktifler</option>
              <option value="inactive">Sadece Pasifler</option>
            </select>

            {/* Search Input */}
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                placeholder="Akış veya tetikleyici ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 md:w-60 pl-8 pr-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs bg-zinc-50/50 dark:bg-zinc-800/30 focus:bg-white dark:bg-zinc-900 focus:outline-none focus:border-blue-500"
              />
              <Search className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500 absolute left-2.5 top-2.5" />
            </form>

            <button
              onClick={loadData}
              title="Yenile"
              className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400"
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
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-12 text-center">
              <RefreshCw className="h-6 w-6 text-blue-600 animate-spin mx-auto mb-3" />
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Otomasyon akışları yükleniyor...</p>
            </div>
          ) : workflows.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-12 text-center max-w-lg mx-auto">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Henüz bir otomasyon akışı yok</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 mb-5">
                Müşteri ekleme, sipariş tamamlama veya destek bileti açıldığında otomatik aksiyonlar çalıştırın.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setIsRecipeDrawerOpen(true)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 font-medium text-sm"
                >
                  Tarif Kütüphanesine Göz At
                </button>
                <button
                  onClick={() => router.push(`/${tenantSlug}/automations/new`)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm"
                >
                  Sıfırdan Akış Oluştur
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {workflows.map((wf) => (
                <div
                  key={wf.id}
                  onClick={() => router.push(`/${tenantSlug}/automations/${wf.id}`)}
                  className={`group relative bg-white dark:bg-zinc-900 rounded-2xl border transition-all duration-200 hover:shadow-md cursor-pointer p-5 flex flex-col justify-between ${
                    wf.isActive
                      ? "border-zinc-200 dark:border-zinc-800/90 hover:border-blue-300"
                      : "border-zinc-200 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-800/50 opacity-80"
                  }`}
                >
                  {/* Top Bar: Icon, Title, Status Toggle */}
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs font-bold ${
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
                            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 transition-colors">
                              {wf.name}
                            </h3>
                            {getCategoryBadge(wf.category)}
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1 mt-0.5">
                            {wf.description || "Açıklama belirtilmemiş."}
                          </p>
                        </div>
                      </div>

                      {/* On/Off Switch */}
                      <div
                        onClick={(e) => handleToggle(wf, e)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          wf.isActive ? "bg-emerald-500" : "bg-slate-300"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-zinc-900 shadow ring-0 transition duration-200 ease-in-out ${
                            wf.isActive ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </div>
                    </div>

                    {/* Trigger & Step Summary */}
                    <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3 border border-zinc-100 dark:border-zinc-800 mb-4 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-500 dark:text-zinc-400 font-medium">Tetikleyici:</span>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-800/60 shadow-2xs">
                          {getTriggerLabel(wf.triggerType)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400 pt-1 border-t border-zinc-200 dark:border-zinc-800/50">
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
                        <span className="text-zinc-400 dark:text-zinc-500 font-mono text-[11px]">
                          {wf.executionCount} kez çalıştı
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Bar: Action buttons & Run date */}
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-400 dark:text-zinc-500">
                    <div>
                      {wf.lastExecutedAt ? (
                        <span>
                          Son: {new Date(wf.lastExecutedAt).toLocaleDateString("tr-TR")}{" "}
                          {new Date(wf.lastExecutedAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      ) : (
                        <span>Henüz tetiklenmedi</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleQuickSimulate(wf, e)}
                        title="Simüle Et / Test Et"
                        className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-blue-300 hover:bg-blue-50 text-zinc-600 dark:text-zinc-400 hover:text-blue-700 font-medium flex items-center gap-1"
                      >
                        <Play className="h-3 w-3 fill-current" />
                        <span>Test</span>
                      </button>

                      <button
                        onClick={(e) => handleDelete(wf.id, wf.name, e)}
                        title="Sil"
                        className="p-1 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>

                      <div className="p-1 text-zinc-400 dark:text-zinc-500 group-hover:text-blue-600 transition-colors">
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
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/30">
            <div>
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">Son Çalışma Günlüğü (Audit Trail)</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Olay tetiklemeleri, koşul doğrulama sonuçları ve aksiyon yürütme süreleri.
              </p>
            </div>
            <button
              onClick={loadData}
              className="flex items-center gap-1 px-3 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-900"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Yenile</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-400">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 uppercase font-semibold border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Tarih / Saat</th>
                  <th className="py-3 px-4">Akış Adı</th>
                  <th className="py-3 px-4">Tetikleyici Kaynağı</th>
                  <th className="py-3 px-4">Varlık</th>
                  <th className="py-3 px-4">Durum</th>
                  <th className="py-3 px-4">Aksiyonlar</th>
                  <th className="py-3 px-4">Süre</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {executions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-zinc-400 dark:text-zinc-500">
                      Henüz çalışma kaydı bulunmuyor.
                    </td>
                  </tr>
                ) : (
                  executions.map((exec) => (
                    <tr key={exec.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-zinc-500 dark:text-zinc-400">
                        {new Date(exec.createdAt).toLocaleDateString("tr-TR")}{" "}
                        {new Date(exec.createdAt).toLocaleTimeString("tr-TR")}
                      </td>
                      <td className="py-3 px-4 font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                        {exec.workflowName}
                      </td>
                      <td className="py-3 px-4">
                        <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded-md font-mono text-[11px]">
                          {exec.triggerSource}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {exec.entityType ? (
                          <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                            {exec.entityType} ({exec.entityId?.substring(0, 8)})
                          </span>
                        ) : (
                          <span className="text-zinc-400 dark:text-zinc-500">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {exec.status === "Success" ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium text-[11px] border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            Başarılı
                          </span>
                        ) : exec.status === "Skipped" ? (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium text-[11px] border border-amber-200">
                            <AlertCircle className="h-3 w-3 text-amber-600" />
                            Koşul Sağlanmadı
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-medium text-[11px] border border-red-200">
                            <XCircle className="h-3 w-3 text-red-600" />
                            Hata
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                          {exec.actionsExecutedCount} adım
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-500 dark:text-zinc-400">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tmpl) => (
            <div
              key={tmpl.id}
              className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 flex flex-col justify-between hover:shadow-md transition-all group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs font-bold ${
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

                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 transition-colors">
                  {tmpl.name}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 mb-4 leading-relaxed">
                  {tmpl.description}
                </p>

                <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-2.5 text-xs text-zinc-600 dark:text-zinc-400 space-y-1.5 mb-4 border border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 dark:text-zinc-500">Tetikleyici:</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{getTriggerLabel(tmpl.triggerType)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 dark:text-zinc-500">Aksiyonlar:</span>
                    <span className="font-semibold text-blue-600">{tmpl.actions.length} Adım</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleUseTemplate(tmpl)}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-900 hover:bg-blue-600 text-white font-medium text-xs transition-all shadow-xs"
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
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-xl h-full shadow-2xl p-6 overflow-y-auto flex flex-col justify-between slide-in-from-right animate-in">
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Tarif Kütüphanesi</h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Önceden optimize edilmiş hazır otomasyon tarifleri</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsRecipeDrawerOpen(false)}
                  className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-400"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3">
                {templates.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800/90 hover:border-blue-300 bg-white dark:bg-zinc-900 transition-all hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">{tmpl.name}</h4>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{tmpl.description}</p>
                      </div>
                      {getCategoryBadge(tmpl.category)}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800 mt-3 text-xs">
                      <span className="text-zinc-500 dark:text-zinc-400 font-mono">{tmpl.actions.length} Otomatik Adım</span>
                      <button
                        onClick={() => handleUseTemplate(tmpl)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-all shadow-xs"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Kullan</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <button
                onClick={() => setIsRecipeDrawerOpen(false)}
                className="w-full py-2 text-center text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Quick Simulation / Dry-run Modal */}
      {simulatingWorkflow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 rounded-xl">
                  <Play className="h-4 w-4 fill-current" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">Akış Simülasyonu (Dry-Run)</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{simulatingWorkflow.name}</p>
                </div>
              </div>
              <button
                onClick={() => setSimulatingWorkflow(null)}
                className="p-1 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-400 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {isSimulating ? (
              <div className="py-12 text-center space-y-3">
                <RefreshCw className="h-6 w-6 text-blue-600 animate-spin mx-auto" />
                <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Koşullar ve aksiyon zinciri simüle ediliyor...
                </p>
              </div>
            ) : simulationResult ? (
              <div className="space-y-3">
                <div
                  className={`p-3.5 rounded-2xl border text-xs ${
                    simulationResult.status === "Success"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                      : simulationResult.status === "Skipped"
                      ? "bg-amber-50 border-amber-200 text-amber-900"
                      : "bg-red-50 border-red-200 text-red-900"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold mb-1">
                    {simulationResult.status === "Success" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : simulationResult.status === "Skipped" ? (
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span>Simülasyon Sonucu: {simulationResult.status}</span>
                  </div>
                  <p className="text-[11px] opacity-90">{simulationResult.conditionsSummary}</p>
                </div>

                <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 bg-zinc-50 dark:bg-zinc-800/50 space-y-2 max-h-56 overflow-y-auto">
                  <span className="text-zinc-400 dark:text-zinc-500 text-[11px] font-semibold uppercase">
                    Yürütülen Adımlar ({simulationResult.stepLogs.length})
                  </span>
                  {simulationResult.stepLogs.map((log, idx) => (
                    <div
                      key={idx}
                      className="bg-white dark:bg-zinc-900 p-2.5 rounded-lg border border-zinc-200/80 dark:border-zinc-800/90 flex items-start justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-zinc-800 dark:text-zinc-200">{log.stepTitle}</div>
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">{log.message}</div>
                      </div>
                      <span className="font-mono text-[10px] text-zinc-400 dark:text-zinc-500">{log.executionDurationMs}ms</span>
                    </div>
                  ))}
                </div>

                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 text-center">
                  * Dry-Run modunda gerçek e-posta veya webhook fırlatılmaz, yalnızca kural testi yapılır.
                </p>
              </div>
            ) : null}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSimulatingWorkflow(null)}
                className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-slate-200 text-zinc-700 dark:text-zinc-300 text-xs font-semibold"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
