"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
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
    priority: "Medium",
    source: "Web",
    subject: "",
    description: "",
  });

  const loadData = useCallback(async () => {
    if (!activeTenant) return;
    setIsLoading(true);

    try {
      const [ticketsRes, statsRes, customersRes, usersRes, deptsRes, ordersRes] =
        await Promise.all([
          ApiClient.getTickets(
            {
              category: selectedCategory === "all" ? undefined : selectedCategory,
              priority: selectedPriority === "all" ? undefined : selectedPriority,
              queue: activeQueue === "all" ? undefined : activeQueue,
              search: searchQuery.trim() || undefined,
              status: selectedStatus === "all" ? undefined : selectedStatus,
              pageSize: 50,
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
    if (!activeTenant) return;
    if (!newTicket.customerId || !newTicket.subject?.trim()) {
      toast.error("Lütfen müşteri ve konu alanlarını doldurun.");
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedCustomer = customers.find((c) => c.id === newTicket.customerId);
      const selectedDept = departments.find((d) => d.id === newTicket.departmentId);
      const selectedAssignee = users.find((u) => u.id === newTicket.assignedUserId);

      const payload: CreateTicketPayload = {
        customerId: newTicket.customerId,
        customerName: selectedCustomer?.name || "Müşteri",
        customerEmail: selectedCustomer?.email,
        customerPhone: selectedCustomer?.phone,
        subject: newTicket.subject.trim(),
        description: newTicket.description?.trim() || undefined,
        category: newTicket.category || "Genel",
        priority: newTicket.priority || "Medium",
        source: newTicket.source || "Web",
        departmentId: newTicket.departmentId,
        departmentName: selectedDept?.name,
        assignedUserId: newTicket.assignedUserId,
        assignedUserName: selectedAssignee?.fullName || selectedAssignee?.email,
        linkedEntityType: newTicket.linkedEntityType,
        linkedEntityId: newTicket.linkedEntityId,
        linkedEntityTitle: newTicket.linkedEntityTitle,
      };

      const res = await ApiClient.createTicket(payload, activeTenant.id);
      if (res.success && res.data) {
        toast.success(`Destek talebi #${res.data.ticketNumber} başarıyla oluşturuldu!`);
        setIsCreateModalOpen(false);
        setNewTicket({
          category: "Teknik Destek",
          priority: "Medium",
          source: "Web",
          subject: "",
          description: "",
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
          <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 font-bold text-[11px] text-red-700 shadow-2xs">
            <Flame className="h-3 w-3 text-red-600 animate-pulse" />
            Acil / Kritik
          </span>
        );
      case "High":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-bold text-[11px] text-amber-800 shadow-2xs">
            <AlertCircle className="h-3 w-3 text-amber-600" />
            Yüksek
          </span>
        );
      case "Low":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-2 py-0.5 font-medium text-[11px] text-zinc-600 dark:text-zinc-400">
            Düşük
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 font-medium text-[11px] text-blue-700">
            Orta
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "New":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 font-semibold text-[11px] text-emerald-800">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
            Yeni
          </span>
        );
      case "InProgress":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-blue-300 bg-blue-50 px-2.5 py-0.5 font-semibold text-[11px] text-blue-800">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            İşlemde
          </span>
        );
      case "PendingCustomer":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 font-semibold text-[11px] text-amber-800">
            <Clock className="h-3 w-3 text-amber-600" />
            Müşteri Bekleniyor
          </span>
        );
      case "OnHold":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-purple-300 bg-purple-50 px-2.5 py-0.5 font-semibold text-[11px] text-purple-800">
            Beklemede
          </span>
        );
      case "Resolved":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-100/70 px-2.5 py-0.5 font-semibold text-[11px] text-emerald-900">
            <CheckCircle2 className="h-3 w-3 text-emerald-700" />
            Çözüldü
          </span>
        );
      case "Closed":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 font-medium text-[11px] text-zinc-700 dark:text-zinc-300">
            Kapatıldı
          </span>
        );
      default:
        return (
          <span className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-2 py-0.5 text-xs text-zinc-600 dark:text-zinc-400">
            {status}
          </span>
        );
    }
  };

  // Kanban Columns
  const kanbanColumns = useMemo(() => {
    return [
      { id: "New", title: "Yeni Talepler", color: "border-t-emerald-500", bg: "bg-emerald-50/30" },
      { id: "InProgress", title: "İşlemde & Temsilcide", color: "border-t-blue-500", bg: "bg-blue-50/30" },
      { id: "PendingCustomer", title: "Müşteri Bekleniyor", color: "border-t-amber-500", bg: "bg-amber-50/30" },
      { id: "Resolved", title: "Çözülen Talepler", color: "border-t-purple-500", bg: "bg-purple-50/30" },
    ];
  }, []);

  return (
    <div className="space-y-6">
      {/* 1. Header & Quick Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-md shadow-blue-500/20">
              <LifeBuoy className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-bold text-2xl text-zinc-900 dark:text-zinc-100 tracking-tight">
                Destek Masası & Talepler
              </h1>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm">
                Müşteri yardım biletleri, SLA süreleri ve çok kanallı iletişim yönetimi
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Switcher */}
          <div className="flex items-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800/80 p-1 shadow-2xs">
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium text-xs transition-all ${
                viewMode === "table"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:text-zinc-100"
              }`}
              type="button"
            >
              <List className="h-3.5 w-3.5" />
              <span>Tablo</span>
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium text-xs transition-all ${
                viewMode === "kanban"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:text-zinc-100"
              }`}
              type="button"
            >
              <KanbanIcon className="h-3.5 w-3.5" />
              <span>Kanban</span>
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData()}
            className="rounded-xl border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:bg-zinc-800/50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>

          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="gap-2 rounded-xl bg-blue-600 font-medium text-white shadow-sm hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            <span>Yeni Destek Talebi</span>
          </Button>
        </div>
      </div>

      {/* 2. Executive KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-4 shadow-xs transition hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-zinc-500 dark:text-zinc-400 text-xs">Toplam Açık Talep</span>
            <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
              <FolderOpen className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-bold text-2xl text-zinc-900 dark:text-zinc-100 tracking-tight">
              {stats?.totalOpenTickets ?? 0}
            </span>
            <span className="text-zinc-400 dark:text-zinc-500 text-xs">({stats?.newTickets ?? 0} yeni)</span>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-4 shadow-xs transition hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-zinc-500 dark:text-zinc-400 text-xs">Yanıt Bekleyenler</span>
            <div className="rounded-xl bg-amber-50 p-2 text-amber-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-bold text-2xl text-amber-700 tracking-tight">
              {stats?.pendingCustomerTickets ?? 0}
            </span>
            <span className="text-amber-600/80 text-xs">müşteri aksiyonu</span>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-4 shadow-xs transition hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-zinc-500 dark:text-zinc-400 text-xs">SLA Aşımı / Risk</span>
            <div className="rounded-xl bg-red-50 p-2 text-red-600">
              <Flame className="h-4 w-4 animate-pulse" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-bold text-2xl text-red-600 tracking-tight">
              {stats?.slaBreachedTickets ?? 0}
            </span>
            <span className="text-red-600/80 text-xs">({stats?.urgentTickets ?? 0} acil)</span>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-4 shadow-xs transition hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-zinc-500 dark:text-zinc-400 text-xs">SLA Başarı Oranı</span>
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-bold text-2xl text-emerald-600 tracking-tight">
              %{stats?.slaComplianceRate ?? 98.5}
            </span>
            <span className="text-emerald-700/80 text-xs">({stats?.resolvedTodayCount ?? 0} bugün)</span>
          </div>
        </div>
      </div>

      {/* 3. Queue Tabs & Filter Bar */}
      <div className="space-y-3">
        {/* Queues */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-zinc-200 dark:border-zinc-800 border-b pb-2 text-xs scrollbar-none">
          {[
            { id: "all", label: "Tüm Talepler", count: stats?.totalTickets },
            { id: "my", label: "Bana Atananlar" },
            { id: "pending", label: "Müşteri Yanıtı Bekleyenler", count: stats?.pendingCustomerTickets },
            { id: "slabreached", label: "SLA Aşımı & Riskli", count: stats?.slaBreachedTickets, badgeColor: "bg-red-100 text-red-700" },
            { id: "resolved", label: "Çözülen & Kapatılanlar" },
          ].map((q) => (
            <button
              key={q.id}
              onClick={() => setActiveQueue(q.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-1.5 font-medium transition-all ${
                activeQueue === q.id
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:bg-slate-200/70 hover:text-zinc-900 dark:text-zinc-100"
              }`}
              type="button"
            >
              <span>{q.label}</span>
              {q.count !== undefined && q.count > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.2 font-bold text-[10px] ${
                    activeQueue === q.id
                      ? "bg-white dark:bg-zinc-900/20 text-white"
                      : q.badgeColor || "bg-slate-200 text-zinc-700 dark:text-zinc-300"
                  }`}
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
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Bilet no (#TICK-1001), müşteri adı veya konu ara..."
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-2 pr-3 pl-9 text-xs shadow-2xs focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="h-9 w-[130px] rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs">
                <SelectValue placeholder="Durum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Durumlar</SelectItem>
                <SelectItem value="New">Yeni</SelectItem>
                <SelectItem value="InProgress">İşlemde</SelectItem>
                <SelectItem value="PendingCustomer">Müşteri Bekliyor</SelectItem>
                <SelectItem value="Resolved">Çözüldü</SelectItem>
                <SelectItem value="Closed">Kapatıldı</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedPriority} onValueChange={setSelectedPriority}>
              <SelectTrigger className="h-9 w-[120px] rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs">
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

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="h-9 w-[130px] rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs">
                <SelectValue placeholder="Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Kategoriler</SelectItem>
                <SelectItem value="Teknik Destek">Teknik Destek</SelectItem>
                <SelectItem value="Satış / Teklif">Satış / Teklif</SelectItem>
                <SelectItem value="Fatura & Muhasebe">Fatura & Muhasebe</SelectItem>
                <SelectItem value="Kargo & Teslimat">Kargo & Teslimat</SelectItem>
                <SelectItem value="İade & Değişim">İade & Değişim</SelectItem>
                <SelectItem value="Genel">Genel</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 4. Main View (Table vs. Kanban) */}
      {isLoading ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-8">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <span className="font-medium text-zinc-500 dark:text-zinc-400 text-sm">Destek biletleri yükleniyor...</span>
        </div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-12 text-center">
          <div className="rounded-2xl bg-blue-50 p-4 text-blue-600">
            <LifeBuoy className="h-8 w-8" />
          </div>
          <h3 className="mt-4 font-semibold text-base text-zinc-900 dark:text-zinc-100">Destek Talebi Bulunamadı</h3>
          <p className="mt-1 max-w-sm text-zinc-500 dark:text-zinc-400 text-xs">
            Seçili filtrelere uygun destek talebi bulunmuyor. Yeni bir bilet oluşturabilir veya filtreleri temizleyebilirsiniz.
          </p>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="mt-4 gap-2 rounded-xl bg-blue-600 text-xs text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Yeni Destek Talebi Aç</span>
          </Button>
        </div>
      ) : viewMode === "table" ? (
        /* TABLE VIEW */
        <div className="overflow-hidden rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-zinc-200/80 dark:border-zinc-800/90 border-b bg-zinc-50 dark:bg-zinc-800/50/75 font-semibold text-zinc-600 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3.5">Talep No & Konu</th>
                  <th className="px-4 py-3.5">Müşteri</th>
                  <th className="px-4 py-3.5">Durum</th>
                  <th className="px-4 py-3.5">Öncelik</th>
                  <th className="px-4 py-3.5">Atanan</th>
                  <th className="px-4 py-3.5">SLA Durumu</th>
                  <th className="px-4 py-3.5">Mesajlar</th>
                  <th className="px-4 py-3.5 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {tickets.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => router.push(`/${tenantSlug}/tickets/${t.id}`)}
                    className="group cursor-pointer transition-colors hover:bg-zinc-50/80 dark:bg-zinc-800/50"
                  >
                    <td className="px-4 py-3.5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-blue-600 text-xs group-hover:underline">
                            #{t.ticketNumber}
                          </span>
                          <span className="rounded-md bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 font-medium text-[10px] text-zinc-600 dark:text-zinc-400">
                            {t.category}
                          </span>
                          {t.linkedEntityTitle && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700">
                              <Package className="h-2.5 w-2.5" />
                              {t.linkedEntityTitle}
                            </span>
                          )}
                        </div>
                        <p className="font-semibold text-zinc-800 dark:text-zinc-200 text-xs line-clamp-1">
                          {t.subject}
                        </p>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-medium text-zinc-800 dark:text-zinc-200">{t.customerName}</div>
                      {t.customerEmail && (
                        <div className="text-[11px] text-zinc-400 dark:text-zinc-500">{t.customerEmail}</div>
                      )}
                    </td>

                    <td className="px-4 py-3.5">{getStatusBadge(t.status)}</td>

                    <td className="px-4 py-3.5">{getPriorityBadge(t.priority)}</td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 font-bold text-[10px] text-zinc-600 dark:text-zinc-400">
                          {t.assignedUserName ? t.assignedUserName.charAt(0).toUpperCase() : "?"}
                        </div>
                        <span className="font-medium text-zinc-700 dark:text-zinc-300 text-xs">
                          {t.assignedUserName || "Atanmamış"}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      {t.isSlaBreached ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 font-bold text-[11px] text-red-600">
                          <Flame className="h-3 w-3 animate-pulse" />
                          SLA Aşıldı
                        </span>
                      ) : t.slaResolutionDueAt ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                          <Timer className="h-3 w-3 text-zinc-400 dark:text-zinc-500" />
                          {new Date(t.slaResolutionDueAt).toLocaleTimeString("tr-TR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      ) : (
                        <span className="text-zinc-400 dark:text-zinc-500 text-xs">-</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>{t.messageCount}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <Link
                        href={`/${tenantSlug}/tickets/${t.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-800 px-2.5 py-1 text-zinc-600 dark:text-zinc-400 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
                      >
                        <span>Detay</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* KANBAN BOARD VIEW */
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {kanbanColumns.map((col) => {
            const colTickets = tickets.filter((t) => {
              if (col.id === "New") return t.status === "New";
              if (col.id === "InProgress") return t.status === "InProgress";
              if (col.id === "PendingCustomer") return t.status === "PendingCustomer" || t.status === "OnHold";
              if (col.id === "Resolved") return t.status === "Resolved" || t.status === "Closed";
              return false;
            });

            return (
              <div
                key={col.id}
                className={`flex flex-col rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 ${col.bg} p-3.5 shadow-2xs min-h-[500px]`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between border-zinc-200/80 dark:border-zinc-800/90 border-b pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-800 dark:text-zinc-200 text-xs tracking-tight">
                      {col.title}
                    </span>
                    <span className="rounded-full bg-white dark:bg-zinc-900 px-2 py-0.5 font-bold text-[10px] text-zinc-600 dark:text-zinc-400 shadow-2xs">
                      {colTickets.length}
                    </span>
                  </div>
                </div>

                {/* Column Cards */}
                <div className="mt-3 flex-1 space-y-3 overflow-y-auto">
                  {colTickets.length === 0 ? (
                    <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-zinc-200/80 dark:border-zinc-800/90 p-4 text-center text-zinc-400 dark:text-zinc-500 text-xs">
                      Bu aşamada talep yok
                    </div>
                  ) : (
                    colTickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        onClick={() => router.push(`/${tenantSlug}/tickets/${ticket.id}`)}
                        className="group cursor-pointer rounded-xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-3.5 shadow-2xs transition-all hover:border-blue-300 hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-blue-600 text-xs">
                            #{ticket.ticketNumber}
                          </span>
                          {getPriorityBadge(ticket.priority)}
                        </div>

                        <h4 className="mt-1.5 font-semibold text-zinc-900 dark:text-zinc-100 text-xs line-clamp-2 group-hover:text-blue-600">
                          {ticket.subject}
                        </h4>

                        <div className="mt-2.5 flex items-center justify-between border-zinc-100 dark:border-zinc-800 border-t pt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                          <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate max-w-[120px]">
                            {ticket.customerName}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-0.5 text-zinc-400 dark:text-zinc-500">
                              <MessageSquare className="h-3 w-3" />
                              {ticket.messageCount}
                            </span>
                            {ticket.isSlaBreached && (
                              <Flame className="h-3.5 w-3.5 text-red-500 animate-pulse" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-zinc-100 dark:border-zinc-800 border-b pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">Yeni Destek Talebi Aç</h3>
                  <p className="text-zinc-500 dark:text-zinc-400 text-xs">Müşteri adına yeni bir yardım bileti oluşturun</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-full p-1 text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:bg-zinc-800 hover:text-zinc-700 dark:text-zinc-300"
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="mt-4 space-y-4 text-xs">
              {/* Customer Selector */}
              <div>
                <label className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300">
                  Müşteri <span className="text-red-500">*</span>
                </label>
                <Select
                  value={newTicket.customerId || ""}
                  onValueChange={(val) => setNewTicket((prev) => ({ ...prev, customerId: val }))}
                >
                  <SelectTrigger className="rounded-xl border-zinc-200 dark:border-zinc-800 text-xs">
                    <SelectValue placeholder="Müşteri seçin..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} {c.industry ? `(${c.industry})` : ""} - {c.email || c.phone || ""}
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
                  required
                  value={newTicket.subject || ""}
                  onChange={(e) => setNewTicket((prev) => ({ ...prev, subject: e.target.value }))}
                  placeholder="Örn: Sipariş teslimatı gecikmesi hakkında"
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2.5 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Category & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300">Kategori</label>
                  <Select
                    value={newTicket.category || "Teknik Destek"}
                    onValueChange={(val) => setNewTicket((prev) => ({ ...prev, category: val }))}
                  >
                    <SelectTrigger className="rounded-xl border-zinc-200 dark:border-zinc-800 text-xs">
                      <SelectValue placeholder="Kategori seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Teknik Destek">Teknik Destek</SelectItem>
                      <SelectItem value="Satış / Teklif">Satış / Teklif</SelectItem>
                      <SelectItem value="Fatura & Muhasebe">Fatura & Muhasebe</SelectItem>
                      <SelectItem value="Kargo & Teslimat">Kargo & Teslimat</SelectItem>
                      <SelectItem value="İade & Değişim">İade & Değişim</SelectItem>
                      <SelectItem value="Genel">Genel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300">Öncelik Seviyesi</label>
                  <Select
                    value={newTicket.priority || "Medium"}
                    onValueChange={(val) => setNewTicket((prev) => ({ ...prev, priority: val }))}
                  >
                    <SelectTrigger className="rounded-xl border-zinc-200 dark:border-zinc-800 text-xs">
                      <SelectValue placeholder="Öncelik" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Düşük (48s SLA)</SelectItem>
                      <SelectItem value="Medium">Orta (24s SLA)</SelectItem>
                      <SelectItem value="High">Yüksek (8s SLA)</SelectItem>
                      <SelectItem value="Urgent">Acil / Kritik (4s SLA)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Assigned Agent & Department */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300">Atanan Temsilci</label>
                  <Select
                    value={newTicket.assignedUserId || "unassigned"}
                    onValueChange={(val) =>
                      setNewTicket((prev) => ({
                        ...prev,
                        assignedUserId: val === "unassigned" ? undefined : val,
                      }))
                    }
                  >
                    <SelectTrigger className="rounded-xl border-zinc-200 dark:border-zinc-800 text-xs">
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
                  <label className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300">Departman</label>
                  <Select
                    value={newTicket.departmentId || "none"}
                    onValueChange={(val) =>
                      setNewTicket((prev) => ({
                        ...prev,
                        departmentId: val === "none" ? undefined : val,
                      }))
                    }
                  >
                    <SelectTrigger className="rounded-xl border-zinc-200 dark:border-zinc-800 text-xs">
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
                  <label className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300">İlişkili Sipariş (Opsiyonel)</label>
                  <Select
                    value={newTicket.linkedEntityId || "none"}
                    onValueChange={(val) => {
                      if (val === "none") {
                        setNewTicket((prev) => ({
                          ...prev,
                          linkedEntityId: undefined,
                          linkedEntityType: undefined,
                          linkedEntityTitle: undefined,
                        }));
                      } else {
                        const ord = orders.find((o) => o.id === val);
                        setNewTicket((prev) => ({
                          ...prev,
                          linkedEntityId: val,
                          linkedEntityType: "Order",
                          linkedEntityTitle: `Sipariş #${ord?.orderNumber || val.substring(0, 6)}`,
                        }));
                      }
                    }}
                  >
                    <SelectTrigger className="rounded-xl border-zinc-200 dark:border-zinc-800 text-xs">
                      <SelectValue placeholder="Sipariş bağla..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-48">
                      <SelectItem value="none">Yok</SelectItem>
                      {orders.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          #{o.orderNumber} - {o.customerName} ({o.totalAmount} {o.currency})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300">İletişim Kanalı</label>
                  <Select
                    value={newTicket.source || "Web"}
                    onValueChange={(val) => setNewTicket((prev) => ({ ...prev, source: val }))}
                  >
                    <SelectTrigger className="rounded-xl border-zinc-200 dark:border-zinc-800 text-xs">
                      <SelectValue placeholder="Kanal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Web">Web Portalı</SelectItem>
                      <SelectItem value="LiveChat">Canlı Destek</SelectItem>
                      <SelectItem value="Email">E-Posta</SelectItem>
                      <SelectItem value="Phone">Telefon Çağrısı</SelectItem>
                      <SelectItem value="Internal">Dahili / Ofis İçi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300">Açıklama / İlk Mesaj</label>
                <textarea
                  rows={3}
                  value={newTicket.description || ""}
                  onChange={(e) => setNewTicket((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Müşterinin sorunu veya talebinin detayları..."
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 p-2.5 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 border-zinc-100 dark:border-zinc-800 border-t pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-xl border-zinc-200 dark:border-zinc-800 text-xs"
                >
                  İptal
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="gap-2 rounded-xl bg-blue-600 font-medium text-white text-xs shadow-sm hover:bg-blue-700"
                >
                  {isSubmitting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>Talebi Oluştur</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
