# E-Commerce Integration Spec — CRM Backend (2026-09-01)

## Overview
Monorepo’da ayrı `apps/ecommerce` Next.js app’i geliştirilecek. CRM (`apps/api` + `apps/web` dashboard) arka planda servis olarak kalacak. E-ticarette kayıt olan müşteri, sipariş, kargo, destek CRM’de görünür.

## Architecture
- **Monorepo:** `apps/ecommerce` turbo `apps/*`’e ek, `packages/ui` ve `packages/typescript-config` paylaşılır. Aynı Supabase projesi (`NEXT_PUBLIC_SUPABASE_URL` + `ANON_KEY` e-ticaret, `SERVICE_ROLE` sadece CRM API). `CRM_API_URL=http://localhost:5000` env.
- **Connection:** E-ticaret sadece CRM `public/*` HTTP API’sini çağırır (anon + `tenantSlug` + HMAC/rate-limit). Doğrudan DB yazımı yok.
- **Tenant/Store:** Tek kod çok mağaza — `ecommerce.com/[tenantSlug]/shop` (Faz2 `tenantSlug.ecommerce.com` wildcard). `tenant_modules.ecommerce_enabled`, `tenant_settings.store_theme/payment_gateway/default_carrier`.

## Data Model (MVP 5 migration)
1. **customers.auth_user_id** UUID FK auth.users nullable + **customer_addresses** (id, tenant_id, customer_id FK CASCADE, label, address_line, city/state/postal/country, is_default, created_at).
2. **products** catalog: `slug VARCHAR UNIQUE per tenant`, `seo_title`, `meta_description`, `is_published BOOL DEFAULT false`, `is_featured`, `sort_order`, `weight_kg`, `dimensions`.
3. **carts** + **cart_items**: carts(id, tenant_id, customer_id nullable, guest_token UUID, expires_at+7d, created_at), cart_items(id, cart_id FK CASCADE, product_id, variant_id nullable, quantity, snapshot_price, snapshot_name).
4. **payment_gateways** per tenant (id, tenant_id FK CASCADE, provider iyzico/paytr/stripe, api_key, secret, test_mode, is_active) + **orders.external_id** VARCHAR UNIQUE per tenant + `external_source` VARCHAR.
5. **Public API** tables already exist: orders, shipments, tickets, etc. — no new tables, just endpoints.

## API (public, anon)
- `GET /api/public/products?tenantSlug&is_published=true&q&category&page` → service_role tenant_id map, only published.
- `POST /api/public/cart` (guest_token) + `GET /api/public/cart?guest_token` + `POST /api/public/cart/merge` (on login)
- `POST /api/public/cart/evaluate` → PromotionCalculationEngine (cartItems+coupon → discount/freeShipping/gifts)
- `POST /api/public/checkout` → creates `orders` (Confirmed, source=ECommerce, external_id, payment_status Unpaid) + `order_items` + clears cart
- `POST /api/public/payments/create-intent` (iyzico) + `POST /api/public/webhooks/iyzico` → AddOrderPayment auto Paid
- `GET /api/public/orders/mine` (auth) + `GET /api/public/orders/[id]/tracking` (carrier/tracking/status)
- `POST /api/public/tickets` + `GET /api/public/tickets/mine` (SenderType Customer)

## Customer Sync
SignUp → Supabase Auth user → trigger `customers` (Individual/Active, auth_user_id=user.id). Guest checkout guest_token → order with guest email, later signUp merges auth_user_id + dedup by email. Addresses CRUD via `customer_addresses`.

## Catalog
CRM master, e-ticaret read-only. ISR 60s.

## Order/Kargo/Destek Flow
Ecom order → CRM orders → CRM shipments (manual carrier select → tracking), Realtime postgres_changes → ecom my-orders live + email. Support: ecom Help → helpdesk_tickets, CRM tickets/[id] reply → ecom mine.

## Promotions
`POST /api/public/cart/evaluate` wired to ecom cart, campaign_usages written at checkout.

## Constraints
VARCHAR only, RLS HasQueryFilter, Ultracite/Biome, Next 16.3.3.

## Exit Criteria
5 migration + skeleton + public API + typecheck/build/migration up + docs dual.

## Phase 2 (optional)
wishlist, reviews, shipment auto-adapter (Yurtiçi/Aras/MNG API + PDF), E-Arşiv, analytics, subdomain wildcard, PayTR/Stripe.

## References
- customers_module, products_module, orders_module, shipping_module migrations
- PromotionCalculationEngine, CreateOrder, ApiClient
