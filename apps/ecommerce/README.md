# @workspace/ecommerce — Multi-Tenant Storefront (Skeleton)

> Next.js 16.3.3 · App Router · Turbo · Supabase (shared DB) · CRM public HTTP API only

This app is the **separate e-commerce storefront** (`apps/ecommerce`) for the CRM monorepo. It follows Grilling Q7/Q12/Q17/Q18 decisions:

- Same Supabase project as `apps/web` + `apps/api`, but **writes only via CRM public HTTP API** (no `service_role`, no direct DB writes, no `CRM.Modules.BuildingBlocks` import).
- Every request carries `X-Tenant-Slug` + `apikey`/`Authorization: Bearer <anon>` and optional HMAC (`X-HMAC-Signature` + `X-Request-Timestamp`).
- Multi-store routing: `/{tenantSlug}/shop` (+ future `{tenantSlug}.ecommerce.com`).
- Catalog is CRM-master, ecommerce is read-only (`GET /api/public/products?tenantSlug&is_published`, ISR 60s).

## Stack

- **Next.js 16.3.3** (async `params` — `await params` mandatory, no sync `params.tenantSlug`)
- **React 19.2.4**
- **@supabase/ssr 0.12.x + @supabase/supabase-js 2.112.x** (shared anon key, storage key `sb-ecommerce-auth-token`)
- **@workspace/ui** (shared design system), **tailwindcss 4**, **lucide-react**
- **Turbo** workspaces (`apps/*`, `packages/*` auto-discovery) — no extra config needed
- **Ultracite/Biome** — `npm exec -- ultracite fix`

## Routes (MVP skeleton)

```
app/layout.tsx                          — root layout (fonts, ThemeProvider)
app/(shop)/[tenantSlug]/layout.tsx      — shop shell, validates tenantSlug, header/footer
app/(shop)/[tenantSlug]/shop/page.tsx   — hello + placeholder catalog (async params)
lib/ecommerce-client.ts                 — typed fetch wrapper for public API
middleware.ts                           — tenantSlug validation + Supabase session refresh
```

Future (not in skeleton): `product/[slug]`, `cart`, `checkout`, `my-orders`, `addresses`, `support`, `returns`

## Quick Start

```bash
# 1. Env
cp apps/ecommerce/.env.local.example apps/ecommerce/.env.local
# fill NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, CRM_API_URL

# 2. Install (from monorepo root)
npm install

# 3. Dev — web on :3000, ecommerce on :3001 side-by-side
npm run dev              # turbo dev (both)
npm run dev --workspace=@workspace/ecommerce  # or just ecommerce
# or
npx turbo dev --filter=@workspace/ecommerce

# 4. Typecheck / Build
npm run typecheck        # turbo typecheck (includes ecommerce)
npm run build --workspace=@workspace/ecommerce
```

## Environment

Same Supabase project as CRM (Q17). Required vars (see `.env.local.example`):

| Var | Purpose |
|-----|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL (local `http://127.0.0.1:54321` or cloud) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon/publishable key (RLS, `apikey` header) |
| `CRM_API_URL` / `NEXT_PUBLIC_CRM_URL` / `NEXT_PUBLIC_API_URL` | CRM API origin (`http://localhost:5000` locally; browser uses `/api` proxy) |
| `ECOMMERCE_HMAC_SECRET` | Optional HMAC secret (server-only). If set, `EcommerceClient` adds `X-HMAC-Signature`. Must match CRM. |

## EcommerceClient

`lib/ecommerce-client.ts` — **HTTP-only, zero `BuildingBlocks` imports**. Mirrors `apps/web/lib/api-client.ts` but scoped to public surface:

- `getPublicProducts(params, tenantSlug)` — `GET /api/public/products?tenantSlug&is_published` (ISR 60s)
- `getPublicProductBySlug(slug, tenantSlug)`
- `getCart` / `addToCart` / `updateCartItem` / `removeCartItem` (guest_token via `X-Guest-Token`)
- `evaluateCart` — `POST /api/public/cart/evaluate` (PromotionCalculationEngine)
- `createPublicOrder` — `POST /api/public/orders` (status=Confirmed source=ECommerce)
- `getMyOrders` / `getOrderTracking` — `GET /api/public/orders/mine|/:id/tracking`
- `createPublicTicket` / `getMyTickets` — support (SenderType=Customer)

All methods send `X-Tenant-Slug` and handle `429` with `Retry-After` → `{ success:false, retryAfterSeconds }`.

