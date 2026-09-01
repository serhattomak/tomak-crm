"use client";

import { StoreBadge } from "@workspace/ui/components/badge";
import { QuantityStepper } from "@workspace/ui/components/quantity-stepper";
import { StockIndicator } from "@workspace/ui/components/stock-indicator";
import { ShoppingBag } from "lucide-react";
import * as React from "react";
import { VariantPicker } from "@/app/(shop)/[tenantSlug]/components/variant-picker";
import { EcommerceClient } from "@/lib/ecommerce-client";
import { ensureGuestToken } from "@/lib/guest-token";
import type { PublicProductVariantDto } from "@/lib/ecommerce-client";

export interface ProductAddToCartProps {
  baseCompareAtPrice?: number | null;
  basePrice: number;
  baseSku?: string | null;
  baseStock?: number | null;
  currency?: string;
  onVariantImageChange?: (imageUrl: string | null) => void;
  productId: string;
  tenantSlug: string;
  variants?: PublicProductVariantDto[];
}

function isVariantOutOfStock(variant: PublicProductVariantDto): boolean {
  if (variant.isActive === false) return true;
  if (typeof variant.stock === "number" && variant.stock <= 0) return true;
  return false;
}

export function ProductAddToCart({
  baseCompareAtPrice,
  basePrice,
  baseSku,
  baseStock,
  currency = "TRY",
  onVariantImageChange,
  productId,
  tenantSlug,
  variants = [],
}: ProductAddToCartProps) {
  const [selectedVariantId, setSelectedVariantId] = React.useState<string | null>(
    null
  );
  const [quantity, setQuantity] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  const selectedVariant = React.useMemo(
    () => variants.find((v) => v.id === selectedVariantId) ?? null,
    [variants, selectedVariantId]
  );

  const effectiveProductId = selectedVariant ? selectedVariant.id : productId;
  const effectiveStock = selectedVariant
    ? (selectedVariant.stock ?? null)
    : (baseStock ?? null);
  const isOutOfStock = React.useMemo(() => {
    if (selectedVariant) return isVariantOutOfStock(selectedVariant);
    if (typeof effectiveStock === "number" && effectiveStock <= 0) return true;
    return false;
  }, [selectedVariant, effectiveStock]);

  const maxQuantity =
    typeof effectiveStock === "number" && effectiveStock > 0
      ? effectiveStock
      : undefined;

  // Clamp quantity when max changes (e.g., variant switch reduces stock)
  React.useEffect(() => {
    if (typeof maxQuantity === "number" && quantity > maxQuantity) {
      setQuantity(maxQuantity);
    }
    if (quantity < 1) setQuantity(1);
  }, [maxQuantity, quantity]);

  // Notify parent of variant image for gallery sync
  React.useEffect(() => {
    if (!onVariantImageChange) return;
    if (selectedVariant?.imageUrl) {
      onVariantImageChange(selectedVariant.imageUrl);
    } else {
      onVariantImageChange(null);
    }
  }, [selectedVariant, onVariantImageChange]);

  const handleVariantChange = (
    variant: PublicProductVariantDto | null
  ) => {
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

  const canAdd = !loading && !isOutOfStock;

  return (
    <div className="space-y-4">
      {variants.length > 0 ? (
        <VariantPicker
          basePrice={basePrice}
          baseSku={baseSku ?? null}
          compareAtPrice={baseCompareAtPrice ?? null}
          currency={currency}
          onVariantChange={handleVariantChange}
          selectedVariantId={selectedVariantId}
          tenantSlug={tenantSlug}
          variants={variants}
        />
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {baseSku ? <StoreBadge variant="sku">SKU: {baseSku}</StoreBadge> : null}
          <StockIndicator stock={effectiveStock} />
        </div>
      )}

      {/* Quantity + Stock row — integrated */}
      <div className="flex flex-wrap items-center gap-3 rounded-store-lg border border-store-border bg-store-surface p-4 shadow-store">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-store-surface-foreground" htmlFor="product-quantity">
            Adet
          </label>
          <QuantityStepper
            disabled={isOutOfStock}
            id="product-quantity"
            max={maxQuantity}
            min={1}
            onChange={setQuantity}
            value={quantity}
          />
          {typeof maxQuantity === "number" ? (
            <span className="text-[11px] text-store-muted-foreground">
              En fazla {maxQuantity} adet
            </span>
          ) : null}
        </div>

        <div className="ml-auto flex flex-col items-end gap-2">
          <StockIndicator stock={effectiveStock} />
          {isOutOfStock ? (
            <span className="text-xs font-medium text-red-600 dark:text-red-400">
              Stokta yok
            </span>
          ) : null}
        </div>
      </div>

      {/* Add to cart */}
      <button
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-store bg-store-primary px-4 py-3 text-sm font-semibold text-store-primary-foreground shadow-store transition-colors hover:bg-store-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring focus-visible:ring-offset-2 focus-visible:ring-offset-store-surface disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={!canAdd}
        onClick={handleAdd}
        type="button"
      >
        <ShoppingBag aria-hidden="true" className="h-4 w-4" />
        {loading ? "Ekleniyor…" : isOutOfStock ? "Stokta yok" : "Sepete ekle"}
      </button>

      {message ? (
        <p
          className="text-center text-xs font-medium text-store-muted-foreground"
          role="status"
          aria-live="polite"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

export default ProductAddToCart;
