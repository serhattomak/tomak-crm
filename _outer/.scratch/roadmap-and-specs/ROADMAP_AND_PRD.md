# CRM Yeni Özellikler & Modüller — PRD ve Geliştirme Yol Haritası

Bu doküman, CRM platformunun **İş Gücü, Saha, Müşteri Operasyonları ve Finans** alanlarında derinleşmesini sağlayacak yeni modül ve yeteneklerin detaylı ürün gereksinimlerini (PRD), mimari kararlarını ve faz planını içerir.

---

## 1. Yönetici Özeti & Stratejik Kararlar

Yapılan gereksinim analizi ve mimari uzlaşı neticesinde belirlenen temel ilkeler:
1. **İş Odağı:** İş Gücü, Saha & Operasyon Yönetimi ve B2B Müşteri Operasyonları.
2. **Geliştirme Stratejisi:** Hibrit yaklaşım — Önce mevcut modüllerdeki eksik entegrasyon halkaları (Müşteri Portali, Sözleşme & E-İmza) kapatılacak, ardından yeni dikey modüllere (WhatsApp, Saha Servis, Ücretsiz GİB e-Arşiv UBL-TR) geçilecektir.
3. **Maliyet Kısıtı:** Ücretli entegrasyon/API bağımlılığı yerine açık standartlar (GİB UBL-TR 2.1 XML, Meta doğrudan Cloud API ücretsiz kotaları, Web/PWA saha arayüzü) tercih edilecektir.

---

## 2. Planlanan 5 Temel Modül ve Kapsamları

### Modül 1: Müşteri Bütünleşik Self-Servis Portali (`/portal`)
*Mevcut durum:* Yalnızca tekil token ile teklif görüntüleme ve kabul/red ekranı var.
*Hedeflenen:* Müşterinin (Cari) tek bir panelden tüm ticari geçmişini yönettiği güvenli portal.

- **Kimlik Doğrulama:** Şifresiz giriş (Magic Link e-posta veya SMS) ya da davet usulü şifreli müşteri hesabı.
- **Teklifler & Revizyon:** Açık teklifleri inceleme, satır satır kalemleri görme, anlık revizyon talep etme veya onaylama.
- **Sözleşmeler & E-İmza:** Onaylanan tekliflerden üretilen sözleşmeleri okuma ve canvas üzerinde dijital imzalama.
- **Faturalar & Ödemeler:** Kesilen faturaların PDF/UBL görüntülenmesi, ödeme durumu, bakiye/ekstre takibi.
- **Destek Biletleri (Helpdesk):** Bilet açma, mevcut taleplerin durumunu izleme ve dosya/mesaj gönderme.
- **Sipariş & Kargo Takibi:** Devam eden siparişlerin kargo takip kodları ve teslimat aşamaları.

---

### Modül 2: Sözleşme Yönetimi & E-İmza Akışı (`/contracts`)
*Mevcut durum:* Teklif onaylandığında süreç manuel veya teklif notlarıyla ilerliyor.
*Hedeflenen:* Kabul edilen tekliften otomatik sözleşme türetme, dinamik şablonlama ve yasal denetim izi (audit log).

- **Sözleşme Şablon Motoru:** E-posta modülünde kurulan Handlebars altyapısı kullanılarak sözleşme maddelerinin dinamik oluşturulması (`{{customerName}}`, `{{taxNumber}}`, `{{paymentTerms}}`, `{{itemClauses}}`).
- **Tekliften Sözleşmeye Dönüşüm:** Teklif kabul edildiğinde tek tıkla "Sözleşme Taslağı Oluştur".
- **İmza Akışı (E-Signature):**
  - Müşteri portalinde dokunmatik/fare canvas imza alanı.
  - Şirket yetkilisi dijital imzası.
  - İmzalandığı andaki IP adresi, zaman damgası (timestamp), kullanıcı aracısı (user-agent) ve doküman SHA-256 hash doğrulaması ile imza audit trail sayfası.
- **Sözleşme Yaşam Döngüsü:** Taslak -> Müşteri İncelemesinde -> İmzalandı -> Yürürlükte -> Süresi Doldu / Feshedildi.
- **Hatırlatıcılar & Bildirimler:** Yenileme ve bitiş tarihlerine yönelik otomatik CRM bildirimleri.

---

### Modül 3: Çok Kanallı Mesajlaşma & WhatsApp Business API (`/messages/whatsapp`)
*Mevcut durum:* CRM içi takım içi sohbet ve kanallar mevcut; dış müşteri iletişimi sadece e-posta ve biletlerle sınırlı.
*Hedeflenen:* Meta WhatsApp Cloud API ile doğrudan CRM içerisinden müşteriyle anlık mesajlaşma.

- **Meta Cloud API Entegrasyonu:** Doğrudan Meta Graph API (ek aracı komisyonu olmadan, resmi ücretsiz mesaj limitleri dahilinde).
- **Gelen/Giden Mesaj Webhook'u:** Supabase Edge Function veya CRM API webhook endpoint'i ile anlık mesaj alma/gönderme.
- **Cari Eşleştirme:** Gelen WhatsApp numarası sistemdeki `customers` (Telefon/GSM) ile otomatik eşleşir; profil kartı sağ panelde açılır.
- **Hazır Şablonlar (HSM):** 24 saatlik pencere dışındaki müşterilere Meta onaylı bildirim şablonu gönderme (Sipariş kargoya verildi, teklif hazırlandı vb.).
- **Çoklu Temsilci Atama:** Gelen mesajların satış veya destek personeline atanması, iç not ekleme yeteneği.

