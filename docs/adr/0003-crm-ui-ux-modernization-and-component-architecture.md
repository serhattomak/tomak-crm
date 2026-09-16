# ADR-0003: CRM UI/UX Modernizasyonu ve Bileşen Ayrıştırma Mimarisi

> Status: **Accepted** | Date: 2026-09-10 | Deciders: Frontend Ekibi, Antigravity UI Refaktörü  
> Kapsam: CRM (`crm-monorepo/apps/web`, `crm-monorepo/packages/ui`).  
> İlgili: [`docs/crm-ui-standards.md`](../crm-ui-standards.md) · [`docs/adr/0002-crm-input-standards.md`](0002-crm-input-standards.md)

---

## Context

CRM frontend mimarisinde zamanla iki temel problem ortaya çıkmıştı:
1. **Monolitik Sayfa Boyutları (Code Bloat):** Sayfa bileşenleri (`layout.tsx`, `customers/page.tsx`, `customers/[customerId]/page.tsx`) 1.300 ila 2.100 satır aralığına ulaşmış; modal pencereler, alt sekmeler, tablo render fonksiyonları ve yerel durum yönetimleri tek bir dosyada birikmişti. Bu durum bakım yapılabilirliği zorlaştırıyor, yeniden render maliyetlerini artırıyor ve kod okuryazarlığını düşürüyordu.
2. **Görsel Standart Kayması (Visual Drift & AI-Slop):** Bubbly `rounded-4xl` kenarlıklar, amaçsız bulanık renk küreleri (`blur-3xl`), native HTML tabloları ve ad-hoc stillendirilmiş butonlar ile kurumsal bir CRM'in gerektirdiği yüksek veri yoğunluğu ve Linear/Stripe profesyonelliğinden uzaklaşılmıştı.

## Decision

1. **8px-10px Tactile Feel:** `--radius: 0.5rem` taban alınarak tüm arayüzlerde `rounded-lg` / `rounded-md` ve 1px ince kenarlıklar (`border-border/80`) kural haline getirildi. Yapay AI degradeleri ve aşırı yuvarlatılmış haplar yasaklandı.
2. **Kanonik Primitif Paket:** Tüm kart, rozet, buton, tablo, sekme, avatar, iskelet ve boş durum görünümleri `@workspace/ui/components/*` paketine taşındı ve standartlaştırıldı (`Card`, `Badge`, `Button`, `Table`, `Tabs`, `Avatar`, `Skeleton`, `EmptyState`).
3. **Maksimum 300 Satır Kuralı & `_components/` Ayrıştırması:** Ana sayfa dosyaları (`page.tsx`) yalnızca veri yükleme, yetki ve rota koordinasyonu yapacak şekilde ~250 satır altında tutulacak; tüm görsel birimler ve modallar rota altındaki `_components/` klasörüne delege edilecektir.
4. **Global Navigasyon Çift Ray (Dual-Rail Hub):** 64px sol hub rayı (`CRM`, `OPS`, `HRM`, `CMS`, `SYS`) ve katlanabilir alt navigasyon rayı bileşenleri bağımsız dosyalara (`hub-rail.tsx`, `sub-nav-rail.tsx`, `nav-config.ts`) ayrıştırıldı.

## Consequences

### Pozitif
- **Bakım Kolaylığı:** Her bileşen tek sorumluluk prensibine (SRP) sahip ve kolayca izole test edilebilir.
- **Yüksek Performans:** Gereksiz render'lar önlendi, Turbopack üretim derlemesi hatasız ve hızlı tamamlanıyor.
- **Tutarlı UX:** Kullanıcı tüm sayfalarda aynı veri yoğunluğu, renk dili ve klavye kısayollarını deneyimliyor.
- **Kod Temizliği:** Yalnızca ilk aşamada yaklaşık **4.500 satır** monolitik kod temizlendi.

### Negatif / Dikkat Edilmesi Gerekenler
- Yeni geliştirilecek tüm sayfalarda doğrudan inline modal veya tablo yazmak yerine önce `_components/` altında dosya açılması zorunludur.
- Ultracite (`Biome`) kurallarına (nested ternary, jsx prop arrow functions) dikkat edilmelidir.
