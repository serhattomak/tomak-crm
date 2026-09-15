# CRM UI — Tek Design System Yol Haritası

> **Durum:** Aktif program
> **Karar kaydı:** [`ADR-0004`](adr/0004-crm-design-system-enforcement.md) · **Kanonik standart:** [`crm-ui-standards.md`](crm-ui-standards.md)
> **Kapsam:** `crm-monorepo/apps/web` içindeki **52 sayfa**, 3 layout, auth/admin/portal yüzeyleri, tüm state'ler ve modallar.

Bu dosya **yaşayan bir kontrol listesidir**. Bir faz tamamlandığında kutulanır; ertelenen işler "Gelecek Adımlar" bölümünde kalır.

---

## Ölçülen Taban (2026-09-15, Faz 0 sonrası)

Sayılar `guard:crm-ui:full` çıktısındandır — tahmin değil. Her faz, ilgili sayıyı düşürmelidir.

**176 dosya · 1458 error · 1334 advisory warning**

| Metrik | Taban | Hedef |
| --- | --- | --- |
| `VIOLET` (error) | **924** | 0 |
| `SLATE` (error) | **415** | 0 |
| `NATIVE_SELECT` (error) | **61** | 0 |
| `FUCHSIA` (error) | **43** | 0 |
| `INLINE_HEX_STYLE` (error) | **6** | 0 |
| `ARBITRARY_HEX` (error) | **4** | 0 |
| `SVG_PAINT_HEX` (error) | 4 (allowlist) | 4 (docs: Google marka) |
| `INPUT_NUMBER` (error) | **1** | 0 |
| `ARBITRARY_TEXT_SIZE` (warn) | **1242** | 0 → sonra `error` |
| `NATIVE_TABLE` (warn) | **61** | 0 → sonra `error` |
| `INLINE_STYLE_PROP` (warn) | **31** | 0 → sonra `error` |
| Elle yazılmış `fixed inset-0` overlay | 156 | ~0 (allowlist dışı) |
| Elle yazılmış `*Modal` / `*Drawer` bileşeni | ~60 | ~0 |
| `packages/ui` primitif sayısı | 21 | 33+ |
| CI workflow | yok | 1 |

En çok ihlal veren dosyalar: `vehicles/page.tsx` (191), `portal/[token]/PortalClient.tsx` (114), `projects/[projectId]/page.tsx` (102), `recruitment/page.tsx` (75), `promotions/page.tsx` (69), `messages/page.tsx` (67).

> **Not:** `VIOLET` 924 ve `ARBITRARY_TEXT_SIZE` 1242 — işin ağırlığı burada. Renk tarafı tahmin edilenden **büyük**, keyfi tipografi ise tek başına en büyük tekil kalem.

---

# Program A — Tek Design System (Faz 0 → 7)

Her faz; **faz sonu özet + onay** ile ilerler. Her faz ayrı commit'tir (`crm-monorepo` / `master`).

**Faz kabul kriteri (hepsi):** `npm exec -- ultracite fix` → `tsc --noEmit` → `next build` → `guard:crm-ui:full` (faz kapsamında **0 error**) → etkilenen kritik akışların elle duman testi. **Fail = STOP.** Auto-fix / bulk-sed yok.

---

## [x] Faz 0 — Zemin (doküman + token + guard severity katmanı) — **TAMAMLANDI**

**Kabul kriteri: typecheck + build geçer, hiçbir ekran görsel olarak değişmez.**

