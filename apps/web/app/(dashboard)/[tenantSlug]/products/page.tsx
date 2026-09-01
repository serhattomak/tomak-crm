"use client";

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
import { PermissionGate } from "@/components/permission-gate";
import {
  type AdjustProductStockRequest,
  ApiClient,
  type CreateProductRequest,
  type ProductCategoryDto,
  type ProductListDto,
  type ProductStatsDto,
} from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";

export default function ProductsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tenantSlug = (params?.tenantSlug as string) || "";
  const { activeTenant } = usePermissions();

  const [products, setProducts] = useState<ProductListDto[]>([]);
  const [categories, setCategories] = useState<ProductCategoryDto[]>([]);
  const [stats, setStats] = useState<ProductStatsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [stockStatusFilter, setStockStatusFilter] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

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

  const handlePublishToggle = async (product: ProductListDto) => {
    if (!activeTenant) {
      return;
    }
    const nextPublished = !product.isPublished;
    const prevProducts = [...products];
    setProducts((prev) =>
      prev.map((p) =>
        p.id === product.id ? { ...p, isPublished: nextPublished } : p
      )
    );
    const payload = {
      barcode: product.barcode || undefined,
      brand: product.brand || undefined,
      categoryId: product.categoryId || undefined,
      costPrice: product.costPrice,
      currency: product.currency || "TRY",
      description: undefined,
      discountRate: product.discountRate,
      images: product.images || undefined,
      isFeatured: product.isFeatured,
      isPublished: nextPublished,
      minStockLevel: product.minStockLevel,
      name: product.name,
      sellingPrice: product.sellingPrice,
      seoTitle: product.seoTitle || undefined,
      slug: product.slug || undefined,
      sortOrder: product.sortOrder,
      sku: product.sku || undefined,
      status: product.status || "Active",
      tags: product.tags || undefined,
      taxRate: product.taxRate,
      trackInventory: product.trackInventory,
      type: product.type,
      unit: product.unit || "Adet",
      weightKg: product.weightKg || undefined,
    };
    try {
      const res = await ApiClient.updateProduct(product.id, payload, activeTenant.id);
      if (res.success) {
        showToast(
          nextPublished
            ? `'${product.name}' mağazada yayınlandı.`
            : `'${product.name}' yayından kaldırıldı.`
        );
      } else {
        setProducts(prevProducts);
        showToast(res.message || "Yayın durumu güncellenemedi.");
      }
    } catch {
      setProducts(prevProducts);
      showToast("Bağlantı hatası oluştu.");
    }
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
            <h1 className="font-bold text-2xl text-zinc-900 dark:text-zinc-100 tracking-tight sm:text-3xl">
              Ürün & Hizmetler
            </h1>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 font-bold text-[11px] text-blue-700">
              {totalCount} Kayıt
            </span>
          </div>
          <p className="mt-0.5 text-zinc-500 dark:text-zinc-400 text-xs">
            Fiziksel stoklu ürünlerinizi, danışmanlık hizmetlerinizi ve abonelik
            paketlerinizi tek noktadan yönetin.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2 font-semibold text-zinc-700 dark:text-zinc-300 text-xs shadow-2xs hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            onClick={() => setIsCategoryModalOpen(true)}
            type="button"
          >
            <FolderTree className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
            <span>Kategoriler ({categories.length})</span>
          </button>

          <button
            className="flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2 font-semibold text-zinc-700 dark:text-zinc-300 text-xs shadow-2xs hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
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
        <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-medium text-zinc-500 dark:text-zinc-400 text-xs">
                Toplam Katalog
              </span>
              <div className="mt-1 font-extrabold text-2xl text-zinc-900 dark:text-zinc-100 tracking-tight sm:text-3xl">
                {stats?.totalProducts ?? 0}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Package className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 border-zinc-100 dark:border-zinc-800 border-t pt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
            <span>{stats?.physicalProductsCount ?? 0} Fiziksel</span>
            <span>•</span>
            <span>{stats?.servicesCount ?? 0} Hizmet</span>
            <span>•</span>
            <span>{stats?.subscriptionsCount ?? 0} Abonelik</span>
          </div>
        </div>

        {/* Total Inventory Valuation */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-medium text-zinc-500 dark:text-zinc-400 text-xs">
                Toplam Envanter Değeri (Maliyet)
              </span>
              <div className="mt-1 font-extrabold text-2xl text-zinc-900 dark:text-zinc-100 tracking-tight sm:text-3xl">
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
          <div className="mt-3 flex items-center gap-2 border-zinc-100 dark:border-zinc-800 border-t pt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
            <span>
              Satış Değeri: ₺
              {(stats?.totalRetailValue ?? 0).toLocaleString("tr-TR", {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-medium text-zinc-500 dark:text-zinc-400 text-xs">
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
          <div className="mt-3 flex items-center gap-2 border-zinc-100 dark:border-zinc-800 border-t pt-2 font-semibold text-[11px] text-rose-600">
            <span>{stats?.outOfStockCount ?? 0} Ürün Tükendi</span>
          </div>
        </div>

        {/* Active Services & Subscriptions */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-medium text-zinc-500 dark:text-zinc-400 text-xs">
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
          <div className="mt-3 flex items-center gap-2 border-zinc-100 dark:border-zinc-800 border-t pt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
            <span>Stoksuz katma değerli teklif kalemleri</span>
          </div>
        </div>
      </div>

      {/* 3. Filters & View Switcher Bar */}
      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-4 shadow-xs md:flex-row md:items-center">
        {/* Search */}
        <div className="relative max-w-md flex-1">
          <Search className="absolute top-2.5 left-3 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
          <input
            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 py-2 pr-4 pl-9 text-zinc-900 dark:text-zinc-100 text-xs placeholder:text-zinc-400 dark:text-zinc-500 focus:border-blue-500 focus:bg-white dark:bg-zinc-900 focus:outline-none"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ürün adı, SKU, Barkod veya Marka ara..."
            type="text"
            value={search}
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Type Filter */}
          <select
            className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 font-medium text-zinc-700 dark:text-zinc-300 text-xs focus:border-blue-500 focus:outline-none"
            onChange={(e) => setTypeFilter(e.target.value)}
            value={typeFilter}
          >
            <option value="">Tüm Tipler</option>
            <option value="Physical">Fiziksel Ürünler</option>
            <option value="Service">Hizmet / Danışmanlık</option>
            <option value="Digital">Dijital Ürün</option>
            <option value="Subscription">Abonelik / Lisans</option>
          </select>

          {/* Category Filter */}
          <select
            className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 font-medium text-zinc-700 dark:text-zinc-300 text-xs focus:border-blue-500 focus:outline-none"
            onChange={(e) => setCategoryFilter(e.target.value)}
            value={categoryFilter}
          >
            <option value="">Tüm Kategoriler</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.parentId ? `↳ ${c.fullPath || c.name}` : c.name} (
                {c.productsCount})
              </option>
            ))}
          </select>

          {/* Stock Status Filter */}
          <select
            className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 font-medium text-zinc-700 dark:text-zinc-300 text-xs focus:border-blue-500 focus:outline-none"
            onChange={(e) => setStockStatusFilter(e.target.value)}
            value={stockStatusFilter}
          >
            <option value="">Stok Durumu: Tümü</option>
            <option value="in_stock">Stokta Var</option>
            <option value="low_stock">Kritik Stok</option>
            <option value="out_of_stock">Tükendi (0)</option>
          </select>

          {/* Status Filter */}
          <select
            className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 font-medium text-zinc-700 dark:text-zinc-300 text-xs focus:border-blue-500 focus:outline-none"
            onChange={(e) => setStatusFilter(e.target.value)}
            value={statusFilter}
          >
            <option value="">Tüm Durumlar</option>
            <option value="Active">Aktif</option>
            <option value="Draft">Taslak</option>
            <option value="Inactive">Pasif</option>
            <option value="Discontinued">Satıştan Kalktı</option>
          </select>

          {/* Reset Filters */}
          {(search ||
            typeFilter ||
            categoryFilter ||
            statusFilter ||
            stockStatusFilter) && (
            <button
              className="flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 font-semibold text-rose-700 text-xs hover:bg-rose-100"
              onClick={() => {
                setSearch("");
                setTypeFilter("");
                setCategoryFilter("");
                setStatusFilter("");
                setStockStatusFilter("");
              }}
              type="button"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Sıfırla</span>
            </button>
          )}

          {/* View Switcher */}
          <div className="flex items-center rounded-xl bg-zinc-100 dark:bg-zinc-800 p-0.5">
            <button
              className={`rounded-lg p-1.5 transition-all ${
                viewMode === "table"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                  : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
              onClick={() => setViewMode("table")}
              title="Tablo Görünümü"
              type="button"
            >
              <TableIcon className="h-4 w-4" />
            </button>
            <button
              className={`rounded-lg p-1.5 transition-all ${
                viewMode === "grid"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                  : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
              onClick={() => setViewMode("grid")}
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
        <div className="flex h-64 items-center justify-center rounded-3xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 shadow-xs">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <span className="font-medium text-zinc-500 dark:text-zinc-400 text-xs">
              Ürün ve hizmetler yükleniyor...
            </span>
          </div>
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-zinc-200/80 dark:border-zinc-800/90 border-dashed bg-white dark:bg-zinc-900 p-12 text-center shadow-xs">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500">
            <Package className="h-6 w-6" />
          </div>
          <h3 className="mt-3 font-bold text-zinc-900 dark:text-zinc-100 text-sm">
            Ürün veya Hizmet Bulunamadı
          </h3>
          <p className="mt-1 max-w-sm text-zinc-500 dark:text-zinc-400 text-xs">
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
        <div className="overflow-hidden rounded-3xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-zinc-100 dark:border-zinc-800 border-b bg-zinc-50/50 dark:bg-zinc-800/30 font-medium text-[11px] text-zinc-500 dark:text-zinc-400">
                <tr>
                  <th className="py-3.5 pr-4 pl-6">Ürün / Hizmet</th>
                  <th className="px-4 py-3.5">Kategori & Marka</th>
                  <th className="px-4 py-3.5">Tip & Durum</th>
                  <th className="px-4 py-3.5">Stok Durumu</th>
                  <th className="px-4 py-3.5 text-right">Maliyet</th>
                  <th className="px-4 py-3.5 text-right">Satış Fiyatı</th>
                  <th className="px-4 py-3.5 text-right">Kar Marjı</th>
                  <th className="px-4 py-3.5 text-center">Yayın</th>
                  <th className="py-3.5 pr-6 pl-4 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {products.map((p) => (
                  <tr
                    className="group transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50"
                    key={p.id}
                  >
                    <td className="py-4 pr-4 pl-6">
                      <Link
                        className="flex items-center gap-3"
                        href={`/${tenantSlug}/products/${p.id}`}
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 font-bold text-zinc-600 dark:text-zinc-400 text-xs shadow-2xs">
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
                          <div className="font-bold text-zinc-900 dark:text-zinc-100 transition-colors group-hover:text-blue-600">
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
                      <div className="font-medium text-zinc-600 dark:text-zinc-400 text-xs">
                        ₺
                        {p.costPrice.toLocaleString("tr-TR", {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                    </td>

                    <td className="px-4 py-4 text-right">
                      <div className="font-extrabold text-zinc-900 dark:text-zinc-100 text-xs">
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

                    <td className="px-4 py-4 text-center">
                      <PermissionGate permission="Products.Update">
                        <button
                          aria-checked={p.isPublished}
                          aria-label={p.isPublished ? "Yayından kaldır" : "Mağazada yayınla"}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                            p.isPublished
                              ? "border-emerald-500 bg-emerald-500"
                              : "border-zinc-300 bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-700"
                          }`}
                          onClick={() => handlePublishToggle(p)}
                          role="switch"
                          type="button"
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                              p.isPublished ? "translate-x-4" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </PermissionGate>
                      <div className="mt-0.5 text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                        {p.isPublished ? "Yayında" : "Taslak"}
                      </div>
                    </td>

                    <td className="py-4 pr-6 pl-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {p.trackInventory && (
                          <PermissionGate permission="Products.StockAdjust">
                            <button
                              className="flex h-7 items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-800 px-2 font-semibold text-[10px] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
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
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-200"
                          href={`/${tenantSlug}/products/${p.id}`}
                          title="Detay Görüntüle"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                        <PermissionGate permission="Products.Delete">
                          <button
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
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
              className="group flex flex-col justify-between rounded-3xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-5 shadow-xs transition-all hover:border-zinc-300 dark:border-zinc-700 hover:shadow-md"
              key={p.id}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-bold text-sm shadow-2xs">
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
                        className="block font-bold text-zinc-900 dark:text-zinc-100 text-sm transition-colors group-hover:text-blue-600"
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
                <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 p-3 text-xs">
                  <div>
                    <span className="font-medium text-[10px] text-zinc-400 dark:text-zinc-500">
                      Satış Fiyatı
                    </span>
                    <div className="font-extrabold text-zinc-900 dark:text-zinc-100 text-sm">
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
              <div className="mt-4 flex items-center justify-between border-zinc-100 dark:border-zinc-800 border-t pt-3">
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
          <div className="flex w-full max-w-md flex-col rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl">
            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">Ürünü Sil</h3>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400 text-xs leading-relaxed">
              <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
                {deletingProduct.name}
              </strong>{" "}
              isimli ürünü ve buna bağlı varyant ile stok geçmişini silmek
              istediğinize emin misiniz?
            </p>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 px-4 py-2 font-semibold text-zinc-600 dark:text-zinc-400 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
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
    isFeatured: false,
    isPublished: false,
    minStockLevel: 5,
    name: "",
    sellingPrice: 0,
    seoTitle: "",
    slug: "",
    sortOrder: 0,
    sku: "",
    status: "Active",
    taxRate: 20,
    trackInventory: true,
    type: "Physical",
    unit: "Adet",
    weightKg: undefined,
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSlugTouched, setIsSlugTouched] = useState(false);

  const slugify = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .replace(/ı/g, "i")
      .replace(/ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/ş/g, "s")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c")
      .replace(/[\s_]+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-{2,}/g, "-")
      .replace(/^-|-$/g, "");

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
        isFeatured: Boolean(formData.isFeatured),
        isPublished: Boolean(formData.isPublished),
        minStockLevel: Number(formData.minStockLevel) || 5,
        name: formData.name.trim(),
        sellingPrice: Number(formData.sellingPrice) || 0,
        seoTitle: formData.seoTitle?.trim() || undefined,
        slug: formData.slug?.trim()
          ? slugify(formData.slug.trim())
          : slugify(formData.name.trim()),
        sortOrder: Number(formData.sortOrder) || 0,
        sku: formData.sku?.trim() || undefined,
        status: formData.status || "Active",
        taxRate: Number(formData.taxRate) ?? 20,
        trackInventory:
          formData.type === "Physical" ? formData.trackInventory : false,
        type: formData.type,
        unit: formData.unit?.trim() || "Adet",
        weightKg: formData.weightKg ? Number(formData.weightKg) : undefined,
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
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-zinc-100 dark:border-zinc-800 border-b p-5">
          <div>
            <h2 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
              Yeni Ürün / Hizmet Ekle
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs">
              Fiziksel stoklu ürün, danışmanlık hizmeti veya abonelik paketi
              tanımlayın
            </p>
          </div>
          <button
            className="rounded-full p-2 text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
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
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-zinc-100 dark:bg-zinc-800 p-1 sm:grid-cols-4">
            <button
              className={`rounded-xl py-2 font-semibold transition-all ${
                formData.type === "Physical"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
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
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
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
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
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
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
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
              <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                Ürün / Hizmet Adı *
              </label>
              <input
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-3.5 py-2 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:text-zinc-500 focus:border-blue-500 focus:bg-white dark:bg-zinc-900 focus:outline-none"
                onChange={(e) => {
                  const newName = e.target.value;
                  setFormData((prev) => ({
                    ...prev,
                    name: newName,
                    slug: isSlugTouched ? prev.slug : slugify(newName),
                  }));
                }}
                placeholder="Örn: Ergonomik Ofis Koltuğu veya Yıllık Bakım Anlaşması"
                required
                type="text"
                value={formData.name}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                Slug (URL) <span className="text-zinc-400 font-normal">— otomatik oluşur, düzenlenebilir</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-zinc-400 text-[11px]">/urun/</span>
                <input
                  className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-3.5 py-2 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:text-zinc-500 focus:border-blue-500 focus:bg-white dark:bg-zinc-900 focus:outline-none"
                  onChange={(e) => {
                    setIsSlugTouched(true);
                    setFormData({ ...formData, slug: e.target.value });
                  }}
                  placeholder="ornek-urun-slug"
                  type="text"
                  value={formData.slug}
                />
              </div>
              <p className="mt-1 text-[11px] text-zinc-400">
                Boş bırakırsanız ürün adından otomatik oluşturulur. Sadece küçük harf, rakam ve tire kullanılır.
              </p>
            </div>

            <div>
              <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                Kategori
              </label>
              <select
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-3.5 py-2 text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:bg-white dark:bg-zinc-900 focus:outline-none"
                onChange={(e) =>
                  setFormData({ ...formData, categoryId: e.target.value })
                }
                value={formData.categoryId}
              >
                <option value="">Kategori Seçin (Opsiyonel)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.parentId ? `↳ ${c.fullPath || c.name}` : c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                Marka
              </label>
              <input
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-3.5 py-2 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:text-zinc-500 focus:border-blue-500 focus:bg-white dark:bg-zinc-900 focus:outline-none"
                onChange={(e) =>
                  setFormData({ ...formData, brand: e.target.value })
                }
                placeholder="Örn: Logitech, Apple, Acme"
                type="text"
                value={formData.brand}
              />
            </div>

            <div>
              <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                Stok Kodu (SKU)
              </label>
              <input
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-3.5 py-2 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:text-zinc-500 focus:border-blue-500 focus:bg-white dark:bg-zinc-900 focus:outline-none"
                onChange={(e) =>
                  setFormData({ ...formData, sku: e.target.value })
                }
                placeholder="Örn: PRD-001"
                type="text"
                value={formData.sku}
              />
            </div>

            <div>
              <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                Barkod (EAN/UPC)
              </label>
              <input
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-3.5 py-2 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:text-zinc-500 focus:border-blue-500 focus:bg-white dark:bg-zinc-900 focus:outline-none"
                onChange={(e) =>
                  setFormData({ ...formData, barcode: e.target.value })
                }
                placeholder="8690000000000"
                type="text"
                value={formData.barcode}
              />
            </div>
          </div>

          {/* Pricing & Tax Strip */}
          <div className="space-y-3 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-zinc-50/50 dark:bg-zinc-800/30 p-4">
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
                <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                  Alış / Maliyet Fiyatı
                </label>
                <input
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2 text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:outline-none"
                  min="0"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      costPrice: Number.parseFloat(e.target.value) || 0,
                    })
                  }
                  step="0.01"
                  type="number"
                  value={formData.costPrice}
                />
              </div>

              <div>
                <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                  Satış Fiyatı *
                </label>
                <input
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2 text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:outline-none"
                  min="0"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sellingPrice: Number.parseFloat(e.target.value) || 0,
                    })
                  }
                  required
                  step="0.01"
                  type="number"
                  value={formData.sellingPrice}
                />
              </div>

              <div>
                <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                  KDV Oranı (%)
                </label>
                <select
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2 text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:outline-none"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      taxRate: Number.parseFloat(e.target.value) || 0,
                    })
                  }
                  value={formData.taxRate}
                >
                  <option value="20">%20 (Standart KDV)</option>
                  <option value="10">%10 (İndirimli KDV)</option>
                  <option value="1">%1 (Temel Gıda vb.)</option>
                  <option value="0">%0 (KDV Muaf)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Inventory Settings (Only for Physical) */}
          {formData.type === "Physical" && (
            <div className="space-y-3 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-zinc-50/50 dark:bg-zinc-800/30 p-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-zinc-900 dark:text-zinc-100">
                  Stok & Envanter Ayarları
                </h4>
                <label className="flex cursor-pointer items-center gap-1.5 text-zinc-700 dark:text-zinc-300 text-xs">
                  <input
                    checked={formData.trackInventory}
                    className="rounded text-blue-600"
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        trackInventory: e.target.checked,
                      })
                    }
                    type="checkbox"
                  />
                  <span>Stok Takibi Yap</span>
                </label>
              </div>

              {formData.trackInventory && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                      Açılış Stok Miktarı
                    </label>
                    <input
                      className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2 text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:outline-none"
                      min="0"
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          initialStock: Number.parseFloat(e.target.value) || 0,
                        })
                      }
                      type="number"
                      value={formData.initialStock}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                      Kritik Stok Uyarısı
                    </label>
                    <input
                      className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2 text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:outline-none"
                      min="0"
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          minStockLevel: Number.parseFloat(e.target.value) || 0,
                        })
                      }
                      type="number"
                      value={formData.minStockLevel}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                      Birim
                    </label>
                    <select
                      className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2 text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:outline-none"
                      onChange={(e) =>
                        setFormData({ ...formData, unit: e.target.value })
                      }
                      value={formData.unit}
                    >
                      <option value="Adet">Adet</option>
                      <option value="Paket">Paket</option>
                      <option value="Kutu">Kutu</option>
                      <option value="Kg">Kg</option>
                      <option value="Litre">Litre</option>
                      <option value="Metre">Metre</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mağaza Vitrin Ayarları */}
          <div className="space-y-3 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-zinc-50/50 dark:bg-zinc-800/30 p-4">
            <h4 className="font-bold text-zinc-900 dark:text-zinc-100">Mağaza Vitrin Ayarları</h4>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <button
                  aria-checked={Boolean(formData.isPublished)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full border transition-colors ${
                    formData.isPublished
                      ? "border-emerald-500 bg-emerald-500"
                      : "border-zinc-300 bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-700"
                  }`}
                  onClick={() => setFormData({ ...formData, isPublished: !formData.isPublished })}
                  role="switch"
                  type="button"
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                      formData.isPublished ? "translate-x-4" : "translate-x-1"
                    }`}
                  />
                </button>
                <span className="font-medium text-zinc-700 dark:text-zinc-300">Mağazada Yayınla</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  checked={Boolean(formData.isFeatured)}
                  className="rounded text-blue-600"
                  onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                  type="checkbox"
                />
                <span className="font-medium text-zinc-700 dark:text-zinc-300">Öne Çıkan (Vitrin)</span>
              </label>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">Sıralama (Sort Order)</label>
                <input
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2 text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:outline-none"
                  min="0"
                  onChange={(e) => setFormData({ ...formData, sortOrder: Number.parseInt(e.target.value, 10) || 0 })}
                  type="number"
                  value={formData.sortOrder ?? 0}
                />
              </div>
              <div>
                <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">Ağırlık (kg)</label>
                <input
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2 text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:outline-none"
                  min="0"
                  onChange={(e) => setFormData({ ...formData, weightKg: e.target.value ? Number.parseFloat(e.target.value) : undefined })}
                  placeholder="Örn: 1.5"
                  step="0.01"
                  type="number"
                  value={formData.weightKg ?? ""}
                />
              </div>
              <div className="sm:col-span-1">
                <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">SEO Başlığı</label>
                <input
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2 text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:outline-none"
                  maxLength={255}
                  onChange={(e) => setFormData({ ...formData, seoTitle: e.target.value })}
                  placeholder="SEO title (opsiyonel)"
                  type="text"
                  value={formData.seoTitle ?? ""}
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
              Açıklama / Detaylar
            </label>
            <textarea
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-3.5 py-2 text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:bg-white dark:bg-zinc-900 focus:outline-none"
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Ürün özellikleri, kullanım alanları veya hizmet kapsamı..."
              rows={2}
              value={formData.description}
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-zinc-100 dark:border-zinc-800 border-t pt-4">
            <button
              className="rounded-xl border border-zinc-200 dark:border-zinc-800 px-4 py-2 font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
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
      <div className="flex w-full max-w-md flex-col rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 text-xs shadow-2xl">
        <div className="mb-4 flex items-center justify-between border-zinc-100 dark:border-zinc-800 border-b pb-4">
          <div>
            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
              Hızlı Stok Hareketi
            </h3>
            <p className="max-w-xs truncate text-zinc-500 dark:text-zinc-400 text-xs">
              {product.name}
            </p>
          </div>
          <button
            className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
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
            <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
              İşlem Türü
            </label>
            <select
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2 text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:outline-none"
              onChange={(e) =>
                setFormData({
                  ...formData,
                  movementType: e.target.value as any,
                })
              }
              value={formData.movementType}
            >
              <option value="In">Stok Girişi (Alış / Üretim)</option>
              <option value="Out">
                Stok Çıkışı (Kayıp / Hasar / Transfer)
              </option>
              <option value="Adjustment">Sayım Düzeltmesi (Hedef Stok)</option>
              <option value="Return">Müşteri İadesi</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
              {formData.movementType === "Adjustment"
                ? "Yeni Sayılan Stok Miktarı *"
                : "Miktar *"}
            </label>
            <input
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 p-2 text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:bg-white dark:bg-zinc-900 focus:outline-none"
              min="0.01"
              onChange={(e) =>
                setFormData({
                  ...formData,
                  quantity: Number.parseFloat(e.target.value) || 0,
                })
              }
              required
              step="0.01"
              type="number"
              value={formData.quantity}
            />
          </div>

          {formData.movementType === "In" && (
            <div>
              <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                Birim Alış Maliyeti (₺)
              </label>
              <input
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 p-2 text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:bg-white dark:bg-zinc-900 focus:outline-none"
                min="0"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    unitCost: Number.parseFloat(e.target.value) || 0,
                  })
                }
                step="0.01"
                type="number"
                value={formData.unitCost}
              />
            </div>
          )}

          <div>
            <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
              Fatura / İrsaliye No (Opsiyonel)
            </label>
            <input
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 p-2 text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:bg-white dark:bg-zinc-900 focus:outline-none"
              onChange={(e) =>
                setFormData({ ...formData, referenceNumber: e.target.value })
              }
              placeholder="Örn: IRS-2026-0042"
              type="text"
              value={formData.referenceNumber}
            />
          </div>

          <div>
            <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
              Açıklama / Neden
            </label>
            <input
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 p-2 text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:bg-white dark:bg-zinc-900 focus:outline-none"
              onChange={(e) =>
                setFormData({ ...formData, reason: e.target.value })
              }
              placeholder="Örn: Tedarikçi siparişi depoya indi"
              type="text"
              value={formData.reason}
            />
          </div>

          <div className="mt-4 flex items-center justify-end gap-2 border-zinc-100 dark:border-zinc-800 border-t pt-4">
            <button
              className="rounded-xl border border-zinc-200 dark:border-zinc-800 px-4 py-2 font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
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
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 text-xs shadow-2xl">
        <div className="mb-4 flex items-center justify-between border-zinc-100 dark:border-zinc-800 border-b pb-4">
          <div>
            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
              Kategori & Hiyerarşi Yönetimi
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs">
              Üst ve alt kategorileri (örn. Elektronik &gt; Küçük Ev Aletleri)
              yapılandırın
            </p>
          </div>
          <button
            className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Add Category Form */}
        <form
          className="mb-4 space-y-3 border-zinc-100 dark:border-zinc-800 border-b pb-4"
          onSubmit={handleCreate}
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                Kategori Adı *
              </label>
              <input
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 p-2 text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:bg-white dark:bg-zinc-900 focus:outline-none"
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Örn: Küçük Ev Aletleri"
                required
                type="text"
                value={newCatName}
              />
            </div>

            <div>
              <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                Üst Kategori (Opsiyonel)
              </label>
              <select
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 p-2 text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:bg-white dark:bg-zinc-900 focus:outline-none"
                onChange={(e) => setNewCatParentId(e.target.value)}
                value={newCatParentId}
              >
                <option value="">— Ana Kategori Olarak Ekle —</option>
                {rootCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
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
                  <div className="flex items-center justify-between rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-zinc-50/80 dark:bg-zinc-800/50 p-3">
                    <div className="flex items-center gap-2">
                      <FolderTree className="h-4 w-4 text-blue-600" />
                      <span className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                        {root.name}
                      </span>
                      <span className="rounded-md bg-slate-200/70 px-1.5 py-0.5 font-bold text-[10px] text-zinc-600 dark:text-zinc-400">
                        {root.productsCount} Ürün
                      </span>
                    </div>
                    <button
                      className="p-1 text-zinc-400 dark:text-zinc-500 hover:text-rose-600"
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
                      className="ml-5 flex items-center justify-between rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2.5 shadow-2xs"
                      key={sub.id}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-400 dark:text-zinc-500">↳</span>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200 text-xs">
                          {sub.name}
                        </span>
                        <span className="font-medium text-[10px] text-zinc-400 dark:text-zinc-500">
                          ({sub.productsCount} Ürün)
                        </span>
                      </div>
                      <button
                        className="p-1 text-zinc-400 dark:text-zinc-500 hover:text-rose-600"
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
