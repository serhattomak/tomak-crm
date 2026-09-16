# Faz 1 E-posta Modülü Doğrulama ve Manuel Test Planı

**Tarih:** 2026-09-03  
**Modül:** `CRM.Modules.Email` & Web `/email` Workbench  
**Kapsam:** IMAP/SMTP Generic + Resend Fallback, Supabase Veritabanı & RLS, 5 Sekmeli Workbench, İleti Dizileri, Şablonlar ve Güvenlik.

---

## 1. Otomasyon ve Derleme Doğrulama Raporu (Automated Verification)

| Aşama | Komut | Sonuç | Durum |
|---|---|---|---|
| **Frontend Linter & Formatter** | `npm exec -- ultracite check` | 0 Hata (`page.tsx`, `email-thread-drawer.tsx`, `email-account-modal.tsx`, `compose-modal.tsx`) | ✅ GEÇTİ |
| **Next.js & TypeScript Build** | `npm run build` (`next build` Turbopack) | `Compiled successfully in 1125ms`, `Finished TypeScript in 6.6s`, `Generating static pages (11/11)` | ✅ GEÇTİ |
| **.NET Backend Build** | `dotnet build apps/api/src/CRM.Api/CRM.Api.csproj` | 0 Hata (`CRM.Modules.Email.dll` ve `CRM.Api.dll` başarıyla derlendi) | ✅ GEÇTİ |
| **Database Migration** | `20260903000003_email_module.sql` | `email_accounts`, `email_messages`, `email_attachments` tabloları, RLS ve Storage bucket tanımı hazır | ✅ GEÇTİ |

---

## 2. Manuel Test Senaryoları (Manual Test Plan)

### Senaryo 1: E-posta Hesabı Bağlama ve Test Bağlantısı (Accounts CRUD + Test Connection)
- **Adım:**
  1. `/email` sayfasına gidin ve "Bağlı Hesaplar" sekmesine tıklayın.
  2. "Yeni Hesap Bağla" butonuna tıklayarak modalı açın.
  3. `generic_imap` sağlayıcısını seçin. IMAP host (`imap.example.com`, port 993, SSL) ve SMTP host (`smtp.example.com`, port 587, StartTLS) bilgilerini, e-posta adresi ve şifresini girin.
  4. "Bağlantıyı Test Et" butonuna tıklayın.
- **Beklenen Sonuç:**
  - Socket bağlantısı `TestConnection` endpoint'i üzerinden test edilir, başarı/hata toast mesajı gösterilir.
  - Hesap kaydedildiğinde parola AES-256-GCM ile şifrelenir ve maskelenmiş olarak (`****abcd`) döner.
  - Tabloda hesap aktif olarak listelenir, "Aktif/Devre Dışı" geçiş butonu çalışır.

### Senaryo 2: Gelen E-postaların Eşitlenmesi (IMAP Sync & SignalR Realtime)
- **Adım:**
  1. Bağlı hesaba harici bir adresten e-posta gönderin.
  2. Arka plan servisi `EmailSyncJob` (2 dakikalık periyot) çalışırken bekleyin veya API üzerinden tetikleyin.
- **Beklenen Sonuç:**
  - `FETCH UNSEEN` ile yeni e-posta yakalanır.
  - Çok parçalı (MIME multipart) HTML/text gövde ve ekler ayrıştırılarak `email_messages` ve `email_attachments` tablolarına kaydedilir.
  - SignalR üzerinden `ReceiveEmail` tenant grubuna iletilir ve web arayüzünde toast bildirimi çıkar.
  - Gelen kutusunda satır kalın (okunmamış) ve mavi bildirim noktasıyla gösterilir, KPI unread sayısı artar.

### Senaryo 3: E-posta Yazma, Şablon ve Değişken Çipleri (Compose + Templates)
- **Adım:**
  1. "E-posta Yaz" butonuna tıklayın.
  2. Şablon açılır menüsünden teklif şablonu seçin.
  3. Değişken çiplerine (ör. `{{customerName}}`, `{{quoteNumber}}`) tıklayarak metin imlecinin olduğu yere değişken ekleyin.
  4. 10 MB altı bir dosya ekleyin (ör. PDF).
  5. "Önizleme" sekmesine geçerek render edilen HTML çıktısını kontrol edin.
  6. "Gönder" butonuna basın.
- **Beklenen Sonuç:**
  - E-posta SMTP üzerinden gönderilir (veya test ortamında yapılandırılmışsa Resend fallback devreye girer).
  - İleti `email_messages` tablosuna `status = 'Sent'` ve deterministik `thread_id` ile yazılır.
  - "Gönderilenler" sekmesinde yeşil "Gönderildi" rozetiyle görünür.