---

### Modül 4: Saha Servis & Mobil Görev Takibi (`/field-service`)
*Mevcut durum:* Araç ve filo takip ekranları var ancak operasyonel görev dağılımı ve teknisyen iş akışı eksik.
*Hedeflenen:* Teknisyenler ve saha personeli için mobil öncelikli (PWA/Responsive Web) görev yönetimi, merkez için harita tabanlı iş atama.

- **Merkez Görev Paneli (Dispatch Board):**
  - Harita ve takvim üzerinde bekleyen iş emirleri, arıza kayıtları ve kurulum talepleri.
  - Teknisyen/araç kapasitesine ve lokasyonuna göre sürükle-bırak görev atama.
- **Saha Ekibi Mobil Arayüzü (PWA/Mobil Web):**
  - Teknisyenin güncel iş listesi, müşteri adresi ve tek tıkla navigasyon (Google Maps / Yandex).
  - **Check-in / Check-out:** İşe başlama ve bitiş anında GPS koordinat kaydı.
  - **Servis Formu & Malzeme:** Kullanılan parça/ürün girişi, yapılan işlemler listesi, fotoğraf yükleme (öncesi/sonrası).
  - **Müşteri Teslim İmzası:** Sahada müşteriden mobil cihaz üzerinde dijital teslimat/kabul imzası alma.

---

### Modül 5: Ücretsiz GİB e-Arşiv Fatura & UBL-TR 2.1 XML Modülü (`/invoices/e-archive`)
*Mevcut durum:* CRM içinde fatura kesme, durum yönetimi ve PDF dökümü var; ancak resmi e-Belge standart formatı eksik.
*Hedeflenen:* Ücretli üçüncü parti API'lara ihtiyaç duymadan resmi Gelir İdaresi Başkanlığı (GİB) standartlarına tam uyumlu e-Arşiv üretimi.

- **UBL-TR 2.1 Standardında XML Üretimi:**
  - Satış faturası kaydedildiğinde otomatik UBL-TR 2.1 şemasına uygun fatura XML'i üretilir.
  - ETTN (Evrensel Tekil Tanımlama Numarası - UUID) ve XSLT stil şablonu gömülü fatura formatı.
- **GİB e-Arşiv Portali ile Uyum:**
  - Tek tek veya toplu zip halinde "GİB Portala Yüklenebilir XML Paketi" indirme.
  - GİB e-Arşiv Portalından indirilen imzalanmış fatura listesini CRM'e içeri aktarma (Reconciliation / Eşitleme).
- **Müşteriye Resmi PDF/XML İletimi:** Müşteri portalinde ve e-posta bildirimlerinde GİB onaylı formatta fatura sunumu.
- **Geleceğe Hazır Mimari:** İleride özel bir entegratör (Uyumsoft, EDM, Paraşüt vb.) API'si eklendiğinde aynı UBL çekirdeğini kullanacak adaptör arayüzü (`IEInvoiceProvider`).

---

## 3. Aşamalı Geliştirme Yol Haritası (Phased Roadmap)

```mermaid
flowchart TD
    subgraph Faz 1: B2B Operasyonel Kapanış
        P1[Müşteri Portali Genişletme] --> P2[Sözleşme & E-İmza Modülü]
    end

    subgraph Faz 2: Resmi Standartlar & İletişim
        P3[GİB UBL-TR 2.1 XML Motoru] --> P4[WhatsApp Meta Cloud Entegrasyonu]
    end

    subgraph Faz 3: Saha & Mobil İş Gücü
        P5[Saha Servis Dispatch Paneli] --> P6[Mobil PWA Saha Ekip Arayüzü]
    end

    Faz 1 --> Faz 2
    Faz 2 --> Faz 3
```

| Faz | Odak | Kapsam ve Teslimatlar |
|---|---|---|
| **Faz 1: B2B Operasyonel Kapanış** | Müşteri Portali & Sözleşme / E-İmza | - `/portal` auth/magic-link yapısı<br>- Portalde faturalar, teklifler, biletler<br>- `/contracts` modülü ve tekliften sözleşmeye geçiş<br>- Dokunmatik/fare e-imza bileşeni ve audit log |
| **Faz 2: Finans & Hızlı İletişim** | GİB UBL-TR e-Arşiv & WhatsApp API | - UBL-TR 2.1 XML üretim servisi (`CRM.Modules.Invoicing`)<br>- ETTN ve XSLT PDF render altyapısı<br>- GİB Portal uyumlu toplu XML dışa/içe aktarımı<br>- Meta WhatsApp Cloud API webhook ve mesajlaşma arayüzü |
| **Faz 3: Saha & İş Gücü** | Saha Servis & Mobil Teknisyen Arayüzü | - `/field-service` görev atama ve harita paneli<br>- Teknisyen mobil PWA görünümü (GPS check-in, servis formu)<br>- Sahada parça kullanımı ve mobil müşteri imzası<br>- Fatura/Sipariş ve Stok modülüyle tam entegrasyon |

---

## 4. Teknik & Mimari Standartlar

- **Frontend:** Next.js 16 (App Router), Tailwind CSS v4, `@workspace/ui`, Geist font ailesi, Bento Grid ritmi.
- **Backend:** .NET 10 Web API, Clean Architecture (CRM.Modules.*), MediatR/CQRS.
- **Veritabanı:** Supabase PostgreSQL + RLS (`tenant_id` zorunlu izolasyonu).
- **Kod & Kalite:** Ultracite (`npm exec -- ultracite fix`), strict TypeScript, sıfır lint hatası kuralı.
