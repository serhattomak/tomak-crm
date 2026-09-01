"use client";

import { Package, Star } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import type { PublicProductDto } from "@/lib/ecommerce-client";

export type ProductTabId = "desc" | "details" | "shipping";

export interface ProductTabsProps {
  product: PublicProductDto;
  tenantSlug: string;
  effectiveSku?: string | null;
}

export function ProductTabs({
  product,
  tenantSlug,
  effectiveSku,
}: ProductTabsProps) {
  const [activeTab, setActiveTab] = React.useState<ProductTabId>("desc");
  const sku = effectiveSku ?? product.sku ?? null;
  const variants = product.variants ?? [];

  function isVariantOutOfStock(variant: NonNullable<PublicProductDto["variants"]>[number]): boolean {
    if (variant.isActive === false) {
      return true;
    }
    if (typeof variant.stock === "number" && variant.stock <= 0) {
      return true;
    }
    return false;
  }

  return (
    <div className="overflow-hidden rounded-[1rem] border border-store-border bg-white shadow-store-sm">
      <div
        aria-label="Ürün sekmeleri"
        className="flex gap-1 border-store-border border-b bg-store-surface p-1"
        role="tablist"
      >
        <button
          aria-selected={activeTab === "desc"}
          className={
            activeTab === "desc"
              ? "flex-1 rounded-full bg-store-primary px-3 py-2 font-semibold text-store-primary-foreground text-xs shadow-store-sm ring-2 ring-store-ring transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
              : "flex-1 rounded-full px-3 py-2 font-medium text-store-muted-foreground text-xs transition-all duration-200 hover:bg-white hover:text-store-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
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
              ? "flex-1 rounded-full bg-store-primary px-3 py-2 font-semibold text-store-primary-foreground text-xs shadow-store-sm ring-2 ring-store-ring transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
              : "flex-1 rounded-full px-3 py-2 font-medium text-store-muted-foreground text-xs transition-all duration-200 hover:bg-white hover:text-store-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
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
              ? "flex-1 rounded-full bg-store-primary px-3 py-2 font-semibold text-store-primary-foreground text-xs shadow-store-sm ring-2 ring-store-ring transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
              : "flex-1 rounded-full px-3 py-2 font-medium text-store-muted-foreground text-xs transition-all duration-200 hover:bg-white hover:text-store-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
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
          <div className="space-y-3" role="tabpanel">
            <h3 className="font-semibold text-sm text-store-ink">Açıklama</h3>
            <p className="text-sm text-store-muted-foreground leading-relaxed">
              {product.description?.trim()
                ? product.description
                : "Bu ürün için açıklama eklenmemiş."}
            </p>
            {product.isFeatured ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-store-accent px-2.5 py-1 font-semibold text-[11px] text-store-accent-foreground">
                <Star aria-hidden="true" className="h-3 w-3" strokeWidth={1.5} />
                Öne çıkan ürün
              </span>
            ) : null}
          </div>
        ) : null}

        {activeTab === "details" ? (
          <div className="space-y-3" role="tabpanel">
            <h3 className="font-semibold text-sm text-store-ink">Özellikler</h3>
            <div className="overflow-hidden rounded-[1rem] border border-store-border">
              <table className="w-full text-left text-xs">
                <tbody className="divide-y divide-store-border">
                  <tr className="bg-white">
                    <th className="px-4 py-2.5 font-medium text-store-muted-foreground">
                      SKU
                    </th>
                    <td className="px-4 py-2.5 font-mono font-semibold text-store-ink">
                      {sku ?? "—"}
                    </td>
                  </tr>
                  <tr className="bg-store-surface">
                    <th className="px-4 py-2.5 font-medium text-store-muted-foreground">
                      Kategori
                    </th>
                    <td className="px-4 py-2.5 font-semibold text-store-ink">
                      {product.categoryName ?? "—"}
                    </td>
                  </tr>
                  <tr className="bg-white">
                    <th className="px-4 py-2.5 font-medium text-store-muted-foreground">
                      Ağırlık
                    </th>
                    <td className="px-4 py-2.5 font-semibold text-store-ink">
                      {product.weight !== null && product.weight !== undefined
                        ? `${product.weight} kg`
                        : "—"}
                    </td>
                  </tr>
                  <tr className="bg-store-surface">
                    <th className="px-4 py-2.5 font-medium text-store-muted-foreground">
                      Para birimi
                    </th>
                    <td className="px-4 py-2.5 font-semibold text-store-ink">
                      {product.currency ?? "TRY"}
                    </td>
                  </tr>
                  <tr className="bg-white">
                    <th className="px-4 py-2.5 font-medium text-store-muted-foreground">
                      Öne çıkan
                    </th>
                    <td className="px-4 py-2.5 font-semibold text-store-ink">
                      {product.isFeatured ? "Evet" : "Hayır"}
                    </td>
                  </tr>
                  <tr className="bg-store-surface">
                    <th className="px-4 py-2.5 font-medium text-store-muted-foreground">
                      Yayın durumu
                    </th>
                    <td className="px-4 py-2.5 font-semibold text-store-ink">
                      {product.isPublished ? "Yayında" : "Taslak"}
                    </td>
                  </tr>
                  {product.barcode ? (
                    <tr className="bg-white">
                      <th className="px-4 py-2.5 font-medium text-store-muted-foreground">
                        Barkod
                      </th>
                      <td className="px-4 py-2.5 font-mono font-semibold text-store-ink">
                        {product.barcode}
                      </td>
                    </tr>
                  ) : null}
                  <tr className="bg-store-surface">
                    <th className="px-4 py-2.5 font-medium text-store-muted-foreground">
                      Slug
                    </th>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-store-ink">
                      {product.slug}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            {variants.length > 0 ? (
              <div className="pt-2">
                <h4 className="font-semibold text-store-ink text-xs">
                  Varyantlar
                </h4>
                <ul className="mt-2 space-y-1.5">
                  {variants.map((v) => (
                    <li
                      className="flex items-center justify-between rounded-[1rem] border border-store-border bg-white px-3 py-2 text-xs shadow-store-sm"
                      key={v.id}
                    >
                      <span className="font-medium text-store-ink">
                        {v.name}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-store-ink">
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
          <div className="space-y-3" role="tabpanel">
            <h3 className="font-semibold text-sm text-store-ink">
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
            <ul className="list-disc space-y-1 pl-5 text-store-muted-foreground text-xs leading-relaxed">
              <li>Tahmini kargoya veriliş: 1-3 iş günü</li>
              <li>İade süresi: teslimattan itibaren 14 gün</li>
              <li>
                Kargo ücreti sepet tutarına göre hesaplanır (ücretsiz kargo
                kampanyaları uygulanır)
              </li>
            </ul>
            <div className="flex items-center gap-2 rounded-[1rem] border border-store-border bg-store-surface p-3 text-store-muted-foreground text-xs">
              <Package aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.5} />
              <span>30 gün içinde iade — orijinal ambalaj ile</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default ProductTabs;
