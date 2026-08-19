"use client";

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
  Table as TableIcon,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";
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
import { usePermissions } from "@/lib/permissions/permission-context";

export default function OrdersPage() {
  const params = useParams();
  const tenantSlug = (params?.tenantSlug as string) || "";
  const { activeTenant } = usePermissions();

  const [orders, setOrders] = useState<OrderListDto[]>([]);
  const [stats, setStats] = useState<OrderStatsDto | null>(null);
  const [customers, setCustomers] = useState<CustomerListDto[]>([]);
  const [products, setProducts] = useState<ProductListDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");

  // Modals & Actions
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deletingOrder, setDeletingOrder] = useState<OrderListDto | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = useCallback(async () => {
    if (!activeTenant) return;
    setLoading(true);
    try {
      const [ordersRes, statsRes, custRes, prodRes] = await Promise.all([
        ApiClient.getOrders(
          {
            page,
            pageSize,
            search: search.trim() || undefined,
            status: statusFilter || undefined,
            paymentStatus: paymentStatusFilter || undefined,
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
    if (!activeTenant || !deletingOrder) return;
    try {
      const res = await ApiClient.deleteOrder(deletingOrder.id, activeTenant.id);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Draft":
        return "bg-slate-100 text-slate-700 border-slate-200";
      case "PendingApproval":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Confirmed":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Processing":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "Shipped":
        return "bg-cyan-50 text-cyan-700 border-cyan-200";
      case "Delivered":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Cancelled":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "Refunded":
        return "bg-orange-50 text-orange-700 border-orange-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
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
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "PartiallyPaid":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Unpaid":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "Refunded":
        return "bg-purple-50 text-purple-700 border-purple-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
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
    { id: "Draft", label: "Taslaklar", color: "border-slate-300" },
    { id: "PendingApproval", label: "Onay Bekleyenler", color: "border-amber-300" },
    { id: "Confirmed", label: "Onaylananlar", color: "border-blue-400" },
    { id: "Processing", label: "Hazırlananlar", color: "border-purple-400" },
    { id: "Shipped", label: "Kargodakiler", color: "border-cyan-400" },
    { id: "Delivered", label: "Tamamlananlar", color: "border-emerald-400" },
  ];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-white text-xs shadow-2xl animate-in slide-in-from-top-4">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* 1. Header Section */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-2xl text-slate-900 tracking-tight sm:text-3xl">
              Sipariş & Satış Yönetimi
            </h1>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 font-bold text-[11px] text-blue-700">
              {totalCount} Sipariş
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Müşterilerinizin siparişlerini oluşturun, onaylayın, teslimat ve parçalı tahsilatlarını takip edin.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 font-semibold text-slate-700 text-xs shadow-2xs hover:bg-slate-50"
            onClick={() => showToast("Siparişler Excel / CSV olarak dışa aktarılıyor...")}
            type="button"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span>Dışa Aktar</span>
          </button>

          <PermissionGate permission="Orders.Create">
            <button
              className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white text-xs shadow-xs transition-colors hover:bg-slate-800"
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
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-medium text-slate-500 text-xs">Toplam Satış Cirosu</span>
              <div className="font-extrabold text-2xl text-slate-900 tracking-tight sm:text-3xl mt-1">
                ₺{(stats?.totalRevenue ?? 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Coins className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 border-slate-100 border-t pt-2 text-[11px] text-slate-500">
            <span>{stats?.totalOrders ?? 0} Toplam Sipariş Kaydı</span>
          </div>
        </div>

        {/* Collected / Paid Revenue */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-medium text-slate-500 text-xs">Tahsil Edilen Tutar</span>
              <div className="font-extrabold text-2xl text-emerald-600 tracking-tight sm:text-3xl mt-1">
                ₺{(stats?.paidRevenue ?? 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 border-slate-100 border-t pt-2 text-[11px] text-slate-500">
            <span>Tahsilat Oranı: %{stats && stats.totalRevenue > 0 ? Math.round((stats.paidRevenue / stats.totalRevenue) * 100) : 0}</span>
          </div>
        </div>

        {/* Pending Approval / Preparation */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-medium text-slate-500 text-xs">Bekleyen & Hazırlanan</span>
              <div className="font-extrabold text-2xl text-amber-600 tracking-tight sm:text-3xl mt-1">
                {(stats?.pendingOrders ?? 0) + (stats?.processingOrders ?? 0)}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 border-slate-100 border-t pt-2 text-[11px] text-slate-500">
            <span>{stats?.confirmedOrders ?? 0} Onaylandı • {stats?.shippedOrders ?? 0} Yolda</span>
          </div>
        </div>

        {/* Unpaid Balance */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-medium text-slate-500 text-xs">Bekleyen Tahsilat (Açık Bakiye)</span>
              <div className="font-extrabold text-2xl text-rose-600 tracking-tight sm:text-3xl mt-1">
                ₺{(stats?.unpaidRevenue ?? 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <AlertCircle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 border-slate-100 border-t pt-2 text-[11px] text-slate-500">
            <span>Ödenmesi gereken açık alacaklar</span>
          </div>
        </div>
      </div>

      {/* 3. Filters & View Switcher Bar */}
      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs md:flex-row md:items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
          <input
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-4 pl-9 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Sipariş no, Müşteri adı, Fatura no veya Takip no ara..."
            type="text"
            value={search}
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 font-medium focus:border-blue-500 focus:outline-none"
            onChange={(e) => setStatusFilter(e.target.value)}
            value={statusFilter}
          >
            <option value="">Tüm Durumlar</option>
            <option value="Draft">📝 Taslak</option>
            <option value="PendingApproval">⏳ Onay Bekliyor</option>
            <option value="Confirmed">✅ Onaylandı</option>
            <option value="Processing">⚙️ Hazırlanıyor</option>
            <option value="Shipped">🚚 Kargoda / Yolda</option>
            <option value="Delivered">📦 Teslim Edildi</option>
            <option value="Cancelled">❌ İptal Edildi</option>
          </select>

          {/* Payment Status Filter */}
          <select
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 font-medium focus:border-blue-500 focus:outline-none"
            onChange={(e) => setPaymentStatusFilter(e.target.value)}
            value={paymentStatusFilter}
          >
            <option value="">Tüm Ödemeler</option>
            <option value="Unpaid">🔴 Ödenmedi</option>
            <option value="PartiallyPaid">🟡 Kısmi Ödendi</option>
            <option value="Paid">🟢 Tamamı Ödendi</option>
          </select>

          {/* Reset Filters */}
          {(search || statusFilter || paymentStatusFilter) && (
            <button
              className="flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
              onClick={() => {
                setSearch("");
                setStatusFilter("");
                setPaymentStatusFilter("");
              }}
              type="button"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Sıfırla</span>
            </button>
          )}

          {/* View Switcher */}
          <div className="flex items-center rounded-xl bg-slate-100 p-0.5">
            <button
              className={`rounded-lg p-1.5 transition-all ${
                viewMode === "table"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-400 hover:text-slate-700"
              }`}
              onClick={() => setViewMode("table")}
              title="Tablo Görünümü"
              type="button"
            >
              <TableIcon className="h-4 w-4" />
            </button>
            <button
              className={`rounded-lg p-1.5 transition-all ${
                viewMode === "kanban"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-400 hover:text-slate-700"
              }`}
              onClick={() => setViewMode("kanban")}
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
        <div className="flex h-64 items-center justify-center rounded-3xl border border-slate-200/80 bg-white shadow-xs">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <span className="text-xs text-slate-500 font-medium">Siparişler yükleniyor...</span>
          </div>
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200/80 border-dashed bg-white p-12 text-center shadow-xs">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <ShoppingCart className="h-6 w-6" />
          </div>
          <h3 className="mt-3 font-bold text-slate-900 text-sm">Sipariş Bulunamadı</h3>
          <p className="mt-1 max-w-sm text-xs text-slate-500">
            Arama kriterlerinize uygun sipariş bulunamadı veya henüz bir sipariş oluşturulmadı.
          </p>
          <PermissionGate permission="Orders.Create">
            <button
              className="mt-4 flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white text-xs shadow-xs hover:bg-slate-800"
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
        <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-slate-100 border-b bg-slate-50/50 text-[11px] text-slate-500 font-medium">
                <tr>
                  <th className="py-3.5 pr-4 pl-6">Sipariş No & Tarih</th>
                  <th className="py-3.5 px-4">Müşteri</th>
                  <th className="py-3.5 px-4">Durum</th>
                  <th className="py-3.5 px-4">Ödeme Durumu</th>
                  <th className="py-3.5 px-4 text-center">Kalem</th>
                  <th className="py-3.5 px-4 text-right">Toplam Tutar</th>
                  <th className="py-3.5 px-4 text-right">Tahsil Edilen</th>
                  <th className="py-3.5 pr-6 pl-4 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((o) => (
                  <tr className="group transition-colors hover:bg-slate-50/80" key={o.id}>
                    <td className="py-4 pr-4 pl-6">
                      <Link
                        className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors block"
                        href={`/${tenantSlug}/orders/${o.id}`}
                      >
                        {o.orderNumber}
                      </Link>
                      <div className="text-[10px] text-slate-400">
                        {new Date(o.orderDate).toLocaleDateString("tr-TR")}
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-900 text-xs">{o.customerName}</div>
                      {o.invoiceNumber && (
                        <div className="text-[10px] text-slate-400">Fat: {o.invoiceNumber}</div>
                      )}
                    </td>

                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 font-bold text-[10px] ${getStatusBadge(
                          o.status
                        )}`}
                      >
                        {getStatusLabel(o.status)}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center rounded-lg border px-2 py-0.5 font-bold text-[10px] ${getPaymentBadge(
                          o.paymentStatus
                        )}`}
                      >
                        {getPaymentLabel(o.paymentStatus)}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-center font-bold text-slate-700">
                      {o.itemsCount} Kalem
                    </td>

                    <td className="py-4 px-4 text-right">
                      <div className="font-extrabold text-slate-900 text-xs">
                        ₺{o.totalAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">KDV Dahil</div>
                    </td>

                    <td className="py-4 px-4 text-right">
                      <div className="font-bold text-emerald-600 text-xs">
                        ₺{o.paidAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                      </div>
                      {o.remainingAmount > 0 && (
                        <div className="text-[10px] text-rose-500 font-medium">
                          Kalan: ₺{o.remainingAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                        </div>
                      )}
                    </td>

                    <td className="py-4 pr-6 pl-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                          href={`/${tenantSlug}/orders/${o.id}`}
                          title="Sipariş Detayı"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                        <PermissionGate permission="Orders.Delete">
                          <button
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 transition-colors"
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
            const colTotal = colOrders.reduce((sum, o) => sum + o.totalAmount, 0);

            return (
              <div
                className="flex w-72 shrink-0 flex-col rounded-3xl border border-slate-200/80 bg-slate-50/70 p-3 shadow-2xs"
                key={col.id}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between border-slate-200 border-b pb-3 mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">{col.label}</span>
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 font-bold text-[10px] text-slate-700">
                      {colOrders.length}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-600">
                    ₺{colTotal.toLocaleString("tr-TR", { minimumFractionDigits: 0 })}
                  </span>
                </div>

                {/* Column Orders */}
                <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[600px]">
                  {colOrders.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200/60 border-dashed p-6 text-center text-[11px] text-slate-400">
                      Bu aşamada sipariş yok
                    </div>
                  ) : (
                    colOrders.map((o) => (
                      <Link
                        className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs transition-all hover:border-slate-300 hover:shadow-xs block"
                        href={`/${tenantSlug}/orders/${o.id}`}
                        key={o.id}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-1">
                            <span className="font-bold text-xs text-slate-900 group-hover:text-blue-600 transition-colors">
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

                          <div className="mt-1 font-semibold text-slate-700 text-xs truncate">
                            {o.customerName}
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between border-slate-100 border-t pt-2 text-[11px]">
                          <span className="text-slate-400 font-medium">
                            {new Date(o.orderDate).toLocaleDateString("tr-TR")}
                          </span>
                          <span className="font-extrabold text-slate-900 text-xs">
                            ₺{o.totalAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="flex w-full max-w-md flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900">Siparişi Sil</h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              <strong className="text-slate-900 font-semibold">{deletingOrder.orderNumber}</strong> numaralı
              siparişi ve buna bağlı tüm kalemleri/tahsilat kayıtlarını silmek istediğinize emin misiniz?
            </p>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 text-xs hover:bg-slate-50"
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
          </div>
        </div>
      )}
    </div>
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

  // Items cart
  const [items, setItems] = useState<CreateOrderItemRequest[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected product picker state
  const [pickerProdId, setPickerProdId] = useState("");
  const [pickerQty, setPickerQty] = useState(1);

  if (!isOpen) return null;

  const handleCustomerChange = (id: string) => {
    setSelectedCustomerId(id);
    const found = customers.find((c) => c.id === id);
    if (found) {
      setCustomerName(found.name);
      if (found.city || found.country) {
        setShippingAddress(`${found.name}, ${found.city || ""} ${found.country || ""}`);
        setBillingAddress(`${found.name}, ${found.city || ""} ${found.country || ""}`);
      }
    }
  };

  const handleAddProductToCart = () => {
    if (!pickerProdId) return;
    const prod = products.find((p) => p.id === pickerProdId);
    if (!prod) return;

    setItems([
      ...items,
      {
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku || undefined,
        unit: prod.unit || "Adet",
        unitPrice: prod.sellingPrice,
        unitCost: prod.costPrice,
        quantity: pickerQty > 0 ? pickerQty : 1,
        taxRate: prod.taxRate ?? 20,
        discountRate: 0,
        optionsOrNotes: "",
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

  const grandTotal = Math.max(0, subtotal - generalDiscount + totalTax + Number(shippingFee));

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
        customerId: selectedCustomerId || undefined,
        customerName: customerName.trim(),
        status,
        paymentMethod,
        currency: "TRY",
        shippingFee: Number(shippingFee) || 0,
        generalDiscountAmount: Number(generalDiscount) || 0,
        shippingAddress: shippingAddress.trim() || undefined,
        billingAddress: billingAddress.trim() || undefined,
        notes: notes.trim() || undefined,
        items: items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          productName: i.productName.trim(),
          sku: i.sku?.trim() || undefined,
          unit: i.unit || "Adet",
          unitPrice: Number(i.unitPrice),
          unitCost: Number(i.unitCost) || 0,
          quantity: Number(i.quantity),
          taxRate: Number(i.taxRate) ?? 20,
          discountRate: Number(i.discountRate) || 0,
          optionsOrNotes: i.optionsOrNotes?.trim() || undefined,
        })),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-3xl border border-slate-200/80 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-slate-100 border-b p-5">
          <div>
            <h2 className="font-bold text-base text-slate-900">Yeni Sipariş Oluştur</h2>
            <p className="text-slate-500 text-xs">
              Müşteri seçin, ürün/hizmet kalemlerini ekleyin ve otomatik KDV/İndirim hesaplamasını yapın
            </p>
          </div>
          <button className="rounded-full p-2 text-slate-400 hover:bg-slate-100" onClick={onClose} type="button">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form className="flex-1 overflow-y-auto p-6 space-y-4 text-xs" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          {/* 1. Customer & Status Section */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4">
            <div className="sm:col-span-2">
              <label className="mb-1 block font-medium text-slate-700">Müşteri Seçin *</label>
              <select
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
                onChange={(e) => handleCustomerChange(e.target.value)}
                value={selectedCustomerId}
              >
                <option value="">Kayıtlı Müşteri Seçin...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.city ? `(${c.city})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block font-medium text-slate-700">Başlangıç Durumu</label>
              <select
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none font-semibold"
                onChange={(e) => setStatus(e.target.value)}
                value={status}
              >
                <option value="Confirmed">✅ Onaylandı (Stoktan Düş)</option>
                <option value="Draft">📝 Taslak</option>
                <option value="PendingApproval">⏳ Onay Bekliyor</option>
              </select>
            </div>
          </div>

          {/* 2. Item Picker & Cart */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-3">
            <h4 className="font-bold text-slate-900">Sipariş Kalemleri (Ürün / Hizmet Sepeti)</h4>

            {/* Quick Item Add Strip */}
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-2.5">
              <select
                className="flex-1 min-w-[200px] rounded-lg border border-slate-200 bg-white p-2 text-slate-900 focus:outline-none"
                onChange={(e) => setPickerProdId(e.target.value)}
                value={pickerProdId}
              >
                <option value="">Katalogdan Ürün / Hizmet Seçin...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (₺{p.sellingPrice} • {p.trackInventory ? `Stok: ${p.currentStock}` : "Hizmet"})
                  </option>
                ))}
              </select>

              <input
                className="w-20 rounded-lg border border-slate-200 bg-white p-2 text-slate-900 text-center focus:outline-none"
                min="1"
                onChange={(e) => setPickerQty(parseFloat(e.target.value) || 1)}
                placeholder="Adet"
                type="number"
                value={pickerQty}
              />

              <button
                className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors disabled:opacity-50"
                disabled={!pickerProdId}
                onClick={handleAddProductToCart}
                type="button"
              >
                + Sepete Ekle
              </button>
            </div>

            {/* Cart Table */}
            {items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-slate-400">
                Henüz sepete ürün veya hizmet eklenmedi.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] text-slate-500 font-medium border-b">
                    <tr>
                      <th className="py-2.5 px-3">Kalem Adı</th>
                      <th className="py-2.5 px-3 text-center">Miktar</th>
                      <th className="py-2.5 px-3 text-right">Birim Fiyat</th>
                      <th className="py-2.5 px-3 text-center">KDV %</th>
                      <th className="py-2.5 px-3 text-center">İndirim %</th>
                      <th className="py-2.5 px-3 text-right">Toplam</th>
                      <th className="py-2.5 px-3 text-center">Sil</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item, idx) => {
                      const raw = item.unitPrice * item.quantity;
                      const disc = item.discountRate ? raw * (item.discountRate / 100) : 0;
                      const taxable = raw - disc;
                      const tax = item.taxRate ? taxable * (item.taxRate / 100) : 0;
                      const lineTotal = taxable + tax;

                      return (
                        <tr className="hover:bg-slate-50/60" key={idx}>
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-slate-900">{item.productName}</span>
                            {item.sku && <span className="ml-1 text-[10px] text-slate-400">({item.sku})</span>}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <input
                              className="w-16 rounded-md border border-slate-200 p-1 text-center font-bold text-slate-900"
                              min="0.01"
                              onChange={(e) => {
                                const newItems = [...items];
                                const currentItem = newItems[idx];
                                if (currentItem) {
                                  currentItem.quantity = parseFloat(e.target.value) || 1;
                                  setItems(newItems);
                                }
                              }}
                              step="0.01"
                              type="number"
                              value={item.quantity}
                            />
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium text-slate-800">
                            ₺{item.unitPrice.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-600">
                            %{item.taxRate}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <input
                              className="w-14 rounded-md border border-slate-200 p-1 text-center text-slate-900"
                              max="100"
                              min="0"
                              onChange={(e) => {
                                const newItems = [...items];
                                const currentItem = newItems[idx];
                                if (currentItem) {
                                  currentItem.discountRate = parseFloat(e.target.value) || 0;
                                  setItems(newItems);
                                }
                              }}
                              type="number"
                              value={item.discountRate || 0}
                            />
                          </td>
                          <td className="py-2.5 px-3 text-right font-extrabold text-slate-900">
                            ₺{lineTotal.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              className="p-1 text-slate-400 hover:text-rose-600"
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
              <label className="mb-1 block font-medium text-slate-700">Teslimat Adresi</label>
              <textarea
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
                onChange={(e) => setShippingAddress(e.target.value)}
                placeholder="Teslimat / Sevkiyat adresi..."
                rows={2}
                value={shippingAddress}
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-slate-700">Fatura Adresi</label>
              <textarea
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
                onChange={(e) => setBillingAddress(e.target.value)}
                placeholder="Fatura adresi..."
                rows={2}
                value={billingAddress}
              />
            </div>
          </div>

          {/* 4. Financial Controls & Summary Section */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 rounded-3xl border border-slate-200/80 bg-slate-50/50 p-5">
            {/* Left Options (7 cols) */}
            <div className="space-y-3 lg:col-span-7">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block font-medium text-slate-700">Ödeme Yöntemi</label>
                  <select
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    value={paymentMethod}
                  >
                    <option value="BankTransfer">🏦 Havale / EFT</option>
                    <option value="CreditCard">💳 Kredi Kartı</option>
                    <option value="Cash">💵 Nakit</option>
                    <option value="Check">📜 Çek / Senet</option>
                    <option value="OpenAccount">📑 Açık Hesap (Cari)</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block font-medium text-slate-700">Kargo Bedeli (₺)</label>
                  <div className="relative">
                    <span className="absolute top-2 left-3 font-semibold text-slate-400">₺</span>
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-white py-2 pr-3 pl-7 text-slate-900 focus:border-blue-500 focus:outline-none font-medium"
                      min="0"
                      onChange={(e) => setShippingFee(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      step="0.01"
                      type="number"
                      value={shippingFee || ""}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block font-medium text-slate-700">Genel İskonto / İndirim (₺)</label>
                  <div className="relative">
                    <span className="absolute top-2 left-3 font-semibold text-slate-400">₺</span>
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-white py-2 pr-3 pl-7 text-slate-900 focus:border-blue-500 focus:outline-none font-medium"
                      min="0"
                      onChange={(e) => setGeneralDiscount(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      step="0.01"
                      type="number"
                      value={generalDiscount || ""}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block font-medium text-slate-700">Sipariş Notu</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Siparişe özel not ekleyin..."
                    type="text"
                    value={notes}
                  />
                </div>
              </div>
            </div>

            {/* Right Financial Summary Card (5 cols) */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs lg:col-span-5 space-y-2">
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Ara Toplam (KDV Hariç):</span>
                  <span className="font-semibold text-slate-900">
                    ₺{subtotal.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {generalDiscount > 0 && (
                  <div className="flex justify-between items-center text-rose-600 font-medium">
                    <span>Genel İskonto:</span>
                    <span>-₺{Number(generalDiscount).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-slate-600">
                  <span>Hesaplanan KDV (%):</span>
                  <span className="font-semibold text-slate-900">
                    ₺{totalTax.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {shippingFee > 0 && (
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Kargo / Sevkiyat:</span>
                    <span className="font-semibold text-slate-900">
                      ₺{Number(shippingFee).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>

              {/* Grand Total Highlight */}
              <div className="border-slate-100 border-t pt-2.5 mt-1">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="font-bold text-xs text-slate-900 uppercase tracking-wider block">
                      Genel Toplam
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">Tüm Vergiler Dahil</span>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-xl text-blue-600 tracking-tight">
                      ₺{grandTotal.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-slate-100 border-t pt-4">
            <button
              className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
              onClick={onClose}
              type="button"
            >
              Vazgeç
            </button>
            <button
              className="rounded-xl bg-slate-900 px-5 py-2 font-semibold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50"
              disabled={submitting || items.length === 0}
              type="submit"
            >
              {submitting ? "Sipariş Oluşturuluyor..." : "Siparişi Onayla & Kaydet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
