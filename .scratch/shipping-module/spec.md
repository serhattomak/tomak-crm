# Kargo & Sevkiyat Yönetim Modülü (Shipping & Fulfillment Hub) Spesifikasyonu

## 1. Amaç ve Kapsam
CRM platformu içerisindeki siparişlerin depodan çıkışından müşteriye teslimine kadar olan tüm kargo süreçlerini yöneten, parçalı sevkiyatı (split shipment) destekleyen, kargo takip numarası ve kargo etiket/barkod çıktısı sunan, iade kargoları (tersine lojistik) takip eden uçtan uca sevkiyat yönetim sistemi.

## 2. Temel Fonksiyonlar
1. **Gönderi Yaşam Döngüsü (Shipment Lifecycle)**:
   - `Preparing` (Hazırlanıyor / Paketleniyor)
   - `Dispatched` (Kargoya Verildi / Çıktı)
   - `InTransit` (Dağıtımda / Yolda)
   - `Delivered` (Teslim Edildi)
   - `FailedDelivery` (Teslim Edilemedi / Şubede)
   - `Cancelled` (İptal Edildi)
2. **Parçalı Sevkiyat (Split Shipment)**:
   - Bir siparişe birden fazla kargo paketi oluşturulabilmesi.
   - Her pakete özel ürün seçimi, ağırlık (kg) ve hacimsel ağırlık (desi) hesaplama.
3. **Kargo Firmaları (Carriers)**:
   - Hazır taşıyıcılar: Yurtiçi Kargo, Aras Kargo, MNG Kargo, Sürat Kargo, PTT Kargo, HepsiJet, Trendyol Express, DHL Express, Özel Şirket Kuryesi/Filo.
   - Otomatik takip linki şablonları (`https://.../?code={tracking_number}`).
4. **Kargo Etiketi & Barkod (Printable Shipping Label)**:
   - Termal A6 ve A4 standartlarında kargo sevk barkodu, alıcı/gönderici bilgileri, paket desi/ağırlık etiketi.
5. **İade Kargo / Tersine Lojistik (Return Shipments)**:
   - Müşteriye özel İade Kargo Kodu (`RET-XXXX`) üretme.
   - İade kargo teslim alma, kalite kontrol ve stoka iade akışı.
6. **Yetkilendirme**:
   - `Shipment.View`, `Shipment.Manage`, `Shipment.Dispatch`