### Senaryo 4: Taslak Kaydetme ve Düzenleme (Drafts Management)
- **Adım:**
  1. E-posta yazma penceresinde alıcı ve konuyu yazıp "Taslak Olarak Kaydet" butonuna tıklayın.
  2. Modal kapandıktan sonra "Taslaklar" sekmesine geçin.
  3. Taslak satırındaki düzenle kalem simgesine tıklayın.
- **Beklenen Sonuç:**
  - İleti `status = 'Draft'` olarak kaydedilir.
  - Düzenle butonuna basıldığında modal form önceki bilgilerle açılır ve güncelleme/gönderim yapılabilir.

### Senaryo 5: İleti Dizisi ve Yanıtlama (Thread Drawer + Reply/Forward)
- **Adım:**
  1. Gelen kutusundaki bir iletiye tıklayın.
  2. Sağ tarafta `EmailThreadDrawer` açılır.
  3. "Yanıtla" veya "İlet" butonuna tıklayın.
- **Beklenen Sonuç:**
  - Diziye ait tüm e-postalar kronolojik sırayla accordion içinde listelenir.
  - HTML gövde güvenli iframe içinde gösterilir.
  - "Yanıtla" tıklandığında `Re: Konu` başlığı ve alıntılanmış önceki ileti gövdesi ile compose modalı açılır.

### Senaryo 6: Şablonlar Sekmesi ve Önizleme (Templates Tab)
- **Adım:**
  1. "Şablonlar" sekmesine geçin.
  2. Teklif şablonları grid kartları halinde listelenir.
  3. "Önizle" butonuna tıklayın.
  4. "Bu Şablonla Yaz" butonuna tıklayın.
- **Beklenen Sonuç:**
  - Iframe içinde şablonun ham HTML önizlemesi görüntülenir.
  - "Bu Şablonla Yaz" butonuna tıklandığında şablon içeriği compose modalına aktarılır.

### Senaryo 7: Filtreleme, Arama ve Sayfalama (Search & Pagination)
- **Adım:**
  1. Arama kutusuna gönderici veya konu ile ilgili bir metin yazın (400ms debounce).
  2. Hesap seçici ve "Sadece Okunmamış" filtrelerini uygulayın.
  3. 20'den fazla kayıt olduğunda sayfalama oklarını test edin.
- **Beklenen Sonuç:**
  - Tablo filtrelenmiş verileri anında günceller ve sayfalama doğru çalışır.

### Senaryo 8: Yetkilendirme ve İzin Güvenliği (Permission Gate)
- **Adım:**
  1. `Emails.Send` yetkisi olmayan bir kullanıcıyla giriş yapın.
  2. `Emails.ManageAccounts` yetkisi olmayan bir kullanıcıyla giriş yapın.
- **Beklenen Sonuç:**
  - `Emails.Send` yoksa "E-posta Yaz" butonu gizlenir ve backend `POST /api/email/messages/send` 403 Forbidden döner.
  - `Emails.ManageAccounts` yoksa "Yeni Hesap Bağla" butonu gizlenir ve backend `POST /api/email/accounts` 403 Forbidden döner.

---

## 3. Exit Criteria Doğrulama Matrisi

| # | Spesifikasyon Maddesi | Karşılanma Durumu | Kanıt / Dosya |
|---|---|---|---|
| 1 | Migration `20260903000003_email_module.sql` | ✅ TAMAMLANDI | `crm-monorepo/supabase/migrations/20260903000003_email_module.sql` |
| 2 | `CRM.Modules.Email` & 14 API Endpoint | ✅ TAMAMLANDI | `EmailModuleExtensions.cs`, `AccountsController.cs`, `MessagesController.cs` |
| 3 | IMAP Eşitleme Servisi (`EmailSyncJob`) | ✅ TAMAMLANDI | `EmailSyncJob.cs`, `SmtpEmailService.cs` |
| 4 | SMTP Gönderim & Resend Fallback | ✅ TAMAMLANDI | `SmtpEmailService.cs` |
| 5 | Web `/email` 5 Sekmeli Workbench | ✅ TAMAMLANDI | `apps/web/app/(dashboard)/[tenantSlug]/email/page.tsx` |
| 6 | E-posta Yazma & Şablon Modalı | ✅ TAMAMLANDI | `components/email/compose-modal.tsx` |
| 7 | Hesap Yönetimi & Test Bağlantısı Modalı | ✅ TAMAMLANDI | `components/email/email-account-modal.tsx` |
| 8 | İleti Dizisi Çekmecesi (Thread Drawer) | ✅ TAMAMLANDI | `components/email/email-thread-drawer.tsx` |
| 9 | Web `ApiClient` 14 E-posta Metodu | ✅ TAMAMLANDI | `apps/web/lib/api-client.ts` |
| 10 | Güvenlik, AES-256 Şifreleme & RLS | ✅ TAMAMLANDI | `EmailAccount.SecretEncrypted`, `RequirePermission`, `PermissionGate` |
