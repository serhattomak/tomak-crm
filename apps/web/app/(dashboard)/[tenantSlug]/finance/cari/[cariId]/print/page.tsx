/* Cari hesap ekstresi print rotası — desen: ayrı rota (docs/crm-ui-roadmap.md #21).

   Neden ayrı rota: maddenin overlay yoluna getirdiği eleştiri (portallanmış `fixed` içerik
   print'te sayfa başına tekrarlanabilir, kırılım kontrol edilemez) tam olarak rotanın
   ortadan kaldırdığı şey. Ekstre burada NORMAL AKIŞTA.

   İki kaynak gerekiyor: cari kaydı (başlık/kod/VKN/bakiye) ve hareketler. Sayfada cari
   zaten bellekteydi; rota ikisini de çeker — `getCariStatement` yalnız hareketleri döndürür.

   `@page` (A4/12mm), `body` zemini ve kart kırılma koruması GLOBAL `@media print` bloğunda
   (packages/ui/src/styles/globals.css) — buraya kopyalanmaz. Araç çubuğu `print:hidden`. */
"use client";

import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ApiClient,
  type CariAccountDto,
  type CariTransactionDto,
} from "@/lib/api-client";
import { CariStatement } from "../../../_components/cari-statement";

export default function CariStatementPrintPage() {
  const params = useParams();
  const tenantSlug = (params?.tenantSlug as string) || "";
  const cariId = (params?.cariId as string) || "";

  const [cari, setCari] = useState<CariAccountDto | null>(null);
  const [statementTx, setStatementTx] = useState<CariTransactionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!(tenantSlug && cariId)) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [cariRes, txRes] = await Promise.all([
        ApiClient.getCariAccountDetail(cariId, tenantSlug),
        ApiClient.getCariStatement(cariId, tenantSlug),
      ]);
      if (cariRes.success && cariRes.data) {
        setCari(cariRes.data);
      } else {
        setError(cariRes.message || "Cari hesap bulunamadı.");
      }
      setStatementTx(txRes.success && txRes.data ? txRes.data : []);
    } catch {
      setError("Cari ekstre yüklenirken hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, [cariId, tenantSlug]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !cari) {
    return (
      <div className="mx-auto max-w-3xl p-8 text-center">
        <p className="text-rose-600 text-sm dark:text-rose-400">
          {error || "Cari hesap bulunamadı."}
        </p>
        <Link
          className="mt-4 inline-flex text-blue-600 text-xs underline dark:text-blue-400"
          href={`/${tenantSlug}/finance`}
        >
          Finansa dön
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl bg-card p-6 text-zinc-900 print:p-0 dark:text-zinc-100">
      {/* Araç çubuğu — kağıda çıkmaz */}
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 font-semibold text-xs text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
          href={`/${tenantSlug}/finance`}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Finansa Dön
        </Link>
        <button
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-1.5 font-semibold text-white text-xs hover:bg-blue-700"
          onClick={handlePrint}
          type="button"
        >
          <Printer className="h-3.5 w-3.5" />
          Yazdır / PDF Kaydet
        </button>
      </div>

      <CariStatement
        cari={cari}
        isLoading={false}
        statementTx={statementTx}
      />
    </div>
  );
}
