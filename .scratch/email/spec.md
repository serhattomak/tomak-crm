# Spec: Email Inbox + Bağlama + Gönderim + Şablon Entegrasyonu — Faz 1

> Status: **draft** | Date: 2026-09-03 | Session: `.tmp/sessions/2026-09-03-email-phase1/context.md` | Grill: 2 round, 10 Q, all approved as proposed
> Scope: Faz 1 — IMAP/SMTP generic + Resend fallback, tenant ortak Inbox, kalıcı Supabase storage, SMTP from bound account, `/email` 5 tab, auto-match + manual picker,Handlebars şablon reuse
> Faz 2 deferred: Gmail/Outlook OAuth (token refresh, push), scheduled send, advanced thread grouping, full Gmail API sync

## 1. Context & Problem

- `layout.tsx:982` placeholder `/{tenantSlug}/email` exists in `comm` hub but no route; `ICrmNotificationService` only SignalR, no SMTP; `quote_templates` just extended with `subject/html_body/variables_json` + `preview/test-send` (log-only)
- Users need real inbox (not preview) to receive customer replies to quotes/orders, bind their support email (e.g., support@tenant.com), send templated quotes, and link emails to customers/quotes/tickets — currently only in-app tickets/messages exists
- Grill decisions: tell → ask; binding token must be encrypted; polling cheaper than push for phase 1

## 2. Goals & Non-Goals

**Goals Faz 1:**
- Tenant ortak Inbox (View / ViewOwn permission split later): list/filter/search emails, read thread, compose/send via bound account SMTP or Resend fallback, draft save, template picker auto-fill
- Email account binding: CRUD generic IMAP (993) + SMTP (587) host/port, email + app password encrypted, test-connection, isActive toggle
- Persistent storage: `email_accounts`, `email_messages`, `email_attachments` with RLS `app.current_tenant_id`, thread via `subject normalized` (strip `Re:`/`Fwd:`) + `In-Reply-To` if present
- Compose: To/Cc/Subject/HtmlBody + variable chips (13 vars) + template dropdown (`getQuoteTemplates`) → `HandlebarsRenderer` same as quotes, preview iframe, attachment upload to Supabase Storage `email-attachments` 10MB
- `/email` Workbench page: `Inbox | Sent | Drafts | Bağlı Hesaplar | Şablonlar` 5 tabs (clone `automations` + `webhooks` tabs), KPI (Total Inbox, Unread, SentToday), search `from/subject/body` + filters `accountId/status`, pagination 20, SignalR `ReceiveEmail` push + poll fallback

**Non-Goals Faz 1 (deferred to Faz 2):**
- Gmail/Outlook OAuth (access_token/refresh_token, `gmail.users.messages.list`, push webhook)
- Scheduled send, snooze, undo-send
- Advanced threading (Message-ID tree), full-text Postgres `tsvector`, AI summary
- Scheduled `EmailSyncJob` push subscription (use Quartz poll 2-5 min instead)

## 3. Domain Glossary

- **EmailAccount**: tenant's bound mailbox (provider `generic_imap`, email, imap_host/port, smtp_host/port, encrypted_password, isActive)
- **EmailMessage**: persisted email row (direction `Inbound/Outbound`, status `Received/Sent/Draft/Failed`, thread_id, external_id = IMAP UID or Resend id, from/to/cc/subject/html_body/text_body, customerId/quoteId/ticketId nullable FK-like, accountId)
- **EmailThread**: virtual grouping by `normalizeSubject(subject)` + `account_id`; first message creates thread, replies share thread_id
- **Attachment**: Supabase Storage object `email-attachments/{tenantId}/{messageId}/{filename}` + DB row (filename, size, mime, storage_path)

## 4. Architecture & Data Model

### 4.1 Supabase Migration `20260903000003_email_module.sql`

