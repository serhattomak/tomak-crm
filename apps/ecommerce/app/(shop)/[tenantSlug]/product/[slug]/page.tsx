import { Breadcrumbs, getBreadcrumbJsonLd } from "@workspace/ui/components/breadcrumbs";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductCard } from "@/app/(shop)/[tenantSlug]/components/product-card";
import { EcommerceClient } from "@/lib/ecommerce-client";
import type { PublicProductDto } from "@/lib/ecommerce-client";
import { ProductInteractive } from "./product-interactive";

const TENANT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isValidTenantSlug(slug: string): boolean {
  return TENANT_SLUG_PATTERN.test(slug) && slug.length >= 2 && slug.length <= 64;
}

function getSiteOrigin(): string {
  const url =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_URL ||
    "";
  if (!url) return "https://example.com";
  if (url.startsWith("http")) return url.replace(/\/$/, "");
  return `https://${url.replace(/\/$/, "")}`;
}

interface ProductPageProps {
  params: Promise<{ tenantSlug: string; slug: string }>;
}

export const revalidate = 60;

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { tenantSlug, slug } = await params;
  const origin = getSiteOrigin();
  const canonical = `${origin}/${tenantSlug}/product/${encodeURIComponent(slug)}`;

  if (!isValidTenantSlug(tenantSlug)) {
    return { title: "Ürün bulunamadı" };
  }

  const res = await EcommerceClient.getPublicProductBySlug(slug, tenantSlug).catch(
    () => ({ success: false as const })
  );

  if (!res.success || !res.data) {
    return {
      title: `${slug} — ${tenantSlug}`,
      alternates: { canonical },
    };
  }

  const product = res.data;
  const title = `${product.name} — ${tenantSlug}`;
  const description = product.description?.trim()
    ? product.description.trim().slice(0, 160)
    : `${product.name} — ${tenantSlug} mağazası`;
  const images = product.imageUrl ? [product.imageUrl] : undefined;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: product.name,
      description,
      url: canonical,
      type: "website",
      images: images
        ? images.map((url) => ({ url }))
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description,
      images,
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
  const origin = getSiteOrigin();
  const canonical = `${origin}/${tenantSlug}/product/${encodeURIComponent(product.slug)}`;

  // Images: merge imageUrl + images, dedupe
  const rawImages = [
    product.imageUrl ?? "",
    ...(product.images ?? []),
  ].filter(Boolean) as string[];
  const dedupedImages = Array.from(new Set(rawImages));

  // Breadcrumb: Home > Shop > Category > Product (via primitives/breadcrumbs)
  const displayBreadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Shop", href: `/${tenantSlug}/shop` },
    ...(product.categoryName
      ? [
          {
            label: product.categoryName,
            href: product.categoryId
              ? `/${tenantSlug}/shop?categoryId=${encodeURIComponent(product.categoryId)}`
              : `/${tenantSlug}/shop`,
          },
        ]
      : []),
    { label: product.name },
  ];

  const breadcrumbJsonLd = getBreadcrumbJsonLd(displayBreadcrumbs, origin);

  // JSON-LD Product
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    image: dedupedImages.length > 0 ? dedupedImages : undefined,
    sku: product.sku ?? undefined,
    brand: (product as unknown as { brand?: string }).brand
      ? { "@type": "Brand", name: (product as unknown as { brand?: string }).brand }
      : undefined,
    category: product.categoryName ?? undefined,
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: product.currency ?? "TRY",
      availability:
        typeof product.stock === "number" && product.stock <= 0
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock",
      url: canonical,
      priceValidUntil: undefined,
    },
    weight: product.weight ? `${product.weight} kg` : undefined,
  };

  // Related products: same category, isPublished, limit 4, exclude current
  let relatedProducts: PublicProductDto[] = [];
  if (product.categoryId) {
    const relatedRes = await EcommerceClient.getPublicProducts(
      { categoryId: product.categoryId, isPublished: true, page: 1, pageSize: 8 },
      tenantSlug
    ).catch(() => ({ success: false as const }));
    if (relatedRes.success && relatedRes.data?.items) {
      relatedProducts = (relatedRes.data.items as PublicProductDto[])
        .filter((p) => p.id !== product.id)
        .slice(0, 4);
    }
  }
  if (relatedProducts.length === 0) {
    const fallback = await EcommerceClient.getPublicProducts(
      { isPublished: true, page: 1, pageSize: 8 },
      tenantSlug
    ).catch(() => ({ success: false as const }));
    if (fallback.success && fallback.data?.items) {
      relatedProducts = (fallback.data.items as PublicProductDto[])
        .filter((p) => p.id !== product.id)
        .slice(0, 4);
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={displayBreadcrumbs} />

      <ProductInteractive images={dedupedImages} product={product} tenantSlug={tenantSlug} />

      {relatedProducts.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm text-store-surface-foreground">Benzer ürünler</h2>
            <span className="text-[11px] text-store-muted-foreground">{relatedProducts.length} ürün</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {relatedProducts.map((related) => (
              <ProductCard key={related.id} product={related} tenantSlug={tenantSlug} />
            ))}
          </div>
        </section>
      ) : null}

      {/* JSON-LD Product + BreadcrumbList */}
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD requires raw JSON injection
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD requires raw JSON injection
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c"),
        }}
      />
    </div>
  );
}
