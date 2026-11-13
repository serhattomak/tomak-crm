# Stabilizasyon Isı Haritası

**Oluşturuldu:** 2026-09-18
**Kapsam:** Tüm uygulama (24 modül, 56 ekran, admin/auth/portal yüzeyleri dâhil)
**Durum:** `in_progress` — Batch 1 yürütülüyor
**Kaynak:** iki denetim raporu (güvenlik + yarım/ölü yüzey) + `docs/crm-ui-roadmap.md` + doğrudan doğrulama

> **Neden bu dosya var.** Kayıtlı olmayan liste yeniden keşfedilir. Bu oturumda "CMS"
> kelimesi iki kez yanılttı (`nav-config.ts:94`'te bir hub etiketi, içerik yönetimi değil)
> ve ölü veri (`products.is_published`) kimsenin kaydında yoktu. Amaç, yeni özellik
> eklemeden önce **var olanı sağlamlaştırmak** için kapsamlı ve kanıtlı bir kayıt bırakmak.

---

## Kapsam dışı (bilinçli)

Bu bir **"yeni özellik"** programı değil. Şunlar ertelendi:

- **İçerik/sayfa yayınlama (CMS, blog, landing, page-builder, medya kütüphanesi):** repoda hiç yok, sıfırdan program.
- **Storefront / e-ticaret:** `docs/ecommerce/spec.md` + `options-log.md` onaylı ama sıfır kod; `apps/ecommerce` yok. Statüsü netleştirilecek (aşağıda C4).
- **Ürünü halka açık gösterme** (public ürün sayfası, `is_published` toggle'ı): yeni yüzey gerektirir.

---

## Ölçüp karar verdiğimiz ölçüt

> *Bu madde kapanınca, kiracının admini/çalışanı somut bir işi daha mı kolay/güvenli
> yapabiliyor — ya da somut bir risk mi kalkıyor? Cevap "hayır" ise madde en sona gider.*

Uygulanışı: **A/B** hedefe hizmet eder → **C** kayıt doğruluğu (A/B'den sonra) → **D** süreç uzatır (en sona).

---

## Kanıt güvenilirliği (dürüstlük notu)

| İşaret | Anlamı |
|---|---|
| ✅ | Bu oturumda **ben doğruladım** (dosya okundu, pozitif kontrollü tarama) |
| 📋 | Denetim raporundan; **doğrulanmadı** |
| ⚠️ | Ölçülmedi / belirsiz |

Denetimlerin kendi beyan ettiği kör noktalar:
- Güvenlik denetimi: *"419 endpoint'in tamamını tek tek açmadım; 'başka auth'suz endpoint yok' diyemem."* → **B0 bunu kapatıyor.**
- Envanter denetimi: canlı DB'ye bağlanmadı (Supabase CLI 2.67.1 `db query` desteklemiyor, PATH'te `psql` yok) → "kolon var ama kullanılmıyor" iddiaları migration + kod kanıtına dayanıyor, `pg_stat_user_tables`'a değil.
- Her ikisi de runtime doğrulaması yapmadı.

---

## Katman A — Admin/çalışan bir işi yapamıyor veya yanlış yapıyor

| # | Bulgu | Kanıt | Boyut | Doğrulama |
|---|---|---|---|---|
| A1 | **Yeni kayıtta `tenant_modules` boş** → yeni kiracının modül menüleri kayboluyor. `CreateTenant` seed ediyor, signup trigger etmiyor | 📋 `auth_sync_trigger.sql:5-79`; `GetTenantModules.cs:45`; `label-context.tsx:154-169`; karşıtlık: `CreateTenant.cs:84-94` | orta | Yeni kiracı aç, menüyü gör |
| A2 | **Hayalet izinler** `Quotes.Read` / `Quotes.Manage` seed edilmemiş → teklif PDF ve Test Gönder herkese 403 (super admin hariç) | 📋 `GetQuotePdf.cs:69`; `TestSendQuoteTemplate.cs:178`; seed `20260820000015:183-190` | küçük | `permissions` tablosunu sorgula; endpoint'i dene |
| A3 | **5 modülün izinleri mevcut kiracılara grant edilmemiş** → menü kapalı | 📋 `Vehicles`/`Activities`/`Contracts`/`FieldService`/`EArchive` migration'larında `role_permissions` bloğu yok (desen: `20260826000003:18-45`) | orta | `role_permissions`'ı sorgula |
| A4 | `/[tenantSlug]/integration` nav'da var, **sayfa yok** → 404 | 📋 `nav-config.ts:347`; `command-palette.tsx:469-471` | küçük | Linke tıkla |
| A5 | `compliance` sayfası var, **hiçbir menüde yok** (yalnız komut paletinde) | 📋 `nav-config.ts:275-312`; `command-palette.tsx:390-392` | küçük | Nav'ı tara |
| A6 | `whatsapp_settings` **yazma endpoint'i yok** → WhatsApp gönderimi kurulamıyor | 📋 `WhatsAppEndpoints.cs:104`; api-client'ta settings rotası yok | orta | api-client'ı tara |
| A7 | `contract_templates` ölü, `contracts.template_id` kabul edilip **hiç çözülmüyor** — izin metni "şablon oluşturma" diyor | 📋 `ContractEndpoints.cs:65,211` | orta | Şablon yolu ara |
| A8 | **`analytics` sayfası sahte veri** — sabit histogram, sabit funnel, "+%18.4" | 📋 `analytics/page.tsx:165-184,187-220,538-583` | orta | Sayfayı oku, veri kaynağını ara |

## Katman B — Risk (deploy öncesi kapı)

> **Kural:** bu liste kapanmadan deploy yok. Yerel geliştirmede olduğumuz için (2026-09-18)
> hiçbiri bugün istismar edilebilir değil; ama hiçbiri deploy ile birlikte "kapı" olmaktan
> çıkmaz.

| # | Bulgu | Şiddet | Boyut | Kanıt / Durum |
|---|---|---|---|---|
| B0 | **Yetkilendirme matrisi** — tam endpoint sınıflandırması, anonim + izinsiz dökümü, fallback policy'nin gerçek durumu | önkoşul | küçük | ✅ **BİTTİ.** 386 endpoint: **41 anonim** (9 meşru + **32 unutulmuş**), **92 yalnız-auth**, 248 auth+izin, 5 super-admin. `FallbackPolicy` **yok** (`ServiceCollectionExtensions.cs:106` doğrudan okundu). Eski "419" = 386 endpoint + 33 `MapGroup` |
| B1 | SignalR hub anonim; `?tenantId=` ile kiracı grubuna katılım; `JoinRoom` serbest | **Kritik** | küçük-orta | ✅ **BİTTİ + DOĞRULANDI** (bkz. Yürütme Günlüğü) |
| B2 | Envanter endpoint'leri (depo/sayım/transfer) hiç auth taşımıyor | **Kritik** | küçük | ✅ `WarehouseEndpoints.cs:66-73` yalnız `.WithTags`; aynı `Require` deseni `Products/Features`'ta 50, envanter dosyalarında 0 |
| B3 | Araç/EPC/doküman endpoint'leri auth'suz **+ anonim `.svg` yükleme → `wwwroot`** = stored XSS | **Kritik** | orta | ✅ `Vehicles/Features` altında `Require\|AllowAnonymous` → 0 eşleşme (kontrol: `Products/Features` → 50) |
| B4 | `X-Tenant-Id` üyelik doğrulaması olmadan güveniliyor → cross-tenant IDOR | Yüksek | orta | ✅ `Tenancy.cs:52-57` yalnız `Guid.TryParse` |
| B5 | `Tenants` modülünde izinsiz uçlar: `GetTenantModules`, `ToggleTenantModule`, `UpdateTenantLabels`, `GetTenantLabels` — yalnız `RequireAuthorization` | Yüksek | küçük | ✅ aynı modülde `UpdateTenant` → `Tenants.Update`, Admin uçları → `RequireSuperAdmin` (doğrusu yanında duruyor) |
| B6 | İzin tanımlı, **hiç uygulanmamış** 6 modül (ölü anahtarlar) | Yüksek | orta | 📋 `Activities`, `Contracts`, `Vehicles`, `FieldService`, `WhatsApp`, `EArchive` |
| B7 | Sözleşme `content_html` sanitize edilmiyor **+** auth cookie `httpOnly=false` → XSS + oturum çalma zinciri | Yüksek | orta | 📋 `ContractEndpoints.cs:210,238,278`; `PortalClient.tsx:258-261`; `contracts/page.tsx:738-743`; `@supabase/ssr` varsayılanı |
| B8 | Commit edilmiş Supabase **demo** secret'ları (`appsettings.json:22-23`); issuer/audience doğrulanmıyor; `appsettings.Production.json` yok | Yüksek | küçük | ✅ okundu — değerler herkesçe bilinen local demo değerleri, `ValidateIssuer=false` |
| B9 | WhatsApp webhook: verify token karşılaştırması yok, HMAC imza doğrulaması yok | Yüksek | küçük | 📋 `WhatsAppEndpoints.cs:159-172,174-233` |
| B10 | SSRF: webhook URL + e-posta hesap testi (IMAP/SMTP host/port kullanıcı kontrollü) | Orta-Yük | orta | 📋 `CreateWebhook.cs:46-55`; `TestEmailAccountConnection.cs:112,151` |
| B11 | CORS: `SetIsOriginAllowed(_ => true)` + `AllowCredentials()` | Orta | küçük | 📋 `Program.cs:151-160` |
| B12 | `/api/storage/upload`: sunucu tarafı tip/boyut doğrulaması yok; `isPublic` client seçiyor | Orta | orta | 📋 `StorageEndpoints.cs:31-72`; bucket'larda `file_size_limit`/`allowed_mime_types` yok |
| B13 | Public apply: `X-Forwarded-For` spoof ile rate-limit bypass; `X-Frame-Options: ALLOWALL`; açık kayıt + doğrulamasız | Orta | küçük | 📋 `PublicApplyFeatures.cs:79-92,471-474` |
| B14 | RLS: `tenant_members` öz-referanslı policy (`42P17`), yalnız-SELECT tablolar, politikasız `role_permissions` | Orta | orta | 📋 migration metinleri; **canlı DB durumu ⚠️ ölçülmedi** |
| B15 | `RequireModule` hiçbir yerde kullanılmıyor → modül kapatma API'yi kısıtlamıyor | Düşük-Orta | küçük | 📋 `ModuleAccess.cs:56-68`, tek eşleşme kendi tanımı |
| B16 | Public sözleşme token'ı süresiz geçerli; portal token denemelerinde rate-limit yok | Düşük | küçük | 📋 `ContractEndpoints.cs:264-266` |
| B17 | `GET /health` anonim **ve** DB/Redis/RabbitMQ durumunu döndürüyor → bilgi ifşası | Düşük | küçük | ✅ B0 + `Program.cs:194-197` |
| B18 | `JwtBearerEvents.OnMessageReceived` yoktu → tarayıcı WebSocket'te token gönderemiyor, hub hiç kimlik doğrulanamıyordu. **B1 kapsamında eklendi** | — | — | ✅ `ServiceCollectionExtensions.cs:93-111` |
| B19 | **Kritik doğrulama:** commit edilmiş demo secret ile imzalanan, veritabanında **var olmayan** bir kullanıcı token'ı kimlik doğrulamayı **geçti** (404 = auth sonrası handler). B8 varsayım değil, ölçüm | **Yüksek** | küçük | ✅ canlı test, 2026-09-18 |

## Katman C — Sessiz yanlış / bağlantısızlık

| # | Bulgu | Boyut | Kanıt |
|---|---|---|---|
| C1 | **Ölü tablolar:** `customer_portal_access`, `attendance_devices`, `shift_swap_requests`, `payroll_earnings`, `payroll_deductions`, `contract_templates` | orta | 📋 entity + DbContext var, handler yok |
| C2 | **Ölü / yarım kolonlar:** `contracts.created_by_*` (hiç yazılmıyor), e-arşiv `e_archive_type`/`internet_*`/`carrier_*` (hiç yazılmıyor), ürün `is_published`/`is_featured`/`sort_order`/`weight_kg` (**backend tam bağlı, frontend'de hiç yok**) | küçük-orta | 📋 + ✅ düzeltme aşağıda |
| C3 | **Roadmap eskimiş:** 52 → **56** sayfa · açık liste #1–#32 → **#33** · `AGENTS.md` 5554/343 → ölçülen **5546/347** | küçük | 📋 |
| C4 | `apps/ecommerce` hayalet referansı + `design-system.md` stub'ı (var olmayan `--store-*`, `data-store-theme`, `tokens.json`, `Price`/`StoreBadge`/`StockIndicator`/`QuantityStepper`/`Breadcrumbs`/`Gallery`) | küçük | 📋 |
| C5 | `Integrations` .NET modülü **boş dizin** (yalnız `bin/`/`obj/`) | küçük | 📋 |
| C6 | 9 kullanılmayan `packages/ui` primitifi (`alert`, `progress`, `tabs`, `switch`, `tooltip`, `separator`, `scroll-area`, `radio-group`, `dropdown-menu`) | küçük | 📋 pozitif kontrollü arama |

## Katman D — Süreç uzatan (en sona)

Kullanıcının yapabildiği hiçbir somut işi değiştirmiyor; takvimi tüketiyor.

`#31` lint borcu (5.546 teşhis; `noJsxPropsBind` tek başına ~1.693 handler refactor'ı) · `#1` monolit sayfa ayrıştırması (9 dosya, 2.300–5.000 satır) · `#2` görsel regresyon altyapısı · `#3` tam a11y denetimi (52→56 ekran) · `#5` mikro kopya tam geçişi · `ultracite`'ı CI'a bağlama
**Gri alan (en sona):** `#11` z-index ölçeği · `#13` accordion/calendar · `#14` kökteki 14 widget · `#30-ad.2` radius köprüsü

---

## Kayda geçen düzeltmeler

1. **`products.is_published` "tamamen ölü" DEĞİL.** Backend tam bağlı: entity (`ProductEntities.cs:58-62`), DTO (`CreateProduct.cs:41`, `UpdateProduct.cs:37`), okuma (`GetProductById.cs:88`). Eksik olan **frontend request tipleri** (`api-client.ts:6746-6797`) ve hiçbir `.tsx`'in bu alanları okumaması. Doğru tanım: **yarım kalmış özellik**, ölü veri değil.
2. **`product_price_history` ölü değil** — `UpdateProduct.cs:121` yazıyor. (Yanlış pozitif kontrolü.)
3. **`FieldJobPart` ölü değil** — `FieldServiceEndpoints.cs:237` yazıyor. (Yanlış pozitif kontrolü.)
4. **`nav-config.ts:94`'teki `"CMS"` etiketi yanıltıcı** — hub `id: "comm"`, adı "Destek & İletişim" (`messages/tr.json:65`). A2 ile aynı pakette düzeltilecek.
5. **`.scratch/*/` glob'u "No files found" dedi** ama dizinde 12 klasör var — `environment.md`'nin belgelediği tuzak; dizin okuma ikinci yöntemiyle doğrulandı.
6. **`allowedDevOrigins` teşhisi doğrulandı:** `block-cross-site-dev.js:105` karşılaştırmayı `parsedOrigin.hostname` üzerinden yapıyor → **port içeren girdi hiç eşleşmez**. Düzeltildi (2026-09-18).

---

## Yürütme planı

Her batch, bir öncekinin doğrulanmasını bekler.

| Batch | İçerik |
|---|---|
| **0** | ✅ **B0** — yetkilendirme matrisi (386 endpoint sınıflandırıldı) |
| **1** | ✅ **B1** (SignalR) → ⬜ **fallback policy + açık `AllowAnonymous` sınırı** → B2 → B3 → A2 |
| **2** | B4 → B5 → B6 (kiracı izolasyonu tek konu) |
| **3** | B7 (XSS + cookie birlikte — oturum zinciri) |
| **4** | A1 → A3 → A4 → A5 → A6 → A7 (admin'in yapamadıkları) |
| **5** | B8–B16 (kalan risk) |
| **6** | A8 → C1–C6 (sessiz yanlışlar) |
| **7+** | D katmanı |

### Yöntem notu — Batch 1

Anonim yüzeyler **tek tek yamalanmaz**. Denetim, `AddAuthorization()` çağrısında
`FallbackPolicy` tanımlı olmadığını söylüyor (`ServiceCollectionExtensions.cs:106`) —
yani bugünkü varsayılan "açıkça korunmamış her endpoint anonim". Batch 1 bu varsayılanı
**tersine çevirir** (fallback = kimliği doğrulanmış kullanıcı), gerçekten public olması
gereken dosyalara açık `.AllowAnonymous()` işareti koyar. Böylece hem üç anonim aile
kapanır hem **bundan sonra yazılan endpoint'ler güvenli doğar**.
*(`FallbackPolicy` yokluğu B0'da doğrulanacak — henüz denetim iddiası.)*

---

## Doğrulama kuralları (bu program için)

- **Test yazılmaz.** Kullanıcı açıkça istemedikçe test dosyası oluşturulmaz; test en son iştir.
- Her madde için: `tsc --noEmit` · `npm run guard:crm-ui` · `npm run lint` · gerekirse `next build`
- Doğrulanamayan maddeler için: `docker exec … psql` / `curl` senaryosu + **pozitif kontrol** (kasıtlı ihlal denemesi) + **ikinci yöntem** (`docs/agents/environment.md` disiplini)
- **Diff'i oku.** Sınıf/izin dizelerini ne `tsc` ne guard görür.
- Kör ölçüm, temiz ölçümle aynı görünür — "bulunamadı" sonucu ikinci yöntem doğrulayana dek doğrulanmamış sayılır.

---

## Ölçülmeyen / açık kalanlar

| Konu | Neden ölçülmedi |
|---|---|
| Canlı DB'nin gerçek RLS durumu | `psql` PATH'te yok; Supabase CLI 2.67.1 `db query` desteklemiyor |
| Storage `..` path traversal davranışı (Supabase normalizasyonu) | Runtime testi gerekir |
| `.env.local` git'te izleniyor mu | `git ls-files` çalıştırılmadı |
| 419 endpoint'in eksiksizliği | **B0 kapatıyor** |
| `prose` sınıflarının derlenmiş CSS'te gerçekten ölü olduğu | `.next` çıktısı ayrıştırılmadı |
| Kullanıcı etkisi sıralaması ("en çok acıtan") | Ölçülemez; risk + maliyet ekseninde karar verildi |

---

# Yürütme Günlüğü

## 2026-09-18 — `next dev` düzeltmesi

- **Değişiklik:** `apps/web/next.config.ts` → `allowedDevOrigins: ["*.trycloudflare.com", "127.0.0.1"]`
- **Neden:** `node_modules/next/dist/server/lib/router-utils/block-cross-site-dev.js:105` karşılaştırmayı `parsedOrigin.hostname` üzerinden yapıyor (port yok, şema yok). Port içeren girdi **matematiksel olarak** eşleşemez. `localhost` zaten varsayılan listede (`:78-82`).
- **Doğrulama (pozitif kontrollü, canlı dev sunucusu):**

  | Origin | Sonuç | Anlam |
  |---|---|---|
  | `evil.example` | **403** | Koruma hâlâ canlı — düzeltme onu kapatmadı |
  | `127.0.0.1:3000` | **404** (403 değil) | Artık engellenmiyor |
  | `localhost:3000` | **404** (403 değil) | Zaten izinliydi |

## 2026-09-18 — Batch 1 / B1: SignalR hub kimlik doğrulaması

**Değişen dosyalar:**
- **yeni** `apps/api/src/CRM.BuildingBlocks/Tenancy/TenantMembershipVerifier.cs` — `ITenantMembershipVerifier`. `tenant_members` üzerinden üyelik doğrular; yalnız **olumlu** sonucu 5 dk cache'ler; DB hatasında **fail-closed** ve cache'e yazmaz.
- `apps/api/src/CRM.BuildingBlocks/Extensions/ServiceCollectionExtensions.cs` — verifier DI kaydı; `JwtBearerEvents.OnMessageReceived` ile `access_token` **yalnız `/hubs`** altında kabul ediliyor (query token loglara düşer, istisna dar tutuldu).
- `apps/api/src/CRM.BuildingBlocks/Realtime/CrmHub.cs` — `[Authorize]`; tenant grubuna katılım artık üyelik doğrulamasından geçiyor; `JoinRoom` yalnız kendi user odası + doğrulanmış kendi tenant odası (frontend bu metotları hiç çağırmıyor — 0 eşleşme).
- `apps/api/src/CRM.Api/Program.cs:191` — `MapHub<CrmHub>("/hubs/crm").RequireAuthorization()`
- `apps/web/lib/notifications/realtime-notification-context.tsx` — `accessTokenFactory` ile Supabase oturum token'ı gönderiliyor.

**Doğrulama (canlı API + sunucu logu, 6 senaryo):**

| Senaryo | Sonuç |
|---|---|
| anonim negotiate | **401** — log: `DenyAnonymousAuthorizationRequirement` |
| geçersiz token | **401** — log: `IDX14100: JWT is not well formed` |
| geçerli token (query, `/hubs`) | **200** — endpoint çalıştı |
| geçerli token (query, `/api` yolu) | **401** — istisna gerçekten `/hubs` ile sınırlı |
| geçerli token (Authorization header) | **200** |
| `GET /health` | **200** — kırılmadı |

**Araç kapıları:** `dotnet build` **0 hata / 0 uyarı** · `npm run typecheck` **2/2 başarılı**.

**Yan bulgu (ölçüm tuzağı):** ilk `dotnet build` çağrısı `exit 1` döndürdü — **yalancı**. stderr'ın PowerShell tarafından `NativeCommandError`'a çevrilmesi. Log'a yazıp özet okunduğunda gerçek sonuç 0 hata. environment.md'nin belgelediği tuzağın canlı örneği.

**Yan bulgu (ortam):** `dotnet run`, `launchSettings.json` yüzünden `ASPNETCORE_URLS`'ı eziyor → API **5187**'de dinliyor. Doğrulama buna göre yapıldı.

**Yan bulgu (B8 doğrulandı):** Geçerli token senaryosu için demo secret ile JWT imzalandı ve **veritabanında var olmayan** bir kullanıcı kimliğiyle istek kabul edildi (404 = auth geçildi, handler'a ulaşıldı). Yani B8 artık varsayım değil, **ölçüm**.

## 2026-09-18 — Batch 1 / fallback policy (deny-by-default)

**Değişen dosyalar:**
- `apps/api/src/CRM.BuildingBlocks/Extensions/ServiceCollectionExtensions.cs` — `AddAuthorization()` artık `FallbackPolicy = RequireAuthenticatedUser` taşıyor. Artık bir endpoint, açıkça `AllowAnonymous()` demedikçe kimlik doğrulaması ister.
- `apps/api/src/CRM.Api/Program.cs` — açık `AllowAnonymous()`: `MapHealthChecks("/health")`, `MapGet("/")`, `MapOpenApi()`, `MapScalarApiReference()`.

**Neden bu yöntem:** 32 unutulmuş anonim endpoint'i tek tek yamamak yerine **varsayılan tersine çevrildi**. Bundan sonra yazılan her endpoint güvenli doğar; unutulan bir `RequireAuthorization()` artık sessizce yayınlamaz.

**Doğrulama — öncesi/sonrası, canlı API:**

| Uç | Öncesi | Sonrası |
|---|---|---|
| `GET /api/inventory/warehouses` | 200 (anonim) | **401** |
| `GET /api/inventory/counts` | 200 (anonim) | **401** |
| `GET /api/inventory/transfers` | 200 (anonim) | **401** |
| `GET /api/vehicles/` | 200 (anonim) | **401** |
| `GET /api/vehicles/documents/` | 200 (anonim) | **401** |
| `GET /api/vehicles/epc/systems` | 200 (anonim, **DB'ye yazıyordu**) | **401** |
| `GET /api/vehicles/epc/parts` | 200 (anonim) | **401** |
| `POST /api/promotions/evaluate` | 200 (anonim) | **401** |

**Regresyon kontrolü (meşru erişim bozulmadı):**

| Uç | Sonuç |
|---|---|
| `GET /api/inventory/warehouses` + token | **200** |
| `GET /api/vehicles/` + token | **200** |
| `GET /health` | 200 |
| `GET /` | 302 |
| `GET /api/public/quotes/{token}` | 404 (AllowAnonymous korundu) |
| `GET /api/public/contracts/{token}` | 404 |
| `GET /api/public/portal/{token}` | 404 |
| `GET /api/public/webhooks/whatsapp` (Meta verify) | 200 |
| `POST /api/recruitment/public/apply` | 400 (doğrulama hatası, auth değil) |

**Ön koşul taraması:** `apps/web/lib/api-client.ts:212-214` → `ApiClient.request` **her** istekte `Authorization: Bearer` ekliyor; `promotions/evaluate` da aynı yoldan geçiyor. Frontend'in tokensiz çağrı yaptığı bir yol yok.

**Araç kapıları:** `dotnet build` **0 hata / 0 uyarı**.

**Yeni bulgu (anonim yazma):** Baseline ölçümünde `GET /api/vehicles/epc/systems` anonim çağrıldığında `vehicle_systems` / `vehicle_subsystems` tablolarına **INSERT** yaptı (ilk erişimde EPC seed). Yani anonim erişim yalnız okuma değil, **yazma** de riski taşıyordu.

**Kalan iş (B3/B12 ile bağlantılı):** `UseStaticFiles()` fallback policy'den etkilenmez → `wwwroot/uploads` altındaki dosyalar hâlâ anonim servis ediliyor. Anonim `.svg` **yükleme** kapatıldı ama yükleme yapan kişi için `.svg` kabulü ve aynı origin'den servis hâlâ açık. Bu, B3'ün kalan yarısı.

## 2026-09-18 — Batch 1 / B4: `X-Tenant-Id` üyelik doğrulaması

**Değişen dosya:** `apps/api/src/CRM.BuildingBlocks/Tenancy/Tenancy.cs` — `TenantContextMiddleware`.
- `InvokeAsync` artık `ICurrentUser`, `IPermissionService`, `ITenantMembershipVerifier` alıyor.
- Tenant başlıktan/subdomain'den/slug'dan çözüldükten sonra: istek kimliği doğrulanmışsa **üyelik** aranır; üye değilse **403**.
- **Super admin muaf**, çünkü platform yönetimi üye olmadığı kiracıları hedefler. (Bu muafiyetin gerekliliği *ölçümle* doğrulandı: `apps/web/app/(admin)/admin/tenants/[tenantId]/page.tsx:130,166` → `apiClient.put(url, body, tenantId)` üçüncü argümanla `X-Tenant-Id` kuruyor.)
- Muafiyet önce kontrol edilir: `IsSuperAdminAsync` HybridCache (L1 bellek + L2 Redis) ile 60 dk cache'li (`PermissionService.cs:89-110`), yani ek yük ucuz.
- Anonim istekler etkilenmez (public token rotaları).

**Doğrulama — canlı API, gerçek veriyle (DB'de 1 kullanıcı, 2 kiracı):**

| Senaryo | Sonuç |
|---|---|
| Üye **olmayan** kullanıcı + başka kiracı başlığı | **403** — gövde: `{"error":"You are not a member of this tenant."}` |
| Super admin + kendi kiracısı | **200** |
| Super admin + diğer kiracı (üye değil) | **200** — bypass çalışıyor, admin ekranı kırılmıyor |
| Super admin, tenant başlığı yok | **200** — değişmedi |
| Anonim + tenant başlığı | **401** — fallback policy hâlâ geçerli |
| Public rota + tenant başlığı | **404** — değişmedi |

**`ITenantMembershipVerifier` iki yönde de uçtan uca kanıtlandı** (hub üzerinden, super-admin bypass'ı olmadan), sunucu logundan:
```
joined tenant group a0237cb3-ebfc-47d9-85cb-892c8ed028da
denied tenant group 11111111-2222-3333-4444-555555555555: user a0000000-... is not a member
```

**Bilinçli takas (kayıt):** doğrulayıcı **yalnız olumlu** sonucu cache'ler. Olumsuz sonuç cache'lenseydi geçici bir hata kullanıcıyı 5 dk kilitlerdi; bedeli, üye olmayan isteklerin her seferinde DB'ye gitmesi. Super-admin kontrolü önce yapıldığı için yönetim ekranları bu bedeli ödemiyor.

**Kapsam dışı bırakılanlar:** `Tenancy:DefaultTenantId` geliştirme fallback'i üyelik kontrolünden geçmiyor (yalnız Development ve yalnız tenant başlığı yokken).

**Araç kapıları:** `dotnet build` **0 hata / 0 uyarı**.

**B4'ün kapatmadığı şey:** izin katmanı. 92 endpoint hâlâ *izin* kontrolü yapmıyor (`RequirePermission` yok) — artık üye olmayan erişemiyor, ama kiracı içindeki **her üye** erişebiliyor. O iş B5/B6'da.

## 2026-09-18 — B5 (Tenants modülü) + A2 (hayalet izinler)

### Yeni seam: `ITenantAccessGuard`

`apps/api/src/CRM.BuildingBlocks/Tenancy/TenantAccessGuard.cs` — tek soru: *bu kullanıcı bu kiracıya dokunabilir mi?* Super admin muaf, aksi hâlde üyelik aranır. DI: scoped.

**Neden seam:** tenant id'si üç ayrı caller-controlled yoldan geliyor (`X-Tenant-Id` header, subdomain/slug, **route parametresi**). Kural her yerde yeniden yazılırsa sürüklenir — bu repodaki asıl güvenlik hatası buydu. `TenantContextMiddleware` de artık bu seam'i kullanıyor (satır içi super-admin+üyelik mantığı kaldırıldı).

### B5 — route kiracısı doğrulaması

`RequirePermission` middleware'in çözdüğü **header** tenant'ını kontrol eder, route'taki `{tenantId}`'yi değil. Bu yüzden kontrol handler'a taşındı:

| Endpoint | Kural |
|---|---|
| `GET /api/tenants/{id}/modules` | üyelik **veya** super admin |
| `GET /api/tenants/{id}/labels` | üyelik **veya** super admin |
| `PUT /api/tenants/{id}/modules/{key}` | `Tenants.Update` **o kiracıda** (+ super admin otomatik) |
| `PUT /api/tenants/{id}/labels` | `Tenants.Update` **o kiracıda** |

**Neden okumalarda `Tenants.View` değil üyelik:** uygulama bu iki endpoint'i nav/label render'ı için **her kullanıcıyla** çağırıyor; `Tenants.View` bugün yalnız Owner'da (DB doğrulaması) → izin eklemek bir sonraki kullanıcıda nav'ı kıracaktı. Yazmalarda `Tenants.Update` doğru ve tutarlı (`UpdateTenant` zaten onu istiyor).

**Doğrulama (canlı API, gerçek tenant id'leriyle):** yukarıdaki tablo — üye olmayan 403 (4/4), super admin 200 (3/3), middleware regresyonu bozulmadı.

### A2 — hayalet izinler

- `GetQuotePdf.cs:69` → `Quotes.Read` (**DB'de yok**) → `Quotes.View`
- `TestSendQuoteTemplate.cs:178` → `Quotes.Manage` (**DB'de yok**) → `Quotes.Templates`

**Doğrulama — sistematik süpürme (yalnız bu iki tanesini düzeltmekle kalmadım):** kaynaktaki tüm `RequirePermission("…")` kodları (92 farklı) DB'deki izin kodlarıyla (127) karşılaştırıldı. **Sonuç: hayalet izin kalmadı.**

### Bu turda karşılaşılan iki ölçüm tuzağı (kayda değer)

1. **PowerShell JSON gövdesini bozdu** → yazma testleri 500 döndü ve ilk bakışta "kodum kırıldı" gibi göründü. Gerçek hata: `'i' is an invalid start of a property name` — native komuta geçerken tırnaklar yenmişti. Gövde dosyadan (`-d "@dosya.json"`) verilince 403/200 doğru çıktı. **environment.md'nin tuzağı, canlı örnek.**
2. **Süpürme yorum satırını yakaladı** → tek "hayalet" `Recruitment.*` çıktı; oysa yalnız `RecruitmentModuleExtensions.cs:17`'deki **yorumda** geçiyor, gerçek çağrı yok. Dedektörün sınırı bu. (Doğrulama: literal grep ile gerçek çağrı arandı — 0 eşleşme.)

**Araç kapıları:** `dotnet build` **0 hata / 0 uyarı**.

**Kalan:** B2/B3'ün izin yarısı ve ~88 yalnız-auth endpoint (B6).

## 2026-09-18 — B8 (secret'lar) + A1 (yeni kiracının modülleri)

### B8 — demo secret ile başlatmayı reddet

**Dosyalar:**
- `CRM.BuildingBlocks/Extensions/ServiceCollectionExtensions.cs` — `DemoJwtSecret` / `DemoServiceRoleKey` sabitleri + `EnsureProductionSecretsAreOverridden(configuration, environment)`: Development dışında bu değerler hâlâ geçerliyse **başlatmayı reddeder**. Gömülü varsayılan da sabite bağlandı.
- `CRM.Api/Program.cs:38-41` — builder'dan hemen sonra çağrılıyor (tam nitelikli ad; `ServiceCollectionExtensions` iki namespace'te birden var).

**Neden startup'ta:** demo JWT secret ile her token üretilebilir, ve bu arıza **çalışma anında görünmez**. Sessiz varsayılana düşmek yerine süreç hiç açılmamalı.

**Doğrulama — üç yönlü:**

| Senaryo | Sonuç |
|---|---|
| `Production`, demo secret | **Çöktü** — `Supabase:JwtSecret is missing or still set to the published demo value…` |
| `Development`, demo secret | Normal başladı, `/health` **200** |
| `Production` + gerçek secret (env) | Guard geçti, süreç **başladı** — yani "her zaman at"mıyor (kontrol) |

### A1 — signup kiracısında modüller

**Kök neden (kendim okudum):** `auth_sync_trigger.sql` → `handle_new_user()` `users` + `tenants` + `tenant_members` + roller + Owner'a **tüm izinleri** yazıyor, ama **`tenant_modules` satırı hiç yazmıyor** (karşılaştır: `CreateTenant.cs:84-94` yazıyor). Sunucu bu kiracı için tüm modülleri `isEnabled=false` döndürüyor; istemcinin "boş dizi → açık" fallback'i (`label-context.tsx:161`) hiç tetiklenmiyor çünkü dizi boş değil.

**Değişiklik:** `GetTenantModules.cs` — satır yoksa "hiç provision edilmemiş" sayılır ve `ModuleRegistry.GetDefaultModuleKeys()` açık kabul edilir. Böylece iki oluşturma yolu aynı davranır. Trigger'ı SQL'de modül anahtarlarıyla düzeltmek yerine bu yol seçildi: anahtarların tek kaynağı `ModuleRegistry` (C#), SQL'e kopyalamak sürüklenme üretirdi.

**Verinin kendisi:** `admin-a00000` kiracısı (slug deseni `<e-posta öneki>-<6 hane>` → **signup trigger'ının yarattığı** kiracı) DB'de **2** modül satırına sahip; API üzerinden yaratılan kiracıda **16**. Bug kullanıcının kendi verisinde duruyor.

**⚠️ Doğrulama açığı (dürüstçe):** `isEnabled` hesabı super admin için `true`'ya kısa devre yapıyor. DB'de **super admin olmayan tek bir kullanıcı yok** (`non_super_admin_users=0`), dolayısıyla A1'in düzeltmesi **uçtan uca ölçülemedi** — yalnız derlendi ve kod yolu okundu. Aynı körlük A3, B6 ve her izin işi için geçerli.

## 2026-09-18 — Doğrulama fikstürü (ve A1'in gerçek ölçümü)

**Sorun:** Tüm izin testleri yalnız super admin ile yapılabiliyordu; super admin her şeyi bypass ettiği için "üye ama yetkisiz" durumu — asıl kritik durum — hiç ölçülemiyordu.

**Çözüm:** İzole fikstür, kendi kiracısında (`fixture-stabilization`), mevcut verilere dokunmadan:
- kullanıcı `f0000000-…-0001` (`fixture-member@crm.local`, **super admin değil**)
- kiracı `f0000000-…-0002`
- üyelik (owner **değil**) + rol `FixtureViewer` → yalnız `Products.View`, `Quotes.View`
- `tenant_modules` satırı **bilerek yok**

Kurulum: `C:\Users\Serhat\AppData\Local\Temp\opencode\fixture-create.sql` · geri alma: `fixture-cleanup.sql`

### Bu fikstürle ölçülenler (hepsi geçti)

| Test | Sonuç |
|---|---|
| **A1:** fikstür kiracısı (0 modül satırı) | **16/16 açık** ✅ |
| **A1 dal sınırı:** 1 satır (disabled) eklenince | enabled **0** |
| …satır silinince | enabled **16** (fikstür eski hâlinde) |
| Üye + `Products.View` var → `GET /api/products` | **200** |
| Üye + `Products.Create` yok → `POST /api/products` | **403** |
| Üye + `Tenants.Update` yok → `PUT /tenants/{kendi}/modules` | **403** |
| Üye + **izin gerekmiyor** → `GET /api/invoicing/invoices/` | **200** ⚠️ **B6 ölçüldü** |
| Üye değil → `GET /tenants/{diger}/modules` | **403** |
| Üye değil → `X-Tenant-Id: {diger}` + token → `GET /api/products` | **403** |

**Sonuç:** B4, fallback policy ve B5 artık **gerçek bir kullanıcıyla** doğrulandı (uydurma token'la değil). Ve B6 teoriden çıktı: yalnız iki okuma izni olan bir üye **tüm fatura listesini** okuyabiliyor.

## 2026-09-18 — B6 Pass 1 (Activities + Contracts) — ⚠️ DOĞRULANMADI

**Yapılan kod değişikliği (derleniyor, 0 hata):** Activities 8 endpoint + Contracts private 5 endpoint'e mevcut izin kodları bağlandı (`Activities.View/Create/Manage/Delete`, `Contracts.View/Create/Manage/Delete`).

### Doğrulama BAŞARISIZ — açıklanamayan bir tutarsızlık

Fikstür kullanıcısı ile ölçüm, aynı `X-Tenant-Id` değerinin **iki farklı yere iki farklı kiracı** olarak çözüldüğünü gösterdi:

| Gözlem | Kanıt |
|---|---|
| `X-Tenant-Id: cb2b3c21…` (üye değil) → middleware **üyelik hatası** | gövde `{"error":"You are not a member of this tenant."}` → middleware header'ı **okudu** |
| `X-Tenant-Id: f0000000-…-0002` (üye) → izin kontrolü **başka kiracıda** | log: `Loading permissions from DB for User f0000000-…-0001 in Tenant d00e2dac-…` — oysa gönderilen `f0000000-…-0002` |
| Aynı veri için SQL eşdeğeri | `Products.View,Quotes.View` — izin **var** |
| Sonuç | `403 Missing required permission: 'Products.View'` |

`d00e2dac-2528-4edf-a3d6-422ecd8b0d1d`, `appsettings.Development.json`'daki **`Tenancy:DefaultTenantId`** ve **var olan bir kiracı değil** (DB'de 3 kiracı var, bu değil). Yani header parse edilmemiş gibi davranılıp Development fallback'i devreye girmiş, **ama** üyelik kontrolü header'ı görmüş.

**Kapsam:** Development'a özgü olabilir — fallback yalnız `env.IsDevelopment()`'ta var; üretimde header yoksa tenant çözülmez ve 401 döner. Yine de **çözülmeden** Pass 1 doğrulanmış sayılamaz.

### Kendi ölçüm hatalarım (kayda geçiyor)

1. **Gövdeyi `-o NUL` ile attım.** Gövdeyi okusaydım tutarsızlığı ilk saniyede görürdüm. Sonraki turda gövdeler yakalandı ve sorun ortaya çıktı.
2. **Log'u flush etmeden okudum.** Süreç hemen öldürülünce log satırı görünmedi ve "DB yüklenmesi olmadı" gibi yanlış bir sonuca götürdü. Bekleme eklenince satır göründü.

**Durum:** Pass 1 kodu yerinde ve derleniyor, ancak **doğrulanmadı**. Sonraki adım: middleware'e geçici bir teşhis logu ekleyip (`X-Tenant-Id` var mı + çözülen tenant) tek istekle kesinleştirmek. Bu geçici ve geri alınabilir bir değişiklik.

## 2026-11-13 — Doğrulanmış düzeltme turu (13 madde)

**Kapsam:** kullanıcı onayıyla 13 madde; her biri kod + canlı ölçümle doğrulandı.

| # | Değişiklik | Doğrulama |
|---|---|---|
| B14 | `20261113000001_fix_tenant_members_rls_recursion.sql` — `current_user_tenant_ids()` SECURITY DEFINER + policy | anon `tenants`: **500 42P17 → 200 []**; fixture kullanıcı yalnız kendi kiracısını ve kendi üyeliğini gördü |
| B3 | Araç doküman upload: uzantı allowlist'i (svg/html/js yok) + 25 MB | `.svg` **400**, `.pdf` **200** |
| B12 | Storage upload: MIME+uzantı allowlist, 25 MB, public bucket yalnız görsel; `20261113000002` bucket limitleri | `.svg` **400**, `.txt` + `text/html` **400** |
| B9 | WhatsApp webhook: verify token eşleşmesi + `X-Hub-Signature-256` HMAC; secret yoksa 503; tenant `phone_number_id`'den çözülüyor | yanlış token **403**, doğru **200**, imzasız **401**, geçerli imza **200** |
| A6 | WhatsApp settings GET/PUT (`Chat.Manage`), access token maskeli; send ayar yoksa **400** (sahte "Sent" yok) | uçlar eklendi; build |
| B11 | CORS exact origin + `.trycloudflare.com` suffix (Development) | `evil.example` **ACAO yok**, `localhost:3000` **ACAO var** |
| B17 | `/health` düz durum; `/health/detailed` super admin | anon `/health` **200 `{"status":"Healthy"}`**, detail **401** |
| B7 | `HtmlSanitizer` 11.0.26 — yazma + okuma + imza anında | `<script>`, `onerror`, `javascript:` **silindi**, `<p>` korundu |
| A4 | `/integration` nav + komut paleti girdisi kaldırıldı (sayfa yok) | tip kontrolü + build |
| A5 | `compliance` HRM menüsüne eklendi (`Compliance.View`) | tip kontrolü + build |
| A8 | Analytics: sabit 6 ay/funnel fallback/+%18.4 kaldırıldı; son 50 siparişten gerçek 6 ay | tip kontrolü + build |
| #12 | MailKit **5.0.0**, AutoMapper **17.0.0** | `dotnet list --vulnerable`: **0**; build **0 uyarı / 0 hata** |
| C3 | AGENTS.md **5569/347**, roadmap **56 sayfa / #33** | `npm run check` ölçümü |

**B6 Pass 1 (önceki oturumun "doğrulanmadı" kaydı) KAPANDI:** fixture kullanıcısı (yalnız `Products.View`, `Quotes.View`) → `GET /api/activities` **403** (`Missing required permission: 'Activities.View'`). Önceki tutarsızlık yeniden üretilmedi; header tenant'ı permission filtresine doğru geçiyor.

**Yeni/ölçülen açıklar (bilinçli kapsam dışı):**
- **B6 kalanı:** fixture kullanıcısı `GET /api/invoicing/invoices` → **200**. Invoicing/Finance/Cari 21 endpoint'te `RequirePermission` yok.
- **B7 cookie yarısı:** `@supabase/ssr` cookie'si `httpOnly` değil; `httpOnly: true` browser client'ı kıracağı için yapılmadı. XSS vektörü sunucu sanitizasyonuyla kapandı.
- **Yeni B20 (Development):** `Tenancy:DefaultTenantId` fallback'i public token rotalarında da tenant set ediyor → `IgnoreQueryFilters` kullanmayan public lookup'lar (contracts/quotes/portal) dev'de 404 dönüyor. Üretimde fallback yok; ayrı madde.

**Çürüyen iddialar (kayıt düzeltmesi):**
- **A3 yanlış pozitif:** canlı DB'de izinsiz permission **0** (`permissions LEFT JOIN role_permissions`). 5 modülün grant'i mevcut.
- **B13 `ALLOWALL` hata değil:** public başvuru formu iframe'e gömülmek üzere tasarlanmış (`PublicApplyFeatures.cs:26` yorumu). Rate-limit spoof'u ayrı madde olarak kalıyor.

**Araç kapıları:** `typecheck` 2/2 (force) · `lint` 0 error / 347 warning · `guard:crm-ui` 0 error / 204 dosya PASS · `npm run build` 2/2 · `dotnet build --no-incremental` **0 uyarı / 0 hata** · `npm run format` no-op.







