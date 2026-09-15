"use client";

import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { NumberInput } from "@workspace/ui/components/number-input";
import { PageContainer } from "@workspace/ui/components/page-container";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Coins,
  Download,
  Kanban,
  Plus,
  RotateCcw,
  Search,
  ShoppingCart,
  Sparkles,
  Table as TableIcon,
  Tag,
  Ticket,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { BulkActionBar, BulkDeleteIcon } from "@/components/bulk-action-bar";
import { PermissionGate } from "@/components/permission-gate";
import {
  ApiClient,
  type CreateOrderItemRequest,
  type CreateOrderRequest,
  type CustomerListDto,
  type OrderListDto,
  type OrderStatsDto,
  type ProductListDto,
} from "@/lib/api-client";
import { useUrlFilters } from "@/lib/hooks/use-url-filters";
import { usePermissions } from "@/lib/permissions/permission-context";

export default function OrdersPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tenantSlug = (params?.tenantSlug as string) || "";
  const { activeTenant } = usePermissions();
  const { getParam, getIntParam, setParams } = useUrlFilters();

  const [orders, setOrders] = useState<OrderListDto[]>([]);
  const [stats, setStats] = useState<OrderStatsDto | null>(null);
  const [customers, setCustomers] = useState<CustomerListDto[]>([]);
  const [products, setProducts] = useState<ProductListDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(25);

  // Filters — initialized from URL
  const [search, setSearch] = useState(() => getParam("search", ""));
  const [statusFilter, setStatusFilter] = useState(() =>
    getParam("status", "")
  );
  const [paymentStatusFilter, setPaymentStatusFilter] = useState(() =>
    getParam("paymentStatus", "")
  );
  const [page, setPage] = useState(() => getIntParam("page", 1));
  const [viewMode, setViewMode] = useState<"table" | "kanban">(() =>
    getParam("view", "table") === "kanban" ? "kanban" : "table"
  );

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Modals & Actions
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deletingOrder, setDeletingOrder] = useState<OrderListDto | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("create") === "true") {
      setIsCreateModalOpen(true);
    }
  }, [searchParams]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = useCallback(async () => {
    if (!activeTenant) {
      return;
    }
    setLoading(true);
    try {
      const [ordersRes, statsRes, custRes, prodRes] = await Promise.all([
        ApiClient.getOrders(
          {
            page,
            pageSize,
            paymentStatus: paymentStatusFilter || undefined,
            search: search.trim() || undefined,
            status: statusFilter || undefined,
          },
          activeTenant.id
        ),
        ApiClient.getOrderStats(activeTenant.id),
        ApiClient.getCustomers(activeTenant.id, { pageSize: 100 }),
        ApiClient.getProducts({ pageSize: 100 }, activeTenant.id),
      ]);

      if (ordersRes.success && ordersRes.data) {
        setOrders(ordersRes.data.items);
        setTotalCount(ordersRes.data.totalCount);
      }
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
      if (custRes.success && custRes.data) {
        setCustomers(custRes.data.items);
      }
      if (prodRes.success && prodRes.data) {
        setProducts(prodRes.data.items);
      }
    } catch {
      showToast("Sipariş verileri yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, [activeTenant, page, pageSize, search, statusFilter, paymentStatusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async () => {
    if (!(activeTenant && deletingOrder)) {
      return;
    }
    try {
      const res = await ApiClient.deleteOrder(
        deletingOrder.id,
        activeTenant.id
      );
      if (res.success) {
        showToast(`'${deletingOrder.orderNumber}' numaralı sipariş silindi.`);
        setDeletingOrder(null);
        loadData();
      } else {
        showToast(res.message || "Silme başarısız.");
      }
    } catch {
      showToast("Silme sırasında hata oluştu.");
    }
  };

  // ── Bulk operations ────────────────────────────────────────────────────────
  const allPageIds = orders.map((o) => o.id);
  const allSelected =
    allPageIds.length > 0 && allPageIds.every((id) => selectedIds.has(id));
  const someSelected =
    allPageIds.some((id) => selectedIds.has(id)) && !allSelected;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allPageIds));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (!(activeTenant && selectedIds.size > 0)) {
      return;
    }
    setIsBulkDeleting(true);
    try {
      const { deletedCount, failedCount } = await ApiClient.bulkDeleteOrders(
        Array.from(selectedIds),
        activeTenant.id
      );
      setSelectedIds(new Set());
      loadData();
      if (failedCount > 0) {
        showToast(
          `${deletedCount} sipariş silindi, ${failedCount} silinemedi.`
        );
      } else {
        showToast(`${deletedCount} sipariş başarıyla silindi.`);
      }
    } catch {
      showToast("Toplu silme sırasında hata oluştu.");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // ── URL-synced filter setters ───────────────────────────────────────────────
  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
    setParams({ page: undefined, search: val || undefined });
  };
  const handleStatusFilter = (val: string) => {
    const v = val === "all" ? "" : val;
    setStatusFilter(v);
    setPage(1);
    setParams({ page: undefined, status: v || undefined });
  };
  const handlePaymentStatusFilter = (val: string) => {
    const v = val === "all" ? "" : val;
    setPaymentStatusFilter(v);
    setPage(1);
    setParams({ page: undefined, paymentStatus: v || undefined });
  };
  const handleResetFilters = () => {
    setSearch("");
    setStatusFilter("");
    setPaymentStatusFilter("");
    setPage(1);
    setParams({
      page: undefined,
      paymentStatus: undefined,
      search: undefined,
      status: undefined,
    });
  };
  const handleViewMode = (mode: "table" | "kanban") => {
    setViewMode(mode);
    setParams({ view: mode === "kanban" ? "kanban" : undefined });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Draft":
        return "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800";
      case "PendingApproval":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800";
      case "Confirmed":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800";
      case "Processing":
        return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800";
      case "Shipped":
        return "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800";
      case "Delivered":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800";
      case "Cancelled":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800";
      case "Refunded":
        return "bg-orange-50 text-orange-700 border-orange-200";
      default:
        return "bg-zinc-50 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "Draft":
        return "Taslak";
      case "PendingApproval":
        return "Onay Bekliyor";
      case "Confirmed":
        return "Onaylandı";
      case "Processing":
        return "Hazırlanıyor";
      case "Shipped":
        return "Kargoda / Yolda";
      case "Delivered":
        return "Teslim Edildi";
      case "Cancelled":
        return "İptal Edildi";
      case "Refunded":
        return "İade Edildi";
      default:
        return status;
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case "Paid":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800";
      case "PartiallyPaid":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800";
      case "Unpaid":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800";
      case "Refunded":
        return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800";
      default:
        return "bg-zinc-50 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800";
    }
  };

  const getPaymentLabel = (status: string) => {
    switch (status) {
      case "Paid":
        return "Ödendi";
      case "PartiallyPaid":
        return "Kısmi Ödendi";
      case "Unpaid":
        return "Ödenmedi";
      case "Refunded":
        return "İade Edildi";
      default:
        return status;
    }
  };

  const kanbanColumns = [
    {
      color: "border-zinc-300 dark:border-zinc-700",
      id: "Draft",
      label: "Taslaklar",
    },
    {
      color: "border-amber-300",
      id: "PendingApproval",
      label: "Onay Bekleyenler",
    },
    { color: "border-blue-400", id: "Confirmed", label: "Onaylananlar" },
    { color: "border-purple-400", id: "Processing", label: "Hazırlananlar" },
    { color: "border-cyan-400", id: "Shipped", label: "Kargodakiler" },
    { color: "border-emerald-400", id: "Delivered", label: "Tamamlananlar" },
  ];

  return (
    <PageContainer className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="slide-in-from-top-4 fixed top-6 right-6 z-50 flex animate-in items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-white text-xs shadow-2xl">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* 1. Header Section */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-2xl text-zinc-900 tracking-tight sm:text-3xl dark:text-zinc-100">
              Sipariş & Satış Yönetimi
            </h1>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 font-bold text-[11px] text-blue-700">
              {totalCount} Sipariş
            </span>
          </div>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Müşterilerinizin siparişlerini oluşturun, onaylayın, teslimat ve
            parçalı tahsilatlarını takip edin.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 font-semibold text-xs text-zinc-700 shadow-2xs hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
            onClick={() =>
              showToast("Siparişler Excel / CSV olarak dışa aktarılıyor...")
            }
            type="button"
          >
            <Download className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
            <span>Dışa Aktar</span>
          </button>

          <PermissionGate permission="Orders.Create">
            <button
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white text-xs shadow-xs transition-all hover:bg-blue-700 active:scale-[0.98]"
              onClick={() => setIsCreateModalOpen(true)}
              type="button"
            >
              <Plus className="h-4 w-4" />
              <span>Yeni Sipariş Oluştur</span>
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Orders & Total Revenue */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-zinc-800/90 dark:bg-zinc-900">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-medium text-xs text-zinc-500 dark:text-zinc-400">
                Toplam Satış Cirosu
              </span>
              <div className="mt-1 font-extrabold text-2xl text-zinc-900 tracking-tight sm:text-3xl dark:text-zinc-100">
                ₺
                {(stats?.totalRevenue ?? 0).toLocaleString("tr-TR", {
                  minimumFractionDigits: 2,
                })}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Coins className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 border-zinc-100 border-t pt-2 text-[11px] text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <span>{stats?.totalOrders ?? 0} Toplam Sipariş Kaydı</span>
          </div>
        </div>

        {/* Collected / Paid Revenue */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-zinc-800/90 dark:bg-zinc-900">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-medium text-xs text-zinc-500 dark:text-zinc-400">
                Tahsil Edilen Tutar
              </span>
              <div className="mt-1 font-extrabold text-2xl text-emerald-600 tracking-tight sm:text-3xl">
                ₺
                {(stats?.paidRevenue ?? 0).toLocaleString("tr-TR", {
                  minimumFractionDigits: 2,
                })}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 border-zinc-100 border-t pt-2 text-[11px] text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <span>
              Tahsilat Oranı: %
              {stats && stats.totalRevenue > 0
                ? Math.round((stats.paidRevenue / stats.totalRevenue) * 100)
                : 0}
            </span>
          </div>
        </div>

        {/* Pending Approval / Preparation */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-zinc-800/90 dark:bg-zinc-900">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-medium text-xs text-zinc-500 dark:text-zinc-400">
                Bekleyen & Hazırlanan
              </span>
              <div className="mt-1 font-extrabold text-2xl text-amber-600 tracking-tight sm:text-3xl">
                {(stats?.pendingOrders ?? 0) + (stats?.processingOrders ?? 0)}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 border-zinc-100 border-t pt-2 text-[11px] text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <span>
              {stats?.confirmedOrders ?? 0} Onaylandı •{" "}
              {stats?.shippedOrders ?? 0} Yolda
            </span>
          </div>
        </div>

        {/* Unpaid Balance */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-zinc-800/90 dark:bg-zinc-900">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-medium text-xs text-zinc-500 dark:text-zinc-400">
                Bekleyen Tahsilat (Açık Bakiye)
              </span>
              <div className="mt-1 font-extrabold text-2xl text-rose-600 tracking-tight sm:text-3xl">
                ₺
                {(stats?.unpaidRevenue ?? 0).toLocaleString("tr-TR", {
                  minimumFractionDigits: 2,
                })}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
              <AlertCircle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 border-zinc-100 border-t pt-2 text-[11px] text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <span>Ödenmesi gereken açık alacaklar</span>
          </div>
        </div>
      </div>

      {/* 3. Filters & View Switcher Bar */}
      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs md:flex-row md:items-center dark:border-zinc-800/90 dark:bg-zinc-900">
        {/* Search */}
        <div className="max-w-md flex-1">
          <Input
            leftIcon={<Search />}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Sipariş no, Müşteri adı, Fatura no veya Takip no ara..."
            value={search}
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="w-40">
            <Select
              onValueChange={handleStatusFilter}
              value={statusFilter || "all"}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Tüm Durumlar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Durumlar</SelectItem>
                <SelectItem value="Draft">Taslak</SelectItem>
                <SelectItem value="PendingApproval">Onay Bekliyor</SelectItem>
                <SelectItem value="Confirmed">Onaylandı</SelectItem>
                <SelectItem value="Processing">Hazırlanıyor</SelectItem>
                <SelectItem value="Shipped">Kargoda / Yolda</SelectItem>
                <SelectItem value="Delivered">Teslim Edildi</SelectItem>
                <SelectItem value="Cancelled">İptal Edildi</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payment Status Filter */}
          <div className="w-36">
            <Select
              onValueChange={handlePaymentStatusFilter}
              value={paymentStatusFilter || "all"}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Tüm Ödemeler" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Ödemeler</SelectItem>
                <SelectItem value="Unpaid">Ödenmedi</SelectItem>
                <SelectItem value="PartiallyPaid">Kısmi Ödendi</SelectItem>
                <SelectItem value="Paid">Tamamı Ödendi</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reset Filters */}
          {(search || statusFilter || paymentStatusFilter) && (
            <button
              className="flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 font-semibold text-rose-700 text-xs hover:bg-rose-100"
              onClick={handleResetFilters}
              type="button"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Sıfırla</span>
            </button>
          )}

          {/* View Switcher */}
          <div className="flex items-center rounded-xl bg-zinc-100 p-0.5 dark:bg-zinc-800">
            <button
              className={`rounded-lg p-1.5 transition-all ${
                viewMode === "table"
                  ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
              }`}
              onClick={() => handleViewMode("table")}
              title="Tablo Görünümü"
              type="button"
            >
              <TableIcon className="h-4 w-4" />
            </button>
            <button
              className={`rounded-lg p-1.5 transition-all ${
                viewMode === "kanban"
                  ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
              }`}
              onClick={() => handleViewMode("kanban")}
              title="Kanban Pipeline Görünümü"
              type="button"
            >
              <Kanban className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Orders View (Table or Kanban) */}
      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-3xl border border-zinc-200/80 bg-white shadow-xs dark:border-zinc-800/90 dark:bg-zinc-900">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <span className="font-medium text-xs text-zinc-500 dark:text-zinc-400">
              Siparişler yükleniyor...
            </span>
          </div>
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-zinc-200/80 border-dashed bg-white p-12 text-center shadow-xs dark:border-zinc-800/90 dark:bg-zinc-900">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
            <ShoppingCart className="h-6 w-6" />
          </div>
          <h3 className="mt-3 font-bold text-sm text-zinc-900 dark:text-zinc-100">
            Sipariş Bulunamadı
          </h3>
          <p className="mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
            Arama kriterlerinize uygun sipariş bulunamadı veya henüz bir sipariş
            oluşturulmadı.
          </p>
          <PermissionGate permission="Orders.Create">
            <button
              className="mt-4 flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white text-xs shadow-xs transition-all hover:bg-blue-700 active:scale-[0.98]"
              onClick={() => setIsCreateModalOpen(true)}
              type="button"
            >
              <Plus className="h-4 w-4" />
              <span>İlk Siparişi Oluştur</span>
            </button>
          </PermissionGate>
        </div>
      ) : viewMode === "table" ? (
        /* Table View */
        <div className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-xs dark:border-zinc-800/90 dark:bg-zinc-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-zinc-100 border-b bg-zinc-50/50 font-medium text-[11px] text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/30 dark:text-zinc-400">
                <tr>
                  <th className="w-10 py-3.5 pr-2 pl-4">
                    <Checkbox
                      aria-label="Tümünü seç"
                      checked={allSelected}
                      data-indeterminate={someSelected}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  <th className="py-3.5 pr-4 pl-2">Sipariş No &amp; Tarih</th>
                  <th className="px-4 py-3.5">Müşteri</th>
                  <th className="px-4 py-3.5">Durum</th>
                  <th className="px-4 py-3.5">Ödeme Durumu</th>
                  <th className="px-4 py-3.5 text-center">Kalem</th>
                  <th className="px-4 py-3.5 text-right">Toplam Tutar</th>
                  <th className="px-4 py-3.5 text-right">Tahsil Edilen</th>
                  <th className="py-3.5 pr-6 pl-4 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {orders.map((o) => (
                  <tr
                    className={`group transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50 ${
                      selectedIds.has(o.id)
                        ? "bg-blue-50/60 dark:bg-blue-950/20"
                        : ""
                    }`}
                    key={o.id}
                  >
                    <td className="w-10 py-4 pr-2 pl-4">
                      <Checkbox
                        aria-label={`${o.orderNumber} seç`}
                        checked={selectedIds.has(o.id)}
                        onCheckedChange={() => toggleSelectOne(o.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="py-4 pr-4 pl-2">
                      <Link
                        className="block font-bold text-zinc-900 transition-colors group-hover:text-blue-600 dark:text-zinc-100"
                        href={`/${tenantSlug}/orders/${o.id}`}
                      >
                        {o.orderNumber}
                      </Link>
                      <div className="text-[10px] text-zinc-400 dark:text-zinc-500">
                        {new Date(o.orderDate).toLocaleDateString("tr-TR")}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                        {o.customerName}
                      </div>
                      {o.invoiceNumber && (
                        <div className="text-[10px] text-zinc-400 dark:text-zinc-500">
                          Fat: {o.invoiceNumber}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 font-bold text-[10px] ${getStatusBadge(
                          o.status
                        )}`}
                      >
                        {getStatusLabel(o.status)}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center rounded-lg border px-2 py-0.5 font-bold text-[10px] ${getPaymentBadge(
                          o.paymentStatus
                        )}`}
                      >
                        {getPaymentLabel(o.paymentStatus)}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-center font-bold text-zinc-700 dark:text-zinc-300">
                      {o.itemsCount} Kalem
                    </td>

                    <td className="px-4 py-4 text-right">
                      <div className="font-extrabold text-xs text-zinc-900 dark:text-zinc-100">
                        ₺
                        {o.totalAmount.toLocaleString("tr-TR", {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                      <div className="font-medium text-[10px] text-zinc-400 dark:text-zinc-500">
                        KDV Dahil
                      </div>
                    </td>

                    <td className="px-4 py-4 text-right">
                      <div className="font-bold text-emerald-600 text-xs">
                        ₺
                        {o.paidAmount.toLocaleString("tr-TR", {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                      {o.remainingAmount > 0 && (
                        <div className="font-medium text-[10px] text-rose-500">
                          Kalan: ₺
                          {o.remainingAmount.toLocaleString("tr-TR", {
                            minimumFractionDigits: 2,
                          })}
                        </div>
                      )}
                    </td>

                    <td className="py-4 pr-6 pl-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                          href={`/${tenantSlug}/orders/${o.id}`}
                          title="Sipariş Detayı"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                        <PermissionGate permission="Orders.Delete">
                          <button
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 text-zinc-400 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-zinc-800 dark:text-zinc-500"
                            onClick={() => setDeletingOrder(o)}
                            title="Siparişi Sil"
                            type="button"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </PermissionGate>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Kanban Pipeline View */
        <div className="flex gap-4 overflow-x-auto pb-4">
          {kanbanColumns.map((col) => {
            const colOrders = orders.filter((o) => o.status === col.id);
            const colTotal = colOrders.reduce(
              (sum, o) => sum + o.totalAmount,
              0
            );

            return (
              <div
                className="flex w-72 shrink-0 flex-col rounded-3xl border border-zinc-200/80 bg-zinc-50/70 p-3 shadow-2xs dark:border-zinc-800/90 dark:bg-zinc-800/40"
                key={col.id}
              >
                {/* Column Header */}
                <div className="mb-3 flex items-center justify-between border-zinc-200 border-b px-1 pb-3 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                      {col.label}
                    </span>
                    <span className="rounded-full bg-zinc-200 px-2 py-0.5 font-bold text-[10px] text-zinc-800 shadow-2xs dark:bg-zinc-700 dark:text-zinc-100">
                      {colOrders.length}
                    </span>
                  </div>
                  <span className="font-bold text-[11px] text-zinc-600 dark:text-zinc-400">
                    ₺
                    {colTotal.toLocaleString("tr-TR", {
                      minimumFractionDigits: 0,
                    })}
                  </span>
                </div>

                {/* Column Orders */}
                <div className="max-h-[600px] flex-1 space-y-2.5 overflow-y-auto">
                  {colOrders.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-200 border-dashed p-6 text-center text-[11px] text-zinc-400 dark:border-zinc-800/60 dark:text-zinc-500">
                      Bu aşamada sipariş yok
                    </div>
                  ) : (
                    colOrders.map((o) => (
                      <Link
                        className="group block flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-2xs transition-all hover:border-zinc-300 hover:shadow-xs dark:border-zinc-700 dark:border-zinc-800 dark:bg-zinc-900"
                        href={`/${tenantSlug}/orders/${o.id}`}
                        key={o.id}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-1">
                            <span className="font-bold text-xs text-zinc-900 transition-colors group-hover:text-blue-600 dark:text-zinc-100">
                              {o.orderNumber}
                            </span>
                            <span
                              className={`rounded-md border px-1.5 py-0.2 font-bold text-[9px] ${getPaymentBadge(
                                o.paymentStatus
                              )}`}
                            >
                              {getPaymentLabel(o.paymentStatus)}
                            </span>
                          </div>

                          <div className="mt-1 truncate font-semibold text-xs text-zinc-700 dark:text-zinc-300">
                            {o.customerName}
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between border-zinc-100 border-t pt-2 text-[11px] dark:border-zinc-800">
                          <span className="font-medium text-zinc-400 dark:text-zinc-500">
                            {new Date(o.orderDate).toLocaleDateString("tr-TR")}
                          </span>
                          <span className="font-extrabold text-xs text-zinc-900 dark:text-zinc-100">
                            ₺
                            {o.totalAmount.toLocaleString("tr-TR", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Order Wizard Modal */}
      {isCreateModalOpen && (
        <CreateOrderWizardModal
          customers={customers}
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            showToast("Sipariş başarıyla oluşturuldu.");
            setIsCreateModalOpen(false);
            loadData();
          }}
          products={products}
          tenantId={activeTenant?.id || ""}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingOrder && (
        <Dialog
          onOpenChange={(open) => {
            if (!open) {
              setDeletingOrder(null);
            }
          }}
          open
        >
          <DialogContent
            aria-describedby={undefined}
            className="max-h-[90vh] w-full overflow-y-auto gap-0 p-6 sm:max-w-md"
            showCloseButton={false}
          >
            <DialogTitle className="font-bold text-base text-zinc-900 dark:text-zinc-100">
              Siparişi Sil
            </DialogTitle>
            <p className="mt-2 text-xs text-zinc-600 leading-relaxed dark:text-zinc-400">
              <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
                {deletingOrder.orderNumber}
              </strong>{" "}
              numaralı siparişi ve buna bağlı tüm kalemleri/tahsilat kayıtlarını
              silmek istediğinize emin misiniz?
            </p>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                className="rounded-xl border border-zinc-200 px-4 py-2 font-semibold text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
                onClick={() => setDeletingOrder(null)}
                type="button"
              >
                Vazgeç
              </button>
              <button
                className="rounded-xl bg-rose-600 px-4 py-2 font-semibold text-white text-xs shadow-xs hover:bg-rose-700"
                onClick={handleDelete}
                type="button"
              >
                Evet, Siparişi Sil
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Bulk Action Bar */}
      <BulkActionBar
        actions={[
          {
            disabled: isBulkDeleting,
            icon: <BulkDeleteIcon />,
            label: isBulkDeleting ? "Siliniyor..." : "Seçilenleri Sil",
            onClick: handleBulkDelete,
            variant: "danger",
          },
        ]}
        onClear={() => setSelectedIds(new Set())}
        selectedCount={selectedIds.size}
      />
    </PageContainer>
  );
}

function CreateOrderWizardModal({
  isOpen,
  onClose,
  onSuccess,
  tenantId,
  customers,
  products,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tenantId: string;
  customers: CustomerListDto[];
  products: ProductListDto[];
}) {
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [status, setStatus] = useState("Confirmed");
  const [paymentMethod, setPaymentMethod] = useState("BankTransfer");
  const [shippingAddress, setShippingAddress] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [shippingFee, setShippingFee] = useState(0);
  const [generalDiscount, setGeneralDiscount] = useState(0);
  const [notes, setNotes] = useState("");

  // Promotion and Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [appliedPromotions, setAppliedPromotions] = useState<
    { name: string; discount: number; desc: string }[]
  >([]);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoMessage, setPromoMessage] = useState<{
    text: string;
    isSuccess: boolean;
  } | null>(null);

  // Items cart
  const [items, setItems] = useState<CreateOrderItemRequest[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected product picker state
  const [pickerProdId, setPickerProdId] = useState("");
  const [pickerQty, setPickerQty] = useState(1);

  const handleApplyPromotion = async () => {
    if (!tenantId || items.length === 0) {
      setPromoMessage({
        isSuccess: false,
        text: "Lütfen önce sepete ürün ekleyin.",
      });
      return;
    }
    setPromoLoading(true);
    setPromoMessage(null);
    try {
      const res = await ApiClient.evaluateCartPromotions(
        {
          couponCode: couponCode.trim() || undefined,
          customerId: selectedCustomerId || undefined,
          items: items.map((i) => ({
            productId: i.productId,
            productName: i.productName,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
          shippingFee: Number(shippingFee) || 0,
        },
        tenantId
      );

      if (res.success && res.data) {
        const d = res.data;
        if (d.totalDiscountAmount > 0) {
          setGeneralDiscount(d.totalDiscountAmount);
        }
        if (d.isFreeShipping) {
          setShippingFee(0);
        }
        setAppliedPromotions(
          d.appliedPromotions.map((p) => ({
            desc: p.description,
            discount: p.discountAmount,
            name: p.campaignName,
          }))
        );
        if (d.couponValidationMessage) {
          setPromoMessage({
            isSuccess: d.isCouponValid,
            text: d.couponValidationMessage,
          });
        } else if (d.appliedPromotions.length > 0) {
          setPromoMessage({
            isSuccess: true,
            text: `${d.appliedPromotions.length} adet kampanya indirimi sepete uygulandı.`,
          });
        }
      }
    } catch {
      setPromoMessage({
        isSuccess: false,
        text: "Promosyon hesaplanırken bir hata oluştu.",
      });
    } finally {
      setPromoLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  const handleCustomerChange = (id: string) => {
    setSelectedCustomerId(id);
    const found = customers.find((c) => c.id === id);
    if (found) {
      setCustomerName(found.name);
      if (found.city || found.country) {
        setShippingAddress(
          `${found.name}, ${found.city || ""} ${found.country || ""}`
        );
        setBillingAddress(
          `${found.name}, ${found.city || ""} ${found.country || ""}`
        );
      }
    }
  };

  const handleAddProductToCart = () => {
    if (!pickerProdId) {
      return;
    }
    const prod = products.find((p) => p.id === pickerProdId);
    if (!prod) {
      return;
    }

    setItems([
      ...items,
      {
        discountRate: 0,
        optionsOrNotes: "",
        productId: prod.id,
        productName: prod.name,
        quantity: pickerQty > 0 ? pickerQty : 1,
        sku: prod.sku || undefined,
        taxRate: prod.taxRate ?? 20,
        unit: prod.unit || "Adet",
        unitCost: prod.costPrice,
        unitPrice: prod.sellingPrice,
      },
    ]);

    setPickerProdId("");
    setPickerQty(1);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  // Calculations
  const subtotal = items.reduce((sum, item) => {
    const raw = item.unitPrice * item.quantity;
    const disc = item.discountRate ? raw * (item.discountRate / 100) : 0;
    return sum + (raw - disc);
  }, 0);

  const totalTax = items.reduce((sum, item) => {
    const raw = item.unitPrice * item.quantity;
    const disc = item.discountRate ? raw * (item.discountRate / 100) : 0;
    const taxable = raw - disc;
    return sum + (item.taxRate ? taxable * (item.taxRate / 100) : 0);
  }, 0);

  const grandTotal = Math.max(
    0,
    subtotal - generalDiscount + totalTax + Number(shippingFee)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setError("Lütfen bir müşteri seçin veya müşteri adı girin.");
      return;
    }
    if (items.length === 0) {
      setError("Lütfen en az bir ürün veya hizmet kalemi ekleyin.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload: CreateOrderRequest = {
        billingAddress: billingAddress.trim() || undefined,
        currency: "TRY",
        customerId: selectedCustomerId || undefined,
        customerName: customerName.trim(),
        generalDiscountAmount: Number(generalDiscount) || 0,
        items: items.map((i) => ({
          discountRate: Number(i.discountRate) || 0,
          optionsOrNotes: i.optionsOrNotes?.trim() || undefined,
          productId: i.productId,
          productName: i.productName.trim(),
          quantity: Number(i.quantity),
          sku: i.sku?.trim() || undefined,
          taxRate: Number(i.taxRate) ?? 20,
          unit: i.unit || "Adet",
          unitCost: Number(i.unitCost) || 0,
          unitPrice: Number(i.unitPrice),
          variantId: i.variantId,
        })),
        notes: notes.trim() || undefined,
        paymentMethod,
        shippingAddress: shippingAddress.trim() || undefined,
        shippingFee: Number(shippingFee) || 0,
        status,
      };

      const res = await ApiClient.createOrder(payload, tenantId);
      if (res.success) {
        onSuccess();
      } else {
        setError(res.message || "Sipariş oluşturulamadı.");
      }
    } catch {
      setError("Bağlantı hatası oluştu.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      open
    >
      <DialogContent
        aria-describedby={undefined}
        className="flex max-h-[90vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-zinc-100 border-b p-5 dark:border-zinc-800">
          <div>
            <DialogTitle className="font-bold text-base text-zinc-900 dark:text-zinc-100">
              Yeni Sipariş Oluştur
            </DialogTitle>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Müşteri seçin, ürün/hizmet kalemlerini ekleyin ve otomatik
              KDV/İndirim hesaplamasını yapın
            </p>
          </div>
          <DialogClose asChild>
            <button
              className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 dark:text-zinc-500 dark:hover:bg-zinc-800"
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </DialogClose>
        </div>

        <form
          className="flex-1 space-y-4 overflow-y-auto p-6 text-xs"
          onSubmit={handleSubmit}
        >
          {error && (
            <div className="rounded-xl bg-rose-50 p-3 font-medium text-rose-700 text-xs">
              {error}
            </div>
          )}

          {/* 1. Customer & Status Section */}
          <div className="grid grid-cols-1 gap-3 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-4 sm:grid-cols-3 dark:border-zinc-800/90 dark:bg-zinc-800/30">
            <div className="sm:col-span-2">
              <Label className="mb-1" required>
                Müşteri Seçin
              </Label>
              <Select
                onValueChange={(val) =>
                  handleCustomerChange(val === "none" ? "" : val)
                }
                value={selectedCustomerId || "none"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Kayıtlı Müşteri Seçin..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Kayıtlı Müşteri Seçin...</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.city ? `(${c.city})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-1">Başlangıç Durumu</Label>
              <Select onValueChange={setStatus} value={status}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Confirmed">
                    Onaylandı (Stoktan Düş)
                  </SelectItem>
                  <SelectItem value="Draft">Taslak</SelectItem>
                  <SelectItem value="PendingApproval">Onay Bekliyor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 2. Item Picker & Cart */}
          <div className="space-y-3 rounded-2xl border border-zinc-200/80 bg-white p-4 dark:border-zinc-800/90 dark:bg-zinc-900">
            <h4 className="font-bold text-zinc-900 dark:text-zinc-100">
              Sipariş Kalemleri (Ürün / Hizmet Sepeti)
            </h4>

            {/* Quick Item Add Strip */}
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-zinc-50 p-2.5 dark:bg-zinc-800/50">
              <div className="min-w-[200px] flex-1">
                <Select
                  onValueChange={(val) =>
                    setPickerProdId(val === "none" ? "" : val)
                  }
                  value={pickerProdId || "none"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Katalogdan Ürün / Hizmet Seçin..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      Katalogdan Ürün / Hizmet Seçin...
                    </SelectItem>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} (₺{p.sellingPrice} •{" "}
                        {p.trackInventory
                          ? `Stok: ${p.currentStock}`
                          : "Hizmet"}
                        )
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-24">
                <NumberInput
                  className="text-center"
                  min={1}
                  onChange={(val) => setPickerQty(val ?? 1)}
                  placeholder="Adet"
                  showStepper
                  step={1}
                  value={pickerQty}
                />
              </div>

              <button
                className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-xs transition-colors hover:bg-blue-700 disabled:opacity-50"
                disabled={!pickerProdId}
                onClick={handleAddProductToCart}
                type="button"
              >
                + Sepete Ekle
              </button>
            </div>

            {/* Cart Table */}
            {items.length === 0 ? (
              <div className="rounded-xl border border-zinc-200 border-dashed p-6 text-center text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
                Henüz sepete ürün veya hizmet eklenmedi.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
                <table className="w-full text-left text-xs">
                  <thead className="border-b bg-zinc-50 font-medium text-[11px] text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
                    <tr>
                      <th className="px-3 py-2.5">Kalem Adı</th>
                      <th className="px-3 py-2.5 text-center">Miktar</th>
                      <th className="px-3 py-2.5 text-right">Birim Fiyat</th>
                      <th className="px-3 py-2.5 text-center">KDV %</th>
                      <th className="px-3 py-2.5 text-center">İndirim %</th>
                      <th className="px-3 py-2.5 text-right">Toplam</th>
                      <th className="px-3 py-2.5 text-center">Sil</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {items.map((item, idx) => {
                      const raw = item.unitPrice * item.quantity;
                      const disc = item.discountRate
                        ? raw * (item.discountRate / 100)
                        : 0;
                      const taxable = raw - disc;
                      const tax = item.taxRate
                        ? taxable * (item.taxRate / 100)
                        : 0;
                      const lineTotal = taxable + tax;

                      return (
                        <tr
                          className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                          key={idx}
                        >
                          <td className="px-3 py-2.5">
                            <span className="font-bold text-zinc-900 dark:text-zinc-100">
                              {item.productName}
                            </span>
                            {item.sku && (
                              <span className="ml-1 text-[10px] text-zinc-400 dark:text-zinc-500">
                                ({item.sku})
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <NumberInput
                              className="w-20 text-center"
                              inputSize="sm"
                              min={0.01}
                              onChange={(val) => {
                                const newItems = [...items];
                                const currentItem = newItems[idx];
                                if (currentItem) {
                                  currentItem.quantity = val ?? 1;
                                  setItems(newItems);
                                }
                              }}
                              step={1}
                              value={item.quantity}
                            />
                          </td>
                          <td className="px-3 py-2.5 text-right font-medium text-zinc-800 dark:text-zinc-200">
                            ₺
                            {item.unitPrice.toLocaleString("tr-TR", {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td className="px-3 py-2.5 text-center text-zinc-600 dark:text-zinc-400">
                            %{item.taxRate}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <NumberInput
                              className="w-16 text-center"
                              inputSize="sm"
                              max={100}
                              min={0}
                              onChange={(val) => {
                                const newItems = [...items];
                                const currentItem = newItems[idx];
                                if (currentItem) {
                                  currentItem.discountRate = val ?? 0;
                                  setItems(newItems);
                                }
                              }}
                              suffix="%"
                              value={item.discountRate || 0}
                            />
                          </td>
                          <td className="px-3 py-2.5 text-right font-extrabold text-zinc-900 dark:text-zinc-100">
                            ₺
                            {lineTotal.toLocaleString("tr-TR", {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <button
                              className="p-1 text-zinc-400 hover:text-rose-600 dark:text-zinc-500"
                              onClick={() => handleRemoveItem(idx)}
                              type="button"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 3. Address & Delivery */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                Teslimat Adresi
              </label>
              <textarea
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-800/50 dark:bg-zinc-900 dark:text-zinc-100"
                onChange={(e) => setShippingAddress(e.target.value)}
                placeholder="Teslimat / Sevkiyat adresi..."
                rows={2}
                value={shippingAddress}
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                Fatura Adresi
              </label>
              <textarea
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-800/50 dark:bg-zinc-900 dark:text-zinc-100"
                onChange={(e) => setBillingAddress(e.target.value)}
                placeholder="Fatura adresi..."
                rows={2}
                value={billingAddress}
              />
            </div>
          </div>

          {/* 4. Financial Controls & Summary Section */}
          <div className="grid grid-cols-1 gap-4 rounded-3xl border border-zinc-200/80 bg-zinc-50/50 p-5 lg:grid-cols-12 dark:border-zinc-800/90 dark:bg-zinc-800/30">
            {/* Left Options (7 cols) */}
            <div className="space-y-3 lg:col-span-7">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label className="mb-1">Ödeme Yöntemi</Label>
                  <Select
                    onValueChange={setPaymentMethod}
                    value={paymentMethod}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BankTransfer">Havale / EFT</SelectItem>
                      <SelectItem value="CreditCard">Kredi Kartı</SelectItem>
                      <SelectItem value="Cash">Nakit</SelectItem>
                      <SelectItem value="Check">Çek / Senet</SelectItem>
                      <SelectItem value="OpenAccount">
                        Açık Hesap (Cari)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="mb-1">Kargo Bedeli (₺)</Label>
                  <NumberInput
                    min={0}
                    onChange={(val) => setShippingFee(val ?? 0)}
                    placeholder="0.00"
                    prefix="₺"
                    step={0.01}
                    value={shippingFee || undefined}
                  />
                </div>
              </div>

              {/* Coupon / Promotion Section */}
              <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-3 dark:border-blue-950/50 dark:bg-blue-950/20">
                <Label className="mb-1 text-blue-900 dark:text-blue-200">
                  Kupon veya Promosyon Kodu
                </Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Input
                      leftIcon={<Ticket className="text-blue-500" />}
                      onChange={(e) =>
                        setCouponCode(e.target.value.toUpperCase())
                      }
                      placeholder="Örn: BAHAR2026"
                      value={couponCode}
                    />
                  </div>
                  <button
                    className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 font-semibold text-white text-xs shadow-xs hover:bg-blue-700 disabled:opacity-50"
                    disabled={promoLoading || items.length === 0}
                    onClick={handleApplyPromotion}
                    type="button"
                  >
                    {promoLoading ? (
                      <Sparkles className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    Uygula
                  </button>
                </div>

                {promoMessage && (
                  <p
                    className={`mt-1.5 font-medium text-[11px] ${promoMessage.isSuccess ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
                  >
                    {promoMessage.text}
                  </p>
                )}

                {appliedPromotions.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {appliedPromotions.map((p, idx) => (
                      <div
                        className="flex items-center justify-between font-medium text-[11px] text-blue-800 dark:text-blue-300"
                        key={idx}
                      >
                        <span className="flex items-center gap-1">
                          <Tag className="h-3 w-3 text-blue-500" />
                          {p.name} ({p.desc})
                        </span>
                        <span className="font-bold text-emerald-600">
                          -₺
                          {p.discount.toLocaleString("tr-TR", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                    Genel İskonto / İndirim (₺)
                  </label>
                  <div className="relative">
                    <span className="absolute top-2 left-3 font-semibold text-zinc-400 dark:text-zinc-500">
                      ₺
                    </span>
                    <NumberInput
                      min={0}
                      onChange={(val) => setGeneralDiscount(val ?? 0)}
                      placeholder="0.00"
                      prefix="₺"
                      step={0.01}
                      value={generalDiscount || undefined}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                    Sipariş Notu
                  </label>
                  <input
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Siparişe özel not ekleyin..."
                    type="text"
                    value={notes}
                  />
                </div>
              </div>
            </div>

            {/* Right Financial Summary Card (5 cols) */}
            <div className="flex flex-col justify-between space-y-2 rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs lg:col-span-5 dark:border-zinc-800/90 dark:bg-zinc-900">
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                  <span>Ara Toplam (KDV Hariç):</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    ₺
                    {subtotal.toLocaleString("tr-TR", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>

                {generalDiscount > 0 && (
                  <div className="flex items-center justify-between font-medium text-rose-600">
                    <span>Genel İskonto:</span>
                    <span>
                      -₺
                      {Number(generalDiscount).toLocaleString("tr-TR", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                  <span>Hesaplanan KDV (%):</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    ₺
                    {totalTax.toLocaleString("tr-TR", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>

                {shippingFee > 0 && (
                  <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                    <span>Kargo / Sevkiyat:</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      ₺
                      {Number(shippingFee).toLocaleString("tr-TR", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                )}
              </div>

              {/* Grand Total Highlight */}
              <div className="mt-1 border-zinc-100 border-t pt-2.5 dark:border-zinc-800">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="block font-bold text-xs text-zinc-900 uppercase tracking-wider dark:text-zinc-100">
                      Genel Toplam
                    </span>
                    <span className="font-medium text-[10px] text-zinc-400 dark:text-zinc-500">
                      Tüm Vergiler Dahil
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-blue-600 text-xl tracking-tight">
                      ₺
                      {grandTotal.toLocaleString("tr-TR", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-zinc-100 border-t pt-4 dark:border-zinc-800">
            <button
              className="rounded-xl border border-zinc-200 px-4 py-2 font-semibold text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
              onClick={onClose}
              type="button"
            >
              Vazgeç
            </button>
            <button
              className="rounded-xl bg-blue-600 px-5 py-2 font-semibold text-white shadow-xs transition-colors hover:bg-blue-700 disabled:opacity-50"
              disabled={submitting || items.length === 0}
              type="submit"
            >
              {submitting
                ? "Sipariş Oluşturuluyor..."
                : "Siparişi Onayla & Kaydet"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
