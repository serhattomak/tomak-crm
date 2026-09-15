# CRM UI â€” Tek Design System Yol HaritasÄ±

> **Durum:** Aktif program
> **Karar kaydÄ±:** [`ADR-0004`](adr/0004-crm-design-system-enforcement.md) Â· **Kanonik standart:** [`crm-ui-standards.md`](crm-ui-standards.md)
> **Kapsam:** `crm-monorepo/apps/web` iÃ§indeki **52 sayfa**, 3 layout, auth/admin/portal yÃ¼zeyleri, tÃ¼m state'ler ve modallar.

Bu dosya **yaÅŸayan bir kontrol listesidir**. Bir faz tamamlandÄ±ÄŸÄ±nda kutulanÄ±r; ertelenen iÅŸler "Gelecek AdÄ±mlar" bÃ¶lÃ¼mÃ¼nde kalÄ±r.

---

## Ã–lÃ§Ã¼len Taban (2026-09-15, Faz 0 sonrasÄ±)

SayÄ±lar `guard:crm-ui:full` Ã§Ä±ktÄ±sÄ±ndandÄ±r â€” tahmin deÄŸil. Her faz, ilgili sayÄ±yÄ± dÃ¼ÅŸÃ¼rmelidir.

**176 dosya Â· 1458 error Â· 1334 advisory warning**

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
| `ARBITRARY_TEXT_SIZE` (warn) | **1242** | 0 â†’ sonra `error` |
| `NATIVE_TABLE` (warn) | **61** | 0 â†’ sonra `error` |
| `INLINE_STYLE_PROP` (warn) | **31** | 0 â†’ sonra `error` |
| Elle yazÄ±lmÄ±ÅŸ `fixed inset-0` overlay | 156 | ~0 (allowlist dÄ±ÅŸÄ±) |
| Elle yazÄ±lmÄ±ÅŸ `*Modal` / `*Drawer` bileÅŸeni | ~60 | ~0 |
| `packages/ui` primitif sayÄ±sÄ± | 21 | 33+ |
| CI workflow | yok | 1 |

En Ã§ok ihlal veren dosyalar: `vehicles/page.tsx` (191), `portal/[token]/PortalClient.tsx` (114), `projects/[projectId]/page.tsx` (102), `recruitment/page.tsx` (75), `promotions/page.tsx` (69), `messages/page.tsx` (67).

> **Not:** `VIOLET` 924 ve `ARBITRARY_TEXT_SIZE` 1242 â€” iÅŸin aÄŸÄ±rlÄ±ÄŸÄ± burada. Renk tarafÄ± tahmin edilenden **bÃ¼yÃ¼k**, keyfi tipografi ise tek baÅŸÄ±na en bÃ¼yÃ¼k tekil kalem.

---

# Program A â€” Tek Design System (Faz 0 â†’ 7)

Her faz; **faz sonu Ã¶zet + onay** ile ilerler. Her faz ayrÄ± commit'tir (`crm-monorepo` / `master`).

**Faz kabul kriteri (hepsi):** `npm exec -- ultracite fix` â†’ `tsc --noEmit` â†’ `next build` â†’ `guard:crm-ui:full` (faz kapsamÄ±nda **0 error**) â†’ etkilenen kritik akÄ±ÅŸlarÄ±n elle duman testi. **Fail = STOP.** Auto-fix / bulk-sed yok.

---

## [x] Faz 0 â€” Zemin (dokÃ¼man + token + guard severity katmanÄ±) â€” **TAMAMLANDI**

**Kabul kriteri: typecheck + build geÃ§er, hiÃ§bir ekran gÃ¶rsel olarak deÄŸiÅŸmez.**

