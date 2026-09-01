"use client";

import { StoreBadge } from "@workspace/ui/components/badge";
import { Price } from "@workspace/ui/components/price";
import { QuantityStepper } from "@workspace/ui/components/quantity-stepper";
import { StockIndicator } from "@workspace/ui/components/stock-indicator";
import { Check, Copy, ShoppingBag, Star, Weight } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import type {
  PublicProductDto,
  PublicProductVariantDto,
} from "@/lib/ecommerce-client";
import { EcommerceClient } from "@/lib/ecommerce-client";
import { ensureGuestToken } from "@/lib/guest-token";
import { ProductGallery } from "../gallery";
import { ProductTabs } from "./product-tabs";
import { VariantPicker } from "./variant-picker";

export interface ProductDetailViewProps {
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

export function ProductDetailView({
  product,
  tenantSlug,
  images,
}: ProductDetailViewProps) {
  const variants = product.variants ?? [];
  const [selectedVariantId, setSelectedVariantId] = React.useState<
    string | null
  >(null);
  const [quantity, setQuantity] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

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
        setTimeout(() => setMessage(null), 1500);
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
      // clipboard fallback ignored
    }
  };

  const brand =
    (product as unknown as { brand?: string | null }).brand ?? null;
  const categoryHref = product.categoryId
    ? `/${tenantSlug}/shop?categoryId=${encodeURIComponent(product.categoryId)}`
    : `/${tenantSlug}/shop`;

  return (
    <div className="space-y-6">
      {/* 2-col: sol galeri aspect-[4/3] rounded-[1rem] + square thumb, sağ sticky top-20 */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left gallery */}
        <ProductGallery
          alt={product.name}
          images={images}
          variantImage={variantImage}
        />

        {/* Right sticky panel */}
        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          {/* Brand / SKU mono + badges */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {product.isFeatured ? (
                <StoreBadge
                  icon={<Star aria-hidden="true" className="h-3 w-3" strokeWidth={1.5} />}
                  variant="featured"
                >
                  Öne çıkan
                </StoreBadge>
              ) : null}
              {product.categoryName ? (
                <Link
                  className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
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
                  className="inline-flex items-center gap-1 rounded-full border border-transparent bg-store-muted px-2.5 py-1 font-mono font-semibold text-[11px] text-store-muted-foreground transition-all duration-200 hover:bg-store-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
                  onClick={handleCopySku}
                  type="button"
                >
                  SKU: {effectiveSku}
                  {copied ? (
                    <Check
                      aria-hidden="true"
                      className="h-3 w-3 text-emerald-600"
                      strokeWidth={1.5}
                    />
                  ) : (
                    <Copy aria-hidden="true" className="h-3 w-3" strokeWidth={1.5} />
                  )}
                </button>
              ) : null}
            </div>

            <h1 className="font-normal font-serif text-3xl text-store-ink tracking-tight lg:text-4xl">
              {product.name}
            </h1>
            {brand ? (
              <p className="font-mono text-[11px] text-store-muted-foreground">
                Marka: {brand}
              </p>
            ) : null}
            {effectiveSku ? (
              <p className="font-mono text-[11px] text-store-muted-foreground">
                SKU: {effectiveSku}
              </p>
            ) : null}
            <p className="text-sm text-store-muted-foreground leading-relaxed">
              {product.description?.trim()
                ? product.description
                : "Bu ürün için açıklama eklenmemiş."}
            </p>
          </div>

          {/* Price lg sans bold */}
          <div className="rounded-[1rem] border border-store-border bg-white p-4 shadow-store-sm">
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
                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-store-muted-foreground">
                  <Weight aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={1.5} />
                  {product.weight} kg
                </span>
              ) : null}
            </div>
          </div>

          {/* VariantPicker swatch rounded-full pill */}
          {variants.length > 0 ? (
            <VariantPicker
              basePrice={product.price}
              baseSku={product.sku ?? null}
              compareAtPrice={product.compareAtPrice ?? null}
              currency={product.currency ?? "TRY"}
              onVariantChange={handleVariantChange}
              selectedVariantId={selectedVariantId}
              variants={variants}
            />
          ) : null}

          {/* QuantityStepper + StockIndicator dot */}
          <div className="flex flex-col gap-3 rounded-[1rem] border border-store-border bg-white p-4 shadow-store-sm">
            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-1.5">
                <span className="font-semibold text-store-ink text-xs">
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
                  <p className="mt-1 font-mono text-[11px] text-store-muted-foreground">
                    En fazla {maxQuantity} adet
                  </p>
                ) : null}
              </div>
            </div>

            {/* AddToCart rounded-full bg-store-primary ring-store-ring */}
            <button
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-store-primary px-4 py-3 font-semibold text-sm text-store-primary-foreground shadow-store-sm transition-all duration-200 hover:bg-store-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={loading || isOutOfStock}
              onClick={handleAdd}
              type="button"
            >
              <ShoppingBag aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
              {loading
                ? "Ekleniyor…"
                : isOutOfStock
                  ? "Stokta yok"
                  : "Sepete ekle"}
            </button>

            {message ? (
              <p
                aria-live="polite"
                className="animate-in text-center font-medium text-store-muted-foreground text-xs fade-in slide-in-from-top-1 duration-200"
                role="status"
              >
                {message}
              </p>
            ) : null}

            {isOutOfStock ? (
              <p
                className="text-center font-medium text-red-600 text-xs"
                role="alert"
              >
                Seçili ürün stokta yok — lütfen varyant veya adet değiştirin.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Tabs Açıklama / Özellikler / Teslimat */}
      <ProductTabs
        effectiveSku={effectiveSku}
        product={product}
        tenantSlug={tenantSlug}
      />
    </div>
  );
}

export default ProductDetailView;
