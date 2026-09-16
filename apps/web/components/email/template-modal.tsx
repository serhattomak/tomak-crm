"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  Loader2,
  Moon,
  Sparkles,
  Sun,
  XCircle,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  TEMPLATE_VARIABLES,
  type TemplateVariable,
} from "@/components/quotes/VariableChips";
import { ApiClient, type QuoteTemplateDto } from "@/lib/api-client";
import { renderEmailPreviewHtml } from "@/lib/email-preview";

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  template?: QuoteTemplateDto | null;
  tenantId: string;
}

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

function extractVariables(text: string): string[] {
  const matches = text.match(/\{\{([a-zA-Z0-9_]+)\}\}/g);
  if (!matches) {
    return [];
  }
  const found = new Set<string>();
  for (const match of matches) {
    const variable = match.replace(/\{\{|\}\}/g, "").trim();
    if (variable) {
      found.add(variable);
    }
  }
  return Array.from(found);
}

function validateTemplateForm(
  name: string,
  subject: string,
  htmlBody: string
): boolean {
  if (!name.trim()) {
    toast.error("Lütfen şablon adını girin.");
    return false;
  }
  if (!subject.trim()) {
    toast.error("Lütfen e-posta konusunu girin.");
    return false;
  }
  if (!htmlBody.trim()) {
    toast.error("Lütfen e-posta gövdesini (HTML) girin.");
    return false;
  }
  return true;
}

async function executeTemplateSave(
  templateId: string | undefined,
  payload: Partial<QuoteTemplateDto>,
  tenantId: string
): Promise<boolean> {
  if (templateId) {
    const res = await ApiClient.updateQuoteTemplate(
      templateId,
      payload,
      tenantId
    );
    if (!res.success) {
      toast.error(res.message || "Şablon güncellenemedi.");
      return false;
    }
    toast.success("Şablon güncellendi.");
    return true;
  }

  const res = await ApiClient.createQuoteTemplate(payload, tenantId);
  if (!res.success) {
    toast.error(res.message || "Şablon oluşturulamadı.");
    return false;
  }
  toast.success("Yeni şablon oluşturuldu.");
  return true;
}

// ---------------------------------------------------------------------------
// Variable Chip Button Component
// ---------------------------------------------------------------------------
interface VariableChipButtonProps {
  onInsert: (variable: string) => void;
  variable: TemplateVariable;
}

