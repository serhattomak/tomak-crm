"use client";

import { StoreBadge } from "@workspace/ui/components/badge";
import { Price } from "@workspace/ui/components/price";
import { StockIndicator } from "@workspace/ui/components/stock-indicator";
import * as React from "react";
import type { PublicProductVariantDto } from "@/lib/ecommerce-client";

export type VariantPickerVariant = PublicProductVariantDto;

export type VariantDisplayMode = "auto" | "swatch" | "select";

export interface VariantPickerProps {
  variants: VariantPickerVariant[];
  selectedVariantId: string | null;
  onVariantChange: (variant: VariantPickerVariant | null) => void;
  basePrice: number;
  baseSku?: string | null;
  currency?: string;
  compareAtPrice?: number | null;
  tenantSlug: string;
  displayMode?: VariantDisplayMode;
  label?: string;
}

function formatAdditionalPrice(value: number | null | undefined): string | null {
  if (typeof value !== "number" || value === 0) return null;
  const sign = value > 0 ? "+" : "";
  try {
    return `${sign}${new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 2 }).format(value)}`;
  } catch {
    return `${sign}₺${value.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`;
  }
}

function isOutOfStock(variant: VariantPickerVariant): boolean {
  if (variant.isActive === false) return true;
  if (typeof variant.stock === "number" && variant.stock <= 0) return true;
  return false;
}

function resolveDisplayMode(
  variants: VariantPickerVariant[],
  requested: VariantDisplayMode
): "swatch" | "select" {
  if (requested === "swatch") return "swatch";
  if (requested === "select") return "select";
  // auto: swatch for small sets with short names, otherwise select
  if (variants.length === 0) return "select";
  if (variants.length > 6) return "select";
  const avgLen =
    variants.reduce((acc, v) => acc + v.name.length, 0) / variants.length;
  return avgLen <= 12 ? "swatch" : "select";
}

export function VariantPicker({
  variants,
  selectedVariantId,
  onVariantChange,
  basePrice,
  baseSku,
  currency = "TRY",
  compareAtPrice,
  tenantSlug: _tenantSlug,
  displayMode = "auto",
  label = "Varyant",
}: VariantPickerProps) {
  const hasVariants = variants.length > 0;
  const mode = resolveDisplayMode(variants, displayMode);

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

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextId = event.target.value || null;
    if (!nextId) {
      onVariantChange(null);
      return;
    }
    const next = variants.find((v) => v.id === nextId) ?? null;
    if (next && isOutOfStock(next)) return;
    onVariantChange(next);
  };

  const handleSwatchClick = (variant: VariantPickerVariant) => {
    if (isOutOfStock(variant)) return;
    if (variant.id === selectedVariantId) {
      // toggle off to base — allow deselect only if base is meaningful
      // keep selected; do not deselect on same click to avoid accidental clear
      return;
    }
    onVariantChange(variant);
  };

  if (!hasVariants) {
    return (
      <div className="rounded-store border border-store-border bg-store-surface p-3 shadow-store-sm">
        <p className="text-xs text-store-muted-foreground">
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
    <div className="space-y-3 rounded-store-lg border border-store-border bg-store-surface p-4 shadow-store">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="font-semibold text-xs text-store-surface-foreground" id="variant-picker-label">
            {label}
          </p>
          <p className="text-[11px] text-store-muted-foreground">
            {variants.length} seçenek · Seçili: {selectedVariant ? selectedVariant.name : "Varsayılan"}
          </p>
        </div>

        <div className="shrink-0">
          <Price
            compareAtPrice={displayCompareAt}
            currency={currency}
            price={displayPrice}
            size="sm"
          />
          {displayAdditional ? (
            <p className="mt-1 text-right text-[11px] font-medium text-store-primary">
              {displayAdditional} ek
            </p>
          ) : null}
        </div>
      </div>

      {mode === "swatch" ? (
        <div
          aria-labelledby="variant-picker-label"
          className="flex flex-wrap gap-2"
          role="radiogroup"
        >
          {/* Base option — when no variant selected */}
          <button
            aria-checked={selectedVariantId === null}
            aria-label="Varsayılan varyant"
            className={
              selectedVariantId === null
                ? "rounded-store border border-store-primary bg-store-primary px-3 py-1.5 text-xs font-semibold text-store-primary-foreground shadow-store-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
                : "rounded-store border border-store-border bg-store-surface px-3 py-1.5 text-xs font-medium text-store-surface-foreground hover:bg-store-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
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
                    ? "rounded-store border border-store-primary bg-store-primary px-3 py-1.5 text-xs font-semibold text-store-primary-foreground shadow-store-sm ring-2 ring-store-ring focus-visible:outline-none"
                    : outOfStock
                      ? "cursor-not-allowed rounded-store border border-store-border bg-store-muted px-3 py-1.5 text-xs font-medium text-store-muted-foreground opacity-60"
                      : "rounded-store border border-store-border bg-store-surface px-3 py-1.5 text-xs font-medium text-store-surface-foreground hover:bg-store-muted hover:border-store-ring/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
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
                    <span className="rounded-full bg-store-border px-1.5 py-0.5 text-[10px] font-bold leading-none text-store-muted-foreground">
                      Tükendi
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-1.5">
          <label
            className="block text-xs font-medium text-store-surface-foreground"
            htmlFor="variant-picker-select"
          >
            Seçenek
          </label>
          <select
            aria-label={label}
            className="w-full rounded-store border border-store-border bg-store-surface px-3 py-2 text-xs font-medium text-store-surface-foreground shadow-store-sm focus:border-store-ring focus:outline-none focus:ring-2 focus:ring-store-ring disabled:opacity-50"
            id="variant-picker-select"
            onChange={handleSelectChange}
            value={selectedVariantId ?? ""}
          >
            <option value="">Varsayılan — ₺{basePrice.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</option>
            {variants.map((variant) => {
              const outOfStock = isOutOfStock(variant);
              const priceLabel = `₺${variant.price.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`;
              const stockLabel = outOfStock ? " — Tükendi" : "";
              const skuLabel = variant.sku ? ` (${variant.sku})` : "";
              return (
                <option disabled={outOfStock} key={variant.id} value={variant.id}>
                  {variant.name} — {priceLabel}
                  {skuLabel}
                  {stockLabel}
                </option>
              );
            })}
          </select>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {displaySku ? (
          <StoreBadge variant="sku">SKU: {displaySku}</StoreBadge>
        ) : null}
        {selectedVariant?.barcode ? (
          <StoreBadge variant="default">Barkod: {selectedVariant.barcode}</StoreBadge>
        ) : null}
      </div>

      {showStockForSelected ? (
        <StockIndicator lowThreshold={5} stock={displayStock} />
      ) : null}

      {selectedVariant && isOutOfStock(selectedVariant) ? (
        <p className="text-xs font-medium text-red-600 dark:text-red-400" role="alert">
          Seçili varyant stokta yok. Lütfen başka bir seçenek deneyin.
        </p>
      ) : null}
    </div>
  );
}

export default VariantPicker;
