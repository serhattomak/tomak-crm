/* Teklif print rotası — desen: ayrı rota (docs/crm-ui-roadmap.md #21).

   Bu rota B desenini (gizli 0×0 iframe + elle yazılmış HTML) ortadan kaldırır. Eskiden
   "Yazdır" modalda görünen React belgeyi değil, `renderQuotePrintHtml`'in ürettiği AYRI bir
   belgeyi basıyordu: 506 satır HTML + 7 KB'lik kendi CSS'i, 61 satır-içi hex (53'ü §1.2'nin
   yasakladığı slate ailesi) ve kendi `@page`'i. Artık ekranda görünen ile basılan aynı.

   `@page` (A4 / 12mm), `body` zemini ve overlay gizleme GLOBAL `@media print` bloğunda
   (packages/ui/src/styles/globals.css) — buraya kopyalanmaz. Araç çubuğu Tailwind'in
   `print:hidden`'ı ile gizlenir. */
"use client";

import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PermissionGate } from "@/components/permission-gate";
import { ApiClient, type QuoteDetailDto } from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";
import { QuoteDocument } from "../../_components/quote-document";

export default function QuotePrintPage() {
  const params = useParams();
  const tenantSlug = (params?.tenantSlug as string) || "";
  const quoteId = (params?.quoteId as string) || "";
  const { activeTenant } = usePermissions();

  const [quote, setQuote] = useState<QuoteDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!(activeTenant?.id && quoteId)) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await ApiClient.getQuoteById(quoteId, activeTenant.id);
      if (res.success && res.data) {
        setQuote(res.data);
      } else {
        setError(res.message || "Teklif bulunamadı.");
      }
    } catch {
      setError("Teklif yüklenirken hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, [activeTenant?.id, quoteId]);

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

  if (error || !quote) {
    return (
      <div className="mx-auto max-w-3xl p-8 text-center">
        <p className="text-destructive text-sm">
          {error || "Teklif bulunamadı."}
        </p>
        <Link
          className="mt-4 inline-flex text-primary text-xs underline"
          href={`/${tenantSlug}/quotes`}
        >
          Tekliflere dön
        </Link>
      </div>
    );
  }

  return (
    <PermissionGate
      fallback={
        <div className="p-8 text-center text-muted-foreground text-xs">
          Bu sayfayı görüntüleme yetkiniz yok (Quotes.View).
        </div>
      }
      permission="Quotes.View"
    >
      <div className="mx-auto max-w-4xl p-6 print:p-0">
        {/* Araç çubuğu — kağıda çıkmaz */}
        <div className="mb-4 flex items-center justify-between print:hidden">
          <Link
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 font-semibold text-xs text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
            href={`/${tenantSlug}/quotes`}
          >
            <ArrowLeft className="h-4 w-4" />
            Tekliflere Dön
          </Link>
          <button
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 font-semibold text-primary-foreground text-xs hover:bg-primary/90"
            onClick={handlePrint}
            type="button"
          >
            <Printer className="h-4 w-4" />
            Yazdır / PDF Kaydet
          </button>
        </div>

        <QuoteDocument
          quote={quote}
          tenantName={activeTenant?.name || "CRM ŞİRKETİ"}
        />
      </div>
    </PermissionGate>
  );
}
