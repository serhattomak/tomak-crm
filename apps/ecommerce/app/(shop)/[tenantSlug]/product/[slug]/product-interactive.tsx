"use client";

import { StoreBadge } from "@workspace/ui/components/badge";
import { Price } from "@workspace/ui/components/price";
import { QuantityStepper } from "@workspace/ui/components/quantity-stepper";
import { StockIndicator } from "@workspace/ui/components/stock-indicator";
import { Check, Copy, Package, ShoppingBag, Star, Weight } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { VariantPicker } from "@/app/(shop)/[tenantSlug]/components/variant-picker";
import type {
  PublicProductDto,
  PublicProductVariantDto,
} from "@/lib/ecommerce-client";
import { EcommerceClient } from "@/lib/ecommerce-client";
import { ensureGuestToken } from "@/lib/guest-token";
import { ProductGallery } from "./gallery";

export interface ProductInteractiveProps {
  images: string[];
  product: PublicProductDto;
  tenantSlug: string;
}

function isVariantOutOfStock(variant: PublicProductVariantDto): boolean {
  if (variant.isActive === false) {
    return true;
  }
  if (typeof variant.stock === "number" && variant.stock <= 0) {
    return true;
  }
  return false;
}

export function ProductInteractive({
  product,
  tenantSlug,
  images,
}: ProductInteractiveProps) {
  const variants = product.variants ?? [];
  const [selectedVariantId, setSelectedVariantId] = React.useState<
    string | null
  >(null);
  const [quantity, setQuantity] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<
    "desc" | "details" | "shipping"
  >("desc");

  const selectedVariant = React.useMemo(
    () => variants.find((v) => v.id === selectedVariantId) ?? null,
    [variants, selectedVariantId]
  );

  const effectivePrice = selectedVariant
    ? selectedVariant.price
    : product.price;
  const effectiveCompareAt = selectedVariant
    ? null
    : (product.compareAtPrice ?? null);
  const effectiveStock = selectedVariant
    ? (selectedVariant.stock ?? null)
    : (product.stock ?? null);
  const effectiveSku = selectedVariant?.sku ?? product.sku ?? null;
  const variantImage = selectedVariant?.imageUrl ?? null;

  const isOutOfStock = React.useMemo(() => {
    if (selectedVariant) {
      return isVariantOutOfStock(selectedVariant);
    }
    if (typeof effectiveStock === "number" && effectiveStock <= 0) {
      return true;
    }
    return false;
  }, [selectedVariant, effectiveStock]);

  const maxQuantity =
    typeof effectiveStock === "number" && effectiveStock > 0
      ? effectiveStock
      : undefined;

  React.useEffect(() => {
    if (typeof maxQuantity === "number" && quantity > maxQuantity) {
      setQuantity(maxQuantity);
    }
  }, [maxQuantity, quantity]);

  const handleVariantChange = (variant: PublicProductVariantDto | null) => {
    if (variant) {
      setSelectedVariantId(variant.id);
    } else {
      setSelectedVariantId(null);
    }
    setQuantity(1);
    setMessage(null);
  };

  const handleAdd = async () => {
    if (isOutOfStock) {
      setMessage("Ürün stokta yok");
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const guestToken = ensureGuestToken();
      const effectiveProductId = selectedVariant
        ? selectedVariant.id
        : product.id;
      const res = await EcommerceClient.addToCart(
        { guestToken, productId: effectiveProductId, quantity },
        tenantSlug
      );
      if (res.success) {
        setMessage("Sepete eklendi ✓");
      } else {
        setMessage(res.message ?? "Eklenemedi");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleCopySku = async () => {
    if (!effectiveSku) {
      return;
    }
    try {
      await navigator.clipboard.writeText(effectiveSku);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // fallback ignored
    }
  };

  const brand = (product as unknown as { brand?: string | null }).brand ?? null;
  const categoryHref = product.categoryId
    ? `/${tenantSlug}/shop?categoryId=${encodeURIComponent(product.categoryId)}`
    : `/${tenantSlug}/shop`;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Gallery */}
        <ProductGallery
          alt={product.name}
          images={images}
          variantImage={variantImage}
        />

        {/* Detail */}
        <div className="space-y-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {product.isFeatured ? (
                <StoreBadge
                  icon={<Star aria-hidden="true" className="h-3 w-3" />}
                  variant="featured"
                >
                  Öne çıkan
                </StoreBadge>
              ) : null}
              {product.categoryName ? (
                <Link
                  className="rounded-store-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
                  href={categoryHref}
                >
                  <StoreBadge variant="category">
                    {product.categoryName}
                  </StoreBadge>
                </Link>
              ) : null}
              {brand ? (
                <StoreBadge variant="default">{brand}</StoreBadge>
              ) : null}
              {effectiveSku ? (
                <button
                  aria-label={
                    copied ? "Kopyalandı" : `SKU ${effectiveSku} kopyala`
                  }
                  className="inline-flex items-center gap-1 rounded-full border border-transparent bg-store-muted px-2.5 py-1 font-mono font-semibold text-[11px] text-store-muted-foreground transition-colors hover:bg-store-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
                  onClick={handleCopySku}
                  type="button"
                >
                  SKU: {effectiveSku}
                  {copied ? (
                    <Check
                      aria-hidden="true"
                      className="h-3 w-3 text-emerald-600"
                    />
                  ) : (
                    <Copy aria-hidden="true" className="h-3 w-3" />
                  )}
                </button>
              ) : null}
            </div>

            <h1 className="mt-3 font-bold font-store-display text-2xl text-store-surface-foreground tracking-tight">
              {product.name}
            </h1>
            {brand ? (
              <p className="mt-1 font-medium text-store-muted-foreground text-xs">
                Marka: {brand}
              </p>
            ) : null}
            <p className="mt-2 text-sm text-store-muted-foreground leading-relaxed">
              {product.description?.trim()
                ? product.description
                : "Bu ürün için açıklama eklenmemiş."}
            </p>
          </div>

          <div className="rounded-store-lg border border-store-border bg-store-surface p-4 shadow-store">
            <Price
              compareAtPrice={effectiveCompareAt}
              currency={product.currency ?? "TRY"}
              price={effectivePrice}
              showCurrencyLabel
              size="lg"
            />
            <div className="mt-2 flex items-center gap-2">
              <StockIndicator stock={effectiveStock} />
              {product.weight !== null && product.weight !== undefined ? (
                <span className="inline-flex items-center gap-1 text-store-muted-foreground text-xs">
                  <Weight aria-hidden="true" className="h-3.5 w-3.5" />
                  {product.weight} kg
                </span>
              ) : null}
            </div>
          </div>

          {variants.length > 0 ? (
            <VariantPicker
              basePrice={product.price}
              baseSku={product.sku ?? null}
              compareAtPrice={product.compareAtPrice ?? null}
              currency={product.currency ?? "TRY"}
              onVariantChange={handleVariantChange}
              selectedVariantId={selectedVariantId}
              tenantSlug={tenantSlug}
              variants={variants}
            />
          ) : null}

          <div className="flex flex-col gap-3 rounded-store-lg border border-store-border bg-store-surface p-4 shadow-store">
            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-1">
                <span className="font-semibold text-store-surface-foreground text-xs">
                  Adet
                </span>
                <QuantityStepper
                  disabled={isOutOfStock}
                  max={maxQuantity}
                  min={1}
                  onChange={setQuantity}
                  value={quantity}
                />
              </div>
              <div className="ml-auto text-right">
                <StockIndicator stock={effectiveStock} />
                {typeof maxQuantity === "number" ? (
                  <p className="mt-1 text-[11px] text-store-muted-foreground">
                    En fazla {maxQuantity} adet
                  </p>
                ) : null}
              </div>
            </div>

            <button
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-store bg-store-primary px-4 py-3 font-semibold text-sm text-store-primary-foreground shadow-store-sm transition-colors hover:bg-store-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring focus-visible:ring-offset-2 focus-visible:ring-offset-store-surface disabled:cursor-not-allowed disabled:opacity-50"
              disabled={loading || isOutOfStock}
              onClick={handleAdd}
              type="button"
            >
              <ShoppingBag aria-hidden="true" className="h-4 w-4" />
              {loading
                ? "Ekleniyor…"
                : isOutOfStock
                  ? "Stokta yok"
                  : "Sepete ekle"}
            </button>

            {message ? (
              <p
                aria-live="polite"
                className="text-center font-medium text-store-muted-foreground text-xs"
                role="status"
              >
                {message}
              </p>
            ) : null}

            {isOutOfStock ? (
              <p
                className="text-center font-medium text-red-600 text-xs dark:text-red-400"
                role="alert"
              >
                Seçili ürün stokta yok — lütfen varyant veya adet değiştirin.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-store-xl border border-store-border bg-store-surface shadow-store">
        <div className="flex gap-1 border-store-border border-b p-1">
          <button
            aria-selected={activeTab === "desc"}
            className={
              activeTab === "desc"
                ? "flex-1 rounded-store bg-store-primary px-3 py-2 font-semibold text-store-primary-foreground text-xs shadow-store-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
                : "flex-1 rounded-store px-3 py-2 font-medium text-store-muted-foreground text-xs hover:bg-store-muted hover:text-store-surface-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
            }
            onClick={() => setActiveTab("desc")}
            role="tab"
            type="button"
          >
            Açıklama
          </button>
          <button
            aria-selected={activeTab === "details"}
            className={
              activeTab === "details"
                ? "flex-1 rounded-store bg-store-primary px-3 py-2 font-semibold text-store-primary-foreground text-xs shadow-store-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
                : "flex-1 rounded-store px-3 py-2 font-medium text-store-muted-foreground text-xs hover:bg-store-muted hover:text-store-surface-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
            }
            onClick={() => setActiveTab("details")}
            role="tab"
            type="button"
          >
            Özellikler
          </button>
          <button
            aria-selected={activeTab === "shipping"}
            className={
              activeTab === "shipping"
                ? "flex-1 rounded-store bg-store-primary px-3 py-2 font-semibold text-store-primary-foreground text-xs shadow-store-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
                : "flex-1 rounded-store px-3 py-2 font-medium text-store-muted-foreground text-xs hover:bg-store-muted hover:text-store-surface-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
            }
            onClick={() => setActiveTab("shipping")}
            role="tab"
            type="button"
          >
            Teslimat
          </button>
        </div>

        <div className="p-5">
          {activeTab === "desc" ? (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-store-surface-foreground">
                Açıklama
              </h3>
              <p className="text-sm text-store-muted-foreground leading-relaxed">
                {product.description?.trim()
                  ? product.description
                  : "Bu ürün için açıklama eklenmemiş."}
              </p>
              {product.isFeatured ? (
                <span className="inline-flex items-center gap-1 rounded-store-sm bg-store-accent px-2 py-1 font-semibold text-[11px] text-store-accent-foreground">
                  <Star aria-hidden="true" className="h-3 w-3" />
                  Öne çıkan ürün
                </span>
              ) : null}
            </div>
          ) : null}

          {activeTab === "details" ? (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-store-surface-foreground">
                Özellikler
              </h3>
              <dl className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-store border border-store-border bg-store-muted/40 p-3">
                  <dt className="font-medium text-store-muted-foreground">
                    SKU
                  </dt>
                  <dd className="mt-1 font-mono font-semibold text-store-surface-foreground">
                    {effectiveSku ?? "—"}
                  </dd>
                </div>
                <div className="rounded-store border border-store-border bg-store-muted/40 p-3">
                  <dt className="font-medium text-store-muted-foreground">
                    Kategori
                  </dt>
                  <dd className="mt-1 font-semibold text-store-surface-foreground">
                    {product.categoryName ?? "—"}
                  </dd>
                </div>
                <div className="rounded-store border border-store-border bg-store-muted/40 p-3">
                  <dt className="font-medium text-store-muted-foreground">
                    Ağırlık
                  </dt>
                  <dd className="mt-1 font-semibold text-store-surface-foreground">
                    {product.weight !== null && product.weight !== undefined
                      ? `${product.weight} kg`
                      : "—"}
                  </dd>
                </div>
                <div className="rounded-store border border-store-border bg-store-muted/40 p-3">
                  <dt className="font-medium text-store-muted-foreground">
                    Para birimi
                  </dt>
                  <dd className="mt-1 font-semibold text-store-surface-foreground">
                    {product.currency ?? "TRY"}
                  </dd>
                </div>
                <div className="rounded-store border border-store-border bg-store-muted/40 p-3">
                  <dt className="font-medium text-store-muted-foreground">
                    Öne çıkan
                  </dt>
                  <dd className="mt-1 font-semibold text-store-surface-foreground">
                    {product.isFeatured ? "Evet" : "Hayır"}
                  </dd>
                </div>
                <div className="rounded-store border border-store-border bg-store-muted/40 p-3">
                  <dt className="font-medium text-store-muted-foreground">
                    Yayın durumu
                  </dt>
                  <dd className="mt-1 font-semibold text-store-surface-foreground">
                    {product.isPublished ? "Yayında" : "Taslak"}
                  </dd>
                </div>
                {selectedVariant?.barcode || product.barcode ? (
                  <div className="rounded-store border border-store-border bg-store-muted/40 p-3">
                    <dt className="font-medium text-store-muted-foreground">
                      Barkod
                    </dt>
                    <dd className="mt-1 font-mono font-semibold text-store-surface-foreground">
                      {selectedVariant?.barcode ?? product.barcode ?? "—"}
                    </dd>
                  </div>
                ) : null}
                <div className="col-span-2 rounded-store border border-store-border bg-store-muted/40 p-3">
                  <dt className="font-medium text-store-muted-foreground">
                    Slug
                  </dt>
                  <dd className="mt-1 font-mono text-[11px] text-store-surface-foreground">
                    {product.slug}
                  </dd>
                </div>
              </dl>
              {variants.length > 0 ? (
                <div className="pt-2">
                  <h4 className="font-semibold text-store-surface-foreground text-xs">
                    Varyantlar
                  </h4>
                  <ul className="mt-2 space-y-1">
                    {variants.map((v) => (
                      <li
                        className="flex items-center justify-between rounded-store border border-store-border bg-store-surface px-3 py-2 text-xs"
                        key={v.id}
                      >
                        <span className="font-medium text-store-surface-foreground">
                          {v.name}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="font-semibold">
                            ₺
                            {v.price.toLocaleString("tr-TR", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                          {typeof v.stock === "number" ? (
                            <span className="text-[11px] text-store-muted-foreground">
                              {v.stock} adet
                            </span>
                          ) : null}
                          {isVariantOutOfStock(v) ? (
                            <span className="rounded-full bg-store-muted px-1.5 py-0.5 font-bold text-[10px] text-store-muted-foreground">
                              Tükendi
                            </span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          {activeTab === "shipping" ? (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-store-surface-foreground">
                Teslimat & İade
              </h3>
              <p className="text-sm text-store-muted-foreground leading-relaxed">
                Siparişleriniz CRM üzerinden{" "}
                <code className="rounded bg-store-muted px-1 py-0.5 font-mono text-[11px]">
                  status=Confirmed
                </code>{" "}
                ve{" "}
                <code className="rounded bg-store-muted px-1 py-0.5 font-mono text-[11px]">
                  source=ECommerce
                </code>{" "}
                olarak oluşturulur. Kargo takibi{" "}
                <Link
                  className="font-medium text-store-primary underline hover:text-store-primary/80"
                  href={`/${tenantSlug}/my-orders`}
                >
                  Hesabım → Siparişlerim
                </Link>{" "}
                üzerinden 30s polling + Realtime ile güncellenir.
              </p>
              <ul className="list-disc pl-5 text-store-muted-foreground text-xs leading-relaxed">
                <li>Tahmini kargoya veriliş: 1-3 iş günü</li>
                <li>İade süresi: teslimattan itibaren 14 gün</li>
                <li>
                  Kargo ücreti sepet tutarına göre hesaplanır (ücretsiz kargo
                  kampanyaları uygulanır)
                </li>
              </ul>
              <div className="flex items-center gap-2 rounded-store border border-store-border bg-store-muted/30 p-3 text-store-muted-foreground text-xs">
                <Package aria-hidden="true" className="h-4 w-4 shrink-0" />
                <span>30 gün içinde iade — orijinal ambalaj ile</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default ProductInteractive;