```ts
import { EcommerceClient } from "@/lib/ecommerce-client";

// server component
const res = await EcommerceClient.getPublicProducts({ isPublished: true, page: 1, pageSize: 12 }, tenantSlug);
if (res.success) console.log(res.data.items);
else if (res.retryAfterSeconds) console.log(`Rate-limited, retry in ${res.retryAfterSeconds}s`);
```

## Conventions

- **Async params**: `type Props = { params: Promise<{ tenantSlug: string }> }` → `const { tenantSlug } = await params;` (Next 16.3.3 breaking change)
- **Path aliases**: `@/*` → `apps/ecommerce/*`, `@workspace/ui/*` → `packages/ui/src/*`
- **Tenant slug** validation: `/^[a-z0-9]+(?:-[a-z0-9]+)*$/` (2–64 chars), `notFound()` on invalid in layout + page
- **No service_role** in browser — server action proxies use anon + tenantSlug header → CRM maps tenantSlug→tenant_id internally
- **Docker**: `docker-compose.yml` shares `redis`/`rabbitmq`; ecommerce dev runs as separate Next process (port 3001), not a container, until coolify/vercel split

## Turbo & Workspaces

`crm-monorepo/package.json` already declares `"workspaces": ["apps/*","packages/*"]`, so `apps/ecommerce` is auto-discovered. `turbo.json` pipeline (`build`, `typecheck`, `lint`, `dev`) applies without change — no extra `turbo.json` entry needed.

Validate:

```bash
npx turbo typecheck --filter=@workspace/ecommerce
npx turbo build --filter=@workspace/ecommerce
```

## Store — Product Detail & Design System

> Kanonik referans: [`docs/design-system.md`](../../../docs/design-system.md) · Token kaynagi: [`packages/ui/src/styles/globals.css`](../../packages/ui/src/styles/globals.css) · Doc mirror: [`packages/ui/src/tokens.json`](../../packages/ui/src/tokens.json)  
> Tum `--store-*` token’lari `globals.css` `:root` + `.dark` icinde oklch tek kaynak; Tailwind v4 `@theme inline` ile `bg-store-primary` vb. utility’lere bridge edilir (hex fallback yok).

### Product detail route

```
GET /{tenantSlug}/product/{slug}
  → apps/ecommerce/app/(shop)/[tenantSlug]/product/[slug]/page.tsx (Server Component, revalidate 60s)
  → ProductInteractive (client) — galeri + fiyat + varyant + stok + stepper + sepet + sekmeler
  → related ProductCard grid (4)
```

- **Server Component** `page.tsx`: `params: Promise<{ tenantSlug, slug }>` → `await params` (Next 16.3.3), `export const revalidate = 60`, `generateMetadata` canonical + openGraph + twitter, `notFound()` invalid slug veya `ecommerceEnabled===false` veya urun yoksa.
- **Breadcrumb** `Home > Shop > Category > Product` via `@workspace/ui/components/breadcrumbs` — `Breadcrumbs` + `getBreadcrumbJsonLd(origin)`. Tenant slug `^[a-z0-9]+(?:-[a-z0-9]+)*$` (2–64) regex dogrulamasi.
- **Images** `product.imageUrl` + `product.images[]` dedupe → `ProductGallery` → `Gallery` primitive.
- **Related** `EcommerceClient.getPublicProducts({ categoryId, isPublished:true }, tenantSlug)` limit 8 → current exclude → slice 4; bos ise fallback isPublished list.
- **Param/Slug** `encodeURIComponent(slug)` canonical’da; `shop?categoryId=` link dogru.

### Gallery / Variant / Stock flow