- [x] `docs/design-system.md` (440 satır) → [`crm-ui-standards.md`](crm-ui-standards.md)'ye yönlendiren redirect stub (silme yok, dış bağlantılar korunur)
- [x] Kökteki `design.md` (203 satır) → aynı şekilde redirect stub
- [x] `crm-ui-standards.md` güncellenir: §1.3 tipografi ölçeği (`text-2xs`/`text-3xs`, 9px kaldırıldı), §1.4 bağlayıcı kısıtlar, §2 primitif genişleme notu + "packages/ui kazanır", **§2.1 Kanonik Sayfa Kabuğu**, ADR-0004 referansı
- [x] `crm-ui-guard.mjs`: **`severity` katmanı** eklendi (`error` varsayılan → mevcut 9 kural etkilenmedi; hata sayısı 1458'de sabit kaldı)
- [x] `crm-ui-guard.mjs`: 3 yeni kural `warn` olarak eklendi — `ARBITRARY_TEXT_SIZE` (1242), `NATIVE_TABLE` (61), `INLINE_STYLE_PROP` (31)
- [x] `crm-ui-guard.README.md`: severity tablosu, ölçülen taban, rules→fix map, `apps/ecommerce` hayalet notu
- [x] `guard:crm-ui:full` ihlal sayıları ölçülüp yukarıdaki tabloya işlendi
- [x] Fixture'lar doğrulandı: `dirty.tsx` exit 1 · `clean.tsx` exit 0 · scoped kapı **PASS**
- [x] `globals.css`: **tipografi token'ları** — `--text-2xs` (11px) + `--text-3xs` (10px), Tailwind'in `--text-*--line-height` deseniyle
- [x] `globals.css`: **motion token'ları** — `--ease-crm` + `--ease-crm-in-out`. Duration token değil, **değer** olarak standartlaştırıldı (§1.5)
- [x] `crm-ui-standards.md` §1.5 Motion eklendi (easing token'ları + duration değerleri + `prefers-reduced-motion` zorunluluğu)
- [x] `tsc --noEmit` + `next build` doğrulaması geçti (typecheck 2/2, build 2/2, 52 rota)
- [x] **Kalan 12 sayfa (grup F)** — `attendance`, `automations`, `automations/[workflowId]`, `compliance`, `products/[productId]`, `promotions`, `promotions/[campaignId]/edit`, `quotes`, `tickets`, `tickets/[ticketId]`, `webhooks`, `webhooks/[endpointId]`
- [x] **Son 3 sayfa** — `orders/[orderId]`, `projects/[projectId]`, `admin/tenants/[tenantId]`
- [x] **Muafiyetler belgelendi** — `orders/[orderId]/print` + 7 bağımsız tam-ekran yüzey (standart §2.2)

**Sonuç: 44 sayfa `PageContainer` kullanıyor · 8 belgelenmiş muafiyet · 44+8 = 52 ✅**

**Kabul:** typecheck 2/2 · build 2/2 · `guard:crm-ui` scoped **PASS** · her dosyada açılış/kapanış dengesi OK · 44 sayfada `PageContainer` doğrulandı (grep).

> **✅ Çözülen sapma 1 — `--duration-*` yerine duration değerleri.** Tailwind **4.3.3**'te `--duration-*` theme namespace'i yok (kanıtlandı: dist içinde hiç geçmiyor). Ölü token yazmak yerine easing'ler token'landı (`--ease-crm`), duration'lar standartta **değer** olarak sabitlendi (`duration-150` / `200` / `250`). ADR-0004 §5 bu gerçeğe göre düzeltildi.
>
> **✅ Çözülen sapma 2 — `SCOPE` listesi Faz 7'ye taşındı.** Ölçüm: scoped kapı 0 hata / 18 dosya → **PASS**, `--full` 1458 hata → FAIL. `SCOPE` Faz 0'da kaldırılsaydı varsayılan mod `--full` olur ve **Program A boyunca hiç regresyon kapısı kalmazdı**. ADR-0004 §9 bu düzeltmeyle güncellendi.
>
> **✅ Çözülen sapma 3 — kök dizin sürüm kontrolüne alındı.** `D:\serhatdev\crm` bir git deposu **değildi**; yani bu yol haritası, ADR-0004 ve kanonik standart sürüm kontrolsüzdü (geri alma/geçmiş yok). Faz 0'da kökte `git init` yapıldı, `crm-monorepo/` `.gitignore`'a alındı. Ayrıntı: ADR-0004 §11.


## [x] Faz 1 — Eksik primitif katmanı — **TAMAMLANDI**

`shadcn` CLI (stil `radix-luma`) ile eklendi, ardından house stiline uyarlandı. **21 → 32 primitif.**

- [x] `dialog` (155 satır) — ~60 modalın ve 156 overlay'in yerini alacak
- [x] `alert-dialog` (184 satır) — yıkıcı/önemli onaylar
- [x] `sheet` (134 satır) — drawer / yan panel
- [x] `dropdown-menu` (251 satır)
- [x] `popover` (79 satır)
- [x] `switch` (29 satır)
- [x] `radio-group` (39 satır)
- [x] `progress` (27 satır)
- [x] `separator` (24 satır)
- [x] `scroll-area` (50 satır)
- [x] `alert` (69 satır) — CLI'dan alındı (CVA-only, Base UI yok); elle yazmaya gerek kalmadı
- [ ] `confirm-dialog`'ın `AlertDialog` temeline taşınması + `rounded-3xl` → `rounded-xl` normalizasyonu → **Faz 3'e taşındı**
- [ ] `tooltip` tüketicileri standarda bağlanır → **Faz 3'e taşındı** (tüketici işi)

**Kabul kriteri — hepsi geçti:** typecheck 2/2 · build 2/2 (52 rota) · `guard:crm-ui` 0 error → PASS · `apps/web`'de 11 yeni primitifin **tüketicisi 0** · primitif sayısı 32 · `rounded-4xl` 0 · `from "cn"` 0.

> **⚠️ Faz 1 bulgusu 1 — CLI `button.tsx`'i ezmek istedi.** `dialog`/`alert-dialog`/`sheet` bağımlılık olarak `button` çekiyor ve CLI onu registry sürümüyle değiştirmeyi teklif etti. Registry sürümü `rounded-lg` yerine **`rounded-4xl`** kullanıyor — §1.1'in yasakladığı hap form. Onaylansaydı **52 ekrandaki tüm butonlar** bozulurdu. Teklif reddedildi; zincir tıkanınca dosya geçici kenara alınıp CLI çalıştırıldı, sonra `git checkout` ile geri alındı. **`git diff` boş → `button.tsx` içerik olarak değişmedi** (hash farkı yalnızca CRLF).
>
> **⚠️ Faz 1 bulgusu 2 — CLI yanlış npm bağımlılığı kurdu.** Üretilen 11 dosyada `import { cn } from "cn"` yazdı ve `packages/ui/package.json`'a **`cn@^0.3.0`** ekledi. 8 dosyada import `@workspace/ui/lib/utils`'e düzeltildi; bağımlılık kaldırıldı, `npm install` ile lock senkronlandı → `package.json` ve `package-lock.json` **HEAD ile birebir aynı**. Aksi halde 8 bileşen bir, 21 bileşen başka kütüphane kullanacaktı.
>
> **ℹ️ Faz 1 bulgusu 3 — `confirm-dialog.tsx` standart dışı:** paneli `rounded-3xl`. §1.1 konteynerler için `rounded-lg`/`rounded-xl` diyor. Yeni paneller **standarta göre** `rounded-xl` yapıldı (legacy kod değil, standart otorite — ADR-0004 §3). `ConfirmDialog` normalizasyonu Faz 3'e taşındı.
>
> **✅ Temiz çıkanlar:** dekoratif gradient/blur/hex/keyfi shadow **yok**; `blur` kullanımları yalnızca `supports-backdrop-filter:backdrop-blur-sm` (fonksiyonel backdrop, yasaklı dekoratif küre değil). Radius'lar house dağılımı içinde (`rounded-2xl` 9×, `rounded-3xl` 1× zaten mevcut).
>
> **📌 Prosedür kalıcılaştırıldı:** `crm-ui-standards.md` **§2.1 Primitif Ekleme Prosedürü** — doğru CLI komutu + iki tuzak + her yeni primitif için uyarlama kontrol listesi.

**Not:** Tüm yeni primitifler `--radius` tabanlı yuvarlaklık, semantic token ve motion tokenlı giriş/çıkış kullanır. `accordion` ve `calendar` **eklenmedi** (gerçek tüketici yok — Gelecek Adımlar'da).

## [x] Faz 2 — Kanonik sayfa kabuğu (52 ekran) — **TAMAMLANDI (44 sarıldı + 8 muafiyet)**

- [x] **`page-container.tsx`** — `px-4 py-5` / `md:px-6 md:py-6`, tam genişlik, `bleed` varyantı (full-bleed yüzeyler için)
- [x] **`page-header.tsx`** — `title` / `description` / `badge` / `actions` slotları
- [x] **Dashboard layout** — padding kaldırıldı (`p-3.5 pb-24 sm:p-5 md:p-6` → `pb-24 md:pb-0`); mobil bottom-nav payı korundu
- [x] **Admin layout** — padding + `mx-auto max-w-7xl` kaldırıldı (tam genişlik kararı)
- [x] **Yanlış Hallmark başlıkları düzeltildi** (dokunulan dosyalarda) — `design.md` referansı ve `theme: Zinc/Violet` iddiası kaldırıldı
- [x] Sarmalanan 10 sayfa:
  - `customers` (pilot — `PageHeader`'a da geçirildi, `text-[11px]` → **`text-2xs`** token'ı ilk kez kullanıldı)
  - `analytics` (legacy çift-padding kanıtı: `space-y-6 p-4 sm:p-6 lg:p-8` → `PageContainer`, sayfa kendi padding'ini bıraktı)
  - `field-service`, `roles`, `users`, `pipelines`, `orders`, `leaves`, `(admin)/admin/templates`, `(admin)/admin/tenants`
- [ ] Kalan **42 sayfa**

### ✅ Yan doğrulama: tipografi token'ı işlevsel

`text-2xs` üretilen CSS'te doğrulandı — Faz 0 token'ının gerçekten çalıştığının kanıtı:
```css
.text-2xs{font-size:.6875rem;line-height:var(--tw-leading,1rem)}   /* 11px */
```
Bu, `ARBITRARY_TEXT_SIZE`'ın ileride `error`'a terfi edebileceğini gösterir (kural artık uygulanabilir bir alternatife sahip).

### ⚠️ Teknik not — kapanış etiketi "son eşleşme" ile bulunamaz

Faz 2'de bu tuzağa **fiilen düşüldü** ve typecheck yakaladı (`TS17002`, 2 dosya). Kök neden: sayfa dosyaları **tek dosyada birden fazla component** barındırıyor (`leaves/page.tsx` → `LeavesPage` + `CreateLeaveModal`; `orders/page.tsx` → `OrdersPage` + `CreateOrderWizardModal`). Her ikisi de aynı girinti seviyesinde.

Sezgisel bir dönüşüm "dosyadaki son `</div>` + `);` + `}`"i ararsa **ikinci component'i** yakalar ve sayfa kökü kapanmadan kalır. `div` sayımı dengeli görünür (1 aç / 1 kapa) çünkü hata *sayıda* değil *kapsamda*dır.

**Kural:** kapanış etiketi **yapısal** olarak bulunur — sayfa component'inin `return (` bloğunun gerçek sonu, yani bir sonraki `function <Ad>(` satırından hemen önceki `);` + `}` bloğu. **Her batch'ten sonra `tsc` zorunludur**; hata bu sayede commit'ten önce yakalandı.

### ⚠️ Teknik not 2 — kök eleman yüzeyde göründüğü gibi değil

Kategori A'nın "en mekanik" sayfası bile varsayımı kırdı: `customers/[customerId]/page.tsx`'te **ilk `<div className="space-y-6">` sayfanın kökü değil**, `if (loading)` dalının skeleton sarmalayıcısı. Gerçek kök 249. satırda. Bu sayfa **iki dönüş noktası** taşıyor ve **ikisi de** sarmalandı — aksi halde yükleme durumu farklı boşlukta görünürdü.

Ders: kök eleman, component'in `return (` bloğuna *yapısal olarak* bağlıdır ve sayfa başına doğrulanmalıdır. Bu yüzden toplu script bu iş için emekliye ayrıldı; sayfalar kanıtlanmış satır numaralarıyla elle sarmalanıyor.

### ⚠️ Teknik not 3 — repo dosyaları PowerShell ile yeniden yazılmaz

Faz 2'de bu tuzağa **fiilen düşüldü**: `docs/crm-ui-roadmap.md`'yi tek bir başlık güncellemesi için `Get-Content -Raw … -replace … | Set-Content -Encoding UTF8` ile yeniden yazmak dosyayı **çift kodladı** — 831 mojibake izi (`—` → `â€"`, `katmanı` → `katmanÄ±`). Windows PowerShell 5.1'de `Get-Content` UTF-8'i ANSI (cp1252) olarak okur; `Set-Content -Encoding UTF8` bu bozuk metni yeniden UTF-8'e kodlar.

**Kural:** repo dosyaları **yalnızca** `edit`/`write` araçlarıyla değiştirilir (UTF-8 güvenli). Toplu yeniden yazma gerekiyorsa **Node script'i** kullanılır — PowerShell'in dosya yazma cmdlet'leriyle asla. Düzeltme `git checkout <son-sağlam-commit> -- <dosya>` ile yapılır; **geçmiş gizlenmez** (reset yok), hata ve düzeltmesi kayıtta kalır.

### ⚠️ Teknik not 4 — eski padding sahibi EN SON emekliye ayrılmalıydı

Faz 2'nin ilk commit'inde layout'un padding'i kaldırıldı, ama sayfaların çoğu henüz `PageContainer` kullanmıyordu. Sonuç: kendi padding'i **olmayan** sayfalar bir süre **sıfır boşlukla** render edildi.

Ölçüm önemliydi: etkilenen **2 sayfa** (`email`, `products`) — çünkü kategori B'deki legacy sayfaların kendi padding'i vardı, layout'unki kalkınca **doğru** hale geldiler. Bu batch'te `email` ve `products` önce sarılarak pencere kapatıldı.

**Kural:** bir mekanizmanın sahibi değiştirilirken eskisi **en son** emekliye ayrılır — tıpkı guard'ın `SCOPE` listesinin, `--full` temizlenene kadar emekliye ayrılmaması gibi (ADR-0004 §9). Sıralama yanlış kurulursa aradaki durum bozuk olur.

### Faz 2 sayfa haritası (kalan 23)

| Kategori | Sayfalar | Not |
| --- | --- | --- |
| ✅ **A. `space-y-*` kökü — TAMAMLANDI** | `customers/[customerId]`, `shipments`, `payroll`, `projects`, `vehicles`, `[tenantSlug]/page`, `(admin)/admin/page` | Beklenenden zor: kök eleman sayfa başına doğrulanmalı (Teknik not 2) |
| ✅ **B. Legacy çift-padding / max-width — TAMAMLANDI** | `inventory`, `contracts`, `settings`, `promotions/new` | Çift padding kaldırıldı; form ekranlarının `max-width`'i **istisna olarak korundu** (§2.2) |
| ✅ **C. Sayfa-seviyesi kart sarmalayıcı — TAMAMLANDI (kategori düzeltmesiyle)** | `finance`, `invoices` | **Yanlış sınıflandırılmıştı:** kökleri kart değil, `space-y-6 p-4 sm:p-6 lg:p-8` (analytics deseni). `Card` dönüşümü gerekmedi |
| ✅ **D. Full-bleed — KISMEN TAMAM** | ✅ `messages`, `calendar` (`bleed`) · ⛔ `orders/[orderId]/print` (**muaf** — `@media print` padding'i sıfırlıyor) · ⬜ 7 bağımsız tam-ekran yüzey: `(auth)/login`, `(auth)/register`, `portal/[token]`, `quotes/view/[token]`, `/pipelines`, `/quotes`, `/` | Bağımsız yüzeyler `PageContainer` kullanmaz (layout'ları yok, `min-h-screen` merkezlemeleri kendi) — ortaklık token/primitif düzeyinde |
| ✅ **E. `Suspense` sarmalayıcı — TAMAMLANDI** | `organization`, `recruitment` | İnce sarmalayıcı: kabuk `*PageContent` component'ine verildi, `Suspense` çerçevesine değil |
| **F. İncelenmesi gereken** | `attendance`, `email` ✅, `automations`, `automations/[workflowId]`, `products` ✅, `products/[productId]`, `promotions`, `promotions/[campaignId]/edit`, `quotes`, `tickets`, `tickets/[ticketId]`, `webhooks`, `webhooks/[endpointId]`, `compliance` | İlk `return` iç fonksiyona ait çıktı → elle bakılacak |

**Sıra:** A → B → C → D → E → F. Her yüzey (dashboard / admin / auth / portal) bitince typecheck + build + duman testi; her batch ayrı commit.

### 📌 Kalıcı borç: 391 dosyada Hallmark imzası

Kod tabanında **391 dosya** `Hallmark · theme: Adaptive Zinc/Violet · design-system: design.md` başlığı taşıyor. Dokunulan dosyalarda düzeltiliyor; kalanı mekanik bir temizlik işi olarak Gelecek Adımlar'a eklendi.

## [~] Faz 3 — Modal & overlay göçü — **DEVAM EDİYOR (22/75)**

> **🔄 Devam noktası (yeni oturum buradan başlasın):**
> 1. ✅ `Sheet` deseni kuruldu — `whatsapp-chat-drawer` (`491cb07`). Notlar §2.3'te. **⚠️ Bu commit'in genişlik ezmesi hatalıydı → `7f639f0` ile düzeltildi** (bkz. bulgu 5).
> 2. ✅ `components/email` **tamamlandı** (6 dosya): `compose-modal` (`26bdf0b`), `convert-to-ticket-modal` (`1508fdc`), `convert-to-lead-modal` (`42e05f5`), `template-modal` (`4700991`), `email-account-modal` (`06af922`), `email-thread-drawer` → `Sheet` (`c226549`).
> 3. ✅ `components/` kök **tamamlandı** (8 dosya): `shortcuts-help-modal` (`b2d2b84`), `quick-add-sales-rep-modal` (`a7b9d02`), `entity-picker-modal` (`7f55787`), `team-members-stack` invite modalı (`65b1feb`), `command-palette` (`ce72250`) → `Dialog`; `tenant-switcher` (`8797590`), `dashboard-share-popover` (`90316df`), `notification-center` (`b9ec6fa`) → **`Popover`**. Öncesinde primitif düzeltmesi `db8cf6e`.
> 4. Sıradaki grup — `widgets` (3), `promotions/components` (2), `pipelines/_components` (2), `components/quotes` (2), `components/products` (2), `components/portal` (1), `components/layout/mobile-nav` (1), `portal/PortalClient` (1).
>    **+ `team-members-stack.tsx`'in ertelemeli popover'ı (satır 263, `fixed inset-x-3 top-14 … sm:absolute sm:right-0 sm:w-96`)** — dosyanın modal yarısı `65b1feb`'de yapıldı, popover yarısı §2.4'e göre ayrı geçiş bekliyor. Ölçüm: `components/` kökünde kalan tek gerçek overlay izi bu.
>
> **Tarif:** standart **§2.3** (Dialog + Sheet: 7 adım, iki backdrop biçimi, boyut aktarımı, varyant önekli ezme) **+ §2.4** (Popover/DropdownMenu alt-deseni). **Kabul kriteri:** `fixed inset-0` / `backdrop-blur` / `shadow-2xl` → 0, `tsc` + `build` yeşil, batch başına commit.
>
> **⚠️ Bu fazda üç tuzak ölçülerek doğrulandı — standarta yazıldı:**
> 1. **Taban `max-width`'i koşulsuz ezmeyin** (`w-full max-w-2xl` ❌) — primitifin `max-w-[calc(100%-2rem)]` değeri silinen `p-4`'ün mobil kenar payını üretiyordu. Doğru: `w-full sm:max-w-2xl`. → §2.3
> 2. **Varyant önekli varsayılanı öneksiz ezmeyin** — `data-[side=right]:w-3/4` + `w-full` → ikisi de çıktıda kalır, CSS özgüllüğü primitifi kazandırır. Doğru: `data-[side=right]:w-full`. → §2.3
> 3. **`Popover` çapaya göre konumlanır** — mobildeki `fixed inset-x-3 top-14` "başlık altı tam genişlik" deseni birebir üretilemez; `align="end"` + `w-[calc(100vw-1.5rem)]` + `collisionPadding={12}` ile yaklaşılır. → §2.4
>
> **⚠️ `apps/web`'te `prettier --write` ÇALIŞTIRMAYIN.** Kökteki `.prettierrc` `"semi": false` diyor, ama `apps/web` noktalı virgüllü yazılmış; `prettier --check` **dokunulmamış** dosyalarda da FAIL veriyor. Tek dosyada 55 satırlık değişikliği **431 satıra** çıkarır. Biçim, çevre dosyanın stiline elle uyarlanır. Ayrıntı: Gelecek Adımlar #18.
>
> **⚠️ Kapsam disiplini hatırlatması:** `bulk-action-bar` overlay **değil** (backdrop/kapatma/focus yok, sayfayı engellemiyor) → §2.3/§2.4 dışı. Gerekçe §2.4'te.
>
> **⚠️ Elle duman testi bekleyen iki nokta (typecheck bunları kanıtlayamaz):**
> 1. `tenant-switcher` mobil navigasyon drawer'ının **içinde** ve popover artık `z-[70]` yerine primitifin `z-50`'siyle body'ye portallanıyor. Eşit z-index'in DOM sırasıyla çözülmesi bekleniyor (portal drawer'dan sonra ekleniyor) — gözle doğrulanmalı.
> 2. İki panelin mobil genişliği artık çapaya bağlı; tetikleyici başlıkta olduğu sürece eski konuma düşer.

**Gerçek iş birimi 75 modal component'i** (`fixed inset-0` sayısı 156 ama şişik: her modal konteyner + backdrop diye iki overlay üretiyor). Dağılım: 108 orta-dialog, 17 sağ-sheet, 1 üst-dialog, ~22 backdrop div'i, 62 `*Modal`, 11 `*Drawer`.

**Migrasyon tarifi:** `crm-ui-standards.md` **§2.3** (Dialog/Sheet — Faz 3.0 pilotunda doğrulandı) + **§2.4** (Popover/DropdownMenu — `tenant-switcher` ile doğrulandı).

- [x] **3.0 Pilot** — `pipeline-settings-modal.tsx` → `Dialog` (`caf8432`)
- [x] **3.4 `confirm-dialog.tsx` normalize edildi** (`d1e80c0`) — **sıra bilinçli olarak değiştirildi**
- [x] `delete-customer-dialog.tsx` → `ConfirmDialog`: **50 → 28 satır** (`d1e80c0`)
- [x] **`customers` grubu tamam** (5 dosya) — `create-customer-modal`, `edit-customer-modal`, `add-contact-modal`, `add-activity-modal` → `Dialog`; `delete-customer-dialog` → `ConfirmDialog` (`dafdeb5`)
- [x] **`components/email` tamam** (6/6) · `components/` kök tamam (8/8) · `components/chat` tamam (1/1)
- [ ] **Kök grubun kalanı:** `team-members-stack.tsx`'in popover'ı (satır 263) — §2.4 ile taşınacak
- [ ] **3.1 kalan:** `widgets` (3) · `promotions/components` (2) · `pipelines/_components` (2) · `components/quotes` (2) · `components/products` (2) · `components/portal` (1) · `components/layout/mobile-nav` (1) · `portal/PortalClient` (1)
- [ ] **3.2** Sayfa-içi modallar (en küçükten büyüğe)
- [ ] **3.3** Kalan silme/onay modalları → `ConfirmDialog`
- [ ] **3.4 ✅ tamam** — `confirm-dialog.tsx` `rounded-3xl` + **`violet-600`** + token ihlallerinden arındırıldı

### ⚠️ Faz 3 bulgusu 1 — paylaşılan primitifin kendisi standardı ihlal ediyordu

`ConfirmDialog` — diğer kodun **uygulaması gereken** primitif — şunları taşıyordu: `rounded-3xl` panel, sabit `zinc`/`white` (token yerine), `rounded-xl` butonlar (§1.1 `rounded-lg` diyor) ve **`bg-violet-600`** (ADR-0002'nin açıkça yasakladığı `violet-*`).

**Sonuç:** sıra tersine çevrildi — önce primitif düzeltildi (3.4), sonra ona taşınıldı (3.1). Aksi halde ihlaller çağrı yerlerine yayılırdı. Ölçüm: `guard --full` hata sayısı **1458 → 1454**.

### ✅ Faz 3 bulgusu 2 — ölçülebilir kazanç

`delete-customer-dialog.tsx`: **50 satır → 28 satır**. `fixed inset-0`, backdrop, `z-50`, `shadow-2xl`, `Button` importu — hepsi gitti. Bu, ADR-0004'ün işaret ettiği vakanın ta kendisiydi: `ConfirmDialog` zaten varken sayfanın modalı sıfırdan yazması.

**Her batch'te geçerli kabul kriterleri:** el yapımı `fixed inset-0` / backdrop / `z-50` / panel `shadow`'u **sıfıra iner** · a11y primitiflerden gelir (focus trap, `Esc`, `aria-modal`) · panel radius'unun 4 varyantı tek standarda iner.

### 🔴 Faz 3 bulgusu 3 — `apps/web` hiçbir biçimlendiricinin kapsamında değil

Bir dosyada girintiyi normalleştirmek için `npx prettier --write` çalıştırıldı; **431 satır** değişti (220 ekleme / 211 silme) — oysa önceki 10 commit'te bir modal ~46 satır değişiyordu. Ölçüm:

| Ölçüm | Sonuç |
| --- | --- |
| `prettier --check` → **dokunulmamış** `compose-modal`, `convert-to-ticket-modal`, `permission-gate`, `nav-config` | **4/4 FAIL** |
| `apps/web` noktalı virgüllü satır (`compose-modal` / `convert-to-ticket-modal`) | 166 / 110 |
| Kök `.prettierrc` | `"semi": false` — koda uymuyor |

Kök `.prettierrc` `apps/web`'in fiilî stiliyle **çelişiyor**; yani `apps/web` prettier-temiz değil ve `prettier --write` orada her zaman toplu gürültü üretir. Ayrıca kökteki `biome.jsonc` (Ultracite) **dış** depoda yaşıyor ve dış `.gitignore` `crm-monorepo/`'yi dışlıyor → **AGENTS.md'deki `npm exec -- ultracite fix` komutu `apps/web`'e erişmiyor.** Faz 3'ün kabul kriterindeki "ultracite" adımı fiilen kapsamsız.

**Sonuç:** değişiklik `git checkout` ile geri alındı, düzenlemeler elle yeniden uygulandı (55 satır). **Kural: `apps/web`'te biçim, çevre dosyanın stiline elle uyarlanır.** Altyapı borcu Gelecek Adımlar #18.

### ⚠️ Faz 3 bulgusu 4 — primitifin taban `max-width`'i ezilince mobil kenar payı ölüyor

`DialogContent` varsayılanı `w-full max-w-[calc(100%-2rem)]` — silinen `p-4` sarmalayıcısının mobil kenar payını üreten tam da bu. İlk iki Dialog migrasyonu `max-w-*`'i **koşulsuz** yazdı (`w-full max-w-lg gap-0 …`), bu da payı sildi:

| | 375px | 500px | 900px |
| --- | --- | --- | --- |
| El yapımı (`p-4` + `max-w-lg`) | 343 | 468 | 512 |
| `max-w-lg` koşulsuz ❌ | **375** | **500** | 512 |
| `sm:max-w-lg` ✅ | 343 | 468 | 512 |

**Kural:** genişlik `sm:` ve üstü için yazılır, taban için yazılmaz → `w-full sm:max-w-lg`. Önceki 2 dosya `ed5efff` ile geri getirildi. `whatsapp-chat-drawer` **etkilenmedi**: orijinal paneli de `w-full max-w-4xl`'di, pay yoktu.

### 🔴 Faz 3 bulgusu 5 — `Sheet`'in `data-[side=*]` varsayılanları öneksiz ezmeyi yiyor

`whatsapp-chat-drawer` (`491cb07`, "✅ Sheet deseni kuruldu") `className="w-full max-w-4xl flex-row sm:max-w-4xl"` taşıyordu. Bu **çalışmıyordu**. `cn()` çıktısı gerçek `tailwind-merge` ile ölçüldü:

```
önce : fixed z-50 flex  data-[side=right]:w-3/4 data-[side=right]:sm:max-w-sm  w-full max-w-4xl flex-row sm:max-w-4xl
sonra: fixed z-50 flex  data-[side=right]:w-full max-w-4xl data-[side=right]:sm:max-w-4xl  flex-row
```

tailwind-merge yalnızca **aynı modifier listesine** sahip utility'leri birleştirir; `[data-[side=right]] ≠ []` olduğu için primitifin sınıfları **çıktıda kalır**. Kararı derlenmiş CSS'te **özgüllük** verir: `data-[side=right]:w-3/4` = (0,2,0), `w-full` = (0,1,0) → drawer **%75 genişlik + 384px tavan** ile render ediliyordu (istenen: `w-full max-w-4xl`). Migrasyonun soktuğu görünür bir regresyon; `7f639f0` ile düzeltildi, §2.3'ün "`cn()` sonuncuyu tutar" gerekçesi gerçek davranışa göre yeniden yazıldı.

**Kural:** varyant önekli varsayılanı **aynı öneki taşıyan** sınıfla ez. Aynı tuzak `alert-dialog.tsx` (`data-[size=*]:max-w-xs`, `:sm:max-w-md`) için de geçerli — bugün tüketicisi olmadığı için kayda geçti, değiştirilmedi.

### 📌 Faz 3 bulgusu 6 — `ConfirmDialog` paylaşılan `alert-dialog` primitifini kullanmıyor

`packages/ui/src/components/confirm-dialog.tsx`, Faz 1'de eklenen `alert-dialog.tsx`'i değil, `radix-ui`'yi **doğrudan** kullanıp kendi overlay'ini kuruyor: `fixed inset-0 z-50 animate-in bg-black/60 backdrop-blur-xs` + panelde `shadow-2xl backdrop-blur-md`. Faz 3.4'te yalnızca `rounded-3xl`/`violet-600`/token ihlalleri temizlendi; overlay katmanı kaldı. Gelecek Adımlar'a alındı (#19).

### 🔴 Faz 3 bulgusu 7 — Faz 1'in popover/dropdown primitifleri §1.1'i ihlal ediyordu

`popover.tsx` (`PopoverContent`), `dropdown-menu.tsx` (`Content`, `SubContent`) — üçü de **`rounded-3xl`** ile yazılmıştı. §1.1 konteynerler için `rounded-lg`/`rounded-xl` diyor.

Bu **bulgu 1'in birebir tekrarı** (o zaman `ConfirmDialog`'un kendisi ihlal ediyordu). Aynı sıra uygulandı: **önce primitif düzeltildi** (`db8cf6e`), sonra üç tüketici ona taşındı. Düzeltilmeseydi ihlal üç çağrı yerine yayılırdı.

`dropdown-menu.tsx`'in **hiç tüketicisi yoktu** ve yine de düzeltildi: amaç, ilk menü tüketicisinin yanlış radius'u miras almaması. Öğe radius'ları (`rounded-2xl`, 4 yerde) **bırakıldı** — konteyner değiller ve mevcut 14 primitifte de geçiyorlar; ayrı bir radius-sweep kararı.

Sonuç: `DialogContent`, `SheetContent`, `PopoverContent`, `AlertDialogContent` → dördü de `rounded-xl`. `packages/ui`'de `rounded-3xl` **0**.

### ⚠️ Faz 3 bulgusu 8 — mobil "başlık altı tam genişlik" paneli `Popover` ile birebir üretilemez

`dashboard-share-popover` ve `notification-center` panelleri iki farklı konumlanma modeli taşıyordu: mobilde `fixed inset-x-3 top-14` (başlığın altına yapışan tam genişlik panel), 640px üstünde `absolute sm:right-0 sm:w-96` (çapalı dropdown). `Popover` **yalnızca çapa** bilir; sabit `top-14` üretilemez.

**Neden yine de aynı yere düşüyor:** üçünün de tetikleyicisi başlığın içinde (`components/layout/dashboard-header.tsx`, `dashboard-header.tsx`, `hub-rail.tsx` doğrulandı). Bu yüzden `align="end"` + `w-[calc(100vw-1.5rem)]` + `collisionPadding={12}` + `sideOffset={10}` eski geometriyi yaklaşık olarak yeniden üretiyor.

**Takas bilinçli:** sabit `top-14` yerine konumlandırma + çarpışma yönetimi primitife geçiyor. Bedeli: tetikleyici başlıktan uzaklaşırsa panel de onunla gider. §2.4'e "yaklaşımdır, kanıt değil" notuyla yazıldı.

**`DropdownMenu` hiç kullanılmadı:** üçü de menü değil (liste, paylaşım eylemleri, çalışma alanı listesi + **oluşturma formu**). Menü semantiği (roving focus, item rolleri) bunlara uymaz — §2.4'e karar kuralı olarak eklendi.

- [ ] **`tooltip` tüketicilerinin standarda bağlanması** (Faz 1'den taşındı — tüketici işi)
- [ ] Dokunulan her sayfada UI parçaları `_components/` altına çıkarılır (ADR-0003) — **kod taşıma ayrı bir mekanik geçiş**; bu fazda yapılmaz (tek değişken kuralı)

## [ ] Faz 4 — Renk disiplini (yüzey yüzey)

- [ ] Auth + admin + portal yüzeyleri (`slate-*` + hex yoğunluğu burada)
- [ ] Dashboard: customer-detail, recruitment, roles, settings, contracts, finance, invoices, messages (`violet`/`fuchsia` → `blue`)
- [ ] `slate-*` → `zinc-*`, `violet`/`fuchsia`/… → `blue-500` skalası
- [ ] Keyfi hex + inline `style` → semantic token
- [ ] Widget'lardaki sabit hex → `--chart-*` tokenları
- [ ] Print/e-posta HTML string'leri: **allowlist'te açıkça kayıtlı** istisna (e-posta istemcileri `oklch`/CSS değişkeni desteklemez)

## [ ] Faz 5 — Tablo & form *görünüm* standardı

**Motor göçü yoktur** — elle yazılmış tablolar/kanban/filtreler kalır, yalnızca görünümleri `@workspace/ui` primitiflerine bağlanır.

- [ ] `Table`, `Badge`, `Button`, `EmptyState`, `Skeleton` kullanımına geçiş
- [ ] `Input` / `SelectField` / `Combobox` / `DatePicker` / `DateRangePicker` / `NumberInput` / `PhoneInput` standardı (ADR-0002) her ekranda
- [ ] Native `<select>`, `type=date`, `type=number` → **0**
- [ ] Kart/panel arka planlarının tek dile inmesi (`bg-card` + `border-border`; `bg-white dark:bg-zinc-900` ve `border-zinc-200` karışımı biter)

## [ ] Faz 6 — Cila (motion + a11y + terim sözlüğü)

- [ ] Motion token'ları tüm overlay/geçişlerde tutarlı
- [ ] a11y checklist dokunulan her ekranda uygulanır
- [ ] Türkçe terim sözlüğü hazırlanır ve dokunulan ekranlarda uygulanır
- [ ] Kalıcı Playwright smoke testleri: login, müşteri listesi, müşteri detayı, pipeline, teklif, admin

## [ ] Faz 7 — Sertleştirme (geri dönüşsüz)

- [ ] `guard:crm-ui:full` **kırıcı** gate olur (exit 0'a ulaştıktan sonra)
- [ ] Yeni kurallar **uyarıdan kırıcıya** terfi eder: `ARBITRARY_TEXT_SIZE`, `NATIVE_TABLE`, `INLINE_STYLE_PROP` → `severity: "error"`
- [ ] **CI workflow eklenir** (bugün `.github/` hiç yok — `.scratch/` dışında hiçbir pipeline dosyası mevcut değil)
- [ ] **`SCOPE` listesi emekliye ayrılır** — buraya taşındı (Faz 0'dan). Gerekçe: scoped liste, `--full` temizlenene kadar **tek çalışan regresyon kapısı**. Erken kaldırmak Program A boyunca korumayı sıfırlar. Bkz. ADR-0004 §9 düzeltmesi
- [ ] `crm-ui-guard.README.md` ve ADR-0004, `SCOPE`'un kaldırıldığı nihai duruma göre güncellenir

---

# Program B — Registry Zenginleştirme ❌ İPTAL

Karar: **`reui`, `beUI` ve `Aceternity` registry'leri eklenmez.** Gerekçe [`ADR-0004`](adr/0004-crm-design-system-enforcement.md) §2: reui'nin işe yarayan bileşenlerinin tamamı `@base-ui/react` istiyor; Radix ile birlikte ikinci bir headless foundation doğurur. Ayrıca tablo/kanban/filtre motorlarını değiştirmek, onları olduğu yerde standartlaştırmaktan **daha pahalıdır**.

Bu karar aşağıdakileri kapsar ve yeniden açılmaz (yeni ADR gerekir):

- `data-grid`, `kanban`, `filters`, `gantt`, `event-calendar`, `cascader`, `tree`, `sortable`, `number-field`, `autocomplete`, `stepper`, `timeline` → **alınmaz**
- Registry config'i (`components.json` → `registries`) **boş kalır** (doğrulandı: bugün hiç third-party registry yok)

---

# Program C — Opsiyonel / Kayıt Altında (yapılmayacak)

- **Aceternity / beUI** — CRM ekranlarında **yasak**. Dekoratif bileşenleri `crm-ui-standards.md` §1.2 anti-AI-slop kuralına aykırı; beUI'nin motion katmanı §9 "dekoratif animasyon yok" kararıyla gereksiz. İleride bir **pazarlama/landing yüzeyi** doğarsa, lisansı teyit edilerek ayrıca değerlendirilir. **Paralı plan kullanılmayacaktır.**
- **`--space-*` ölçeği** (kökteki `design.md`'den) — spacing token ihtiyacı somutlaşırsa değerlendirilir. Bugün reddedilmiştir.
- **Hue 270 / Geist tipografisi** (kökteki `design.md`'den) — reddedildi. Kod hue 260 + Inter/Playfair kanoniktir; hue değişimi tüm ekranların yeniden temalanması demektir.

---

# Gelecek Adımlar (Ertelenen İşler)

Bu program tamamlandıktan sonra ele alınacak. Kendi başına proje olan maddeler için `.scratch/` altında issue açılabilir.

### Kendi başına proje
1. **Monolit sayfa ayrıştırması** — `quotes` (~5.000 satır), `vehicles` (~4.900), `recruitment` (~3.200), `shipments` (~2.650), `organization` (~2.500), `payroll` (~2.400), `attendance` (~2.350), `messages` (~1.900), `finance` (~1.900) → 300 satır kuralı + `_components/` mimarisine tam geçiş
2. **Görsel regresyon altyapısı** — Playwright screenshot testleri + (opsiyonel) Storybook
3. **Tam a11y denetimi** — 52 ekranın tamamı, primitif göçünün ötesinde kalan elle yazılmış etkileşimler

### Teknik borç (küçük/orta)
4. **Dark-mode ekran taraması** — token'lar hazır, her ekranın dark'ta doğru göründüğünün denetimi
5. **Mikro kopya tam geçişi** — Türkçe terim sözlüğünün 52 ekranda eksiksiz uygulanması
6. **`email-preview.ts` çift paletinin kaldırılması** — paylaşılan tek "token → hex" çeviriciye indirgeme
7. **`apps/ecommerce` hayalet referanslarının temizliği** — var olmayan bu uygulama `crm-ui-guard.mjs`, `ADR-0002` ve `docs/design-system.md`'de anılıyor
8. **`design.md` ve `docs/design-system.md` stub'larının tamamen kaldırılması** — dış referans teyidi sonrası
9. **Boş `packages/ui/src/hooks/` export'unun kaldırılması** — `package.json`'da `"./hooks/*"` tanımlı ama klasör boş
10. **`apps/web/components/phone-input.tsx` shim'inin kaldırılması** — import'lar doğrudan `@workspace/ui/components/phone-input`'a
11. **Z-index ölçeği** — `z-[60]`, `z-[70]`, `z-60` keyfi değerleri için katmanlı token'lar
12. **`--chart-*` tokenlarının kullanımı** — `lead-sources-widget`, `sales-gauge-widget` şu an hex sabit
13. **`accordion` ve `calendar` primitifleri** — gerçek tüketici doğduğunda
14. **`apps/web/components/` kökündeki 14 cross-feature widget'ın gözden geçirilmesi** — hangileri gerçekten paylaşılan, hangileri rota altı `_components/`'e taşınmalı
15. **`lucide-react ^1.32.0` sürüm pininin doğrulanması** — alışılmadık bir pin
16. **391 dosyadaki Hallmark imzasının temizliği** — `Hallmark · theme: Adaptive Zinc/Violet · design-system: design.md` başlıkları. Dokunulan dosyalarda düzeltiliyor; kalanı mekanik temizlik. Referans verdikleri doküman artık stub olduğu için sessizce yanıltıcılar
17. **`packages/ui` biçim normalizasyonu** — eski 21 primitif `.prettierrc`'ye uymuyor (`semi: false` diyor, dosyalar noktalı virgüllü). `npm run format` 21 dosyayı toplu değiştirir; ayrı bir geçiş olarak, kendi incelemesiyle yapılmalı (tailwind eklentisi sınıf sıralarını da yeniden düzenler)
18. **`apps/web` biçim altyapısı** — bugün **hiçbir biçimlendiricinin kapsamında değil** (Faz 3 bulgusu 3): kök `.prettierrc` `semi: false` diyor ama `apps/web` noktalı virgüllü, `prettier --check` dokunulmamış dosyalarda da FAIL veriyor; Ultracite (`biome.jsonc`) ise dış depoda ve `crm-monorepo/` gitignore'da olduğu için görünmüyor. Seçenekler: (a) `.prettierrc`'yi koda uydur (`semi: true`) ve `apps/web`'i kapsama al, (b) `crm-monorepo/`'yi Ultracite kapsamına sok, (c) `apps/web` için ayrı config. **Her seçenek tek seferlik büyük bir diff üretir** → kendi commit'i + incelemesi gerekir, Faz 3'e karıştırılmaz
19. **`ConfirmDialog`'un paylaşılan `alert-dialog` primitifine taşınması** — primitif, Faz 1'de eklenen `alert-dialog.tsx`'i değil `radix-ui`'yi doğrudan kullanıp kendi overlay'ini (`fixed inset-0` + `backdrop-blur-xs` + `shadow-2xl`) kuruyor; Faz 3.4 yalnızca renk/token ihlallerini temizledi (Faz 3 bulgusu 6)
20. **Konteyner radius sweep'i (§1.1)** — ölçüm: `apps/web`'te **6 × `rounded-3xl`** + **33 × `rounded-2xl`**, `packages/ui`'de **14 × `rounded-2xl`** (`rounded-4xl` **0** — yasaklı olan yok). §1.1 konteynerler için `rounded-lg`/`rounded-xl` diyor; ama bu sayıların bir kısmı küçük çip/rozet olabilir ve konteyner değildir. **Önce triyaj, sonra tek geçiş.** Faz 3 overlay işi değil: `bulk-action-bar` (`rounded-2xl` yüzen çubuk) bu borcun bir örneği ve §2.4'te overlay kapsamı dışı ilan edildi

---

## İlerleme Günlüğü

| Tarih | Faz | Not |
|---|---|---|
| 2026-09-15 | — | Oturum kuruldu: 33 karar, Program B iptal, ADR-0004 yazıldı |
| 2026-09-15 | Faz 0 | Redirect stub'lar yazıldı (`design-system.md` 440→~35 satır, `design.md` 203→~40 satır) |
| 2026-09-15 | Faz 0 | Kanonik standart güncellendi: §1.3 tipografi ölçeği, §1.4 bağlayıcı kısıtlar, §2.1 sayfa kabuğu |
| 2026-09-15 | Faz 0 | Guard'a `severity` katmanı: 3 yeni advisory kural. **Hata sayısı 1458'de sabit kaldı** — mevcut 9 kural etkilenmedi |
| 2026-09-15 | Faz 0 | Taban ölçüldü: 176 dosya, 1458 error, 1334 advisory. Scoped kapı **PASS** |
| 2026-09-15 | Faz 0 | **Sapma:** `--duration-*` Tailwind 4.3.3'te yok → bekliyor. **Sapma:** `SCOPE` Faz 7'ye taşındı |
| 2026-09-15 | Faz 0 | Motion çözüldü: `--ease-crm` + `--ease-crm-in-out` token'landı, duration'lar §1.5'te değer olarak sabitlendi |
| 2026-09-15 | Faz 0 | Kök dizin **sürüm kontrolüne alındı** (`git init` + `crm-monorepo/` gitignore). Yönetişim dokümanları artık tarihçeli |
| 2026-09-15 | Faz 0 | **FAZ 0 KAPANDI** — typecheck 2/2, build 2/2 (52 rota), scoped kapı PASS, hata sayısı 1458'de sabit |
| 2026-09-15 | Faz 1 | 11 primitif CLI ile eklendi → **21 → 32**. `button.tsx` ezilmedi (git diff boş) |
| 2026-09-15 | Faz 1 | CLI'ın `cn@^0.3.0` npm bağımlılığı kaldırıldı; 11 dosyada import `@workspace/ui/lib/utils`'e çekildi. `package.json` + lock HEAD ile aynı |
| 2026-09-15 | Faz 1 | `rounded-4xl` → `rounded-xl` (2 panel, §1.1 yasağı); `ring-3` → `ring-2` (2 dosya) |
| 2026-09-15 | Faz 1 | **FAZ 1 KAPANDI** — typecheck 2/2, build 2/2, guard PASS, `apps/web` tüketicisi 0 |
| 2026-09-15 | Faz 1 | Prosedür kalıcılaştırıldı: `crm-ui-standards.md` §2.1 (CLI komutu + 2 tuzak + kontrol listesi) |
| 2026-09-15 | Faz 2 | `PageContainer` + `PageHeader` yazıldı; dashboard ve admin layout'un padding sahipliği devredildi |
| 2026-09-15 | Faz 2 | 10 sayfa sarmalandı (customers pilotu `PageHeader`'a da geçti, `text-2xs` ilk kez kullanıldı) |
| 2026-09-15 | Faz 2 | ✅ `text-2xs` üretilen CSS'te doğrulandı → tipografi token'ı işlevsel |
| 2026-09-15 | Faz 2 | ⚠️ **Hata:** sezgisel kapanış-etiketi dönüşümü 2 dosyayı kırdı (`TS17002`); typecheck commit öncesi yakaladı. Yapısal eşleştirmeyle elle düzeltildi. Teknik not kaydedildi |
| 2026-09-15 | Faz 2 | Kalan 42 sayfa kategori haritasıyla kayıt altına alındı |
| 2026-09-15 | Faz 2 | ✅ **Kategori A tamamlandı** (7 sayfa) → **17/52**. typecheck 2/2, build 2/2 |
| 2026-09-15 | Faz 2 | ⚠️ Teknik not 2: `customers/[customerId]`'nin kök adayı loading dalıydı → iki dönüş noktası da sarmalandı. "Mekanik" kategori bile sayfa başına doğrulama gerektiriyor |
| 2026-09-15 | Faz 2 | ✅ **Kategori B tamamlandı** (4 sayfa) → **21/52**. `inventory`/`contracts` gerçek çift-padding'di; form ekranlarının `max-width`'i istisna olarak belgelendi |
| 2026-09-15 | Faz 2 | ✅ **Kategori C tamamlandı** → **23/52**. `finance`/`invoices` kart değil, çift-padding deseniydi (3. kez: görünen kök, gerçek kök değil) |
| 2026-09-15 | Faz 2 | 🔴 **Hata:** roadmap PowerShell ile yeniden yazılınca çift kodlandı (831 mojibake izi). `git checkout` ile son sağlam sürümden geri alındı, değişiklikler `edit` aracıyla yeniden uygulandı. Teknik not 3 kaydedildi |
| 2026-09-15 | Faz 2 | ✅ **Kategori D (kısmen) + E tamamlandı** → **29/52**. `messages`/`calendar` `bleed` aldı; `organization`/`recruitment`'te kabuk `*PageContent`'e verildi; print muaf |
| 2026-09-15 | Faz 2 | ⚠️ Teknik not 4: layout padding'i erken kaldırıldı → 2 sayfa (`email`, `products`) bir süre boşluksuz kaldı, bu batch'te kapatıldı. "Eski sahip en son emekliye ayrılır" kuralı kaydedildi |
| 2026-09-15 | Faz 2 | ✅ **Grup F tamamlandı** (12 sayfa) → 41 sarıldı. `--full` artık 189 dosya tarıyor (Faz 1'in 11 yeni primitifi + Faz 2'nin 2'si) |
| 2026-09-15 | Faz 2 | ✅ **Son 3 sayfa** (`orders/[orderId]`, `projects/[projectId]`, `admin/tenants/[tenantId]`) → **44 sarıldı** |
| 2026-09-15 | Faz 2 | 🎉 **FAZ 2 KAPANDI** — 44 sarıldı + 8 belgelenmiş muafiyet = 52. typecheck 2/2, build 2/2, guard scoped PASS. Muafiyetler standart §2.2'ye yazıldı |
| 2026-09-15 | Faz 3 | ✅ **3.0 pilot** — `pipeline-settings-modal` → `Dialog`; §2.3 migrasyon tarifi yazıldı |
| 2026-09-15 | Faz 3 | ✅ **3.4 sıra değişikliğiyle öne alındı** — `ConfirmDialog` `rounded-3xl` + **`violet-600`** + token ihlallerinden temizlendi → guard hatası **1458 → 1454** |
| 2026-09-15 | Faz 3 | ✅ `delete-customer-dialog` → `ConfirmDialog`: **50 → 28 satır**. El yapımı overlay sıfır |
| 2026-09-15 | Faz 3 | 🔍 Bulgu: paylaşılan primitifin kendisi standardı ihlal ediyordu → **önce primitif düzeltilir, sonra ona taşınılır** kuralı kaydedildi |
| 2026-09-15 | Faz 3 | ✅ **`customers` grubu tamam** (5 dosya) → **7/75**. 4 modal → `Dialog`, 1 → `ConfirmDialog`. El yapımı iz sıfır |
| 2026-09-15 | Faz 3 | ✅ `convert-to-lead-modal` → `Dialog` → **11/75** (`42e05f5`). Diff 32/23 — desen korundu |
| 2026-09-15 | Faz 3 | 🔴 **Hata (kendi):** girinti için `prettier --write` çalıştırıldı → **431 satır** churn (55 satırlık değişiklik). Geri alındı, elle yeniden uygulandı. **Bulgu 3** kaydedildi: `apps/web` hiçbir biçimlendiricinin kapsamında değil |
| 2026-09-15 | Faz 3 | ✅ `template-modal` → `Dialog` → **12/75** (`4700991`). `flex flex-col`, primitifin `grid`'ini tailwind-merge ile yendi |
| 2026-09-15 | Faz 3 | ⚠️ **Bulgu 4:** koşulsuz `max-w-*`, primitifin mobil kenar payını siliyordu (375px'te 343 → 375). Önceki 2 dosya `ed5efff` ile düzeltildi; §2.3'e boyut aktarımı kuralı yazıldı |
| 2026-09-15 | Faz 3 | ✅ `email-account-modal` → `Dialog` → **13/75** (`06af922`). Formun ham `<input>`'ları kapsam dışı bırakıldı (Faz 5) |
| 2026-09-15 | Faz 3 | 🔴 **Bulgu 5:** `Sheet`'in `data-[side=*]` varsayılanları, öneksiz `w-full`/`sm:max-w-*` ezmelerini **yiyor** (tailwind-merge modifier listeleri eşleşmiyor, ardından CSS özgüllüğü). `whatsapp-chat-drawer` %75 / 384px render ediyordu → `7f639f0` ile düzeltildi; §2.3'ün `cn()` gerekçesi yeniden yazıldı |
| 2026-09-15 | Faz 3 | ✅ `email-thread-drawer` → `Sheet` → **14/75** (`c226549`, 2. Sheet). `TS2657`: kök div silinince 3 kardeş kaldı → iç içe modallar `Sheet` içine alındı (konumları değişmedi). Gerçek diff (`-w`) 25/17 |
| 2026-09-15 | Faz 3 | 📌 **Bulgu 6:** `ConfirmDialog` paylaşılan `alert-dialog` primitifini kullanmıyor, kendi overlay'ini kuruyor → Gelecek Adımlar #19 |
| 2026-09-15 | Faz 3 | 📊 **Ara ölçüm:** `guard:crm-ui` scoped **PASS** (0 error/18 dosya) · `--full` **1454** (taban sabit, regresyon yok) · typecheck 2/2 · `email` grubu **6/6 tamam** |
| 2026-09-16 | Faz 3 | 📏 **Kapsam ölçümü:** yol haritası "kök (6)" diyordu; fiilî durum **8 overlay dosyası** (5 modal + 3 popover/dropdown) + `bulk-action-bar` muafiyeti. Sıra: önce Dialog'lar, sonra popover grubu |
| 2026-09-16 | Faz 3 | ✅ **Karar:** dokunulan dosyadaki yanıltıcı Hallmark satırı **silinir** — #16 ile §2.3 "tek değişken" kuralı çelişiyordu; kullanıcı #16'yı seçti. Ölçüm: `apps/web` 139 `.tsx`'in **43**'ünde iz (37 `app/**`, 6 `components/` kök) |
| 2026-09-16 | Faz 3 | ✅ `shortcuts-help-modal` → `Dialog` → **15/75** (`b2d2b84`) |
| 2026-09-16 | Faz 3 | ✅ `quick-add-sales-rep-modal` → `Dialog` → **16/75** (`a7b9d02`) |
| 2026-09-16 | Faz 3 | ✅ `entity-picker-modal` → `Dialog` → **17/75** (`7f55787`). Elle backdrop `onClick` + panel `stopPropagation` silindi; **Enter-ile-seç** davranışı `onKeyDown`'ı `DialogContent`'e taşıyarak korundu (overlay göçünde davranış kaybı yok) |
| 2026-09-16 | Faz 3 | ✅ `team-members-stack` invite modalı → `Dialog` → **18/75** (`65b1feb`). Sarmalayıcının `overflow-y-auto` rolü `DialogContent`'e devredildi; panel `rounded-3xl` → primitiften `rounded-xl`. Dosyadaki popover sonraki adıma bırakıldı (tek değişken) |
| 2026-09-16 | Faz 3 | ✅ `command-palette` → `Dialog` → **19/75** (`ce72250`). Faz 3'ün **tek üstten hizalı** dialogu: `top-16 translate-y-0 sm:top-24`. 8/8 ezme gerçek `tailwind-merge` ile doğrulandı; `max-w-[calc(100%-2rem)]` **bilinçli korundu** (eski `p-4` ile piksel eşit). Görünür başlık yok → `sr-only` `DialogTitle` |
| 2026-09-16 | Faz 3 | 🔴 **Bulgu 7:** `popover.tsx` + `dropdown-menu.tsx` (`Content`/`SubContent`) `rounded-3xl` ile yazılmıştı — bulgu 1'in tekrarı. **Önce primitif** (`db8cf6e`), sonra 3 tüketici. `packages/ui`'de `rounded-3xl` artık **0**; 4 overlay primitifi `rounded-xl`'de birleşti |
| 2026-09-16 | Faz 3 | ✅ `tenant-switcher` → **`Popover`** → **20/75** (`8797590`) — repo'nun **ilk Popover tüketicisi**. `useEffect` click-outside + Escape, `useRef`, `useId`, elle `aria-expanded`/`aria-haspopup`, `z-[70]` silindi. Gerçek diff (`-w`) **21/27 = net küçülme** |
| 2026-09-16 | Faz 3 | ✅ `dashboard-share-popover` → `Popover` → **21/75** (`90316df`) |
| 2026-09-16 | Faz 3 | ⚠️ **Bulgu 8:** mobil "başlık altı tam genişlik" paneli `Popover`'ın çapa modeliyle birebir üretilemez → `align="end"` + `w-[calc(100vw-1.5rem)]` + `collisionPadding={12}` + `sideOffset={10}` ile yaklaşıldı. Tetikleyiciler başlıkta olduğu için aynı yere düşüyor. **`DropdownMenu` hiç kullanılmadı** (üçü de menü değil) |
| 2026-09-16 | Faz 3 | ✅ `notification-center` → `Popover` → **22/75** (`b9ec6fa`). İki `useId`, elle `role="dialog"`, `aria-expanded`/`aria-haspopup` silindi; `setShowTestMenu(false)` `onOpenChange`'e taşındı → artık `Esc` ve dışa tıklama dâhil **her** kapanışta çalışıyor. Gerçek diff 23/47 |
| 2026-09-16 | Faz 3 | ✅ **§2.4 yazıldı** — Popover/DropdownMenu alt-deseni: 7 adım, konumlandırma→prop tablosu, mobil yaklaşım uyarısı, `DropdownMenu` seçim kuralı, `bulk-action-bar` kapsam-dışı gerekçesi, "4 overlay primitifi tek radius" notu |
| 2026-09-16 | Faz 3 | 📊 **Kapanış ölçümü:** `guard:crm-ui` scoped **PASS** · `--full` **1454** (taban sabit, 8 dosya boyunca hiç regresyon yok) · typecheck 2/2 · `build` 2/2 · `components/email` (6/6) + `components/` kök (8/8) tamam |
| 2026-09-16 | Faz 3 | ⏳ **Elle duman testi bekliyor:** `tenant-switcher` mobil drawer içinde artık `z-[70]` yerine primitifin `z-50`'siyle portallanıyor (DOM sırası çözmeli, gözle doğrulanmalı); iki panelin mobil genişliği çapaya bağlı |
