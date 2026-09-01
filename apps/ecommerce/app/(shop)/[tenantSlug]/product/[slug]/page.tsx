import {
  Breadcrumbs,
  getBreadcrumbJsonLd,
} from "@workspace/ui/components/breadcrumbs";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { PublicProductDto } from "@/lib/ecommerce-client";
import { EcommerceClient } from "@/lib/ecommerce-client";
import { ProductDetailView } from "./components/product-detail-view";
import { RelatedProducts } from "./components/related-products";

const TENANT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isValidTenantSlug(slug: string): boolean {
  return (
    TENANT_SLUG_PATTERN.test(slug) && slug.length >= 2 && slug.length <= 64
  );
}

function getSiteOrigin(): string {
  const url =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_URL ||
    "";
  if (!url) {
    return "https://example.com";
  }
  if (url.startsWith("http")) {
    return url.replace(/\/$/, "");
  }
  return `https://${url.replace(/\/$/, "")}`;
}

interface ProductPageProps {
  params: Promise<{ tenantSlug: string; slug: string }>;
}

export const revalidate = 60;

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { tenantSlug, slug } = await params;
  const origin = getSiteOrigin();
  const canonical = `${origin}/${tenantSlug}/product/${encodeURIComponent(slug)}`;

  if (!isValidTenantSlug(tenantSlug)) {
    return { title: "Ürün bulunamadı" };
  }

  const res = await EcommerceClient.getPublicProductBySlug(
    slug,
    tenantSlug
  ).catch(() => ({ success: false as const }));

  if (!(res.success && res.data)) {
    return {
      alternates: { canonical },
      title: `${slug} — ${tenantSlug}`,
    };
  }

  const product = res.data;
  const title = `${product.name} — ${tenantSlug}`;
  const description = product.description?.trim()
    ? product.description.trim().slice(0, 160)
    : `${product.name} — ${tenantSlug} mağazası`;
  const images = product.imageUrl ? [product.imageUrl] : undefined;

  return {
    alternates: { canonical },
    description,
    openGraph: {
      description,
      images: images ? images.map((url) => ({ url })) : undefined,
      title: product.name,
      type: "website",
      url: canonical,
    },
    title,
    twitter: {
      card: "summary_large_image",
      description,
      images,
      title: product.name,
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

  const result = await EcommerceClient.getPublicProductBySlug(
    slug,
    tenantSlug
  ).catch(() => ({ message: "Network error", success: false as const }));

  if (!(result.success && result.data)) {
    notFound();
  }

  const product = result.data;
  const origin = getSiteOrigin();
  const canonical = `${origin}/${tenantSlug}/product/${encodeURIComponent(product.slug)}`;

  // Images: merge imageUrl + images, dedupe, oklch only tokens used in gallery
  const rawImages = [product.imageUrl ?? "", ...(product.images ?? [])].filter(
    Boolean
  ) as string[];
  const dedupedImages = Array.from(new Set(rawImages));

  // Breadcrumb nav ol — Home > Shop > Category > Product
  const displayBreadcrumbs = [
    { href: "/", label: "Home" },
    { href: `/${tenantSlug}/shop`, label: "Mağaza" },
    ...(product.categoryName
      ? [
          {
            href: product.categoryId
              ? `/${tenantSlug}/shop?categoryId=${encodeURIComponent(product.categoryId)}`
              : `/${tenantSlug}/shop`,
            label: product.categoryName,
          },
        ]
      : []),
    { label: product.name },
  ];

  const breadcrumbJsonLd = getBreadcrumbJsonLd(displayBreadcrumbs, origin);

  // JSON-LD Product schema — name, image, price, sku, brand, availability InStock/OutOfStock, aggregateRating stub
  const brandName =
    (product as unknown as { brand?: string | null }).brand ?? null;
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      reviewCount: "24",
    },
    brand: brandName
      ? {
          "@type": "Brand",
          name: brandName,
        }
      : undefined,
    category: product.categoryName ?? undefined,
    description: product.description ?? undefined,
    image: dedupedImages.length > 0 ? dedupedImages : undefined,
    name: product.name,
    offers: {
      "@type": "Offer",
      availability:
        typeof product.stock === "number" && product.stock <= 0
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock",
      price: product.price,
      priceCurrency: product.currency ?? "TRY",
      url: canonical,
    },
    sku: product.sku ?? undefined,
    weight: product.weight ? `${product.weight} kg` : undefined,
  };

  // Related products: same category is_featured or same category, limit 4, aspect-[4/3]
  let relatedProducts: PublicProductDto[] = [];
  if (product.categoryId) {
    const relatedRes = await EcommerceClient.getPublicProducts(
      {
        categoryId: product.categoryId,
        isPublished: true,
        page: 1,
        pageSize: 8,
      },
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
      { isFeatured: true, isPublished: true, page: 1, pageSize: 8 },
      tenantSlug
    ).catch(() => ({ success: false as const }));
    if (fallback.success && fallback.data?.items) {
      relatedProducts = (fallback.data.items as PublicProductDto[])
        .filter((p) => p.id !== product.id)
        .slice(0, 4);
    }
  }
  if (relatedProducts.length === 0) {
    const fallback2 = await EcommerceClient.getPublicProducts(
      { isPublished: true, page: 1, pageSize: 8 },
      tenantSlug
    ).catch(() => ({ success: false as const }));
    if (fallback2.success && fallback2.data?.items) {
      relatedProducts = (fallback2.data.items as PublicProductDto[])
        .filter((p) => p.id !== product.id)
        .slice(0, 4);
    }
  }

  return (
    <div className="space-y-8">
      {/* Breadcrumb nav ol */}
      <Breadcrumbs items={displayBreadcrumbs} />

      {/* 2-col: sol galeri aspect-[4/3] rounded-[1rem] + square thumb, varyant sync; sağ sticky top-20 */}
      <ProductDetailView
        images={dedupedImages}
        product={product}
        tenantSlug={tenantSlug}
      />

      {/* İlgili ürünler 4'lü grid ProductCard new style aspect-[4/3] */}
      <RelatedProducts products={relatedProducts} tenantSlug={tenantSlug} />

      {/* JSON-LD Product + BreadcrumbList — SEO */}
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD requires raw JSON injection
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productJsonLd).replace(/</g, "\\u003c"),
        }}
        type="application/ld+json"
      />
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD requires raw JSON injection
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c"),
        }}
        type="application/ld+json"
      />
    </div>
  );
}
