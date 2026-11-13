# Spec: CRM UI Yenilemesi v2 — "Yüzen Kabuk" dili

Status: landed — faz 0–6 uygulandı (2026-11-14)
Tarih: 2026-11-13
Referans: kullanıcı tarafından onaylanan mockup (Genel Bakış + Müşteriler)
Kanonik standart: `docs/crm-ui-standards.md` — bu dosya onaylanana kadar **öneridir**, kanonik değildir.

---

## 1. Amaç

Bugünkü çift raylı, kart-içinde-kart kabuğu; tek sidebar'lı, gri zemin üzerinde yüzen beyaz kabukla değiştirmek. Tipografi, boşluk ve renk dili Linear/Notion çizgisine çekilir; veri renkleri durum belirtir, dekorasyon değil.

Değişmeyen: veri modeli, API sözleşmeleri, iş akışları, Türkçe terim sözlüğü (§1.6), print yüzeyleri, erişilebilirlik eşikleri.

## 2. İlkeler

1. **Kabuk tek parça.** Sidebar ve içerik aynı beyaz yüzeyde; aralarındaki ayrım çizgi, gölge değil.
2. **Gölge tek seviye.** Kartlar neredeyse gölgesiz; gölge yalnız kabuk ve kaldırılan (drag/aktif) öğede.
3. **Renk anlam taşır.** Tek aksan (periwinkle) + durum tonları. Gradient yalnız logo ve tek histogramda.
4. **Yoğunluk ferah ama taranabilir.** Nav 30px, tablo satırı 44px, gövde 12.5px.
5. **Hareket açıklayıcı.** Hover 150ms, katman 200ms; dekoratif animasyon yok.

## 3. Tokenlar

### 3.1 Renk — açık

| Token | Değer | Rol |
|---|---|---|
| `--background` | `#EDEFF3` | Uygulama zemini (gri tuval) |
| `--card` | `#FFFFFF` | Kabuk, kart, tablo |
| `--foreground` | `#16181D` | Birincil metin |
| `--muted-foreground` | `#6F7683` | İkincil metin |
| `--muted` | `#F4F5F8` | Dolgu, hover, sekme rayı |
| `--border` | `#ECEEF3` | 1px ayraç |
| `--input` | `#E4E7EC` | Form kenarı |
| `--primary` | `#6D5BE8` | Aksan: aktif nav, odak, grafik serisi 1 |
| `--primary-foreground` | `#FFFFFF` | Aksan üstü metin |
| `--accent-soft` | `#F1EFFF` | Aksan tonlu yüzey |
| `--success` / `--success-soft` / `--success-ink` | `#12B76A` / `#ECFDF3` / `#067647` | Aktif, kazanıldı |
| `--warning` / `--warning-soft` / `--warning-ink` | `#F79009` / `#FFFAEB` / `#B54708` | Onay bekliyor, normal |
| `--danger` / `--danger-soft` / `--danger-ink` | `#F04438` / `#FEF3F2` / `#D92D20` | Acil, silme, hata |
| `--info` / `--info-soft` / `--info-ink` | `#2E90FA` / `#EFF8FF` / `#175CD3` | Potansiyel, bilgi |
| `--chart-1..5` | `#6D5BE8` `#F79009` `#12B76A` `#2E90FA` `#667085` | Grafik serileri; anlam sabit |

### 3.2 Renk — koyu

`--background #0E1013` · `--card #15171C` · `--foreground #E7E9EE` · `--muted-foreground #98A2B3` · `--muted #1B1E24` · `--border #23262E` · `--primary #8B7CF6` · `--accent-soft #241F3D`. Durum tokenları aynı adla, `-soft` değerleri koyu tonda (`#12261C` / `#2A1F0C` / `#2C1512` / `#10243A`), `-ink` değerleri açık tonda (`#6CE9A6` / `#FEC84B` / `#FDA29B` / `#84CAFF`).

### 3.3 Yarıçap

| Öğe | Sınıf | Değer |
|---|---|---|
| Kabuk | `rounded-2xl` | ~14px |
| Kart, tablo, modal | `rounded-xl` | ~11px |
| Buton, girdi, arama | `rounded-lg` | 8px |
| Çip, sayaç | `rounded-md` | 6px |
| Avatar | `rounded-full` | — |

`--radius: 0.5rem` kalır; yeni ölçek icat edilmez.

### 3.4 Gölge (`@theme --shadow-*`)

```
--shadow-shell: 0 28px 60px -30px rgb(16 24 40 / .30), 0 1px 2px rgb(16 24 40 / .06)
--shadow-card:  0 1px 2px rgb(16 24 40 / .04)
--shadow-lift:  0 18px 34px -14px rgb(16 24 40 / .30), 0 2px 4px rgb(16 24 40 / .06)
```

Koyu temada `--shadow-card: none`; ayrım `--border` ile.

### 3.5 Tipografi

