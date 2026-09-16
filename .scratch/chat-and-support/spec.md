# Spec: Kurumsal Sohbet ve Müşteri Canlı Destek Sistemi (Team Chat & Customer Live Support Hub)

Status: ready-for-agent

## Problem Statement

Modern işletmelerde iletişim iki kritik kolda gerçekleşir: **çalışanların birbiriyle yürüttüğü iç işbirliği** ve **müşterilerle yürütülen satış ve satış sonrası destek iletişimi**. 

Şu anda bu süreçler aşağıdaki temel problemlerle karşılaşmaktadır:
1. **İç İletişim Kopukluğu ve Bağlam Kaybı:** Çalışanlar WhatsApp, Slack vb. harici araçlar üzerinden iletişim kurduğunda, CRM içerisindeki bir müşteri, sipariş, ürün, izin talebi veya vardiya/bordro kaydı üzerine konuşulurken ekran görüntüsü almak veya manuel link kopyalamak zorunda kalmaktadır. Veri değiştiğinde sohbet içindeki bilgi güncelliğini yitirmekte ve denetim izi (audit trail) kaybolmaktadır.
2. **Müşteri Destek ve Canlı Sohbet Eksikliği:** Müşterilerden gelen canlı soru, destek ve teklif talepleri merkezi bir bilet/canlı sohbet yapısında toplanamamakta; destek temsilcileri müşteriyle yazışırken müşterinin finansal geçmişini, açık siparişlerini veya önceki taleplerini görememektedir.
3. **Ekip İçi Fısıltı (Internal Note / Whisper) İhtiyacı:** Bir müşteriyle konuşurken temsilcilerin arka planda yöneticilerine veya teknik ekibe danışabileceği, müşterinin görmediği dahili notlaşma ve transfer mekanizması bulunmamaktadır.
4. **Hızlı Yanıt & Operasyonel Verim:** Müşterilere sıkça verilen standart cevaplar için şablon (canned responses) desteği bulunmadığından operasyonel yanıt süreleri uzamaktadır.

---

## Solution

Sisteme çok kiracılı (multi-tenant) mimaride çalışan, uçtan uca modern bir `CRM.Modules.Chat` backend modülü ve Next.js tabanlı kapsamlı bir **Birleşik Sohbet & Destek Merkezi (Unified Chat & Support Hub)** kazandırılacaktır.

### 1. Birleşik Hub Mimarisi (Unified 2-in-1 Workspace):
Sol sekme geçişi ile iki ana mod tek bir akıcı merkezde sunulacaktır:
- **👥 Ekip İçi İletişim (Team Channels & DMs):**
  - Birebir Direkt Mesajlaşma (1-on-1 DMs).
  - Departman, proje ve konu bazlı Genel/Özel Kanallar (`#genel`, `#satis`, `#ik`, `#teknik-destek`).
  - Kullanıcı durumu (Çevrimiçi, Meşgul, Dışarıda, Çevrimdışı).
- **💬 Müşteri Canlı Destek Masası (Customer Support Inbox):**
  - Müşteri canlı destek yazışmaları ve bilet akışı.
  - Durum yönetimi (`Açık`, `Beklemede`, `Çözüldü`, `Kapatıldı`).
  - Öncelik seviyeleri (`Düşük`, `Orta`, `Yüksek`, `Acil`).
  - Temsilci ve Departman atama / kuyruk transferi.

### 2. Zengin İnteraktif Kart & Kayıt Paylaşımı (Rich Entity Embeds):
Çalışanlar sohbette mesaj yazarken tek tıkla (`+` butonu veya `/` komutu ile) sistemdeki varlıkları arayıp canlı kart olarak mesaja gömebilecektir:
- **Müşteri Kartı:** Unvan, bakiye, iletişim bilgisi, tek tıkla 360 müşteri detayına yönlendirme.
- **Sipariş Kartı:** Sipariş no, tutar, ödeme durumu, teslimat durumu rozeti ve sipariş detay linki.
- **Ürün & Hizmet Kartı:** Ürün görseli, SKU, stok durumu, güncel satış fiyatı.
- **İzin Talebi Kartı:** İzin türü, tarih aralığı, onay durumu ve onaylama kısayolu.
- **Vardiya & PDKS Kartı:** Vardiya saati, lokasyon ve devam bilgisi.
- **Bordro & Puantaj Kartı:** İlgili dönem ve net özet.

