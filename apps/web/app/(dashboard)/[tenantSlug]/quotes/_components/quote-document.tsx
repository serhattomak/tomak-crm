/* Teklif belgesi (A4) — önizleme modalı ve print rotası AYNI gövdeyi render eder.

   Neden çıkarıldı: modalda token tabanlı bir React belge vardı ama "Yazdır" onu değil,
   ayrı bir HTML üreticisini (`renderQuotePrintHtml`, 506 satır + 7 KB'lik kendi CSS'i,
   61 satır-içi hex — 53'ü §1.2'nin yasakladığı slate ailesi) gizli bir iframe'e yazıp
   basıyordu. Yani kullanıcı ekranda bir belge görüp BAŞKASINI basıyordu. Artık tek gövde.

   Print deseni: ayrı rota (docs/crm-ui-roadmap.md #21). `@page` (A4/12mm) global
   `@media print` bloğunda; buraya kopyalanmaz. */
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { formatCurrency } from "@/lib/currency";
import type { QuoteDetailDto } from "@/lib/api-client";

export function QuoteDocument({
  quote,
  tenantName,
}: {
  quote: QuoteDetailDto;
  tenantName: string;
}) {
  // KDV oran & matrah dağılımı — belgenin kendi türevi, sayfada değil burada hesaplanır
  const taxBreakdown = (() => {
    const map = new Map<number, { baseAmount: number; taxAmount: number }>();
    for (const item of quote.items ?? []) {
      if (item.isOptional) continue;
      const raw = (item.unitPrice || 0) * (item.quantity || 1);
      const disc = item.discountRate > 0 ? raw * (item.discountRate / 100) : 0;
      const base = Math.max(0, raw - disc);
      const tax = item.taxAmount || (item.taxRate > 0 ? base * (item.taxRate / 100) : 0);
      const existing = map.get(item.taxRate) || { baseAmount: 0, taxAmount: 0 };
      existing.baseAmount += base;
      existing.taxAmount += tax;
      map.set(item.taxRate, existing);
    }
    return [...map.entries()]
      .map(([rate, vals]) => ({
        baseAmount: vals.baseAmount,
        rate,
        taxAmount: vals.taxAmount,
      }))
      .sort((a, b) => a.rate - b.rate);
  })();

  return (
    <div className="w-full max-w-[210mm] select-text space-y-5 rounded-xl border border-border bg-card p-6 text-zinc-900 shadow-xl sm:p-10 dark:text-zinc-100">
      {/* 1. Header & Branding */}
      <div className="flex items-start justify-between gap-4 border-zinc-900 border-b-2 pb-4">
        <div className="max-w-sm space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-black text-primary-foreground text-sm shadow-xs">
              {tenantName ? tenantName.charAt(0).toUpperCase() : "C"}
            </div>
            <h1 className="font-black text-lg text-zinc-900 uppercase tracking-tight dark:text-zinc-100">
              {tenantName || "CRM ŞİRKETİ"}
            </h1>
          </div>
          <p className="font-medium text-3xs text-muted-foreground">
            Kurumsal Satış & Fiyat Teklifi / Proforma Belgesi
          </p>
        </div>

        <div className="space-y-1 text-right">
          <div className="inline-flex items-center gap-2 rounded-md border border-border bg-zinc-100 px-2.5 py-0.5 dark:bg-zinc-800">
            <span className="font-black font-mono text-xs text-zinc-900 tracking-wider dark:text-zinc-100">
              {quote.quoteNumber}
            </span>
            <span className="rounded bg-primary px-1.5 py-0.2 font-bold text-3xs text-primary-foreground">
              R{quote.revisionNumber}
            </span>
          </div>

          <div className="space-y-0.5 pt-0.5 font-medium text-3xs text-zinc-600 dark:text-zinc-400">
            <div>
              <b>Tarih:</b>{" "}
              {new Date(quote.createdAt).toLocaleDateString("tr-TR")}
            </div>
            <div>
              <b>Son Geçerlilik:</b>{" "}
              {quote.validUntil ? (
                <span className="font-bold text-zinc-900 dark:text-zinc-100">
                  {new Date(quote.validUntil).toLocaleDateString(
                    "tr-TR"
                  )}
                </span>
              ) : (
                "Süresiz"
              )}
            </div>
            <div>
              <b>Para Birimi:</b> {quote.currency}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Client & Issuer Party Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-0.5 rounded-xl border border-border bg-zinc-50/70 p-3 dark:bg-zinc-800/40">
          <span className="block font-extrabold text-3xs text-blue-700 uppercase tracking-wider">
            SAYIN / MÜŞTERİ (ALICI)
          </span>
          <h3 className="font-extrabold text-xs text-zinc-900 leading-snug dark:text-zinc-100">
            {quote.customerName}
          </h3>
          <p className="font-semibold text-3xs text-zinc-700 dark:text-zinc-300">
            Konu:{" "}
            <span className="font-normal text-zinc-600 dark:text-zinc-400">
              {quote.title}
            </span>
          </p>
          {quote.dealTitle && (
            <p className="text-3xs text-muted-foreground">
              Fırsat: {quote.dealTitle}
            </p>
          )}
        </div>

        <div className="space-y-0.5 rounded-xl border border-border bg-zinc-50/70 p-3 dark:bg-zinc-800/40">
          <span className="block font-extrabold text-3xs text-muted-foreground uppercase tracking-wider">
            TEKLİFİ VEREN / TEMSİLCİ
          </span>
          <h3 className="font-extrabold text-xs text-zinc-900 leading-snug dark:text-zinc-100">
            {quote.assignedUserName || "Satış Departmanı"}
          </h3>
          <p className="font-medium text-3xs text-zinc-600 dark:text-zinc-400">
            Firma:{" "}
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              {tenantName}
            </span>
          </p>
          <p className="text-3xs text-muted-foreground">
            Durum:{" "}
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
              {quote.status}
            </span>
          </p>
        </div>
      </div>

      {/* 3. Itemized Products/Services Table */}
      <div className="overflow-hidden rounded-xl border border-border">
        <Table className="border-collapse text-3xs">
          <TableHeader>
            <TableRow className="bg-zinc-900 font-bold text-3xs text-white uppercase tracking-wider">
              <TableHead className="w-7 px-2.5 py-2 text-center h-auto">
                #
              </TableHead>
              <TableHead className="px-2.5 py-2 h-auto">
                Ürün / Hizmet Açıklaması
              </TableHead>
              <TableHead className="w-14 px-2 py-2 text-center h-auto">
                Miktar
              </TableHead>
              <TableHead className="w-20 px-2 py-2 text-right h-auto">
                Birim Fiyat
              </TableHead>
              <TableHead className="w-12 px-2 py-2 text-center h-auto">
                İskonto
              </TableHead>
              <TableHead className="w-10 px-2 py-2 text-center h-auto">
                KDV
              </TableHead>
              <TableHead className="w-24 px-2.5 py-2 text-right h-auto">
                Toplam Tutar
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-zinc-200 font-medium text-zinc-700 dark:divide-zinc-800 dark:text-zinc-300">
            {quote.items.map((item, idx) => (
              <TableRow
                className={
                  item.isOptional
                    ? "bg-amber-50/60 opacity-85"
                    : idx % 2 === 1
                      ? "bg-zinc-50/70 dark:bg-zinc-800/40"
                      : "bg-card"
                }
                key={item.id}
              >
                <TableCell className="px-2.5 py-1.5 text-center font-bold text-muted-foreground">
                  {idx + 1}
                </TableCell>
                <TableCell className="px-2.5 py-1.5">
                  <span className="block font-bold text-zinc-900 leading-tight dark:text-zinc-100">
                    {item.productName}
                  </span>
                  {item.sku && (
                    <span className="font-mono text-3xs text-muted-foreground">
                      Kod: {item.sku}
                    </span>
                  )}
                  {item.description && (
                    <span className="mt-0.5 block text-3xs text-zinc-600 dark:text-zinc-400">
                      {item.description}
                    </span>
                  )}
                  {item.isOptional && (
                    <span className="mt-0.5 inline-block rounded bg-amber-200/80 dark:bg-amber-900/60 px-1.5 py-0.2 font-bold text-3xs text-amber-900 dark:text-amber-300">
                      Opsiyonel Kalem (Toplama Dahil Değil)
                    </span>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap px-2 py-1.5 text-center font-bold text-zinc-800 dark:text-zinc-200">
                  {item.quantity} {item.unit}
                </TableCell>
                <TableCell className="whitespace-nowrap px-2 py-1.5 text-right font-medium text-zinc-700 dark:text-zinc-300">
                  {formatCurrency(item.unitPrice, quote.currency)}
                </TableCell>
                <TableCell className="whitespace-nowrap px-2 py-1.5 text-center font-bold text-rose-600 dark:text-rose-400">
                  {item.discountRate > 0
                    ? `%${item.discountRate}`
                    : "-"}
                </TableCell>
                <TableCell className="whitespace-nowrap px-2 py-1.5 text-center text-zinc-600 dark:text-zinc-400">
                  %{item.taxRate}
                </TableCell>
                <TableCell className="whitespace-nowrap px-2.5 py-1.5 text-right font-extrabold text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(item.totalPrice, quote.currency)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* 4. Financial Calculations & Tax Breakdown Matrix */}
      <div className="grid grid-cols-1 gap-3 pt-0.5 sm:grid-cols-2">
        {/* Left: VAT Rate Breakdown Box */}
        <div className="space-y-1.5 rounded-xl border border-border bg-zinc-50/50 p-2.5 dark:bg-zinc-800/30">
          <span className="block font-extrabold text-3xs text-muted-foreground uppercase tracking-wider">
            KDV ORAN & MATRAH DAĞILIMI
          </span>
          <Table className="text-3xs">
            <TableHeader>
              <TableRow className="border-border font-bold text-muted-foreground">
                <TableHead className="pb-1">Oran</TableHead>
                <TableHead className="pb-1 text-right">
                  Matrah
                </TableHead>
                <TableHead className="pb-1 text-right">
                  KDV Tutarı
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-zinc-100 font-medium text-zinc-700 dark:divide-zinc-800 dark:text-zinc-300">
              {taxBreakdown.map((t) => (
                <TableRow key={t.rate}>
                  <TableCell className="py-0.5 font-bold">
                    %{t.rate}
                  </TableCell>
                  <TableCell className="py-0.5 text-right">
                    {formatCurrency(t.baseAmount, quote.currency)}
                  </TableCell>
                  <TableCell className="py-0.5 text-right font-bold text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(t.taxAmount, quote.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Right: Totals Box */}
        <div className="space-y-1 rounded-xl border-2 border-zinc-900 bg-zinc-50 p-3 text-2xs dark:bg-zinc-800/50">
          <div className="flex justify-between font-medium text-zinc-600 dark:text-zinc-400">
            <span>Ara Toplam (KDV Hariç):</span>
            <span className="font-bold text-zinc-900 dark:text-zinc-100">
              {formatCurrency(quote.subtotal, quote.currency)}
            </span>
          </div>

          {quote.discountAmount > 0 && (
            <div className="flex justify-between font-medium text-rose-600 dark:text-rose-400">
              <span>Toplam İskonto:</span>
              <span className="font-bold">
                -{formatCurrency(quote.discountAmount, quote.currency)}
              </span>
            </div>
          )}

          <div className="flex justify-between font-medium text-zinc-600 dark:text-zinc-400">
            <span>Hesaplanan Toplam KDV:</span>
            <span className="font-bold text-zinc-900 dark:text-zinc-100">
              {formatCurrency(quote.taxAmount, quote.currency)}
            </span>
          </div>

          <div className="flex items-baseline justify-between border-zinc-900 border-t-2 pt-1.5">
            <span className="font-black text-2xs text-zinc-900 uppercase tracking-wider dark:text-zinc-100">
              GENEL TOPLAM:
            </span>
            <span className="font-black text-blue-700 text-sm">
              {formatCurrency(quote.totalAmount, quote.currency)}
            </span>
          </div>
        </div>
      </div>

      {/* 5. Terms & Banking Details */}
      <div className="grid grid-cols-1 gap-2.5 text-3xs text-zinc-700 sm:grid-cols-2 dark:text-zinc-300">
        {quote.paymentTerms && (
          <div className="space-y-0.5 rounded-lg border border-border bg-card p-2">
            <span className="block font-bold text-3xs text-zinc-900 uppercase tracking-wider dark:text-zinc-100">
              ÖDEME VE VADE KOŞULLARI:
            </span>
            <p className="whitespace-pre-line text-zinc-600 leading-relaxed dark:text-zinc-400">
              {quote.paymentTerms}
            </p>
          </div>
        )}

        {quote.deliveryTerms && (
          <div className="space-y-0.5 rounded-lg border border-border bg-card p-2">
            <span className="block font-bold text-3xs text-zinc-900 uppercase tracking-wider dark:text-zinc-100">
              TESLİMAT VE SEVKİYAT ŞARTLARI:
            </span>
            <p className="whitespace-pre-line text-zinc-600 leading-relaxed dark:text-zinc-400">
              {quote.deliveryTerms}
            </p>
          </div>
        )}

        {quote.bankDetails && (
          <div className="space-y-0.5 rounded-lg border border-border bg-zinc-50 p-2 font-mono sm:col-span-2 dark:bg-zinc-800/50">
            <span className="block font-bold font-sans text-3xs text-zinc-900 uppercase tracking-wider dark:text-zinc-100">
              RESMİ BANKA VE HESAP (IBAN) BİLGİLERİ:
            </span>
            <p className="whitespace-pre-line text-zinc-700 leading-relaxed dark:text-zinc-300">
              {quote.bankDetails}
            </p>
          </div>
        )}

        {quote.termsAndConditions && (
          <div className="space-y-0.5 rounded-lg border border-border bg-card p-2 sm:col-span-2">
            <span className="block font-bold text-3xs text-zinc-900 uppercase tracking-wider dark:text-zinc-100">
              GENEL HÜKÜMLER VE GARANTİ ŞARTLARI:
            </span>
            <p className="whitespace-pre-line text-zinc-600 leading-relaxed dark:text-zinc-400">
              {quote.termsAndConditions}
            </p>
          </div>
        )}
      </div>

      {/* 6. Stamp / Signature Box */}
      <div className="grid grid-cols-2 gap-6 pt-2 text-center text-3xs">
        <div className="rounded-xl border border-border bg-card p-2.5">
          <p className="font-bold text-zinc-900 uppercase tracking-wider dark:text-zinc-100">
            TEKLİFİ DÜZENLEYEN (FİRMA YETKİLİSİ)
          </p>
          <p className="mt-0.5 text-3xs text-muted-foreground">
            Yetkili Kaşe & İmza
          </p>
          <div className="mt-2 flex h-12 items-end justify-center border-border border-b border-dashed pb-1">
            <span className="text-3xs text-muted-foreground">
              {quote.assignedUserName || tenantName}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-2.5">
          <p className="font-bold text-zinc-900 uppercase tracking-wider dark:text-zinc-100">
            TEKLİFİ ONAYLAYAN (MÜŞTERİ YETKİLİSİ)
          </p>
          <p className="mt-0.5 text-3xs text-muted-foreground">
            Kabul & Onay İmzası
          </p>
          <div className="mt-2 flex h-12 items-end justify-center border-border border-b border-dashed pb-1">
            <span className="text-3xs text-muted-foreground">
              {quote.customerName}
            </span>
          </div>
        </div>
      </div>

      {/* 7. Document Footer Bar */}
      <div className="mt-4 flex items-center justify-between border-border border-t pt-2.5 text-3xs text-muted-foreground">
        <span>
          Bu teklif belgesi CRM sistemi üzerinden resmi ve elektronik
          olarak üretilmiştir.
        </span>
        <span>
          Belge No: {quote.quoteNumber}-R{quote.revisionNumber} • Sayfa
          1 / 1
        </span>
      </div>
    </div>
  );
}
