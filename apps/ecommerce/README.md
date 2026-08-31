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

## Troubleshooting

- **Sync params error** (`params` should be awaited) → ensure `await params` in all `page.tsx`/`layout.tsx` under `[tenantSlug]`.
- **Supabase 401** → check `.env.local` anon key and `supabase/middleware.ts` cookie name (`sb-ecommerce-auth-token` vs web's `sb-crm-auth-token`).
- **CORS / fetch failed** → ensure CRM API is running on `:5000` and `next.config.ts` rewrites `/api/:path*` → `http://localhost:5000/api/:path*`.
- **HMAC 401** → set `ECOMMERCE_HMAC_SECRET` equal to CRM's secret, or leave empty to disable HMAC locally.

## License

Private — part of `crm-monorepo`.