### 3. Müşteri Destek Temsilci Araçları (Agent Superpowers):
- **Müşteri 360 Sağ Paneli:** Canlı konuşma ekranının sağında müşterinin toplam harcaması, son 5 siparişi, açık borcu, açık biletleri ve etiketleri anlık görüntülenir.
- **Dahili Notlar (Internal Notes / Whisper):** Temsilciler konuşma akışına sarı arka planlı, sadece şirket içi çalışanların görebileceği notlar ekleyebilir.
- **Hazır Yanıt Şablonları (Canned Responses):** Temsilciler sık kullanılan karşılama, kargo bilgisi, iade prosedürü gibi şablonları tek tıkla veya `/kargo` gibi kısayollarla mesaja aktarabilir.

### 4. Gerçek Zamanlı (Real-Time) Altyapı:
- Supabase Realtime (WebSocket / PostgreSQL CDC) ve .NET 10 CQRS mimarisi ile sıfır gecikmeli mesaj iletimi, okundu bilgisi (`Görüldü`), yazıyor... (`typing indicator`) göstergeleri ve masaüstü/tarayıcı bildirimleri.

---

## User Stories

1. As an Employee, I want to see a unified Chat interface under `/messages` with two dedicated tabs ("👥 Ekip İçi" and "💬 Müşteri Destek"), so that I can easily switch between team collaboration and customer service.
2. As an Employee, I want to start a 1-on-1 direct message conversation with any colleague across the company, so that we can communicate quickly in real time.
3. As a Team Lead, I want to create public or private channels (e.g. `#genel`, `#satış-ekibi`, `#yazılım-destek`) and add specific team members, so that discussions are organized by topic.
4. As an Employee, I want to share a Customer record inside a chat via a rich interactive card, so that my team members can view the customer's balance, status, and click to open the full customer profile.
5. As a Sales Representative, I want to share an Order record into the channel with its live status badge, total amount, and item count, so that the operations team can immediately inspect the sale.
6. As a Product Specialist, I want to embed a Product card with its current price and inventory stock count into the conversation, so that colleagues get accurate product specs instantly.
7. As an Employee, I want to share my Leave Request card in a chat with my manager, so that they can quickly review the leave dates and status directly from the chat view.
8. As a Shift Supervisor, I want to embed a Shift or Attendance record in the channel, so that schedule discussions have concrete context.
9. As an Employee, I want to attach files, PDFs, documents, and images to any message, so that relevant attachments are kept in the conversation stream.
10. As an Employee, I want to see live "typing..." indicators and message read receipts (delivered / seen ticks), so that I know the status of my messages.
11. As a Support Agent, I want to view all incoming customer live chat sessions in the "Müşteri Destek" inbox, sorted by urgency and wait time.
12. As a Support Agent, I want to assign an unassigned customer conversation to myself or transfer it to another colleague/department, so that tickets reach the appropriate domain specialist.
13. As a Support Representative, I want to view a "Müşteri 360" context drawer on the right side of the active customer chat showing their total spent, recent orders, and open issues, so that I have complete context during support.
14. As a Support Representative, I want to add internal team notes ("Whisper / Dahili Not") with a yellow highlight that the customer cannot see, so that colleagues can collaborate on the customer's issue privately.
15. As a Support Representative, I want to insert pre-defined Canned Responses (Hazır Yanıtlar) using a search dropdown or `/shortcut` trigger, so that I can respond to frequent inquiries rapidly and accurately.
16. As a Customer Support Manager, I want to create, edit, and categorize company-wide canned response templates, so that the support team maintains a standard tone and accuracy.
17. As a Support Agent, I want to update ticket status between "Açık (Open)", "Beklemede (Pending)", "Çözüldü (Resolved)", and "Kapatıldı (Closed)", so that the team workflow stays organized.
18. As a Support Manager, I want to filter customer chats by department, assigned agent, status, priority, and date range, so that I can monitor team workload and resolution SLAs.
19. As an Employee, I want to search through message history, channels, customer chats, and shared files with keyword search, so that past decisions and shared links can be found quickly.
20. As an Employee, I want to pin important messages or announcements in a channel, so that new and existing members can always access vital information.
21. As an Employee, I want to mute notifications for specific channels while keeping direct mention notifications active, so that I can focus on critical work without interruption.
22. As a System Admin, I want all chat channels, messages, and attachments to be strictly isolated by `tenant_id` with Row Level Security (RLS), ensuring zero cross-tenant data leakage.
23. As a Mobile / Web User, I want to receive browser push notifications and sound alerts when a new customer chat arrives or when I am mentioned with `@name`, so that I never miss high-priority communications.
24. As a Support Agent, I want to mark an entire customer conversation as resolved with resolution notes and tags, so that analytics accurately reflect closed cases.
25. As a Business Executive, I want to view analytics on customer response times, resolution rates, and message volumes per department, so that customer satisfaction can be continuously improved.

