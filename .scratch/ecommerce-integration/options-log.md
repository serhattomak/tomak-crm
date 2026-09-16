# E-Commerce Integration — Tüm Seçenekler Logu (2026-09-01)

> Grilling 2026-08-31 — tüm A/B/C seçenekleri burada saklanıyor. Gelecekte “şunu B yap” demek için referans.

## Q1 Storefront nerede?
- A) Aynı apps/web içinde app/(store)/[tenantSlug]/shop (tek deploy) ✅ ONAYLANAN (ilk öneri, sonra Q7 ile ayrı app’e evrildi)
- B) Ayrı apps/storefront app
- C) Harici Shopify/Woo, CRM sadece API

## Q2 Katalog ne public?
- Migration slug/seo/is_published/is_featured/weight ekle, public sadece is_published ✅
- B) images TEXT[] kalsın MVP, Faz2 product_images

## Q3 Sepet & checkout
- Misafir evet, carts(cart_items) DB + guest_token + expires, anon /api/public/cart, merge on login, addresses book, kargo+ödeme seçimi ✅

## Q4 Ödeme gateway
- iyzico MVP tek, PayTR/Stripe Faz2, payment_gateways per tenant, create-intent + webhook ✅

## Q5 Kargo entegrasyonu
- Faz1 manuel etiket yükle, Faz2 Yurtiçi/Aras/MNG adapter + PDF + auto-poll ✅

## Q6 Entegrasyon yönü
- Mod A CRM kaynak tek kaynak (varsayılan) ✅, Mod B harici Shopify webhook (opsiyonel Integrations modülü)

## Q7 E-ticaret app nerede, nasıl bağlı? (ayrışma sonrası)
- apps/ecommerce yeni Next.js app, turbo workspaces’e ek, aynı Supabase DB paylaş ama sadece CRM public HTTP API’sini çağır (anon+tenantSlug+HMAC), BuildingBlocks import yok ✅

## Q8 Müşteri senkronu
- customers.auth_user_id FK auth.users nullable + customer_addresses, SignUp trigger customers, misafir guest_token sonra merge ✅

## Q9 Sipariş/kargo/destek akışı
- POST /api/public/orders → Confirmed source=ECommerce external_id unique; kargo CRM shipments → ecom tracking; destek POST /api/public/tickets SenderType Customer → CRM tickets/[id] ✅

## Q10 Katalog master
- CRM master, e-ticaret read-only GET /api/public/products?tenantSlug&is_published, ISR 60s ✅

## Q11 Tenant/mağaza modeli
- Tek kod çok mağaza ecommerce.com/[tenantSlug]/shop (Faz2 subdomain wildcard), tenant_modules.ecommerce_enabled + tenant_settings ✅

## Q12 Paylaşılan kod & RLS
- Sadece HTTP API, service_role yazımı yok, ecommerce-client.ts ✅

## Q13 Gerçek zamanlı
- Realtime postgres_changes + 30s polling fallback + e-posta webhook ✅

## Q14 Promosyon sepetle
- POST /api/public/cart/evaluate → PromotionCalculationEngine, campaign_usages checkout’ta ✅

## Q15 Hesabım sayfaları
- my-orders/addresses/support/returns (auth_user_id→customerId) ✅

## Q16 Zorunlu vs opsiyonel MVP
- Zorunlu 5 migration (customers+addresses, products catalog, carts/cart_items, payment_gateways+orders.external, public API) ✅ Opsiyonel Faz2 wishlist/reviews/kargo adapter/E-Arşiv

## Q17 Monorepo kablolama
- Aynı packages/*, aynı Supabase projesi, CRM_API_URL env, vercel/coolify iki app ✅

## Q18 İlk adım
- İlk PR iskelet + 5 migration birlikte (shop/[tenantSlug] hello + ecommerce-client.ts) ✅

Onay: 2026-09-01 “Önerilerin iyi, Onaylıyorum” — tümü önerilen gibi.