Inter kalır. Yeni bağımlılık yok.

| Rol | Ölçü | Ağırlık | Not |
|---|---|---|---|
| Sayfa başlığı | 23px / 1.15 | 650 | `tracking -0.025em` |
| Bölüm başlığı | 15px | 600 | |
| Kart başlığı | 11px | 550 | ikon + etiket |
| Gövde | 12.5px / 1.5 | 400 | |
| Meta | 11px | 400 | muted |
| Mikro etiket | 9px | 600 | uppercase, `tracking .06em` — yalnız tablo başlığı |
| Rakam | tabular | — | tüm para/sayı |

`text-2xs`/`text-3xs` tokenları korunur; keyfi px yasağı aynen sürer.

## 4. Kabuk

```
┌ canvas (--background, 10px gutter) ──────────────────────────┐
│ ┌ shell (--card, rounded-2xl, shadow-shell) ──────────────┐  │
│ │ sidebar 232 │ top bar 54 (border-b)                     │  │
│ │             │ content (px 22, py 17)                    │  │
│ └──────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

- **Gutter:** masaüstünde 10px (`md:p-2.5`), mobilde 0.
- **Sidebar:** 232px sabit; 1024px altında drawer'a düşer. Bölümler: marka + kiracı, 5 hub şeridi, gruplu nav (30px satır, 29px alt satır), alt blok (yardım/ayarlar/davet/kullanıcı).
- **Hub şeridi:** `CRM · OPS · HRM · CMS · SYS` — 24px, `--muted` ray içinde beyaz aktif pill. İkon rayı kalkar.
- **Top bar:** geri, breadcrumb (modül ikonu + kırıntı), ortalı arama (`⌘K`), yardımcı aksiyonlar, siyah birincil buton. Sayfaya özel aksiyonlar `PageHeader`'da kalır.
- **Mobil:** mevcut header + bottom nav korunur, yalnız yeni yüzeye boyanır. Top bar mobilde gizli.

## 5. Bileşen sözleşmeleri

| Bileşen | Kural |
|---|---|
| `Card` | `rounded-xl border bg-card shadow-card`; padding 14–16; iç içe kart yok; başlık + gövde ayrımı çizgiyle |
| `Button` | Yükseklik 28/32/36; birincil = siyah (`#15171C`, koyu temada beyaz); ikincil = beyaz + kenar; ghost = şeffaf; `:active` `scale(.98)` |
| `Badge` / çip | 5px yarıçap, `-soft` zemin + `-ink` metin + 4px nokta; dolu kırmızı/yeşil çip yok |
| `Table` | Başlık 32px, satır 44px, hover `#FAFBFC`; hücre ayracı `--border`; sayı sağa dayalı |
| `Tabs` | Segment ray `--muted`, aktif beyaz pill + `shadow-card`; alt çizgi yok |
| Girdi / arama | Form alanı beyaz + `--input` kenar, 32px; arama dolgulu (`--muted`) |
| Kanban kartı | 10px yarıçap, `shadow-card`; sürüklenen kart `shadow-lift` + 1px yukarı |
| Modal / Sheet | `rounded-xl`, `shadow-lift`, backdrop `black/30`; genişlik `sm:` ile |
| Boş durum / iskelet | Mevcut `EmptyState`/`Skeleton` korunur, yeni tokenlarla |
| Toast | Sonner korunur; `--card` + `shadow-lift` |

## 6. Standartlara etkisi (`docs/crm-ui-standards.md`)