```
Gallery (primitive @workspace/ui/components/gallery)
  └─ ProductGallery wrapper (apps/ecommerce/.../product/[slug]/gallery.tsx)
       — variantImage’i images’e merge (dedupe, prepend), Gallery’e forward
       — priority LCP sadece activeIndex===0, sizes="(max-width: 1024px) 100vw, 50vw"
       — variantImage degisince activeIndex otomatik senkron, lightbox Esc ile kapanir

VariantPicker (@workspace/ui yok — composite: apps/ecommerce/.../components/variant-picker.tsx)
  — variants=PublicProductVariantDto[] (price, sku, stock, imageUrl, additionalPrice, barcode)
  — displayMode auto: ≤6 ve avg ad ≤12 → swatch (radiogroup), diger durumda select
  — secim → effectivePrice/Sku/Stock/Image guncellenir, out-of-stock disable + “Tükendi” badge
  — iceride Price (sm) + StoreBadge (sku/barcode) + StockIndicator

StockIndicator + QuantityStepper (@workspace/ui)
  — effectiveStock = selectedVariant?.stock ?? product.stock
  — max = effectiveStock>0 ? effectiveStock : undefined → QuantityStepper max
  — maxQuantity degisince useEffect quantity clamp, outOfStock → butonlar disable, kirmizi uyari

ProductInteractive (client, product/[slug]/product-interactive.tsx)
  — state: selectedVariantId, quantity, loading, message, copied, activeTab (desc/details/shipping)
  — handleAdd: ensureGuestToken() → EcommerceClient.addToCart({ guestToken, productId: effectiveId, quantity }, tenantSlug)
  — handleCopySku: navigator.clipboard + Check/Copy ikon degisimi
  — Price (lg, showCurrencyLabel) + StockIndicator + Weight + badgeler (featured/category/brand/sku)
  — Tabs: Aciklama / Ozellikler (sku,kategori,agirlik,currency,isFeatured,isPublished,barcode,slug) / Teslimat (kargo/iadeler)
```

Minimal wiring example:

```tsx
// page.tsx (server)
import { Breadcrumbs, getBreadcrumbJsonLd } from "@workspace/ui/components/breadcrumbs";
import { ProductInteractive } from "./product-interactive";

<Breadcrumbs items={displayBreadcrumbs} />
<ProductInteractive images={dedupedImages} product={product} tenantSlug={tenantSlug} />

// product-interactive.tsx (client)
import { Price } from "@workspace/ui/components/price";
import { StockIndicator } from "@workspace/ui/components/stock-indicator";
import { QuantityStepper } from "@workspace/ui/components/quantity-stepper";
import { Gallery } from "@workspace/ui/components/gallery";
import { StoreBadge } from "@workspace/ui/components/badge";

<Price price={effectivePrice} compareAtPrice={effectiveCompareAt} currency="TRY" size="lg" showCurrencyLabel />
<StockIndicator stock={effectiveStock} lowThreshold={5} />
<QuantityStepper value={quantity} onChange={setQuantity} min={1} max={maxQuantity} disabled={isOutOfStock} />
<Gallery alt={product.name} images={images} variantImage={selectedVariant?.imageUrl ?? null} />
<StoreBadge variant="featured">Öne çıkan</StoreBadge>
```

### Design system usage examples (kopyala-yapistir)

```tsx
import { Price } from "@workspace/ui/components/price";
import { StoreBadge } from "@workspace/ui/components/badge";
import { StockIndicator } from "@workspace/ui/components/stock-indicator";
import { QuantityStepper } from "@workspace/ui/components/quantity-stepper";
import { Breadcrumbs } from "@workspace/ui/components/breadcrumbs";
import { Gallery } from "@workspace/ui/components/gallery";
import { ProductCard } from "@/app/(shop)/[tenantSlug]/components/product-card";
import { VariantPicker } from "@/app/(shop)/[tenantSlug]/components/variant-picker";

// Fiyat — indirim badge ile
<Price price={199.9} compareAtPrice={249.9} />

// Fiyat — sadece guncel, lg
<Price price={product.price} compareAtPrice={product.compareAtPrice ?? null} currency="TRY" size="lg" showCurrencyLabel />

// Badge varyantlari
<StoreBadge variant="category">{product.categoryName}</StoreBadge>
<StoreBadge variant="sku">SKU: {product.sku}</StoreBadge>
<StoreBadge variant="sale">İndirim</StoreBadge>

// Stok
<StockIndicator stock={product.stock ?? null} />

// Stepper (client)
const [qty, setQty] = useState(1);
<QuantityStepper value={qty} onChange={setQty} min={1} max={product.stock ?? undefined} />

// Breadcrumbs
<Breadcrumbs items={[
  { label: "Home", href: "/" },
  { label: "Shop", href: `/${tenantSlug}/shop` },
  { label: product.name },
]} />

// Gallery — variant senkronlu
<Gallery alt={product.name} images={images} variantImage={selectedVariant?.imageUrl ?? null} />

// Composite: kart grid
{products.map((p) => <ProductCard key={p.id} product={p} tenantSlug={tenantSlug} />)}

// Composite: varyant secici
<VariantPicker
  variants={product.variants ?? []}
  selectedVariantId={selectedId}
  onVariantChange={(v) => setSelectedId(v?.id ?? null)}
  basePrice={product.price}
  baseSku={product.sku ?? null}
  compareAtPrice={product.compareAtPrice ?? null}
  currency="TRY"
  tenantSlug={tenantSlug}
/>
```

