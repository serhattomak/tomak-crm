# Task Breakdown: Faz 1 — B2B Müşteri Portali, Sözleşme Yönetimi & E-İmza

Bu dosya Faz 1 geliştirmelerini alt iş paketlerine (task) böler ve paralel çalışacak subagent'ların görev sınırlarını tanımlar.

---

## İş Paketi 1 (Task-1A): DB Şeması & Migrations
- **Sorumlu Subagent:** Database Architect
- **Görevler:**
  - `contracts` (id, tenant_id, contract_number, title, customer_id, quote_id, status ['Draft', 'Sent', 'Signed', 'Active', 'Expired', 'Cancelled'], content_html, total_amount, currency, signed_at, signed_by_name, signature_image_url, ip_address, audit_hash, valid_until, created_at, updated_at).
  - `contract_templates` (id, tenant_id, name, description, content_html, is_default, is_active, created_at).
  - `customer_portal_access` (id, tenant_id, customer_id, email, access_token, token_expires_at, is_active, last_login_at).
  - RLS Tenant Isolation politikaları ve Permissions seed (`Contracts.View`, `Contracts.Create`, `Contracts.Manage`, `Contracts.Delete`).
- **Çıktı Dosyası:** `crm-monorepo/supabase/migrations/20260910000001_contracts_and_portal.sql`

---

## İş Paketi 2 (Task-1B): Backend C# Module & API Endpoints
- **Sorumlu Subagent:** Backend Engineer (.NET 10)
- **Görevler:**
  - `CRM.Modules.Contracts` modülünü veya ilgili Feature endpoint'lerini oluşturma / slnx entegrasyonu.
  - Endpoints:
    - `GET /api/v1/contracts` (Paged list, filter by status/customer)
    - `GET /api/v1/contracts/{id}`
    - `POST /api/v1/contracts` (Create draft)
    - `POST /api/v1/contracts/from-quote/{quoteId}` (Tekliften sözleşme türetme)
    - `PUT /api/v1/contracts/{id}`
    - `DELETE /api/v1/contracts/{id}`
    - `POST /api/public/contracts/{token}/sign` (Portal e-imza kaydetme, IP ve SHA-256 hash loglama)
- **Çıktı:** .NET Controller/Endpoints, MediatR CQRS Commands & Queries.

---

## İş Paketi 3 (Task-1C): CRM Web Arayüzü — Sözleşme Yönetimi (`/contracts`)
- **Sorumlu Subagent:** Frontend Dashboard Engineer (Next.js 16)
- **Görevler:**
  - `apps/web/app/(dashboard)/[tenantSlug]/contracts/page.tsx`:
    - Bento Grid KPI strip (Toplam Sözleşmeler, İmzalananlar, Bekleyenler, Toplam Değer).
    - Tablo / Liste görünümü, filtreleme, arama.
    - Yeni Sözleşme / Şablon oluşturma modalları.
    - Teklifler modülüne "Sözleşmeye Dönüştür" butonu ve yönlendirme.
  - `ApiClient` metodları (`getContracts`, `createContract`, `getContractTemplates`, vb.).
  - Bento Grid ve `design.md` kurallarına tam uyum.

---

## İş Paketi 4 (Task-1D): Müşteri Bütünleşik Self-Servis Portali (`/portal`)
- **Sorumlu Subagent:** Frontend Portal & E-Sign Engineer
- **Görevler:**
  - `apps/web/app/portal/[token]/` genişletme veya `/portal` ana müşteri paneli.
  - Sekmeli / Bütünleşik Portal Görünümü:
    - **Teklifler:** Kabul/Red/Revizyon.
    - **Sözleşmeler:** Doküman okuma + HTML5 Canvas E-İmza alanı + İndirilebilir Onaylı PDF/Görünüm.
    - **Faturalar:** Ödeme ve bakiye takibi.
    - **Destek Talepleri:** Yeni bilet oluşturma ve mesajlaşma.
  - E-İmza bileşeni: Parmak/fare ile imza çizme, temizleme, onaylama ve audit hash doğrulama.
