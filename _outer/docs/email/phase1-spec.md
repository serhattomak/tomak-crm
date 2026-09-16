# Email Phase 1 Spec — Inbox + Bağlama + Gönderim + Şablon Entegrasyonu

> Kopya: `.scratch/email/spec.md` (kanonik) — bu dosya `docs/email/` public kanonik kopyasıdır.
> Tarih: 2026-09-03 | Grill: 10 Q approved | Status: draft → ready-for-agent

Özet: Faz 1 IMAP/SMTP generic + Resend fallback, tenant ortak Inbox, Supabase kalıcı `email_accounts/messages/attachments`, `app/(dashboard)/[tenantSlug]/email/page.tsx` 5 tab, Handlebars şablon reuse.

Detay için: `.scratch/email/spec.md` (10 bölüm, migration SQL, `CRM.Modules.Email` entities/services/features, `ApiClient` 14 method, UI Bento, permissions `Emails.*`, exit criteria 8 madde).

Faz 2 deferred: Gmail/Outlook OAuth, scheduled send, AI summary, tsvector.

