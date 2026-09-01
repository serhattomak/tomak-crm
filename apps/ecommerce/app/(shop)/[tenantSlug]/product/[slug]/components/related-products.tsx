import { ProductCard } from "@/app/(shop)/[tenantSlug]/components/product-card";
import type { PublicProductDto } from "@/lib/ecommerce-client";

export interface RelatedProductsProps {
  products: PublicProductDto[];
  tenantSlug: string;
}

export function RelatedProducts({
  products,
  tenantSlug,
}: RelatedProductsProps) {
  if (products.length === 0) {
    return null;
  }

  return (
    <section aria-label="Benzer ürünler" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-normal font-serif text-lg text-store-ink tracking-tight">
          Benzer ürünler
        </h2>
        <span className="rounded-full bg-store-muted px-2.5 py-1 font-medium text-[11px] text-store-muted-foreground">
          {products.length} ürün
        </span>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            tenantSlug={tenantSlug}
          />
        ))}
      </div>
    </section>
  );
}

export default RelatedProducts;