- [x] `docs/design-system.md` (440 satÄ±r) â†’ [`crm-ui-standards.md`](crm-ui-standards.md)'ye yÃ¶nlendiren redirect stub (silme yok, dÄ±ÅŸ baÄŸlantÄ±lar korunur)
- [x] KÃ¶kteki `design.md` (203 satÄ±r) â†’ aynÄ± ÅŸekilde redirect stub
- [x] `crm-ui-standards.md` gÃ¼ncellenir: Â§1.3 tipografi Ã¶lÃ§eÄŸi (`text-2xs`/`text-3xs`, 9px kaldÄ±rÄ±ldÄ±), Â§1.4 baÄŸlayÄ±cÄ± kÄ±sÄ±tlar, Â§2 primitif geniÅŸleme notu + "packages/ui kazanÄ±r", **Â§2.1 Kanonik Sayfa KabuÄŸu**, ADR-0004 referansÄ±
- [x] `crm-ui-guard.mjs`: **`severity` katmanÄ±** eklendi (`error` varsayÄ±lan â†’ mevcut 9 kural etkilenmedi; hata sayÄ±sÄ± 1458'de sabit kaldÄ±)
- [x] `crm-ui-guard.mjs`: 3 yeni kural `warn` olarak eklendi â€” `ARBITRARY_TEXT_SIZE` (1242), `NATIVE_TABLE` (61), `INLINE_STYLE_PROP` (31)
- [x] `crm-ui-guard.README.md`: severity tablosu, Ã¶lÃ§Ã¼len taban, rulesâ†’fix map, `apps/ecommerce` hayalet notu
- [x] `guard:crm-ui:full` ihlal sayÄ±larÄ± Ã¶lÃ§Ã¼lÃ¼p yukarÄ±daki tabloya iÅŸlendi
- [x] Fixture'lar doÄŸrulandÄ±: `dirty.tsx` exit 1 Â· `clean.tsx` exit 0 Â· scoped kapÄ± **PASS**
- [x] `globals.css`: **tipografi token'larÄ±** â€” `--text-2xs` (11px) + `--text-3xs` (10px), Tailwind'in `--text-*--line-height` deseniyle
- [x] `globals.css`: **motion token'larÄ±** â€” `--ease-crm` + `--ease-crm-in-out`. Duration token deÄŸil, **deÄŸer** olarak standartlaÅŸtÄ±rÄ±ldÄ± (Â§1.5)
- [x] `crm-ui-standards.md` Â§1.5 Motion eklendi (easing token'larÄ± + duration deÄŸerleri + `prefers-reduced-motion` zorunluluÄŸu)
- [x] `tsc --noEmit` + `next build` doÄŸrulamasÄ± geÃ§ti (typecheck 2/2, build 2/2, 52 rota)
- [x] Scoped kapÄ± doÄŸrulandÄ±: **0 error / 18 dosya â†’ PASS**

> **âœ… Ã‡Ã¶zÃ¼len sapma 1 â€” `--duration-*` yerine duration deÄŸerleri.** Tailwind **4.3.3**'te `--duration-*` theme namespace'i yok (kanÄ±tlandÄ±: dist iÃ§inde hiÃ§ geÃ§miyor). Ã–lÃ¼ token yazmak yerine easing'ler token'landÄ± (`--ease-crm`), duration'lar standartta **deÄŸer** olarak sabitlendi (`duration-150` / `200` / `250`). ADR-0004 Â§5 bu gerÃ§eÄŸe gÃ¶re dÃ¼zeltildi.
>
> **âœ… Ã‡Ã¶zÃ¼len sapma 2 â€” `SCOPE` listesi Faz 7'ye taÅŸÄ±ndÄ±.** Ã–lÃ§Ã¼m: scoped kapÄ± 0 hata / 18 dosya â†’ **PASS**, `--full` 1458 hata â†’ FAIL. `SCOPE` Faz 0'da kaldÄ±rÄ±lsaydÄ± varsayÄ±lan mod `--full` olur ve **Program A boyunca hiÃ§ regresyon kapÄ±sÄ± kalmazdÄ±**. ADR-0004 Â§9 bu dÃ¼zeltmeyle gÃ¼ncellendi.
>
> **âœ… Ã‡Ã¶zÃ¼len sapma 3 â€” kÃ¶k dizin sÃ¼rÃ¼m kontrolÃ¼ne alÄ±ndÄ±.** `D:\serhatdev\crm` bir git deposu **deÄŸildi**; yani bu yol haritasÄ±, ADR-0004 ve kanonik standart sÃ¼rÃ¼m kontrolsÃ¼zdÃ¼ (geri alma/geÃ§miÅŸ yok). Faz 0'da kÃ¶kte `git init` yapÄ±ldÄ±, `crm-monorepo/` `.gitignore`'a alÄ±ndÄ±. AyrÄ±ntÄ±: ADR-0004 Â§11.


## [x] Faz 1 â€” Eksik primitif katmanÄ± â€” **TAMAMLANDI**

`shadcn` CLI (stil `radix-luma`) ile eklendi, ardÄ±ndan house stiline uyarlandÄ±. **21 â†’ 32 primitif.**

- [x] `dialog` (155 satÄ±r) â€” ~60 modalÄ±n ve 156 overlay'in yerini alacak
- [x] `alert-dialog` (184 satÄ±r) â€” yÄ±kÄ±cÄ±/Ã¶nemli onaylar
- [x] `sheet` (134 satÄ±r) â€” drawer / yan panel
- [x] `dropdown-menu` (251 satÄ±r)
- [x] `popover` (79 satÄ±r)
- [x] `switch` (29 satÄ±r)
- [x] `radio-group` (39 satÄ±r)
- [x] `progress` (27 satÄ±r)
- [x] `separator` (24 satÄ±r)
- [x] `scroll-area` (50 satÄ±r)
- [x] `alert` (69 satÄ±r) â€” CLI'dan alÄ±ndÄ± (CVA-only, Base UI yok); elle yazmaya gerek kalmadÄ±
- [ ] `confirm-dialog`'Ä±n `AlertDialog` temeline taÅŸÄ±nmasÄ± + `rounded-3xl` â†’ `rounded-xl` normalizasyonu â†’ **Faz 3'e taÅŸÄ±ndÄ±**
- [ ] `tooltip` tÃ¼keticileri standarda baÄŸlanÄ±r â†’ **Faz 3'e taÅŸÄ±ndÄ±** (tÃ¼ketici iÅŸi)

**Kabul kriteri â€” hepsi geÃ§ti:** typecheck 2/2 Â· build 2/2 (52 rota) Â· `guard:crm-ui` 0 error â†’ PASS Â· `apps/web`'de 11 yeni primitifin **tÃ¼keticisi 0** Â· primitif sayÄ±sÄ± 32 Â· `rounded-4xl` 0 Â· `from "cn"` 0.

> **âš ï¸ Faz 1 bulgusu 1 â€” CLI `button.tsx`'i ezmek istedi.** `dialog`/`alert-dialog`/`sheet` baÄŸÄ±mlÄ±lÄ±k olarak `button` Ã§ekiyor ve CLI onu registry sÃ¼rÃ¼mÃ¼yle deÄŸiÅŸtirmeyi teklif etti. Registry sÃ¼rÃ¼mÃ¼ `rounded-lg` yerine **`rounded-4xl`** kullanÄ±yor â€” Â§1.1'in yasakladÄ±ÄŸÄ± hap form. OnaylansaydÄ± **52 ekrandaki tÃ¼m butonlar** bozulurdu. Teklif reddedildi; zincir tÄ±kanÄ±nca dosya geÃ§ici kenara alÄ±nÄ±p CLI Ã§alÄ±ÅŸtÄ±rÄ±ldÄ±, sonra `git checkout` ile geri alÄ±ndÄ±. **`git diff` boÅŸ â†’ `button.tsx` iÃ§erik olarak deÄŸiÅŸmedi** (hash farkÄ± yalnÄ±zca CRLF).
>
> **âš ï¸ Faz 1 bulgusu 2 â€” CLI yanlÄ±ÅŸ npm baÄŸÄ±mlÄ±lÄ±ÄŸÄ± kurdu.** Ãœretilen 11 dosyada `import { cn } from "cn"` yazdÄ± ve `packages/ui/package.json`'a **`cn@^0.3.0`** ekledi. 8 dosyada import `@workspace/ui/lib/utils`'e dÃ¼zeltildi; baÄŸÄ±mlÄ±lÄ±k kaldÄ±rÄ±ldÄ±, `npm install` ile lock senkronlandÄ± â†’ `package.json` ve `package-lock.json` **HEAD ile birebir aynÄ±**. Aksi halde 8 bileÅŸen bir, 21 bileÅŸen baÅŸka kÃ¼tÃ¼phane kullanacaktÄ±.
>
> **â„¹ï¸ Faz 1 bulgusu 3 â€” `confirm-dialog.tsx` standart dÄ±ÅŸÄ±:** paneli `rounded-3xl`. Â§1.1 konteynerler iÃ§in `rounded-lg`/`rounded-xl` diyor. Yeni paneller **standarta gÃ¶re** `rounded-xl` yapÄ±ldÄ± (legacy kod deÄŸil, standart otorite â€” ADR-0004 Â§3). `ConfirmDialog` normalizasyonu Faz 3'e taÅŸÄ±ndÄ±.
>
> **âœ… Temiz Ã§Ä±kanlar:** dekoratif gradient/blur/hex/keyfi shadow **yok**; `blur` kullanÄ±mlarÄ± yalnÄ±zca `supports-backdrop-filter:backdrop-blur-sm` (fonksiyonel backdrop, yasaklÄ± dekoratif kÃ¼re deÄŸil). Radius'lar house daÄŸÄ±lÄ±mÄ± iÃ§inde (`rounded-2xl` 9Ã—, `rounded-3xl` 1Ã— zaten mevcut).
>
> **ğŸ“Œ ProsedÃ¼r kalÄ±cÄ±laÅŸtÄ±rÄ±ldÄ±:** `crm-ui-standards.md` **Â§2.1 Primitif Ekleme ProsedÃ¼rÃ¼** â€” doÄŸru CLI komutu + iki tuzak + her yeni primitif iÃ§in uyarlama kontrol listesi.

**Not:** TÃ¼m yeni primitifler `--radius` tabanlÄ± yuvarlaklÄ±k, semantic token ve motion tokenlÄ± giriÅŸ/Ã§Ä±kÄ±ÅŸ kullanÄ±r. `accordion` ve `calendar` **eklenmedi** (gerÃ§ek tÃ¼ketici yok â€” Gelecek AdÄ±mlar'da).

## [~] Faz 2 â€” Kanonik sayfa kabuÄŸu (52 ekran) â€” **DEVAM EDÄ°YOR (21/52)**

- [x] **`page-container.tsx`** â€” `px-4 py-5` / `md:px-6 md:py-6`, tam geniÅŸlik, `bleed` varyantÄ± (full-bleed yÃ¼zeyler iÃ§in)
- [x] **`page-header.tsx`** â€” `title` / `description` / `badge` / `actions` slotlarÄ±
- [x] **Dashboard layout** â€” padding kaldÄ±rÄ±ldÄ± (`p-3.5 pb-24 sm:p-5 md:p-6` â†’ `pb-24 md:pb-0`); mobil bottom-nav payÄ± korundu
- [x] **Admin layout** â€” padding + `mx-auto max-w-7xl` kaldÄ±rÄ±ldÄ± (tam geniÅŸlik kararÄ±)
- [x] **YanlÄ±ÅŸ Hallmark baÅŸlÄ±klarÄ± dÃ¼zeltildi** (dokunulan dosyalarda) â€” `design.md` referansÄ± ve `theme: Zinc/Violet` iddiasÄ± kaldÄ±rÄ±ldÄ±
- [x] Sarmalanan 10 sayfa:
  - `customers` (pilot â€” `PageHeader`'a da geÃ§irildi, `text-[11px]` â†’ **`text-2xs`** token'Ä± ilk kez kullanÄ±ldÄ±)
  - `analytics` (legacy Ã§ift-padding kanÄ±tÄ±: `space-y-6 p-4 sm:p-6 lg:p-8` â†’ `PageContainer`, sayfa kendi padding'ini bÄ±raktÄ±)
  - `field-service`, `roles`, `users`, `pipelines`, `orders`, `leaves`, `(admin)/admin/templates`, `(admin)/admin/tenants`
- [ ] Kalan **42 sayfa**

### âœ… Yan doÄŸrulama: tipografi token'Ä± iÅŸlevsel

`text-2xs` Ã¼retilen CSS'te doÄŸrulandÄ± â€” Faz 0 token'Ä±nÄ±n gerÃ§ekten Ã§alÄ±ÅŸtÄ±ÄŸÄ±nÄ±n kanÄ±tÄ±:
```css
.text-2xs{font-size:.6875rem;line-height:var(--tw-leading,1rem)}   /* 11px */
```
Bu, `ARBITRARY_TEXT_SIZE`'Ä±n ileride `error`'a terfi edebileceÄŸini gÃ¶sterir (kural artÄ±k uygulanabilir bir alternatife sahip).

### âš ï¸ Teknik not â€” kapanÄ±ÅŸ etiketi "son eÅŸleÅŸme" ile bulunamaz

Faz 2'de bu tuzaÄŸa **fiilen dÃ¼ÅŸÃ¼ldÃ¼** ve typecheck yakaladÄ± (`TS17002`, 2 dosya). KÃ¶k neden: sayfa dosyalarÄ± **tek dosyada birden fazla component** barÄ±ndÄ±rÄ±yor (`leaves/page.tsx` â†’ `LeavesPage` + `CreateLeaveModal`; `orders/page.tsx` â†’ `OrdersPage` + `CreateOrderWizardModal`). Her ikisi de aynÄ± girinti seviyesinde.

Sezgisel bir dÃ¶nÃ¼ÅŸÃ¼m "dosyadaki son `</div>` + `);` + `}`"i ararsa **ikinci component'i** yakalar ve sayfa kÃ¶kÃ¼ kapanmadan kalÄ±r. `div` sayÄ±mÄ± dengeli gÃ¶rÃ¼nÃ¼r (1 aÃ§ / 1 kapa) Ã§Ã¼nkÃ¼ hata *sayÄ±da* deÄŸil *kapsamda*dÄ±r.

**Kural:** kapanÄ±ÅŸ etiketi **yapÄ±sal** olarak bulunur â€” sayfa component'inin `return (` bloÄŸunun gerÃ§ek sonu, yani bir sonraki `function <Ad>(` satÄ±rÄ±ndan hemen Ã¶nceki `);` + `}` bloÄŸu. **Her batch'ten sonra `tsc` zorunludur**; hata bu sayede commit'ten Ã¶nce yakalandÄ±.

### âš ï¸ Teknik not 2 â€” kÃ¶k eleman yÃ¼zeyde gÃ¶rÃ¼ndÃ¼ÄŸÃ¼ gibi deÄŸil

Kategori A'nÄ±n "en mekanik" sayfasÄ± bile varsayÄ±mÄ± kÄ±rdÄ±: `customers/[customerId]/page.tsx`'te **ilk `<div className="space-y-6">` sayfanÄ±n kÃ¶kÃ¼ deÄŸil**, `if (loading)` dalÄ±nÄ±n skeleton sarmalayÄ±cÄ±sÄ±. GerÃ§ek kÃ¶k 249. satÄ±rda. Bu sayfa **iki dÃ¶nÃ¼ÅŸ noktasÄ±** taÅŸÄ±yor ve **ikisi de** sarmalandÄ± â€” aksi halde yÃ¼kleme durumu farklÄ± boÅŸlukta gÃ¶rÃ¼nÃ¼rdÃ¼.

Ders: kÃ¶k eleman, component'in `return (` bloÄŸuna *yapÄ±sal olarak* baÄŸlÄ±dÄ±r ve sayfa baÅŸÄ±na doÄŸrulanmalÄ±dÄ±r. Bu yÃ¼zden toplu script bu iÅŸ iÃ§in emekliye ayrÄ±ldÄ±; sayfalar kanÄ±tlanmÄ±ÅŸ satÄ±r numaralarÄ±yla elle sarmalanÄ±yor.

### Faz 2 sayfa haritasÄ± (kalan 31)

| Kategori | Sayfalar | Not |
| --- | --- | --- |
| âœ… **A. `space-y-*` kÃ¶kÃ¼ â€” TAMAMLANDI** | `customers/[customerId]`, `shipments`, `payroll`, `projects`, `vehicles`, `[tenantSlug]/page`, `(admin)/admin/page` | Beklenenden zor: kÃ¶k eleman sayfa baÅŸÄ±na doÄŸrulanmalÄ± (Teknik not 2) |
| âœ… **B. Legacy Ã§ift-padding / max-width â€” TAMAMLANDI** | `inventory`, `contracts`, `settings`, `promotions/new` | Ã‡ift padding kaldÄ±rÄ±ldÄ±; form ekranlarÄ±nÄ±n `max-width`'i **istisna olarak korundu** (Â§2.2) |
| âœ… **C. Sayfa-seviyesi kart sarmalayÄ±cÄ± â€” TAMAMLANDI (kategori dÃ¼zeltmesiyle)** | `finance`, `invoices` | **YanlÄ±ÅŸ sÄ±nÄ±flandÄ±rÄ±lmÄ±ÅŸtÄ±:** kÃ¶kleri kart deÄŸil, `space-y-6 p-4 sm:p-6 lg:p-8` (analytics deseni). `Card` dÃ¶nÃ¼ÅŸÃ¼mÃ¼ gerekmedi |
| **D. Full-bleed adaylarÄ±** | `messages`, `calendar`, `orders/[orderId]/print`, `(auth)/login`, `(auth)/register`, `portal/[token]`, `quotes/view/[token]`, `/pipelines`, `/quotes`, `/` | Ã‡ok dÃ¶nÃ¼ÅŸlÃ¼ (loading/error/ana) â€” yÃ¼zey baÅŸÄ±na dikkat |
| **E. `Suspense` sarmalayÄ±cÄ±** | `organization`, `recruitment` | Suspense sÄ±nÄ±rÄ±nÄ±n iÃ§ine |
| **F. Ä°ncelenmesi gereken** | `attendance`, `email`, `automations`, `automations/[workflowId]`, `products`, `products/[productId]`, `promotions`, `promotions/[campaignId]/edit`, `quotes`, `tickets`, `tickets/[ticketId]`, `webhooks`, `webhooks/[endpointId]`, `compliance` | Ä°lk `return` iÃ§ fonksiyona ait Ã§Ä±ktÄ± â†’ elle bakÄ±lacak |

**SÄ±ra:** A â†’ B â†’ C â†’ D â†’ E â†’ F. Her yÃ¼zey (dashboard / admin / auth / portal) bitince typecheck + build + duman testi; her batch ayrÄ± commit.

### ğŸ“Œ KalÄ±cÄ± borÃ§: 391 dosyada Hallmark imzasÄ±

Kod tabanÄ±nda **391 dosya** `Hallmark Â· theme: Adaptive Zinc/Violet Â· design-system: design.md` baÅŸlÄ±ÄŸÄ± taÅŸÄ±yor. Dokunulan dosyalarda dÃ¼zeltiliyor; kalanÄ± mekanik bir temizlik iÅŸi olarak Gelecek AdÄ±mlar'a eklendi.

## [ ] Faz 3 â€” Modal & overlay gÃ¶Ã§Ã¼ (~60 modal, 156 overlay)

- [ ] Elle yazÄ±lmÄ±ÅŸ modallar â†’ `Dialog` / `Sheet` / `ConfirmDialog`
- [ ] Panel stilinin 4 varyantÄ± (`rounded-lg` / `rounded-xl` / `rounded-2xl` / `rounded-3xl`) tek standarda iner
- [ ] A11y kazanÄ±mÄ±: focus trap, `Esc`, `aria-modal` (primitiflerden gelir)
- [ ] Motion: tek kanonik giriÅŸ/Ã§Ä±kÄ±ÅŸ, `prefers-reduced-motion`
- [ ] `delete-customer-dialog` gibi `ConfirmDialog`'Ä± yok sayan yeniden yazÄ±mlar temizlenir
- [ ] **`confirm-dialog.tsx`'in `AlertDialog` temeline taÅŸÄ±nmasÄ±** + panelinin `rounded-3xl` â†’ `rounded-xl` normalize edilmesi (Faz 1'den taÅŸÄ±ndÄ± â€” Â§1.1 ihlali)
- [ ] **`tooltip` tÃ¼keticilerinin standarda baÄŸlanmasÄ±** (Faz 1'den taÅŸÄ±ndÄ± â€” tÃ¼ketici iÅŸi)
- [ ] Dokunulan her sayfada UI parÃ§alarÄ± `_components/` altÄ±na Ã§Ä±karÄ±lÄ±r (ADR-0003 kuralÄ±)

## [ ] Faz 4 â€” Renk disiplini (yÃ¼zey yÃ¼zey)

- [ ] Auth + admin + portal yÃ¼zeyleri (`slate-*` + hex yoÄŸunluÄŸu burada)
- [ ] Dashboard: customer-detail, recruitment, roles, settings, contracts, finance, invoices, messages (`violet`/`fuchsia` â†’ `blue`)
- [ ] `slate-*` â†’ `zinc-*`, `violet`/`fuchsia`/â€¦ â†’ `blue-500` skalasÄ±
- [ ] Keyfi hex + inline `style` â†’ semantic token
- [ ] Widget'lardaki sabit hex â†’ `--chart-*` tokenlarÄ±
- [ ] Print/e-posta HTML string'leri: **allowlist'te aÃ§Ä±kÃ§a kayÄ±tlÄ±** istisna (e-posta istemcileri `oklch`/CSS deÄŸiÅŸkeni desteklemez)

## [ ] Faz 5 â€” Tablo & form *gÃ¶rÃ¼nÃ¼m* standardÄ±

**Motor gÃ¶Ã§Ã¼ yoktur** â€” elle yazÄ±lmÄ±ÅŸ tablolar/kanban/filtreler kalÄ±r, yalnÄ±zca gÃ¶rÃ¼nÃ¼mleri `@workspace/ui` primitiflerine baÄŸlanÄ±r.

- [ ] `Table`, `Badge`, `Button`, `EmptyState`, `Skeleton` kullanÄ±mÄ±na geÃ§iÅŸ
- [ ] `Input` / `SelectField` / `Combobox` / `DatePicker` / `DateRangePicker` / `NumberInput` / `PhoneInput` standardÄ± (ADR-0002) her ekranda
- [ ] Native `<select>`, `type=date`, `type=number` â†’ **0**
- [ ] Kart/panel arka planlarÄ±nÄ±n tek dile inmesi (`bg-card` + `border-border`; `bg-white dark:bg-zinc-900` ve `border-zinc-200` karÄ±ÅŸÄ±mÄ± biter)

## [ ] Faz 6 â€” Cila (motion + a11y + terim sÃ¶zlÃ¼ÄŸÃ¼)

- [ ] Motion token'larÄ± tÃ¼m overlay/geÃ§iÅŸlerde tutarlÄ±
- [ ] a11y checklist dokunulan her ekranda uygulanÄ±r
- [ ] TÃ¼rkÃ§e terim sÃ¶zlÃ¼ÄŸÃ¼ hazÄ±rlanÄ±r ve dokunulan ekranlarda uygulanÄ±r
- [ ] KalÄ±cÄ± Playwright smoke testleri: login, mÃ¼ÅŸteri listesi, mÃ¼ÅŸteri detayÄ±, pipeline, teklif, admin

## [ ] Faz 7 â€” SertleÅŸtirme (geri dÃ¶nÃ¼ÅŸsÃ¼z)

- [ ] `guard:crm-ui:full` **kÄ±rÄ±cÄ±** gate olur (exit 0'a ulaÅŸtÄ±ktan sonra)
- [ ] Yeni kurallar **uyarÄ±dan kÄ±rÄ±cÄ±ya** terfi eder: `ARBITRARY_TEXT_SIZE`, `NATIVE_TABLE`, `INLINE_STYLE_PROP` â†’ `severity: "error"`
- [ ] **CI workflow eklenir** (bugÃ¼n `.github/` hiÃ§ yok â€” `.scratch/` dÄ±ÅŸÄ±nda hiÃ§bir pipeline dosyasÄ± mevcut deÄŸil)
- [ ] **`SCOPE` listesi emekliye ayrÄ±lÄ±r** â€” buraya taÅŸÄ±ndÄ± (Faz 0'dan). GerekÃ§e: scoped liste, `--full` temizlenene kadar **tek Ã§alÄ±ÅŸan regresyon kapÄ±sÄ±**. Erken kaldÄ±rmak Program A boyunca korumayÄ± sÄ±fÄ±rlar. Bkz. ADR-0004 Â§9 dÃ¼zeltmesi
- [ ] `crm-ui-guard.README.md` ve ADR-0004, `SCOPE`'un kaldÄ±rÄ±ldÄ±ÄŸÄ± nihai duruma gÃ¶re gÃ¼ncellenir

---

# Program B â€” Registry ZenginleÅŸtirme âŒ Ä°PTAL

Karar: **`reui`, `beUI` ve `Aceternity` registry'leri eklenmez.** GerekÃ§e [`ADR-0004`](adr/0004-crm-design-system-enforcement.md) Â§2: reui'nin iÅŸe yarayan bileÅŸenlerinin tamamÄ± `@base-ui/react` istiyor; Radix ile birlikte ikinci bir headless foundation doÄŸurur. AyrÄ±ca tablo/kanban/filtre motorlarÄ±nÄ± deÄŸiÅŸtirmek, onlarÄ± olduÄŸu yerde standartlaÅŸtÄ±rmaktan **daha pahalÄ±dÄ±r**.

Bu karar aÅŸaÄŸÄ±dakileri kapsar ve yeniden aÃ§Ä±lmaz (yeni ADR gerekir):

- `data-grid`, `kanban`, `filters`, `gantt`, `event-calendar`, `cascader`, `tree`, `sortable`, `number-field`, `autocomplete`, `stepper`, `timeline` â†’ **alÄ±nmaz**
- Registry config'i (`components.json` â†’ `registries`) **boÅŸ kalÄ±r** (doÄŸrulandÄ±: bugÃ¼n hiÃ§ third-party registry yok)

---

# Program C â€” Opsiyonel / KayÄ±t AltÄ±nda (yapÄ±lmayacak)

- **Aceternity / beUI** â€” CRM ekranlarÄ±nda **yasak**. Dekoratif bileÅŸenleri `crm-ui-standards.md` Â§1.2 anti-AI-slop kuralÄ±na aykÄ±rÄ±; beUI'nin motion katmanÄ± Â§9 "dekoratif animasyon yok" kararÄ±yla gereksiz. Ä°leride bir **pazarlama/landing yÃ¼zeyi** doÄŸarsa, lisansÄ± teyit edilerek ayrÄ±ca deÄŸerlendirilir. **ParalÄ± plan kullanÄ±lmayacaktÄ±r.**
- **`--space-*` Ã¶lÃ§eÄŸi** (kÃ¶kteki `design.md`'den) â€” spacing token ihtiyacÄ± somutlaÅŸÄ±rsa deÄŸerlendirilir. BugÃ¼n reddedilmiÅŸtir.
- **Hue 270 / Geist tipografisi** (kÃ¶kteki `design.md`'den) â€” reddedildi. Kod hue 260 + Inter/Playfair kanoniktir; hue deÄŸiÅŸimi tÃ¼m ekranlarÄ±n yeniden temalanmasÄ± demektir.

---

# Gelecek AdÄ±mlar (Ertelenen Ä°ÅŸler)

Bu program tamamlandÄ±ktan sonra ele alÄ±nacak. Kendi baÅŸÄ±na proje olan maddeler iÃ§in `.scratch/` altÄ±nda issue aÃ§Ä±labilir.

### Kendi baÅŸÄ±na proje
1. **Monolit sayfa ayrÄ±ÅŸtÄ±rmasÄ±** â€” `quotes` (~5.000 satÄ±r), `vehicles` (~4.900), `recruitment` (~3.200), `shipments` (~2.650), `organization` (~2.500), `payroll` (~2.400), `attendance` (~2.350), `messages` (~1.900), `finance` (~1.900) â†’ 300 satÄ±r kuralÄ± + `_components/` mimarisine tam geÃ§iÅŸ
2. **GÃ¶rsel regresyon altyapÄ±sÄ±** â€” Playwright screenshot testleri + (opsiyonel) Storybook
3. **Tam a11y denetimi** â€” 52 ekranÄ±n tamamÄ±, primitif gÃ¶Ã§Ã¼nÃ¼n Ã¶tesinde kalan elle yazÄ±lmÄ±ÅŸ etkileÅŸimler

### Teknik borÃ§ (kÃ¼Ã§Ã¼k/orta)
4. **Dark-mode ekran taramasÄ±** â€” token'lar hazÄ±r, her ekranÄ±n dark'ta doÄŸru gÃ¶rÃ¼ndÃ¼ÄŸÃ¼nÃ¼n denetimi
5. **Mikro kopya tam geÃ§iÅŸi** â€” TÃ¼rkÃ§e terim sÃ¶zlÃ¼ÄŸÃ¼nÃ¼n 52 ekranda eksiksiz uygulanmasÄ±
6. **`email-preview.ts` Ã§ift paletinin kaldÄ±rÄ±lmasÄ±** â€” paylaÅŸÄ±lan tek "token â†’ hex" Ã§eviriciye indirgeme
7. **`apps/ecommerce` hayalet referanslarÄ±nÄ±n temizliÄŸi** â€” var olmayan bu uygulama `crm-ui-guard.mjs`, `ADR-0002` ve `docs/design-system.md`'de anÄ±lÄ±yor
8. **`design.md` ve `docs/design-system.md` stub'larÄ±nÄ±n tamamen kaldÄ±rÄ±lmasÄ±** â€” dÄ±ÅŸ referans teyidi sonrasÄ±
9. **BoÅŸ `packages/ui/src/hooks/` export'unun kaldÄ±rÄ±lmasÄ±** â€” `package.json`'da `"./hooks/*"` tanÄ±mlÄ± ama klasÃ¶r boÅŸ
10. **`apps/web/components/phone-input.tsx` shim'inin kaldÄ±rÄ±lmasÄ±** â€” import'lar doÄŸrudan `@workspace/ui/components/phone-input`'a
11. **Z-index Ã¶lÃ§eÄŸi** â€” `z-[60]`, `z-[70]`, `z-60` keyfi deÄŸerleri iÃ§in katmanlÄ± token'lar
12. **`--chart-*` tokenlarÄ±nÄ±n kullanÄ±mÄ±** â€” `lead-sources-widget`, `sales-gauge-widget` ÅŸu an hex sabit
13. **`accordion` ve `calendar` primitifleri** â€” gerÃ§ek tÃ¼ketici doÄŸduÄŸunda
14. **`apps/web/components/` kÃ¶kÃ¼ndeki 14 cross-feature widget'Ä±n gÃ¶zden geÃ§irilmesi** â€” hangileri gerÃ§ekten paylaÅŸÄ±lan, hangileri rota altÄ± `_components/`'e taÅŸÄ±nmalÄ±
15. **`lucide-react ^1.32.0` sÃ¼rÃ¼m pininin doÄŸrulanmasÄ±** â€” alÄ±ÅŸÄ±lmadÄ±k bir pin
16. **391 dosyadaki Hallmark imzasÄ±nÄ±n temizliÄŸi** â€” `Hallmark Â· theme: Adaptive Zinc/Violet Â· design-system: design.md` baÅŸlÄ±klarÄ±. Dokunulan dosyalarda dÃ¼zeltiliyor; kalanÄ± mekanik temizlik. Referans verdikleri dokÃ¼man artÄ±k stub olduÄŸu iÃ§in sessizce yanÄ±ltÄ±cÄ±lar

---

## Ä°lerleme GÃ¼nlÃ¼ÄŸÃ¼

| Tarih | Faz | Not |
|---|---|---|
| 2026-09-15 | â€” | Oturum kuruldu: 33 karar, Program B iptal, ADR-0004 yazÄ±ldÄ± |
| 2026-09-15 | Faz 0 | Redirect stub'lar yazÄ±ldÄ± (`design-system.md` 440â†’~35 satÄ±r, `design.md` 203â†’~40 satÄ±r) |
| 2026-09-15 | Faz 0 | Kanonik standart gÃ¼ncellendi: Â§1.3 tipografi Ã¶lÃ§eÄŸi, Â§1.4 baÄŸlayÄ±cÄ± kÄ±sÄ±tlar, Â§2.1 sayfa kabuÄŸu |
| 2026-09-15 | Faz 0 | Guard'a `severity` katmanÄ±: 3 yeni advisory kural. **Hata sayÄ±sÄ± 1458'de sabit kaldÄ±** â€” mevcut 9 kural etkilenmedi |
| 2026-09-15 | Faz 0 | Taban Ã¶lÃ§Ã¼ldÃ¼: 176 dosya, 1458 error, 1334 advisory. Scoped kapÄ± **PASS** |
| 2026-09-15 | Faz 0 | **Sapma:** `--duration-*` Tailwind 4.3.3'te yok â†’ bekliyor. **Sapma:** `SCOPE` Faz 7'ye taÅŸÄ±ndÄ± |
| 2026-09-15 | Faz 0 | Motion Ã§Ã¶zÃ¼ldÃ¼: `--ease-crm` + `--ease-crm-in-out` token'landÄ±, duration'lar Â§1.5'te deÄŸer olarak sabitlendi |
| 2026-09-15 | Faz 0 | KÃ¶k dizin **sÃ¼rÃ¼m kontrolÃ¼ne alÄ±ndÄ±** (`git init` + `crm-monorepo/` gitignore). YÃ¶netiÅŸim dokÃ¼manlarÄ± artÄ±k tarihÃ§eli |
| 2026-09-15 | Faz 0 | **FAZ 0 KAPANDI** â€” typecheck 2/2, build 2/2 (52 rota), scoped kapÄ± PASS, hata sayÄ±sÄ± 1458'de sabit |
| 2026-09-15 | Faz 1 | 11 primitif CLI ile eklendi â†’ **21 â†’ 32**. `button.tsx` ezilmedi (git diff boÅŸ) |
| 2026-09-15 | Faz 1 | CLI'Ä±n `cn@^0.3.0` npm baÄŸÄ±mlÄ±lÄ±ÄŸÄ± kaldÄ±rÄ±ldÄ±; 11 dosyada import `@workspace/ui/lib/utils`'e Ã§ekildi. `package.json` + lock HEAD ile aynÄ± |
| 2026-09-15 | Faz 1 | `rounded-4xl` â†’ `rounded-xl` (2 panel, Â§1.1 yasaÄŸÄ±); `ring-3` â†’ `ring-2` (2 dosya) |
| 2026-09-15 | Faz 1 | **FAZ 1 KAPANDI** â€” typecheck 2/2, build 2/2, guard PASS, `apps/web` tÃ¼keticisi 0 |
| 2026-09-15 | Faz 1 | ProsedÃ¼r kalÄ±cÄ±laÅŸtÄ±rÄ±ldÄ±: `crm-ui-standards.md` Â§2.1 (CLI komutu + 2 tuzak + kontrol listesi) |
| 2026-09-15 | Faz 2 | `PageContainer` + `PageHeader` yazÄ±ldÄ±; dashboard ve admin layout'un padding sahipliÄŸi devredildi |
| 2026-09-15 | Faz 2 | 10 sayfa sarmalandÄ± (customers pilotu `PageHeader`'a da geÃ§ti, `text-2xs` ilk kez kullanÄ±ldÄ±) |
| 2026-09-15 | Faz 2 | âœ… `text-2xs` Ã¼retilen CSS'te doÄŸrulandÄ± â†’ tipografi token'Ä± iÅŸlevsel |
| 2026-09-15 | Faz 2 | âš ï¸ **Hata:** sezgisel kapanÄ±ÅŸ-etiketi dÃ¶nÃ¼ÅŸÃ¼mÃ¼ 2 dosyayÄ± kÄ±rdÄ± (`TS17002`); typecheck commit Ã¶ncesi yakaladÄ±. YapÄ±sal eÅŸleÅŸtirmeyle elle dÃ¼zeltildi. Teknik not kaydedildi |
| 2026-09-15 | Faz 2 | Kalan 42 sayfa kategori haritasÄ±yla kayÄ±t altÄ±na alÄ±ndÄ± |
| 2026-09-15 | Faz 2 | âœ… **Kategori A tamamlandÄ±** (7 sayfa) â†’ **17/52**. typecheck 2/2, build 2/2 |
| 2026-09-15 | Faz 2 | âš ï¸ Teknik not 2: `customers/[customerId]`'nin kÃ¶k adayÄ± loading dalÄ±ydÄ± â†’ iki dÃ¶nÃ¼ÅŸ noktasÄ± da sarmalandÄ±. "Mekanik" kategori bile sayfa baÅŸÄ±na doÄŸrulama gerektiriyor |
| 2026-09-15 | Faz 2 | âœ… **Kategori B tamamlandÄ±** (4 sayfa) â†’ **21/52**. `inventory`/`contracts` gerÃ§ek Ã§ift-padding'di; form ekranlarÄ±nÄ±n `max-width`'i istisna olarak belgelendi |
