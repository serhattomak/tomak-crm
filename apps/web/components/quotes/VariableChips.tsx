"use client";

type VariableChipsProps = {
  disabled?: boolean;
  onInsert: (variable: string) => void;
};

export const TEMPLATE_VARIABLES = [
  "customerName",
  "quoteNumber",
  "quoteTitle",
  "totalAmount",
  "subtotal",
  "taxAmount",
  "validUntil",
  "companyName",
  "itemsTable",
  "paymentTerms",
  "deliveryTerms",
  "bankDetails",
  "notes",
] as const;

export type TemplateVariable = (typeof TEMPLATE_VARIABLES)[number];

const VARIABLE_LABELS: Record<TemplateVariable, string> = {
  bankDetails: "Banka Bilgileri",
  companyName: "Firma Adı",
  customerName: "Müşteri Adı",
  deliveryTerms: "Teslimat Şartları",
  itemsTable: "Kalem Tablosu",
  notes: "Notlar",
  paymentTerms: "Ödeme Şartları",
  quoteNumber: "Teklif No",
  quoteTitle: "Teklif Başlığı",
  subtotal: "Ara Toplam",
  taxAmount: "KDV Tutarı",
  totalAmount: "Genel Toplam",
  validUntil: "Geçerlilik",
};

export function VariableChips({
  onInsert,
  disabled = false,
}: VariableChipsProps) {
  return (
    <div className="space-y-1.5">
      <p className="font-semibold text-2xs text-zinc-600 dark:text-zinc-400">
        Değişkenler — tıkla ve imlece ekle:
      </p>
      <div className="flex flex-wrap gap-1.5">
        {TEMPLATE_VARIABLES.map((variable) => (
          <button
            aria-label={`${variable} değişkenini ekle`}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 font-medium font-mono text-2xs text-zinc-700 shadow-2xs transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
            disabled={disabled}
            key={variable}
            onClick={() => onInsert(variable)}
            title={VARIABLE_LABELS[variable]}
            type="button"
          >
            <span className="text-muted-foreground">{"{{"}</span>
            <span>{variable}</span>
            <span className="text-muted-foreground">{"}}"}</span>
          </button>
        ))}
      </div>
      <p className="text-2xs text-muted-foreground">
        <span className="font-mono">{"{{itemsTable}}"}</span> HTML tablo olarak
        render edilir — diğerleri otomatik escape edilir.
      </p>
    </div>
  );
}
