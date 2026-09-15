# Design System — Taşındı (Stub)

> **Durum:** ❌ Kanonik değil. Bu dosya yalnızca dış bağlantıları kırmamak için duruyor.
> **Kanonik kaynak:** 👉 [`crm-ui-standards.md`](./crm-ui-standards.md)
> **Karar kaydı:** [`adr/0004-crm-design-system-enforcement.md`](adr/0004-crm-design-system-enforcement.md)
> **Yol haritası:** [`crm-ui-roadmap.md`](crm-ui-roadmap.md)

---

## Bu doküman neden boşaltıldı?

Bu dosya (2026-09-15 öncesi) bu depoda **var olmayan** bir tasarım sistemini tarif ediyordu. Bir ajan veya geliştirici bu dokümana güvenip bileşen/token arasa, bulamayacağı şeyler peşinde zaman kaybediyordu. Kodda karşılığı olmayan kavramlar:

| Bu dokümanda geçen | Gerçek durum |
| --- | --- |
| `--store-*` token'ları, `data-store-theme`, light-only mercan sözleşmesi | `packages/ui/src/styles/globals.css` içinde **yok**. CRM paleti **zinc + blue**, hue 260 |
| `apps/ecommerce` uygulaması | Depoda **böyle bir uygulama yok** — yalnızca `apps/web` ve `apps/api` |
| `packages/ui/src/tokens.json` | **Yok** — token'lar CSS-first, `globals.css` içinde (`@theme inline` + `:root`/`.dark`) |
| `Price`, `StoreBadge`, `StockIndicator`, `QuantityStepper`, `Breadcrumbs`, `Gallery` | `packages/ui/src/components/*` içinde **yok** |

Gerçek design system tek bir yerde yaşar: **[`crm-ui-standards.md`](./crm-ui-standards.md)** (21 kanonik primitif + `globals.css` token'ları).

---

## Bu dosyaya bir şey eklemeyin

Yeni kural, token, renk, tipografi veya bileşen kararı **yalnızca** `crm-ui-standards.md`'ye yazılır. Bir kuralın iki dokümanda yaşaması, ADR-0004 ile ortadan kaldırılan "iki design system" sorununu geri getirir.

Kodda `--store-*` veya `apps/ecommerce` arayan bir kayıt bulursanız (`crm-ui-guard.mjs`, ADR-0002), o kayıt geçersizdir ve temizlenmelidir — bkz. [`crm-ui-roadmap.md`](./crm-ui-roadmap.md) → Gelecek Adımlar #7.
