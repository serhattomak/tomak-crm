"use client";

import { Combobox } from "@workspace/ui/components/combobox";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  Barcode,
  CheckCircle2,
  Edit,
  History,
  ImagePlus,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { PermissionGate } from "@/components/permission-gate";
import {
  type AttributeRow,
  AttributesEditor,
  conflictFriendlyMessage,
  generateBarcode,
  generateSku,
  isConflictResponse,
  ProductImagesField,
  parseAttributes,
  revokeStagedImages,
  type StagedImage,
  serializeAttributes,
  TagsInput,
  uploadStagedImages,
} from "@/components/products/product-form-modal";
import { ProductGallery } from "@/components/products/product-gallery";
import {
  ProductRichDescription,
  ProductSeoFields,
  type ProductSeoValues,
  slugifyTr,
} from "@/components/products/product-seo-fields";
import {
  type AddProductVariantRequest,
  type AdjustProductStockRequest,
  ApiClient,
  type ProductCategoryDto,
  type ProductDetailDto,
  type ProductVariantDetailDto,
  type UpdateProductRequest,
  type UpdateProductVariantRequest,
} from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";

const MAX_PRODUCT_IMAGES = 10;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"];

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
    "overview" | "variants" | "movements" | "pricing" | "priceHistory"
  >("overview");

  // Modals
  const [isStockAdjustModalOpen, setIsStockAdjustModalOpen] = useState(false);
  const [isAddVariantModalOpen, setIsAddVariantModalOpen] = useState(false);
  const [editingVariant, setEditingVariant] =
    useState<ProductVariantDetailDto | null>(null);
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

  // --- Galeri: kapak yap / sil / sırala + yükleme (kapak her zaman images[0]) ---
  const [galleryBusy, setGalleryBusy] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const galleryFileInputRef = useRef<HTMLInputElement>(null);

  const persistImageOrder = useCallback(
    async (nextImages: string[]) => {
      if (!(activeTenant && product)) {
        return;
      }
      const previousImages = product.images ?? [];
      const coverChanged = nextImages[0] !== previousImages[0];
      setGalleryBusy(true);
      try {
        const res = await ApiClient.updateProduct(
          product.id,
          {
            barcode: product.barcode ?? undefined,
            brand: product.brand ?? undefined,
            categoryId: product.categoryId ?? undefined,
            costPrice: product.costPrice,
            currency: product.currency,
            description: product.description ?? undefined,
            discountRate: product.discountRate,
            images: nextImages,
            minStockLevel: product.minStockLevel,
            name: product.name,
            sellingPrice: product.sellingPrice,
            sku: product.sku ?? undefined,
            status: product.status,
            taxRate: product.taxRate,
            trackInventory: product.trackInventory,
            type: product.type,
            unit: product.unit,
          },
          activeTenant.id
        );
        if (res.success) {
          setProduct({ ...product, images: nextImages });
          showToast(
            coverChanged ? "Kapak görsel güncellendi." : "Sıralama kaydedildi."
          );
        } else if (res.errorCode === "HTTP_409") {
          showToast("Sıralama çakıştı, liste yenilendi.");
          loadData();
        } else {
          showToast(res.message ?? "Sıralama kaydedilirken hata oluştu.");
        }
      } catch {
        showToast("Sıralama kaydedilirken hata oluştu.");
      } finally {
        setGalleryBusy(false);
      }
    },
    [activeTenant, product, loadData]
  );

  const handleGalleryChange = useCallback(
    async (nextImages: string[]) => {
      if (!(activeTenant && product) || galleryBusy) {
        return;
      }
      const previousImages = product.images ?? [];
      const removed = previousImages.find((url) => !nextImages.includes(url));
      // Silme: fiziksel + DB tutarlılığı backend'de (DELETE /images?imageUrl=)
      if (removed !== undefined && nextImages.length < previousImages.length) {
        setGalleryBusy(true);
        try {
          const res = await ApiClient.deleteProductImage(
            product.id,
            removed,
            activeTenant.id
          );
          if (res.success) {
            setProduct({ ...product, images: nextImages });
            showToast("Görsel silindi.");
          } else if (res.errorCode === "HTTP_404") {
            showToast("Görsel bulunamadı, liste yenilendi.");
            loadData();
          } else {
            showToast(res.message ?? "Görsel silinirken hata oluştu.");
          }
        } catch {
          showToast("Görsel silinirken hata oluştu.");
        } finally {
          setGalleryBusy(false);
        }
        return;
      }
      // Kapak yap / sırala: images[0] kapaktır, PUT ile persist edilir
      await persistImageOrder(nextImages);
    },
    [activeTenant, product, galleryBusy, persistImageOrder, loadData]
  );

  const handleGalleryFiles = useCallback(
    async (files: FileList | null) => {
      if (!(activeTenant && product && files && files.length > 0)) {
        return;
      }
      const currentImages = product.images ?? [];
      const picked = Array.from(files);
      const valid = picked.filter((file) => {
        if (!ALLOWED_IMAGE_MIMES.includes(file.type)) {
          showToast(`${file.name}: yalnızca JPG, PNG veya WebP yükleyin.`);
          return false;
        }
        if (file.size > MAX_IMAGE_BYTES) {
          showToast(`${file.name}: dosya 5MB sınırını aşıyor.`);
          return false;
        }
        return true;
      });
      const room = MAX_PRODUCT_IMAGES - currentImages.length;
      if (room <= 0) {
        showToast("En fazla 10 görsel yükleyebilirsiniz.");
        return;
      }
      const queue = valid.slice(0, room);
      if (queue.length === 0) {
        return;
      }
      setUploadingImages(true);
      try {
        const uploaded: string[] = [];
        for (const file of queue) {
          const res = await ApiClient.uploadProductImage(
            product.id,
            file,
            activeTenant.id
          );
          if (res.success && res.data?.imageUrl) {
            uploaded.push(res.data.imageUrl);
          } else if (res.errorCode === "HTTP_404") {
            showToast("Ürün bulunamadı.");
            loadData();
            return;
          } else if (res.errorCode === "HTTP_409") {
            showToast("Görsel limiti aşıldı (en fazla 10).");
            break;
          } else {
            showToast(res.message ?? `${file.name} yüklenemedi.`);
          }
        }
        if (uploaded.length > 0) {
          setProduct({
            ...product,
            images: [...currentImages, ...uploaded],
          });
          showToast(
            uploaded.length === 1
              ? "Görsel yüklendi."
              : `${uploaded.length} görsel yüklendi.`
          );
        }
      } catch {
        showToast("Görsel yüklenirken hata oluştu.");
      } finally {
        setUploadingImages(false);
        if (galleryFileInputRef.current) {
          galleryFileInputRef.current.value = "";
        }
      }
    },
    [activeTenant, product, loadData]
  );

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center rounded-3xl border border-border bg-card shadow-xs">
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
    {
      id: "priceHistory",
      label: `Fiyat Geçmişi (${product.priceHistory.length})`,
    },
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
        return "bg-zinc-50 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 border-border";
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
    <PageContainer className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="slide-in-from-top-4 fixed top-6 right-6 z-50 flex animate-in items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 text-white text-xs shadow-2xl">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* 1. Header Section */}
      <div className="flex flex-col justify-between gap-4 border-border border-b pb-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Link
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-zinc-600 shadow-2xs transition-colors hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
            href={`/${tenantSlug}/products`}
            title="Kataloğa Dön"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-100 font-bold text-base text-blue-600 dark:text-blue-400 shadow-xs dark:bg-zinc-800">
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
                  className={`rounded-lg border px-2 py-0.5 font-bold text-3xs ${getTypeBadge(
                    product.type
                  )}`}
                >
                  {product.type}
                </span>
                {product.trackInventory && product.isLowStock && (
                  <span className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 font-bold text-3xs text-amber-700 dark:text-amber-300">
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
                className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 font-semibold text-xs text-zinc-700 shadow-2xs transition-colors hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
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
          {/* Card: Ürün Görselleri — ana + thumb şeridi, kapak her zaman images[0] */}
          <div className="space-y-4 rounded-3xl border border-border bg-card p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                Ürün Görselleri
              </h3>
              <span className="rounded-lg bg-zinc-100 px-2 py-0.5 font-bold text-3xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                {(product.images ?? []).length}/{MAX_PRODUCT_IMAGES}
              </span>
            </div>

            <ProductGallery
              editable
              images={product.images ?? []}
              onChange={handleGalleryChange}
              productName={product.name}
            />

            <PermissionGate permission="Products.Update">
              <input
                accept="image/jpeg,image/png,image/webp"
                aria-label="Ürün görseli yükle"
                className="hidden"
                disabled={uploadingImages || galleryBusy}
                multiple
                onChange={(e) => handleGalleryFiles(e.target.files)}
                ref={galleryFileInputRef}
                type="file"
              />
              <button
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 font-semibold text-xs text-zinc-700 shadow-2xs transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
                disabled={
                  uploadingImages ||
                  galleryBusy ||
                  (product.images ?? []).length >= MAX_PRODUCT_IMAGES
                }
                onClick={() => galleryFileInputRef.current?.click()}
                type="button"
              >
                {uploadingImages ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                    <span>Yükleniyor...</span>
                  </>
                ) : (
                  <>
                    <ImagePlus className="h-3.5 w-3.5 text-blue-600" />
                    <span>Görsel Yükle (JPG/PNG/WebP, 5MB)</span>
                  </>
                )}
              </button>
            </PermissionGate>
          </div>

          {/* Card: Pricing & Margins */}
          <div className="space-y-4 rounded-3xl border border-border bg-card p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                Fiyatlandırma & Karlılık
              </h3>
              <span
                className={`rounded-lg px-2 py-0.5 font-bold text-3xs ${
                  product.profitMargin >= 40
                    ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
                    : product.profitMargin > 0
                      ? "bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300"
                      : "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300"
                }`}
              >
                Kar: %{Math.round(product.profitMargin)}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between border-border border-b py-1.5">
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

              <div className="flex items-center justify-between border-border border-b py-1.5">
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

              <div className="flex items-center justify-between border-border border-b py-1.5">
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
            <div className="space-y-4 rounded-3xl border border-border bg-card p-5 shadow-xs">
              <h3 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                Envanter & Stok Seviyesi
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-2xl bg-blue-50/60 dark:bg-blue-950/60 p-3">
                  <span className="font-semibold text-3xs text-blue-600 uppercase">
                    Mevcut Stok
                  </span>
                  <div className="mt-1 font-extrabold text-blue-950 text-lg">
                    {product.currentStock} {product.unit}
                  </div>
                </div>

                <div className="rounded-2xl bg-zinc-50 p-3 dark:bg-zinc-800/50">
                  <span className="font-semibold text-3xs text-zinc-500 uppercase dark:text-zinc-400">
                    Kullanılabilir
                  </span>
                  <div className="mt-1 font-extrabold text-lg text-zinc-900 dark:text-zinc-100">
                    {product.availableStock} {product.unit}
                  </div>
                </div>

                <div className="rounded-2xl bg-zinc-50 p-3 dark:bg-zinc-800/50">
                  <span className="font-semibold text-3xs text-zinc-500 uppercase dark:text-zinc-400">
                    Rezerve
                  </span>
                  <div className="mt-1 font-bold text-sm text-zinc-700 dark:text-zinc-300">
                    {product.reservedStock} {product.unit}
                  </div>
                </div>

                <div className="rounded-2xl bg-zinc-50 p-3 dark:bg-zinc-800/50">
                  <span className="font-semibold text-3xs text-zinc-500 uppercase dark:text-zinc-400">
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
          <div className="space-y-3 rounded-3xl border border-border bg-card p-5 text-xs shadow-xs">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100">
              Teknik & Kimlik Bilgileri
            </h3>
            <div className="space-y-2 text-zinc-600 dark:text-zinc-400">
              {product.barcode && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Barkod (EAN):
                  </span>
                  <span className="font-medium font-mono text-zinc-800 dark:text-zinc-200">
                    {product.barcode}
                  </span>
                </div>
              )}
              {product.sku && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Stok Kodu (SKU):
                  </span>
                  <span className="font-medium font-mono text-zinc-800 dark:text-zinc-200">
                    {product.sku}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Ölçü Birimi:
                </span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  {product.unit}
                </span>
              </div>
              {product.description && (
                <div className="mt-2 border-border border-t pt-2">
                  <span className="mb-1 block text-muted-foreground">
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
                className={`rounded-xl px-4 py-2 font-semibold text-xs transition-all ${ activeTab === tab.id ? "bg-card text-zinc-900 shadow-xs dark:text-zinc-100" : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100" }`}
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
              {/* F2-4 — SEO & vitrin özeti: slug + meta + zengin açıklama */}
              <div className="space-y-3 rounded-3xl border border-border bg-card p-5 text-xs shadow-xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-zinc-900 dark:text-zinc-100">
                    SEO & Vitrin
                  </h4>
                  <span className="rounded-lg bg-zinc-100 px-2 py-0.5 font-bold font-mono text-3xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    /{product.slug ?? slugifyTr(product.name)}
                  </span>
                </div>
                {(product.seoTitle || product.seoDescription) && (
                  <div className="space-y-1 rounded-2xl bg-zinc-50 p-3 dark:bg-zinc-800/50">
                    {product.seoTitle && (
                      <p className="font-bold text-blue-700 dark:text-blue-300">
                        {product.seoTitle}
                      </p>
                    )}
                    {product.seoDescription && (
                      <p className="text-zinc-500 dark:text-zinc-400">
                        {product.seoDescription}
                      </p>
                    )}
                  </div>
                )}
                <ProductRichDescription text={product.richDescription} />
                {!(product.richDescription || product.seoTitle) && (
                  <p className="text-muted-foreground">
                    SEO bilgisi girilmedi — Düzenle penceresinden slug ve
                    açıklama ekleyin.
                  </p>
                )}
              </div>
              {/* Quick Stock Movement Box */}
              {product.trackInventory && (
                <div className="rounded-3xl border border-border bg-card p-5 shadow-xs">
                  <h4 className="mb-3 font-bold text-xs text-zinc-900 dark:text-zinc-100">
                    Hızlı Stok Hareketi İşle
                  </h4>
                  <form
                    className="space-y-3 text-xs"
                    onSubmit={handleQuickAdjust}
                  >
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <div>
                        <Select
                          onValueChange={(val) => setQuickAdjType(val as any)}
                          value={quickAdjType}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="In">Stok Girişi (+)</SelectItem>
                            <SelectItem value="Out">Stok Çıkışı (-)</SelectItem>
                            <SelectItem value="Adjustment">
                              Sayım Düzeltmesi
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <NumberInput
                          min={0.01}
                          onChange={(val) => setQuickAdjQty(val ?? 0)}
                          placeholder="Miktar"
                          required
                          showStepper
                          step={1}
                          value={quickAdjQty}
                        />
                      </div>

                      <div>
                        <Input
                          onChange={(e) => setQuickAdjReason(e.target.value)}
                          placeholder="Neden / Açıklama (Opsiyonel)"
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
              <div className="rounded-3xl border border-border bg-card p-5 shadow-xs">
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
                  <div className="py-6 text-center text-xs text-muted-foreground">
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
                          <div className="flex h-7 w-7 items-center justify-center rounded-xl border border-border bg-card shadow-2xs">
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
                            <div className="text-3xs text-muted-foreground">
                              {mov.reason || "Kayıtlı açıklama yok"}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-bold text-zinc-800 dark:text-zinc-200">
                            {mov.previousStock} → {mov.newStock} {product.unit}
                          </div>
                          <div className="text-3xs text-muted-foreground">
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
                <div className="rounded-3xl border border-border border-dashed bg-card p-10 text-center text-xs text-muted-foreground">
                  Bu ürüne ait tanımlanmış varyant bulunmamaktadır.
                </div>
              ) : (
                <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-xs">
                  <Table>
                    <TableHeader className="border-border bg-zinc-50/50 text-zinc-500 dark:bg-zinc-800/30 dark:text-zinc-400">
                      <TableRow>
                        <TableHead className="w-12 px-3 py-3 h-auto">Görsel</TableHead>
                        <TableHead className="px-4 py-3 h-auto">Varyant Adı</TableHead>
                        <TableHead className="px-4 py-3 h-auto">SKU / Barkod</TableHead>
                        <TableHead className="px-4 py-3 text-right h-auto">Ek Fiyat (+₺)</TableHead>
                        <TableHead className="px-4 py-3 text-right h-auto">Varyant Stoğu</TableHead>
                        <TableHead className="py-3 pr-4 pl-2 text-right h-auto">İşlem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {product.variants.map((v) => {
                        const variantCover =
                          v.images && v.images.length > 0
                            ? v.images[0]
                            : product.images && product.images.length > 0
                              ? product.images[0]
                              : null;
                        return (
                          <TableRow
                            className="transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50"
                            key={v.id}
                          >
                            <TableCell className="w-12 px-3 py-3">
                              {variantCover ? (
                                <img
                                  alt={v.name}
                                  className="h-8 w-8 rounded-lg border border-border object-cover"
                                  src={variantCover}
                                />
                              ) : (
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
                                  <Package className="h-4 w-4" />
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="px-4 py-3.5 font-bold text-zinc-900 dark:text-zinc-100">
                              {v.name}
                            </TableCell>
                            <TableCell className="px-4 py-3.5 font-mono text-2xs text-zinc-500 dark:text-zinc-400">
                              {v.sku || v.barcode || "—"}
                            </TableCell>
                            <TableCell className="px-4 py-3.5 text-right font-semibold text-zinc-800 dark:text-zinc-200">
                              +₺
                              {v.additionalPrice.toLocaleString("tr-TR", {
                                minimumFractionDigits: 2,
                              })}
                            </TableCell>
                            <TableCell className="px-4 py-3.5 text-right font-extrabold text-zinc-900 dark:text-zinc-100">
                              {v.stockQuantity} {product.unit}
                            </TableCell>
                            <TableCell className="py-3.5 pr-4 pl-2 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  className="rounded-lg p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-blue-600 dark:text-zinc-500 dark:hover:bg-zinc-800"
                                  onClick={() => setEditingVariant(v)}
                                  title="Varyantı Düzenle"
                                  type="button"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  className="rounded-lg p-1 text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-zinc-500 dark:hover:bg-rose-950/50"
                                  onClick={() => handleDeleteVariant(v.id)}
                                  title="Varyantı Sil"
                                  type="button"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
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
                <div className="rounded-3xl border border-border border-dashed bg-card p-10 text-center text-xs text-muted-foreground">
                  Kayıtlı stok hareketi bulunmuyor.
                </div>
              ) : (
                <div className="relative space-y-3 before:absolute before:top-2 before:bottom-2 before:left-3.5 before:w-0.5 before:bg-zinc-100 dark:bg-zinc-800">
                  {product.stockMovements.map((mov) => (
                    <div
                      className="relative flex items-start gap-3 text-xs"
                      key={mov.id}
                    >
                      <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-white bg-card shadow-2xs ring-2 ring-zinc-100 dark:ring-zinc-800">
                        {getMovementIcon(mov.movementType)}
                      </div>

                      <div className="flex-1 rounded-2xl border border-border bg-card p-4 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-zinc-900 dark:text-zinc-100">
                            {getMovementLabel(mov.movementType)} (
                            {mov.movementType === "Out"
                              ? `-${mov.quantity}`
                              : `+${mov.quantity}`}{" "}
                            {product.unit})
                          </span>
                          <span className="font-medium text-3xs text-muted-foreground">
                            {new Date(mov.createdAt).toLocaleString("tr-TR")}
                          </span>
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-3 text-2xs text-zinc-500 dark:text-zinc-400">
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
              <div className="space-y-4 rounded-3xl border border-border bg-card p-6 text-xs">
                <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  Fiyat & Karlılık Simülasyonu
                </h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
                    <span className="font-medium text-2xs text-zinc-500 dark:text-zinc-400">
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
                    <span className="font-medium text-2xs text-zinc-500 dark:text-zinc-400">
                      Satış Fiyatı
                    </span>
                    <div className="mt-1 font-extrabold text-blue-600 text-lg">
                      ₺
                      {product.sellingPrice.toLocaleString("tr-TR", {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/60 p-4">
                    <span className="font-medium text-2xs text-emerald-800">
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

          {/* TAB 5: PRICE HISTORY TIMELINE (F2-3) */}
          {activeTab === "priceHistory" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                    Fiyat Değişiklik Geçmişi
                  </h4>
                  <p className="text-2xs text-zinc-500 dark:text-zinc-400">
                    Ürünün alış ve satış fiyatlarında yapılan tüm güncellemeler
                    otomatik kaydedilir.
                  </p>
                </div>
              </div>

              {!product.priceHistory || product.priceHistory.length === 0 ? (
                <div className="rounded-3xl border border-border border-dashed bg-card p-10 text-center text-xs text-muted-foreground">
                  Henüz bir fiyat değişikliği kaydedilmemiştir.
                </div>
              ) : (
                <div className="space-y-3">
                  {product.priceHistory.map((hist) => {
                    const sellingChanged =
                      hist.oldSellingPrice !== hist.newSellingPrice;
                    const costChanged = hist.oldCostPrice !== hist.newCostPrice;
                    const sellingDiff =
                      (hist.newSellingPrice ?? 0) - (hist.oldSellingPrice ?? 0);
                    const costDiff =
                      (hist.newCostPrice ?? 0) - (hist.oldCostPrice ?? 0);

                    return (
                      <div
                        className="rounded-2xl border border-border bg-card p-4 text-xs shadow-xs transition-all"
                        key={hist.id}
                      >
                        <div className="flex items-center justify-between border-border border-b pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                              <History className="h-3.5 w-3.5" />
                            </span>
                            <span className="font-bold text-zinc-900 dark:text-zinc-100">
                              {hist.changeReason || "Fiyat Güncellemesi"}
                            </span>
                          </div>
                          <span className="font-medium text-3xs text-muted-foreground">
                            {new Date(hist.createdAt).toLocaleString("tr-TR")}
                          </span>
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {/* Satış Fiyatı Değişimi */}
                          <div
                            className={`rounded-xl p-3 ${
                              sellingChanged
                                ? "bg-zinc-50 dark:bg-zinc-800/50"
                                : "bg-zinc-50/50 opacity-60 dark:bg-zinc-800/30"
                            }`}
                          >
                            <div className="flex items-center justify-between text-2xs text-zinc-500 dark:text-zinc-400">
                              <span>Satış Fiyatı</span>
                              {sellingChanged && (
                                <span
                                  className={`flex items-center font-bold text-3xs ${
                                    sellingDiff >= 0
                                      ? "text-emerald-600"
                                      : "text-rose-600"
                                  }`}
                                >
                                  {sellingDiff >= 0 ? (
                                    <TrendingUp className="mr-0.5 h-3 w-3" />
                                  ) : (
                                    <TrendingDown className="mr-0.5 h-3 w-3" />
                                  )}
                                  {sellingDiff >= 0
                                    ? `+₺${sellingDiff.toFixed(2)}`
                                    : `-₺${Math.abs(sellingDiff).toFixed(2)}`}
                                </span>
                              )}
                            </div>
                            <div className="mt-1 flex items-center gap-2 font-bold">
                              {hist.oldSellingPrice == null ? null : (
                                <>
                                  <span className="text-zinc-400 line-through dark:text-zinc-500">
                                    ₺
                                    {hist.oldSellingPrice.toLocaleString(
                                      "tr-TR",
                                      { minimumFractionDigits: 2 }
                                    )}
                                  </span>
                                  <span className="text-zinc-400">→</span>
                                </>
                              )}
                              <span className="text-sm text-zinc-900 dark:text-zinc-100">
                                ₺
                                {(hist.newSellingPrice ?? 0).toLocaleString(
                                  "tr-TR",
                                  { minimumFractionDigits: 2 }
                                )}
                              </span>
                            </div>
                          </div>

                          {/* Alış / Maliyet Fiyatı Değişimi */}
                          <div
                            className={`rounded-xl p-3 ${
                              costChanged
                                ? "bg-zinc-50 dark:bg-zinc-800/50"
                                : "bg-zinc-50/50 opacity-60 dark:bg-zinc-800/30"
                            }`}
                          >
                            <div className="flex items-center justify-between text-2xs text-zinc-500 dark:text-zinc-400">
                              <span>Maliyet (Alış)</span>
                              {costChanged && (
                                <span
                                  className={`flex items-center font-bold text-3xs ${
                                    costDiff <= 0
                                      ? "text-emerald-600"
                                      : "text-amber-600"
                                  }`}
                                >
                                  {costDiff <= 0 ? (
                                    <TrendingDown className="mr-0.5 h-3 w-3" />
                                  ) : (
                                    <TrendingUp className="mr-0.5 h-3 w-3" />
                                  )}
                                  {costDiff >= 0
                                    ? `+₺${costDiff.toFixed(2)}`
                                    : `-₺${Math.abs(costDiff).toFixed(2)}`}
                                </span>
                              )}
                            </div>
                            <div className="mt-1 flex items-center gap-2 font-bold">
                              {hist.oldCostPrice == null ? null : (
                                <>
                                  <span className="text-zinc-400 line-through dark:text-zinc-500">
                                    ₺
                                    {hist.oldCostPrice.toLocaleString("tr-TR", {
                                      minimumFractionDigits: 2,
                                    })}
                                  </span>
                                  <span className="text-zinc-400">→</span>
                                </>
                              )}
                              <span className="text-sm text-zinc-900 dark:text-zinc-100">
                                ₺
                                {(hist.newCostPrice ?? 0).toLocaleString(
                                  "tr-TR",
                                  { minimumFractionDigits: 2 }
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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

      {/* Edit Variant Modal */}
      {editingVariant && (
        <EditVariantModal
          isOpen={!!editingVariant}
          onClose={() => setEditingVariant(null)}
          onSuccess={() => {
            showToast("Varyant güncellendi.");
            setEditingVariant(null);
            loadData();
          }}
          productId={product.id}
          tenantId={activeTenant?.id || ""}
          variant={editingVariant}
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
          onToast={showToast}
          product={product}
          tenantId={activeTenant?.id || ""}
        />
      )}
    </PageContainer>
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
        className="max-h-[90vh] w-full overflow-y-auto gap-0 p-6 text-xs sm:max-w-md"
        showCloseButton={false}
      >
        <div className="mb-4 flex items-center justify-between border-border border-b pb-4">
          <DialogTitle className="font-bold text-base text-zinc-900 dark:text-zinc-100">
            Stok Hareketi Ekle
          </DialogTitle>
          <DialogClose asChild>
            <button
              aria-label="Kapat"
              className="text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </DialogClose>
        </div>

        <form className="space-y-3" onSubmit={handleSubmit}>
          <div>
            <Label className="mb-1">Hareket Türü</Label>
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
                <SelectItem value="In">
                  Stok Girişi (Alış / Sevkiyat)
                </SelectItem>
                <SelectItem value="Out">Stok Çıkışı (Hasar / Satış)</SelectItem>
                <SelectItem value="Adjustment">
                  Sayım Düzeltmesi (Hedef Stok)
                </SelectItem>
                <SelectItem value="Return">Müşteri İadesi</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-1" required>
              Miktar ({product.unit})
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

          <div>
            <Label className="mb-1">İrsaliye / Fatura No</Label>
            <Input
              onChange={(e) =>
                setFormData({ ...formData, referenceNumber: e.target.value })
              }
              placeholder="IRS-2026-..."
              value={formData.referenceNumber}
            />
          </div>

          <div>
            <Label className="mb-1">Açıklama / Sebep</Label>
            <Input
              onChange={(e) =>
                setFormData({ ...formData, reason: e.target.value })
              }
              placeholder="Stok hareket sebebi..."
              value={formData.reason}
            />
          </div>

          <div className="mt-4 flex items-center justify-end gap-2 border-border border-t pt-4">
            <button
              className="rounded-xl border border-border px-4 py-2 font-semibold text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
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
      </DialogContent>
    </Dialog>
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
        className="max-h-[90vh] w-full overflow-y-auto gap-0 p-6 text-xs sm:max-w-md"
        showCloseButton={false}
      >
        <div className="mb-4 flex items-center justify-between border-border border-b pb-4">
          <DialogTitle className="font-bold text-base text-zinc-900 dark:text-zinc-100">
            Yeni Varyant Ekle
          </DialogTitle>
          <DialogClose asChild>
            <button
              aria-label="Kapat"
              className="text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </DialogClose>
        </div>

        <form className="space-y-3" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
              Varyant Adı *
            </label>
            <input
              className="w-full rounded-xl border border-border bg-zinc-50 p-2 text-zinc-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:bg-zinc-800/50 dark:bg-zinc-900 dark:text-zinc-100"
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
              <Label className="mb-1">Ek Fiyat (+₺)</Label>
              <NumberInput
                min={0}
                onChange={(val) =>
                  setFormData({
                    ...formData,
                    additionalPrice: val ?? 0,
                  })
                }
                prefix="₺"
                step={0.01}
                value={formData.additionalPrice}
              />
            </div>
            <div>
              <Label className="mb-1">Varyant Stoğu</Label>
              <NumberInput
                min={0}
                onChange={(val) =>
                  setFormData({
                    ...formData,
                    stockQuantity: val ?? 0,
                  })
                }
                showStepper
                step={1}
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
                className="w-full rounded-xl border border-border bg-zinc-50 p-2 text-zinc-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:bg-zinc-800/50 dark:bg-zinc-900 dark:text-zinc-100"
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
                className="w-full rounded-xl border border-border bg-zinc-50 p-2 text-zinc-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:bg-zinc-800/50 dark:bg-zinc-900 dark:text-zinc-100"
                onChange={(e) =>
                  setFormData({ ...formData, barcode: e.target.value })
                }
                type="text"
                value={formData.barcode}
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2 border-border border-t pt-4">
            <button
              className="rounded-xl border border-border px-4 py-2 font-semibold text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
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
      </DialogContent>
    </Dialog>
  );
}

function EditVariantModal({
  isOpen,
  onClose,
  onSuccess,
  tenantId,
  productId,
  variant,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tenantId: string;
  productId: string;
  variant: ProductVariantDetailDto;
}) {
  const [formData, setFormData] = useState<UpdateProductVariantRequest>({
    additionalPrice: variant.additionalPrice,
    barcode: variant.barcode || "",
    images: variant.images ?? [],
    isActive: variant.isActive,
    name: variant.name,
    sku: variant.sku || "",
    stockQuantity: variant.stockQuantity,
  });
  const [imageUrl, setImageUrl] = useState(variant.images?.[0] || "");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await ApiClient.updateProductVariant(
        productId,
        variant.id,
        {
          ...formData,
          additionalPrice: Number(formData.additionalPrice) || 0,
          barcode: formData.barcode?.trim() || undefined,
          images: imageUrl.trim() ? [imageUrl.trim()] : [],
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
        className="max-h-[90vh] w-full overflow-y-auto gap-0 p-6 text-xs sm:max-w-md"
        showCloseButton={false}
      >
        <div className="mb-4 flex items-center justify-between border-border border-b pb-4">
          <DialogTitle className="font-bold text-base text-zinc-900 dark:text-zinc-100">
            Varyantı Düzenle
          </DialogTitle>
          <DialogClose asChild>
            <button
              aria-label="Kapat"
              className="text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </DialogClose>
        </div>

        <form className="space-y-3" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
              Varyant Adı *
            </label>
            <input
              className="w-full rounded-xl border border-border bg-zinc-50 p-2 text-zinc-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:bg-zinc-800/50 dark:text-zinc-100"
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Örn: Kırmızı - XL"
              required
              type="text"
              value={formData.name || ""}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="mb-1">Ek Fiyat (+₺)</Label>
              <NumberInput
                min={0}
                onChange={(val) =>
                  setFormData({
                    ...formData,
                    additionalPrice: val ?? 0,
                  })
                }
                prefix="₺"
                step={0.01}
                value={formData.additionalPrice}
              />
            </div>
            <div>
              <Label className="mb-1">Varyant Stoğu</Label>
              <NumberInput
                min={0}
                onChange={(val) =>
                  setFormData({
                    ...formData,
                    stockQuantity: val ?? 0,
                  })
                }
                step={1}
                value={formData.stockQuantity}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="mb-1">SKU</Label>
              <input
                className="w-full rounded-xl border border-border bg-zinc-50 p-2 text-zinc-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:bg-zinc-800/50 dark:text-zinc-100"
                onChange={(e) =>
                  setFormData({ ...formData, sku: e.target.value })
                }
                placeholder="Varyant SKU"
                type="text"
                value={formData.sku || ""}
              />
            </div>
            <div>
              <Label className="mb-1">Barkod</Label>
              <input
                className="w-full rounded-xl border border-border bg-zinc-50 p-2 text-zinc-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:bg-zinc-800/50 dark:text-zinc-100"
                onChange={(e) =>
                  setFormData({ ...formData, barcode: e.target.value })
                }
                placeholder="Varyant Barkod"
                type="text"
                value={formData.barcode || ""}
              />
            </div>
          </div>

          <div>
            <Label className="mb-1">Varyant Görsel URL'si (Opsiyonel)</Label>
            <input
              className="w-full rounded-xl border border-border bg-zinc-50 p-2 text-zinc-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:bg-zinc-800/50 dark:text-zinc-100"
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://... (boşsa ana ürün görseli kullanılır)"
              type="url"
              value={imageUrl}
            />
          </div>

          <div className="mt-4 flex items-center justify-end gap-2 border-border border-t pt-4">
            <button
              className="rounded-xl border border-border px-4 py-2 font-semibold text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
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
      </DialogContent>
    </Dialog>
  );
}

function EditProductModal({
  isOpen,
  onClose,
  onSuccess,
  onToast,
  tenantId,
  product,
  categories,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onToast: (msg: string) => void;
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
    minStockLevel: product.minStockLevel,
    name: product.name,
    sellingPrice: product.sellingPrice,
    sku: product.sku || "",
    status: product.status,
    taxRate: product.taxRate,
    trackInventory: product.trackInventory,
    type: product.type,
    unit: product.unit || "Adet",
  });

  // F1-6 wiring — DTO alanları hazır, modal state burada tutulur
  const initialImages = product.images ?? [];
  const [images, setImages] = useState<string[]>(initialImages);
  const [tags, setTags] = useState<string[]>(product.tags ?? []);
  const [attrRows, setAttrRows] = useState<AttributeRow[]>(() =>
    parseAttributes(product.attributes)
  );
  const [staged, setStaged] = useState<StagedImage[]>([]);
  // F2-4 — SEO state (slug oto-üret + unique, toast çakışmada)
  const [seo, setSeo] = useState<ProductSeoValues>(() => ({
    richDescription: product.richDescription ?? "",
    seoDescription: product.seoDescription ?? "",
    seoTitle: product.seoTitle ?? "",
    slug: product.slug ?? "",
  }));

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      const cleanData: UpdateProductRequest = {
        attributes: serializeAttributes(attrRows),
        barcode: formData.barcode?.trim() || undefined,
        brand: formData.brand?.trim() || undefined,
        categoryId: formData.categoryId ? formData.categoryId : undefined,
        costPrice: Number(formData.costPrice) || 0,
        currency: formData.currency || "TRY",
        description: formData.description?.trim() || undefined,
        discountRate: Number(formData.discountRate) || 0,
        images: images.length > 0 ? images : undefined,
        minStockLevel: Number(formData.minStockLevel) || 5,
        name: formData.name.trim(),
        richDescription: seo.richDescription?.trim() || undefined,
        sellingPrice: Number(formData.sellingPrice) || 0,
        seoDescription: seo.seoDescription?.trim() || undefined,
        seoTitle: seo.seoTitle?.trim() || undefined,
        sku: formData.sku?.trim() || undefined,
        slug: seo.slug?.trim() ? slugifyTr(seo.slug) : undefined,
        status: formData.status || "Active",
        tags: tags.length > 0 ? tags : undefined,
        taxRate: Number(formData.taxRate) ?? 20,
        trackInventory:
          formData.type === "Physical" ? formData.trackInventory : false,
        type: formData.type,
        unit: formData.unit?.trim() || "Adet",
      };

      const res = await ApiClient.updateProduct(
        product.id,
        cleanData,
        tenantId
      );
      if (res.success) {
        // Galeriden kaldırılanlar: fiziksel + DB silme (best-effort)
        const removed = initialImages.filter((url) => !images.includes(url));
        for (const url of removed) {
          try {
            const delRes = await ApiClient.deleteProductImage(
              product.id,
              url,
              tenantId
            );
            if (!delRes.success) {
              onToast(delRes.message ?? "Görsel silinirken hata oluştu.");
            }
          } catch {
            onToast("Görsel silinirken hata oluştu.");
          }
        }
        // Staged dosyalar güncelleme sonrası yüklenir (transactional)
        if (staged.length > 0) {
          await uploadStagedImages(product.id, staged, tenantId, onToast);
          revokeStagedImages(staged);
          setStaged([]);
        }
        onSuccess();
      } else if (isConflictResponse(res)) {
        // 409 — SKU/Barkod çakışması: toast + form hatası
        const friendly = conflictFriendlyMessage(
          res,
          "Güncelleme sırasında bir hata oluştu."
        );
        setSubmitError(friendly);
        onToast(friendly);
      } else {
        setSubmitError(res.message || "Güncelleme sırasında bir hata oluştu.");
      }
    } catch {
      setSubmitError("Bağlantı hatası oluştu.");
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
        className="flex max-h-[90vh] w-full flex-col gap-0 overflow-hidden p-0 text-xs sm:max-w-xl"
        showCloseButton={false}
      >
        <div className="mb-4 flex items-center justify-between border-border border-b p-6 pb-4">
          <DialogTitle className="font-bold text-base text-zinc-900 dark:text-zinc-100">
            Ürün / Hizmet Bilgilerini Düzenle
          </DialogTitle>
          <DialogClose asChild>
            <button
              aria-label="Kapat"
              className="text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </DialogClose>
        </div>

        <form
          className="flex-1 space-y-3 overflow-y-auto p-6"
          onSubmit={handleSubmit}
        >
          {submitError && (
            <div className="rounded-xl bg-rose-50 dark:bg-rose-950/60 p-3 font-medium text-rose-700 dark:text-rose-300 text-xs">
              {submitError}
            </div>
          )}
          <div>
            <Label className="mb-1" required>
              Ürün / Hizmet Adı
            </Label>
            <Input
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              value={formData.name}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="mb-1">Stok Kodu (SKU)</Label>
              <div className="flex items-center gap-1.5">
                <div className="flex-1">
                  <Input
                    onChange={(e) =>
                      setFormData({ ...formData, sku: e.target.value })
                    }
                    placeholder="Örn: PRD-001"
                    value={formData.sku}
                  />
                </div>
                <button
                  aria-label="SKU oto-üret"
                  className="rounded-xl border border-border p-2 text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-blue-600 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
                  onClick={() =>
                    setFormData({ ...formData, sku: generateSku() })
                  }
                  title="SKU oto-üret"
                  type="button"
                >
                  <RefreshCw aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div>
              <Label className="mb-1">Barkod (EAN/UPC)</Label>
              <div className="flex items-center gap-1.5">
                <div className="flex-1">
                  <Input
                    onChange={(e) =>
                      setFormData({ ...formData, barcode: e.target.value })
                    }
                    placeholder="8690000000000"
                    value={formData.barcode}
                  />
                </div>
                <button
                  aria-label="Barkod oto-üret"
                  className="rounded-xl border border-border p-2 text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-blue-600 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
                  onClick={() =>
                    setFormData({ ...formData, barcode: generateBarcode() })
                  }
                  title="Barkod oto-üret (EAN-13)"
                  type="button"
                >
                  <Barcode aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="mb-1">Kategori</Label>
              <Combobox
                clearable
                onChange={(val) =>
                  setFormData({ ...formData, categoryId: val })
                }
                options={[
                  { label: "Kategori Seçin", value: "" },
                  ...categories.map((c) => ({
                    label: `${
                      c.parentId ? `↳ ${c.fullPath || c.name}` : c.name
                    } (${c.productsCount})`,
                    value: c.id,
                  })),
                ]}
                placeholder="Kategori Seçin"
                searchPlaceholder="Kategori ara…"
                value={formData.categoryId || ""}
              />
            </div>
            <div>
              <Label className="mb-1">Durum</Label>
              <Select
                onValueChange={(val) =>
                  setFormData({ ...formData, status: val })
                }
                value={formData.status}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Aktif</SelectItem>
                  <SelectItem value="Draft">Taslak</SelectItem>
                  <SelectItem value="Inactive">Pasif</SelectItem>
                  <SelectItem value="Discontinued">
                    Satıştan Kaldırıldı
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="mb-1">Alış / Maliyet (₺)</Label>
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
                Satış Fiyatı (₺)
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
          </div>

          {/* Images / Tags / Attributes — F1-6 wiring */}
          <div className="space-y-4 rounded-2xl border border-border bg-zinc-50/50 p-4 dark:bg-zinc-800/30">
            <ProductImagesField
              images={images}
              onChange={setImages}
              onStagedChange={setStaged}
              onToast={onToast}
              productName={formData.name.trim() || product.name}
              staged={staged}
            />
            <div>
              <Label className="mb-1">Etiketler</Label>
              <TagsInput onChange={setTags} value={tags} />
            </div>
            <div>
              <Label className="mb-1">Özellikler</Label>
              <AttributesEditor onChange={setAttrRows} value={attrRows} />
            </div>
            {/* F2-4 SEO alanları */}
            <div>
              <ProductSeoFields
                onChange={setSeo}
                productName={formData.name.trim() || product.name}
                values={seo}
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2 border-border border-t pt-4">
            <button
              className="rounded-xl border border-border px-4 py-2 font-semibold text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
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
      </DialogContent>
    </Dialog>
  );
}
