# Recruitment — Faz 1 Spec (İşe Alım)

> Session: `2026-08-26-recruitment-phase1` | Status: in_progress | Owner: recruitment-phase1
> Kaynak: `.tmp/sessions/2026-08-26-recruitment-phase1/context.md` (grilling 4 round — 2026-08-26 onaylı)
> İlgili ADR: [`ADR-0001: Deep-Link Deferred`](../../docs/adr/0001-recruitment-deep-link.md) · Faz 2 planı: [`phase2-todo.md`](./phase2-todo.md)

## 1. Overview

Tek-tenant HR CRM içine işe alım (recruitment) modülü. Fazlı teslimat:

- **Faz 1 (şimdi):** a) iş ilanları / requisitions, b) aday havuzu / candidates + CV storage, c) başvurular / applications + hibrit aşamalar (kanban).
- **Faz 2 (sonra):** d) mülakat (interviews), e) teklif (offers), f) işe alım → çalışan dönüşümü, g) raporlama + otomasyon.

Modül `tenant_modules` üzerinden açılır/kapanır, tüm veriler `tenant_id` ile izole edilir (RLS + `ITenantScopedEntity` + `NpgsqlRlsInterceptor`). Kanban + tablo, drawer detay ve in-app bildirim Faz 1 kapsamındadır.

## 2. Faz 1 Scope

### 2.1 Kapsamda

- **İş İlanları (job_requisitions):** başlık, departman/pozisyon (nullable FK → `departments`, `job_positions`), `headcount`, `employment_type`, `work_model`, `location`, maaş aralığı, açıklama/requirements, `status` (`Draft`/`Open`/`Closed`/`Cancelled` — VARCHAR), `is_published`/`published_at`/`closing_date`, `hiring_manager_id` (nullable FK → `employees`), `priority`.
- **Aday Havuzu (candidates):** `first_name`/`last_name`/`email` (tenant içinde unique), `phone`, `birth_date`, `address`, `source`, `tags[]`, `cv_file_url`/`cv_file_name`, `consent_given`/`consent_at`, `notes`, `deleted_at` soft-delete. Duplicate e-posta → uyarı, KVKK onayı zorunlu.
- **Başvurular (applications):** `candidate_id` + `requisition_id` + `stage_id` (FK), `status` denormalize (stage slug mirror), `score`, `notes`, `unique(candidate_id, requisition_id)` — aynı adayın aynı ilana ikinci başvurusu engellenir.
- **Hibrit Aşamalar (recruitment_stages):** tenant-bazlı, `name`/`slug`/`sort_order`/`color`/`is_default`/`stage_type` (`active`/`terminal_success`/`terminal_failure`)/`is_active`. Seed: `Applied`, `Screening`, `Interview`, `Offer`, `Hired` + terminal `Rejected`, `Withdrawn`. `is_default` silinemez.
- **Storage:** `storage.buckets` → `recruitment-cvs` (public: false). Policy: tenant isolation.

### 2.2 Kapsam Dışı (Faz 2'ye ertelendi)

Mülakat takvimi, teklif mektupları, otomatik çalışan dönüşümü (A modu), gelişmiş raporlama, e-posta bildirimleri, deep-link route — bkz. [`phase2-todo.md`](./phase2-todo.md).

## 3. Data Model

### 3.1 Tablolar (4 + bucket)

