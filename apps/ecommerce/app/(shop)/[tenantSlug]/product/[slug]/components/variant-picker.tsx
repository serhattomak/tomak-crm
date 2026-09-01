"use client";

import { StoreBadge } from "@workspace/ui/components/badge";
import { Price } from "@workspace/ui/components/price";
import { StockIndicator } from "@workspace/ui/components/stock-indicator";
import * as React from "react";
import type { PublicProductVariantDto } from "@/lib/ecommerce-client";

export type VariantPickerVariant = PublicProductVariantDto;

export interface VariantPickerProps {
  basePrice: number;
  baseSku?: string | null;
  compareAtPrice?: number | null;
  currency?: string;
  onVariantChange: (variant: VariantPickerVariant | null) => void;
  selectedVariantId: string | null;
  variants: VariantPickerVariant[];
}

function formatAdditionalPrice(
  value: number | null | undefined
): string | null {
  if (typeof value !== "number" || value === 0) {
    return null;
  }
  const sign = value > 0 ? "+" : "";
  try {
    return `${sign}${new Intl.NumberFormat("tr-TR", {
      currency: "TRY",
      minimumFractionDigits: 2,
      style: "currency",
    }).format(value)}`;
  } catch {
    return `${sign}₺${value.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`;
  }
}

function isOutOfStock(variant: VariantPickerVariant): boolean {
  if (variant.isActive === false) {
    return true;
  }
  if (typeof variant.stock === "number" && variant.stock <= 0) {
    return true;
  }
  return false;
}

export function VariantPicker({
  variants,
  selectedVariantId,
  onVariantChange,
  basePrice,
  baseSku,
  currency = "TRY",
  compareAtPrice,
}: VariantPickerProps) {
  const hasVariants = variants.length > 0;

  const selectedVariant = React.useMemo(
    () => variants.find((v) => v.id === selectedVariantId) ?? null,
    [variants, selectedVariantId]
  );

  const displayPrice = selectedVariant ? selectedVariant.price : basePrice;
  const displayCompareAt = selectedVariant ? null : (compareAtPrice ?? null);
  const displaySku = selectedVariant?.sku ?? baseSku ?? null;
  const displayStock = selectedVariant ? (selectedVariant.stock ?? null) : null;
  const displayAdditional = selectedVariant
    ? formatAdditionalPrice(selectedVariant.additionalPrice)
    : null;
  const showStockForSelected = selectedVariant !== null;

  const handleSwatchClick = (variant: VariantPickerVariant) => {
    if (isOutOfStock(variant)) {
      return;
    }
    if (variant.id === selectedVariantId) {
      return;
    }
    onVariantChange(variant);
  };

  if (!hasVariants) {
    return (
      <div className="rounded-[1rem] border border-store-border bg-white p-3 shadow-store-sm">
        <p className="text-store-muted-foreground text-xs">
          Bu ürün için varyant bulunmuyor.
        </p>
        {displaySku ? (
          <StoreBadge className="mt-2" variant="sku">
            SKU: {displaySku}
          </StoreBadge>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-[1rem] border border-store-border bg-white p-4 shadow-store-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p
            className="font-semibold text-store-ink text-xs"
            id="variant-picker-label"
          >
            Varyant
          </p>
          <p className="text-[11px] text-store-muted-foreground">
            {variants.length} seçenek · Seçili:{" "}
            {selectedVariant ? selectedVariant.name : "Varsayılan"}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <Price
            compareAtPrice={displayCompareAt}
            currency={currency}
            price={displayPrice}
            size="sm"
          />
          {displayAdditional ? (
            <p className="mt-1 font-medium text-[11px] text-store-primary">
              {displayAdditional} ek
            </p>
          ) : null}
        </div>
      </div>

      <div
        aria-labelledby="variant-picker-label"
        className="flex flex-wrap gap-2"
        role="radiogroup"
      >
        {/* Base option — rounded-full pill */}
        <button
          aria-checked={selectedVariantId === null}
          aria-label="Varsayılan varyant"
          className={
            selectedVariantId === null
              ? "rounded-full border border-store-primary bg-store-primary px-3.5 py-1.5 font-semibold text-store-primary-foreground text-xs shadow-store-sm ring-2 ring-store-ring transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
              : "rounded-full border border-store-border bg-white px-3.5 py-1.5 font-medium text-store-ink text-xs transition-all duration-200 hover:bg-store-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
          }
          onClick={() => onVariantChange(null)}
          role="radio"
          type="button"
        >
          Varsayılan
        </button>

        {variants.map((variant) => {
          const outOfStock = isOutOfStock(variant);
          const isSelected = variant.id === selectedVariantId;
          return (
            <button
              aria-checked={isSelected}
              aria-disabled={outOfStock ? "true" : undefined}
              aria-label={`${variant.name}${outOfStock ? " — stokta yok" : ""}${variant.sku ? ` — ${variant.sku}` : ""}`}
              className={
                isSelected
                  ? "rounded-full border border-store-primary bg-store-primary px-3.5 py-1.5 font-semibold text-store-primary-foreground text-xs shadow-store-sm ring-2 ring-store-ring transition-all duration-200 focus-visible:outline-none"
                  : outOfStock
                    ? "cursor-not-allowed rounded-full border border-store-border bg-store-muted px-3.5 py-1.5 font-medium text-store-muted-foreground text-xs opacity-60"
                    : "rounded-full border border-store-border bg-white px-3.5 py-1.5 font-medium text-store-ink text-xs transition-all duration-200 hover:border-store-ring/30 hover:bg-store-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
              }
              disabled={outOfStock}
              key={variant.id}
              onClick={() => handleSwatchClick(variant)}
              role="radio"
              type="button"
            >
              <span className="inline-flex items-center gap-1.5">
                {variant.name}
                {outOfStock ? (
                  <span className="rounded-full bg-store-border px-1.5 py-0.5 font-bold text-[10px] text-store-muted-foreground leading-none">
                    Tükendi
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {displaySku ? (
          <StoreBadge variant="sku">SKU: {displaySku}</StoreBadge>
        ) : null}
        {selectedVariant?.barcode ? (
          <StoreBadge variant="default">
            Barkod: {selectedVariant.barcode}
          </StoreBadge>
        ) : null}
      </div>

      {showStockForSelected ? (
        <StockIndicator lowThreshold={5} stock={displayStock} />
      ) : null}

      {selectedVariant && isOutOfStock(selectedVariant) ? (
        <p
          className="font-medium text-red-600 text-xs dark:text-red-400"
          role="alert"
        >
          Seçili varyant stokta yok. Lütfen başka bir seçenek deneyin.
        </p>
      ) : null}
    </div>
  );
}

export default VariantPicker;
