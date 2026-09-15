# ADR-0002: CRM Input + Color Standards (`packages/ui`, zinc+blue)

> Status: **Accepted** | Date: 2026-09-03 | Deciders: UI-tutarlılık refaktörü (Batch-1…4)
> Kapsam: CRM (`crm-monorepo/apps/web`, `crm-monorepo/packages/ui`). Store (`crm-monorepo/apps/ecommerce`) **dokunulmaz** — guard scope dışı.
> İlgili: [`docs/design-system.md`](../design-system.md) §14 (CRM appendix) · Guard: [`crm-monorepo/scripts/crm-ui-guard.mjs`](../../crm-monorepo/scripts/crm-ui-guard.mjs) + [README](../../crm-monorepo/scripts/crm-ui-guard.README.md)

## Context

CRM sayfalarında her form kendi input'unu yazıyordu: native `<select>`, `<input type="number|date">`, `apps/web` içine gömülü `phone-input`, gri için `slate-*`, vurgu için `violet/fuchsia`, tek seferlik hex (`bg-[#f4f5f8]`). Sonuç: dark-mode'da (`d-key` toggle, `next-themes attribute=class`) kırık kontrast, tutarsız spacing/focus, kopyala-yapıştır drift.

Store tarafı light-only mercan sözleşmesiyle (`--store-*`, `data-store-theme`) zaten kilitli — bu ADR **sadece CRM** tarafını standartlaştırır.

## Decision

**Tek kaynak `crm-monorepo/packages/ui/src/components/*`.** CRM'de yeni form yazarken aşağıdakiler dışında input kullanılmaz:

| İhtiyaç | Standart | Kural |
|---|---|---|
| Metin / e-posta / şifre | `Input` (`input.tsx`, `h-9`, `blue-500` ring, `dark:bg-zinc-900`) | — |
| Sayı — para | `NumberInput` `precision={2}` + `suffix=" ₺"`, stepper kapalı, boş → `null`, clamp | — |
| Sayı — adet | `NumberInput` `precision={0}`, stepper açık | — |
| Sabit liste **≤7** seçenek | `SelectField` (`select.tsx`, `options: {label,value,disabled}[]`) | — |
| Dinamik liste / **>7** seçenek | `Combobox` (`combobox.tsx`) | Arama gerektiren her şey |
| Tarih | `DatePicker` (`date-picker.tsx`, `YYYY-MM-DD`, TR locale, `clearable` default açık) | Native `type=date` yasak |
| Tarih aralığı | `DateRangePicker` (`startDate`/`endDate`) — ilk kullanım: izin aralığı (`attendance`) | — |
| Telefon | `PhoneInput` — `apps/web`'den **`packages/ui`'ye taşındı**, Input diliyle (`h-9`, `blue-500`, `dark:bg-zinc-900`) | `apps/web`'de kopya bırakılmaz |

```tsx
import { Input } from "@workspace/ui/components/input";
import { NumberInput } from "@workspace/ui/components/number-input";
import { SelectField } from "@workspace/ui/components/select";
import { Combobox } from "@workspace/ui/components/combobox";
import { DatePicker, DateRangePicker } from "@workspace/ui/components/date-picker";
import { PhoneInput } from "@workspace/ui/components/phone-input";

// Para (₺) — stepper yok, boş null
const [price, setPrice] = useState<number | null>(null);
<NumberInput value={price} onChange={setPrice} precision={2} suffix=" ₺" showStepper={false} min={0} />;

// Adet — stepper var
const [qty, setQty] = useState<number | null>(1);
<NumberInput value={qty} onChange={setQty} precision={0} showStepper min={1} />;

// ≤7 sabit → SelectField | >7/dinamik → Combobox
<SelectField value={status} onChange={setStatus} placeholder="Durum seç" options={[
  { label: "Aktif", value: "active" },
  { label: "Pasif", value: "inactive", disabled: true },
]} />;
<Combobox value={customerId} onChange={setCustomerId} options={customers} placeholder="Müşteri ara…" />;

<DatePicker value={date} onChange={setDate} clearable min="2026-01-01" />;
<DateRangePicker startDate={start} endDate={end} onStartChange={setStart} onEndChange={setEnd} />;
<PhoneInput value={phone} onChange={setPhone} />;
```