| Tablo | Ana Alanlar | Kısıtlar / Index |
|---|---|---|
| `public.job_requisitions` | `id uuid pk`, `tenant_id uuid fk`, `title text`, `department_id uuid nullable fk`, `position_id uuid nullable fk`, `headcount int`, `employment_type varchar`, `work_model varchar`, `location text`, `salary_min/max numeric`, `description text`, `requirements text`, `status varchar`, `is_published bool`, `published_at timestamptz`, `closing_date date`, `hiring_manager_id uuid nullable fk`, `priority varchar`, `created_at/updated_at` | `idx_requisitions_tenant`, `idx_requisitions_status`, `fk` → departments/positions/employees (ON DELETE SET NULL) |
| `public.candidates` | `id uuid`, `tenant_id`, `first_name`, `last_name`, `email`, `phone`, `birth_date`, `address`, `source varchar`, `tags text[]`, `cv_file_url`, `cv_file_name`, `consent_given bool`, `consent_at timestamptz`, `notes text`, `deleted_at timestamptz`, `created_at/updated_at` | `unique(tenant_id, email) WHERE deleted_at IS NULL`, `idx_candidates_tenant`, `idx_candidates_email`, `HasQueryFilter: deleted_at IS NULL` |
| `public.recruitment_stages` | `id uuid`, `tenant_id`, `name text`, `slug text`, `sort_order int`, `color varchar`, `is_default bool`, `stage_type varchar`, `is_active bool`, `created_at/updated_at` | `unique(tenant_id, slug)`, `idx_stages_tenant_sort`, `check stage_type in ('active','terminal_success','terminal_failure')` |
| `public.applications` | `id uuid`, `tenant_id`, `candidate_id fk`, `requisition_id fk`, `stage_id fk`, `status varchar`, `score int`, `notes text`, `created_at/updated_at` | `unique(candidate_id, requisition_id)`, `idx_applications_tenant`, `idx_applications_stage`, `idx_applications_requisition`, `fk` ON DELETE CASCADE/RESTRICT uygun |

> **Enum kuralı:** `CREATE TYPE` yok — tüm enumlar `VARCHAR` + check constraint / uygulama katmanı validasyonu (bkz. `20260820000008_leaves_module.sql` pattern).

### 3.2 Storage Bucket

```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('recruitment-cvs','recruitment-cvs', false);
```