```sql
-- email_accounts
CREATE TABLE public.email_accounts (
  id uuid pk gen_random_uuid(), tenant_id uuid not null, email varchar(255) not null,
  provider varchar(50) not null default 'generic_imap', -- generic_imap | resend
  imap_host text, imap_port int default 993, smtp_host text, smtp_port int default 587,
  encrypted_password text, -- AES-256-GCM base64
  is_active boolean default true, description text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
-- email_messages
CREATE TABLE public.email_messages (
  id uuid pk, tenant_id uuid not null, account_id uuid references email_accounts(id) cascade,
  thread_id uuid, -- self-ref grouping, nullable first msg
  direction varchar(20) not null check (direction in ('Inbound','Outbound')),
  status varchar(20) not null check (status in ('Received','Sent','Draft','Failed','Sending')),
  from_address text not null, to_addresses text[] not null, cc_addresses text[],
  subject text, html_body text, text_body text,
  external_id text, -- IMAP UID or resend id
  customer_id uuid, quote_id uuid, ticket_id uuid, -- nullable linkage
  is_read boolean default false, created_at timestamptz default now()
);
-- email_attachments
CREATE TABLE public.email_attachments (
  id uuid pk, tenant_id uuid, message_id uuid references email_messages(id) cascade,
  filename text not null, mime_type text, size_bytes int, storage_path text not null, created_at timestamptz default now()
);
-- indexes: (tenant_id, is_active), (tenant_id, account_id, created_at desc), (tenant_id, direction, status), (tenant_id, customer_id), (thread_id)
-- GIN on to_addresses, full-text on subject/html_body if needed but simple ILIKE for phase 1
-- RLS: FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id',true),'')::uuid)
-- Permissions seed: Emails.View, Emails.ViewOwn, Emails.Send, Emails.ManageAccounts (assign Admin/Owner)
-- Storage bucket: email-attachments public false, limit 10MB
```

### 4.2 Backend Module `CRM.Modules.Email` (new, clone Webhooks pattern)

- `Entities/EmailEntities.cs`: `EmailAccount : ITenantScopedEntity` + `EmailMessage` + `EmailAttachment` + `Table("email_*", Schema="public")`, `GetDecryptedPassword()/SetEncryptedPassword()`, `NormalizeSubject()`
- `Data/EmailDbContext.cs`: `DbSet<EmailAccount/Message/Attachment>`, `ToTable`, `HasColumnName` snake_case, `HasQueryFilter(e=>TenantId==currentTenant.Id)`, `HasConversion` for text[] arrays
- `Services/IEmailService.cs + SmtpEmailService.cs`: `SendAsync(accountId, to, cc, subject, htmlBody, attachments, isSimulation)` → if `account.provider==resend` use `HttpClient` to Resend API (fallback log if key missing), else `SmtpClient` (MailKit) with `encrypted_password` decrypt, 15s timeout, `isSimulation` skips send, returns `sent:true/false`; `FetchInboundAsync(account)` via IMAP (MailKit `ImapClient` 993 ssl) `FETCH UNSEEN` → map to `EmailMessage` + attachments download to Storage; `ComputeThreadId(subject, accountId)`; `ILogger`
- `Services/EmailSyncJob.cs` (Quartz-like hosted service or `IHostedService` 2min poll as `QuoteExpirationJob` pattern): iterate active accounts, `FetchInboundAsync`, upsert messages, `ICrmNotificationService.SendToTenantAsync("ReceiveEmail", messageDto)` for realtime push
- `Features/`: `CreateEmailAccount`, `UpdateEmailAccount`, `GetEmailAccounts`, `GetEmailAccountDetails`, `ToggleEmailAccount`, `DeleteEmailAccount`, `TestEmailAccountConnection` (IMAP+SMTP dial test), `GetEmailMessages` (search/event/status filters, pagination), `GetEmailThread`, `SendEmailMessage` (validate To, render template if templateId, handle attachments, call `IEmailService.SendAsync`), `SaveDraft`, `MarkRead`, `DeleteMessage`, `GetEmailStats` (inbox total/unread/sentToday), `SearchEmailMessages`
- `EmailModuleExtensions.cs`: `AddEmailModule(Npgsql MigrationsHistory __EFMigrationsHistory_Email + AddHttpClient + AddScoped<IEmailService> + AddHostedService<EmailSyncJob> + AddMediatR)`
- Permissions: `RequirePermission("Emails.View")` for list/read, `Emails.Send` for send, `Emails.ManageAccounts` for CRUD accounts

### 4.3 Frontend `app/(dashboard)/[tenantSlug]/email/page.tsx` (Workbench, clone automations+webhooks)

