/* Fatura belgesi — drawer önizlemesi ile print rotası AYNI gövdeyi paylaşır, böylece
   ekranda görünen ile basılan ayrışamaz. Print deseni: ayrı rota
   (docs/crm-ui-roadmap.md #21). Belgeyi değiştirirken iki yüzeyi birden değiştirirsiniz. */
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";
import type { InvoiceDetailDto } from "@/lib/api-client";

export function InvoiceStatusBadge({ status }: { status: string }) {
  if (status === "Issued" || status === "Approved") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 font-semibold text-emerald-700 text-xs dark:bg-emerald-950/50 dark:text-emerald-300">
        <CheckCircle2 className="h-3 w-3" /> Resmileşti
      </span>
    );
  }
  if (status === "Paid") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 font-semibold text-blue-700 text-xs dark:bg-blue-950/50 dark:text-blue-300">
        <CheckCircle2 className="h-3 w-3" /> Ödendi
      </span>
    );
  }
  if (status === "PartiallyPaid") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 font-semibold text-amber-700 dark:text-amber-400 text-xs dark:bg-amber-950/50 dark:text-amber-300">
        <Clock className="h-3 w-3" /> Kısmi Ödendi
      </span>
    );
  }
  if (status === "Cancelled") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 font-semibold text-rose-700 text-xs dark:bg-rose-950/50 dark:text-rose-300">
        <AlertCircle className="h-3 w-3" /> İptal
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 font-semibold text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
      <Clock className="h-3 w-3" /> Taslak
    </span>
  );
}

