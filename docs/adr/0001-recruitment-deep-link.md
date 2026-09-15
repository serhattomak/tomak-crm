# ADR-0001: Recruitment Deep-Link — Faz 1'de Drawer, Faz 2'de Route

> Status: **Accepted** | Date: 2026-08-26 | Deciders: Recruitment Faz 1 grilling (4 round)
> İlgili dosyalar: [`docs/recruitment/spec.md`](../recruitment/spec.md) · [`docs/recruitment/phase2-todo.md`](../recruitment/phase2-todo.md) · `.scratch/recruitment/*` (dual)
> Triage: `ready-for-agent` (Faz 2)

## Context

Recruitment Faz 1'de başvurular (`applications`) için iki navigasyon ihtiyacı var:

1. **Kanban içinden hızlı inceleme:** recruiter kanban kartına tıklar, drawer açılır, CV preview + notes + stage değiştirme — sayfa yenilenmeden.
2. **Paylaşılabilir deep-link:** bir başvuruya doğrudan URL ile gitme — e-posta bildiriminden tıklama, Slack/Teams'te paylaşma, tarayıcı geçmişi/bookmark.

Mevcut web deseni `app/(dashboard)/[tenantSlug]/organization/page.tsx` — **tek `page.tsx` + 4 tab + `?tab=` query param** (2551 satır). Bu desen Faz 1 recruitment için de benimsendi: `app/(dashboard)/[tenantSlug]/recruitment/page.tsx` içinde `İlanlar | Adaylar | Başvurular | Ayarlar` tabları, başvurular tabında kanban + drawer.

Soru: başvurular için ayrı bir route (`app/(dashboard)/[tenantSlug]/recruitment/applications/[id]/page.tsx`) Faz 1'de mi açılmalı, yoksa Faz 2'ye mi ertelenmeli?

Kısıtlar:

- Faz 1 scope'u a-c ile sınırlı — d-g Faz 2'ye ertelendi (session context).
- Faz 1'de bildirimler sadece **in-app** (e-posta yok), dolayısıyla e-postadan deep-link tıklama ihtiyacı Faz 1'de yok.
- Next 16.3.3'te `params` ve `searchParams` artık async — yeni route eklemek ek test/validasyon demek.
- Tek sayfa deseni, WIP `leave-and-shift` branch'i ile uyum için korunmak isteniyor.

## Options Considered

### Option A — Faz 1'de deep-link route ekle

`app/(dashboard)/[tenantSlug]/recruitment/applications/[id]/page.tsx` hemen oluşturulur. Kanban kartı hem drawer hem link sunar (`<Link href=".../applications/{id}">`).

- **Artı:** Paylaşılabilir URL hemen hazır, SEO/noindex, breadcrumb, SSR fetch.
- **Eksi:** Faz 1 scope creep; iki navigasyon yolu (drawer + page) aynı anda canlı → state senkronu, test yükü, e-posta yokken gerçek kullanım düşük. WIP branch ile merge riski artar.

### Option B — Faz 1'de sadece `?tab=` + `?applicationId=` query deep-link

Mevcut `recruitment/page.tsx` içinde `?tab=applications&applicationId=uuid` ile drawer otomatik açılır. Ayrı route yok.

- **Artı:** Tek dosya deseni korunur, ek route yok, küçük değişiklikler.
- **Eksi:** URL uzun ve kırılgan, e-posta şablonlarında çirkin görünür, SSR 404 handling yok, bookmark/paylaşım ergonomisi zayıf. Nihai çözüm değil.

### Option C — Faz 1'de drawer only, deep-link'i Faz 2'ye ertele (seçilen)

Faz 1'de sadece drawer. Deep-link route ve query deep-link iyileştirmesi Faz 2'de, e-posta bildirimleri ile birlikte ele alınır.

- **Artı:** Faz 1 minimal ve odaklı kalır, scope net, WIP uyumu korunur, e-posta olmadan deep-link'e gerçek ihtiyaç yok. Faz 2'de route + e-posta + breadcrumb birlikte tutarlı tasarlanır.
- **Eksi:** Faz 1'de başvurular paylaşılabilir URL ile iletilemez — geçici kısıtlama.

## Decision

**Option C — Defer to Faz 2.** Faz 1'de deep-link route oluşturulmayacak. Başvuru detayı sadece drawer üzerinden erişilecek. Faz 2'de aşağıdaki route eklenecek:

```
app/(dashboard)/[tenantSlug]/recruitment/applications/[id]/page.tsx
```

Bu route, Faz 2 e-posta bildirimlerindeki tıklanabilir linklerin hedefi olacak ve kanban içinden de erişilebilir olacak. Faz 2 todo'suna işlendi: [`phase2-todo.md` → Deep-Link](../recruitment/phase2-todo.md#deep-link--detay-route).

Faz 1'de opsiyonel küçük iyileştirme olarak `?applicationId=` query param ile drawer auto-open eklenebilir — zorunlu değil, Faz 2'de de korunabilir (coexist).

## Consequences

### Olumlu

- Faz 1 teslimatı sadeleşir, 4 tab + kanban + drawer'a odaklanılır.
- Tek `page.tsx` deseni bozulmaz, `leave-and-shift` WIP ile çakışma azalır.
- Faz 2'de deep-link, e-posta, breadcrumb ve raporlama ile birlikte bütüncül tasarlanır.

### Olumsuz / Mitigasyon

- **Faz 1'de paylaşılabilir URL yok:** Mitigasyon — ihtiyaç olursa `?tab=applications&applicationId=` query trick'i eklenebilir (küçük, geriye dönük uyumlu).
- **Faz 2'de ek iş:** Route + SSR fetch + 404 + breadcrumb + `Back to Kanban` linki yapılacak. Tahmin: ~0.5 gün.

### Nötr / Takip

- Faz 2 başında `params` async (`await params`) pattern'i Next 16.3.3'e uygun test edilecek (`crm-monorepo/AGENTS.md`).
- `lib/api-client.ts`'e `getApplication(id)` eklendiğinde hem drawer hem yeni route aynı methodu kullanacak.
- Bu ADR, Faz 2 planlama grilling'inde yeniden gözden geçirilebilir — `Status: Accepted` kalır, `Superseded` olursa yeni ADR ile referanslanır.

## References

- Session: `.tmp/sessions/2026-08-26-recruitment-phase1/context.md` (hibrit stages, 4 tab, deep-link todo)
- Spec: `docs/recruitment/spec.md` §8 (Web UI) ve §10 (Constraints)
- Faz 2 TODO: `docs/recruitment/phase2-todo.md` § Deep-Link
- Domain: `docs/agents/domain.md` (single-context, `docs/adr/` layout)
- Issue tracker: `docs/agents/issue-tracker.md` · Triage: `docs/agents/triage-labels.md`
- Next.js 16.3.3 breaking changes: `crm-monorepo/AGENTS.md` (async params)