**Renk standardı: zinc + blue.** Map (`guard:crm-ui` ile kilitli):

| Yasak | Yerine | Not |
|---|---|---|
| `slate-*` | `zinc-*` | Birebir ton eşleniği |
| `violet-*` / `fuchsia-*` | `blue-500` skalası | Tek vurgu rengi |
| Hex / arbitrary (`bg-[#…]`, `bg-[#f4f5f8]`, inline `style={{color:"#…"}}`, SVG `fill="#…"`) | Token (`bg-muted`, `text-zinc-*`, `dark:` variant) | `email-preview.ts` `isDark` dalı korunur, iç renkler token'a bağlanır |
| Google "G" logosu SVG fill'leri | — (exception) | Resmi brand rengi, tokenize edilmez → allowlist'te tek kayıt (`SVG_PAINT_HEX`, `apps/web/app/(auth)/login/page.tsx`) |

## Migration (Batch-1/2/3 özeti)

- **Batch-1:** `compliance/page.tsx`, `automations/[workflowId]/page.tsx`, `attendance/page.tsx` → standartlara geçirildi; `phone-input` `apps/web` → `packages/ui` taşındı; `DateRangePicker` ilk kullanım (izin aralığı).
- **Batch-2:** e-posta modalları (`compose`, `convert-to-lead`, `account`) + `organization` + `admin/tenants` + `automations/page` + `email/page`.
- **Batch-3:** Global renk: `admin/layout`, `auth/login`, `bulk-action-bar`, `app/page`, `email-preview.ts` (`isDark` korunarak).
- **Batch-4 (bu ADR + guard):** `scripts/crm-ui-guard.mjs` (zero-dep, 9 kural), `crm-ui-guard.allowlist.json` (şu an 1 kayıt: Google SVG exception), `crm-ui-guard.README.md`.

**Gate:** `npm run guard:crm-ui` (repo kökü `crm-monorepo/`) — Batch-1…3 dosyaları scoped tarar, **PASS zorunlu**; hit = regresyon → STOP, elle düzelt (auto-fix / bulk-sed yok). `guard:crm-ui:full` legacy sayfalar (`leaves`, `projects`…) migrate olana dek bilgilendirici.

## Consequences

### Olumlu

- CRM formları tek API: okuma/yazma maliyeti düşer, dark-mode bedavaya doğru gelir.
- Guard regresyonu CI'da yakalar; allowlist istisnaları gerekçeli + tek kural + tek dosya ile belgeli.
- Store sözleşmesi (`--store-*`, light-only) etkilenmez — guard Store'u taramaz.

### Olumsuz / Mitigasyon

- **Legacy sayfalar henüz migrate değil** (`leaves`, `projects`…): full sweep temizlenene dek gate sadece scoped. Mitigasyon — `guard:crm-ui:full` ile takip, sayfa sayfa migrate.
- **`≤7` eşiği keyfî:** 7–10 arası gri alan Combobox'a yönlendirilir (arama her zaman daha güvenli). İtiraz varsa yeni ADR ile revize edilir.
- **`email-preview.ts` token map'i kırılgan:** `isDark` dalı test ile korunmalı; e-posta HTML'i inline style ürettiğinden token değişimi manuel senkron ister.

### Done (her batch)

`npm exec -- ultracite fix` + typecheck + `d-key` dark-toggle görsel kontrol. Fail → STOP, auto-fix yok.

## References

- Bundle: `.tmp/context/ses_f97c73f54ffeLDTlzitNDO2RcP/bundle.md` (grill kuralları, batch listesi)
- Primitives: `crm-monorepo/packages/ui/src/components/{number-input,select,combobox,date-picker,input,phone-input}.tsx`
- Guard: `crm-monorepo/scripts/crm-ui-guard.{mjs,allowlist.json,README.md}` + fixtures (`dirty.tsx` exit 1 / `clean.tsx` exit 0)
- Standartlar: `docs/agents/ts-conventions.md` · `docs/agents/react-conventions.md` · `docs/agents/domain.md` (`docs/adr/` layout)
- Store sözleşmesi (değişmez): `docs/design-system.md` §1–13
