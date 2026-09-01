import { StoreBadge } from "@workspace/ui/components/badge";
import { Price } from "@workspace/ui/components/price";
import { StockIndicator } from "@workspace/ui/components/stock-indicator";
import { ImageOff, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { PublicProductDto } from "@/lib/ecommerce-client";

export interface ProductCardProps {
  priority?: boolean;
  product: PublicProductDto;
  tenantSlug: string;
}

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
      className="group flex flex-col overflow-hidden rounded-[1rem] border border-store-border bg-white shadow-store-sm transition-all duration-200 hover:-translate-y-1 hover:scale-[1.01] hover:shadow-store motion-reduce:transform-none motion-reduce:transition-none"
    >
      <Link
        aria-label={`${product.name} ürün detayına git`}
        className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-store-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
        href={href}
      >
        {hasImage ? (
          <Image
            alt={product.name}
            className="object-cover transition-transform duration-200 motion-safe:group-hover:scale-[1.02] motion-reduce:transform-none"
            fetchPriority={priority ? "high" : "auto"}
            fill
            priority={priority}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            src={product.imageUrl as string}
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-full w-full flex-col items-center justify-center gap-2 bg-store-muted px-4 py-6 text-store-muted-foreground"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-store-sm">
              <ImageOff
                aria-hidden="true"
                className="h-6 w-6 text-store-muted-foreground"
                strokeWidth={1.5}
              />
            </span>
            <span className="font-medium font-sans text-xs">
              Görsel yakında
            </span>
          </span>
        )}

        {/* Top badges — Featured / Category overlay */}
        <span className="pointer-events-none absolute top-2 left-2 flex flex-wrap gap-1.5">
          {product.isFeatured ? (
            <StoreBadge
              icon={
                <Star
                  aria-hidden="true"
                  className="h-3 w-3"
                  strokeWidth={1.5}
                />
              }
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
          className="line-clamp-1 rounded-store-sm font-sans font-semibold text-sm text-store-ink hover:text-store-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
          href={href}
        >
          {product.name}
        </Link>

        <p className="line-clamp-2 min-h-[2.2em] font-sans text-store-muted-foreground text-xs leading-relaxed">
          {product.description?.trim() ? product.description : "Açıklama yok"}
        </p>

        {product.sku ? (
          <span className="font-mono text-[11px] text-store-muted-foreground">
            SKU: {product.sku}
          </span>
        ) : null}

        <div className="mt-1">
          <Price
            compareAtPrice={product.compareAtPrice ?? null}
            currency={product.currency ?? "TRY"}
            price={product.price}
            size="lg"
          />
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <StockIndicator lowThreshold={5} stock={displayStock} />
          {product.weight !== null && product.weight !== undefined ? (
            <span className="font-mono text-[11px] text-store-muted-foreground">
              {product.weight} kg
            </span>
          ) : null}
        </div>

        <Link
          className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-store-primary px-4 py-2.5 font-semibold text-store-primary-foreground text-xs shadow-store-sm transition-all duration-200 hover:bg-store-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring focus-visible:ring-offset-2 focus-visible:ring-offset-white motion-reduce:transition-none"
          href={href}
        >
          İncele
        </Link>
      </div>
    </article>
  );
}
