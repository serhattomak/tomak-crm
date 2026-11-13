/* Kargo sevk etiketi (A6 / termal) — önizleme modalı ve print rotası AYNI gövdeyi
   render eder. Print deseni: ayrı rota (docs/crm-ui-roadmap.md #21).

   `@page` bu yüzeyde GLOBALDEN FARKLI: globals.css A4/12mm sahipleniyor, bu rota rotada
   A6 veriyor. Sayfa boyutu bir rotanın kendi kararıdır ve rotanın `<style>` bloğunda
   açıkça görünür — sınıf adına yüklenmiş gizli bir davranış değil (#30'un yasakladığı şey).

   Barkod bir GÖRSEL SİMÜLASYONDUR (dikey çubuk karakterleri); gerçek barkod üretimi bu
   maddenin kapsamı değil. */
import type { ShipmentDto } from "@/lib/api-client";

export function ShipmentLabel({ shipment }: { shipment: ShipmentDto }) {
  return (
    <div className="rounded-xl border-2 border-zinc-900 bg-card p-6 text-zinc-900 shadow-card dark:border-zinc-700 dark:text-zinc-100">
      {/* Top Bar: Carrier & Code */}
      <div className="flex items-center justify-between border-zinc-900 border-b-2 pb-3 dark:border-zinc-700">
        <div>
          <span className="font-black text-xl tracking-tight">
            {shipment.carrierName || "STANDART KARGO"}
          </span>
          <span className="block text-3xs text-zinc-600 uppercase dark:text-zinc-400">
            SEVKİYAT İRSALİYE ETİKETİ
          </span>
        </div>
        <div className="text-right font-bold font-mono text-xs">
          <div>PAKET: {shipment.packageCount} KOLİ</div>
          <div>
            DESİ: {shipment.totalDesi} | {shipment.totalWeightKg} KG
          </div>
        </div>
      </div>

      {/* Barcode Graphic Simulation */}
      <div className="my-4 flex flex-col items-center justify-center border-zinc-900 border-b-2 py-3 dark:border-zinc-700">
        <div className="flex h-14 w-64 items-center justify-center bg-zinc-950 font-black font-mono text-white text-xs tracking-widest">
          ||| | |||| || ||| |||| | ||| ||||
        </div>
        <span className="mt-1 font-bold font-mono text-xs tracking-wider">
          {shipment.trackingNumber || shipment.shipmentNumber}
        </span>
      </div>

      {/* Sender & Recipient Box */}
      <div className="grid grid-cols-2 gap-4 border-zinc-900 border-b-2 pb-4 text-xs dark:border-zinc-700">
        {/* Sender */}
        <div className="border-border border-r pr-3">
          <span className="block font-bold text-3xs text-muted-foreground uppercase">
            GÖNDERİCİ:
          </span>
          <span className="font-bold text-zinc-900 dark:text-zinc-100">
            CRM Monorepo Lojistik Deposu
          </span>
          <p className="text-2xs text-zinc-700 leading-tight dark:text-zinc-300">
            İkitelli OSB Mah. Sanayi Cad. No: 42
            <br />
            Başakşehir / İSTANBUL
          </p>
          <span className="mt-1 block text-3xs text-muted-foreground">
            Tel: 0850 000 00 00
          </span>
        </div>

        {/* Recipient */}
        <div className="pl-1">
          <span className="block font-bold text-3xs text-muted-foreground uppercase">
            ALICI (TESLİMAT):
          </span>
          <span className="font-bold text-base text-zinc-900 dark:text-zinc-100">
            {shipment.recipientName}
          </span>
          <p className="mt-0.5 text-xs text-zinc-800 leading-tight dark:text-zinc-200">
            {shipment.recipientAddress}
          </p>
          <span className="font-bold text-xs">
            {shipment.recipientDistrict} / {shipment.recipientCity}
          </span>
          {shipment.recipientPhone && (
            <span className="mt-1 block font-mono text-xs">
              Tel: {shipment.recipientPhone}
            </span>
          )}
        </div>
      </div>

      {/* Bottom Meta */}
      <div className="mt-3 flex items-center justify-between font-mono text-3xs text-zinc-600 dark:text-zinc-400">
        <div>
          <span>SİPARİŞ NO: {shipment.orderNumber || "MANUEL"}</span>
          <span className="ml-3">REF: {shipment.shipmentNumber}</span>
        </div>
        <div>
          <span>
            TARİH: {new Date(shipment.createdAt).toLocaleDateString("tr-TR")}
          </span>
        </div>
      </div>
    </div>
  );
}