---

## Implementation Decisions

### 1. Backend Module Architecture (`CRM.Modules.Chat`):
A new dedicated .NET 10 module `CRM.Modules.Chat` adhering to the Clean Architecture / CQRS pattern with MediatR `ISender` and FastEndpoints:
- **Entities (`Entities/ChatEntities.cs`):**
  - `ChatChannel`: Kanallar ve konuşma odaları (Type: `Direct`, `Group`, `CustomerSupport`; Title, Description, DepartmentId, Status, Priority, LastMessageAt).
  - `ChatParticipant`: Konuşma katılımcıları (UserId, EmployeeId, Role, LastReadAt, IsMuted).
  - `ChatMessage`: Mesaj kayıtları (SenderId, SenderName, Content, MessageType: `Text`, `InternalNote`, `SystemEvent`, `EntityEmbed`, IsDeleted, IsEdited, CreatedAt).
  - `ChatAttachment`: Dosya ve görsel ekleri (FileName, FileUrl, FileType, FileSizeBytes).
  - `ChatEntityEmbed`: Gömülü CRM kartı (EntityType: `Customer`, `Order`, `Product`, `LeaveRequest`, `ShiftSchedule`, `AttendanceRecord`, `PayrollRun`; EntityId, EntityTitle, EntitySubtitle, EntityStatus, MetadataJson).
  - `CannedResponse`: Hazır yanıt şablonları (Shortcut, Title, Category, Content).
  - `CustomerSupportSession`: Müşteri destek oturumu (CustomerId, CustomerName, CustomerEmail, AssignedUserId, DepartmentId, Status, Priority, ClosedAt, ResolutionNotes).

- **Data Context & Multi-Tenancy (`Data/ChatDbContext.cs`):**
  - EF Core fluent mappings with multi-tenant query filters and PostgreSQL UTC timestamps.
  - Multi-tenant Row Level Security (RLS) policies.

- **CQRS Features & Endpoints:**
  - `Features/Channels`: `GetChannelsQuery`, `CreateChannelCommand`, `GetDirectChatQuery`, `AddParticipantCommand`.
  - `Features/Messages`: `GetMessagesQuery`, `SendMessageCommand`, `SendInternalNoteCommand`, `SendEntityEmbedCommand`, `MarkAsReadCommand`.
  - `Features/Support`: `GetCustomerSupportQueueQuery`, `AssignTicketCommand`, `UpdateTicketStatusCommand`, `GetCannedResponsesQuery`, `CreateCannedResponseCommand`.
  - `Features/Context`: `GetCustomer360ChatContextQuery` (Aggregates customer balance, recent orders, and open tickets for the live chat drawer).