- `use client`, `tenantSlug` via `useParams`, `activeTab` 5 tabs (`inbox|sent|drafts|accounts|templates`), `useDebounce` 400ms for search
- **KPI Bento 3 cards**: Inbox Total, Unread (badge), Sent Today — from `getEmailStats`
- **Inbox Tab**: search `from/subject/body` (ILIKE) + filters `accountId` select + `isRead` + `customerId` if linked; table: from (with customer link), subject (with thread count), snippet, to, isRead dot, linked entity badges (Customer/Quote/Ticket), attachments icon, createdAt tr-TR, pagination 20; row click → thread drawer (messages in thread, HTML body iframe sanitize, attachments download, Reply/Forward + Linked entity picker)
- **Sent/Drafts Tab**: similar but `direction=Outbound` + `status=Sent/Draft`, Sent shows `to/subject/status`, Drafts has `Edit` → compose modal, `Delete`
- **Bağlı Hesaplar Tab**: table accounts (email, provider, imap/smtp host:port, isActive toggle, Test Bağlantı, Edit → `/email/accounts/[id]` builder or modal, Delete), `Yeni Hesap` button → modal/form (email, provider select generic_imap/resend, imap_host/port, smtp_host/port, password (encrypted show-once masked `****abcd` + copy), description, isActive) with validation `email valid, host not empty, password not empty if new`
- **Şablonlar Tab**: embed quote_templates list (reuse `TemplatePreview` iframe + `VariableChips` + `TestSendModal` logic from email-template-editor) — reuse `getQuoteTemplates` + `previewQuoteTemplate/testSend` but here compose can pick template: `templateId` → `handleTemplateChange` fills subject/htmlBody + variable chips
- **Compose Drawer/Modal**: To (email validation, comma-separated), Cc, Subject, HtmlBody textarea (or rich with variable chips, same `insertVariable` ref), Attachments upload (Supabase Storage `email-attachments`, 10MB limit, list with remove), Template Picker dropdown (fetch `getQuoteTemplates`), Preview button (`preview` via `HandlebarsRenderer` with mock/real quote if linked), Send button → `ApiClient.sendEmailMessage({accountId, to, cc, subject, htmlBody, templateId?, customerId?, quoteId?, attachments})` → toast `E-posta gönderildi` + pivot to Sent, Save Draft → `saveDraft`
- **Realtime**: `realtime-notification-context.tsx` subscription to `ReceiveEmail` event → `toast + refresh inbox`, fallback poll 30s
- Design: Bento 1px border blur, oklch `--color-accent`, Geist, 4pt spacing, 8-20 radii, no gradients/glass, `next/image` not needed, `rel="noopener"` for external links, `DOMPurify` if HTML body rendered directly else iframe `srcDoc`

### 4.4 ApiClient `lib/api-client.ts`

```ts
export interface EmailAccountDto { id, tenantId, email, provider, imapHost, imapPort, smtpHost, smtpPort, isActive, description, secretMasked?, createdAt, updatedAt }
export interface EmailMessageDto { id, tenantId, accountId, threadId?, direction, status, fromAddress, toAddresses, ccAddresses?, subject?, htmlBody?, textBody?, externalId?, customerId?, quoteId?, ticketId?, isRead, hasAttachments, createdAt }
export interface EmailThreadDto { threadId, messages: EmailMessageDto[] }
export interface PagedEmailMessages { items, page, pageSize, totalCount }

// accounts
getEmailAccounts(tenantId) GET /api/email/accounts
getEmailAccountById(id, tenantId) GET /api/email/accounts/{id}
createEmailAccount(data: {email, provider, imapHost, imapPort, smtpHost, smtpPort, password, description?, isActive}, tenantId) POST /api/email/accounts
updateEmailAccount(id, data, tenantId) PUT /api/email/accounts/{id}
toggleEmailAccount(id, isActive?, tenantId) PATCH /api/email/accounts/{id}/toggle
deleteEmailAccount(id, tenantId) DELETE /api/email/accounts/{id}
testEmailAccountConnection(id, tenantId) POST /api/email/accounts/{id}/test-connection
// messages
getEmailMessages(params: {accountId?, direction?, status?, search?, customerId?, isRead?, page?, pageSize?}, tenantId) GET /api/email/messages
getEmailThread(threadId, tenantId) GET /api/email/threads/{threadId}
getEmailStats(tenantId) GET /api/email/stats
sendEmailMessage(data: {accountId, to, cc?, subject, htmlBody, templateId?, customerId?, quoteId?, attachments?}, tenantId) POST /api/email/messages/send
saveEmailDraft(data, tenantId) POST /api/email/messages/draft
markEmailRead(id, isRead, tenantId) PATCH /api/email/messages/{id}/read
deleteEmailMessage(id, tenantId) DELETE /api/email/messages/{id}
```

## 5. Permissions & Security

