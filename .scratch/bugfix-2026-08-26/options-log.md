# Bugfix Batch 2026-08-26 — Tüm Seçenekler Logu

> Kaynak: grilling 2026-08-26 — kullanıcı “Her şeyi önerdiğin gibi yap” dedi, tüm A/B/C seçenekleri burada saklanıyor. İleride “şunu C yerine B yap” demek için bu dosyaya bak.

## Q1 — Sipariş tahsilat 500
**Sorun:** `POST /api/orders/{id}/payments` sadece `amount>0` kontrolü, fazla ödeme, tekrarlı `ReferenceNumber`, RLS/tenant header, frontend hatayı gizliyor → 500.

- **A)** Sadece hatayı görünür kıl (frontend toast + API 400 detay)
- **B)** A + fazla ödeme engeli (400 "Kalanı aşamaz") + idempotency (`ReferenceNumber` unique per order)
- **C) ✅ ÖNERİLEN & ONAYLANAN** — B + tahsilat tarihi seçici (geçmiş tarih) + `PaymentMethod` enum doğrulaması. `ReferenceNumber` boşsa opsiyonel, doluysa unique. Toast + enum + tarih birlikte.

## Q2 — Sipariş proforma yazdırma
- **Öneri C? yok, tek öneri ama varyantlar tartışıldı:**
  - Route: `/orders/[orderId]/print?type=proforma` (alternatif: `/proforma`, `/print`, public token’lı `/p/[token]`)
  - İçerik varyantları: sadece kalemler vs. logo+tenant+müşteri+kalem+özet+banka+şartlar+imza+QR
  - PDF: tarayıcı `@media print` + `window.print()` vs. server PDF (Puppeteer/Playwright)
  - Yetki: `Orders.View` vs. public link
- **✅ ONAYLANAN:** `/orders/[orderId]/print?type=proforma`, tam içerik (logo, no/tarih/vade, müşteri, kalem tablosu, özet, banka, şartlar, imza), tarayıcı print yeterli, server PDF Faz 2, yetki `Orders.View`, public link yok.

## Q3 — Teklifte ödeme yöntemi & vade
**Mevcut:** sadece `payment_terms TEXT`, `payment_method`/`due_date` yok. Siparişte `payment_method` enum + `due_date` var.

- **A) ✅ ONAYLANAN** — `payment_method` (BankTransfer/CreditCard/Cash/Check/OpenAccount) + `payment_due_days` int + `payment_due_date` DATE (hesaplanan veya manuel). `payment_terms` de kalır açıklama.
- **B)** A + `installment_count` + `payment_schedule JSON` (taksit tablosu)
- **C)** Sadece `payment_method`, vade serbest metin kalsın
- Not: Migration `quotes.payment_method VARCHAR(50)`, `payment_due_date DATE`, `payment_due_days INT`, siparişe `DueDate/PaymentMethod` taşınacak.

## Q4 — Revizyon & siparişe çevirirken düzenleme
**Mevcut:** `CreateQuoteRevision` %100 klon, yeni revizyon `Draft` sonra ayrı `UpdateQuote`; `ConvertToOrder` direkt `BankTransfer` hardcode.

- **A)** Yeni revizyon oluştururken modal’da kalem/şart/ödeme/vade düzenleme (tek adım)
- **B) ✅ ONAYLANAN** — A + siparişe çevirmede “Sipariş Önizleme” modal’ı (miktar, fiyat, kargo, vade, not, `isSelected` ile kalem eleme, `PaymentMethod`/`DueDate` override) sonra `ConvertToOrder`. `ConvertedOrderId` çift dönüşüm engeli.
- **C)** Mevcut iki adımlı kalsın
- Ek: `CreateQuoteRevision` body’de opsiyonel override, boşsa klon; `RevisionRequested` banner korunacak.

## Q5 — İlan eklemede "invalid work_model" 400
**Kök neden:** FE `"Onsite"` (küçük s) vs BE `["OnSite","Remote","Hybrid"]`; `UpdateValidator`’da `WorkModel`/`EmploymentType` eksik.

- **A)** Sadece FE `"Onsite"→"OnSite"`
- **B)** A + BE `UpdateRequisitionValidator`’a `WorkModel`/`EmploymentType` ekle + case-insensitive normalize
- **C) ✅ ONAYLANAN** — B + DB’de eski hatalı `"Onsite"` kayıtlarını migration ile `UPDATE ... SET work_model='OnSite' WHERE work_model='Onsite'`
- Not: `ValidWorkModels` case-insensitive `StringComparison.OrdinalIgnoreCase`.

## Q6 — Destek masası mesaj + şablon + dahili not
**Gözlem:** 403 `Tickets.Reply`, 403 tenant header, 400 boş içerik, Channel race, hardcoded `senderName="Temsilci"`, `PUT/DELETE` yok, shortcut race 500, dahili not `FirstResponseAt` sadece public’te set.

- **A/B/C ayrı hata nedenleri** tabloda, toplu öneri:
- **✅ ONAYLANAN — Hepsi düzelt:** validator boşluk+max4000, `Tickets.Reply` seed tüm Agent rollerine, `ChannelId` transaction + `FOR UPDATE`, `senderName=currentUser.FullName`, şablon `PUT/DELETE /canned-responses/{id}` + yönetme modalı + composer’da her seçimde `content += "\n\n"+template.content` (tekrar kullanılabilir, birden çok kez), dahili not `?includeInternal=true` garantisi.

## Q7 — Destek masasında müşteri 360 (sipariş/ürün/kargo/durum)
**Mevcut:** sadece `totalTickets`+`recentTickets[5]`, `Customer360ChatContext` mock.

- **A)** Sadece son 5 sipariş (no, tarih, tutar, `status/payment_status`) + kargo durumu
- **B) ✅ ONAYLANAN** — A + sipariş kalemlerindeki ürünler (SKU/ad/kategori, ilk 3 + “+n”) + aktif kargolar (`carrier/tracking/status`) + her sipariş altında kargo
- **C)** A+B + toplam ciro/bakiye + açık destek talepleri (Faz 2)
- API: `GET /api/tickets/{id}/customer-360` gerçek join (customers+orders+order_items→products+shipments), mock kaldırılacak, panel sağda.

---
**Onay:** Kullanıcı 2026-08-26 “Her şeyi önerdiğin gibi yap.” — bu dosya gelecekte A/B/C arasında geçiş için referans.
