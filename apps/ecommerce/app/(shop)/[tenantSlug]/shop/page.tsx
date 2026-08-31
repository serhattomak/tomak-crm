import { Package } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EcommerceClient } from "@/lib/ecommerce-client";
import { AddToCartButton } from "./add-to-cart-button";

const TENANT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isValidTenantSlug(slug: string): boolean {
  return (
    TENANT_SLUG_PATTERN.test(slug) && slug.length >= 2 && slug.length <= 64
  );
}

interface ShopPageProps {
  params: Promise<{ tenantSlug: string }>;
  searchParams?: Promise<{ page?: string; search?: string }>;
}

export const revalidate = 60;

export default async function ShopPage({
  params,
  searchParams,
}: ShopPageProps) {
  const { tenantSlug } = await params;
  const sp = searchParams ? await searchParams : {};
  const page = Number.parseInt(sp.page ?? "1", 10) || 1;
  const search = sp.search?.trim() || undefined;

  if (!isValidTenantSlug(tenantSlug)) {
    notFound();
  }

  // Guard: tenant_modules.ecommerce_enabled — if API exposes storefront, respect 404
  const storefront = await EcommerceClient.getStorefront(tenantSlug).catch(
    () => ({ success: false as const })
  );
  if (
    storefront.success &&
    storefront.data &&
    storefront.data.ecommerceEnabled === false
  ) {
    notFound();
  }

  // Catalog fetch — ISR 60s, tenantSlug + is_published, no service_role write
  const catalog = await EcommerceClient.getPublicProducts(
    { isPublished: true, page, pageSize: 12, search },
    tenantSlug
  ).catch(() => ({ data: { items: [], totalCount: 0 }, success: false }));

  const products = catalog.success ? (catalog.data?.items ?? []) : [];
  const totalCount = catalog.success ? (catalog.data?.totalCount ?? 0) : 0;

  return (
    <div className="space-y-6">
      {/* Hero / Tenant context */}
      <div className="rounded-[24px] border border-zinc-200/80 bg-white p-6 shadow-xs sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h1 className="font-bold text-2xl text-zinc-900 tracking-tight sm:text-3xl dark:text-zinc-100">
              {tenantSlug} Mağazası
            </h1>
            <p className="max-w-xl text-sm text-zinc-500 dark:text-zinc-400">
              CRM public API ·{" "}
              <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[11px] dark:bg-zinc-800">
                GET /api/public/products?tenantSlug={tenantSlug}
                &is_published=true
              </code>{" "}
              · ISR 60s
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="rounded-full bg-zinc-900 px-2.5 py-1 font-semibold text-[11px] text-white dark:bg-white dark:text-zinc-900">
                {totalCount} ürün
              </span>
              <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 font-medium text-[11px] text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                tenantSlug: {tenantSlug}
              </span>
            </div>
          </div>

          <form className="flex shrink-0 items-center gap-2" action="">
            <input
              className="w-48 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs placeholder:text-zinc-400 focus:border-violet-400 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900"
              defaultValue={search}
              name="search"
              placeholder="Ürün ara…"
              type="text"
            />
            <button
              className="rounded-xl bg-zinc-900 px-4 py-2 font-semibold text-white text-xs dark:bg-white dark:text-zinc-900"
              type="submit"
            >
              Ara
            </button>
          </form>
        </div>
      </div>

      {/* Catalog grid — is_published only */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
            Katalog
          </h2>
          <span className="text-[11px] text-zinc-400">
            {products.length === 0 ? "Ürün bulunamadı" : `${products.length} ürün`}
          </span>
        </div>

        {products.length === 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* biome-ignore lint/suspicious/noArrayIndexKey: static placeholder skeleton, stable order */}
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                className="flex flex-col rounded-2xl border border-zinc-200/80 border-dashed bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                key={idx}
              >
                <div className="flex h-32 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
                  <Package className="h-6 w-6 text-zinc-400" />
                </div>
                <div className="mt-3 h-3 w-3/4 rounded bg-zinc-100 dark:bg-zinc-800" />
                <div className="mt-2 h-3 w-1/2 rounded bg-zinc-100 dark:bg-zinc-800" />
                <p className="mt-3 text-[11px] text-zinc-400">
                  CRM → Products · is_published=true · ISR 60s
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <div
                className="flex flex-col rounded-2xl border border-zinc-200/80 bg-white p-4 transition hover:border-zinc-300 hover:shadow-xs dark:border-zinc-800 dark:bg-zinc-900"
                key={product.id}
              >
                <Link
                  className="flex h-36 items-center justify-center overflow-hidden rounded-xl bg-zinc-50 dark:bg-zinc-800"
                  href={`/${tenantSlug}/product/${product.slug}`}
                >
                  {product.imageUrl ? (
                    // Use img for external urls; next/image would need domain allowlist — keep img for now
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={product.name}
                      className="h-full w-full object-cover"
                      src={product.imageUrl}
                    />
                  ) : (
                    <Package className="h-6 w-6 text-zinc-400" />
                  )}
                </Link>

                <Link
                  className="mt-3 line-clamp-1 font-semibold text-sm text-zinc-900 hover:text-violet-600 dark:text-zinc-100"
                  href={`/${tenantSlug}/product/${product.slug}`}
                >
                  {product.name}
                </Link>
                <p className="line-clamp-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                  {product.description ?? "Açıklama yok"}
                </p>
                {product.weight ? (
                  <span className="mt-1 text-[11px] text-zinc-400">
                    Ağırlık: {product.weight} kg{" "}
                    {product.isFeatured ? "· Öne çıkan" : ""}
                  </span>
                ) : product.isFeatured ? (
                  <span className="mt-1 text-[11px] text-amber-600">Öne çıkan</span>
                ) : null}

                <div className="mt-3 flex items-center justify-between">
                  <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                    ₺{product.price.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    Stok: {product.stock ?? "-"}
                  </span>
                </div>

                <AddToCartButton
                  productId={product.id}
                  slug={product.slug}
                  tenantSlug={tenantSlug}
                />
              </div>
            ))}
          </div>
        )}

        {/* Pagination — simple */}
        {totalCount > 12 ? (
          <div className="flex items-center justify-center gap-2 pt-2">
            <Link
              className={`rounded-xl border px-3 py-1.5 text-xs font-medium ${page <= 1 ? "pointer-events-none opacity-40 border-zinc-200" : "border-zinc-300 hover:bg-zinc-50"}`}
              href={`/${tenantSlug}/shop?page=${page - 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
            >
              Önceki
            </Link>
            <span className="text-xs text-zinc-500">Sayfa {page}</span>
            <Link
              className="rounded-xl border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50"
              href={`/${tenantSlug}/shop?page=${page + 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
            >
              Sonraki
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