### 2. Frontend Interface (`apps/web/app/(dashboard)/[tenantSlug]/messages/page.tsx`):
- **3-Panel Unified Layout:**
  1. **Sol Navigasyon & Liste Paneli (Chat List):**
     - Üstte iki mod anahtarı: **👥 Ekip İçi** ve **💬 Müşteri Destek** (okunmamış sayı rozetleri ile).
     - Arama çubuğu ve filtreler (`Tümü`, `Okunmamış`, `Bana Atananlar`, `Bekleyenler`).
     - Ekip modunda: `# Kanallar`, `Direkt Mesajlar`, `Yeni Kanal / DM Başlat` butonu.
     - Destek modunda: Öncelik ve durum etiketli müşteri konuşma kartları.
  2. **Orta Sohbet Akışı (Main Chat Stream):**
     - Başlık çubuğu (Kanal / Müşteri başlığı, çevrimiçi durum, temsilci atama, durum değiştirme dropdown'ı).
     - Mesaj baloncukları (Gelen/Giden, Saat damgası, Görüldü ikonu).
     - **Dahili Notlar (Internal Notes / Whisper):** Sarı çerçeveli ve "Sadece Şirket İçi Görünür" rozetli özel baloncuklar.
     - **İnteraktif Varlık Kartları (Entity Embeds):**
       - Müşteri kartı (Finansal durum, bakiye, detay butonu).
       - Sipariş kartı (Sipariş tutarı, ürün sayısı, durum rozeti, sipariş detay butonu).
       - Ürün kartı (Fiyat, stok adedi, SKU, ürün detay butonu).
       - İzin ve Vardiya kartları.
     - Zengin Mesaj Giriş Çubuğu (Metin alanı, Dosya Ekle, CRM Kartı Ekle `+`, Hazır Yanıtlar `/`, Dahili Not / Müşteri Mesajı geçiş butonu).
  3. **Sağ Müşteri 360 & Detay Paneli (Müşteri Destek Modunda Açılır):**
     - Müşteri profil özeti (E-posta, telefon, şirket, etiketler).
     - Canlı Finansal Bakiye ve Toplam Harcama.
     - Son 5 Sipariş listesi ve durumları.
     - Açık Destek Talepleri ve İlgili Temsilciler.
     - Hızlı aksiyonlar (Yeni Sipariş Oluştur, Müşteri Detayına Git).

- **CRM Varlık Paylaşım Modalı (Entity Picker Modal):**
  - Müşteri, Sipariş, Ürün, İzin veya Vardiya arama ve tek tıkla mesaja interaktif kart olarak ekleme.

- **Hazır Yanıtlar (Canned Responses) Modalı & Popover'ı:**
  - Temsilcinin `/` yazarak veya menüden arayarak hazır yanıtları anında mesaj kutusuna doldurabilmesi.

### 3. Gerçek Zamanlı Senkronizasyon (Supabase Realtime):
- `chat_messages` tablosuna INSERT / UPDATE geldiğinde ilgili kanal dinleyicilerine anlık bildirim düşer.
- Okunmamış mesaj sayaçları ve sidebar rozetleri canlı güncellenir.

---

## Testing Decisions

- **CQRS Command & Handler Tests:**
  - `SendMessageCommandHandler` ile mesajın kaydedilmesi ve `ChatEntityEmbed` ilişkisinin doğrulanması.
  - `SendInternalNoteCommandHandler` ile dahili notun müşteri destek akışına doğru etiketle eklenmesi.
  - `AssignTicketCommandHandler` ve durum güncelleme akışlarının doğrulanması.
- **Tenant Isolation Tests:**
  - Farklı tenant'a ait kanal ve mesajların sorgulanamayacağının (RLS & Query filter) doğrulanması.
- **UI Seam & Typecheck:**
  - `npm run typecheck --workspace=web` ile sıfır TypeScript hatası.
  - `npm run build --workspace=web` ile Next.js production derleme teyidi.

---

## Out of Scope

- Doğrudan WebRTC üzerinden görüntülü ve sesli grup konferans aramaları (Faz 2'de planlanacaktır).
- Otomatik yapay zeka (LLM) tabanlı müşteri otomatik yanıt botu (Faz 2'de eklenecektir).
- Dış SMS Gateway doğrudan entegrasyonu (SMS sağlayıcı webhookları Faz 2 kapsamındadır).

---

## Further Notes

- Tasarım kuralları uyarınca emoji kullanılmayacak; zengin `lucide-react` ikonları ve standart CRM Mavisi (`bg-blue-600`) butonlar tercih edilecektir.
- Sidebar'daki `Mesajlar` menüsü (`/${tenantSlug}/messages`) doğrudan bu yeni birleşik merkeze açılacaktır.
