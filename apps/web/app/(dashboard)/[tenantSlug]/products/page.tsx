"use client";

import { Checkbox } from "@workspace/ui/components/checkbox";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { NumberInput } from "@workspace/ui/components/number-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  AlertTriangle,
  Box,
  CheckCircle2,
  ChevronRight,
  Coins,
  Download,
  FolderTree,
  History,
  LayoutGrid,
  Package,
  Plus,
  RotateCcw,
  Search,
  Table as TableIcon,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { BulkActionBar, BulkDeleteIcon } from "@/components/bulk-action-bar";
import { PermissionGate } from "@/components/permission-gate";
import {
  type AdjustProductStockRequest,
  ApiClient,
  type CreateProductRequest,
  type ProductCategoryDto,
  type ProductListDto,
  type ProductStatsDto,
} from "@/lib/api-client";
import { useUrlFilters } from "@/lib/hooks/use-url-filters";
import { usePermissions } from "@/lib/permissions/permission-context";

export default function ProductsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tenantSlug = (params?.tenantSlug as string) || "";
  const { activeTenant } = usePermissions();
  const { getParam, getIntParam, setParams } = useUrlFilters();

  const [products, setProducts] = useState<ProductListDto[]>([]);
  const [categories, setCategories] = useState<ProductCategoryDto[]>([]);
  const [stats, setStats] = useState<ProductStatsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(25);

  // Filters — initialized from URL
  const [search, setSearch] = useState(() => getParam("search", ""));
  const [typeFilter, setTypeFilter] = useState(() => getParam("type", ""));
  const [categoryFilter, setCategoryFilter] = useState(() =>
    getParam("category", "")
  );
  const [statusFilter, setStatusFilter] = useState(() =>
    getParam("status", "")
  );
  const [stockStatusFilter, setStockStatusFilter] = useState(() =>
    getParam("stockStatus", "")
  );
  const [page, setPage] = useState(() => getIntParam("page", 1));
  const [viewMode, setViewMode] = useState<"table" | "grid">(() =>
    getParam("view", "table") === "grid" ? "grid" : "table"
  );

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Modals & Actions
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [stockAdjustProduct, setStockAdjustProduct] =
    useState<ProductListDto | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<ProductListDto | null>(
    null
  );
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
      const [prodRes, catRes, statsRes] = await Promise.all([
        ApiClient.getProducts(
          {
            categoryId: categoryFilter || undefined,
            page,
            pageSize,
            search: search.trim() || undefined,
            status: statusFilter || undefined,
            stockStatus: stockStatusFilter || undefined,
            type: typeFilter || undefined,
          },
          activeTenant.id
        ),
        ApiClient.getProductCategories(activeTenant.id),
        ApiClient.getProductStats(activeTenant.id),
      ]);

      if (prodRes.success && prodRes.data) {
        setProducts(prodRes.data.items);
        setTotalCount(prodRes.data.totalCount);
      }
      if (catRes.success && catRes.data) {
        setCategories(catRes.data);
      }
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
    } catch {
      showToast("Ürün verileri yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, [
    activeTenant,
    page,
    pageSize,
    search,
    typeFilter,
    categoryFilter,
    statusFilter,
    stockStatusFilter,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async () => {
    if (!(activeTenant && deletingProduct)) {
      return;
    }
    try {
      const res = await ApiClient.deleteProduct(
        deletingProduct.id,
        activeTenant.id
      );
      if (res.success) {
        showToast(`'${deletingProduct.name}' silindi.`);
        setDeletingProduct(null);
        loadData();
      } else {
        showToast(res.message || "Silme başarısız.");
      }
    } catch {
      showToast("Silme sırasında hata oluştu.");
    }
  };

  // ── Bulk operations ─────────────────────────────────────────────────────────
  const allPageIds = products.map((p) => p.id);
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
      const { deletedCount, failedCount } = await ApiClient.bulkDeleteProducts(
        Array.from(selectedIds),
        activeTenant.id
      );
      setSelectedIds(new Set());
      loadData();
      if (failedCount > 0) {
        showToast(`${deletedCount} ürün silindi, ${failedCount} silinemedi.`);
      } else {
        showToast(`${deletedCount} ürün başarıyla silindi.`);
      }
    } catch {
      showToast("Toplu silme sırasında hata oluştu.");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // ── URL-synced filter setters ────────────────────────────────────────────────
  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
    setParams({ page: undefined, search: val || undefined });
  };
  const handleTypeFilter = (val: string) => {
    const v = val === "all" ? "" : val;
    setTypeFilter(v);
    setPage(1);
    setParams({ page: undefined, type: v || undefined });
  };
  const handleCategoryFilter = (val: string) => {
    const v = val === "all" ? "" : val;
    setCategoryFilter(v);
    setPage(1);
    setParams({ category: v || undefined, page: undefined });
  };
  const handleStatusFilter = (val: string) => {
    const v = val === "all" ? "" : val;
    setStatusFilter(v);
    setPage(1);
    setParams({ page: undefined, status: v || undefined });
  };
  const handleStockStatusFilter = (val: string) => {
    const v = val === "all" ? "" : val;
    setStockStatusFilter(v);
    setPage(1);
    setParams({ page: undefined, stockStatus: v || undefined });
  };
  const handleResetFilters = () => {
    setSearch("");
    setTypeFilter("");
    setCategoryFilter("");
    setStatusFilter("");
    setStockStatusFilter("");
    setPage(1);
    setParams({
      category: undefined,
      page: undefined,
      search: undefined,
      status: undefined,
      stockStatus: undefined,
      type: undefined,
    });
  };
  const handleViewMode = (mode: "table" | "grid") => {
    setViewMode(mode);
    setParams({ view: mode === "grid" ? "grid" : undefined });
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "Physical":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800";
      case "Service":
        return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800";
      case "Digital":
        return "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800";
      case "Subscription":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800";
      default:
        return "bg-zinc-50 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "Physical":
        return "Fiziksel Ürün";
      case "Service":
        return "Hizmet / Servis";
      case "Digital":
        return "Dijital Ürün";
      case "Subscription":
        return "Abonelik / Lisans";
      default:
        return type;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800";
      case "Inactive":
        return "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800";
      case "Draft":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800";
      case "Discontinued":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800";
      default:
        return "bg-zinc-50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800";
    }
  };

  return (
    <div className="space-y-6">
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
              Ürün & Hizmetler
            </h1>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 font-bold text-[11px] text-blue-700">
              {totalCount} Kayıt
            </span>
          </div>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Fiziksel stoklu ürünlerinizi, danışmanlık hizmetlerinizi ve abonelik
            paketlerinizi tek noktadan yönetin.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 font-semibold text-xs text-zinc-700 shadow-2xs hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
            onClick={() => setIsCategoryModalOpen(true)}
            type="button"
          >
            <FolderTree className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
            <span>Kategoriler ({categories.length})</span>
          </button>

          <button
            className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 font-semibold text-xs text-zinc-700 shadow-2xs hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
            onClick={() => showToast("Katalog CSV olarak dışa aktarılıyor...")}
            type="button"
          >
            <Download className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
            <span>Dışa Aktar</span>
          </button>

          <PermissionGate permission="Products.Create">
            <button
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white text-xs shadow-xs transition-all hover:bg-blue-700 active:scale-[0.98]"
              onClick={() => setIsCreateModalOpen(true)}
              type="button"
            >
              <Plus className="h-4 w-4" />
              <span>Yeni Ürün / Hizmet Ekle</span>
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Products */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-zinc-800/90 dark:bg-zinc-900">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-medium text-xs text-zinc-500 dark:text-zinc-400">
                Toplam Katalog
              </span>
              <div className="mt-1 font-extrabold text-2xl text-zinc-900 tracking-tight sm:text-3xl dark:text-zinc-100">
                {stats?.totalProducts ?? 0}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Package className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 border-zinc-100 border-t pt-2 text-[11px] text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <span>{stats?.physicalProductsCount ?? 0} Fiziksel</span>
            <span>•</span>
            <span>{stats?.servicesCount ?? 0} Hizmet</span>
            <span>•</span>
            <span>{stats?.subscriptionsCount ?? 0} Abonelik</span>
          </div>
        </div>

        {/* Total Inventory Valuation */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-zinc-800/90 dark:bg-zinc-900">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-medium text-xs text-zinc-500 dark:text-zinc-400">
                Toplam Envanter Değeri (Maliyet)
              </span>
              <div className="mt-1 font-extrabold text-2xl text-zinc-900 tracking-tight sm:text-3xl dark:text-zinc-100">
                ₺
                {(stats?.totalInventoryValue ?? 0).toLocaleString("tr-TR", {
                  minimumFractionDigits: 2,
                })}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <Coins className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 border-zinc-100 border-t pt-2 text-[11px] text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <span>
              Satış Değeri: ₺
              {(stats?.totalRetailValue ?? 0).toLocaleString("tr-TR", {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-zinc-800/90 dark:bg-zinc-900">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-medium text-xs text-zinc-500 dark:text-zinc-400">
                Kritik Stok Uyarısı
              </span>
              <div className="mt-1 font-extrabold text-2xl text-amber-600 tracking-tight sm:text-3xl">
                {stats?.lowStockCount ?? 0}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 border-zinc-100 border-t pt-2 font-semibold text-[11px] text-rose-600 dark:border-zinc-800">
            <span>{stats?.outOfStockCount ?? 0} Ürün Tükendi</span>
          </div>
        </div>

        {/* Active Services & Subscriptions */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-zinc-800/90 dark:bg-zinc-900">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-medium text-xs text-zinc-500 dark:text-zinc-400">
                Hizmet & Abonelikler
              </span>
              <div className="mt-1 font-extrabold text-2xl text-purple-600 tracking-tight sm:text-3xl">
                {(stats?.servicesCount ?? 0) + (stats?.subscriptionsCount ?? 0)}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
              <Zap className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 border-zinc-100 border-t pt-2 text-[11px] text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <span>Stoksuz katma değerli teklif kalemleri</span>
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
            placeholder="Ürün adı, SKU, Barkod veya Marka ara..."
            value={search}
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Type Filter */}
          <div className="w-36">
            <Select
              onValueChange={handleTypeFilter}
              value={typeFilter || "all"}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Tüm Tipler" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Tipler</SelectItem>
                <SelectItem value="Physical">Fiziksel Ürünler</SelectItem>
                <SelectItem value="Service">Hizmet / Danışmanlık</SelectItem>
                <SelectItem value="Digital">Dijital Ürün</SelectItem>
                <SelectItem value="Subscription">Abonelik / Lisans</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Category Filter */}
          <div className="w-44">
            <Select
              onValueChange={handleCategoryFilter}
              value={categoryFilter || "all"}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Tüm Kategoriler" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Kategoriler</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.parentId ? `↳ ${c.fullPath || c.name}` : c.name} (
                    {c.productsCount})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stock Status Filter */}
          <div className="w-40">
            <Select
              onValueChange={handleStockStatusFilter}
              value={stockStatusFilter || "all"}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Stok Durumu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Stok Durumu: Tümü</SelectItem>
                <SelectItem value="in_stock">Stokta Var</SelectItem>
                <SelectItem value="low_stock">Kritik Stok</SelectItem>
                <SelectItem value="out_of_stock">Tükendi (0)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="w-36">
            <Select
              onValueChange={handleStatusFilter}
              value={statusFilter || "all"}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Tüm Durumlar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Durumlar</SelectItem>
                <SelectItem value="Active">Aktif</SelectItem>
                <SelectItem value="Draft">Taslak</SelectItem>
                <SelectItem value="Inactive">Pasif</SelectItem>
                <SelectItem value="Discontinued">Satıştan Kalktı</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reset Filters */}
          {(search ||
            typeFilter ||
            categoryFilter ||
            statusFilter ||
            stockStatusFilter) && (
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
                viewMode === "grid"
                  ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
              }`}
              onClick={() => handleViewMode("grid")}
              title="Görsel Kart Görünümü"
              type="button"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Product List (Table or Grid) */}
      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-3xl border border-zinc-200/80 bg-white shadow-xs dark:border-zinc-800/90 dark:bg-zinc-900">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <span className="font-medium text-xs text-zinc-500 dark:text-zinc-400">
              Ürün ve hizmetler yükleniyor...
            </span>
          </div>
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-zinc-200/80 border-dashed bg-white p-12 text-center shadow-xs dark:border-zinc-800/90 dark:bg-zinc-900">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
            <Package className="h-6 w-6" />
          </div>
          <h3 className="mt-3 font-bold text-sm text-zinc-900 dark:text-zinc-100">
            Ürün veya Hizmet Bulunamadı
          </h3>
          <p className="mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
            Arama kriterlerinize uygun kayıt bulunamadı veya henüz bir
            ürün/hizmet tanımlanmadı.
          </p>
          <PermissionGate permission="Products.Create">
            <button
              className="mt-4 flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white text-xs shadow-xs transition-all hover:bg-blue-700 active:scale-[0.98]"
              onClick={() => setIsCreateModalOpen(true)}
              type="button"
            >
              <Plus className="h-4 w-4" />
              <span>İlk Ürün / Hizmeti Ekle</span>
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
                  <th className="py-3.5 pr-4 pl-2">Ürün / Hizmet</th>
                  <th className="px-4 py-3.5">Kategori &amp; Marka</th>
                  <th className="px-4 py-3.5">Tip &amp; Durum</th>
                  <th className="px-4 py-3.5">Stok Durumu</th>
                  <th className="px-4 py-3.5 text-right">Maliyet</th>
                  <th className="px-4 py-3.5 text-right">Satış Fiyatı</th>
                  <th className="px-4 py-3.5 text-right">Kar Marjı</th>
                  <th className="py-3.5 pr-6 pl-4 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {products.map((p) => (
                  <tr
                    className={`group transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50 ${
                      selectedIds.has(p.id)
                        ? "bg-blue-50/60 dark:bg-blue-950/20"
                        : ""
                    }`}
                    key={p.id}
                  >
                    <td className="w-10 py-4 pr-2 pl-4">
                      <Checkbox
                        aria-label={`${p.name} seç`}
                        checked={selectedIds.has(p.id)}
                        onCheckedChange={() => toggleSelectOne(p.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="py-4 pr-4 pl-2">
                      <Link
                        className="flex items-center gap-3"
                        href={`/${tenantSlug}/products/${p.id}`}
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 font-bold text-xs text-zinc-600 shadow-2xs dark:bg-zinc-800 dark:text-zinc-400">
                          {p.images && p.images.length > 0 ? (
                            <img
                              alt={p.name}
                              className="h-full w-full rounded-xl object-cover"
                              src={p.images[0]}
                            />
                          ) : p.type === "Physical" ? (
                            <Package className="h-5 w-5 text-blue-600" />
                          ) : p.type === "Service" ? (
                            <Zap className="h-5 w-5 text-purple-600" />
                          ) : (
                            <Box className="h-5 w-5 text-emerald-600" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-zinc-900 transition-colors group-hover:text-blue-600 dark:text-zinc-100">
                            {p.name}
                          </div>
                          <div className="flex items-center gap-2 font-medium text-[10px] text-zinc-400 dark:text-zinc-500">
                            {p.sku && <span>SKU: {p.sku}</span>}
                            {p.barcode && (
                              <>
                                <span>•</span>
                                <span>Barkod: {p.barcode}</span>
                              </>
                            )}
                            {p.variantsCount > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-violet-600">
                                  {p.variantsCount} Varyant
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </Link>
                    </td>

                    <td className="px-4 py-4">
                      <div className="font-medium text-[11px] text-zinc-800 dark:text-zinc-200">
                        {p.categoryName || "Kategorisiz"}
                      </div>
                      {p.brand && (
                        <div className="text-[10px] text-zinc-400 dark:text-zinc-500">
                          {p.brand}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-flex items-center rounded-lg border px-2 py-0.5 font-semibold text-[10px] ${getTypeBadge(
                            p.type
                          )}`}
                        >
                          {getTypeLabel(p.type)}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-lg border px-2 py-0.5 font-semibold text-[10px] ${getStatusBadge(
                            p.status
                          )}`}
                        >
                          {p.status}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      {p.trackInventory && p.type === "Physical" ? (
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`font-bold text-xs ${
                                p.availableStock <= 0
                                  ? "text-rose-600"
                                  : p.isLowStock
                                    ? "text-amber-600"
                                    : "text-zinc-900 dark:text-zinc-100"
                              }`}
                            >
                              {p.currentStock} {p.unit}
                            </span>
                            {p.isLowStock && (
                              <span className="rounded bg-amber-100 px-1 py-0.2 font-bold text-[9px] text-amber-800">
                                Kritik
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-zinc-400 dark:text-zinc-500">
                            Min: {p.minStockLevel} {p.unit}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                          — (Stoksuz)
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-4 text-right">
                      <div className="font-medium text-xs text-zinc-600 dark:text-zinc-400">
                        ₺
                        {p.costPrice.toLocaleString("tr-TR", {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                    </td>

                    <td className="px-4 py-4 text-right">
                      <div className="font-extrabold text-xs text-zinc-900 dark:text-zinc-100">
                        ₺
                        {p.sellingPrice.toLocaleString("tr-TR", {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                      <div className="text-[10px] text-zinc-400 dark:text-zinc-500">
                        KDV: %{p.taxRate}
                      </div>
                    </td>

                    <td className="px-4 py-4 text-right">
                      <span
                        className={`inline-flex items-center rounded-lg px-2 py-0.5 font-bold text-[10px] ${
                          p.profitMargin >= 40
                            ? "bg-emerald-50 text-emerald-700"
                            : p.profitMargin > 0
                              ? "bg-blue-50 text-blue-700"
                              : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        %{Math.round(p.profitMargin)}
                      </span>
                    </td>

                    <td className="py-4 pr-6 pl-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {p.trackInventory && (
                          <PermissionGate permission="Products.StockAdjust">
                            <button
                              className="flex h-7 items-center gap-1 rounded-lg border border-zinc-200 px-2 font-semibold text-[10px] text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800"
                              onClick={() => setStockAdjustProduct(p)}
                              title="Stok Hareketi Ekle"
                              type="button"
                            >
                              <History className="h-3 w-3 text-blue-600" />
                              <span>Stok</span>
                            </button>
                          </PermissionGate>
                        )}
                        <Link
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                          href={`/${tenantSlug}/products/${p.id}`}
                          title="Detay Görüntüle"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                        <PermissionGate permission="Products.Delete">
                          <button
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 text-zinc-400 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-zinc-800 dark:text-zinc-500"
                            onClick={() => setDeletingProduct(p)}
                            title="Sil"
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
        /* Grid Card View */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <div
              className="group flex flex-col justify-between rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-xs transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-700 dark:border-zinc-800/90 dark:bg-zinc-900"
              key={p.id}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 font-bold text-sm shadow-2xs dark:bg-zinc-800">
                      {p.images && p.images.length > 0 ? (
                        <img
                          alt={p.name}
                          className="h-full w-full rounded-2xl object-cover"
                          src={p.images[0]}
                        />
                      ) : p.type === "Physical" ? (
                        <Package className="h-6 w-6 text-blue-600" />
                      ) : (
                        <Zap className="h-6 w-6 text-purple-600" />
                      )}
                    </div>
                    <div>
                      <Link
                        className="block font-bold text-sm text-zinc-900 transition-colors group-hover:text-blue-600 dark:text-zinc-100"
                        href={`/${tenantSlug}/products/${p.id}`}
                      >
                        {p.name}
                      </Link>
                      <div className="text-[10px] text-zinc-400 dark:text-zinc-500">
                        {p.categoryName || "Kategorisiz"}{" "}
                        {p.brand && `• ${p.brand}`}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`rounded-lg border px-2 py-0.5 font-semibold text-[10px] ${getTypeBadge(
                      p.type
                    )}`}
                  >
                    {getTypeLabel(p.type)}
                  </span>
                </div>

                {/* Stock & Price Strip */}
                <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-zinc-50 p-3 text-xs dark:bg-zinc-800/50">
                  <div>
                    <span className="font-medium text-[10px] text-zinc-400 dark:text-zinc-500">
                      Satış Fiyatı
                    </span>
                    <div className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">
                      ₺
                      {p.sellingPrice.toLocaleString("tr-TR", {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-[10px] text-zinc-400 dark:text-zinc-500">
                      Stok Miktarı
                    </span>
                    <div
                      className={`font-bold text-sm ${
                        p.availableStock <= 0
                          ? "text-rose-600"
                          : p.isLowStock
                            ? "text-amber-600"
                            : "text-zinc-800 dark:text-zinc-200"
                      }`}
                    >
                      {p.trackInventory
                        ? `${p.currentStock} ${p.unit}`
                        : "Hizmet"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="mt-4 flex items-center justify-between border-zinc-100 border-t pt-3 dark:border-zinc-800">
                <span
                  className={`inline-flex items-center rounded-lg px-2 py-0.5 font-bold text-[10px] ${
                    p.profitMargin >= 40
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-blue-50 text-blue-700"
                  }`}
                >
                  Kar: %{Math.round(p.profitMargin)}
                </span>

                <Link
                  className="flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-1.5 font-semibold text-white text-xs shadow-2xs transition-all hover:bg-blue-700 active:scale-[0.98]"
                  href={`/${tenantSlug}/products/${p.id}`}
                >
                  <span>Detay</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Product Modal */}
      {isCreateModalOpen && (
        <CreateProductModal
          categories={categories}
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            showToast("Yeni ürün/hizmet başarıyla eklendi.");
            setIsCreateModalOpen(false);
            loadData();
          }}
          tenantId={activeTenant?.id || ""}
        />
      )}

      {/* Category Manager Modal */}
      {isCategoryModalOpen && (
        <CategoryManagerModal
          categories={categories}
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
          onSuccess={() => {
            showToast("Kategoriler güncellendi.");
            loadData();
          }}
          tenantId={activeTenant?.id || ""}
        />
      )}

      {/* Quick Stock Adjust Modal */}
      {stockAdjustProduct && (
        <QuickStockAdjustModal
          isOpen={!!stockAdjustProduct}
          onClose={() => setStockAdjustProduct(null)}
          onSuccess={() => {
            showToast("Stok hareketi başarıyla işlendi.");
            setStockAdjustProduct(null);
            loadData();
          }}
          product={stockAdjustProduct}
          tenantId={activeTenant?.id || ""}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingProduct && (
        <div className="fade-in fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-md flex-col rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
              Ürünü Sil
            </h3>
            <p className="mt-2 text-xs text-zinc-600 leading-relaxed dark:text-zinc-400">
              <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
                {deletingProduct.name}
              </strong>{" "}
              isimli ürünü ve buna bağlı varyant ile stok geçmişini silmek
              istediğinize emin misiniz?
            </p>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                className="rounded-xl border border-zinc-200 px-4 py-2 font-semibold text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
                onClick={() => setDeletingProduct(null)}
                type="button"
              >
                Vazgeç
              </button>
              <button
                className="rounded-xl bg-rose-600 px-4 py-2 font-semibold text-white text-xs shadow-xs hover:bg-rose-700"
                onClick={handleDelete}
                type="button"
              >
                Evet, Ürünü Sil
              </button>
            </div>
          </div>
        </div>
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
    </div>
  );
}

function CreateProductModal({
  isOpen,
  onClose,
  onSuccess,
  tenantId,
  categories,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tenantId: string;
  categories: ProductCategoryDto[];
}) {
  const [formData, setFormData] = useState<CreateProductRequest>({
    barcode: "",
    brand: "",
    categoryId: "",
    costPrice: 0,
    currency: "TRY",
    description: "",
    discountRate: 0,
    initialStock: 0,
    minStockLevel: 5,
    name: "",
    sellingPrice: 0,
    sku: "",
    status: "Active",
    taxRate: 20,
    trackInventory: true,
    type: "Physical",
    unit: "Adet",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const cleanData: CreateProductRequest = {
        barcode: formData.barcode?.trim() || undefined,
        brand: formData.brand?.trim() || undefined,
        categoryId: formData.categoryId ? formData.categoryId : undefined,
        costPrice: Number(formData.costPrice) || 0,
        currency: formData.currency || "TRY",
        description: formData.description?.trim() || undefined,
        discountRate: Number(formData.discountRate) || 0,
        initialStock:
          formData.type === "Physical" && formData.trackInventory
            ? Number(formData.initialStock) || 0
            : 0,
        minStockLevel: Number(formData.minStockLevel) || 5,
        name: formData.name.trim(),
        sellingPrice: Number(formData.sellingPrice) || 0,
        sku: formData.sku?.trim() || undefined,
        status: formData.status || "Active",
        taxRate: Number(formData.taxRate) ?? 20,
        trackInventory:
          formData.type === "Physical" ? formData.trackInventory : false,
        type: formData.type,
        unit: formData.unit?.trim() || "Adet",
      };

      const res = await ApiClient.createProduct(cleanData, tenantId);
      if (res.success) {
        onSuccess();
      } else {
        setError(res.message || "Ürün eklenirken bir hata oluştu.");
      }
    } catch {
      setError("Bağlantı hatası oluştu.");
    } finally {
      setSubmitting(false);
    }
  };

  const calculatedMargin =
    formData.sellingPrice > 0
      ? Math.round(
          ((formData.sellingPrice - formData.costPrice) /
            formData.sellingPrice) *
            100
        )
      : 0;

  return (
    <div className="fade-in fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl border border-zinc-200/80 bg-white shadow-2xl dark:border-zinc-800/90 dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-center justify-between border-zinc-100 border-b p-5 dark:border-zinc-800">
          <div>
            <h2 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
              Yeni Ürün / Hizmet Ekle
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Fiziksel stoklu ürün, danışmanlık hizmeti veya abonelik paketi
              tanımlayın
            </p>
          </div>
          <button
            className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 dark:text-zinc-500 dark:hover:bg-zinc-800"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
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

          {/* Type Switcher */}
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-zinc-100 p-1 sm:grid-cols-4 dark:bg-zinc-800">
            <button
              className={`rounded-xl py-2 font-semibold transition-all ${
                formData.type === "Physical"
                  ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
              onClick={() =>
                setFormData({
                  ...formData,
                  trackInventory: true,
                  type: "Physical",
                })
              }
              type="button"
            >
              Fiziksel Ürün
            </button>
            <button
              className={`rounded-xl py-2 font-semibold transition-all ${
                formData.type === "Service"
                  ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
              onClick={() =>
                setFormData({
                  ...formData,
                  trackInventory: false,
                  type: "Service",
                })
              }
              type="button"
            >
              Hizmet / Servis
            </button>
            <button
              className={`rounded-xl py-2 font-semibold transition-all ${
                formData.type === "Digital"
                  ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
              onClick={() =>
                setFormData({
                  ...formData,
                  trackInventory: false,
                  type: "Digital",
                })
              }
              type="button"
            >
              Dijital Ürün
            </button>
            <button
              className={`rounded-xl py-2 font-semibold transition-all ${
                formData.type === "Subscription"
                  ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
              onClick={() =>
                setFormData({
                  ...formData,
                  trackInventory: false,
                  type: "Subscription",
                })
              }
              type="button"
            >
              Abonelik
            </button>
          </div>

          {/* Core Info */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label className="mb-1" required>
                Ürün / Hizmet Adı
              </Label>
              <Input
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Örn: Ergonomik Ofis Koltuğu veya Yıllık Bakım Anlaşması"
                required
                value={formData.name}
              />
            </div>

            <div>
              <Label className="mb-1">Kategori</Label>
              <Select
                onValueChange={(val) =>
                  setFormData({
                    ...formData,
                    categoryId: val === "none" ? "" : val,
                  })
                }
                value={formData.categoryId || "none"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Kategori Seçin (Opsiyonel)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    Kategori Seçin (Opsiyonel)
                  </SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.parentId ? `↳ ${c.fullPath || c.name}` : c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-1">Marka</Label>
              <Input
                onChange={(e) =>
                  setFormData({ ...formData, brand: e.target.value })
                }
                placeholder="Örn: Logitech, Apple, Acme"
                value={formData.brand}
              />
            </div>

            <div>
              <Label className="mb-1">Stok Kodu (SKU)</Label>
              <Input
                onChange={(e) =>
                  setFormData({ ...formData, sku: e.target.value })
                }
                placeholder="Örn: PRD-001"
                value={formData.sku}
              />
            </div>

            <div>
              <Label className="mb-1">Barkod (EAN/UPC)</Label>
              <Input
                onChange={(e) =>
                  setFormData({ ...formData, barcode: e.target.value })
                }
                placeholder="8690000000000"
                value={formData.barcode}
              />
            </div>
          </div>

          {/* Pricing & Tax Strip */}
          <div className="space-y-3 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-4 dark:border-zinc-800/90 dark:bg-zinc-800/30">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-zinc-900 dark:text-zinc-100">
                Fiyatlandırma & Vergi
              </h4>
              <span
                className={`rounded-lg px-2 py-0.5 font-bold text-[11px] ${
                  calculatedMargin >= 40
                    ? "bg-emerald-100 text-emerald-800"
                    : calculatedMargin > 0
                      ? "bg-blue-100 text-blue-800"
                      : "bg-slate-200 text-zinc-700 dark:text-zinc-300"
                }`}
              >
                Tahmini Kar Marjı: %{calculatedMargin}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <Label className="mb-1">Alış / Maliyet Fiyatı</Label>
                <NumberInput
                  min={0}
                  onChange={(val) =>
                    setFormData({
                      ...formData,
                      costPrice: val ?? 0,
                    })
                  }
                  prefix="₺"
                  step={0.01}
                  value={formData.costPrice}
                />
              </div>

              <div>
                <Label className="mb-1" required>
                  Satış Fiyatı
                </Label>
                <NumberInput
                  min={0}
                  onChange={(val) =>
                    setFormData({
                      ...formData,
                      sellingPrice: val ?? 0,
                    })
                  }
                  prefix="₺"
                  required
                  step={0.01}
                  value={formData.sellingPrice}
                />
              </div>

              <div>
                <Label className="mb-1">KDV Oranı (%)</Label>
                <Select
                  onValueChange={(val) =>
                    setFormData({
                      ...formData,
                      taxRate: Number.parseFloat(val) || 0,
                    })
                  }
                  value={String(formData.taxRate)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="20">%20 (Standart KDV)</SelectItem>
                    <SelectItem value="10">%10 (İndirimli KDV)</SelectItem>
                    <SelectItem value="1">%1 (Temel Gıda vb.)</SelectItem>
                    <SelectItem value="0">%0 (KDV Muaf)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Inventory Settings (Only for Physical) */}
          {formData.type === "Physical" && (
            <div className="space-y-3 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-4 dark:border-zinc-800/90 dark:bg-zinc-800/30">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-zinc-900 dark:text-zinc-100">
                  Stok & Envanter Ayarları
                </h4>
                <Checkbox
                  checked={formData.trackInventory}
                  label="Stok Takibi Yap"
                  onCheckedChange={(c) =>
                    setFormData({
                      ...formData,
                      trackInventory: Boolean(c),
                    })
                  }
                />
              </div>

              {formData.trackInventory && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <Label className="mb-1">Açılış Stok Miktarı</Label>
                    <NumberInput
                      min={0}
                      onChange={(val) =>
                        setFormData({
                          ...formData,
                          initialStock: val ?? 0,
                        })
                      }
                      showStepper
                      step={1}
                      value={formData.initialStock}
                    />
                  </div>

                  <div>
                    <Label className="mb-1">Kritik Stok Uyarısı</Label>
                    <NumberInput
                      min={0}
                      onChange={(val) =>
                        setFormData({
                          ...formData,
                          minStockLevel: val ?? 0,
                        })
                      }
                      showStepper
                      step={1}
                      value={formData.minStockLevel}
                    />
                  </div>

                  <div>
                    <Label className="mb-1">Birim</Label>
                    <Select
                      onValueChange={(val) =>
                        setFormData({ ...formData, unit: val })
                      }
                      value={formData.unit}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Adet">Adet</SelectItem>
                        <SelectItem value="Paket">Paket</SelectItem>
                        <SelectItem value="Koli">Koli</SelectItem>
                        <SelectItem value="Kg">Kg</SelectItem>
                        <SelectItem value="Litre">Litre</SelectItem>
                        <SelectItem value="Metre">Metre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Description */}
          <div>
            <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
              Açıklama / Detaylar
            </label>
            <textarea
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-zinc-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-800/50 dark:bg-zinc-900 dark:text-zinc-100"
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Ürün özellikleri, kullanım alanları veya hizmet kapsamı..."
              rows={2}
              value={formData.description}
            />
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
              className="rounded-xl bg-blue-600 px-5 py-2 font-semibold text-white shadow-xs transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50"
              disabled={submitting}
              type="submit"
            >
              {submitting ? "Kaydediliyor..." : "Ürünü Kaydet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function QuickStockAdjustModal({
  isOpen,
  onClose,
  onSuccess,
  tenantId,
  product,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tenantId: string;
  product: ProductListDto;
}) {
  const [formData, setFormData] = useState<AdjustProductStockRequest>({
    movementType: "In",
    notes: "",
    quantity: 1,
    reason: "",
    referenceNumber: "",
    unitCost: product.costPrice,
  });

  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.quantity <= 0) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await ApiClient.adjustProductStock(
        product.id,
        {
          ...formData,
          notes: formData.notes?.trim() || undefined,
          quantity: Number(formData.quantity),
          reason: formData.reason?.trim() || undefined,
          referenceNumber: formData.referenceNumber?.trim() || undefined,
          unitCost: formData.unitCost ? Number(formData.unitCost) : undefined,
        },
        tenantId
      );

      if (res.success) {
        onSuccess();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fade-in fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-md flex-col rounded-3xl border border-zinc-200 bg-white p-6 text-xs shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between border-zinc-100 border-b pb-4 dark:border-zinc-800">
          <div>
            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
              Hızlı Stok Hareketi
            </h3>
            <p className="max-w-xs truncate text-xs text-zinc-500 dark:text-zinc-400">
              {product.name}
            </p>
          </div>
          <button
            className="text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Current Stock Banner */}
        <div className="mb-4 flex items-center justify-between rounded-2xl bg-blue-50/70 p-3">
          <span className="font-semibold text-blue-900">Mevcut Stok:</span>
          <span className="font-extrabold text-blue-700 text-sm">
            {product.currentStock} {product.unit}
          </span>
        </div>

        <form className="space-y-3" onSubmit={handleSubmit}>
          <div>
            <Label className="mb-1">İşlem Türü</Label>
            <Select
              onValueChange={(val) =>
                setFormData({
                  ...formData,
                  movementType: val as any,
                })
              }
              value={formData.movementType}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="In">Stok Girişi (Alış / Üretim)</SelectItem>
                <SelectItem value="Out">
                  Stok Çıkışı (Kayıp / Hasar / Transfer)
                </SelectItem>
                <SelectItem value="Adjustment">
                  Sayım Düzeltmesi (Hedef Stok)
                </SelectItem>
                <SelectItem value="Return">Müşteri İadesi</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-1" required>
              {formData.movementType === "Adjustment"
                ? "Yeni Sayılan Stok Miktarı"
                : "Miktar"}
            </Label>
            <NumberInput
              min={0.01}
              onChange={(val) =>
                setFormData({
                  ...formData,
                  quantity: val ?? 0,
                })
              }
              required
              showStepper
              step={1}
              value={formData.quantity}
            />
          </div>

          {formData.movementType === "In" && (
            <div>
              <Label className="mb-1">Birim Alış Maliyeti (₺)</Label>
              <NumberInput
                min={0}
                onChange={(val) =>
                  setFormData({
                    ...formData,
                    unitCost: val ?? 0,
                  })
                }
                prefix="₺"
                step={0.01}
                value={formData.unitCost}
              />
            </div>
          )}

          <div>
            <Label className="mb-1">Fatura / İrsaliye No (Opsiyonel)</Label>
            <Input
              onChange={(e) =>
                setFormData({ ...formData, referenceNumber: e.target.value })
              }
              placeholder="Örn: IRS-2026-0042"
              value={formData.referenceNumber}
            />
          </div>

          <div>
            <Label className="mb-1">Açıklama / Neden</Label>
            <Input
              onChange={(e) =>
                setFormData({ ...formData, reason: e.target.value })
              }
              placeholder="Örn: Tedarikçi siparişi depoya indi"
              value={formData.reason}
            />
          </div>

          <div className="mt-4 flex items-center justify-end gap-2 border-zinc-100 border-t pt-4 dark:border-zinc-800">
            <button
              className="rounded-xl border border-zinc-200 px-4 py-2 font-semibold text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
              onClick={onClose}
              type="button"
            >
              Vazgeç
            </button>
            <button
              className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white shadow-xs transition-colors hover:bg-blue-700 disabled:opacity-50"
              disabled={submitting}
              type="submit"
            >
              {submitting ? "İşleniyor..." : "Hareketi Kaydet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CategoryManagerModal({
  isOpen,
  onClose,
  onSuccess,
  tenantId,
  categories,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tenantId: string;
  categories: ProductCategoryDto[];
}) {
  const [newCatName, setNewCatName] = useState("");
  const [newCatParentId, setNewCatParentId] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) {
    return null;
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await ApiClient.createProductCategory(
        {
          description: newCatDesc.trim() || undefined,
          name: newCatName.trim(),
          parentId: newCatParentId ? newCatParentId : undefined,
        },
        tenantId
      );

      if (res.success) {
        setNewCatName("");
        setNewCatParentId("");
        setNewCatDesc("");
        onSuccess();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await ApiClient.deleteProductCategory(id, tenantId);
      if (res.success) {
        onSuccess();
      }
    } catch {
      // ignore
    }
  };

  // Group root categories and their subcategories
  const rootCategories = categories.filter((c) => !c.parentId);
  const getSubcategories = (parentId: string) =>
    categories.filter((c) => c.parentId === parentId);

  return (
    <div className="fade-in fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-3xl border border-zinc-200 bg-white p-6 text-xs shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between border-zinc-100 border-b pb-4 dark:border-zinc-800">
          <div>
            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
              Kategori & Hiyerarşi Yönetimi
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Üst ve alt kategorileri (örn. Elektronik &gt; Küçük Ev Aletleri)
              yapılandırın
            </p>
          </div>
          <button
            className="text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Add Category Form */}
        <form
          className="mb-4 space-y-3 border-zinc-100 border-b pb-4 dark:border-zinc-800"
          onSubmit={handleCreate}
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <Label className="mb-1" required>
                Kategori Adı
              </Label>
              <Input
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Örn: Küçük Ev Aletleri"
                required
                value={newCatName}
              />
            </div>

            <div>
              <Label className="mb-1">Üst Kategori (Opsiyonel)</Label>
              <Select
                onValueChange={(val) =>
                  setNewCatParentId(val === "none" ? "" : val)
                }
                value={newCatParentId || "none"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="— Ana Kategori Olarak Ekle —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    — Ana Kategori Olarak Ekle —
                  </SelectItem>
                  {rootCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-end">
            <button
              className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white shadow-xs transition-colors hover:bg-blue-700 disabled:opacity-50"
              disabled={submitting || !newCatName.trim()}
              type="submit"
            >
              {submitting ? "Ekleniyor..." : "+ Kategoriyi Ekle"}
            </button>
          </div>
        </form>

        {/* Categories Hierarchical List */}
        <div className="flex-1 space-y-2 overflow-y-auto">
          {categories.length === 0 ? (
            <div className="py-6 text-center text-zinc-400 dark:text-zinc-500">
              Henüz kategori eklenmedi.
            </div>
          ) : (
            rootCategories.map((root) => {
              const subs = getSubcategories(root.id);
              return (
                <div className="space-y-1.5" key={root.id}>
                  {/* Root Category Row */}
                  <div className="flex items-center justify-between rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-3 dark:border-zinc-800/90 dark:bg-zinc-800/50">
                    <div className="flex items-center gap-2">
                      <FolderTree className="h-4 w-4 text-blue-600" />
                      <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                        {root.name}
                      </span>
                      <span className="rounded-md bg-slate-200/70 px-1.5 py-0.5 font-bold text-[10px] text-zinc-600 dark:text-zinc-400">
                        {root.productsCount} Ürün
                      </span>
                    </div>
                    <button
                      className="p-1 text-zinc-400 hover:text-rose-600 dark:text-zinc-500"
                      onClick={() => handleDelete(root.id)}
                      title="Ana Kategoriyi Sil"
                      type="button"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Subcategories */}
                  {subs.map((sub) => (
                    <div
                      className="ml-5 flex items-center justify-between rounded-2xl border border-zinc-100 bg-white p-2.5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900"
                      key={sub.id}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-400 dark:text-zinc-500">
                          ↳
                        </span>
                        <span className="font-semibold text-xs text-zinc-800 dark:text-zinc-200">
                          {sub.name}
                        </span>
                        <span className="font-medium text-[10px] text-zinc-400 dark:text-zinc-500">
                          ({sub.productsCount} Ürün)
                        </span>
                      </div>
                      <button
                        className="p-1 text-zinc-400 hover:text-rose-600 dark:text-zinc-500"
                        onClick={() => handleDelete(sub.id)}
                        title="Alt Kategoriyi Sil"
                        type="button"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