Utility class ornekleri: `bg-store-primary text-store-primary-foreground`, `border-store-border`, `rounded-store-lg`, `shadow-store`, `text-store-muted-foreground`. Tum token’lar `globals.css` @theme bridge’inden gelir.

### JSON-LD SEO

`page.tsx` icinde iki `application/ld+json` script enjekte edilir (XSS icin `<` → `\u003c` escape):

```tsx
import { getBreadcrumbJsonLd } from "@workspace/ui/components/breadcrumbs";

const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";
const breadcrumbJsonLd = getBreadcrumbJsonLd(displayBreadcrumbs, origin);
const productJsonLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: product.name,
  description: product.description,
  image: dedupedImages,
  sku: product.sku,
  brand: brand ? { "@type": "Brand", name: brand } : undefined,
  category: product.categoryName,
  offers: {
    "@type": "Offer",
    price: product.price,
    priceCurrency: product.currency ?? "TRY",
    availability: stock <= 0 ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
    url: canonical,
  },
};
```

`generateMetadata` title `${product.name} — ${tenantSlug}`, description 160 char trim, canonical `/${tenantSlug}/product/${slug}`, openGraph `website` + images.

### Shop integration

- `apps/ecommerce/app/(shop)/[tenantSlug]/shop/page.tsx` katalog listesi; product detail’e `/${tenantSlug}/product/${slug}` linkleri `ProductCard` ve Shop listesi uzerinden verilir.
- `EcommerceClient.getPublicProducts` ve `getPublicProductBySlug` ISR 60s (`next: { revalidate: 60 }`); `getStorefront` tenant temasi icin layout’ta 60s.
- `next.config.ts` `images.remotePatterns` → `*.supabase.co`, `*.supabase.in`, `images.unsplash.com` (Supabase Storage + Unsplash sample).
- Shop kategori filtresi `?categoryId=` query ile Breadcrumb kategori linkiyle ayni.

### Yeni store temasi eklemek

1. CRM’de `tenant_settings.store_theme` → renk degeri (`oklch(0.62 0.18 145)`, `#7c3aed`, `rgb(...)`) ya da tema adi (`forest`) yaz.
2. Renk ise `apps/ecommerce/app/(shop)/[tenantSlug]/layout.tsx` otomatik `style="--store-primary: ..."` override uygular — ek islem yok.
3. Tema adi ise `packages/ui/src/styles/globals.css` icine preset ekle:

   ```css
   [data-store-theme="forest"] {
     --store-primary: oklch(0.52 0.16 145);
     --store-accent: oklch(0.95 0.03 145);
   }
   .dark [data-store-theme="forest"] {
     --store-primary: oklch(0.62 0.18 145);
   }
   ```

4. Token ekliyorsan `packages/ui/src/tokens.json` → `store.*` altina ekle ve `docs/design-system.md` tablolari guncelle.
5. `logoUrl` Tenant kaydindan `next/image` header’da gosterilir — domain `next.config.ts` remotePatterns’a ekli olmali.
6. Dogrula: `npm exec -- ultracite fix && npx turbo typecheck --filter=@workspace/ui --filter=@workspace/ecommerce`.

Detay: [`docs/design-system.md`](../../../docs/design-system.md) §5 Tenant Temasi ve §10 Yeni Store Temasi Eklemek.

### Inspo

`crm-monorepo/inspo/store-detail-*.png` referans gorselleri (figma/screenshot) bu klasore eklenecek; `docs/design-system.md` §11 Inspo bolumunden linklenecek. Su an inspo PNG henuz eklenmedi — eklendiginde relative path `![inspo](../../inspo/store-detail-01.png)` formatinda.

## Troubleshooting

- **Sync params error** (`params` should be awaited) → ensure `await params` in all `page.tsx`/`layout.tsx` under `[tenantSlug]`.
- **Supabase 401** → check `.env.local` anon key and `supabase/middleware.ts` cookie name (`sb-ecommerce-auth-token` vs web's `sb-crm-auth-token`).
- **CORS / fetch failed** → ensure CRM API is running on `:5000` and `next.config.ts` rewrites `/api/:path*` → `http://localhost:5000/api/:path*`.
- **HMAC 401** → set `ECOMMERCE_HMAC_SECRET` equal to CRM's secret, or leave empty to disable HMAC locally.

## License

Private — part of `crm-monorepo`.
