# ADR-0004: CRM Tek Design System Zorlaması (Tek Foundation, Tek Kanonik Kaynak, Tek Guard)

> Status: **Accepted** | Date: 2026-09-15 | Deciders: Frontend Ekibi, Design System Birleştirme Oturumu
> Kapsam: CRM (`crm-monorepo/apps/web`, `crm-monorepo/packages/ui`) — **`apps/web` içindeki tüm ekranlar**.
> İlgili: [`docs/crm-ui-standards.md`](../crm-ui-standards.md) · [`ADR-0003`](0003-crm-ui-ux-modernization-and-component-architecture.md) · [`ADR-0002`](0002-crm-input-standards.md) · Yol Haritası: [`docs/crm-ui-roadmap.md`](../crm-ui-roadmap.md)

---

## Context

ADR-0002 ve ADR-0003 doğru kararları verdi (zinc+blue, 8px radius, `@workspace/ui` tek kaynak, 300 satır kuralı) **ancak bu kararlar fiilen uygulanmadı**. Ölçüm (2026-09-15):

| Bulgu | Ölçüm |
|---|---|
| Toplam ekran | **52 sayfa**, 3 layout, ~140 `.tsx` (`apps/web`) |
| Paylaşılan primitif | **21 dosya** (`packages/ui/src/components/`) |
| Elle yazılmış overlay | **156** `fixed inset-0` bloğu |
| Elle yazılmış modal/drawer | **~60** ayrı `*Modal` / `*Drawer` bileşeni |
| `slate-*` kullanımı | **279+** (admin, auth, portal, tickets, messages, quotes, roles, settings) |
| `violet`/`fuchsia`/`indigo`/`sky`/… | **300+** (customer-detail, recruitment, contracts, finance, invoices, roles, settings) |
| Keyfi hex | **132** (ayrıca print/e-posta HTML string'lerinde 3. bir palet) |
| Inline `style={{…}}` | **31** |
| Keyfi mikro tipografi | **400+** `text-[9px]` / `[10px]` / `[11px]` |
| ADR-0003'ün 300 satır kuralı | 9 sayfa 1.900–5.000 satır (`quotes` ~5.000, `vehicles` ~4.900) |

**Kök neden renk değil, paylaşılan katmanın delik olması:** `packages/ui`'de `dialog`, `sheet`/`drawer`, `dropdown-menu`, `popover`, `switch`, `radio-group`, `progress`, `separator`, `scroll-area`, `alert`, `alert-dialog` primitifleri **yok**. Bu yüzden her ekran kendi backdrop'ını, panel yuvarlaklığını (`rounded-lg` / `rounded-xl` / `rounded-2xl` / `rounded-3xl` — dördü de mevcut), z-index'ini ve kapatma davranışını yeniden yazdı. `customers/_components/delete-customer-dialog.tsx`, `ConfirmDialog` **mevcut olduğu halde** modalı sıfırdan implemente etti.

**Ayrıca iki yanlış pusula dokümanı** ajanları ve geliştiricileri yanlış sisteme yönlendiriyor:
- `docs/design-system.md` §1–13, bu checkout'ta **var olmayan** bir mağaza sistemi anlatıyor: `--store-*` token'ları, `data-store-theme`, `apps/ecommerce` uygulaması, `packages/ui/src/tokens.json`, `Price` / `StoreBadge` / `StockIndicator` / `QuantityStepper` / `Breadcrumbs` / `Gallery` primitifleri. Hiçbiri mevcut değil.
- Kökteki `design.md`, mevcut kodla **çelişen** bir token seti dayatıyor: hue **270** (`--color-paper/ink/rule/accent`), `--space-*` ölçeği, **Geist** tipografisi. Kod ise hue **260** (`--primary: oklch(0.55 0.22 260)`) ve **Inter** + **Playfair Display** kullanıyor.

Drift'i üreten diğer karar: `crm-monorepo/scripts/crm-ui-guard.mjs` doğru 9 kuralı kodlamış, ancak sert kapısı **elle yazılmış 18 dosyalık bir liste**; `--full` bilgilendirici; ve **CI workflow dosyası hiç yok** (`.github/` mevcut değil). Kapı var, kapıyı tutan yok.

## Decision

### 1. Tek kanonik doküman
`docs/crm-ui-standards.md` **tek kanonik** design system kaynağıdır. `docs/design-system.md` ve kökteki `design.md`, kanonik dokümana yönlendiren **kısa redirect stub**'a indirilir (silinmez — dış bağlantılar kırılmasın). Bir kural yalnızca `crm-ui-standards.md`'de yaşar; başka hiçbir doküman token/renk/font/spacing dayatmaz.

### 2. Radix tek foundation — üçüncü taraf registry yok
**Base UI reddedildi.** `reui` registry'sinin işe yarayan bileşenlerinin tamamı (`data-grid`, `kanban`, `filters`, `gantt`, `event-calendar`, `cascader`, `tree`, `sortable`, `number-field`, `autocomplete`, `stepper`, `timeline`, `badge`) `@base-ui/react` bağımlılığı taşıyor; geriye yalnızca `alert` (CVA-only), `date-selector` (4. bir tarih arayüzü yaratır → ADR-0002 ile çakışır) ve `scrollspy` kalıyor. İki headless foundation'ın tek design system altında yaşaması, uzun vadede ikinci bir sistem doğurur — tam da bu ADR'nin ortadan kaldırdığı şey.

Sonuç: **`reui`, `beUI` ve `Aceternity` registry'leri eklenmez.** Aceternity/beUI'nin dekoratif bileşenleri zaten §1.2 anti-AI-slop kuralıyla yasak; beUI'nin motion katmanı ise §9'daki "dekoratif animasyon yok" kararıyla gereksiz. Bu kayıt yol haritasında **Program C — Opsiyonel** olarak durur (CRM ekranlarında yasak; ileride bir pazarlama yüzeyi doğarsa lisansıyla birlikte değerlendirilir).

### 3. Genel kural: kaynak değil, sonuç
> **Bir bileşenin kaynağı değil, görsel sonucu standarda tabidir.**

Bu ADR'den sonra eklenen her primitif — nereden gelirse gelsin — `--radius: 0.5rem` tabanlı yuvarlaklığa, semantic token kullanımına ve dekorasyonsuzluğa uymak zorundadır. Uymuyorsa house stiline çekilir.

### 4. Eksik primitif katmanı kapatılır (`packages/ui` tek kaynak)
`@workspace/ui/components/*` altına eklenir: `dialog`, `alert-dialog`, `sheet` (drawer), `dropdown-menu`, `popover`, `switch`, `radio-group`, `progress`, `separator`, `scroll-area`, `alert`. Ayrıca `tooltip` tüketicileri standarda bağlanır.

- Ekleme yolu: `shadcn` CLI (stil `radix-luma`) → ardından house stiline uyarlama. Registry karşılığı olmayan bileşen Radix üzerine elle yazılır.
- **`packages/ui` her zaman kazanır:** bir bileşen `packages/ui`'de zaten varsa (ör. `badge`, `phone-input`, `number-input`) dışarıdan ikinci bir kopya alınmaz. `apps/web/components/phone-input.tsx` shim'i bu programda kaldırılır.
- `accordion` ve `calendar` bağımsız primitif olarak **eklenmez** — gerçek tüketicileri yok (`date-picker` kendi takvimini kuruyor ve çalışıyor). İhtiyaç doğduğunda yol haritasından çıkarılır.

### 5. Token eklemeleri (tipografi, motion)
`packages/ui/src/styles/globals.css` içine eklenir; `crm-ui-standards.md` §1.3 buna göre güncellenir.

- **Tipografi:** `--text-2xs` (11px, ikincil/meta) ve `--text-3xs` (10px, mikro etiket). Mevcut `text-[9px]` **10px'e katlanır** — veri yoğun bir CRM'de 9px okunmaz ve üçüncü mikro boyutun işlevi yok. Keyfi `text-[Npx]` bu token'larla guard'da yasaklanabilir hale gelir.
- **Motion:** `--ease-crm` / `--ease-crm-in-out` token'ları. Duration **token değildir** — gerekçesi aşağıda. Overlay'ler için **tek kanonik** giriş/çıkış geçişi; `prefers-reduced-motion` desteği zorunlu. Dekoratif animasyon yok.
- Dark-mode zaten token seviyesinde çalışır (semantic token'lar + `.dark`); dark'a özel ekran taraması bu ADR'nin kabul kriteri değildir (yol haritasında).

> **⚠️ Düzeltme (Faz 0 uygulaması sırasında):** ilk taslakta motion için `--duration-*` token'ları da isteniyordu. **Tailwind 4.3.3'te `--duration-*` diye bir theme namespace'i yoktur** — `node_modules/tailwindcss` içinde hiç geçmez; yalnızca `--ease-*`, `--default-transition-duration` ve `--default-transition-timing-function` vardır. `@theme`'e eklenen bir `--duration-*` hiçbir utility üretmez ve **okunmayan ölü bir değişken** olurdu — tam da bu programın ortadan kaldırdığı şey. Bu yüzden duration **değer** olarak standartlaştırıldı (`duration-150` / `200` / `250`, `crm-ui-standards.md` §1.5), token olarak değil. Easings token'landı çünkü `--ease-*` gerçek bir namespace'tir.

### 6. Kanonik sayfa kabuğu
`page-container.tsx` ve `page-header.tsx` primitifleri eklenir. Kanonik boşluk **`px-4 py-5` / `md:px-6 md:py-6`**, içerik **tam genişlik** (max-width sınırı yok — veri yoğun CRM'de geniş ekranı boşa harcamak ve 4K'da beyaz kenar üretmek yanlış). Bugün kullanılan `p-4 md:p-6`, `p-4 pt-6 md:p-8`, `p-5`, `p-8`, `p-10`, `p-12` varyantları tek değere indirilir.

Kapsam **52 ekranın tamamı**: dashboard + admin + auth + portal. **Navigasyon yüzeye özel kalır** (login ile müşteri listesi aynı navigasyona sahip olmak zorunda değil), ama başlık, boşluk, tipografi ve renk dili ortaktır.

### 7. Kapsam: `apps/web`'in tamamı
52 sayfa, 3 layout, auth/admin/portal yüzeyleri, tüm loading/error/empty state'ler ve tüm modallar bu programın içindedir.

### 8. Monolit ayrıştırma bu programın kapsamı dışındadır
`quotes` (~5.000), `vehicles` (~4.900), `recruitment`, `shipments`, `organization`, `payroll`, `attendance`, `messages`, `finance` sayfalarının 300 satır kuralına göre **baştan ayrıştırılması bu ADR'nin işi değildir** (yol haritasında ayrı bir program olarak kayıtlıdır). Ancak ADR-0003'ün `_components/` kuralı yürürlükte kalır: **dokunulan her sayfada**, o sırada değiştirilen UI birimleri (modal, tablo, form) `_components/` altına çıkarılır — "bulduğundan küçük bırak".

### 9. Guard sertleştirme (kademeli, geri dönüşsüz)
`crm-monorepo/scripts/crm-ui-guard.mjs` genişletilir ve gerçek bir kapıya dönüşür. Guard ikili çalışıyordu (`ihlal var → exit 1`) ve bir "uyarı modu" kavramı yoktu; bu yüzden ilk adım bir **severity** kavramı eklemektir:

1. **`severity` alanı:** `Rule` tipine `severity?: "error" | "warn"` eklenir; **varsayılan `"error"`**, yani mevcut 9 kural hiç etkilenmez. `warn` kuralı ayrı bir `--- advisory ---` bölümünde sayılır ve **exit code'u etkilemez**. Geriye dönük uyumlu — Faz 0 ölçümü doğruladı: hata sayısı severity katmanı eklenmeden önce de sonra da **1458**.
2. **Yeni kurallar `warn` olarak eklenir:** keyfi tipografi (`text-[Npx]`), native `<table>` (ADR §2 zaten yasaklıyor ama guard kontrol etmiyordu), inline `style={{…}}`. Mevcut kurallar korunur (native `<select>`, `type=number|date`, keyfi hex, inline hex, SVG hex, `slate-*`, `violet-*`, `fuchsia-*`).
3. Yeni kural **uyarıdan kırıcıya** terfi eder ancak o kural `guard:crm-ui:full` taramasında temizlendiğinde.
4. **CI workflow eklenir** (bugün `.github/` hiç yok — kapı dosyası var, kapı yok). O ana kadar gate manuel/prosedüreldir.
5. **`SCOPE` listesi en son emekliye ayrılır — Faz 7'de**, `--full` exit 0'a ulaştıktan sonra.

> **⚠️ Düzeltme (Faz 0 uygulaması sırasında yapıldı):** ilk taslakta `SCOPE` listesinin Faz 0'da emekliye ayrılması önerilmişti. Bu **yanlıştı.** Ölçüm: `guard:crm-ui` (scoped) **0 hata / 18 dosya → PASS**, `--full` **1458 hata / 176 dosya → FAIL**. `SCOPE` Faz 0'da kaldırılsaydı varsayılan mod `--full` olur, her çalıştırmada FAIL verirdi ve **Program A boyunca hiçbir regresyon kapısı kalmazdı** — yani 52 ekrana dokunduğumuz süre boyunca koruma sıfırlanırdı. Repo'nun kendi README'si de doğru sıralamayı yazıyor: kapı, temiz bir full sweep'ten **sonra** yükseltilir.

**Faz 0 sonrası ölçülen taban (2026-09-15):** 176 dosya · **1458 error** · **1334 advisory warning**.

| Kural | Severity | Adet |
| --- | --- | --- |
| `VIOLET` | error | 924 |
| `SLATE` | error | 415 |
| `NATIVE_SELECT` | error | 61 |
| `FUCHSIA` | error | 43 |
| `INLINE_HEX_STYLE` | error | 6 |
| `ARBITRARY_HEX` | error | 4 |
| `SVG_PAINT_HEX` | error | 4 (allowlist) |
| `INPUT_NUMBER` | error | 1 |
| `ARBITRARY_TEXT_SIZE` | **warn** | 1242 |
| `NATIVE_TABLE` | **warn** | 61 |
| `INLINE_STYLE_PROP` | **warn** | 31 |

Kabul kriteri her faz için: `guard:crm-ui:full` o fazın ekranlarında **0 error**.

### 10. Doğrulama
Görsel regresyon altyapısı **kurulmaz** (yol haritasında). Faz kabulü: `tsc --noEmit` + `next build` + guard + **etkilenen kritik akışların elle duman testi** (login, müşteri listesi, müşteri detayı, pipeline, teklif, admin). Cila fazında kalıcı Playwright smoke testleri eklenir.

### 11. Teslim biçimi ve sürüm kontrolü
Faz faz. Her faz sonunda özet + onay. Her faz ayrı commit olarak geri alınabilir.

**Sürüm kontrolü (Faz 0'da kuruldu):** iki ayrı depo, iki ayrı tarihçe:

| Depo | Ne izler | Not |
| --- | --- | --- |
| `crm-monorepo/` | Uygulama kodu + `scripts/crm-ui-guard.*` + `packages/ui` | Mevcut `master` |
| `D:\serhatdev\crm` (kök) | **Yönetişim katmanı**: `docs/`, `AGENTS.md`, `design.md`, `biome.jsonc`, `.scratch/`, `.agents/` | Faz 0'da `git init` ile kuruldu; `crm-monorepo/` `.gitignore`'da (iç içe depo tuzağından kaçınmak için) |

> **Neden gerekliydi:** Faz 0'a kadar kök dizin **hiçbir sürüm kontrolünde değildi** — yani bu ADR, yol haritası ve kanonik standart sürüm kontrolsüzdü; geri alma, geçmiş ve diff yoktu. "Her faz commit edilebilir" iddiası kod için doğruydu, dokümanlar için yanlıştı. Artık ikisi de doğru.

## Consequences

### Olumlu
- **Tek kök neden kapanır:** eksik primitif katmanı, ~60 modal ve 156 overlay'in tek merkezden yönetilmesini sağlar. A11y (focus trap, `Esc`, `aria-modal`) bu geçişte **bedava** gelir.
- **Tek foundation:** Radix. Bağımlılık ağacı büyümez; Base UI + Radix ikiliği hiç doğmaz.
- **Tek kanonik doküman:** iki yanlış pusula devre dışı kalır; ajanlar yanlış sistemi uygulayamaz.
- **Zorlama kalıcılaşır:** 18 dosyalık elle liste yerine tek `--full` kapsamı + CI. Zorlanmayan standart çürür; bu ADR'nin kalıcılığı buna bağlıdır.
- **İş küçülür:** registry göçü iptal edildiği için tablo/kanban/filtre motorlarına dokunulmaz — yalnızca görünümleri standarda çekilir.

### Olumsuz / Dikkat Edilmesi Gerekenler
- **Görsel regresyon testi yokken 52 ekrana dokunulur.** Mitigasyon: faz faz ilerleme, her fazda duman testi, faz başına ayrı commit. Faz 6'da Playwright smoke testleri bu açığı kalıcı kapatır.
- **`--full` temizlenene kadar guard kırıcı olamaz.** Bu, geçiş döneminde disiplinin prosedürel kalması anlamına gelir — mitigasyon: `--full` çıktısı faz kabul kriteri olarak kullanılır.
- **Elle yazılmış tablolar/kanban/filtreler elle kalır.** Bu bilinçli bir tercihtir (davranış riski almamak), ancak `@workspace/ui/table` + house stiline bağlanmadıkları sürece görsel tutarsızlık üretebilirler. Mitigasyon: Faz 5 tam olarak bunu hedefler.
- **`design.md`'nin hue 270 / Geist önerisi reddedilmiştir.** Bu, dokümanın yazarı için bir kayıp olabilir; mimari gerekçe: hue değişimi tüm ekranların yeniden temalanması demektir ve bu ADR'nin hedefini geciktirir. İtiraz varsa yeni ADR ile revize edilir.
- **`email-preview.ts` çift paleti ve print/e-posta HTML string'lerindeki hex'ler muaf tutulur** (e-posta istemcileri `oklch`/CSS değişkeni desteklemez — teknik zorunluluk). Ancak muafiyet **guard allowlist'inde açıkça kayıtlı** olmalıdır; sessiz istisna kabul edilmez. Tek paylaşılan "token → hex" çeviriciye indirgeme yol haritasındadır.
- **ADR-0002'deki `apps/ecommerce` / `--store-*` referansları bu checkout'ta geçersizdir** (`apps/ecommerce` mevcut değil). Guard ve ADR-0002 metni bu hayalet referanstan temizlenmelidir (yol haritasında).

### Done (her faz)
`npm exec -- ultracite fix` + `tsc --noEmit` + `next build` + `guard:crm-ui:full` (faz kapsamında 0 ihlal) + elle duman testi. Fail → **STOP**, auto-fix / bulk-sed yok, elle düzelt.

## References

- Kanonik standart: [`docs/crm-ui-standards.md`](../crm-ui-standards.md)
- Yol haritası: [`docs/crm-ui-roadmap.md`](../crm-ui-roadmap.md) (Program A/B/C + ertelenen maddeler)
- Guard: `crm-monorepo/scripts/crm-ui-guard.mjs` + `crm-ui-guard.allowlist.json` + `crm-ui-guard.README.md`
- Primitifler: `crm-monorepo/packages/ui/src/components/*` (21 dosya) · Token'lar: `crm-monorepo/packages/ui/src/styles/globals.css`
- Konvansiyonlar: [`docs/agents/ts-conventions.md`](../agents/ts-conventions.md) · [`docs/agents/react-conventions.md`](../agents/react-conventions.md) · [`docs/agents/domain.md`](../agents/domain.md)
- Önceki kararlar: [`ADR-0002`](0002-crm-input-standards.md) · [`ADR-0003`](0003-crm-ui-ux-modernization-and-component-architecture.md)
