import { ArrowLeft, Package, Star, Weight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EcommerceClient } from "@/lib/ecommerce-client";
import { ProductAddToCart } from "./product-add-to-cart";

const TENANT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isValidTenantSlug(slug: string): boolean {
  return (
    TENANT_SLUG_PATTERN.test(slug) && slug.length >= 2 && slug.length <= 64
  );
}

interface ProductPageProps {
  params: Promise<{ tenantSlug: string; slug: string }>;
}

export const revalidate = 60;

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { tenantSlug, slug } = await params;
  if (!isValidTenantSlug(tenantSlug)) return { title: "Ürün bulunamadı" };

  const res = await EcommerceClient.getPublicProductBySlug(slug, tenantSlug).catch(
    () => ({ success: false as const })
  );
  if (!res.success || !res.data) {
    return { title: `${slug} — ${tenantSlug}` };
  }
  return {
    description: res.data.description ?? `${res.data.name} — ${tenantSlug} mağazası`,
    title: `${res.data.name} — ${tenantSlug}`,
    openGraph: {
      description: res.data.description ?? undefined,
      images: res.data.imageUrl ? [res.data.imageUrl] : undefined,
      title: res.data.name,
    },
  };
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { tenantSlug, slug } = await params;

  if (!isValidTenantSlug(tenantSlug)) {
    notFound();
  }

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

  const result = await EcommerceClient.getPublicProductBySlug(slug, tenantSlug).catch(
    () => ({ success: false as const, message: "Network error" })
  );

  if (!result.success || !result.data) {
    notFound();
  }

  const product = result.data;

  return (
    <div className="space-y-6">
      <Link
        className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
        href={`/${tenantSlug}/shop`}
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Mağazaya dön
      </Link>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Images */}
        <div className="space-y-3">
          <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            {product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={product.name}
                className="h-full w-full object-cover"
                src={product.imageUrl}
              />
            ) : (
              <Package className="h-10 w-10 text-zinc-400" />
            )}
          </div>

          {product.images && product.images.length > 0 ? (
            <div className="grid grid-cols-4 gap-2">
              {product.images.slice(0, 8).map((src) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={product.name}
                  className="aspect-square rounded-xl border border-zinc-200 object-cover dark:border-zinc-800"
                  key={src}
                  src={src}
                />
              ))}
            </div>
          ) : null}

          <p className="text-[11px] text-zinc-400">
            CRM → Products · slug={product.slug} · ISR 60s · is_published filter
          </p>
        </div>

        {/* Detail */}
        <div className="space-y-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {product.isFeatured ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                  <Star className="h-3 w-3" /> Öne çıkan
                </span>
              ) : null}
              {product.categoryName ? (
                <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900">
                  {product.categoryName}
                </span>
              ) : null}
              {product.sku ? (
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-mono text-[11px] text-zinc-600 dark:bg-zinc-800">
                  SKU: {product.sku}
                </span>
              ) : null}
            </div>

            <h1 className="mt-3 font-bold text-2xl text-zinc-900 dark:text-zinc-100">
              {product.name}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              {product.description ?? "Bu ürün için açıklama eklenmemiş."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <span className="font-extrabold text-xl text-zinc-900 dark:text-zinc-100">
              ₺{product.price.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
            </span>
            {product.compareAtPrice ? (
              <span className="text-sm text-zinc-400 line-through">
                ₺{product.compareAtPrice.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
              </span>
            ) : null}
            <span className="text-xs text-zinc-500">· {product.currency}</span>
            <span className="ml-auto text-xs text-zinc-500">
              Stok: {product.stock ?? "—"}
            </span>
          </div>

          {product.weight !== null && product.weight !== undefined ? (
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Weight className="h-4 w-4" />
              Ağırlık: {product.weight} kg
            </div>
          ) : null}

          <ProductAddToCart
            productId={product.id}
            tenantSlug={tenantSlug}
            variants={product.variants ?? []}
          />

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50">
            <p className="font-semibold text-zinc-700 dark:text-zinc-300">Teslimat & İade</p>
            <p className="mt-1 leading-relaxed">
              Siparişleriniz CRM üzerinden <code>status=Confirmed</code> ve <code>source=ECommerce</code> olarak
              oluşturulur. Kargo takibi <Link className="underline" href={`/${tenantSlug}/my-orders`}>Hesabım → Siparişlerim</Link> üzerinden 30s polling + Realtime ile güncellenir.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