- Path convention: `{tenant_id}/{candidate_id}/{timestamp}-{sanitized-filename}`
- Limit: **5 MB**, MIME: `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Policies: `FOR SELECT/INSERT/UPDATE/DELETE USING (tenant_id = current_tenant_id())` — anon public-apply bypass'ı sadece `PublicApply` endpoint üzerinden (service role).

### 3.3 RLS & Seed

- Her tablo `ENABLE ROW LEVEL SECURITY`, policy `tenant_id = current_setting('app.current_tenant_id')::uuid`.
- Seed stages (per tenant, `sort_order` 1..7):

```
1 Applied      (active, is_default=true)
2 Screening    (active)
3 Interview    (active)
4 Offer        (active)
5 Hired        (terminal_success)
6 Rejected     (terminal_failure)
7 Withdrawn    (terminal_failure)
```

Is_default stage silinemez / pasife alınamaz.

## 4. Workflow — Hibrit Aşamalar

- **Global per tenant:** Aşamalar requisition'a özel değil, tenant geneli.
- **Yönetim:** `Ayarlar` tabında CRUD + reorder (drag-drop `sort_order` günceller) + renk + aktif/pasif toggle.
- **Silme kuralları:** `is_default` silinemez; üzerinde application olan stage silinemez (önce taşı).
- **MoveStage:** `applications.stage_id` güncellenir, `status` stage slug ile senkronize edilir. Terminal stage'e geçişte ek validasyon Faz 2'de genişleyecek.
- **Kapanış / Headcount:**
  - `closing_date` geçmişse `Publish` / `PublicApply` → `400 Bad Request`.
  - `status = 'Closed'` ilana başvuru → ret.
  - `headcount` dolduğunda başvuru engellenmez — sadece warning (Faz 1).

## 5. Channels — Başvuru Kanalları

| Kanal | Açıklama | Faz 1 Durum |
|---|---|---|
| **Manuel** | Recruiter aday oluşturur, başvuruyu `İlanlar`/`Adaylar`/`Başvurular` tablarından ekler | ✅ |
| **CSV Import** | `Adaylar` tabında CSV yükle → 500 satır limit, duplicate e-posta skip + uyarı, KVKK consent kolon zorunlu | ✅ `POST /api/recruitment/candidates/import` |
| **Public başvuru linki** | Anon form: `POST /api/recruitment/public/apply` — honeypot field + IP rate-limit (örn. 5/dk), KVKK checkbox zorunlu, CV 5 MB | ✅ |
| **Embed iframe (D)** | Public form'un `iframe` ile dış siteye gömülmesi (`/embed/recruitment/apply?tenant=...`) — `X-Frame-Options` allowlist Faz 2'de | ✅ D seçeneği (basit embed), gelişmiş allowlist Faz 2 |

## 6. API — Endpoints (MediatR + IEndpoint)

Base: `/api/recruitment` — header `x-tenant-slug` → `NpgsqlRlsInterceptor`.

| Alan | Method & Path | Yetki |
|---|---|---|
| Requisitions | `GET /requisitions`, `POST /requisitions`, `GET /requisitions/{id}`, `PUT /requisitions/{id}`, `DELETE /requisitions/{id}` | `Recruitment.View` / `Manage` |
| Publish/Close | `POST /requisitions/{id}/publish`, `POST /requisitions/{id}/close`, `POST /requisitions/{id}/reopen` | `Recruitment.Publish` |
| Candidates | `GET /candidates`, `POST /candidates`, `GET /candidates/{id}`, `PUT /candidates/{id}`, `DELETE /candidates/{id}` (soft), `DELETE /candidates/{id}/hard` | `View` / `ManageCandidates` (hard) |
| CV Upload | `POST /candidates/{id}/cv` (multipart, 5 MB), `GET /candidates/{id}/cv` (signed url) | `ManageCandidates` |
| Applications | `GET /applications`, `POST /applications`, `GET /applications/{id}`, `PUT /applications/{id}`, `DELETE /applications/{id}` | `View` / `Manage` |
| MoveStage | `POST /applications/{id}/move-stage {stageId}` | `Manage` |
| Stages | `GET /stages`, `POST /stages`, `PUT /stages/{id}`, `DELETE /stages/{id}`, `POST /stages/reorder {orderedIds}` | `Manage` |
| CSV Import | `POST /candidates/import` (multipart csv) | `ManageCandidates` |
| Public Apply | `POST /public/apply` (anon, honeypot + rate-limit) | `AllowAnonymous` |

Validasyon: FluentValidation, `closing_date`/`consent_given`/`file size/type` kontrolleri hem API hem web'de.

## 7. Permissions

`tenant_modules` → `Recruitment` modülü, seed 4 permission:

- `Recruitment.View` — listeleme/görüntüleme
- `Recruitment.Manage` — requisition/application/stage CRUD + move-stage
- `Recruitment.Publish` — publish/close/reopen
- `Recruitment.ManageCandidates` — aday CRUD, CV upload, CSV import, hard delete

`Owner` ve `Admin` rollerine otomatik grant (organization module pattern — `20260819000003`).

## 8. Web UI — `app/(dashboard)/[tenantSlug]/recruitment/page.tsx`

Tek dosya, 4 tab — `?tab=` query param ile (`organization/page.tsx` pattern, 2551 satır referans):

| Tab | İçerik |
|---|---|
| **İlanlar** | Tablo (filtre: status, department, search), kart görünümü, `Yeni İlan` modal, publish/close aksiyonları, `closing_date` uyarısı |
| **Adaylar** | Tablo + `KVKK` badge, `Yeni Aday` modal (consent checkbox zorunlu), CV upload (5 MB, PDF/DOC/DOCX), `CSV İçe Aktar` modal, duplicate warning, soft-delete |
| **Başvurular** | Tablo + **Kanban** drag-drop (stage kolonları, `sort_order` sırası), skor/notes inline, `Yeni Başvuru` modal, stage değiştirme (drag veya dropdown) |
| **Ayarlar** | Stage yönetimi: ekle/düzenle/sil, renk picker, aktif/pasif toggle, reorder (drag), `is_default` koruması |

**Ortak desenler:**

- `lib/api-client.ts` → `ApiClient` tenant header ile genişletilir (recruitment methods).
- `useMemo` filtreleme, `useState` tab/drawer/modal, `useEffect` `?tab=` senkronu.
- **Drawer detay:** aday/başvuru drawer — CV preview (iframe/pdf), timeline (stage geçmişi Faz 2'de), notes.
- **Modals:** requisition / candidate / application formları — `zod` + `react-hook-form` (varsa) veya kontrollü input + FluentValidation mesajları.
- **Kanban:** `@dnd-kit` veya native drag-drop — kolon = stage, kart = application, `onDragEnd` → `move-stage` API.
- Bildirim: Faz 1'de **in-app** (toast), e-posta Faz 2.
- Navigasyon: sidebar `İşe Alım` linki → `/[tenantSlug]/recruitment`.

> Deep-link: tek sayfa yerine `app/(dashboard)/[tenantSlug]/recruitment/applications/[id]/page.tsx` route'u **Faz 2**'de eklenecek — bkz. [ADR-0001](../../docs/adr/0001-recruitment-deep-link.md) ve [`phase2-todo.md`](./phase2-todo.md).

## 9. KVKK / GDPR

- **Aydınlatma & Açık Rıza:** aday oluşturma ve public apply formunda `KVKK onayı` checkbox zorunlu (`consent_given = true` olmadan `400`). Metin: KVKK aydınlatma metni linki.
- **Soft delete:** `DELETE /candidates/{id}` → `deleted_at` set, listede gizlenir (`HasQueryFilter`).
- **Hard delete:** `DELETE /candidates/{id}/hard` → sadece `ManageCandidates`, KVKK silme hakkı.
- **Anonimleştirme (2 yıl):** cron/scheduled job Faz 2'de — `deleted_at < now() - 2 years` → `first_name/last_name/email/phone` maskeleme. Faz 1'de manuel hard delete ile karşılanır.
- **CV storage:** tenant izole bucket, signed URL ile erişim, public bucket değil.

## 10. Constraints & Teknik Kararlar

- Faz 1 only — Faz 2 dosyaları oluşturulmaz, sadece todo/ADR notu.
- Q6 tüm alanlar dahil, Q7 limitler: **5 MB**, PDF/DOC/DOCX, path `{tenant}/{candidate}/{ts}-{name}`.
- Hibrit global per tenant, seed 7 stage, `is_default` korunur.
- Kapanış tarihi ve Closed validasyonları API'de `400`, headcount sadece warning.
- Ultracite/Biome zorunlu (`npm exec -- ultracite fix/check`), Next 16.3.3 `async params`, `proxy.ts` (eski middleware).
- `CREATE TYPE` enum yok — `VARCHAR` only.
- Single `page.tsx` tab pattern (organization), MediatR `IRequest`/`IEndpoint` + `HasQueryFilter` + `NpgsqlRlsInterceptor`.
- Mevcut WIP `leave-and-shift` 13 dosya değişikliği üzerine inşa — merge conflict'ten kaçın.

## 11. Exit Criteria (Faz 1)

- [ ] Supabase migration: 4 tablo + `recruitment-cvs` bucket + RLS/policies + seed, `DROP` yok
- [ ] `RecruitmentDbContext` + Entities (`ITenantScopedEntity`, soft-delete filter, indexler)
- [ ] API CRUD: requisitions/candidates/applications/stages + public apply (honeypot+rate-limit) + CSV import (500 limit)
- [ ] Tenant module + 4 permission seed, Owner/Admin grant
- [ ] Web `recruitment/page.tsx` 4 tab, tablo + kanban drag-drop, drawer, modals, CV upload/preview
- [ ] Duplicate e-posta + KVKK validasyonu (frontend+backend)
- [ ] Stage yönetimi UI (Ayarlar tabı)
- [ ] Closing/headcount kuralları, public form korumaları
- [ ] Docs dual: `.scratch/recruitment/*` ↔ `docs/recruitment/*` + ADR
- [ ] `turbo typecheck` + `dotnet build` + `ultracite check` geçer

## 12. Referanslar

- Domain: `docs/agents/domain.md` (single-context layout)
- Issue tracker: `docs/agents/issue-tracker.md` (`.scratch/<feature>/spec.md` + `issues/NN-*.md`)
- Triage labels: `docs/agents/triage-labels.md` (`needs-triage` → `ready-for-agent`)
- Context: `.tmp/sessions/2026-08-26-recruitment-phase1/context.md`
- ADR: [`0001-recruitment-deep-link.md`](../../docs/adr/0001-recruitment-deep-link.md)
- Faz 2: [`phase2-todo.md`](./phase2-todo.md)
