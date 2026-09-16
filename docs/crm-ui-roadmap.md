# CRM UI — Tek Design System Yol Haritası

> **Durum:** Aktif program
> **Karar kaydı:** [`ADR-0004`](adr/0004-crm-design-system-enforcement.md) · **Kanonik standart:** [`crm-ui-standards.md`](crm-ui-standards.md)
> **Kapsam:** `crm-monorepo/apps/web` içindeki **52 sayfa**, 3 layout, auth/admin/portal yüzeyleri, tüm state'ler ve modallar.

Bu dosya **yaşayan bir kontrol listesidir**. Bir faz tamamlandığında kutulanır; ertelenen işler "Gelecek Adımlar" bölümünde kalır.

---

## Ölçülen Taban (2026-09-15, Faz 0 sonrası)

Sayılar `guard:crm-ui:full` çıktısındandır — tahmin değil. Her faz, ilgili sayıyı düşürmelidir.

**176 dosya · 1458 error · 1334 advisory warning**

> **📉 Güncel sayaç (2026-09-16, Faz 3.2 bitti): `--full` = 1438 error · 189 dosya.**
> Taban tablosu **Faz 0 anını** kaydeder ve tarihsel referans olarak değişmeden kalır; yürüyen sayı bu notta tutulur.
> Düşüşün kaynağı — her adım ölçüldü, zincir birbirini tutuyor:
> `1458` (Faz 0 tabanı) → **−4** Faz 3.4 `confirm-dialog` → `1454` → **−3** Faz 3.1 (`team-members-stack` invite modalı `−2`, `dashboard-share-popover` `−1`) → `1451` → **−4** Faz 3.1 (`PortalClient`'ın iki modalı) → `1447` → **−1** Faz 3.1 (`team-members-stack` popover'ı) → `1446` → **−3** Faz 3.2 ilk sayfalar (`templates` `−2`, `tickets` `−1`) → `1443` → **−2** Faz 3.2 (`tickets/[ticketId]`'ın iki sarmalayıcısı `bg-slate-900/60`) → **`1441`**.
>
> `violet-*` ve `fuchsia-*` **bilinçli olarak değişmedi** — onlar Faz 4. Yani bu düşüş renk işi değil, **yüzeyin primitife geçmesinin yan etkisi**: panel gidince panelin renk sınıfları da gidiyor.

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

## [x] Faz 3 — Modal & overlay göçü — **TAMAMLANDI** (3.1: 37 birim · 3.2: 34/34 dosya · 3.3: 5/5 dosya)

> **🔄 Devam noktası (yeni oturum buradan başlasın):**
>
> **✅ FAZ 3 BİTTİ — kalan overlay yok.** Üç alt-adım da ölçülmüş kapsamıyla kapandı:
> - **3.1** — 37 birim, elle yapım overlay izi yalnızca muaf yüzeylerde
> - **3.2** — **34/34 dosya**; `apps/web`'te `fixed inset-0` **108 → 0** (2026-09-16 ölçümü)
> - **3.3** — **5/5 dosya**; `apps/web`'te native `confirm(` **5 → 0** + `ConfirmDialog` primitifi kanonik `alert-dialog`'a taşındı (**bulgu 6 kapandı**, `c5a4925`)
>
> **🆕 3.3'te çıkan yeni iş (kayıtlı, yapılmadı):** native **`alert()` 10 çağrı / 4 dosya** — `login` (1), `calendar` (2), `vehicles` (6), `tenant-switcher` (1). Bunlar **onay değil, doğrulama/hata mesajı**; muadili `toast` (sonner zaten bu dosyaların çoğunda import edilmiş). Konu 3.3 değil **toaster spec'i** → Gelecek Adımlar #23.
>
> **📌 Faz 3.3 dosya listesi (5 dosya — hepsi native `confirm` → `ConfirmDialog`):**
> - `automations` (`26e2d85`) · `calendar` (`b5dfc28`) · `customers/[customerId]` (`341b2e7`) · `projects/[projectId]` (`7ef72b9`) · `webhooks` (`fb9cec2`)
> - Hepsi repodaki yerleşik `confirmDialog` state deseniyle yapıldı (13 tüketiciyle aynı): `{ open, title, description, confirmText, variant, onConfirm }` + sayfa kökünde **tek** render. Onay metinleri **birebir korundu** (kopya değişikliği tasarım işi, bu geçişin değişkeni değil).
> - `projects/[projectId]`: **optimistic delete** sırası korundu (madde ancak onaydan sonra listeden çıkar, `loadProjectData()` yalnız `catch`'te).
> - `customers/[customerId]`: `useCallback` imzası ve bağımlılık dizisi **aynı** kaldı; yalnız `async` düştü.
> - `webhooks`: `Promise<void>` → `void` (çağrı yeri dönüş değerini kullanmıyor).
>
> **📌 Faz 3.2 dosya listesi (34 dosya):**
> - `(admin)/admin/templates` (`ee167e5`), `(admin)/admin/tenants` (`8f3b524`), `roles` (`07d476d`), `users` (`757799b`), `tickets` (`fbf5591`)
> - `automations/[workflowId]` (`d9bbc3b`), `automations` — **2 overlay: drawer→`Sheet` + modal→`Dialog`** (`4e7a387`)
> - `invoices` — modal→`Dialog` (`172fe2a`) + drawer→`Sheet` (`e5dfe86`)
> - `leaves` — **2 modal** (`9b553d3`; ret modalının X'i **yok** → `DialogClose` yok)
> - `contracts` — **modal→`Dialog` + drawer→`Sheet`** (`615ca49`); Hallmark silindi
> - `compliance` — **drawer→`Sheet` + modal→`Dialog`** (`d86f3a1`)
> - `payroll` — **2 modal** (`f453457`; bu dosyada tüm izler **0**)
> - `field-service` — **2 modal** (`de62bca`); Hallmark silindi. ⚠️ **Farklı el stili** (attribute sırası prettier dışı, trailing comma yok, eksik noktalı virgül) → yerel stile uyuldu
> - `orders` — **2 modal** (`79b21c7`; silme onayının X'i yok) · `orders/[orderId]` — **2 modal** (`b04982a`) · `tickets/[ticketId]` — **2 modal** (`1cda709`; çözüm modalının X'i yok, şablon yöneticisi **sarmalayıcı kaydıran** desen)
> - `email` — **1 modal** (`62ed950`; **backdrop `<button>`** deseni, başlıkta iki buton var → yalnız X `DialogClose` oldu, tema toggle'ı kaldı)
> - `projects` — **1 modal** (`71335b8`; Hallmark silindi) · `projects/[projectId]` — **4 overlay: 1 drawer→`Sheet` + 3 modal→`Dialog`** (`1c601be`); drawer'ın **görünür başlığı yok** → sr-only `SheetTitle`
> - `products/[productId]` — **4 modal**, her biri kendi component'inde (`d2b187d`); `EditProductModal`'da **padding dağıtımı** gerekti (panel `p-6` + içerik kaydırıcı → `DialogContent` `p-0`, padding başlık+forma)
> - `calendar` — **4 overlay** (`2d4e61e`); ilk 2'si **sarmalayıcı kaydıran** desen (`my-8` düştü); Hallmark silindi
> - `finance` — **1 drawer + 4 modal** (`fd5f715`); drawer **3. print yüzeyi** (`window.print` + `print:` sınıfları)
> - `inventory` — **3 modal + 2 drawer** (`9313be1`); ⚠️ X ikon boyutları **dosya içinde tutarsız** (modal `h-4`, drawer `h-5`) → varsayma, oku
> - `products` — **5 overlay** (`5d3f8e8`): silme modalı + **2. lightbox** (`role="dialog"` + `stopPropagation`, focus trap yok) + 3 form modalı
> - `webhooks` — **1 modal** (`6ab6e53`) · `webhooks/[endpointId]` — **1 modal** (`acace95`)
> - `attendance` — **3 modal** (`8120e2f`); üçü de **token-temiz** (`border-border`, `bg-card`, `text-foreground`) → yalnız overlay katmanı değişti
> - `vehicles` — **6 overlay** (`806a3a0`, **5000 satır — fazın en büyük tek göçü**): detay drawer'ı + 4 adımlı model sihirbazı + EPC parça + teknik doküman + doküman önizleme + kalıcı silme onayı (X'i yok → `DialogClose` 4/4). Hallmark silindi
> - `organization` — **3 modal + 2 drawer** (`ae4c309`); **7 `fixed inset-0`'in 2'si drawer backdrop'ı**, overlay değil. Personel detay drawer'ının **iki dalı** (yükleniyor + yüklendi) da `Sheet` oldu; görünür başlık üst çubukta değil, profildeki ad `<h3>`'ü → `SheetTitle`
> - `shipments` — **6 modal + 1 drawer** (`e1d4742`); **4. print yüzeyi** (aşağıda). Tümü `gap-0`
> - `recruitment` — **4 modal + 2 drawer** (`61529af`); iki drawer'ın mono etiketi (`ADAY DETAYI`/`BAŞVURU DETAYI`) **etiket olarak kaldı**, gövdedeki ad başlığı `SheetTitle` oldu
> - `messages` — **4 modal** (`2cc15f0`); **8 `fixed inset-0`'in 4'ü ayrı backdrop div'i.** Hepsi `{isX && …}` biçiminde → koşul korundu + `open`. ⚠️ **Sarmalayıcının `overflow-y-auto`'su hiç uygulanmıyordu** (panel `max-h-[92vh] overflow-hidden` ile kendi çocuklarını kırpıyordu) → aynısı korundu
> - `quotes` — **6 modal + 1 drawer** (`28d8d6e`); **11 `fixed inset-0`'in 4'ü backdrop.** ⚠️ **Tek `return` içinde 4 overlay** (drawer + 3 modal) → sarmalayıcı `Sheet`, panel `SheetContent`, 3 `Dialog` **`Sheet` kökünün içinde** kaldı (portal → yalnız yapısal). **5. print yüzeyi** (aşağıda)
> - **Print altyapısı:** `globals.css` `@media print` overlay backdrop'larını gizliyor (`5229ec9`)
>
> **🆕 Yeni muafiyet sınıfı:** **elle yazılmış toast'lar** — `orders`, `orders/[orderId]`, `projects`, `projects/[projectId]` (**4 dosyada 5 örnek**). `fixed` + `shadow-2xl` taşıdıkları için overlay **imzasına** sahipler ama overlay değiller (backdrop/kapatma/engelleme yok, zamanlayıcıyla kapanırlar). `projects` dosyası bunu kendisi `{/* Toast */}` diye adlandırıyor. Konuları **toaster spec'i**. §2.3'teki muafiyet listesine eklendi. **Fazın en sık yanlış pozitifi** — yani "`fixed` + `shadow-2xl` var" hâlâ overlay kanıtı değil, **okuyup bakmak gerekiyor**.
>
> **✅ 3.2'nin deseni (3.1'den dört fark):**
> 1. **Backdrop elemanı yok** — sarmalayıcının kendisi backdrop (`fixed inset-0 bg-…`) ve `onClick` taşımıyor. §2.3'ün dış-tıklama politikası uygulanır (form taslağı → varsayılan açık).
> 2. **Sağ drawer'lar `Sheet`'tir** — sarmalayıcıda `justify-end`, panelde `slide-in-from-right` varsa `side="right"`.
> 3. **Kaydırma sahibi çoğunlukla panelin kendisi** (`max-h-[90vh] … overflow-y-auto` panelde) → `DialogContent`/`SheetContent` **`overflow-y-auto`** alır. Ama içeride kaydıran blok varsa (ör. `flex-1 overflow-y-auto`) içerik `overflow-hidden` kalır. **Dosya başına doğrulanır** — kopyala-yapıştır yanlış sonuç verir.
> 4. **`space-y-*` varsa `gap-0` şart**; panelde `max-h`/`overflow` **yoksa eklenir** (body scroll kilidi yüzünden).
>
> **3.2 BİTTİ — kalan overlay yok.** Sıradaki: **§3.3** (kalan silme/onay modalları → `ConfirmDialog`). ⚠️ 3.3 başlamadan **`ConfirmDialog` primitifini** okuyun: paylaşılan `alert-dialog`'u kullanmıyor, `radix-ui`'yi doğrudan kullanıp kendi overlay'ini kuruyor (Faz 3 bulgusu 6 → Gelecek Adımlar #19). Yani 3.3, çağrı yerlerini çevirmenin yanında **primitifin kendisini** de düzeltmeli.
>
> **📌 Not:** `app/page.tsx` (kök loading sayfası) da bir toast taşıyor ama overlay'i yok → 3.2 kapsamı dışı, toaster spec'ine ait.
>
> **Kalan 4 dosya overlay değil ve muaf** (tek `backdrop-blur`/`shadow-2xl`): `widgets/draggable-widget-wrapper`, `PortalClient` sticky araç çubuğu, `bulk-action-bar`, `layout/dashboard-header` (mobil alt bar da aynı sınıfta). Gerekçeler §2.3'te.
>
> **Tarif:** standart **§2.3** (Dialog + Sheet + print) **+ §2.4** (Popover). **Kabul kriteri:** `fixed inset-0` / `backdrop-blur` / `shadow-2xl` → 0, `tsc` + `build` yeşil, batch başına commit.
>
> **⚠️ Bu fazda on beş tuzak ölçülerek doğrulandı:**
> 1. **Taban `max-width`'i koşulsuz ezmeyin** → `w-full sm:max-w-2xl`. → §2.3
> 2. **Varyant önekli varsayılanı öneksiz ezmeyin** → `data-[side=right]:w-full`. → §2.3
> 3. **`Popover` çapaya göre konumlanır** — mobil tam genişlik deseni yaklaşımla üretilir. → §2.4
> 4. **Dış-tıklama:** varsayılan açık; yalnızca **geri alınamaz çıktı** varsa engellenir. → §2.3
> 5. **Açılış/kapanış SAYILIR** — bu tuzak fazda **3 kez** çıktı: `email-thread-drawer` `TS2657`, `quick-actions-widget` `TS17002`, `contracts` (okuma sayesinde tsc'den önce yakalandı). → §2.3
> 6. **Kaydırma sahibi dosya başına belirlenir** — kopyala-yapıştır yanlış sonuç verir.
> 7. **Print'te `print:*` temel varyantta kalır, önekli kural özgüllükte kazanır** — print genişliğini gerçekten değiştirmek istiyorsanız önekli biçim gerekir. → §2.3
> 8. **Ölçüm araçları sessizce yanlış sonuç verir** — `Select-String -Path`, `git show <sha>^`, `translate-` içindeki `slate-`. → bulgu 9
> 9. **Bir dosyada hem drawer hem modal varsa bunlar farklı primitiflerdir** — aynı geçişte yapılır ama **ayrı ayrı** doğrulanır (denge sayımı 8 etiketi birlikte kontrol eder).
> 10. **Git yazımları paralel çalıştırılmaz** — `git add` + `git commit` eşzamanlı iki komutta `index.lock` çakışır ve bir commit'in **mesajı bir dosyayı, içeriği başkasını** anlatabilir. Bu turda yaşandı; `--soft reset` ile geri alınıp doğru sırayla yeniden commit edildi. **Sıralı çalıştır, sonra `git show --stat` ile mesaj/içerik eşleşmesini doğrula.**
> 11. **Ham `fixed inset-0` sayısı overlay sayısı DEĞİLDİR — fazladan sayar.** Bazı dosyalar backdrop'u sarmalayıcının **kardeşi** olarak ayrı bir `div` yapar (`messages`, `quotes`), bazıları sarmalayıcının kendisini backdrop yapar (`shipments`, `recruitment`), bazılarında ise drawer **kendi** backdrop'unu taşır (`organization`). Ölçülen fark: `organization` 7→**5**, `messages` 8→**4**, `quotes` 11→**7**. **Sayıyla değil, okuyarak karar verin.**
> 12. **Sarmalayıcının `overflow-y-auto`'su panel `max-h` + `overflow-hidden` taşıyorsa zaten devrede değildir** — panel kendi çocuklarını kırpıyordur. Göçte "iyileştirme" yapıp `overflow-y-auto` vermek **kısa ekran davranışını sessizce değiştirir**; aslını birebir kurun (bkz. `messages`).
> 13. **Kapanış bulma sezgiseli "bitişiklik" varsayar** — `tailV2` panel kapanışının **hemen ardından** sarmalayıcı kapanışını arar; araya kardeş bir overlay girerse yanlış çifti sahiplenir (`quotes`'ta oldu; `Dialog` 6 açık / 5 kapalı verdi). **Bitişikliği kardeş overlay bozar** → çok overlay'li dosyalarda denge sayımı **zorunlu**.
> 14. **Toplu geçişten önce çalışma ağacı TEMİZ olmalı** — Faz 4'e başlarken `git status` **3 kirli dosya** gösterdi ve hiçbiri o oturumda yazılmamıştı. Biri (Popover fix) tam da toplu betiğin dokunacağı dosyadaydı; ayırma yapılmasaydı **iki konu tek commit'te** birleşecek ve ikisi de review edilemez olacaktı. **Kural:** her toplu işlemden önce `git status`; kirliyse önce ayır (sahibi olmadığın değişikliği ilgili dosyadan geri çevir → onu kendi commit'ine al → toplu geçişi yeniden uygula). Sahibi olmadığın bir değişikliği sessizce kendi commit'ine katmak "tek değişken/commit" kuralını bozar.
> 15. **Guard "temiz" demek "doğru görünüyor" demek DEĞİL — sınıf çakışmalarını göremez.** Faz 5.0'da `messages`'ta 31 satırda token + eski sınıf **aynı** string'deydi (`dark:bg-card dark:bg-zinc-900`). İkisi de aynı özelliği aynı varyantta, aynı özgüllükte yazıyor → **kazanan, stylesheet'te sonra gelen**. Bunu tahmin etmek yerine **derlenmiş CSS'ten ölçtüm**: `.dark:bg-zinc-900` byte **258605**, `.dark:bg-card` **240413** → eski sınıf kazanıyor, token hiç uygulanmamış. **Yöntem:** `apps/web/.next/**/*.css` içinde `IndexOf(".dark\\:X")` karşılaştır (büyük olan kazanır). Guard'ın bu konuda kuralı yok — bu yüzden "PASS" bir görsel doğruluk kanıtı değildir.
>
> **⚠️ `apps/web`'te `prettier --write` ÇALIŞTIRMAYIN.** Kökteki `.prettierrc` `"semi": false` diyor ama `apps/web` noktalı virgüllü; `prettier --check` **dokunulmamış** dosyalarda da FAIL veriyor ve 55 satırlık değişikliği **431 satıra** çıkarır. Ayrıntı: Gelecek Adımlar #18.
>
> **⚠️ Elle duman testi bekleyen noktalar (typecheck bunları kanıtlayamaz):**
> 1. `tenant-switcher` mobil drawer'ın **içinde** ve `z-[70]` yerine primitifin `z-50`'siyle portallanıyor — gözle doğrulanmalı.
> 2. İki panelin mobil genişliği artık çapaya bağlı.
> 3. `product-gallery` lightbox'ı `h-screen w-screen` bir `DialogContent`; ortalanma ve köşe kontrolleri.
> 4. **`theme-provider` script tipi** (`57d44a7`): SSR `text/javascript` / istemci `text/plain` → **hidrasyon uyarısı** ve **tema flaşı** (ilk boyamada yanlış tema) için tarayıcıda bakılmalı.
> 5. **`messages` çift-token düzeltmesi** (`b36d107`): **koyu tema görünümü değişir** — düzeltmenin amacı bu; token artık gerçekten uygulanıyor.
> 6. **`notification-center` + `dashboard-share-popover`** (`34c5218`): bu iki popover `PopoverContent` kök dışındayken **açılamıyordu**; artık açılıyor mu?
> 4. **PRINT ÖNİZLEMESİ (en önemlisi):** fazda **iki** print yüzeyi var — `invoices` detay drawer'ı ve `contracts` detay drawer'ı ("Yazdır / PDF" → `window.print()`). Bakılacaklar: backdrop **basmıyor** olmalı (global kural, `5229ec9`), panel A4'e sığmalı, gövde kötü bölünmemeli. Portallanmış `fixed` konumlandırma print'te kırılgandır; bu **doğrulanmadı** → Gelecek Adımlar #21.

**3.2 sayfa modalları için ölçülmüş kapsam:** 34 sayfa · 108 `fixed inset-0`. Yol haritasının başındaki "75 modal component'i" tahmini **isim sayımından** geliyordu (`*Modal`/`*Drawer`); sayfa-içi modallar bu sayıma tam girmemişti. Gerçek ilerleme birimi olarak **3.1 tamamlandı** kabul edilir ve 3.2 kendi başına, yukarıdaki 108 sayaçla izlenir.

**İlk tahmin (Faz 0, isim sayımı):** `fixed inset-0` sayısı 156 (şişik: her modal konteyner + backdrop diye iki overlay üretiyor). Dağılım: 108 orta-dialog, 17 sağ-sheet, 1 üst-dialog, ~22 backdrop div'i, 62 `*Modal`, 11 `*Drawer`.

**Migrasyon tarifi:** `crm-ui-standards.md` **§2.3** (Dialog/Sheet — Faz 3.0 pilotunda doğrulandı) + **§2.4** (Popover/DropdownMenu — `tenant-switcher` ile doğrulandı).

- [x] **3.0 Pilot** — `pipeline-settings-modal.tsx` → `Dialog` (`caf8432`)
- [x] **3.4 `confirm-dialog.tsx` normalize edildi** (`d1e80c0`) — **sıra bilinçli olarak değiştirildi**
- [x] `delete-customer-dialog.tsx` → `ConfirmDialog`: **50 → 28 satır** (`d1e80c0`)
- [x] **`customers` grubu tamam** (5 dosya) — `create-customer-modal`, `edit-customer-modal`, `add-contact-modal`, `add-activity-modal` → `Dialog`; `delete-customer-dialog` → `ConfirmDialog` (`dafdeb5`)
- [x] **`components/email` tamam** (6/6) · `components/` kök tamam (9/9) · `components/chat` tamam (1/1) · `widgets` tamam (3/3) · `pipelines/_components` tamam (2/2) · `promotions/components` tamam (2/2) · `components/quotes` tamam (2/2) · `components/products` tamam (2/2) · `components/portal` tamam (1/1) · `components/layout` tamam (1/1) · `PortalClient` tamam (2/2)
- [x] **Kök grubun kalanı:** `team-members-stack.tsx`'in popover'ı → §2.4 ile taşındı (`138fee4`)
- [x] **3.1 TAMAMLANDI** — 37 birim. Elle yapım overlay izi yalnızca muaf yüzeylerde (§2.3 listesi)
- [x] **3.2 — sayfa-içi modallar:** **34 `page.tsx` · 108 `fixed inset-0`** (ölçüm 2026-09-16) → **33 göç + 1 muaf = 34/34 — BİTTİ**
  - [x] `(admin)/admin/templates` (`ee167e5`) · `(admin)/admin/tenants` (`8f3b524`) · `roles` (`07d476d`) · `users` (`757799b`) · `tickets` (`fbf5591`)
  - [x] `automations/[workflowId]` (`d9bbc3b`) · `automations` (`4e7a387`) · `invoices` (`172fe2a` + `e5dfe86`) · `leaves` (`9b553d3`) · `contracts` (`615ca49`) · `compliance` (`d86f3a1`) · `payroll` (`f453457`) · `field-service` (`de62bca`) · `orders` (`79b21c7`) · `orders/[orderId]` (`b04982a`) · `tickets/[ticketId]` (`1cda709`) · `email` (`62ed950`) · `projects` (`71335b8`) · `projects/[projectId]` (`1c601be`) · `products/[productId]` (`d2b187d`) · `calendar` (`2d4e61e`) · `finance` (`fd5f715`) · `inventory` (`9313be1`) · `products` (`5d3f8e8`) · `webhooks` (`6ab6e53`) · `webhooks/[endpointId]` (`acace95`) · `attendance` (`8120e2f`) · `vehicles` (`806a3a0`) · `organization` (`ae4c309`) · `shipments` (`e1d4742`) · `recruitment` (`61529af`) · `settings` (muaf — kart blur'u)
  - [x] **Print altyapısı** — `globals.css` `@media print` overlay backdrop'larını gizliyor (`5229ec9`), derlenen CSS'te doğrulandı. **4. print yüzeyi** `shipments`'te bulundu (`e1d4742`) → Gelecek Adımlar #21 güncellendi
  - [x] `messages` (`2cc15f0`) · `quotes` (`28d8d6e`) — **3.2 tamamlandı, kalan sayfa yok**
- [x] **3.3 Kalan silme/onay modalları → `ConfirmDialog`** — **TAMAMLANDI.** İki yarısı:
  - [x] **Primitif:** `confirm-dialog.tsx` kanonik `alert-dialog` üzerine taşındı (`c5a4925`) — **bulgu 6 kapandı**
  - [x] **5 çağrı yeri:** native `confirm()` → `ConfirmDialog` (`26e2d85`, `b5dfc28`, `341b2e7`, `7ef72b9`, `fb9cec2`). Doğrulama: `apps/web` taraması **0 native `confirm(`**
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

### 🔴 Faz 3 bulgusu 9 — PowerShell ölçümü `[tenantSlug]` altını sessizce atlıyor

Radius borcu ölçümü **iki kez yanlış** rapor edildi ve yanlış hâliyle yol haritasına yazıldı:

| Ölçüm | Yanlış (yazılan) | Doğru (Node) |
| --- | --- | --- |
| `apps/web` `rounded-3xl` | 6 | **146** |
| `apps/web` `rounded-2xl` | 33 | **459** |
| Sayılan dosya | 41 | **139** |

**Kök neden:** `apps/web` altındaki dosyaların **118'i** `app/(dashboard)/[tenantSlug]/` altında. PowerShell'de `Select-String -Path` ve `Get-ChildItem -Include` **yolu joker olarak** yorumlar; `[tenantSlug]` bir karakter sınıfı, `(dashboard)` bir grup sanılır → o alt ağaç eşleşmez ve **sessizce atlanır**. Hata çıkmaz, sadece eksik sayı döner.

**Kural:** `apps/web` yollarında ölçüm **Node ile yürüyerek** (veya `-LiteralPath` ile) yapılır. `-Path` + `-Include` kullanılmaz. Aynı tuzak `slate-` sayımında da bir kez yaşandı (kendi kendine: `translate-` içindeki `slate-` eşleşmesi → hayalet regresyon, `1 → 2`).

**Neden önemli:** yol haritası "tahmin değil ölçüm" üzerine kurulu. Yanlış ölçüm, yanlış plan demek — 146 kayıt 6 diye yazılınca radius işi "küçük" görünüyordu.

**🔁 Aynı sınıfın ikinci vakası (2026-09-16, 3.2 sırasında):** Guard düşüşünü (`1446 → 1443`) dosyalara dağıtmak için `git show <sha>^:yol` kullanıldı. **`^` bir kaçış karakteri olduğu için `cmd.exe` onu yiyor** → "ebeveyn" sessizce commit'in **kendisine** çözülüyor ve her dosya **tam olarak 0** değişim raporluyor. Doğrusu `~1`. Ölçüm `~1` ile tekrarlandığında gerçek dağılım çıktı: `templates` **−2** (`bg-slate-900/40` + `border-slate-200`), `tickets` **−1** (`bg-slate-900/60`), `tenants`/`roles`/`users` **0**.

**Ortak ders:** bu ortamda ölçüm araçları **sessizce** yanlış sonuç veriyor — hata fırlatmıyorlar. Bu yüzden bir ölçüm "mantıklı" görünse bile **ikinci bir yolla** doğrulanmalı (ör. hem `git show` hem çalışma kopyası, hem PowerShell hem Node).

### 📌 Faz 3 bulgusu 10 — dış-tıklama politikası karara bağlandı

Eski el yapımı modalların bir kısmı **dışına tıklayınca kapanmıyordu** (backdrop `onClick`'i yoktu). `Dialog`'a geçince Radix dış-tıklama + `Esc` getiriyor; §2.3 bunları "kazanç" olarak listeliyordu. Ama bazılarında kapatmak **geri alınamaz çıktı** yok ediyor.

**Karar (kullanıcı onaylı):** dış-tıklama **varsayılan olarak açık**; yalnızca kapanmak yeniden üretilemeyen çıktıyı yok ediyorsa `onInteractOutside` ile engellenir. Yazılmış form taslağı **sayılmaz** (yeniden yazılabilir); `localStorage`'a yazılan durum da sayılmaz.

| Dosya | Durum | Karar |
| --- | --- | --- |
| `quick-actions-widget` (`95af399`) | Her toggle anında `localStorage`'a yazılıyor | Varsayılan **uygulandı** |
| `bulk-coupon-modal` (`18cae3e`) | Üretilen kupon kodları başka yerde görünmüyor | Üretim sonrası **engellendi** (`onInteractOutside`, koşullu) |
| `campaign-modal` (`dd1c1e9`) | 5 adımlı sihirbaz, ama girdi yeniden yazılabilir | Varsayılan **uygulandı** — takasın en görünür örneği, politika sert kalırsa ilk buraya bakılmalı |

Kural §2.3'e tablo + kod örneğiyle yazıldı.

### 🔴 Faz 3 bulgusu 11 — lightbox `aria-modal="true"` diyordu ama focus trap'i yoktu

`components/products/product-gallery.tsx`'teki görsel önizleme elle `role="dialog"` + `aria-modal="true"` kuruyordu — **ama focus trap yoktu.** Sekme tuşu overlay'den çıkıp arkadaki sayfaya gidiyordu; `aria-modal="true"` bunu ekran okuyucuya **yanlış** bildiriyordu. Yani burada mesele kozmetik değil, beyan edilen ile gerçek davranışın uyuşmamasıydı.

`Dialog`'a geçiş trap'i, `role`'ü, `aria-modal`'ı ve scroll lock'u **gerçekten** sağlıyor. Yüzey görselin kendisi olduğu için primitifin chrome'u inherit edilmek yerine **negasyon** edildi (`h-screen w-screen max-w-none rounded-none bg-transparent p-4 shadow-none ring-0`) — kenar kontrolleri eski `fixed inset-0` konumlarında kalsın diye `DialogContent` viewport boyutunda.

**Davranış korundu:** eski `keydown` effect'i üç iş yapıyordu — Esc (primitife geçti), scroll lock (primitifin `RemoveScroll`'ü) ve **ok tuşlarıyla gezinme** (primitif bilemez → `DialogContent`'in `onKeyDown`'una taşındı). Bu, `entity-picker-modal`'daki "Enter ile seç" vakasının aynısı: overlay göçü primitifin sağlayamadığı davranışı sessizce düşürmez.

### 🔴 Faz 3 bulgusu 12 — overlay hem ekran hem **print yüzeyi** olabiliyor, ve primitif backdrop'a `className` vermiyor

`invoices` detay drawer'ı aynı anda iki iş yapıyor: ekranda sağdan açılan panel, **yazdırılırken de faturanın kendisi**. Kanıt: panelde `print:max-w-none print:shadow-none`, başlıkta `print:hidden`, ve `handlePrint` drawer açıkken `window.print()` çağırıyor.

`Sheet`'e geçirmek şu duvara çarptı: **`SheetContent` overlay'i (`SheetOverlay`) portal içinde içeriğin kardeşi olarak render ediyor ve `className` almıyor** → çağrı yerinden backdrop'a print sınıfı verilemiyor.

**Çözüm (kullanıcı onaylı):** kural global yapıldı — `globals.css` `@media print` içinde üç overlay `data-slot`'u (+ `$="-backdrop"` yedeği) gizleniyor (`5229ec9`). Tek yerde yapmak hem tüm overlay'leri kapsıyor hem de **elle yazılmış backdrop'ları temizliyor**: bu stylesheet `print-color-adjust: exact` zorladığı için `fixed inset-0 bg-black/40` gibi backdrop'lar **zaten basılıyordu** ve hiçbir şey onları gizlemiyordu.

**Yalnız backdrop gizlenir; içerik gizlenmez** — print hedefi olan yüzeyin paneli kâğıda çıkmalı.

**Açık kalan, doğrulanamayan kısım:** portallanmış `fixed` konumlandırma print'te kırılgandır (sabit elemanlar sayfa başına tekrarlanabilir). Bu **önceden de böyleydi** (eski sarmalayıcı da `fixed inset-0`'dı) ve çözmek drawer'ı print yüzeyi olarak yeniden tasarlamak demek → Gelecek Adımlar'a alındı.

**Print özgüllük tuzağı (§2.3'e yazıldı):** `print:max-w-none` temel varyantta derlenir; `data-[side=right]:sm:max-w-2xl` data-attribute + breakpoint taşıdığı için **özgüllükte kazanır**. Yani "print'te tam genişlik" bugün A4'te (≈703px printable vs 672px `2xl`) **tesadüfen** sağlanıyor, garanti değil.

### 🧩 Primitif API boşluğu — `overlayClassName` yok

Bulgu 12'nin kökü: dört overlay primitifinin hiçbiri overlay'i için `className` geçirmiyor. Global print kuralı bu vakayı çözdü, ama **başka bir ihtiyaç doğarsa** (ör. overlay'e farklı bir blur/opaklık) primitif API'si açılmalı. Şimdilik gereksiz — tek tüketici için API eklemek §2.2'nin "tek tüketici" ölçütüne takılır.

### 📌 Not — `DialogContent`'in varsayılan yüzeyini ezmek meşru mu?

Bulgu 11'de primitifin `bg-popover`/`shadow-xl`/`ring-1`/`p-6`/`rounded-xl` değerleri **bilinçli olarak** sıfırlandı. Kural: **primitif davranışı sağlar, tüketici yüzeyi sağlar.** Bir lightbox'ın yüzeyi görselin kendisidir; primitifin kart görünümü orada yanlış olurdu. §2.3'ün "yalnız boyut/yerleşim sınıfları geçer" cümlesi bu vakayı kapsamıyor — bu yüzden istisna burada, gerekçesiyle kayıtlı.

- [ ] **`tooltip` tüketicilerinin standarda bağlanması** (Faz 1'den taşındı — tüketici işi)
- [ ] Dokunulan her sayfada UI parçaları `_components/` altına çıkarılır (ADR-0003) — **kod taşıma ayrı bir mekanik geçiş**; bu fazda yapılmaz (tek değişken kuralı)

## [x] Faz 4 — Renk disiplini (yüzey yüzey) — **TAMAMLANDI (2026-09-16)**

**Ölçüm:** `--full` **1438 → 62**. Renk kurallarının **tamamı 0**: SLATE 399→0 · VIOLET 920→0 · FUCHSIA 43→0 · ARBITRARY_HEX 4→0 · SVG_PAINT_HEX 4→0 · INLINE_HEX_STYLE 6→0. Renk ihlali taşıyan dosya **51 → 0**. Kalan 62 = Faz 5 (NATIVE_SELECT 61 + INPUT_NUMBER 1).

**Karar (kullanıcı onayı, 2026-09-16):** eşleme **ton birebir** — `violet-600 → blue-600`, tek kademeye indirme **değil**. Gerekçe: kontrast oranları ve `dark:` eşleri birebir korunur, diff mekanik kalır.

- [x] `slate-*` → `zinc-*` — **399 hit / 21 dosya** (`44fe52c`)
- [x] `violet-*` → `blue-*` — **920 hit / 32 dosya** (`a32e90b`; en yoğun `vehicles` 191, `projects/[projectId]` 77, `recruitment` 75)
- [x] `fuchsia-*` → `blue-*` — **43 hit / 10 dosya** (`d6495a1`)
- [x] **Auth yüzeyi** `register` (`fbdf476`): 4 keyfi hex → `bg-zinc-950` / `bg-zinc-100` — **kardeş ekrandan okundu**, `login` zaten tam olarak bunları kullanıyor; 4 SVG hex'i **Google "G" marka rengi** → gerekçesiyle **allowlist kaydı** (ADR-0004: istisna sessiz olamaz)
- [x] **Widget grafik renkleri** → `--chart-*` (`a08616a`, Gelecek Adımlar #12): `lead-sources-widget`'ta 5 hex, **ton koruyan** eşleme (yeşil→`chart-2`, lead→`chart-1`, amber→`chart-3`, kurumsal→`chart-5`, bireysel→`chart-4`); sıralı 1..5 **daha kolay olurdu ve yanlış şeyi anlatırdı**; bonus: token'lar tema-duyarlı olduğu için legend artık dark mode'a uyuyor. **Inline `style` kalktı**
- [x] `pipeline-settings-modal` aşama rengi: stil **değil**, **kalıcı + kullanıcı-düzenlenebilir veri** (bir görünüm sınıf, iki görünüm ham hex + alfa soneki olarak tüketiyor) → gerekçesiyle allowlist + **Gelecek Adımlar #25**
- [x] **Yöntem (kalıcılaştırıldı):** guard'ın **kendi bildirdiği dosya kümesi** üzerinde deterministik betik; her adımın kanıtı **kuralın 0'a düşmesi**. Hex/keyfi değerler betiğin kapsamı dışında, elle işlendi
- [x] **Print/e-posta istisnası belgelendi:** `email-preview.ts` **hiç** hex/renk-sınıfı eşleşmesi üretmiyor (19 `--email-*` değişkeni, hex yok, `slate`/`violet` yok) → temizliği **yapısal**; allowlist kaydı **gerekmiyor** ve belgelerdeki "kayıtlı" ifadesi düzeltildi. `globals.css` print bloğundaki `#0f172a` **kasıtlı** (tema-bağımsız mürekkep: koyu temada `--foreground` beyaza döner → beyaz üstüne beyaz basılır) → yorumla belgelendi, değiştirilmedi
- [x] **⚠️ Yan bulgu:** `notification-center` ve `dashboard-share-popover`'da **`PopoverContent`, `Popover.Root`'un dışındaydı** (bu geçişin kendi regression'ı: `b9ec6fa`, `90316df`) → `34c5218` ile düzeltildi; repodaki 4 `Popover` tüketicisi tarandı, başka örnek yok

## [~] Faz 5 — Tablo & form *görünüm* standardı — **sürüyor (5.0 ✅ · 5.1 ✅ · 5.2: 2/15 dosya · 5.3 bekliyor)**

**Motor göçü yoktur** — elle yazılmış tablolar/kanban/filtreler kalır, yalnızca görünümleri `@workspace/ui` primitiflerine bağlanır.

**Ölçülmüş kapsam (2026-09-16):** NATIVE_SELECT **61 / 15 dosya** · INPUT_NUMBER **1** (primitifin içinde) · NATIVE_TABLE **61** (warn) · ARBITRARY_TEXT_SIZE **1241** (warn) · INLINE_STYLE_PROP **31** (warn) · kart yüzeyi **~1972** (`bg-white…dark:bg-zinc-9xx` 666 + `border-zinc-200` 1306, **kuralı yok**).

- [x] **5.0 `messages` çift-token hatası** (`b36d107`) — 31 satırda token + eski sınıf **aynı string'de** (`dark:bg-card dark:bg-zinc-900` vb.). **Derlenmiş CSS'ten ölçüldü:** `.dark:bg-zinc-900` (byte 258605) `.dark:bg-card`'tan (240413) **sonra** geliyor → **eski sınıf kazanıyor**, token hiç uygulanmamış. 56 kopya kaldırıldı (23 kenar + 10 yüzey + 17 metin + 6 muted yüzey). **⚠️ Guard bunu göremez** (kuralı yok) → kanıt: dosyada kalan çift **0** + CSS sıralaması
- [x] **5.1 INPUT_NUMBER → kayıtlı muafiyet** (`1a5f39d`) — tek hit **`number-input.tsx`'in kendisi**; primitifin içindeki native input **abstraction'dır**, kural implementasyonu tüketiciden ayırt edemez. Allowlist gerekçesiyle (4. kayıt)
- [ ] **5.2 NATIVE_SELECT 61 → 47** — **3/15 dosya:** `create-deal-modal` **6** (`eb84455`) · `pipeline-settings-modal` **1** (`3f92254`) · `projects/[projectId]` **7/25** (`72749e2` — drawer + yeni-öğe formu, hepsi kapalı enum). **Karar ölçütü: seçenek SAYISI değil KAYNAĞI** — kapalı enum → `SelectField`; veriye bağlı liste (küçük görünse bile büyür) → `Combobox`. `onChange` artık değeri alır (`(e) => setX(e.target.value)` → `onChange={setX}`); elle boyut (`h-8 border-input bg-background`) **düşer** — **ama satır-içi 10px "hızlı seçici"ler istisna**, orada kompakt ayak izi ayrıca kararlaştırılmalı (yoksa yoğun backlog satırları yeniden akar)
- [ ] **5.2 kalan dosyalar (47 select):** `projects/[projectId]` **kalan 18** (11'i entity listesi → `Combobox`, 7'si satır-içi hızlı seçici) · `webhooks` 5 · `projects` 4 · `promotions` 4 · `leaves` 3 · `payroll` 2 · `pipeline-filter-bar` 2 · `promotions/[campaignId]/edit` 2 · `campaign-modal` 2 · `promotions/new` 2 · `pipeline-header` 1 · `bulk-coupon-modal` 1 · `tasks-checklist-widget` 1
- ⚠️ **Tip değişimi uyarısı:** story-point seçicileri state'te **sayı** tutuyor ve `value={0}` gibi sayısal seçenek değeri kullanıyordu; `SelectField` **string** konuşur → seçenek değerleri string oldu ve handler `Number(value)` ile geri çeviriyor, `value` ise `String(state)`. Göçte **tek saf-yeniden-adlandırma olmayan yer** burası
- [ ] **5.3 NATIVE_TABLE 61** → `Table` primitifleri (uyarı kuralı, Faz 5 maddesi)
- [ ] **5.4 Kart yüzeyi tek dile** — **önce guard kuralı, sonra süpürme** (onaylandı). Kural olmadan süpürmek kanıtsız kalır; bu projede ilerlemenin kanıtı **sayacın 0'a düşmesi**
- [ ] **5.5 ARBITRARY_TEXT_SIZE 1241** · **5.6 INLINE_STYLE_PROP 31** — **hiçbir faza atanmamış iki uyarı kuralı** (planlama boşluğu; ADR-0004'e göre temizlenmeden error'a terfi edemezler, yani Faz 7'nin önkoşulu)

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
19. **✅ KAPANDI (2026-09-16, `c5a4925`) — `ConfirmDialog` paylaşılan `alert-dialog` primitifine taşındı.** Eski hâli: primitif, Faz 1'de eklenen `alert-dialog.tsx`'i değil `radix-ui`'yi doğrudan kullanıp kendi overlay'ini (`fixed inset-0` + `backdrop-blur-xs` + `shadow-2xl`) kuruyordu (Faz 3 bulgusu 6). **Yan etkisi bir hataydı:** elle yazılmış overlay'de `data-slot` **yoktu**, dolayısıyla `@media print` kuralı (`[data-slot="alert-dialog-overlay"]`) onu göremiyordu → **uygulamadaki her onay penceresi kendi scrim'ini basıyordu.** Kanonik `AlertDialogOverlay` o kuralın hedefi olduğu için hata aynı değişiklikle kapandı. **13 dosya / ~16 çağrı yeri** prop tabanlı olduğu için hiçbiri değişmedi; `AlertDialogAction`/`AlertDialogCancel` bilinçli olarak alınmadı: amber `warning` varyantının `Button` karşılığı yok, almak **yeniden tasarım** olurdu (Faz 5/6 işi).
20. **Konteyner radius sweep'i (§1.1)** — **ölçüm düzeltildi** (bulgu 9: ilk sayım `[tenantSlug]` altını atlamıştı): `apps/web`'te **146 × `rounded-3xl`** (28 dosyada) + **459 × `rounded-2xl`**; `packages/ui`'de **14 × `rounded-2xl`**; `rounded-4xl` **0** (yasaklı olan yok). En yoğun: `products/[productId]` (17), `organization` (11), `compliance` (10), `quotes` (10). §1.1 konteynerler için `rounded-lg`/`rounded-xl` diyor; ama sayıların bir kısmı küçük çip/rozet olabilir ve konteyner değildir → **önce triyaj, sonra tek geçiş.** Faz 3 overlay işi değil: `bulk-action-bar` (`rounded-2xl` yüzen çubuk) ve `settings` kartı bu borcun örnekleri, ikisi de §2.3'te kapsam dışı ilan edildi
21. **Print yüzeyi olan overlay'lerin yeniden tasarımı (bulgu 12)** — **beş yüzey** etkileniyor: `invoices` · `contracts` · `finance` detay drawer'ları ("Yazdır / PDF" → `window.print()`), `shipments` "Kargo Sevk Etiketi & Barkod Önizleme" modalı (`handlePrint`) ve `quotes` "Teklif Belgesi Önizleme" modalı (`handlePrint`; 2026-09-16, `28d8d6e`). Son ikisinde **`print:` sınıfı hiç yok**, yani kaybedilecek bir print düzeni zaten yoktu; tek kazanç backdrop'un artık basılmaması. Backdrop artık basılmıyor (`5229ec9`, global kural sayesinde hepsi kendiliğinden çözüldü), ama **portallanmış `fixed` konumlandırma print'te kırılgan**: sabit elemanlar sayfa başına tekrarlanabilir, sayfa kırılımı kontrol edilemez. Doğru çözüm bu yüzeyleri print için ayrı ele almak (ör. `@media print`'te içeriği normal akışa döndürmek ya da ayrı bir print rotası). **Elle print önizlemesiyle doğrulanmalı.** Aynı soru `orders/[orderId]` (muaf), `products/[productId]`, `calendar` için de doğabilir; kalan sayfalar göçerken **print akışı olan yeni bir yüzey çıkarsa buraya ekleyin**
22. **`overlayClassName` boşluğu** - dört overlay primitifinin hiçbiri overlay'i için `className` geçirmiyor (bulgu 12'nin kökü). Global print kuralı vakayı çözdü; başka bir ihtiyaç doğarsa (farklı blur/opaklık) API açılmalı. Tek tüketici için eklenmedi
23. **Native `alert()` → `toast`** — **10 çağrı / 4 dosya** (2026-09-16 ölçümü, Faz 3.3'te bulundu): `(auth)/login` (1), `calendar` (2), `vehicles` (6), `components/tenant-switcher` (1). Bunlar onay değil **doğrulama/hata mesajı**; native `alert()` thread'i bloklar, temayı yok sayar ve erişilebilir değil. Muadili `toast` (sonner bu dosyaların çoğunda zaten import edilmiş) veya form-içi hata metni. **Native `confirm(` artık 0** (Faz 3.3), dolayısıyla bu, o ailenin kalan tek üyesi
24. **`--success` / `--warning` token'ları YOK** — §1.2 "`emerald`/`success`" ve "`amber`/`warning`" token'larına atıf yapıyor ama `globals.css`'te bu token'lar tanımlı değil (grep: 0 eşleşme). Bugün `emerald-*`/`amber-*` kullanılıyor ve **yasaklı değil** (renk kuralları yalnız `slate`/`violet`/`fuchsia`/hex'i yasaklar), yani acil bir ihlal yok. Faz 4'te **bilinçli olarak ertelendi**: token eklemek ADR-0004 §5'in kendi prosedürüne tabi ve yeni bir tasarım kararı gerektirir. §1.2'deki atıf **"aspirational"** olarak işaretlendi
25. **Pipeline aşama rengi bir **veri sözleşmesi**, stil değil** — `pipeline-settings-modal`'daki `color` alanı (varsayılan `#3B82F6`) kalıcı ve **kullanıcı tarafından metin olarak düzenlenebilir**; `page.tsx:499` onu **Tailwind sınıfı** olarak, `pipeline-kanban-board:57` **ham hex** olarak, `pipeline-table-view:67-73` **hex + alfa soneki** (`${color}15`) olarak tüketiyor. Tek bir geçerli muadil değer yok. Doğru çözüm alanı bir **token sözlüğüne** (ör. `colorKey: "chart-1"`) bağlamak — API + veri göçü işi. Şimdilik gerekçesiyle allowlist'te (`INLINE_HEX_STYLE`)

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
| 2026-09-16 | Faz 3 | 📊 **Kapanış ölçümü:** `guard:crm-ui` scoped **PASS** · `--full` **1451** · typecheck 2/2 · `build` 2/2 · `components/email` (6/6) + `components/` kök (8/8) tamam |
| 2026-09-16 | Faz 3 | 🔽 **1454 → 1451:** 3 `SLATE` hatası kendiliğinden düştü, ölçülerek doğrulandı. Paneller primitife geçerken kendi renk sınıflarını bıraktılar: `team-members-stack` backdrop `bg-slate-950/60` + panel `border-slate-200` (−2), `dashboard-share-popover` panel `border-slate-200/90` (−1). `violet-*` (104) ve `fuchsia-*` (11) **değişmedi** — kapsam disiplini tuttu, renk işi Faz 4'te |
| 2026-09-16 | Faz 3 | ⏳ **Elle duman testi bekliyor:** `tenant-switcher` mobil drawer içinde artık `z-[70]` yerine primitifin `z-50`'siyle portallanıyor (DOM sırası çözmeli, gözle doğrulanmalı); iki panelin mobil genişliği çapaya bağlı |
| 2026-09-16 | Faz 3 | 📏 **Kapsam ölçümü:** `widgets` grubu `components/` altında değil, **`app/(dashboard)/[tenantSlug]/widgets`** altında ve 4 dosya (3 gerçek overlay + 1 muafiyet). `draggable-widget-wrapper` hover sürükleme tutamacı → overlay değil |
| 2026-09-16 | Faz 3 | ✅ `customize-widgets-modal` → `Dialog` → **23/75** (`02517d7`). Kaydırma sahibi dosya başına belirlendi: liste kendi içinde kaydığı için `DialogContent` `overflow-hidden` kaldı — `team-members-stack`'te tam tersiydi |
| 2026-09-16 | Faz 3 | ✅ `quick-create-modal` → `Dialog` → **24/75** (`fad85b4`). Kapanış kontrolü artık `Button` üzerinden: primitif `Button` `...props` yayıyor, `DialogClose asChild` güvenli |
| 2026-09-16 | Faz 3 | ✅ `quick-actions-widget` satır içi modalı → `Dialog` → **25/75** (`95af399`). `localStorage`'a anında yazıldığı **doğrulandı** → dış-tıklama kazancı veri kaybı yaratmıyor |
| 2026-09-16 | Faz 3 | 🔴 **Hata (kendi):** `TS17002` — iki açılış `div`'ini `Dialog`+`DialogContent` ile değiştirip kapanışta bir `</div>` bıraktım. `tsc` yakaladı, commit'ten önce düzeltildi. Faz 2 Teknik not 1'in tekrarı → §2.3'e "açılış/kapanış SAYILIR" kontrolü eklendi |
| 2026-09-16 | Faz 3 | ✅ `create-deal-modal` → `Dialog` → **26/75** (`ae34d03`). Kendi `Escape` `window` dinleyicisi silindi; `useEffect` yalnızca onun için vardı |
| 2026-09-16 | Faz 3 | ✅ `deal-detail-drawer` → **`Sheet`** → **27/75** (`e78611a`). 3 kademeli genişlik ezmesi: `data-[side=right]:w-full` + `:sm:max-w-none` + `:md:max-w-2xl` — eski `w-full` + `md:max-w-2xl` ile **birebir**. Gerçek `tailwind-merge` ile doğrulandı (primitifin 2 sınıfı çıktıdan düştü). İçindeki `ConfirmDialog` `Sheet` içine alındı |
| 2026-09-16 | Faz 3 | ✅ `bulk-coupon-modal` → `Dialog` → **28/75** (`18cae3e`). İlk `onInteractOutside` kullanımı: üretilen kupon kodları geri alınamaz → dış-tıklama **koşullu** engellendi |
| 2026-09-16 | Faz 3 | ✅ **Karar (kullanıcı onaylı):** dış-tıklama varsayılan açık; yalnızca **geri alınamaz çıktı** varsa engellenir. Form taslağı sayılmaz. Kural §2.3'e yazıldı |
| 2026-09-16 | Faz 3 | ✅ `campaign-modal` → `Dialog` → **29/75** (`dd1c1e9`). 5 adımlı sihirbaz: girdi yeniden yazılabilir → varsayılan uygulandı. **Takasın en görünür örneği**, politika sert kalırsa ilk buraya bakılmalı |
| 2026-09-16 | Faz 3 | 🔴 **Bulgu 9 — ölçüm hatası (kendi):** radius sayımı `Select-String -Path` ile yapıldı ve `[tenantSlug]` **joker** sanıldığı için 118 dosya **sessizce atlandı**. Doğru değerler: `rounded-3xl` 6 değil **146**, `rounded-2xl` 33 değil **459**. Yol haritası düzeltildi; kural: Node ile yürü ya da `-LiteralPath` |
| 2026-09-16 | Faz 3 | ✅ **§2.3 genişletildi** — dış-tıklama politikası tablosu + kod örneği, "açılış/kapanış say" kontrolü, overlay **olmayan** yüzen yüzeylerin konsolide listesi (4 dosya, gerekçeleriyle) |
| 2026-09-16 | Faz 3 | 📊 **Kapanış ölçümü:** `guard:crm-ui` scoped **PASS** · `--full` **1451** · typecheck 2/2 · `widgets` (3/3) + `pipelines/_components` (2/2) + `promotions/components` (2/2) tamam |
| 2026-09-16 | Faz 3 | ✅ `send-quote-email-modal` → `Dialog` → **30/75** (`c922aa4`) · `TestSendModal` → `Dialog` → **31/75** (`64eb943`). İkincisi keyfi `z-[60]`'ı da kaldırdı (Gelecek Adımlar #11) |
| 2026-09-16 | Faz 3 | ✅ `bulk-assign-modal` → `Dialog` → **32/75** (`942bec0`). Hata raporu **yeniden üretilebilir** (aynı istek aynı hataları verir) → dış-tıklama varsayılanı uygulandı, engellenmedi |
| 2026-09-16 | Faz 3 | ✅ **`product-gallery` lightbox → `Dialog` → 33/75** (`30ec21d`). 🔴 **Bulgu 11:** elle `aria-modal="true"` + `role="dialog"` kuruluyordu ama **focus trap yoktu** — Sekme arkadaki sayfaya kaçıyordu. Primitif trap/scroll-lock/Esc sağlıyor; **ok tuşları** `DialogContent.onKeyDown`'a taşındı (davranış korundu). Yüzey negasyonu (lightbox) gerekçesiyle kayda geçti |
| 2026-09-16 | Faz 3 | ✅ `contract-sign-modal` → `Dialog` → **34/75** (`d0cda46`) |
| 2026-09-16 | Faz 3 | ✅ `layout/mobile-nav` drawer → **`Sheet side="left"`** → **35/75** (`aa45adc`). Faz 3'ün ilk sol Sheet'i; `md:hidden print:hidden` portal edilen içeriğe taşındı, `SheetTitle` sr-only eklendi (görünür başlık yok) |
| 2026-09-16 | Faz 3 | ✅ `PortalClient`'ın **iki** modalı (onay + revizyon) → `Dialog` → **36/75** (`4e5d722`). Guard **1451 → 1447**: ölçüldü, `PortalClient`'ın `slate-*` sayısı 109 → 105 (panel `border-slate-200` ×2 + backdrop `bg-slate-950/50` ×2) |
| 2026-09-16 | Faz 3 | ✅ `team-members-stack` ertelemeli popover → **`Popover`** → **37/75** (`138fee4`). `popoverRef` + click-outside/Esc effect'i + elle toggle silindi; gerçek diff 49/68 = **net küçülme** |
| 2026-09-16 | Faz 3 | 🎉 **3.1 TAMAMLANDI (37/75).** Tüm isimli gruplar bitti. 🧹 **Hata (kendi):** `popoverRef`'i silerken yanlışlıkla yeniden ekledim — sembolü grep'leyerek commit'ten önce yakaladım (tsc de yakalardı) |
| 2026-09-16 | Faz 3 | 📏 **3.2 kapsamı ölçüldü:** **34 `page.tsx` · 108 `fixed inset-0`**. Kalan 5 dosya overlay değil (muaf, tek `backdrop-blur`/`shadow-2xl`). `settings/page` kartındaki dekoratif blur bu listede |
| 2026-09-16 | Faz 3 | 📊 **Kapanış ölçümü:** scoped **PASS** · `--full` **1446** · typecheck 2/2 · build 2/2 |
| 2026-09-16 | Faz 3 | ⚠️ **Ortam uyarısı (kod değil):** `build` sırasında "diskte yeterli yer yok" (os error 112). **D: sürücüsünde 0.4 GB boş.** Ölçüm: `crm-monorepo/.turbo/cache` **477 dosyada ~40.6 GB**, `apps/web/.next` ~4 GB. Turbo cache yeniden üretilebilir; temizlik için onay bekliyor |
| 2026-09-16 | Faz 3 | ✅ **Turbo cache temizlendi** (onaylı): `crm-monorepo/.turbo/cache` silindi → **D: 0.4 GB → 41 GB boş** |
| 2026-09-16 | Faz 3.2 | ✅ `(admin)/admin/templates` modalı → `Dialog` → **38/75** (`ee167e5`). **Sayfa deseni netleşti:** backdrop elemanı yok (sarmalayıcı backdrop), **panel kendi kaydırıcısı** → `DialogContent` `overflow-y-auto` alır (3.1'in tersi), `space-y-6` + `gap-0` |
| 2026-09-16 | Faz 3.2 | ✅ `(admin)/admin/tenants` modalı → `Dialog` → **39/75** (`8f3b524`) |
| 2026-09-16 | Faz 3.2 | ✅ `roles` create-role modalı → `Dialog` → **40/75** (`07d476d`). Panelde `max-h`/`overflow` yoktu → eklendi: primitif body scroll'unu kilitlediği için uzun içerik erişilemez kalırdı. Kısa içerikte **görünmez**, dosyayı kardeşleriyle tutarlı yapar |
| 2026-09-16 | Faz 3.2 | ✅ `users` invite modalı → `Dialog` → **41/75** (`757799b`). Aynı eksik `max-h`/`overflow` → aynı gerekçeyle eklendi |
| 2026-09-16 | Faz 3.2 | ✅ `tickets` create-ticket modalı → `Dialog` → **42/75** (`fbf5591`). Bu panelde `max-h` + `overflow-y-auto` zaten vardı → ekleme gerekmedi |
| 2026-09-16 | Faz 3.2 | 🔁 **Bulgu 9'un ikinci vakası:** guard düşüşünü dağıtmak için `git show <sha>^:yol` kullanıldı; **`cmd.exe` `^`'i yiyor** → "ebeveyn" commit'in kendisine çözüldü, her dosya **tam 0** değişim raporladı. `~1` ile tekrarlandı: `templates −2` + `tickets −1` = doğru dağılım. **Ders: ölçüm ikinci bir yolla doğrulanmalı** |
| 2026-09-16 | Faz 3.2 | 📊 **Ara ölçüm:** scoped **PASS** · `--full` **1443** (1458'den; zincir her adımda ölçüldü) · typecheck 2/2 · 3.2'de 5/34 sayfa |
| 2026-09-16 | Faz 3.2 | ✅ `automations/[workflowId]` simülasyon modalı → `Dialog` → **43/75** (`d9bbc3b`). Panelde `max-h`/`overflow` yoktu → eklendi |
| 2026-09-16 | Faz 3.2 | ✅ `automations` **iki overlay birden** → **44/75** (`4e7a387`): tarif drawer'ı **`Sheet side="right"`**, dry-run modalı `Dialog`. Sheet ezmeleri gerçek `tailwind-merge` ile doğrulandı (primitifin 2 varsayılanı düştü). Denge 8/8 etiket için kontrol edildi |
| 2026-09-16 | Faz 3.2 | 🔴 **Bulgu 12:** `invoices` detay drawer'ı hem overlay hem **print yüzeyi** (`print:max-w-none`, `print:hidden`, `window.print()` açıkken). `SheetContent` overlay'e `className` geçirmiyor → backdrop print'e girer ve çağrı yerinden engellenemez. **Kullanıcı onayıyla iki adıma bölündü** |
| 2026-09-16 | Faz 3.1 | ✅ **Print kuralı** (`5229ec9`): `globals.css` `@media print` içinde üç overlay `data-slot`'u + `$="-backdrop"` gizleniyor. Elle yazılmış backdrop'lar `print-color-adjust: exact` yüzünden **zaten basılıyordu** — bu kural onları da temizledi. **Derlenen CSS'te doğrulandı** (kaynakta değil) |
| 2026-09-16 | Faz 3.2 | ✅ `invoices` create-invoice modalı → `Dialog` → **45/75** (`172fe2a`) |
| 2026-09-16 | Faz 3.2 | ✅ `invoices` detay drawer'ı → **`Sheet side="right"`** → **46/75** (`e5dfe86`). Print niyeti sınıfları korundu; **print özgüllük tuzağı** §2.3'e yazıldı (`print:*` temel varyantta kalır, önekli kural kazanır) |
| 2026-09-16 | Faz 3.2 | ⏳ **Elle print önizlemesi bekliyor** — programatik doğrulanamaz: backdrop basmamalı, panel A4'e sığmalı, gövde kötü bölünmemeli. Portallanmış `fixed` konumlandırma kırılgan; **doğrulanmadı** |
| 2026-09-16 | Faz 3.2 | 🔧 **Primitif API boşluğu kaydedildi:** dört overlay primitifinin hiçbiri overlay için `className` geçirmiyor. Global print kuralı bu vakayı çözdü; başka bir ihtiyaç doğarsa `overlayClassName` açılmalı |
| 2026-09-16 | Faz 3.2 | 📊 **Ara ölçüm:** scoped **PASS** · `--full` **1443** · typecheck 2/2 · build 2/2 · 3.2'de **8/34 dosya** |
| 2026-09-16 | Faz 3.2 | ✅ `leaves` **iki modal** → `Dialog` → **47/75** (`9b553d3`). Ret modalının **kapatan X'i yok** → `DialogTitle` var ama `DialogClose` yok; denge sayımı (Dialog 2/2, DialogClose 1/1) bunu **doğru** raporlar, simetri beklenmez. `CreateLeaveModal`'da form içeride kaydığı için `flex flex-col overflow-hidden p-0` |
| 2026-09-16 | Faz 3.2 | ✅ `contracts` **modal + drawer** → `Dialog` + **`Sheet side="right"`** → **48/75** (`615ca49`). Hallmark satırı (uzun varyant) silindi |
| 2026-09-16 | Faz 3.2 | 🔎 **İkinci print yüzeyi bulundu:** `contracts` detay drawer'ında "Yazdır / PDF" → `window.print()`. `5229ec9`'daki **global** kural bunu kendiliğinden karşıladı — kuralı tek dosyaya özel yazmamanın gerekçesi buydu. Gelecek Adımlar #21 kapsamı genişledi |
| 2026-09-16 | Faz 3.2 | 🧹 **Hata (kendi, tsc'den önce yakalandı):** `contracts`'ta iki açılış `div`'ini `Sheet`/`SheetContent` yapıp kapanışta bir `</div>` fazla bıraktım — `quick-actions-widget`'teki `TS17002`'nin **aynısı**. Bu kez **okuyarak** yakalandı, çünkü o olay "açılış/kapanış say" kontrolünü devam noktasına yazdırmıştı. Commit edilen ağaç hiç bozulmadı |
| 2026-09-16 | Faz 3.2 | 📊 **Ara ölçüm:** scoped **PASS** · `--full` **1443** · typecheck 2/2 · 3.2'de **10/34 dosya** |
| 2026-09-16 | Faz 3.2 | ✅ `compliance` **drawer + modal** → `Sheet` + `Dialog` → **49/75** (`d86f3a1`). Dosyada kalan 2 `zoom-in-95`/`animate-in` **kontrol edildi**: satır 1025/1041'de sonuç kartlarının iç animasyonu, overlay kromu değil (Faz 6) |
| 2026-09-16 | Faz 3.2 | ✅ `payroll` **2 modal** → `Dialog` → **50/75** (`f453457`). 2729 satırlık dosyada izler tamamen sıfır: `fixed inset-0`/`backdrop-blur`/`shadow-2xl`/`rounded-3xl`/`fade-in`/`animate-in` = **0** |
| 2026-09-16 | Faz 3.2 | ✅ `field-service` **2 modal** → `Dialog` → **51/75** (`de62bca`). Hallmark silindi. ⚠️ **Farklı el stili** (attribute sırası prettier dışı, trailing comma yok, eksik noktalı virgül) → **yerel stile uyuldu, normalize edilmedi** |
| 2026-09-16 | Faz 3.2 | 📊 **Ara ölçüm:** scoped **PASS** · `--full` **1443** · typecheck 2/2 · 3.2'de **13/34 dosya** |
| 2026-09-16 | Faz 3.2 | ✅ `orders` **2 modal** → `Dialog` → **52/75** (`79b21c7`). Silme onayının X'i yok → `DialogClose` 1/1 (doğru asimetri). 🆕 **Yeni muafiyet sınıfı:** elle yazılmış toast (satır 358) overlay **imzasını** taşıyor ama overlay değil → §2.3'e eklendi |
| 2026-09-16 | Faz 3.2 | ✅ `orders/[orderId]` **2 modal** (`ChangeStatusModal` + `AddPaymentModal`) → `Dialog` → **53/75** (`b04982a`). 🔎 **Önemli:** bu sayfa print için `window.print()` değil **ayrı rota** kullanıyor (`/orders/{id}/print`) — Gelecek Adımlar #21'in önerdiği desen **repoda zaten var**. Yani `invoices`/`contracts` drawer'ları **istisna**, §2.3'e yazıldı |
| 2026-09-16 | Faz 3.2 | ✅ `tickets/[ticketId]` **2 modal** → `Dialog` → **54/75** (`1cda709`). Şablon yöneticisi **sarmalayıcı kaydıran** desen (`overflow-y-auto` sarmalayıcıda) → `DialogContent`'e taşındı. Kapatma handler'ı iki iş yapıyordu (kapat + `setEditingTemplate(null)`) → ikisi de `onOpenChange`'e |
| 2026-09-16 | Faz 3.2 | 📉 **`--full` 1443 → 1441** (−2): `tickets/[ticketId]`'ın iki sarmalayıcısı `bg-slate-900/60` taşıyordu, yüzey primitife geçince sınıflar gitti |
| 2026-09-16 | Faz 3.2 | 📊 **Ara ölçüm:** scoped **PASS** · `--full` **1441** · typecheck 2/2 · 3.2'de **16/34 dosya** |
| 2026-09-16 | Faz 3.2 | ✅ `email` **1 modal** → `Dialog` → **55/75** (`62ed950`). **Backdrop `<button>`** deseni; başlıkta **iki buton** var → yalnızca X `DialogClose` oldu, **tema toggle'ı kaldı** (yanlış yapılsa tema değiştirmek modalı kapatırdı) |
| 2026-09-16 | Faz 3.2 | ✅ `projects` **1 modal** → `Dialog` → **56/75** (`71335b8`). Hallmark silindi. Dosya kendi toast'ını `{/* Toast */}` diye adlandırıyor → muafiyet net |
| 2026-09-16 | Faz 3.2 | ✅ `projects/[projectId]` **4 overlay** → `Sheet` + 3×`Dialog` → **57/75** (`1c601be`). Fazın en büyük tek göçü. Drawer'ın **görünür başlığı yok** → sr-only `SheetTitle` |
| 2026-09-16 | Faz 3.2 | 🔴 **Hata (kendi, 3. tekrar):** drawer'da iki açılış `div`'ini `Sheet`/`SheetContent` yapıp kapanışta bir `</div>` fazla bıraktım → `TS17002`. **Kontrolü atladım** çünkü dosyada 4 overlay vardı ve kapanışları tek tek saymak yerine hızlı geçtim. `tsc` yakaladı, commit edilen ağaç bozulmadı. **Tuzak listesinde artık 3 kayıt + 1 okumayla yakalanan near-miss** → fazın en pahalı alışkanlığı |
| 2026-09-16 | Faz 3.2 | 📊 **Ara ölçüm:** scoped **PASS** · `--full` **1441** · typecheck 2/2 · 3.2'de **19/34 dosya** |
| 2026-09-16 | Faz 3.2 | ✅ `products/[productId]` **4 modal** (her biri kendi component'inde) → `Dialog` → **58/75** (`d2b187d`). 🆕 **Padding sahibi kuralı:** panel `p-6` + **içerik kaydırıcı** ise `DialogContent` `p-0` alır ve padding **başlık+forma dağıtılır** — unutulsa diff'te makul görünür, ekranda içerik kenara yapışır. §2.3'e yazıldı |
| 2026-09-16 | Faz 3.2 | ✅ `calendar` **4 overlay** → `Dialog` → **59/75** (`2d4e61e`). İlk 2'si **sarmalayıcı kaydıran** desen (`overflow-y-auto` sarmalayıcıda + panel `my-8`) → `DialogContent` `overflow-y-auto`, `my-8` düştü. Hallmark silindi |
| 2026-09-16 | Faz 3.2 | 🧹 Kapanış sayımı bu turda **her dosyada toplu** yapıldı (4/4 ve 4/4) — tuzak 3 kez çıktığı için refleks değiştirildi. `tsc` iki dosyada da ilk denemede geçti |
| 2026-09-16 | Faz 3.2 | 🆕 Toast muafiyeti **6 dosyada 7 örnek** oldu (`calendar` 7.'si). §2.3'e "her yeni sayfada bu imzayı görünce önce 'toast mı?' diye sor" notu eklendi |
| 2026-09-16 | Faz 3.2 | 📊 **Ara ölçüm:** scoped **PASS** · `--full` **1441** · typecheck 2/2 · 3.2'de **21/34 dosya** |
| 2026-09-16 | Faz 3.2 | ✅ `finance` **1 drawer + 4 modal** → `Sheet` + `Dialog` → **60/75** (`fd5f715`). Drawer **3. print yüzeyi** (`handlePrintStatement` → `window.print()`, `print:` sınıfları, `print:hidden` başlık) → global kural yine karşıladı. Son 4'ü karekteristik olarak `max-h-[90vh]` vardı ama **overflow yoktu** → eklendi |
| 2026-09-16 | Faz 3.2 | ✅ `inventory` **3 modal + 2 drawer** → **61/75** (`9313be1`). ⚠️ **Araç dersi:** bu dosyada X ikon boyutu **tutarsız** (modal `h-4 w-4`, drawer `h-5 w-5`); `h-5` varsayınca `edit` aracı oldString'i **reddetti** (araç doğru çalıştı). → **satırları oku, boyut varsayma** |
| 2026-09-16 | Faz 3.2 | 🛠️ **Araç eklendi (temp):** `dump.cjs` (satır + girinti + JSON içerik) ve `tail.cjs` (kapanış bloğunu **deterministik** değiştirir). Elle boşluk saymak 2 kez hatalı düzenleme üretti; script üretmedi. **Tempo ~2× arttı** |
| 2026-09-16 | Faz 3.2 | ✅ `products` **5 overlay** → **62/75** (`5d3f8e8`): silme modalı (X'i yok → `DialogClose` 4/4) + **2. lightbox** (elle `role="dialog"` + `stopPropagation`, focus trap yok) + 3 form modalı |
| 2026-09-16 | Faz 3.2 | 📊 **Ara ölçüm:** scoped **PASS** · `--full` **1441** · typecheck 2/2 · 3.2'de **24 göç + 1 muaf = 25/34** · bu turda **3 dosya / 16 overlay** (önceki turlarda 2-3 dosya) |
| 2026-09-16 | Faz 3.2 | 📏 **Kalan kapsam ölçüldü:** **9 sayfa · 52 `fixed inset-0`** — `webhooks` (1) ve `webhooks/[endpointId]` (1) **önceki listelerde eksikti**, eklendi. `app/page.tsx` yalnız toast taşıyor → 3.2 dışı |
| 2026-09-16 | Faz 3.2 | ✅ `webhooks` (`6ab6e53`) · `webhooks/[endpointId]` (`acace95`) · `attendance` (`8120e2f`) → **65/75**. `attendance`'ın üç modalı **token-temiz**ti → yalnız overlay katmanı değişti |
| 2026-09-16 | Faz 3.2 | 🔴 **Hata (kendi): iki git yazımını paralel çalıştırdım** → `index.lock` çakışması; sonuç: bir commit'in **mesajı bir dosyayı, içeriği başka dosyayı** anlatıyordu. `git reset --soft HEAD~1` ile commit geri alındı (içerik kaybı yok, ağaç temiz), üç dosya doğru sırayla ve **doğru mesajlarla** yeniden commit edildi; `git show --stat` ile her commit'in mesajıyla eşleştiği doğrulandı. **Kural: git yazımları asla paralel çalıştırılmaz.** (Teknik notlar'a eklendi) |
| 2026-09-16 | Faz 3.2 | 🛠️ `tailV2.cjs` eklendi — kapanış bloğunu **sarmalayıcı girintisinden** bulur (bağlantı metni gerekmez), önce/sonra raporlar. Bu turda **8 overlay'de** kullanıldı, hiç kapanış hatası çıkmadı |
| 2026-09-16 | Faz 3.2 | 📊 **Ara ölçüm:** scoped **PASS** · `--full` **1441** · typecheck 2/2 · 3.2'de **27 göç + 1 muaf = 28/34** · bu turda **3 dosya / 5 overlay** |
| 2026-09-16 | Faz 3.2 | ✅ `vehicles` **6 overlay** → **66/75** (`806a3a0`). **5000 satır — fazın en büyük tek göçü.** Detay drawer'ı → `Sheet`; 4 adımlı model sihirbazı + EPC parça + teknik doküman + doküman önizleme + kalıcı silme onayı → `Dialog`. Silme onayının X'i yok → `DialogClose` 4/4 (doğru). Doküman önizlemesinin `title={document.name}` özniteliği `DialogTitle`'a korundu. Hallmark silindi |
| 2026-09-16 | Faz 3.2 | 📊 **Ara ölçüm:** scoped **PASS** · `--full` **1441** · typecheck 2/2 · 3.2'de **28 göç + 1 muaf = 29/34** · kalan **5 sayfa / 41 overlay** |
| 2026-09-16 | Faz 3.2 | ✅ `organization` **3 modal + 2 drawer** → **67/75** (`ae4c309`). **Ölçüm tuzağı:** tarama **7 `fixed inset-0`** diyor ama **5'i overlay** — ikisi detay drawer'ının **kendi backdrop div'i**. Personel drawer'ının **iki `return` dalı** (yükleniyor + yüklendi) da `Sheet`; yükleniyor dalına **sr-only `SheetTitle`**, yüklendi dalına profildeki ad `<h3>`'ü → `SheetTitle` (üst çubuktaki mono sicil no **etiket**, başlık değil) |
| 2026-09-16 | Faz 3.2 | ✅ `shipments` **6 modal + 1 drawer** → **68/75** (`e1d4742`). **🆕 4. print yüzeyi bulundu:** `handlePrint` → `window.print()` ("Kargo Sevk Etiketi & Barkod Önizleme") — diğer üçünün aksine **hiç `print:` sınıfı yok** → Gelecek Adımlar #21 + §2.3 güncellendi. **`gap-0`'ın ikinci gerekçesi:** bu 4 formun paneli **hiç dikey boşluk utility'si taşımıyordu** (çocuklar boşluksuz yığılıyordu); primitifin `grid gap-6`'sı kalsaydı her banda 24px eklerdi |
| 2026-09-16 | Faz 3.2 | ✅ `recruitment` **4 modal + 2 drawer** → **69/75** (`61529af`). İki drawer'ın mono etiketi (`ADAY DETAYI`/`BAŞVURU DETAYI`) etiket kaldı, gövdedeki **ad başlığı** `SheetTitle` oldu — `organization` ile aynı kural |
| 2026-09-16 | Faz 3.2 | 📊 **Ara ölçüm:** scoped **PASS** · `--full` **1441** · typecheck 2/2 · 3.2'de **31 göç + 1 muaf = 32/34** · kalan **2 sayfa / 19 overlay** (`messages`, `quotes`) |
| 2026-09-16 | Faz 3.2 | ✅ `messages` **4 modal** → **70/75** (`2cc15f0`). **8 `fixed inset-0`'in 4'ü ayrı backdrop div'i** → gerçek overlay 4. Hepsi `{isX && …}` biçiminde → koşul **korundu** + `open` verildi (kapanışta unmount → yerel state sıfırlanıyor, o davranış bilinçli). ⚠️ Sarmalayıcının `overflow-y-auto`'su **hiç uygulanmıyordu** (panel `max-h-[92vh] overflow-hidden` ile kendi çocuklarını kırpıyordu) → primitifte de `overflow-hidden` seçildi, kısa ekran davranışı **birebir** korundu |
| 2026-09-16 | Faz 3.2 | ✅ `quotes` **6 modal + 1 drawer** → **71/75** (`28d8d6e`). **11 `fixed inset-0`'in 4'ü backdrop.** ⚠️ **Tek `return` içinde 4 overlay** (drawer + 3 modal): sarmalayıcı `Sheet`, panel `SheetContent`, 3 `Dialog` **`Sheet` kökünün içinde** kaldı (portal → yalnız yapısal; alternatif ~660 satır drawer gövdesini yeniden girintilemekti). Drawer'ın taban genişlik sınırı yoktu → `data-[side=right]:sm:max-w-none data-[side=right]:md:max-w-3xl` (`deal-detail-drawer` örneği). 3 modal **`z-60` + `bg-slate-950/40` + ayrı backdrop yok** (sarmalayıcı backdrop'un kendisiydi). **5. print yüzeyi** bulundu → #21 + §2.3 güncellendi |
| 2026-09-16 | Faz 3.2 | ⚠️ **`tailV2` yanlış eşleşti (ilk kez) — denge kontrolü yakaladı.** Sezgisel kural "panel kapanışı **hemen ardından** sarmalayıcı kapanışı gelir" varsayıyor; `quotes`'ta drawer'ın panel kapanışından sonra **yorum** geliyordu (araya 3 modal girmiş), tarama devam edip **şablon modalının** `div/div/);` çiftini sahiplendi. Sonuç: `Dialog` 6 açık / 5 kapalı + bir `Sheet` kapanışı bir dialog'un üzerine yazıldı. **Ders: sezgisel yalnız "bitişik" durumda güvenilir; kardeş overlay tam da o bitişikliği bozar.** |
| 2026-09-16 | Faz 3.2 | 📉 **`--full` ilk kez düştü: 1441 → 1438 (-3).** Kaynak: `quotes`'ta elle yazılmış yüzeyin primitifle değişmesi, o sınıfların taşıdığı ADR-0002 ihlallerini de götürdü. **Yani scoped göç, kapsam dışı ilan edilen ihlalleri yan etki olarak azaltabiliyor** — yeni dosyalarda da beklenmeli |
| 2026-09-16 | Faz 3.2 | ✅✅ **3.2 BİTTİ — 33 göç + 1 muaf = 34/34.** typecheck 2/2 · scoped **PASS** · `--full` **1438** · Faz 3 toplamı **71/75** · kalan: **§3.3** (silme/onay modalları, primitifin kendisi dahil) |
| 2026-09-16 | Faz 3.3 | ✅ **`ConfirmDialog` primitifi kanonik `alert-dialog`'a taşındı** (`c5a4925`) → **bulgu 6 KAPANDI**. Elle yazılmış portal/overlay/content gitti; primitif artık portal, overlay, animasyon, yüzey (`bg-popover` + `shadow-xl` + `ring`), ve boyutu (`max-w-xs` taban → `sm:max-w-md`) sahipleniyor — bu son madde **mobil hatayı da düzeltiyor**: eski koşulsuz `max-w-md` 375px'te paneli kenardan kenara yapıyordu. **Yan etkisi bir hata düzeltmesi:** elle yazılmış overlay'de `data-slot` yoktu → `@media print` kuralı onu göremiyordu → **her onay penceresi scrim'ini basıyordu**; kanonik overlay o kuralın hedefi. 13 dosya / ~16 çağrı yeri **değişmedi** (prop tabanlı). `AlertDialogAction/Cancel` bilinçli alınmadı (amber `warning`'in `Button` karşılığı yok → yeniden tasarım olurdu) |
| 2026-09-16 | Faz 3.3 | ✅ **5 native `confirm()` → `ConfirmDialog`** (`26e2d85` automations · `b5dfc28` calendar · `341b2e7` customers/[customerId] · `7ef72b9` projects/[projectId] · `fb9cec2` webhooks). Hepsi repodaki yerleşik `confirmDialog` state deseniyle; **onay metinleri birebir korundu**. `projects/[projectId]`: **optimistic delete sırası korundu** (`loadProjectData()` yalnız `catch`'te). `customers/[customerId]`: `useCallback` imzası/bağımlılıkları **aynı**, yalnız `async` düştü. `webhooks`: `Promise<void>` → `void` (çağrı yeri dönüşü kullanmıyor) |
| 2026-09-16 | Faz 3.3 | 📊 **Ölçülmüş doğrulama:** `apps/web`'te `fixed inset-0` **108 → 0** · native `confirm(` **5 → 0** · typecheck 2/2 · build 2/2 · scoped **PASS** · `--full` **1438** (sabit). **🆕 Bulgu:** native **`alert()` 10 çağrı / 4 dosya** (login 1, calendar 2, vehicles 6, tenant-switcher 1) → **Gelecek Adımlar #23** |
| 2026-09-16 | Faz 3 | ✅✅✅ **FAZ 3 TAMAMLANDI.** 3.1 (37 birim) · 3.2 (34/34 dosya) · 3.3 (5/5 dosya + primitif). Faz 3 bulgusu 6 ve 12 kapandı; elle yazım overlay katmanı **uygulamada kalmadı** (muaf yüzeyler hariç, §2.3 listesi) |
| 2026-09-16 | Faz 4 | 📊 **Kapsam ölçüldü:** renk kuralları **1376 ihlal / 51 dosya** (VIOLET 920 · SLATE 399 · FUCHSIA 43 · INLINE_HEX_STYLE 6 · ARBITRARY_HEX 4 · SVG_PAINT_HEX 4). Kalan 62 Faz 5'in (NATIVE_SELECT 61 + INPUT_NUMBER 1). **Üç karar onaylandı:** ton birebir eşleme · `--success`/`--warning` token'ları **ertelendi** (#24) · print hex'i **belgele+kaydet** |
| 2026-09-16 | Faz 4 | ⚠️ **Yan bulgu (kendi regression'ım):** çalışma ağacında **bana ait olmayan** 3 kirli dosya bulundu. İkisi `PopoverContent`'i `Popover.Root`'un **dışına** koyan `b9ec6fa`/`90316df` commit'lerimin düzeltmesiydi → **`34c5218`** ile ayrı commit'lendi (renk yarısı geri çevrilip önce fix). Üçüncüsü (`theme-provider.tsx`, alakasız SSR script düzeltmesi) **bilinçli olarak dokunulmadı**. Repodaki **4 `Popover` tüketicisi tarandı**, başka örnek yok |
| 2026-09-16 | Faz 4.0 | ✅ `slate-*` → `zinc-*` · **399 hit / 21 dosya** (`44fe52c`) · SLATE **399→0** · `--full` 1438→**1039** (tam 399) · renk dosyası 51→40 |
| 2026-09-16 | Faz 4.1 | ✅ `violet-*` → `blue-*` · **920 hit / 32 dosya** (`a32e90b`) · VIOLET **920→0** · `--full` 1039→**119** · renk dosyası 40→13. **30 Hallmark banner'ı "Zinc/Violet" olarak kaldı** — betik yalnız `violet-<ton>` eşleştiriyor, düzyazıya dokunmuyor (#16'nın işi) |
| 2026-09-16 | Faz 4.2 | ✅ `fuchsia-*` → `blue-*` · **43 hit / 10 dosya** (`d6495a1`) · FUCHSIA **43→0** · `--full` 119→**76** · renk dosyası 13→**3** |
| 2026-09-16 | Faz 4.3 | ✅ `register` auth yüzeyi (`fbdf476`) · ARBITRARY_HEX 4→0, SVG_PAINT_HEX 4→0 · `bg-[#070709]`→`bg-zinc-950`, `bg-[#f3f4f7]`→`bg-zinc-100` (**kardeş ekran `login`'den okundu**) · 4 SVG hex'i **kayıtlı istisna** (Google marka rengi) · `--full` 76→**68** |
| 2026-09-16 | Faz 4.4 | ✅ Widget grafik renkleri (`a08616a`) · INLINE_HEX_STYLE **6→0** (5 düzeltildi + 1 gerekçeli kayıt) · **`--chart-1..5` ilk kez kullanıldı** (#12) · **tüm renk kuralları 0** · `--full` **62** — kalan tamamen Faz 5 |
| 2026-09-16 | Faz 4 | ✅✅✅ **FAZ 4 TAMAMLANDI.** `--full` **1438 → 62** (1376 renk ihlali çözüldü) · renk ihlali taşıyan dosya **51 → 0** · **Yöntem kalıcılaştı:** guard'ın bildirdiği dosya kümesi + deterministik betik + kanıt olarak kuralın 0'a düşmesi |
| 2026-09-16 | Faz 5 | 📊 **Kapsam ölçüldü:** NATIVE_SELECT **61 / 15 dosya** · INPUT_NUMBER **1** · NATIVE_TABLE 61 · ARBITRARY_TEXT_SIZE 1241 · INLINE_STYLE_PROP 31 · kart yüzeyi **~1972 (kuralı YOK)**. **İki planlama boşluğu bulundu:** (a) üç uyarı kuralının **sahibi hiçbir fazda yok**, (b) kart yüzeyi standardının **ne bölümü ne ölçümü** var. Kapsam kararı: 5.0–5.3 + kalanlar 5.4/5.5/5.6 olarak kaydedildi; kart yüzeyi için **önce kural sonra süpürme** onaylandı |
| 2026-09-16 | Faz 5.0 | ✅ **`messages` çift-token hatası** (`b36d107`) — 31 satır, 56 kopya sınıf kaldırıldı. **Kanıt derlenmiş CSS'ten:** `.dark:bg-zinc-900` (258605) `.dark:bg-card`'tan (240413) sonra → **eski sınıf kazanıyordu**, token hiç uygulanmamış. `.dark:border-*`, `muted`, `text-foreground` çiftlerinin **hepsi** aynı yönde ölçüldü. **Yeni tuzak #15:** guard sınıf çakışmasını göremez → "PASS" görsel doğruluk kanıtı değil |
| 2026-09-16 | Faz 5.1 | ✅ **INPUT_NUMBER → kayıtlı muafiyet** (`1a5f39d`). Tek hit primitifin (`number-input.tsx`) kendisiydi: kural **abstraction'ı tüketiciden ayırt edemiyor**. Gerekçesiyle allowlist'e (4. kayıt). `--full` 62 → **61** |
| 2026-09-16 | Faz 5.2 | ✅ `create-deal-modal` **6 select** (`eb84455`) + `pipeline-settings-modal` **1** (`3f92254`) → NATIVE_SELECT **61 → 54**. **Karar ölçütü kalıcılaştı: seçeneğin SAYISI değil KAYNAĞI** — kapalı enum → `SelectField`, veriye bağlı liste (küçük görünse bile büyür) → `Combobox`. Sayarak karar vermek küçük tenant'ta yanlış, büyük tenant'ta doğru sonuç verir; bu yanlış türden bir tutarlılık |
| 2026-09-16 | Faz 5 | ✅ **Çalışma ağacı temizlendi:** `theme-provider.tsx`'teki (bana ait olmayan) SSR script tipi değişikliği **`57d44a7`** ile commit'lendi — mesajda **atıf açık**: bu göç yazmadı, çalışma ağacında bulundu; typecheck+build doğrulandı, **hidrasyon davranışı tarayıcı işi** → elle test listesine #4 olarak eklendi |
| 2026-09-16 | Faz 5.2 | ✅ `projects/[projectId]` **7/25** (`72749e2`, part 1) → NATIVE_SELECT **54 → 47**. **Tip değişimi:** story-point seçicileri state'te sayı tutuyordu, `SelectField` string konuşuyor → seçenek değerleri string + handler `Number(value)` + `value={String(state)}`. Kalan 18'in 11'i entity listesi (`Combobox`), 7'si satır-içi 10px hızlı seçici (**kompaktlık kararı bekliyor**) |