function VariableChipButton({ onInsert, variable }: VariableChipButtonProps) {
  const handleClick = useCallback(() => {
    onInsert(variable);
  }, [onInsert, variable]);

  return (
    <button
      className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-card px-2 py-0.5 font-medium font-mono text-[10px] text-zinc-700 shadow-2xs transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-700"
      onClick={handleClick}
      title={VARIABLE_LABELS[variable]}
      type="button"
    >
      <span className="text-zinc-400">{"{{"}</span>
      <span>{variable}</span>
      <span className="text-zinc-400">{"}}"}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Collapsible Quote Extra Fields Component
// ---------------------------------------------------------------------------
interface ExtraFieldsProps {
  bankDetails: string;
  deliveryTerms: string;
  isOpen: boolean;
  onBankDetailsChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onDeliveryTermsChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onPaymentTermsChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onTermsChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onToggle: () => void;
  paymentTerms: string;
  termsAndConditions: string;
}

function ExtraFieldsSection({
  bankDetails,
  deliveryTerms,
  isOpen,
  onBankDetailsChange,
  onDeliveryTermsChange,
  onPaymentTermsChange,
  onTermsChange,
  onToggle,
  paymentTerms,
  termsAndConditions,
}: ExtraFieldsProps) {
  return (
    <div className="rounded-xl border border-border bg-zinc-50/50 dark:bg-zinc-900/30">
      <button
        className="flex w-full items-center justify-between px-3 py-2.5 text-left font-medium text-xs text-zinc-700 transition hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
        onClick={onToggle}
        type="button"
      >
        <span className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          <span>Teklif Özel Alanları (Banka, Teslimat, Şartlar)</span>
        </span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-zinc-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-zinc-400" />
        )}
      </button>

      {isOpen ? (
        <div className="space-y-3 border-border border-t p-3 text-xs">
          <div>
            <label
              className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300"
              htmlFor="extraBankDetails"
            >
              Banka Bilgileri
            </label>
            <textarea
              className="w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none dark:text-zinc-100"
              id="extraBankDetails"
              onChange={onBankDetailsChange}
              placeholder="IBAN, Banka ve Şube bilgileri..."
              rows={2}
              value={bankDetails}
            />
          </div>

          <div>
            <label
              className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300"
              htmlFor="extraPaymentTerms"
            >
              Ödeme Koşulları
            </label>
            <textarea
              className="w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none dark:text-zinc-100"
              id="extraPaymentTerms"
              onChange={onPaymentTermsChange}
              placeholder="Ödeme vadesi ve şartları..."
              rows={2}
              value={paymentTerms}
            />
          </div>

          <div>
            <label
              className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300"
              htmlFor="extraDeliveryTerms"
            >
              Teslimat Şartları
            </label>
            <textarea
              className="w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none dark:text-zinc-100"
              id="extraDeliveryTerms"
              onChange={onDeliveryTermsChange}
              placeholder="Teslimat süresi ve taşıma koşulları..."
              rows={2}
              value={deliveryTerms}
            />
          </div>

          <div>
            <label
              className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300"
              htmlFor="extraTerms"
            >
              Genel Hüküm ve Koşullar
            </label>
            <textarea
              className="w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none dark:text-zinc-100"
              id="extraTerms"
              onChange={onTermsChange}
              placeholder="Yasal maddeler ve şartlar..."
              rows={2}
              value={termsAndConditions}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Template Live Preview Pane
// ---------------------------------------------------------------------------
interface TemplateLivePreviewProps {
  htmlBody: string;
  onCopyHtml: () => void;
  subject: string;
}

function TemplateLivePreview({
  htmlBody,
  onCopyHtml,
  subject,
}: TemplateLivePreviewProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [previewThemeMode, setPreviewThemeMode] = useState<
    "auto" | "light" | "dark"
  >("auto");

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark =
    previewThemeMode === "auto"
      ? mounted && resolvedTheme === "dark"
      : previewThemeMode === "dark";

  const handleTogglePreviewTheme = useCallback(() => {
    setPreviewThemeMode((prev) => {
      if (prev === "auto") {
        return isDark ? "light" : "dark";
      }
      return prev === "dark" ? "light" : "dark";
    });
  }, [isDark]);

  const displayHtml = renderEmailPreviewHtml(htmlBody, isDark);

  return (
    <div className="flex h-full flex-col space-y-3 rounded-2xl border border-border bg-zinc-50/50 p-4 dark:bg-zinc-900/30">
      <div className="flex items-center justify-between border-border border-b pb-2.5">
        <div className="flex items-center gap-1.5 font-medium text-xs text-zinc-700 dark:text-zinc-300">
          <Eye className="h-4 w-4 text-sky-500" />
          <span>Canlı Şablon Önizlemesi</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1 font-medium text-[11px] text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300"
            onClick={handleTogglePreviewTheme}
            title={isDark ? "Açık (Kağıt) Görünüme Geç" : "Koyu Görünüme Geç"}
            type="button"
          >
            {isDark ? (
              <Sun className="h-3 w-3 text-amber-500" />
            ) : (
              <Moon className="h-3 w-3 text-zinc-500" />
            )}
            <span>{isDark ? "Kağıt Görünümü" : "Koyu Görünüm"}</span>
          </button>

          <button
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 font-medium text-[11px] text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300"
            onClick={onCopyHtml}
            title="HTML Kodunu Kopyala"
            type="button"
          >
            <Copy className="h-3 w-3" />
            <span>HTML Kopyala</span>
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs">
        <span className="font-semibold text-zinc-500">Konu: </span>
        <span className="text-zinc-900 dark:text-zinc-100">
          {subject || "(Konu belirtilmedi)"}
        </span>
      </div>

      <div
        className={`flex-1 overflow-hidden rounded-xl border transition-colors ${ isDark ? "border-zinc-800 bg-zinc-950" : "border-border bg-card" }`}
      >
        <iframe
          className="h-full min-h-[380px] w-full border-0"
          sandbox="allow-same-origin"
          srcDoc={displayHtml}
          title="Şablon Önizleme"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Template Modal Component
// ---------------------------------------------------------------------------
export function TemplateModal({
  isOpen,
  onClose,
  onSaved,
  template,
  tenantId,
}: TemplateModalProps) {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [termsAndConditions, setTermsAndConditions] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [deliveryTerms, setDeliveryTerms] = useState("");
  const [bankDetails, setBankDetails] = useState("");

  const [isExtraOpen, setIsExtraOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (template) {
        setName(template.name || "");
        setSubject(template.subject || "");
        setHtmlBody(template.htmlBody || "");
        setIsDefault(template.isDefault);
        setTermsAndConditions(template.termsAndConditions || "");
        setPaymentTerms(template.paymentTerms || "");
        setDeliveryTerms(template.deliveryTerms || "");
        setBankDetails(template.bankDetails || "");
        setIsExtraOpen(
          Boolean(
            template.termsAndConditions ||
              template.paymentTerms ||
              template.deliveryTerms ||
              template.bankDetails
          )
        );
      } else {
        setName("");
        setSubject("");
        setHtmlBody("");
        setIsDefault(false);
        setTermsAndConditions("");
        setPaymentTerms("");
        setDeliveryTerms("");
        setBankDetails("");
        setIsExtraOpen(false);
      }
    }
  }, [isOpen, template]);

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setName(e.target.value);
    },
    []
  );

  const handleSubjectChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSubject(e.target.value);
    },
    []
  );

  const handleHtmlBodyChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setHtmlBody(e.target.value);
    },
    []
  );

  const handleIsDefaultChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setIsDefault(e.target.checked);
    },
    []
  );

  const handleBankDetailsChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setBankDetails(e.target.value);
    },
    []
  );

  const handlePaymentTermsChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setPaymentTerms(e.target.value);
    },
    []
  );

  const handleDeliveryTermsChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setDeliveryTerms(e.target.value);
    },
    []
  );

  const handleTermsChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setTermsAndConditions(e.target.value);
    },
    []
  );

  const handleToggleExtra = useCallback(() => {
    setIsExtraOpen((prev) => !prev);
  }, []);

  const handleInsertVariable = useCallback(
    (variable: string) => {
      const chipTag = `{{${variable}}}`;
      const textarea =
        typeof document === "undefined"
          ? null
          : (document.getElementById(
              "templateHtmlBodyTextarea"
            ) as HTMLTextAreaElement | null);
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const nextText = `${htmlBody.slice(0, start)}${chipTag}${htmlBody.slice(end)}`;
        setHtmlBody(nextText);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(
            start + chipTag.length,
            start + chipTag.length
          );
        }, 0);
      } else {
        setHtmlBody((prev) => `${prev} ${chipTag}`);
      }
    },
    [htmlBody]
  );

  const handleCopyHtml = useCallback(() => {
    if (!htmlBody) {
      toast.info("Kopyalanacak HTML içeriği bulunmuyor.");
      return;
    }
    navigator.clipboard.writeText(htmlBody);
    toast.success("HTML panoya kopyalandı.");
  }, [htmlBody]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validateTemplateForm(name, subject, htmlBody)) {
        return;
      }

      setIsSaving(true);
      const variables = extractVariables(`${subject} ${htmlBody}`);

      const payload: Partial<QuoteTemplateDto> = {
        bankDetails: bankDetails.trim() || undefined,
        deliveryTerms: deliveryTerms.trim() || undefined,
        htmlBody: htmlBody.trim(),
        isDefault,
        name: name.trim(),
        paymentTerms: paymentTerms.trim() || undefined,
        subject: subject.trim(),
        termsAndConditions: termsAndConditions.trim() || undefined,
        variables,
      };

      try {
        const success = await executeTemplateSave(
          template?.id,
          payload,
          tenantId
        );
        if (success) {
          onSaved();
          onClose();
        }
      } catch {
        toast.error("İşlem sırasında hata oluştu.");
      } finally {
        setIsSaving(false);
      }
    },
    [
      name,
      subject,
      htmlBody,
      isDefault,
      bankDetails,
      paymentTerms,
      deliveryTerms,
      termsAndConditions,
      template,
      tenantId,
      onSaved,
      onClose,
    ]
  );

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      open
    >
      <DialogContent
        aria-describedby={undefined}
        className="flex max-h-[92vh] w-full max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-border border-b px-6 py-4">
          <div>
            <DialogTitle className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">
              {template ? "Şablonu Düzenle" : "Yeni E-posta Şablonu"}
            </DialogTitle>
            <p className="text-xs text-zinc-500">
              Teklifler ve ortak gelen kutusu e-postalarında kullanılabilen
              Handlebars şablonu.
            </p>
          </div>

          <DialogClose asChild>
            <button
              aria-label="Kapat"
              className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              type="button"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </DialogClose>
        </div>

        {/* 2-Column Body */}
        <form
          className="flex flex-1 flex-col overflow-hidden"
          onSubmit={handleSubmit}
        >
          <div className="grid flex-1 grid-cols-1 gap-6 overflow-y-auto p-6 lg:grid-cols-2">
            {/* Left Column: Form Fields */}
            <div className="space-y-4">
              <div>
                <label
                  className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300"
                  htmlFor="templateNameInput"
                >
                  Şablon Adı *
                </label>
                <input
                  className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs text-zinc-900 focus:outline-none dark:text-zinc-100"
                  id="templateNameInput"
                  onChange={handleNameChange}
                  placeholder="Örn: Standart Bilgilendirme / Teklif Şablonu"
                  required
                  type="text"
                  value={name}
                />
              </div>

              <div>
                <label
                  className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300"
                  htmlFor="templateSubjectInput"
                >
                  E-posta Konusu *
                </label>
                <input
                  className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs text-zinc-900 focus:outline-none dark:text-zinc-100"
                  id="templateSubjectInput"
                  onChange={handleSubjectChange}
                  placeholder="Örn: {{companyName}} - Teklif #{{quoteNumber}}"
                  required
                  type="text"
                  value={subject}
                />
              </div>

              {/* Variable Chips */}
              <div className="space-y-1.5">
                <span className="block font-medium text-[11px] text-zinc-500">
                  Dinamik Değişkenler (Tıklayıp imlece ekleyin):
                </span>
                <div className="flex flex-wrap gap-1">
                  {TEMPLATE_VARIABLES.map((v) => (
                    <VariableChipButton
                      key={v}
                      onInsert={handleInsertVariable}
                      variable={v}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label
                  className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300"
                  htmlFor="templateHtmlBodyTextarea"
                >
                  Şablon Gövdesi (HTML / Handlebars) *
                </label>
                <textarea
                  className="w-full rounded-xl border border-border bg-card p-3 font-mono text-xs text-zinc-900 focus:outline-none dark:text-zinc-100"
                  id="templateHtmlBodyTextarea"
                  onChange={handleHtmlBodyChange}
                  placeholder="<p>Sayın {{customerName}},</p><p>Teklifimiz ektedir...</p>"
                  required
                  rows={8}
                  value={htmlBody}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  checked={isDefault}
                  className="h-4 w-4 rounded border-border text-sky-600 focus:ring-sky-500"
                  id="templateIsDefaultCheckbox"
                  onChange={handleIsDefaultChange}
                  type="checkbox"
                />
                <label
                  className="text-xs text-zinc-700 dark:text-zinc-300"
                  htmlFor="templateIsDefaultCheckbox"
                >
                  Varsayılan Şablon Yap
                </label>
              </div>

              {/* Collapsible Quote Extra Fields */}
              <ExtraFieldsSection
                bankDetails={bankDetails}
                deliveryTerms={deliveryTerms}
                isOpen={isExtraOpen}
                onBankDetailsChange={handleBankDetailsChange}
                onDeliveryTermsChange={handleDeliveryTermsChange}
                onPaymentTermsChange={handlePaymentTermsChange}
                onTermsChange={handleTermsChange}
                onToggle={handleToggleExtra}
                paymentTerms={paymentTerms}
                termsAndConditions={termsAndConditions}
              />
            </div>

            {/* Right Column: Live Preview Pane */}
            <TemplateLivePreview
              htmlBody={htmlBody}
              onCopyHtml={handleCopyHtml}
              subject={subject}
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-border border-t px-6 py-3.5">
            <button
              className="rounded-xl border border-border px-4 py-2 font-medium text-xs text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
              onClick={onClose}
              type="button"
            >
              İptal
            </button>
            <button
              className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 font-medium text-white text-xs hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : null}
              <span>{template ? "Güncelle" : "Şablonu Kaydet"}</span>
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
