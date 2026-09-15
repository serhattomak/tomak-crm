# Task Breakdown: Faz 2 — Ücretsiz GİB e-Arşiv Fatura (UBL-TR 2.1) & WhatsApp Cloud API

Bu doküman Faz 2 kapsamındaki alt görevleri ve subagent sınırlarını tanımlar.

---

## 1. Alt Görevler (Subtasks)

### Task-2A: DB Şeması & Migrations
- **Sorumlu Subagent:** Database Architect
- **Görevler:**
  - `invoices` tablosuna e-Arşiv alanları ekleme veya genişletme:
    - `ettn` UUID (Evrensel Tekil Tanımlama Numarası)
    - `ubl_xml` TEXT (UBL-TR 2.1 standardında resmi XML)
    - `is_e_archive` BOOLEAN DEFAULT TRUE
    - `e_archive_report_status` VARCHAR(50) DEFAULT 'Draft' (Draft, Generated, ExportedToGib, Reported)
    - `e_archive_type` VARCHAR(50) DEFAULT 'NORMAL' (NORMAL, INTERNET, IHRACAT)
  - `whatsapp_messages` ve `whatsapp_templates` tabloları:
    - `whatsapp_messages` (id, tenant_id, customer_id, phone_number, direction [Inbound, Outbound], message_text, media_url, meta_message_id, status [Sent, Delivered, Read, Failed], created_at)
    - `whatsapp_settings` (id, tenant_id, phone_number_id, waba_id, access_token, webhook_verify_token, is_active)
  - RLS Tenant Isolation & Permissions (`Invoices.EArchive`, `WhatsApp.View`, `WhatsApp.Send`).
- **Çıktı Dosyası:** `supabase/migrations/20260910000002_earchive_and_whatsapp.sql`

---

### Task-2B: UBL-TR 2.1 XML Generator Servisi & Fatura Endpoints
- **Sorumlu Subagent:** Backend Engineer (.NET 10 - Invoicing)
- **Görevler:**
  - `CRM.Modules.Invoicing.Services`:
    - `IUblTrXmlService` & `UblTrXmlService`: Fatura detaylarından (`InvoiceDetailDto`) GİB UBL-TR 2.1 standartlarına tam uyumlu XML çıktısı üretimi (InvoiceType, AccountingSupplierParty, AccountingCustomerParty, TaxTotal, LegalMonetaryTotal, InvoiceLine kalemleri).
    - ETTN (UUID) ve otomatik Fatura Seri-Sıra kontrolü.
  - Endpoints:
    - `POST /api/v1/invoices/{id}/generate-ubl`: Faturanın resmi UBL-TR 2.1 XML'ini oluşturup kaydeder.
    - `GET /api/v1/invoices/{id}/download-ubl`: XML dosyasını `.xml` olarak indirir.
    - `GET /api/v1/invoices/export-gib-batch`: Seçilen faturaları GİB e-Arşiv Portalına doğrudan yüklenebilecek ZIP formatında paketler.

---

### Task-2C: Meta WhatsApp Cloud API Modülü & Webhook
- **Sorumlu Subagent:** Backend Engineer (.NET 10 - WhatsApp)
- **Görevler:**
  - `CRM.Modules.Chat` veya yeni `CRM.Modules.Integrations.WhatsApp` Minimal API:
    - `GET /api/public/webhooks/whatsapp`: Meta Webhook Verification (`hub.mode`, `hub.verify_token`, `hub.challenge`).
    - `POST /api/public/webhooks/whatsapp`: Gelen mesajları (Inbound) dinleme, `whatsapp_messages` tablosuna yazma ve `customers` ile GSM eşleştirme.
    - `POST /api/v1/whatsapp/send`: Müşteriye giden (Outbound) metin veya hazır onaylı şablon mesajı gönderme (Meta Graph API v21.0).

---

### Task-2D: Frontend UI — e-Arşiv Fatura Paneli & WhatsApp Canlı Sohbet
- **Sorumlu Subagent:** Frontend Engineer (Next.js 16)
- **Görevler:**
  - `/invoices`: Fatura listesinde "UBL XML İndir" ve "GİB Paketi Dışa Aktar" aksiyonları; Fatura detay modalında "GİB e-Arşiv UBL-TR Önizleme" sekmesi.
  - `/messages`: WhatsApp sekmesi veya filtreleme, müşteri GSM üzerinden doğrudan WhatsApp mesajı gönderme ve gelen mesajları anlık görüntüleme.
