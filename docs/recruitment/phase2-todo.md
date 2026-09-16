# Recruitment — Faz 2 TODO (İşe Alım)

> Faz 1: `spec.md` (a-c) tamamlandı. Bu dosya Faz 2 backlog'unu tanımlar — implementasyon değil, planlama.
> Kaynak: `.tmp/sessions/2026-08-26-recruitment-phase1/context.md` · ADR: [`ADR-0001`](../adr/0001-recruitment-deep-link.md)

## 1. Amaç

Faz 1'de temeller (ilanlar, aday havuzu, başvurular, hibrit kanban) kuruldu. Faz 2, işe alım döngüsünü **mülakat → teklif → çalışan dönüşümü → raporlama** ile kapatır ve Faz 1'de defer edilen deep-link, e-posta ve otomasyonları ekler.

## 2. Kapsam — Faz 2 Maddeleri

### d) Mülakat (Interviews)

- [ ] Tablo: `public.recruitment_interviews` (`id`, `tenant_id`, `application_id fk`, `stage_id fk`, `interview_type` VARCHAR `phone|video|onsite|technical`, `scheduled_at`, `duration_minutes`, `location`, `interviewer_ids uuid[]` veya `interview_participants` join table, `feedback`, `score`, `status` VARCHAR `scheduled|completed|cancelled|no_show`, `created_at/updated_at`)
- [ ] API: `GET/POST /applications/{id}/interviews`, `PUT/DELETE /interviews/{id}`, `POST /interviews/{id}/feedback`
- [ ] Web: Başvurular drawer içinde `Mülakatlar` sekmesi + takvim entegrasyonu (opsiyonel), `Ayarlar` → interview type yönetimi
- [ ] Validasyon: çakışan takvim uyarısı, geçmiş tarihe schedule engeli (opsiyonel)
- [ ] İzin: `Recruitment.ManageInterviews` (yeni) veya `Manage` altında — karar Faz 2 başında

### e) Teklif (Offers)

- [ ] Tablo: `public.recruitment_offers` (`id`, `tenant_id`, `application_id fk unique`, `salary_offered`, `currency`, `start_date`, `offer_letter_url` (storage bucket `recruitment-offers`), `status` VARCHAR `draft|sent|accepted|rejected|expired`, `sent_at`, `responded_at`, `expires_at`, `notes`, `created_at/updated_at`)
- [ ] API: `POST /applications/{id}/offer`, `PUT /offers/{id}`, `POST /offers/{id}/send`, `POST /offers/{id}/accept|reject`
- [ ] Web: Başvuru drawer → `Teklif` kartı, offer letter preview, durum badge'leri
- [ ] KVKK: teklif reddedilirse saklama süresi politikası
- [ ] İzin: `Recruitment.ManageOffers` (yeni) veya `Manage`

### f) İşe Alım → Çalışan Dönüşümü (Conversion)

- [ ] **Mevcut (Faz 1): B modu — taslak Probation.** `Hired` stage'e geçişte `employees` tablosuna `status = 'Probation'` (taslak) kayıt oluşturur, IK onayı bekler.
- [ ] **Faz 2: A modu — otomatik aktif + tenant toggle.**
  - [ ] Tenant ayarı: `recruitment_settings` tablosu (`tenant_id pk`, `conversion_mode VARCHAR 'B'|'A'`, `auto_activate bool`, `default_department_id`, `default_position_id`, `probation_days int`)
  - [ ] A modunda `Hired` → `employees.status = 'Active'` doğrudan, `departments`/`job_positions` mapping otomatik
  - [ ] API: `POST /applications/{id}/convert` (idempotent, duplicate guard), `GET /recruitment/settings`, `PUT /recruitment/settings`
  - [ ] Web: `Ayarlar` tabında `Dönüşüm Modu` toggle (B/A) + preview, `Başvurular` kanban `Hired` kolonunda `Çalışana Dönüştür` butonu
  - [ ] Edge: aynı application ikinci kez convert edilemez (`409`), candidate zaten employee ise linkle
  - [ ] Migration: mevcut B verileri A'ya geçişte etkilenmez (geriye dönük uyumlu)

### g) Raporlama (Reporting)

