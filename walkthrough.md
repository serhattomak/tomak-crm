# E-posta Modülü — Şablon Yönetimi Entegrasyonu ve Doğrulama Özeti

Kullanıcının `/grill-me` talebi doğrultusunda, Teklifler sayfasında yer alan şablon ekleme, düzenleme ve silme kabiliyeti E-posta çalışma alanına (`/email` altındaki **Şablonlar** sekmesine) entegre edilmiştir.

---

## 1. Eklenen & Güncellenen Bileşenler

| Dosya | Durum | Açıklama |
|---|---|---|
| [`components/email/template-modal.tsx`](file:///d:/serhatdev/crm/crm-monorepo/apps/web/components/email/template-modal.tsx) | [NEW] | İki panelli canlı önizleme modalı. Sol panelde form alanları (ad, konu, Handlebars HTML editörü, imleç konumuna tıklanabilir değişken çipleri, varsayılan şablon seçimi ve daraltılabilir teklif özel alanları), sağ panelde anlık sandbox `iframe` önizlemesi ve "HTML Kopyala" butonu. |
| [`app/(dashboard)/[tenantSlug]/email/page.tsx`](file:///d:/serhatdev/crm/crm-monorepo/apps/web/app/%28dashboard%29/%5BtenantSlug%5D/email/page.tsx) | [MODIFY] | "Şablonlar" sekmesi başlığına `PermissionGate` korumalı **"Yeni Şablon Ekle"** butonu; `TemplateCard` kartlarına **"Düzenle"** ve güvenli (onay mekanizmalı) **"Sil"** aksiyonları eklendi. `TemplateModal` entegrasyonu tamamlandı. |

---

## 2. Kullanıcı Deneyimi & Özellikler

1. **Yeni Şablon Oluşturma:**
   - E-posta ekranında "Şablonlar" sekmesine geçildiğinde sağ üstteki **"Yeni Şablon Ekle"** butonu ile modal açılır.
   - 13 adet dinamik değişken (ör. `{{customerName}}`, `{{quoteNumber}}`, `{{itemsTable}}`, `{{totalAmount}}`) çip olarak listelenir; tıklandığında textarea içinde imlecin durduğu konuma otomatik yerleştirilir.
   - Sağ tarafta iframe içinde girilen HTML veya metin anlık canlı önizleme olarak akar.
2. **Şablon Düzenleme & Silme:**
   - Mevcut her şablon kartının altında **"Önizle"**, **"Düzenle"** ve **"Sil"** butonları yer alır.
   - "Düzenle" tıklandığında mevcut şablon verileriyle modal açılır ve `ApiClient.updateQuoteTemplate` ile güncellenir.
   - "Sil" tıklandığında iki aşamalı inline onay ("Sil / İptal") devreye girer; onaylandığında `ApiClient.deleteQuoteTemplate` çağrılır ve liste yenilenir.
3. **Teklifler Modülü ile %100 Uyumluluk:**
   - Oluşturulan veya düzenlenen şablonlar doğrudan `quote_templates` üzerinde işlem yapar. Hem Teklifler modülünden hem E-posta modülünden ortaklaşa kullanılabilir.
   - Banka, teslimat, ödeme koşulları gibi teklife özel alanlar daraltılabilir "Teklif Özel Alanları" bölümünde opsiyonel olarak sunulur.

---

## 3. Koyu Mod Önizleme İyileştirmeleri (Dark Mode Preview)

- **Kök Neden:** Sandboxed `iframe` bileşenleri izole DOM bağlamında çalıştığı ve CRM teması `next-themes` tarafından `<html>` sınıfı (`.dark`) ile yönetildiği için, iframe içi gövde tarayıcı varsayılan siyah metin rengini (`#000000` / `#18181b`) alıyordu. Koyu modda ebeveyn konteyner `dark:bg-zinc-950` olduğundan, şeffaf iframe üzerinde siyah metin görünmez hale geliyordu.
- **Çözüm:**
  - [`lib/email-preview.ts`](file:///d:/serhatdev/crm/crm-monorepo/apps/web/lib/email-preview.ts): Sandboxed iframe'ler için güvenli HTML sarmalayıcısı (`renderEmailPreviewHtml`) oluşturuldu. Koyu modda `background: #09090b !important; color: #f4f4f5 !important;`, açık modda ise `background: #ffffff !important; color: #18181b !important;` zorunlu kılındı. Ayrıca `p, span, div, li, td, th, h1-h6 { color: inherit; }` ile unstyled HTML etiketlerinin metinlerinin her zaman okunabilirliği garanti altına alındı.
  - **Görünüm Seçici (Toggle):** `TemplateModal` ve `TemplatePreviewModal` bileşenlerine **"Kağıt Görünümü (Açık)"** / **"Koyu Görünüm"** butonu eklendi. Kullanıcı isterse e-postanın alıcıda (kağıt üzerinde) nasıl görüneceğini tek tıkla test edebilir.
  - İlgili tüm bileşenler (`template-modal.tsx`, `email/page.tsx`, `compose-modal.tsx`, `email-thread-drawer.tsx`) bu merkezi yapıya bağlandı.

---

## 4. Doğrulama Sonuçları

- **Ultracite Linter & Formatter:**
  ```bash
  npm exec -- ultracite check "apps/web/lib/email-preview.ts" "apps/web/components/email/template-modal.tsx" "apps/web/app/(dashboard)/[tenantSlug]/email/page.tsx" "apps/web/components/email/compose-modal.tsx" "apps/web/components/email/email-thread-drawer.tsx"
  # Checked 5 files in 240ms. No fixes applied. (0 HATA)
  ```
- **Next.js & TypeScript Derlemesi:**
  ```bash
  npm run build
  # ✓ Compiled successfully in 1263ms
  # Running TypeScript ... Finished in 6.9s
  # Generating static pages (11/11)
  # ├ ƒ /[tenantSlug]/email
  ```
