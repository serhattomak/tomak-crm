import { Package, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { StoreBadge } from "@workspace/ui/components/badge";
import { Price } from "@workspace/ui/components/price";
import { StockIndicator } from "@workspace/ui/components/stock-indicator";
import type { PublicProductDto } from "@/lib/ecommerce-client";

export type ProductCardProps = {
  tenantSlug: string;
  product: PublicProductDto;
  priority?: boolean;
};

function getProductHref(tenantSlug: string, slug: string): string {
  return `/${tenantSlug}/product/${slug}`;
}

export function ProductCard({
  product,
  tenantSlug,
  priority = false,
}: ProductCardProps) {
  const href = getProductHref(tenantSlug, product.slug);
  const hasImage = Boolean(product.imageUrl);
  const displayStock = product.stock ?? null;

  return (
    <article
      aria-label={product.name}
      className="group flex flex-col overflow-hidden rounded-store-lg border border-store-border bg-store-surface shadow-store transition-all hover:border-store-ring/30 hover:shadow-store-lg"
    >
      <Link
        aria-label={`${product.name} ürün detayına git`}
        className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-store-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
        href={href}
      >
        {hasImage ? (
          <Image
            alt={product.name}
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            fill
            priority={priority}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            src={product.imageUrl as string}
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-full w-full items-center justify-center bg-store-muted text-store-muted-foreground"
          >
            <Package className="h-6 w-6" />
          </span>
        )}

        {/* Top badges — Featured / Category overlay */}
        <span className="pointer-events-none absolute top-2 left-2 flex flex-wrap gap-1.5">
          {product.isFeatured ? (
            <StoreBadge
              icon={<Star aria-hidden="true" className="h-3 w-3" />}
              variant="featured"
            >
              Öne çıkan
            </StoreBadge>
          ) : null}
          {product.categoryName ? (
            <StoreBadge variant="category">{product.categoryName}</StoreBadge>
          ) : null}
        </span>
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link
          className="line-clamp-1 font-semibold text-sm text-store-surface-foreground hover:text-store-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring rounded-store-sm"
          href={href}
        >
          {product.name}
        </Link>

        <p className="line-clamp-2 min-h-[2.2em] text-xs leading-relaxed text-store-muted-foreground">
          {product.description?.trim() ? product.description : "Açıklama yok"}
        </p>

        {product.sku ? (
          <StoreBadge className="self-start" variant="sku">
            SKU: {product.sku}
          </StoreBadge>
        ) : null}

        <div className="mt-1">
          <Price
            compareAtPrice={product.compareAtPrice ?? null}
            currency={product.currency ?? "TRY"}
            price={product.price}
            size="sm"
          />
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <StockIndicator lowThreshold={5} stock={displayStock} />
          {product.weight !== null && product.weight !== undefined ? (
            <span className="text-[11px] text-store-muted-foreground">
              {product.weight} kg
            </span>
          ) : null}
        </div>

        <Link
          className="mt-2 inline-flex w-full items-center justify-center rounded-store bg-store-primary px-3 py-2 text-xs font-semibold text-store-primary-foreground shadow-store-sm transition-colors hover:bg-store-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring focus-visible:ring-offset-2 focus-visible:ring-offset-store-surface"
          href={href}
        >
          İncele
        </Link>
      </div>
    </article>
  );
}

export default ProductCard;