- [ ] Metrikler: `time-to-hire` (Applied → Hired gün), `source breakdown` (CSV/public/manual), `stage conversion rate` (funnel), `headcount vs hired`, `interviewer load`
- [ ] API: `GET /recruitment/reports/summary?from&to&requisitionId`, `GET /recruitment/reports/funnel`, `GET /recruitment/reports/sources`
- [ ] Web: `Ayarlar` veya yeni `Raporlar` tabı (karar Faz 2'de — Faz 1'de 4 tab limiti korunduğu için Faz 2'de 5. tab veya ayrı sayfa düşün)
- [ ] Export: CSV/PDF
- [ ] Performans: materialized view veya `COUNT` + `AVG` query optimizasyonu, tenant filtre şart

### Bildirimler (Notifications)

- [ ] Faz 1: in-app toast only (mevcut)
- [ ] Faz 2: **e-posta bildirimleri**
  - [ ] Triggerlar: yeni başvuru (hiring_manager'a), stage değişimi (aday'a opsiyonel), mülakat daveti, teklif gönderimi
  - [ ] Servis: `CRM.Modules.Notification` veya Supabase Auth email + queue (pgmq / hangfire)
  - [ ] Template: TR/EN, tenant branding
  - [ ] KVKK: aday e-posta izni (`consent_given`) kontrolü
  - [ ] Ayar: `Ayarlar` → `Bildirim Tercihleri` (tenant bazlı on/off)

### Deep-Link — Detay Route

- [ ] **Route:** `app/(dashboard)/[tenantSlug]/recruitment/applications/[id]/page.tsx`
  - Detay: ADR-0001'de defer edildi — Faz 1'de drawer + query param (`?applicationId=`) yeterli görüldü.
  - Faz 2'de: doğrudan link (`/acme/recruitment/applications/uuid`) → SSR fetch + 404 handling + breadcrumb + `Back to Kanban` link.
  - Paylaşılabilir URL, e-posta bildirimlerinden tıklanabilir.
  - Next 16.3.3: `params` async (`await params`), `searchParams` async — `crm-monorepo/AGENTS.md` uyumu.
- [ ] Alternatif: `?tab=applications&applicationId=` deep-link'i koru, yeni route ekle — ikisi coexist edebilir
- [ ] SEO: `noindex` (dashboard içi)

### Otomasyon & Diğerleri

- [ ] **Anonimleştirme cron:** `deleted_at < now() - interval '2 years'` → PII maskeleme (pg_cron)
- [ ] **Embed allowlist:** iframe `X-Frame-Options` + `Content-Security-Policy: frame-ancestors` tenant bazlı domain listesi
- [ ] **Stage otomasyonu:** `closing_date` geçince `Open` → `Closed` otomatik (cron), `Hired` sonrası diğer başvuruları `Rejected` yapma opsiyonu
- [ ] **Webhook:** `application.stage_changed`, `offer.accepted` eventleri dış sisteme (opsiyonel)
- [ ] **Audit log:** `recruitment_audit` tablosu (who/when/what) — compliance için

## 3. Bağımlılıklar & Sıra Önerisi

```
1. Deep-link route (küçük, izole) ─┐
2. Conversion toggle A/B (settings) ─┤─ paralel yapılabilir
3. Interviews (d) ───────────────────┤
                                    ├─► 4. Offers (e) (interview sonrası) ─► 5. Reporting (g) (veri birikince)
6. Email notifications (bağımsız, 3-4 ile paralel)
7. Automation/cron (en son, veri model stabil olunca)
```

`depends_on`: Faz 1 kanban + stages stabil olmadan d/e'ye başlama.

## 4. Teknik Notlar

- VARCHAR enum pattern korunacak (`CREATE TYPE` yok).
- RLS + `ITenantScopedEntity` her yeni tabloda zorunlu.
- `lib/api-client.ts` Faz 2 methodları eklenecek (interviews/offers/reports/settings).
- Ultracite/Biome, Next 16.3.3 async params, MediatR pattern Faz 1 ile aynı.
- İzinler: yeni permission'lar `Recruitment.ManageInterviews`, `ManageOffers`, `ViewReports` olarak eklenebilir — veya `Manage` altında toplanır (Faz 2 ADR ile kararlaştır).

## 5. Kabul Kriterleri (Faz 2 Done)

- [ ] Deep-link route çalışır, e-posta ve kanbandan erişilebilir
- [ ] Conversion toggle B/A tenant bazlı, geriye dönük uyumlu
- [ ] Interview & offer CRUD + validasyon + KVKK uyumlu
- [ ] Reporting metrikleri doğru, export çalışır
- [ ] E-posta bildirimleri tetiklenir, KVKK izni kontrol edilir
- [ ] Cron anonimleştirme ve otomasyonlar test edildi
- [ ] `turbo typecheck` + `dotnet build` + `ultracite check` geçer

## 6. Referanslar

- Faz 1 spec: [`spec.md`](./spec.md)
- ADR: [`0001-recruitment-deep-link.md`](../adr/0001-recruitment-deep-link.md)
- Session: `.tmp/sessions/2026-08-26-recruitment-phase1/context.md`
- Domain: `docs/agents/domain.md` · Triage: `docs/agents/triage-labels.md`
