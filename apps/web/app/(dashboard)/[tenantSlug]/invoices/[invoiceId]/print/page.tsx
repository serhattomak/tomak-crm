/* Fatura print rotası — desen: ayrı rota (docs/crm-ui-roadmap.md #21).
   Neden rota: portallanmış `fixed` overlay print'te kırılgan (sabit elemanlar sayfa
   başına tekrarlanabilir, sayfa kırılımı kontrol edilemez). Burada içerik NORMAL AKIŞTA.

   `@page` (A4 / 12mm), `body` zemini ve overlay gizleme GLOBAL `@media print` bloğunda
   (packages/ui/src/styles/globals.css) — buraya kopyalanmaz. Araç çubuğu Tailwind'in
   `print:hidden`'ı ile gizlenir. */
"use client";

import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ApiClient, type InvoiceDetailDto } from "@/lib/api-client";
import { InvoiceDocument } from "../../_components/invoice-document";

export default function InvoicePrintPage() {
  const params = useParams();
  const tenantSlug = (params?.tenantSlug as string) || "";
  const invoiceId = (params?.invoiceId as string) || "";

  const [invoice, setInvoice] = useState<InvoiceDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!(tenantSlug && invoiceId)) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await ApiClient.getInvoiceDetail(invoiceId, tenantSlug);
      if (res.success && res.data) {
        setInvoice(res.data);
      } else {
        setError(res.message || "Fatura bulunamadı.");
      }
    } catch {
      setError("Fatura yüklenirken hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, [invoiceId, tenantSlug]);

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

  if (error || !invoice) {
    return (
      <div className="mx-auto max-w-3xl p-8 text-center">
        <p className="text-rose-600 text-sm dark:text-rose-400">
          {error || "Fatura bulunamadı."}
        </p>
        <Link
          className="mt-4 inline-flex text-blue-600 text-xs underline dark:text-blue-400"
          href={`/${tenantSlug}/invoices`}
        >
          Faturalara dön
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl bg-card p-6 text-zinc-900 print:p-0 dark:text-zinc-100">
      {/* Araç çubuğu — kağıda çıkmaz */}
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 font-semibold text-xs text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
          href={`/${tenantSlug}/invoices`}
        >
          <ArrowLeft className="h-4 w-4" />
          Faturalara Dön
        </Link>
        <button
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white text-xs hover:bg-blue-700"
          onClick={handlePrint}
          type="button"
        >
          <Printer className="h-4 w-4" />
          Yazdır / PDF Kaydet
        </button>
      </div>

      <InvoiceDocument invoice={invoice} />
    </div>
  );
}