export function InvoiceDocument({ invoice }: { invoice: InvoiceDetailDto }) {
  return (
    <div className="space-y-6 text-zinc-800 dark:text-zinc-200">
      <div className="flex items-start justify-between border-border border-b pb-6">
        <div>
          <span className="font-extrabold text-blue-600 text-xl tracking-tight dark:text-blue-400">
            {invoice.type === "Sales" ? "SATIŞ FATURASI" : "ALIŞ FATURASI"}
          </span>
          <div className="mt-1 font-bold font-mono text-base text-zinc-900 dark:text-zinc-100">
            {invoice.invoiceNumber}
          </div>
          <div className="text-xs text-muted-foreground">
            Profil: {invoice.profile}
          </div>
        </div>
        <div className="space-y-1 text-right text-xs">
          <div>
            <span className="text-muted-foreground">Düzenleme:</span>{" "}
            <span className="font-semibold">
              {new Date(invoice.issueDate).toLocaleDateString("tr-TR")}
            </span>
          </div>
          {invoice.dueDate ? (
            <div>
              <span className="text-muted-foreground">Vade:</span>{" "}
              <span className="font-semibold">
                {new Date(invoice.dueDate as string).toLocaleDateString(
                  "tr-TR"
                )}
              </span>
            </div>
          ) : null}
          <div>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-xl bg-zinc-50 p-4 text-xs dark:bg-zinc-800/40">
        <div>
          <span className="font-semibold text-muted-foreground uppercase tracking-wider">
            Müşteri / Cari
          </span>
          <div className="mt-1 font-bold text-sm text-zinc-900 dark:text-zinc-100">
            {invoice.cariTitle}
          </div>
          <div className="text-muted-foreground">
            {invoice.cariAddress || "Adres belirtilmemiş"}
          </div>
          <div className="text-muted-foreground">
            {invoice.cariCity} / {invoice.cariDistrict}
          </div>
          <div className="mt-1 font-mono text-2xs text-zinc-600 dark:text-zinc-400">
            VKN/TCKN: {invoice.cariTaxNumber || "—"} •{" "}
            {invoice.cariTaxOffice || "—"} VD.
          </div>
        </div>

        <div className="text-right">
          <span className="font-semibold text-muted-foreground uppercase tracking-wider">
            Ödeme Koşulları
          </span>
          <div className="mt-1 font-medium text-zinc-700 dark:text-zinc-300">
            {invoice.paymentTerms || "Standart Cari Hesaba Mahsuben"}
          </div>
          {invoice.notes ? (
            <div className="mt-2 text-muted-foreground italic">
              &quot;{invoice.notes}&quot;
            </div>
          ) : null}
        </div>
      </div>

      <div>
        <Table>
          <TableHeader>
            <TableRow className="border-border font-semibold text-muted-foreground">
              <TableHead className="py-2 h-auto">Ürün / Hizmet</TableHead>
              <TableHead className="py-2 text-right h-auto">Miktar</TableHead>
              <TableHead className="py-2 text-right h-auto">
                Birim Fiyat
              </TableHead>
              <TableHead className="py-2 text-right h-auto">KDV %</TableHead>
              <TableHead className="py-2 text-right h-auto">Toplam</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-zinc-100 dark:divide-zinc-800/40">
            {invoice.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="py-2.5">
                  <div className="font-medium text-zinc-800 dark:text-zinc-200">
                    {item.productName}
                  </div>
                  {item.sku ? (
                    <div className="font-mono text-3xs text-muted-foreground">
                      {item.sku}
                    </div>
                  ) : null}
                  {item.withholdingRate ? (
                    <div className="text-3xs text-amber-700 dark:text-amber-400">
                      Tevkifat: {item.withholdingRate}
                    </div>
                  ) : null}
                </TableCell>
                <TableCell className="py-2.5 text-right font-mono">
                  {item.quantity} {item.unit}
                </TableCell>
                <TableCell className="py-2.5 text-right font-mono">
                  {item.unitPrice.toLocaleString("tr-TR", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  {invoice.currency}
                </TableCell>
                <TableCell className="py-2.5 text-right font-mono">
                  %{item.taxRate}
                </TableCell>
                <TableCell className="py-2.5 text-right font-bold font-mono">
                  {item.totalPrice.toLocaleString("tr-TR", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  {invoice.currency}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end border-border border-t pt-4">
        <div className="w-64 space-y-1.5 text-right text-xs">
          <div className="flex justify-between text-muted-foreground">
            <span>Ara Toplam:</span>
            <span className="font-medium font-mono text-zinc-800 dark:text-zinc-200">
              {invoice.subtotal.toLocaleString("tr-TR", {
                minimumFractionDigits: 2,
              })}{" "}
              {invoice.currency}
            </span>
          </div>
          {invoice.discountTotal > 0 ? (
            <div className="flex justify-between text-muted-foreground">
              <span>İndirim:</span>
              <span className="font-medium font-mono text-rose-600 dark:text-rose-400">
                -
                {invoice.discountTotal.toLocaleString("tr-TR", {
                  minimumFractionDigits: 2,
                })}{" "}
                {invoice.currency}
              </span>
            </div>
          ) : null}
          <div className="flex justify-between text-muted-foreground">
            <span>Hesaplanan KDV:</span>
            <span className="font-medium font-mono text-zinc-800 dark:text-zinc-200">
              {invoice.taxTotal.toLocaleString("tr-TR", {
                minimumFractionDigits: 2,
              })}{" "}
              {invoice.currency}
            </span>
          </div>
          {invoice.withholdingTotal > 0 ? (
            <div className="flex justify-between text-muted-foreground">
              <span>KDV Tevkifatı:</span>
              <span className="font-medium font-mono text-amber-700 dark:text-amber-400">
                -
                {invoice.withholdingTotal.toLocaleString("tr-TR", {
                  minimumFractionDigits: 2,
                })}{" "}
                {invoice.currency}
              </span>
            </div>
          ) : null}
          <div className="flex justify-between border-border border-t pt-2 font-bold text-sm text-zinc-900 dark:text-zinc-100">
            <span>Genel Toplam:</span>
            <span className="font-mono text-blue-600 dark:text-blue-400">
              {invoice.grandTotal.toLocaleString("tr-TR", {
                minimumFractionDigits: 2,
              })}{" "}
              {invoice.currency}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
