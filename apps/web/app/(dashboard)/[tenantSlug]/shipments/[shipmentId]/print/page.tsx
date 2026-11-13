/* Kargo sevk etiketi print rotası — desen: ayrı rota (docs/crm-ui-roadmap.md #21),
   ve maddenin ilk rota-başına-sayfa-boyutu vakası.

   Neden ayrı rota: maddenin overlay yoluna getirdiği eleştiri (portallanmış `fixed`
   içerik print'te sayfa başına tekrarlanabilir, kırılım kontrol edilemez) tam olarak
   rotanın ortadan kaldırdığı şey. Burada etiket NORMAL AKIŞTA.

   `@page` burada A6: global `@media print` bloğu A4/12mm sahipleniyor ve bu rota onu
   geçersiz kılıyor. Sayfa boyutu rotanın kendi kararıdır ve burada AÇIKÇA görünür —
   sınıf adına yüklenmiş gizli bir davranış değil (bkz. #30). Gölge (box-shadow) ve
   kart kırılma koruması global kuraldan gelir. */
"use client";

import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ApiClient, type ShipmentDto } from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";
import { ShipmentLabel } from "../../_components/shipment-label";

export default function ShipmentLabelPrintPage() {
  const params = useParams();
  const tenantSlug = (params?.tenantSlug as string) || "";
  const shipmentId = (params?.shipmentId as string) || "";
  const { activeTenant } = usePermissions();

  const [shipment, setShipment] = useState<ShipmentDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!(activeTenant?.id && shipmentId)) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await ApiClient.getShipmentById(shipmentId, activeTenant.id);
      if (res.success && res.data) {
        setShipment(res.data);
      } else {
        setError(res.message || "Sevkiyat bulunamadı.");
      }
    } catch {
      setError("Sevkiyat yüklenirken hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, [activeTenant?.id, shipmentId]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !shipment) {
    return (
      <div className="mx-auto max-w-3xl p-8 text-center">
        <p className="text-rose-600 text-sm dark:text-rose-400">
          {error || "Sevkiyat bulunamadı."}
        </p>
        <Link
          className="mt-4 inline-flex text-primary text-xs underline "
          href={`/${tenantSlug}/shipments`}
        >
          Sevkiyatlara dön
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[105mm] p-6 print:p-0">
      {/* A6 — bu rotanın kendi sayfa boyutu (globals.css A4 sahipleniyor) */}
      <style>{`@media print { @page { size: A6 portrait; margin: 4mm; } }`}</style>

      {/* Araç çubuğu — kağıda çıkmaz */}
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 font-semibold text-xs text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
          href={`/${tenantSlug}/shipments`}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Sevkiyatlara Dön
        </Link>
        <button
          className="inline-flex items-center gap-2 rounded-lg bg-foreground px-3.5 py-1.5 font-semibold text-background text-xs hover:bg-foreground/90"
          onClick={handlePrint}
          type="button"
        >
          <Printer className="h-3.5 w-3.5" />
          Yazdır (A6 / Termal)
        </button>
      </div>

      <ShipmentLabel shipment={shipment} />
    </div>
  );
}
