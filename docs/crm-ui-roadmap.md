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
- [x] Scoped kapı doğrulandı: **0 error / 18 dosya → PASS**

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

## [ ] Faz 2 — Kanonik sayfa kabuğu (52 ekran)

- [ ] `page-container.tsx` — `px-4 py-5` / `md:px-6 md:py-6`, tam genişlik
- [ ] `page-header.tsx` — başlık / açıklama / aksiyonlar
- [ ] 52 sayfanın tamamına uygulanır: dashboard + admin + auth + portal
- [ ] Bugünkü 6 farklı padding varyantı (`p-4 md:p-6`, `p-4 pt-6 md:p-8`, `p-5`, `p-8`, `p-10`, `p-12`) tek değere iner
- [ ] Navigasyon yüzeye özel kalır; başlık/boşluk/tipografi/renk dili ortaklanır

## [ ] Faz 3 — Modal & overlay göçü (~60 modal, 156 overlay)

- [ ] Elle yazılmış modallar → `Dialog` / `Sheet` / `ConfirmDialog`
- [ ] Panel stilinin 4 varyantı (`rounded-lg` / `rounded-xl` / `rounded-2xl` / `rounded-3xl`) tek standarda iner
- [ ] A11y kazanımı: focus trap, `Esc`, `aria-modal` (primitiflerden gelir)
- [ ] Motion: tek kanonik giriş/çıkış, `prefers-reduced-motion`
- [ ] `delete-customer-dialog` gibi `ConfirmDialog`'ı yok sayan yeniden yazımlar temizlenir
- [ ] **`confirm-dialog.tsx`'in `AlertDialog` temeline taşınması** + panelinin `rounded-3xl` → `rounded-xl` normalize edilmesi (Faz 1'den taşındı — §1.1 ihlali)
- [ ] **`tooltip` tüketicilerinin standarda bağlanması** (Faz 1'den taşındı — tüketici işi)
- [ ] Dokunulan her sayfada UI parçaları `_components/` altına çıkarılır (ADR-0003 kuralı)

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
