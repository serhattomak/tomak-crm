import { ArrowRight, Package, Sparkles } from "lucide-react";
import { Instrument_Serif } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import type { PublicProductDto } from "@/lib/ecommerce-client";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-display-instrument",
  weight: ["400"],
});

export interface HeroBentoProps {
  products: PublicProductDto[];
  tenantSlug: string;
  totalCount?: number;
}

function getProductHref(tenantSlug: string, slug: string): string {
  return `/${tenantSlug}/product/${slug}`;
}

export function HeroBento({
  tenantSlug,
  products,
  totalCount,
}: HeroBentoProps) {
  const featured = products.find((p) => p.isFeatured) ?? products[0] ?? null;
  const second =
    products.find((p) => featured && p.id !== featured.id) ??
    products[1] ??
    null;

  const hasProducts = Boolean(featured);

  return (
    <section
      aria-label="Yeni Sezon hero"
      className="grid gap-6 rounded-[1.5rem] border border-store-border bg-white p-6 shadow-store-lg sm:p-8 lg:grid-cols-2 lg:gap-8"
    >
      {/* Left: editorial copy */}
      <div className="flex flex-col justify-center gap-4">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-store-border bg-store-muted px-3 py-1 font-medium text-[11px] text-store-muted-foreground">
          <Sparkles aria-hidden="true" className="h-3 w-3" strokeWidth={1.5} />
          Yeni Sezon · {totalCount ?? products.length} ürün
        </span>

        <h1
          className={`${instrumentSerif.className} font-normal text-3xl text-store-ink tracking-tight sm:text-4xl`}
        >
          Yeni Sezon
        </h1>

        <p className="max-w-xl text-sm text-store-muted-foreground leading-relaxed">
          Editoryal seçki — warm stone zemin üzerinde mercan vurgularla
          harmanlanmış minimal koleksiyon. Kategorilerden filtrele, öne çıkan
          ürünleri keşfet.
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            className="inline-flex items-center gap-2 rounded-full bg-store-primary px-6 py-3 font-semibold text-sm text-store-primary-foreground shadow-store-sm transition-colors hover:bg-store-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            href={`/${tenantSlug}/shop#catalog`}
          >
            Koleksiyonu keşfet
            <ArrowRight
              aria-hidden="true"
              className="h-4 w-4"
              strokeWidth={1.5}
            />
          </Link>

          <Link
            className="inline-flex items-center gap-2 rounded-full border border-store-border bg-white px-6 py-3 font-medium text-sm text-store-ink transition-colors hover:bg-store-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
            href={`/${tenantSlug}/cart`}
          >
            Sepete git
          </Link>
        </div>

        <p className="text-[11px] text-store-muted-foreground">
          tenantSlug:{" "}
          <code className="rounded bg-store-muted px-1 py-0.5 font-mono text-[11px]">
            {tenantSlug}
          </code>{" "}
          · ISR 60s · oklch mercan
        </p>
      </div>

      {/* Right: 2 bento */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {hasProducts && featured ? (
          <Link
            aria-label={`${featured.name} — öne çıkan ürün detayına git`}
            className="group relative flex flex-col overflow-hidden rounded-[1.5rem] border border-store-border bg-store-muted shadow-store transition-all duration-200 hover:shadow-store-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
            href={getProductHref(tenantSlug, featured.slug)}
          >
            <span className="pointer-events-none absolute top-3 left-3 z-10 inline-flex items-center rounded-full bg-store-primary px-2.5 py-1 font-semibold text-[11px] text-store-primary-foreground shadow-store-sm">
              Öne çıkan
            </span>
            <span className="relative block aspect-[4/3] overflow-hidden bg-store-muted">
              {featured.imageUrl ? (
                <Image
                  alt={featured.name}
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  fetchPriority="high"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  src={featured.imageUrl}
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-store-muted text-store-muted-foreground">
                  <Package
                    aria-hidden="true"
                    className="h-8 w-8"
                    strokeWidth={1.5}
                  />
                </span>
              )}
            </span>
            <span className="flex flex-1 flex-col gap-1 bg-white p-3">
              <span className="line-clamp-1 font-semibold text-sm text-store-ink">
                {featured.name}
              </span>
              <span className="font-bold text-store-ink text-xs">
                ₺
                {featured.price.toLocaleString("tr-TR", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </span>
          </Link>
        ) : (
          <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-[1.5rem] border border-store-border border-dashed bg-store-muted p-6 text-center">
            <Package
              aria-hidden="true"
              className="h-8 w-8 text-store-muted-foreground"
              strokeWidth={1.5}
            />
            <p className="font-medium text-store-muted-foreground text-xs">
              Öne çıkan ürün yok
            </p>
            <p className="text-[11px] text-store-muted-foreground">
              is_featured ürün ekleyin, bento otomatik dolar.
            </p>
          </div>
        )}

        {second ? (
          <Link
            aria-label={`${second.name} ürün detayına git`}
            className="group relative flex flex-col overflow-hidden rounded-[1.5rem] border border-store-border bg-store-muted shadow-store transition-all duration-200 hover:shadow-store-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
            href={getProductHref(tenantSlug, second.slug)}
          >
            {second.isFeatured ? (
              <span className="pointer-events-none absolute top-3 left-3 z-10 inline-flex items-center rounded-full bg-white/90 px-2.5 py-1 font-semibold text-[11px] text-store-ink shadow-store-sm backdrop-blur">
                Öne çıkan
              </span>
            ) : null}
            <span className="relative block aspect-[4/3] overflow-hidden bg-store-muted">
              {second.imageUrl ? (
                <Image
                  alt={second.name}
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  src={second.imageUrl}
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-store-muted text-store-muted-foreground">
                  <Package
                    aria-hidden="true"
                    className="h-8 w-8"
                    strokeWidth={1.5}
                  />
                </span>
              )}
            </span>
            <span className="flex flex-1 flex-col gap-1 bg-white p-3">
              <span className="line-clamp-1 font-semibold text-sm text-store-ink">
                {second.name}
              </span>
              <span className="font-bold text-store-ink text-xs">
                ₺
                {second.price.toLocaleString("tr-TR", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </span>
          </Link>
        ) : (
          <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-[1.5rem] border border-store-border border-dashed bg-white p-6 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-store-muted">
              <Package
                aria-hidden="true"
                className="h-6 w-6 text-store-muted-foreground"
                strokeWidth={1.5}
              />
            </span>
            <p className="max-w-[18ch] text-store-muted-foreground text-xs leading-relaxed">
              Koleksiyon bento — ikinci ürün eklendiğinde burada görünür.
            </p>
            <Link
              className="mt-1 inline-flex rounded-full border border-store-border bg-white px-3 py-1.5 font-medium text-store-ink text-xs hover:bg-store-muted"
              href={`/${tenantSlug}/shop#catalog`}
            >
              Kataloğa göz at
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

export default HeroBento;