- `Emails.View` (list/read any), `Emails.ViewOwn` (only own account's messages — phase 1 = View only, ViewOwn deferred), `Emails.Send` (compose/send), `Emails.ManageAccounts` (CRUD accounts). `RequirePermission` on each endpoint, `PermissionGate` on UI buttons.
- Password encrypted AES-256-GCM base64 at rest (`encrypted_password`), decrypt only in `SmtpEmailService`, never returned except `secretMasked ****abcd` + show-once on create. OAuth tokens same if phase 2.
- HTML bodies sanitized via `HtmlSanitizer` backend + `DOMPurify` or iframe `srcDoc` frontend, `XSS <script>` stripped.
- Attachment storage RLS per tenant, 10MB limit via Storage policy.

## 6. UI Invariants & Design Tokens

- Workbench layout: sidebar rail collapsible + sticky context bar (TenantSwitcher + CmdK + QuickActions + NotificationHub) + Bento Grid 1px border `border-zinc-200/80 bg-white/90 backdrop-blur-sm` + `rounded-2xl` (16px) + `shadow-xs`, hover `shadow-sm`, no generic hero, dense info
- Theme tokens `design.md` oklch, Geist 600-700 display / 400-500 body, Geist Mono for email addresses/IDs, tracking -0.02 headline, tabular numerals for dates
- Empty states: focal action (e.g., `Henüz e-posta yok — İlk hesabınızı bağlayın` + `Hesap Bağla` button)
- Accessibility: `key` props, semantic table with caption, focus rings, keyboard shortcuts `CmdK` for search

## 7. Flow Examples

- **Bind account:** `Bağlı Hesaplar` → `Yeni Hesap` → fill `support@tenant.com` + `imap.smtp.com:993/587` + app password → `Test Bağlantı` (IMAP dial) → `Kaydet` → encrypted store → `EmailSyncJob` next poll fetches unseen → `ReceiveEmail` push → Inbox shows new row
- **Send with template:** Inbox → `E-posta Yaz` → `Şablon Seç: Standart Kurumsal Teklif` → `handleTemplateChange` fills subject/htmlBody with `{{customerName}}` etc + variable chips → pick customer `Ahmet Yılmaz` → `{{customerName}}` auto-replaced preview → attach `teklif.pdf` → `Gönder` → `IEmailService` via SMTP → `email_messages` row `Sent` + thread_id → Sent tab shows

## 8. Exit Criteria Faz 1

- [ ] Migration `20260903000003_email_module.sql` applies (3 tables + indexes + RLS + permissions + Storage bucket)
- [ ] `CRM.Modules.Email` builds, DI `AddEmailModule`, 14 endpoints mapped, encrypted password, RLS tenant filter
- [ ] IMAP fetch `EmailSyncJob` 2-5 min poll fetches unseen, creates messages + attachments to Storage, realtime push via SignalR
- [ ] SMTP send via bound account (or Resend fallback log) creates `Sent` message, failure → `Failed`, draft save works
- [ ] `/email` page 5 tabs render, KPI, search/filter/pagination 20, Inbox/Sent/Drafts tables, thread drawer, compose modal with template picker + variable chips + attachment upload 10MB
- [ ] Account binding CRUD + Test Connection works, secret masked show-once, toggle active
- [ ] Template embed in `/email` → `Şablonlar` tab shows same quote_templates with preview iframe + test-send reuse, variable insertion at cursor works
- [ ] ApiClient 14 methods tenant header explicit, no `any`, `ultracite check` + `tsc --noEmit` + `dotnet build` pass, design restraint pass

## 9. Deferred Faz 2

- Gmail/Outlook OAuth (PKCE, refresh_token, `gmail.users.watch` push), IMAP IDLE, `email_oauth_tokens` table
- Scheduled send (`send_at`), snooze, undo 10s, AI thread summary
- Full-text `tsvector` + `pg_trgm` search, `email_threads` materialized view
- Outbound webhook for `Email.Sent` automation trigger

## 10. References

- Grill decisions: Round1 Q1-6 + Round2 Q7-10 approved as proposed (tenant common, IMAP+Resend, persistent, SMTP from account, 5 tabs, auto-match)
- `layout.tsx:149-158` comm hub mapping, `20260903000002_email_templates.sql` Handlebars 13 vars, `Webhooks` module pattern, `PreviewQuoteTemplate` renderer, `TemplatePreview/TestSendModal/VariableChips` reuse
