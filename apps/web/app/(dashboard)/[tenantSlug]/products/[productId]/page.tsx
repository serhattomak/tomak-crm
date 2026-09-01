"use client";

import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Edit,
  History,
  Package,
  Plus,
  RotateCcw,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { PermissionGate } from "@/components/permission-gate";
import {
  type AddProductVariantRequest,
  type AdjustProductStockRequest,
  ApiClient,
  type ProductCategoryDto,
  type ProductDetailDto,
  type UpdateProductRequest,
} from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = (params?.tenantSlug as string) || "";
  const productId = (params?.productId as string) || "";
  const { activeTenant } = usePermissions();

  const [product, setProduct] = useState<ProductDetailDto | null>(null);
  const [categories, setCategories] = useState<ProductCategoryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "overview" | "variants" | "movements" | "pricing"
  >("overview");

  // Modals
  const [isStockAdjustModalOpen, setIsStockAdjustModalOpen] = useState(false);
  const [isAddVariantModalOpen, setIsAddVariantModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Quick inline stock adjustment state
  const [quickAdjType, setQuickAdjType] = useState<"In" | "Out" | "Adjustment">(
    "In"
  );
  const [quickAdjQty, setQuickAdjQty] = useState(1);
  const [quickAdjReason, setQuickAdjReason] = useState("");
  const [submittingAdj, setSubmittingAdj] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = useCallback(async () => {
    if (!(activeTenant && productId)) {
      return;
    }
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        ApiClient.getProductById(productId, activeTenant.id),
        ApiClient.getProductCategories(activeTenant.id),
      ]);

      if (prodRes.success && prodRes.data) {
        setProduct(prodRes.data);
      } else {
        showToast("Ürün bulunamadı.");
        router.push(`/${tenantSlug}/products`);
      }

      if (catRes.success && catRes.data) {
        setCategories(catRes.data);
      }
    } catch {
      showToast("Ürün bilgileri yüklenirken hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, [activeTenant, productId, tenantSlug, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleQuickAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(activeTenant && product) || quickAdjQty <= 0) {
      return;
    }

    setSubmittingAdj(true);
    try {
      const res = await ApiClient.adjustProductStock(
        product.id,
        {
          movementType: quickAdjType,
          quantity: Number(quickAdjQty),
          reason: quickAdjReason.trim() || undefined,
          unitCost: quickAdjType === "In" ? product.costPrice : undefined,
        },
        activeTenant.id
      );

      if (res.success) {
        showToast("Stok hareketi başarıyla kaydedildi.");
        setQuickAdjQty(1);
        setQuickAdjReason("");
        loadData();
      }
    } finally {
      setSubmittingAdj(false);
    }
  };

  const handleDeleteVariant = async (variantId: string) => {
    if (!(activeTenant && product)) {
      return;
    }
    try {
      const res = await ApiClient.deleteProductVariant(
        product.id,
        variantId,
        activeTenant.id
      );
      if (res.success) {
        showToast("Varyant silindi.");
        loadData();
      }
    } catch {
      showToast("Varyant silinirken hata oluştu.");
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center rounded-3xl border border-zinc-200/80 bg-white shadow-xs dark:border-zinc-800/90 dark:bg-zinc-900">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <span className="font-medium text-xs text-zinc-500 dark:text-zinc-400">
            Ürün detayları yükleniyor...
          </span>
        </div>
      </div>
    );
  }

  if (!product) {
    return null;
  }

  const tabs = [
    { id: "overview", label: "Genel Bakış" },
    { id: "variants", label: `Varyantlar (${product.variants.length})` },
    {
      id: "movements",
      label: `Stok Hareketleri (${product.stockMovements.length})`,
    },
    { id: "pricing", label: "Fiyat & Karlılık Analizi" },
  ];

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

  const getMovementIcon = (type: string) => {
    switch (type) {
      case "In":
      case "Return":
        return <ArrowDownRight className="h-3.5 w-3.5 text-emerald-600" />;
      case "Out":
        return <ArrowUpRight className="h-3.5 w-3.5 text-rose-600" />;
      case "Adjustment":
        return <RotateCcw className="h-3.5 w-3.5 text-blue-600" />;
      default:
        return (
          <History className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-400" />
        );
    }
  };

  const getMovementLabel = (type: string) => {
    switch (type) {
      case "In":
        return "Stok Girişi";
      case "Out":
        return "Stok Çıkışı";
      case "Adjustment":
        return "Sayım Düzeltmesi";
      case "Return":
        return "Müşteri İadesi";
      default:
        return type;
    }
  };

  const taxInclusivePrice = product.sellingPrice * (1 + product.taxRate / 100);
  const grossProfit = product.sellingPrice - product.costPrice;

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
      <div className="flex flex-col justify-between gap-4 border-zinc-100 border-b pb-4 sm:flex-row sm:items-center dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <Link
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-2xs transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
            href={`/${tenantSlug}/products`}
            title="Kataloğa Dön"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-100 font-bold text-base text-blue-600 shadow-xs dark:bg-zinc-800">
              {product.type === "Physical" ? (
                <Package className="h-6 w-6" />
              ) : (
                <Zap className="h-6 w-6 text-purple-600" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-xl text-zinc-900 tracking-tight sm:text-2xl dark:text-zinc-100">
                  {product.name}
                </h1>
                <span
                  className={`rounded-lg border px-2 py-0.5 font-bold text-[10px] ${getTypeBadge(
                    product.type
                  )}`}
                >
                  {product.type}
                </span>
                {product.trackInventory && product.isLowStock && (
                  <span className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-0.5 font-bold text-[10px] text-amber-700">
                    Kritik Stok
                  </span>
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <span>{product.categoryName || "Kategorisiz"}</span>
                {product.brand && (
                  <>
                    <span>•</span>
                    <span>Marka: {product.brand}</span>
                  </>
                )}
                {product.sku && (
                  <>
                    <span>•</span>
                    <span>SKU: {product.sku}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {product.trackInventory && (
            <PermissionGate permission="Products.StockAdjust">
              <button
                className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 font-semibold text-xs text-zinc-700 shadow-2xs transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
                onClick={() => setIsStockAdjustModalOpen(true)}
                type="button"
              >
                <History className="h-3.5 w-3.5 text-blue-600" />
                <span>Stok Hareketi İşle</span>
              </button>
            </PermissionGate>
          )}

          <PermissionGate permission="Products.Update">
            <button
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white text-xs shadow-xs transition-all hover:bg-blue-700 active:scale-[0.98]"
              onClick={() => setIsEditModalOpen(true)}
              type="button"
            >
              <Edit className="h-3.5 w-3.5" />
              <span>Düzenle</span>
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* 2. Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Summary Info & Cards (4 Cols) */}
        <div className="space-y-6 lg:col-span-4">
          {/* Card: Pricing & Margins */}
          <div className="space-y-4 rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-xs dark:border-zinc-800/90 dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                Fiyatlandırma & Karlılık
              </h3>
              <span
                className={`rounded-lg px-2 py-0.5 font-bold text-[10px] ${
                  product.profitMargin >= 40
                    ? "bg-emerald-100 text-emerald-800"
                    : product.profitMargin > 0
                      ? "bg-blue-100 text-blue-800"
                      : "bg-rose-100 text-rose-800"
                }`}
              >
                Kar: %{Math.round(product.profitMargin)}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between border-zinc-100 border-b py-1.5 dark:border-zinc-800">
                <span className="text-zinc-500 dark:text-zinc-400">
                  Satış Fiyatı (KDV Hariç)
                </span>
                <span className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">
                  ₺
                  {product.sellingPrice.toLocaleString("tr-TR", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>

              <div className="flex items-center justify-between border-zinc-100 border-b py-1.5 dark:border-zinc-800">
                <span className="text-zinc-500 dark:text-zinc-400">
                  KDV Oranı & Dahil Fiyat
                </span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  %{product.taxRate} (₺
                  {taxInclusivePrice.toLocaleString("tr-TR", {
                    minimumFractionDigits: 2,
                  })}
                  )
                </span>
              </div>

              <div className="flex items-center justify-between border-zinc-100 border-b py-1.5 dark:border-zinc-800">
                <span className="text-zinc-500 dark:text-zinc-400">
                  Alış / Maliyet Fiyatı
                </span>
                <span className="font-semibold text-zinc-600 dark:text-zinc-400">
                  ₺
                  {product.costPrice.toLocaleString("tr-TR", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 pt-2">
                <span className="font-bold text-zinc-700 dark:text-zinc-300">
                  Birim Başına Brüt Kar
                </span>
                <span className="font-extrabold text-emerald-600 text-sm">
                  ₺
                  {grossProfit.toLocaleString("tr-TR", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Card: Inventory Stock Status */}
          {product.trackInventory && product.type === "Physical" && (
            <div className="space-y-4 rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-xs dark:border-zinc-800/90 dark:bg-zinc-900">
              <h3 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                Envanter & Stok Seviyesi
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-2xl bg-blue-50/60 p-3">
                  <span className="font-semibold text-[10px] text-blue-600 uppercase">
                    Mevcut Stok
                  </span>
                  <div className="mt-1 font-extrabold text-blue-950 text-lg">
                    {product.currentStock} {product.unit}
                  </div>
                </div>

                <div className="rounded-2xl bg-zinc-50 p-3 dark:bg-zinc-800/50">
                  <span className="font-semibold text-[10px] text-zinc-500 uppercase dark:text-zinc-400">
                    Kullanılabilir
                  </span>
                  <div className="mt-1 font-extrabold text-lg text-zinc-900 dark:text-zinc-100">
                    {product.availableStock} {product.unit}
                  </div>
                </div>

                <div className="rounded-2xl bg-zinc-50 p-3 dark:bg-zinc-800/50">
                  <span className="font-semibold text-[10px] text-zinc-500 uppercase dark:text-zinc-400">
                    Rezerve
                  </span>
                  <div className="mt-1 font-bold text-sm text-zinc-700 dark:text-zinc-300">
                    {product.reservedStock} {product.unit}
                  </div>
                </div>

                <div className="rounded-2xl bg-zinc-50 p-3 dark:bg-zinc-800/50">
                  <span className="font-semibold text-[10px] text-zinc-500 uppercase dark:text-zinc-400">
                    Kritik Eşik
                  </span>
                  <div className="mt-1 font-bold text-sm text-zinc-700 dark:text-zinc-300">
                    {product.minStockLevel} {product.unit}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Card: Meta details */}
          <div className="space-y-3 rounded-3xl border border-zinc-200/80 bg-white p-5 text-xs shadow-xs dark:border-zinc-800/90 dark:bg-zinc-900">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100">
              Teknik & Kimlik Bilgileri
            </h3>
            <div className="space-y-2 text-zinc-600 dark:text-zinc-400">
              {product.barcode && (
                <div className="flex justify-between">
                  <span className="text-zinc-400 dark:text-zinc-500">
                    Barkod (EAN):
                  </span>
                  <span className="font-medium font-mono text-zinc-800 dark:text-zinc-200">
                    {product.barcode}
                  </span>
                </div>
              )}
              {product.sku && (
                <div className="flex justify-between">
                  <span className="text-zinc-400 dark:text-zinc-500">
                    Stok Kodu (SKU):
                  </span>
                  <span className="font-medium font-mono text-zinc-800 dark:text-zinc-200">
                    {product.sku}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-zinc-400 dark:text-zinc-500">
                  Ölçü Birimi:
                </span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  {product.unit}
                </span>
              </div>
              {product.description && (
                <div className="mt-2 border-zinc-100 border-t pt-2 dark:border-zinc-800">
                  <span className="mb-1 block text-zinc-400 dark:text-zinc-500">
                    Açıklama:
                  </span>
                  <p className="text-zinc-700 leading-relaxed dark:text-zinc-300">
                    {product.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Tabbed Views (8 Cols) */}
        <div className="space-y-6 lg:col-span-8">
          {/* Pill Tabs */}
          <div className="flex flex-wrap items-center gap-1 rounded-2xl bg-zinc-100 p-1 dark:bg-zinc-800/90">
            {tabs.map((tab) => (
              <button
                className={`rounded-xl px-4 py-2 font-semibold text-xs transition-all ${
                  activeTab === tab.id
                    ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                }`}
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Quick Stock Movement Box */}
              {product.trackInventory && (
                <div className="rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-xs dark:border-zinc-800/90 dark:bg-zinc-900">
                  <h4 className="mb-3 font-bold text-xs text-zinc-900 dark:text-zinc-100">
                    Hızlı Stok Hareketi İşle
                  </h4>
                  <form
                    className="space-y-3 text-xs"
                    onSubmit={handleQuickAdjust}
                  >
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <div>
                        <select
                          className="w-full rounded-xl border border-zinc-200 bg-white p-2 text-zinc-900 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                          onChange={(e) =>
                            setQuickAdjType(e.target.value as any)
                          }
                          value={quickAdjType}
                        >
                          <option value="In">Stok Girişi (+)</option>
                          <option value="Out">Stok Çıkışı (-)</option>
                          <option value="Adjustment">Sayım Düzeltmesi</option>
                        </select>
                      </div>

                      <div>
                        <input
                          className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2 text-zinc-900 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-800/50 dark:bg-zinc-900 dark:text-zinc-100"
                          min="0.01"
                          onChange={(e) =>
                            setQuickAdjQty(
                              Number.parseFloat(e.target.value) || 0
                            )
                          }
                          placeholder="Miktar"
                          required
                          step="0.01"
                          type="number"
                          value={quickAdjQty}
                        />
                      </div>

                      <div>
                        <input
                          className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2 text-zinc-900 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-800/50 dark:bg-zinc-900 dark:text-zinc-100"
                          onChange={(e) => setQuickAdjReason(e.target.value)}
                          placeholder="Neden / Açıklama (Opsiyonel)"
                          type="text"
                          value={quickAdjReason}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white text-xs shadow-xs transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50"
                        disabled={submittingAdj || quickAdjQty <= 0}
                        type="submit"
                      >
                        {submittingAdj ? "İşleniyor..." : "Hareketi Kaydet"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Recent Movements Preview */}
              <div className="rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-xs dark:border-zinc-800/90 dark:bg-zinc-900">
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                    Son Stok Hareketleri
                  </h4>
                  <button
                    className="font-semibold text-blue-600 text-xs hover:underline"
                    onClick={() => setActiveTab("movements")}
                    type="button"
                  >
                    Tüm Geçmişi Gör ({product.stockMovements.length}) →
                  </button>
                </div>

                {product.stockMovements.length === 0 ? (
                  <div className="py-6 text-center text-xs text-zinc-400 dark:text-zinc-500">
                    Henüz stok hareketi kaydedilmedi.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {product.stockMovements.slice(0, 5).map((mov) => (
                      <div
                        className="flex items-center justify-between rounded-2xl bg-zinc-50 p-3 text-xs dark:bg-zinc-800/50"
                        key={mov.id}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-7 w-7 items-center justify-center rounded-xl border border-zinc-200 bg-white shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
                            {getMovementIcon(mov.movementType)}
                          </div>
                          <div>
                            <div className="font-bold text-zinc-900 dark:text-zinc-100">
                              {getMovementLabel(mov.movementType)} (
                              {mov.movementType === "Out"
                                ? `-${mov.quantity}`
                                : `+${mov.quantity}`}{" "}
                              {product.unit})
                            </div>
                            <div className="text-[10px] text-zinc-400 dark:text-zinc-500">
                              {mov.reason || "Kayıtlı açıklama yok"}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-bold text-zinc-800 dark:text-zinc-200">
                            {mov.previousStock} → {mov.newStock} {product.unit}
                          </div>
                          <div className="text-[10px] text-zinc-400 dark:text-zinc-500">
                            {new Date(mov.createdAt).toLocaleString("tr-TR")}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: VARIANTS */}
          {activeTab === "variants" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                  Ürün Varyantları (Renk, Beden, Model)
                </h4>
                <button
                  className="flex items-center gap-1 rounded-xl bg-blue-600 px-3.5 py-1.5 font-semibold text-white text-xs shadow-xs transition-all hover:bg-blue-700 active:scale-[0.98]"
                  onClick={() => setIsAddVariantModalOpen(true)}
                  type="button"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Varyant Ekle</span>
                </button>
              </div>

              {product.variants.length === 0 ? (
                <div className="rounded-3xl border border-zinc-200/80 border-dashed bg-white p-10 text-center text-xs text-zinc-400 dark:border-zinc-800/90 dark:bg-zinc-900 dark:text-zinc-500">
                  Bu ürüne ait tanımlanmış varyant bulunmamaktadır.
                </div>
              ) : (
                <div className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-xs dark:border-zinc-800/90 dark:bg-zinc-900">
                  <table className="w-full text-left text-xs">
                    <thead className="border-zinc-100 border-b bg-zinc-50/50 font-medium text-[11px] text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/30 dark:text-zinc-400">
                      <tr>
                        <th className="px-4 py-3">Varyant Adı</th>
                        <th className="px-4 py-3">SKU / Barkod</th>
                        <th className="px-4 py-3 text-right">Ek Fiyat (+₺)</th>
                        <th className="px-4 py-3 text-right">Varyant Stoğu</th>
                        <th className="py-3 pr-4 pl-2 text-right">İşlem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {product.variants.map((v) => (
                        <tr
                          className="transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50"
                          key={v.id}
                        >
                          <td className="px-4 py-3.5 font-bold text-zinc-900 dark:text-zinc-100">
                            {v.name}
                          </td>
                          <td className="px-4 py-3.5 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                            {v.sku || v.barcode || "—"}
                          </td>
                          <td className="px-4 py-3.5 text-right font-semibold text-zinc-800 dark:text-zinc-200">
                            +₺
                            {v.additionalPrice.toLocaleString("tr-TR", {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td className="px-4 py-3.5 text-right font-extrabold text-zinc-900 dark:text-zinc-100">
                            {v.stockQuantity} {product.unit}
                          </td>
                          <td className="py-3.5 pr-4 pl-2 text-right">
                            <button
                              className="p-1 text-zinc-400 hover:text-rose-600 dark:text-zinc-500"
                              onClick={() => handleDeleteVariant(v.id)}
                              title="Varyantı Sil"
                              type="button"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: STOCK MOVEMENTS (TIMELINE LEDGER) */}
          {activeTab === "movements" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                  Tarihsel Stok Hareket Defteri
                </h4>
                {product.trackInventory && (
                  <button
                    className="flex items-center gap-1 rounded-xl bg-blue-600 px-3.5 py-1.5 font-semibold text-white text-xs shadow-xs transition-all hover:bg-blue-700 active:scale-[0.98]"
                    onClick={() => setIsStockAdjustModalOpen(true)}
                    type="button"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Yeni Hareket Ekle</span>
                  </button>
                )}
              </div>

              {product.stockMovements.length === 0 ? (
                <div className="rounded-3xl border border-zinc-200/80 border-dashed bg-white p-10 text-center text-xs text-zinc-400 dark:border-zinc-800/90 dark:bg-zinc-900 dark:text-zinc-500">
                  Kayıtlı stok hareketi bulunmuyor.
                </div>
              ) : (
                <div className="relative space-y-3 before:absolute before:top-2 before:bottom-2 before:left-3.5 before:w-0.5 before:bg-zinc-100 dark:bg-zinc-800">
                  {product.stockMovements.map((mov) => (
                    <div
                      className="relative flex items-start gap-3 text-xs"
                      key={mov.id}
                    >
                      <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-white bg-white shadow-2xs ring-2 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
                        {getMovementIcon(mov.movementType)}
                      </div>

                      <div className="flex-1 rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs dark:border-zinc-800/90 dark:bg-zinc-900">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-zinc-900 dark:text-zinc-100">
                            {getMovementLabel(mov.movementType)} (
                            {mov.movementType === "Out"
                              ? `-${mov.quantity}`
                              : `+${mov.quantity}`}{" "}
                            {product.unit})
                          </span>
                          <span className="font-medium text-[10px] text-zinc-400 dark:text-zinc-500">
                            {new Date(mov.createdAt).toLocaleString("tr-TR")}
                          </span>
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-zinc-500 dark:text-zinc-400">
                          <span>
                            Önceki: <strong>{mov.previousStock}</strong> → Yeni:{" "}
                            <strong>
                              {mov.newStock} {product.unit}
                            </strong>
                          </span>
                          {mov.variantName && (
                            <span>
                              Varyant: <strong>{mov.variantName}</strong>
                            </span>
                          )}
                          {mov.referenceNumber && (
                            <span>
                              Evrak No: <strong>{mov.referenceNumber}</strong>
                            </span>
                          )}
                        </div>

                        {mov.reason && (
                          <p className="mt-1.5 rounded-xl bg-zinc-50 p-2 text-xs text-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300">
                            {mov.reason}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PRICING & MARGIN SIMULATOR */}
          {activeTab === "pricing" && (
            <div className="space-y-4">
              <div className="space-y-4 rounded-3xl border border-zinc-200/80 bg-white p-6 text-xs dark:border-zinc-800/90 dark:bg-zinc-900">
                <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  Fiyat & Karlılık Simülasyonu
                </h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
                    <span className="font-medium text-[11px] text-zinc-500 dark:text-zinc-400">
                      Maliyet (Alış)
                    </span>
                    <div className="mt-1 font-extrabold text-lg text-zinc-900 dark:text-zinc-100">
                      ₺
                      {product.costPrice.toLocaleString("tr-TR", {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
                    <span className="font-medium text-[11px] text-zinc-500 dark:text-zinc-400">
                      Satış Fiyatı
                    </span>
                    <div className="mt-1 font-extrabold text-blue-600 text-lg">
                      ₺
                      {product.sellingPrice.toLocaleString("tr-TR", {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-emerald-50/70 p-4">
                    <span className="font-medium text-[11px] text-emerald-800">
                      Net Brüt Kar
                    </span>
                    <div className="mt-1 font-extrabold text-emerald-700 text-lg">
                      ₺
                      {grossProfit.toLocaleString("tr-TR", {
                        minimumFractionDigits: 2,
                      })}{" "}
                      (%{Math.round(product.profitMargin)})
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stock Movement Modal */}
      {isStockAdjustModalOpen && (
        <StockAdjustModal
          isOpen={isStockAdjustModalOpen}
          onClose={() => setIsStockAdjustModalOpen(false)}
          onSuccess={() => {
            showToast("Stok hareketi başarıyla işlendi.");
            setIsStockAdjustModalOpen(false);
            loadData();
          }}
          product={product}
          tenantId={activeTenant?.id || ""}
        />
      )}

      {/* Add Variant Modal */}
      {isAddVariantModalOpen && (
        <AddVariantModal
          isOpen={isAddVariantModalOpen}
          onClose={() => setIsAddVariantModalOpen(false)}
          onSuccess={() => {
            showToast("Yeni varyant eklendi.");
            setIsAddVariantModalOpen(false);
            loadData();
          }}
          productId={product.id}
          tenantId={activeTenant?.id || ""}
        />
      )}

      {/* Edit Product Modal */}
      {isEditModalOpen && (
        <EditProductModal
          categories={categories}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={() => {
            showToast("Ürün bilgileri güncellendi.");
            setIsEditModalOpen(false);
            loadData();
          }}
          product={product}
          tenantId={activeTenant?.id || ""}
        />
      )}
    </div>
  );
}

function StockAdjustModal({
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
  product: ProductDetailDto;
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
          <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
            Stok Hareketi Ekle
          </h3>
          <button
            className="text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form className="space-y-3" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
              Hareket Türü
            </label>
            <select
              className="w-full rounded-xl border border-zinc-200 bg-white p-2 text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              onChange={(e) =>
                setFormData({
                  ...formData,
                  movementType: e.target.value as any,
                })
              }
              value={formData.movementType}
            >
              <option value="In">Stok Girişi (Alış / Sevkiyat)</option>
              <option value="Out">Stok Çıkışı (Hasar / Satış)</option>
              <option value="Adjustment">Sayım Düzeltmesi (Hedef Stok)</option>
              <option value="Return">Müşteri İadesi</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
              Miktar ({product.unit}) *
            </label>
            <input
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2 text-zinc-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-800/50 dark:bg-zinc-900 dark:text-zinc-100"
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

          <div>
            <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
              İrsaliye / Fatura No
            </label>
            <input
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2 text-zinc-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-800/50 dark:bg-zinc-900 dark:text-zinc-100"
              onChange={(e) =>
                setFormData({ ...formData, referenceNumber: e.target.value })
              }
              placeholder="IRS-2026-..."
              type="text"
              value={formData.referenceNumber}
            />
          </div>

          <div>
            <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
              Açıklama / Sebep
            </label>
            <input
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2 text-zinc-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-800/50 dark:bg-zinc-900 dark:text-zinc-100"
              onChange={(e) =>
                setFormData({ ...formData, reason: e.target.value })
              }
              placeholder="Stok hareket sebebi..."
              type="text"
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
              className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white shadow-xs transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50"
              disabled={submitting}
              type="submit"
            >
              {submitting ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddVariantModal({
  isOpen,
  onClose,
  onSuccess,
  tenantId,
  productId,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tenantId: string;
  productId: string;
}) {
  const [formData, setFormData] = useState<AddProductVariantRequest>({
    additionalPrice: 0,
    barcode: "",
    name: "",
    sku: "",
    stockQuantity: 0,
  });

  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await ApiClient.addProductVariant(
        productId,
        {
          ...formData,
          additionalPrice: Number(formData.additionalPrice) || 0,
          barcode: formData.barcode?.trim() || undefined,
          name: formData.name.trim(),
          sku: formData.sku?.trim() || undefined,
          stockQuantity: Number(formData.stockQuantity) || 0,
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
          <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
            Yeni Varyant Ekle
          </h3>
          <button
            className="text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form className="space-y-3" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
              Varyant Adı *
            </label>
            <input
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2 text-zinc-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-800/50 dark:bg-zinc-900 dark:text-zinc-100"
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Örn: Kırmızı - XL veya 256 GB"
              required
              type="text"
              value={formData.name}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                Ek Fiyat (+₺)
              </label>
              <input
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2 text-zinc-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-800/50 dark:bg-zinc-900 dark:text-zinc-100"
                min="0"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    additionalPrice: Number.parseFloat(e.target.value) || 0,
                  })
                }
                step="0.01"
                type="number"
                value={formData.additionalPrice}
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                Varyant Stoğu
              </label>
              <input
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2 text-zinc-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-800/50 dark:bg-zinc-900 dark:text-zinc-100"
                min="0"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    stockQuantity: Number.parseFloat(e.target.value) || 0,
                  })
                }
                type="number"
                value={formData.stockQuantity}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                Varyant SKU
              </label>
              <input
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2 text-zinc-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-800/50 dark:bg-zinc-900 dark:text-zinc-100"
                onChange={(e) =>
                  setFormData({ ...formData, sku: e.target.value })
                }
                placeholder="SKU-RED-XL"
                type="text"
                value={formData.sku}
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                Barkod
              </label>
              <input
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2 text-zinc-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-800/50 dark:bg-zinc-900 dark:text-zinc-100"
                onChange={(e) =>
                  setFormData({ ...formData, barcode: e.target.value })
                }
                type="text"
                value={formData.barcode}
              />
            </div>
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
              className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white shadow-xs transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50"
              disabled={submitting}
              type="submit"
            >
              {submitting ? "Ekleniyor..." : "Varyantı Ekle"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditProductModal({
  isOpen,
  onClose,
  onSuccess,
  tenantId,
  product,
  categories,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tenantId: string;
  product: ProductDetailDto;
  categories: ProductCategoryDto[];
}) {
  const [formData, setFormData] = useState<UpdateProductRequest>({
    barcode: product.barcode || "",
    brand: product.brand || "",
    categoryId: product.categoryId || "",
    costPrice: product.costPrice,
    currency: product.currency || "TRY",
    description: product.description || "",
    discountRate: product.discountRate,
    isFeatured: product.isFeatured ?? false,
    isPublished: product.isPublished ?? false,
    minStockLevel: product.minStockLevel,
    name: product.name,
    sellingPrice: product.sellingPrice,
    seoTitle: product.seoTitle || "",
    sku: product.sku || "",
    slug: product.slug || "",
    sortOrder: product.sortOrder ?? 0,
    status: product.status,
    taxRate: product.taxRate,
    trackInventory: product.trackInventory,
    type: product.type,
    unit: product.unit || "Adet",
    weightKg: product.weightKg,
  });

  const [submitting, setSubmitting] = useState(false);
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
    setSubmitting(true);
    try {
      const cleanData: UpdateProductRequest = {
        barcode: formData.barcode?.trim() || undefined,
        brand: formData.brand?.trim() || undefined,
        categoryId: formData.categoryId ? formData.categoryId : undefined,
        costPrice: Number(formData.costPrice) || 0,
        currency: formData.currency || "TRY",
        description: formData.description?.trim() || undefined,
        discountRate: Number(formData.discountRate) || 0,
        isFeatured: Boolean(formData.isFeatured),
        isPublished: Boolean(formData.isPublished),
        minStockLevel: Number(formData.minStockLevel) || 5,
        name: formData.name.trim(),
        sellingPrice: Number(formData.sellingPrice) || 0,
        seoTitle: formData.seoTitle?.trim() || undefined,
        sku: formData.sku?.trim() || undefined,
        slug: formData.slug?.trim()
          ? slugify(formData.slug.trim())
          : slugify(formData.name.trim()),
        sortOrder: Number(formData.sortOrder) || 0,
        status: formData.status || "Active",
        taxRate: Number(formData.taxRate) ?? 20,
        trackInventory:
          formData.type === "Physical" ? formData.trackInventory : false,
        type: formData.type,
        unit: formData.unit?.trim() || "Adet",
        weightKg: formData.weightKg ? Number(formData.weightKg) : undefined,
      };

      const res = await ApiClient.updateProduct(
        product.id,
        cleanData,
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
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-3xl border border-zinc-200 bg-white p-6 text-xs shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between border-zinc-100 border-b pb-4 dark:border-zinc-800">
          <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
            Ürün / Hizmet Bilgilerini Düzenle
          </h3>
          <button
            className="text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          className="flex-1 space-y-3 overflow-y-auto"
          onSubmit={handleSubmit}
        >
          <div>
            <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
              Ürün / Hizmet Adı *
            </label>
            <input
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2 text-zinc-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-800/50 dark:bg-zinc-900 dark:text-zinc-100"
              onChange={(e) => {
                const v = e.target.value;
                setFormData((prev) => ({
                  ...prev,
                  name: v,
                  slug: prev.slug ? prev.slug : slugify(v),
                }));
              }}
              required
              type="text"
              value={formData.name}
            />
          </div>

          <div>
            <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
              Slug (URL)
            </label>
            <input
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2 text-zinc-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-800/50 dark:bg-zinc-900 dark:text-zinc-100"
              onChange={(e) =>
                setFormData({ ...formData, slug: e.target.value })
              }
              placeholder="ornek-urun-slug"
              type="text"
              value={formData.slug ?? ""}
            />
          </div>

          <div className="space-y-2 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-3 dark:border-zinc-800/90 dark:bg-zinc-800/30">
            <div className="flex items-center gap-4">
              <label className="flex cursor-pointer items-center gap-2">
                <button
                  aria-checked={Boolean(formData.isPublished)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full border transition-colors ${formData.isPublished ? "border-emerald-500 bg-emerald-500" : "border-zinc-300 bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-700"}`}
                  onClick={() =>
                    setFormData({
                      ...formData,
                      isPublished: !formData.isPublished,
                    })
                  }
                  role="switch"
                  type="button"
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${formData.isPublished ? "translate-x-4" : "translate-x-1"}`}
                  />
                </button>
                <span className="font-medium">Mağazada Yayınla</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  checked={Boolean(formData.isFeatured)}
                  className="rounded text-blue-600"
                  onChange={(e) =>
                    setFormData({ ...formData, isFeatured: e.target.checked })
                  }
                  type="checkbox"
                />
                <span className="font-medium">Öne Çıkan</span>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                  Sıralama
                </label>
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-white p-2 focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900"
                  min="0"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sortOrder: Number.parseInt(e.target.value, 10) || 0,
                    })
                  }
                  type="number"
                  value={formData.sortOrder ?? 0}
                />
              </div>
              <div>
                <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                  Ağırlık (kg)
                </label>
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-white p-2 focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900"
                  min="0"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      weightKg: e.target.value
                        ? Number.parseFloat(e.target.value)
                        : undefined,
                    })
                  }
                  step="0.01"
                  type="number"
                  value={formData.weightKg ?? ""}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                SEO Başlığı
              </label>
              <input
                className="w-full rounded-xl border border-zinc-200 bg-white p-2 focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900"
                maxLength={255}
                onChange={(e) =>
                  setFormData({ ...formData, seoTitle: e.target.value })
                }
                placeholder="SEO title (opsiyonel)"
                type="text"
                value={formData.seoTitle ?? ""}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                Kategori
              </label>
              <select
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2 text-zinc-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-800/50 dark:bg-zinc-900 dark:text-zinc-100"
                onChange={(e) =>
                  setFormData({ ...formData, categoryId: e.target.value })
                }
                value={formData.categoryId}
              >
                <option value="">Kategori Seçin</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.parentId ? `↳ ${c.fullPath || c.name}` : c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                Durum
              </label>
              <select
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2 text-zinc-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-800/50 dark:bg-zinc-900 dark:text-zinc-100"
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
                value={formData.status}
              >
                <option value="Active">Aktif</option>
                <option value="Draft">Taslak</option>
                <option value="Inactive">Pasif</option>
                <option value="Discontinued">Satıştan Kaldırıldı</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                Alış / Maliyet (₺)
              </label>
              <input
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2 text-zinc-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-800/50 dark:bg-zinc-900 dark:text-zinc-100"
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
                Satış Fiyatı (₺) *
              </label>
              <input
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2 text-zinc-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-800/50 dark:bg-zinc-900 dark:text-zinc-100"
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
              className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white shadow-xs transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50"
              disabled={submitting}
              type="submit"
            >
              {submitting ? "Güncelleniyor..." : "Kaydet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
