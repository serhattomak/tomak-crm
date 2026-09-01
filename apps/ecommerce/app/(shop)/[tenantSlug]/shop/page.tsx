import { Package, Search as SearchIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EcommerceClient } from "@/lib/ecommerce-client";
import { CategoryPills } from "../components/category-pills";
import { HeroBento } from "../components/hero-bento";
import { ProductCard } from "../components/product-card";

const TENANT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isValidTenantSlug(slug: string): boolean {
  return (
    TENANT_SLUG_PATTERN.test(slug) && slug.length >= 2 && slug.length <= 64
  );
}

interface ShopPageProps {
  params: Promise<{ tenantSlug: string }>;
  searchParams?: Promise<{
    page?: string;
    search?: string;
    categoryId?: string;
  }>;
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
  const categoryId = sp.categoryId?.trim() || undefined;

  if (!isValidTenantSlug(tenantSlug)) {
    notFound();
  }

  // Guard: tenant_modules.ecommerce_enabled
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

  // Catalog + featured for hero/pills — parallel, ISR 60s
  const [catalog, featuredRes] = await Promise.all([
    EcommerceClient.getPublicProducts(
      { categoryId, isPublished: true, page, pageSize: 12, search },
      tenantSlug
    ).catch(() => ({
      data: { items: [], totalCount: 0 },
      success: false as const,
    })),

    EcommerceClient.getPublicProducts(
      { isFeatured: true, isPublished: true, page: 1, pageSize: 20 },
      tenantSlug
    ).catch(() => ({ data: { items: [] }, success: false as const })),
  ]);

  const products = catalog.success ? (catalog.data?.items ?? []) : [];
  const totalCount = catalog.success ? (catalog.data?.totalCount ?? 0) : 0;

  const featuredProducts =
    featuredRes.success && featuredRes.data?.items
      ? featuredRes.data.items
      : [];

  // Hero candidates: prefer featured, fallback to catalog
  const heroProducts =
    featuredProducts.length > 0 ? featuredProducts : products;

  // Category pills: dedupe from is_featured products
  const categoryMap = new Map<string, string>();
  for (const product of featuredProducts) {
    if (
      product.categoryId &&
      product.categoryName &&
      !categoryMap.has(product.categoryId)
    ) {
      categoryMap.set(product.categoryId, product.categoryName);
    }
  }
  const categories = Array.from(categoryMap.entries()).map(([id, name]) => ({
    id,
    name,
  }));