| Bölüm | Değişiklik |
|---|---|
| §1.1 | Yarıçap tablosuna kabuk 14 / kart 11 eklenir; 8px taban korunur |
| §1.2 | `--primary` periwinkle olur. **`violet-*` sınıf yasağı aynen kalır** — aksan token değeridir, sınıf değil. Faz 4'teki 920 `violet→blue` göçü geri alınmaz |
| §1.2 | `--success/--warning/--danger/--info` + `-soft`/`-ink` eklenir (roadmap **#24** kapanır); yeni çipler token kullanır, skala sınıfı kullanmaz |
| §1.3 | Gövde 12 → 12.5; sayfa başlığı 24 → 23; tablo başlığı mikro uppercase |
| §1.3.1 | Kart dolgusu 16/18; "başlık varsa üst sıfır" yapısal kuralı korunur |
| §1.5 | Hover 150ms `ease-out`; katman 200ms; `prefers-reduced-motion` zorunlu |
| §2.2 | Çift ray → tek sidebar + workspace top bar; `PageContainer` `px-4 py-4 md:px-6 md:py-5` |
| §2.3 | Overlay yarıçapı 11px, `shadow-lift`; print kuralları değişmez |

## 7. Faz 0 — pilot: Müşteriler

### Dosyalar

**Token**
- `packages/ui/src/styles/globals.css` — renk, gölge, tipografi; koyu eşleri

**Primitif**
- `packages/ui/src/components/{card,button,badge,table,tabs,input,page-header,page-container}.tsx`
- `packages/ui/src/components/{dialog,sheet,popover,dropdown-menu,select,combobox}.tsx` — yalnız yüzey/gölge/yarıçap

**Kabuk**
- `apps/web/app/(dashboard)/layout.tsx` — tek shell
- `apps/web/components/layout/sidebar.tsx` — **yeni** (marka, hub şeridi, gruplu nav, alt blok)
- `apps/web/components/layout/workspace-top-bar.tsx` — **yeni** (breadcrumb, arama, aksiyonlar)
- `apps/web/components/layout/hub-rail.tsx`, `sub-nav-rail.tsx` — **silinir**
- `apps/web/components/layout/mobile-nav.tsx` — yeni nav verisiyle, aynı davranış
- `apps/web/components/command-palette.tsx`, `notification-center.tsx` — tetikleyici hizalama (davranış değişmez)

**Pilot sayfa — Müşteriler**
- `app/(dashboard)/[tenantSlug]/customers/page.tsx`
- `_components/customer-filters-bar.tsx` — segment sekmeler + arama + filtre çipleri
- `_components/customer-stats-banner.tsx` — 3 KPI kartı
- `_components/customer-table-view.tsx` — 44px satır, avatar, durum çipi
- `_components/customer-grid-view.tsx` — kart ızgarası

### Kapsam dışı (Faz 0)

Dashboard widgetları, diğer 55 sayfa, auth/admin/portal, print rotaları, mobil drawer'ın yeni görseli (davranış aynı, görsel Faz 1'de).

### Kabul kriterleri (ölçülebilir)

1. `npm run typecheck` → API (`apps/api`) ve web 2/2 temiz.
2. `npm run guard:crm-ui` → 0 error; yeni ihlal yok. Renk tokenları guard'ı tetiklerse allowlist + gerekçe.
3. `npm run lint` → 0 error; uyarı sayısı 347 ± 0 (artış yok).
4. `npm run format` → no-op.
5. 1440 ve 390'da: yatay kaydırma yok, öğe çakışması yok, ilk ekran tek parça.
6. Kontrast: gövde ≥ 4.5:1, çip metni kendi `-soft` zemininde ≥ 4.5:1 (ölçülür, varsayılmaz).
7. Klavye: skip link ilk sırada, odak halkası görünür, `⌘K` çalışır, drawer `Esc` ile kapanır.
8. Print: `/invoices/<id>/print` çıktısında sidebar/top bar basılmaz, gölge yok.
9. Müşteriler ekranı: tablo ↔ ızgara geçişi, arama, filtre, sayfalama, toplu seçim çalışır (mevcut davranış birebir).

## 8. Sonraki fazlar

| Faz | Kapsam | Büyüklük |
|---|---|---|
| 0 | Token + kabuk + primitif + Müşteriler | M |
| 1 | Genel Bakış (11 widget: KPI, grafik, tablo, ekip, görev) | M |
| 2 | Satış: pipeline, teklifler, sözleşmeler, siparişler, takvim | L |
| 3 | Kayıt & para: ürünler, stok, faturalar, finans, kampanya, kargo | L |
| 4 | Operasyon/İK/İletişim/Sistem: 18 modül | L |
| 5 | Auth, admin, portal, print yüzeyleri | S |
| 6 | Koyu tema paritesi, a11y süpürmesi, Ultracite borcu (#31) | M |

Her faz sonunda aynı kabul kriterleri + o fazın ekranlarında görsel kontrol. Fazlar arası geri dönüş: tokenlar additive olduğu için tek commit'lik revert mümkün.

## 9. Riskler ve kararlar

1. **Primitif değişikliği 56 sayfayı aynı anda etkiler.** Önlem: prop API'si dondurulur, kaldırılan prop yok; 6 temsili rotada görsel duman testi.
2. **Aksan rengi marka kararıdır.** `--primary` periwinkle olur; `violet-*` sınıfları geri gelmez. Onaylanmazsa alternatif: aksan `#2E6BE6` (mevcut mavi) kalır, kabuk/tipografi/boşluk yine uygulanır — görünümün ~%90'ı korunur.
3. **Hub rayı kalkıyor.** 5 hub, 232px'lik şeritte kısaltma etiketiyle yaşar; `nav-config` verisi değişmez.
4. **Top bar yeni bir yüzey.** Breadcrumb rota türetimi + arama tetikleyicisi; sayfa aksiyonları `PageHeader`'da kalır, ikisi çakışmaz.
5. **Dashboard pilot değil.** En görünür ekran ama 11 widget'ıyla en pahalı; Müşteriler aynı bileşenleri (kart, çip, tablo, filtre) daha küçük yüzeyde doğrular.
6. **Koyu tema referansta yok.** Token düzeyinde tanımlanır; Faz 0'da yalnız kabuk + Müşteriler doğrulanır, geri kalanı fazıyla.
