"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { PageContainer } from "@workspace/ui/components/page-container";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { toast } from "@workspace/ui/components/sonner";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  FolderOpen,
  Kanban as KanbanIcon,
  LifeBuoy,
  List,
  MessageSquare,
  Package,
  Plus,
  RefreshCw,
  Search,
  Timer,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ApiClient,
  type CreateTicketPayload,
  type CustomerListDto,
  type DepartmentDto,
  type OrderListDto,
  type TenantUserDto,
  type TicketListDto,
  type TicketStatsDto,
} from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";

export default function TicketsDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = (params?.tenantSlug as string) || "";
  const { activeTenant } = usePermissions();

  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [activeQueue, setActiveQueue] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedPriority, setSelectedPriority] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const [isLoading, setIsLoading] = useState(true);
  const [tickets, setTickets] = useState<TicketListDto[]>([]);
  const [stats, setStats] = useState<TicketStatsDto | null>(null);

  // Reference data for creation / filtering
  const [customers, setCustomers] = useState<CustomerListDto[]>([]);
  const [users, setUsers] = useState<TenantUserDto[]>([]);
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [orders, setOrders] = useState<OrderListDto[]>([]);

  // Create Ticket Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTicket, setNewTicket] = useState<Partial<CreateTicketPayload>>({
    category: "Teknik Destek",
    description: "",
    priority: "Medium",
    source: "Web",
    subject: "",
  });

  const loadData = useCallback(async () => {
    if (!activeTenant) {
      return;
    }
    setIsLoading(true);

    try {
      const [
        ticketsRes,
        statsRes,
        customersRes,
        usersRes,
        deptsRes,
        ordersRes,
      ] = await Promise.all([
        ApiClient.getTickets(
          {
            category: selectedCategory === "all" ? undefined : selectedCategory,
            pageSize: 50,
            priority: selectedPriority === "all" ? undefined : selectedPriority,
            queue: activeQueue === "all" ? undefined : activeQueue,
            search: searchQuery.trim() || undefined,
            status: selectedStatus === "all" ? undefined : selectedStatus,
          },
          activeTenant.id
        ),
        ApiClient.getTicketStats(activeTenant.id),
        ApiClient.getCustomers(activeTenant.id, { pageSize: 100 }),
        ApiClient.getTenantUsers(activeTenant.id),
        ApiClient.getDepartments(activeTenant.id),
        ApiClient.getOrders({ pageSize: 100 }, activeTenant.id),
      ]);

      if (ticketsRes.success && ticketsRes.data) {
        setTickets(ticketsRes.data.items || []);
      }
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
      if (customersRes.success && customersRes.data) {
        setCustomers(customersRes.data.items || []);
      }
      if (usersRes.success && usersRes.data) {
        setUsers(usersRes.data);
      }
      if (deptsRes.success && deptsRes.data) {
        setDepartments(deptsRes.data);
      }
      if (ordersRes.success && ordersRes.data) {
        setOrders(ordersRes.data.items || []);
      }
    } catch (err) {
      console.error("Error loading tickets data:", err);
      toast.error("Bilet verileri yüklenirken bir hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  }, [
    activeTenant,
    activeQueue,
    searchQuery,
    selectedStatus,
    selectedPriority,
    selectedCategory,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant) {
      return;
    }
    if (!(newTicket.customerId && newTicket.subject?.trim())) {
      toast.error("Lütfen müşteri ve konu alanlarını doldurun.");
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedCustomer = customers.find(
        (c) => c.id === newTicket.customerId
      );
      const selectedDept = departments.find(
        (d) => d.id === newTicket.departmentId
      );
      const selectedAssignee = users.find(
        (u) => u.id === newTicket.assignedUserId
      );

      const payload: CreateTicketPayload = {
        assignedUserId: newTicket.assignedUserId,
        assignedUserName: selectedAssignee?.fullName || selectedAssignee?.email,
        category: newTicket.category || "Genel",
        customerEmail: selectedCustomer?.email,
        customerId: newTicket.customerId,
        customerName: selectedCustomer?.name || "Müşteri",
        customerPhone: selectedCustomer?.phone,
        departmentId: newTicket.departmentId,
        departmentName: selectedDept?.name,
        description: newTicket.description?.trim() || undefined,
        linkedEntityId: newTicket.linkedEntityId,
        linkedEntityTitle: newTicket.linkedEntityTitle,
        linkedEntityType: newTicket.linkedEntityType,
        priority: newTicket.priority || "Medium",
        source: newTicket.source || "Web",
        subject: newTicket.subject.trim(),
      };

      const res = await ApiClient.createTicket(payload, activeTenant.id);
      if (res.success && res.data) {
        toast.success(
          `Destek talebi #${res.data.ticketNumber} başarıyla oluşturuldu!`
        );
        setIsCreateModalOpen(false);
        setNewTicket({
          category: "Teknik Destek",
          description: "",
          priority: "Medium",
          source: "Web",
          subject: "",
        });
        loadData();
        router.push(`/${tenantSlug}/tickets/${res.data.id}`);
      } else {
        toast.error(res.message || "Destek talebi oluşturulamadı.");
      }
    } catch (err) {
      console.error("Error creating ticket:", err);
      toast.error("Destek talebi oluşturulurken beklenmeyen bir hata oluştu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "Urgent":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/60 px-2 py-0.5 font-bold text-2xs text-red-700 dark:text-red-300 shadow-2xs">
            <Flame className="h-3 w-3 animate-pulse text-red-600 dark:text-red-400" />
            Acil / Kritik
          </span>
        );
      case "High":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 font-bold text-2xs text-amber-800 dark:text-amber-300 shadow-2xs">
            <AlertCircle className="h-3 w-3 text-amber-700 dark:text-amber-400" />
            Yüksek
          </span>
        );
      case "Low":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-zinc-50 px-2 py-0.5 font-medium text-2xs text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-400">
            Düşük
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 font-medium text-2xs text-blue-700 dark:text-blue-300">
            Orta
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "New":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 font-semibold text-2xs text-emerald-800 dark:text-emerald-300">
            <span className="h-1.5 w-1.5 animate-ping rounded-full bg-emerald-500" />
            Yeni
          </span>
        );
      case "InProgress":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 font-semibold text-2xs text-blue-800 dark:text-blue-300">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            İşlemde
          </span>
        );
      case "PendingCustomer":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-0.5 font-semibold text-2xs text-amber-800 dark:text-amber-300">
            <Clock className="h-3 w-3 text-amber-700 dark:text-amber-400" />
            Müşteri Bekleniyor
          </span>
        );
      case "OnHold":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-950/60 px-2.5 py-0.5 font-semibold text-2xs text-purple-800 dark:text-purple-300">
            Beklemede
          </span>
        );
      case "Resolved":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 dark:border-emerald-700 bg-emerald-100/70 dark:bg-emerald-950/60 px-2.5 py-0.5 font-semibold text-2xs text-emerald-900 dark:text-emerald-300">
            <CheckCircle2 className="h-3 w-3 text-emerald-700" />
            Çözüldü
          </span>
        );
      case "Closed":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-zinc-100 px-2.5 py-0.5 font-medium text-2xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            Kapatıldı
          </span>
        );
      default:
        return (
          <span className="rounded-md border border-border bg-zinc-50 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-400">
            {status}
          </span>
        );
    }
  };

  // Kanban Columns
  const kanbanColumns = useMemo(
    () => [
      {
        bg: "bg-emerald-50/30",
        color: "border-t-emerald-500",
        id: "New",
        title: "Yeni Talepler",
      },
      {
        bg: "bg-blue-50/30",
        color: "border-t-blue-500",
        id: "InProgress",
        title: "İşlemde & Temsilcide",
      },
      {
        bg: "bg-amber-50/30",
        color: "border-t-amber-500",
        id: "PendingCustomer",
        title: "Müşteri Bekleniyor",
      },
      {
        bg: "bg-purple-50/30",
        color: "border-t-purple-500",
        id: "Resolved",
        title: "Çözülen Talepler",
      },
    ],
    []
  );

  return (
    <PageContainer className="space-y-6">
      {/* 1. Header & Quick Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-blue-500/20 shadow-md">
              <LifeBuoy className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-bold text-2xl text-zinc-900 tracking-tight dark:text-zinc-100">
                Destek Masası & Talepler
              </h1>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Müşteri yardım biletleri, SLA süreleri ve çok kanallı iletişim
                yönetimi
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Switcher */}
          <div className="flex items-center rounded-xl border border-border bg-zinc-100 p-1 shadow-2xs dark:bg-zinc-800/80">
            <button
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium text-xs transition-all ${viewMode === "table" ? "bg-card text-zinc-900 shadow-xs dark:text-zinc-100" : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"}`}
              onClick={() => setViewMode("table")}
              type="button"
            >
              <List className="h-3.5 w-3.5" />
              <span>Tablo</span>
            </button>
            <button
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium text-xs transition-all ${viewMode === "kanban" ? "bg-card text-zinc-900 shadow-xs dark:text-zinc-100" : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"}`}
              onClick={() => setViewMode("kanban")}
              type="button"
            >
              <KanbanIcon className="h-3.5 w-3.5" />
              <span>Kanban</span>
            </button>
          </div>

          <Button
            className="rounded-xl border-border text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
            onClick={() => loadData()}
            size="sm"
            variant="outline"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>

          <Button
            className="gap-2 rounded-xl bg-blue-600 font-medium text-white shadow-sm hover:bg-blue-700"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="h-4 w-4" />
            <span>Yeni Destek Talebi</span>
          </Button>
        </div>
      </div>

      {/* 2. Executive KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-xs transition hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-xs text-muted-foreground">
              Toplam Açık Talep
            </span>
            <div className="rounded-xl bg-blue-50 dark:bg-blue-950/60 p-2 text-blue-600 dark:text-blue-400">
              <FolderOpen className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-bold text-2xl text-zinc-900 tracking-tight dark:text-zinc-100">
              {stats?.totalOpenTickets ?? 0}
            </span>
            <span className="text-xs text-muted-foreground">
              ({stats?.newTickets ?? 0} yeni)
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-xs transition hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-xs text-muted-foreground">
              Yanıt Bekleyenler
            </span>
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/60 p-2 text-amber-700 dark:text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-bold text-2xl text-amber-700 dark:text-amber-400 tracking-tight">
              {stats?.pendingCustomerTickets ?? 0}
            </span>
            <span className="text-amber-700 dark:text-amber-400 text-xs">
              müşteri aksiyonu
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-xs transition hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-xs text-muted-foreground">
              SLA Aşımı / Risk
            </span>
            <div className="rounded-xl bg-red-50 dark:bg-red-950/60 p-2 text-red-600 dark:text-red-400">
              <Flame className="h-4 w-4 animate-pulse" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-bold text-2xl text-red-600 dark:text-red-400 tracking-tight">
              {stats?.slaBreachedTickets ?? 0}
            </span>
            <span className="text-red-600 dark:text-red-400 text-xs">
              ({stats?.urgentTickets ?? 0} acil)
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-xs transition hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-xs text-muted-foreground">
              SLA Başarı Oranı
            </span>
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/60 p-2 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-bold text-2xl text-emerald-700 dark:text-emerald-300 tracking-tight">
              %{stats?.slaComplianceRate ?? 98.5}
            </span>
            <span className="text-emerald-700 dark:text-emerald-400 text-xs">
              ({stats?.resolvedTodayCount ?? 0} bugün)
            </span>
          </div>
        </div>
      </div>

      {/* 3. Queue Tabs & Filter Bar */}
      <div className="space-y-3">
        {/* Queues */}
        <div className="scrollbar-none flex items-center gap-1.5 overflow-x-auto border-border border-b pb-2 text-xs">
          {[
            { count: stats?.totalTickets, id: "all", label: "Tüm Talepler" },
            { id: "my", label: "Bana Atananlar" },
            {
              count: stats?.pendingCustomerTickets,
              id: "pending",
              label: "Müşteri Yanıtı Bekleyenler",
            },
            {
              badgeColor: "bg-red-100 text-red-700",
              count: stats?.slaBreachedTickets,
              id: "slabreached",
              label: "SLA Aşımı & Riskli",
            },
            { id: "resolved", label: "Çözülen & Kapatılanlar" },
          ].map((q) => (
            <button
              className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-1.5 font-medium transition-all ${
                activeQueue === q.id
                  ? "bg-zinc-900 text-white shadow-2xs"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900 dark:bg-zinc-800/80 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
              key={q.id}
              onClick={() => setActiveQueue(q.id)}
              type="button"
            >
              <span>{q.label}</span>
              {q.count !== undefined && q.count > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.2 font-bold text-3xs ${activeQueue === q.id ? "bg-card text-white" : q.badgeColor || "bg-muted text-zinc-700 dark:text-zinc-300"}`}
                >
                  {q.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="w-full rounded-xl border border-border bg-card py-2 pr-3 pl-9 text-xs shadow-2xs focus:border-blue-500 focus:outline-none"
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Bilet no (#TICK-1001), müşteri adı veya konu ara..."
              value={searchQuery}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select onValueChange={setSelectedStatus} value={selectedStatus}>
              <SelectTrigger className="h-9 w-[130px] rounded-xl border-border bg-card text-xs">
                <SelectValue placeholder="Durum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Durumlar</SelectItem>
                <SelectItem value="New">Yeni</SelectItem>
                <SelectItem value="InProgress">İşlemde</SelectItem>
                <SelectItem value="PendingCustomer">
                  Müşteri Bekliyor
                </SelectItem>
                <SelectItem value="Resolved">Çözüldü</SelectItem>
                <SelectItem value="Closed">Kapatıldı</SelectItem>
              </SelectContent>
            </Select>

            <Select
              onValueChange={setSelectedPriority}
              value={selectedPriority}
            >
              <SelectTrigger className="h-9 w-[120px] rounded-xl border-border bg-card text-xs">
                <SelectValue placeholder="Öncelik" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Öncelikler</SelectItem>
                <SelectItem value="Urgent">Acil / Kritik</SelectItem>
                <SelectItem value="High">Yüksek</SelectItem>
                <SelectItem value="Medium">Orta</SelectItem>
                <SelectItem value="Low">Düşük</SelectItem>
              </SelectContent>
            </Select>

            <Select
              onValueChange={setSelectedCategory}
              value={selectedCategory}
            >
              <SelectTrigger className="h-9 w-[130px] rounded-xl border-border bg-card text-xs">
                <SelectValue placeholder="Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Kategoriler</SelectItem>
                <SelectItem value="Teknik Destek">Teknik Destek</SelectItem>
                <SelectItem value="Satış / Teklif">Satış / Teklif</SelectItem>
                <SelectItem value="Fatura & Muhasebe">
                  Fatura & Muhasebe
                </SelectItem>
                <SelectItem value="Kargo & Teslimat">
                  Kargo & Teslimat
                </SelectItem>
                <SelectItem value="İade & Değişim">İade & Değişim</SelectItem>
                <SelectItem value="Genel">Genel</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 4. Main View (Table vs. Kanban) */}
      {isLoading ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card p-8">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
          <span className="font-medium text-sm text-muted-foreground">
            Destek biletleri yükleniyor...
          </span>
        </div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border border-dashed bg-card p-12 text-center">
          <div className="rounded-2xl bg-blue-50 dark:bg-blue-950/60 p-4 text-blue-600 dark:text-blue-400">
            <LifeBuoy className="h-8 w-8" />
          </div>
          <h3 className="mt-4 font-semibold text-base text-zinc-900 dark:text-zinc-100">
            Destek Talebi Bulunamadı
          </h3>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            Seçili filtrelere uygun destek talebi bulunmuyor. Yeni bir bilet
            oluşturabilir veya filtreleri temizleyebilirsiniz.
          </p>
          <Button
            className="mt-4 gap-2 rounded-xl bg-blue-600 text-white text-xs"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Yeni Destek Talebi Aç</span>
          </Button>
        </div>
      ) : viewMode === "table" ? (
        /* TABLE VIEW */
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="border-border bg-zinc-50 text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-400">
                <TableRow>
                  <TableHead className="px-4 py-3.5 h-auto">
                    Talep No & Konu
                  </TableHead>
                  <TableHead className="px-4 py-3.5 h-auto">Müşteri</TableHead>
                  <TableHead className="px-4 py-3.5 h-auto">Durum</TableHead>
                  <TableHead className="px-4 py-3.5 h-auto">Öncelik</TableHead>
                  <TableHead className="px-4 py-3.5 h-auto">Atanan</TableHead>
                  <TableHead className="px-4 py-3.5 h-auto">
                    SLA Durumu
                  </TableHead>
                  <TableHead className="px-4 py-3.5 h-auto">Mesajlar</TableHead>
                  <TableHead className="px-4 py-3.5 text-right h-auto">
                    İşlem
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {tickets.map((t) => (
                  <TableRow
                    className="group cursor-pointer transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50"
                    key={t.id}
                    onClick={() =>
                      router.push(`/${tenantSlug}/tickets/${t.id}`)
                    }
                  >
                    <TableCell className="px-4 py-3.5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-blue-600 dark:text-blue-400 text-xs group-hover:underline">
                            #{t.ticketNumber}
                          </span>
                          <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-medium text-3xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                            {t.category}
                          </span>
                          {t.linkedEntityTitle && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 text-3xs text-blue-700 dark:text-blue-300">
                              <Package className="h-2.5 w-2.5" />
                              {t.linkedEntityTitle}
                            </span>
                          )}
                        </div>
                        <p className="line-clamp-1 font-semibold text-xs text-zinc-800 dark:text-zinc-200">
                          {t.subject}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell className="px-4 py-3.5">
                      <div className="font-medium text-zinc-800 dark:text-zinc-200">
                        {t.customerName}
                      </div>
                      {t.customerEmail && (
                        <div className="text-2xs text-muted-foreground">
                          {t.customerEmail}
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="px-4 py-3.5">
                      {getStatusBadge(t.status)}
                    </TableCell>

                    <TableCell className="px-4 py-3.5">
                      {getPriorityBadge(t.priority)}
                    </TableCell>

                    <TableCell className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 font-bold text-3xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                          {t.assignedUserName
                            ? t.assignedUserName.charAt(0).toUpperCase()
                            : "?"}
                        </div>
                        <span className="font-medium text-xs text-zinc-700 dark:text-zinc-300">
                          {t.assignedUserName || "Atanmamış"}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="px-4 py-3.5">
                      {t.isSlaBreached ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-red-50 dark:bg-red-950/60 px-2 py-0.5 font-bold text-2xs text-red-600 dark:text-red-400">
                          <Flame className="h-3 w-3 animate-pulse" />
                          SLA Aşıldı
                        </span>
                      ) : t.slaResolutionDueAt ? (
                        <span className="inline-flex items-center gap-1 text-2xs text-muted-foreground">
                          <Timer className="h-3 w-3 text-muted-foreground" />
                          {new Date(t.slaResolutionDueAt).toLocaleTimeString(
                            "tr-TR",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>

                    <TableCell className="px-4 py-3.5">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>{t.messageCount}</span>
                      </div>
                    </TableCell>

                    <TableCell className="px-4 py-3.5 text-right">
                      <Link
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-zinc-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:text-blue-400 dark:text-zinc-400"
                        href={`/${tenantSlug}/tickets/${t.id}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span>Detay</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        /* KANBAN BOARD VIEW */
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {kanbanColumns.map((col) => {
            const colTickets = tickets.filter((t) => {
              if (col.id === "New") {
                return t.status === "New";
              }
              if (col.id === "InProgress") {
                return t.status === "InProgress";
              }
              if (col.id === "PendingCustomer") {
                return t.status === "PendingCustomer" || t.status === "OnHold";
              }
              if (col.id === "Resolved") {
                return t.status === "Resolved" || t.status === "Closed";
              }
              return false;
            });

            return (
              <div
                className={`flex flex-col rounded-2xl border border-border ${col.bg} min-h-[500px] p-3.5 shadow-2xs`}
                key={col.id}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between border-border border-b pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-zinc-800 tracking-tight dark:text-zinc-200">
                      {col.title}
                    </span>
                    <span className="rounded-full bg-card px-2 py-0.5 font-bold text-3xs text-zinc-600 shadow-2xs dark:text-zinc-400">
                      {colTickets.length}
                    </span>
                  </div>
                </div>

                {/* Column Cards */}
                <div className="mt-3 flex-1 space-y-3 overflow-y-auto">
                  {colTickets.length === 0 ? (
                    <div className="flex h-32 items-center justify-center rounded-xl border border-border border-dashed p-4 text-center text-xs text-muted-foreground">
                      Bu aşamada talep yok
                    </div>
                  ) : (
                    colTickets.map((ticket) => (
                      <div
                        className="group cursor-pointer rounded-xl border border-border bg-card p-3.5 shadow-2xs transition-all hover:border-blue-300 hover:shadow-md"
                        key={ticket.id}
                        onClick={() =>
                          router.push(`/${tenantSlug}/tickets/${ticket.id}`)
                        }
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-blue-600 dark:text-blue-400 text-xs">
                            #{ticket.ticketNumber}
                          </span>
                          {getPriorityBadge(ticket.priority)}
                        </div>

                        <h4 className="mt-1.5 line-clamp-2 font-semibold text-xs text-zinc-900 group-hover:text-blue-600 dark:group-hover:text-blue-400 dark:text-zinc-100">
                          {ticket.subject}
                        </h4>

                        <div className="mt-2.5 flex items-center justify-between border-border border-t pt-2 text-2xs text-muted-foreground">
                          <span className="max-w-[120px] truncate font-medium text-zinc-700 dark:text-zinc-300">
                            {ticket.customerName}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-0.5 text-muted-foreground">
                              <MessageSquare className="h-3 w-3" />
                              {ticket.messageCount}
                            </span>
                            {ticket.isSlaBreached && (
                              <Flame className="h-3.5 w-3.5 animate-pulse text-red-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Create Ticket Modal */}
      {isCreateModalOpen && (
        <Dialog
          onOpenChange={(open) => {
            if (!open) {
              setIsCreateModalOpen(false);
            }
          }}
          open
        >
          <DialogContent
            aria-describedby={undefined}
            className="max-h-[90vh] w-full overflow-y-auto gap-0 p-6 sm:max-w-xl"
            showCloseButton={false}
          >
            <div className="flex items-center justify-between border-border border-b pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                    Yeni Destek Talebi Aç
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground">
                    Müşteri adına yeni bir yardım bileti oluşturun
                  </p>
                </div>
              </div>
              <DialogClose asChild>
                <button
                  aria-label="Kapat"
                  className="rounded-full p-1 text-muted-foreground hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                  type="button"
                >
                  <X className="h-5 w-5" />
                </button>
              </DialogClose>
            </div>

            <form
              className="mt-4 space-y-4 text-xs"
              onSubmit={handleCreateTicket}
            >
              {/* Customer Selector */}
              <div>
                <label className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300">
                  Müşteri <span className="text-red-500">*</span>
                </label>
                <Select
                  onValueChange={(val) =>
                    setNewTicket((prev) => ({ ...prev, customerId: val }))
                  }
                  value={newTicket.customerId || ""}
                >
                  <SelectTrigger className="rounded-xl border-border text-xs">
                    <SelectValue placeholder="Müşteri seçin..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} {c.industry ? `(${c.industry})` : ""} -{" "}
                        {c.email || c.phone || ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Subject */}
              <div>
                <label className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300">
                  Talep Konusu <span className="text-red-500">*</span>
                </label>
                <input
                  className="w-full rounded-xl border border-border bg-card p-2.5 text-xs focus:border-blue-500 focus:outline-none"
                  onChange={(e) =>
                    setNewTicket((prev) => ({
                      ...prev,
                      subject: e.target.value,
                    }))
                  }
                  placeholder="Örn: Sipariş teslimatı gecikmesi hakkında"
                  required
                  value={newTicket.subject || ""}
                />
              </div>

              {/* Category & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300">
                    Kategori
                  </label>
                  <Select
                    onValueChange={(val) =>
                      setNewTicket((prev) => ({ ...prev, category: val }))
                    }
                    value={newTicket.category || "Teknik Destek"}
                  >
                    <SelectTrigger className="rounded-xl border-border text-xs">
                      <SelectValue placeholder="Kategori seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Teknik Destek">
                        Teknik Destek
                      </SelectItem>
                      <SelectItem value="Satış / Teklif">
                        Satış / Teklif
                      </SelectItem>
                      <SelectItem value="Fatura & Muhasebe">
                        Fatura & Muhasebe
                      </SelectItem>
                      <SelectItem value="Kargo & Teslimat">
                        Kargo & Teslimat
                      </SelectItem>
                      <SelectItem value="İade & Değişim">
                        İade & Değişim
                      </SelectItem>
                      <SelectItem value="Genel">Genel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300">
                    Öncelik Seviyesi
                  </label>
                  <Select
                    onValueChange={(val) =>
                      setNewTicket((prev) => ({ ...prev, priority: val }))
                    }
                    value={newTicket.priority || "Medium"}
                  >
                    <SelectTrigger className="rounded-xl border-border text-xs">
                      <SelectValue placeholder="Öncelik" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Düşük (48s SLA)</SelectItem>
                      <SelectItem value="Medium">Orta (24s SLA)</SelectItem>
                      <SelectItem value="High">Yüksek (8s SLA)</SelectItem>
                      <SelectItem value="Urgent">
                        Acil / Kritik (4s SLA)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Assigned Agent & Department */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300">
                    Atanan Temsilci
                  </label>
                  <Select
                    onValueChange={(val) =>
                      setNewTicket((prev) => ({
                        ...prev,
                        assignedUserId: val === "unassigned" ? undefined : val,
                      }))
                    }
                    value={newTicket.assignedUserId || "unassigned"}
                  >
                    <SelectTrigger className="rounded-xl border-border text-xs">
                      <SelectValue placeholder="Temsilci ata" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Atanmamış</SelectItem>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.fullName || u.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300">
                    Departman
                  </label>
                  <Select
                    onValueChange={(val) =>
                      setNewTicket((prev) => ({
                        ...prev,
                        departmentId: val === "none" ? undefined : val,
                      }))
                    }
                    value={newTicket.departmentId || "none"}
                  >
                    <SelectTrigger className="rounded-xl border-border text-xs">
                      <SelectValue placeholder="Departman seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Seçilmedi</SelectItem>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Linked Entity (Optional Order or Product) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300">
                    İlişkili Sipariş (Opsiyonel)
                  </label>
                  <Select
                    onValueChange={(val) => {
                      if (val === "none") {
                        setNewTicket((prev) => ({
                          ...prev,
                          linkedEntityId: undefined,
                          linkedEntityTitle: undefined,
                          linkedEntityType: undefined,
                        }));
                      } else {
                        const ord = orders.find((o) => o.id === val);
                        setNewTicket((prev) => ({
                          ...prev,
                          linkedEntityId: val,
                          linkedEntityTitle: `Sipariş #${ord?.orderNumber || val.substring(0, 6)}`,
                          linkedEntityType: "Order",
                        }));
                      }
                    }}
                    value={newTicket.linkedEntityId || "none"}
                  >
                    <SelectTrigger className="rounded-xl border-border text-xs">
                      <SelectValue placeholder="Sipariş bağla..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-48">
                      <SelectItem value="none">Yok</SelectItem>
                      {orders.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          #{o.orderNumber} - {o.customerName} ({o.totalAmount}{" "}
                          {o.currency})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300">
                    İletişim Kanalı
                  </label>
                  <Select
                    onValueChange={(val) =>
                      setNewTicket((prev) => ({ ...prev, source: val }))
                    }
                    value={newTicket.source || "Web"}
                  >
                    <SelectTrigger className="rounded-xl border-border text-xs">
                      <SelectValue placeholder="Kanal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Web">Web Portalı</SelectItem>
                      <SelectItem value="LiveChat">Canlı Destek</SelectItem>
                      <SelectItem value="Email">E-Posta</SelectItem>
                      <SelectItem value="Phone">Telefon Çağrısı</SelectItem>
                      <SelectItem value="Internal">
                        Dahili / Ofis İçi
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300">
                  Açıklama / İlk Mesaj
                </label>
                <textarea
                  className="w-full rounded-xl border border-border p-2.5 text-xs focus:border-blue-500 focus:outline-none"
                  onChange={(e) =>
                    setNewTicket((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Müşterinin sorunu veya talebinin detayları..."
                  rows={3}
                  value={newTicket.description || ""}
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 border-border border-t pt-3">
                <Button
                  className="rounded-xl border-border text-xs"
                  onClick={() => setIsCreateModalOpen(false)}
                  type="button"
                  variant="outline"
                >
                  İptal
                </Button>
                <Button
                  className="gap-2 rounded-xl bg-blue-600 font-medium text-white text-xs shadow-sm hover:bg-blue-700"
                  disabled={isSubmitting}
                  type="submit"
                >
                  {isSubmitting && (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  )}
                  <span>Talebi Oluştur</span>
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </PageContainer>
  );
}