  // Also include categories from current catalog if featured empty
  if (categories.length === 0) {
    for (const product of products) {
      if (
        product.categoryId &&
        product.categoryName &&
        !categoryMap.has(product.categoryId)
      ) {
        categoryMap.set(product.categoryId, product.categoryName);
        categories.push({ id: product.categoryId, name: product.categoryName });
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Hero bento */}
      <HeroBento
        products={heroProducts}
        tenantSlug={tenantSlug}
        totalCount={totalCount}
      />

      {/* Category pills + inline search (mobile/desktop) */}
      <div className="space-y-3" id="categories">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CategoryPills
            activeCategoryId={categoryId ?? null}
            categories={categories}
            search={search}
            tenantSlug={tenantSlug}
          />

          {/* Secondary search — visible on shop page for quick filter */}
          <form
            action={`/${tenantSlug}/shop`}
            aria-label="Katalogda ara"
            className="flex w-full max-w-xl items-center gap-2 sm:w-auto"
            method="get"
            role="search"
          >
            {categoryId ? (
              <input name="categoryId" type="hidden" value={categoryId} />
            ) : null}
            <label className="sr-only" htmlFor="shop-search">
              Katalogda ara
            </label>
            <span className="relative flex w-full items-center">
              <SearchIcon
                aria-hidden="true"
                className="pointer-events-none absolute left-3 h-4 w-4 text-store-muted-foreground"
                strokeWidth={1.5}
              />
              <input
                className="w-full rounded-full border border-store-border bg-white py-2 pr-4 pl-9 text-store-ink text-xs placeholder:text-store-muted-foreground focus:border-store-ring focus:outline-none focus:ring-2 focus:ring-store-ring"
                defaultValue={search}
                id="shop-search"
                name="search"
                placeholder="Katalogda ara…"
                type="search"
              />
            </span>
            <button
              className="hidden rounded-full bg-store-primary px-4 py-2 font-semibold text-store-primary-foreground text-xs hover:bg-store-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring sm:inline-flex"
              type="submit"
            >
              Ara
            </button>
          </form>
        </div>

        {(search || categoryId) && products.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-store-muted-foreground">
              Filtre: {search ? `"${search}"` : ""}{" "}
              {search && categoryId ? "·" : ""}{" "}
              {categoryId
                ? (categories.find((c) => c.id === categoryId)?.name ??
                  categoryId)
                : ""}
            </span>
            <Link
              className="rounded-full border border-store-border bg-white px-3 py-1 font-medium text-store-ink text-xs hover:bg-store-muted"
              href={`/${tenantSlug}/shop#categories`}
            >
              Temizle
            </Link>
          </div>
        ) : null}
      </div>

      {/* Catalog grid — is_published only, 3'lü grid, max-w 80rem */}
      <section aria-label="Katalog" className="space-y-3" id="catalog">
        <div className="flex items-center justify-between">
          <h2 className="font-normal font-serif text-lg text-store-ink tracking-tight">
            Katalog
          </h2>
          <span className="text-store-muted-foreground text-xs">
            {products.length === 0
              ? "Ürün bulunamadı"
              : `${totalCount} üründen ${products.length} gösteriliyor`}
          </span>
        </div>

        {products.length === 0 ? (
          <div className="space-y-4">
            {/* Empty illustration — editorial */}
            <div className="flex flex-col items-center justify-center gap-3 rounded-[1rem] border border-store-border border-dashed bg-white px-6 py-12 text-center shadow-store-sm">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-store-muted">
                <Package
                  aria-hidden="true"
                  className="h-8 w-8 text-store-muted-foreground"
                  strokeWidth={1.5}
                />
              </span>
              <h3 className="font-normal font-serif text-store-ink text-xl">
                Henüz ürün yok
              </h3>
              <p className="max-w-md text-sm text-store-muted-foreground leading-relaxed">
                Bu mağazada is_published ürün bulunamadı.{" "}
                {search ? `"${search}" araması için sonuç yok.` : ""}{" "}
                {categoryId ? "Seçili kategori boş olabilir." : ""}
                Filtreleri temizleyin veya daha sonra tekrar deneyin.
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                {search || categoryId ? (
                  <Link
                    className="inline-flex rounded-full bg-store-primary px-4 py-2 font-semibold text-store-primary-foreground text-xs hover:bg-store-primary/90"
                    href={`/${tenantSlug}/shop#catalog`}
                  >
                    Filtreleri temizle
                  </Link>
                ) : null}
                <Link
                  className="inline-flex rounded-full border border-store-border bg-white px-4 py-2 font-medium text-store-ink text-xs hover:bg-store-muted"
                  href={`/${tenantSlug}/shop`}
                >
                  Mağazayı yenile
                </Link>
              </div>
              <p className="font-mono text-[11px] text-store-muted-foreground">
                GET /api/public/products?tenantSlug={tenantSlug}
                &is_published=true · ISR 60s
              </p>
            </div>

            {/* Skeleton placeholders keep grid rhythm */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {/* biome-ignore lint/suspicious/noArrayIndexKey: static placeholder skeleton, stable order */}
              {Array.from({ length: 3 }).map((_, idx) => (
                <div
                  className="flex flex-col rounded-[1rem] border border-store-border border-dashed bg-white p-4 opacity-60"
                  key={idx}
                >
                  <div className="flex aspect-[4/3] items-center justify-center rounded-[1rem] bg-store-muted">
                    <Package
                      aria-hidden="true"
                      className="h-6 w-6 text-store-muted-foreground"
                      strokeWidth={1.5}
                    />
                  </div>
                  <div className="mt-3 h-3 w-3/4 rounded bg-store-muted" />
                  <div className="mt-2 h-3 w-1/2 rounded bg-store-muted" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product, index) => (
              <ProductCard
                key={product.id}
                priority={index === 0}
                product={product}
                tenantSlug={tenantSlug}
              />
            ))}
          </div>
        )}

        {/* Pagination — preserves search + categoryId */}
        {totalCount > 12 ? (
          <nav
            aria-label="Sayfalama"
            className="flex items-center justify-center gap-2 pt-4"
          >
            <Link
              aria-disabled={page <= 1}
              className={`rounded-full border px-4 py-1.5 font-medium text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring ${page <= 1 ? "pointer-events-none border-store-border opacity-40" : "border-store-border bg-white text-store-ink hover:bg-store-muted"}`}
              href={`/${tenantSlug}/shop?page=${page - 1}${search ? `&search=${encodeURIComponent(search)}` : ""}${categoryId ? `&categoryId=${encodeURIComponent(categoryId)}` : ""}#catalog`}
            >
              Önceki
            </Link>
            <span className="rounded-full bg-store-muted px-3 py-1 font-medium text-store-muted-foreground text-xs">
              Sayfa {page} · {totalCount} ürün
            </span>
            <Link
              className="rounded-full border border-store-border bg-white px-4 py-1.5 font-medium text-store-ink text-xs hover:bg-store-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
              href={`/${tenantSlug}/shop?page=${page + 1}${search ? `&search=${encodeURIComponent(search)}` : ""}${categoryId ? `&categoryId=${encodeURIComponent(categoryId)}` : ""}#catalog`}
            >
              Sonraki
            </Link>
          </nav>
        ) : null}
      </section>
    </div>
  );
}
