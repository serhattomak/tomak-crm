"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { toast } from "@workspace/ui/components/sonner";
import {
  Download,
  FileText,
  Loader2,
  Mail,
  Paperclip,
  Send,
  X,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import {
  ApiClient,
  type EmailAccountDto,
  type QuoteTemplateDto,
} from "@/lib/api-client";

const EMAIL_REGEX: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface QuoteForEmail {
  currency: string;
  customerEmail?: string;
  customerName: string;
  id: string;
  quoteNumber: string;
  totalAmount: number;
}

interface SendQuoteEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  quote: QuoteForEmail | null;
  tenantSlug: string;
}

function buildDefaultBody(quote: QuoteForEmail): string {
  const formattedAmount = quote.totalAmount.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
  });
  return `Sayın ${quote.customerName},\n\n#${quote.quoteNumber} numaralı fiyat teklifimiz ekte bilgilerinize sunulmuştur.\nTeklif tutarı: ${formattedAmount} ${quote.currency}\n\nHerhangi bir sorunuz olursa yanıtlamaktan memnuniyet duyarız.\n\nSaygılarımızla.`;
}

function validateEmailSend(
  toEmail: string,
  accountsCount: number
): string | null {
  if (!(toEmail.trim() && EMAIL_REGEX.test(toEmail.trim()))) {
    return "Lütfen geçerli bir alıcı e-posta adresi girin.";
  }
  if (accountsCount === 0) {
    return "E-posta gönderebilmek için önce aktif bir e-posta hesabı eklemelisiniz.";
  }
  return null;
}

export function SendQuoteEmailModal({
  isOpen,
  onClose,
  onSuccess,
  quote,
  tenantSlug,
}: SendQuoteEmailModalProps): React.ReactElement | null {
  const [accounts, setAccounts] = useState<EmailAccountDto[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [templates, setTemplates] = useState<QuoteTemplateDto[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] =
    useState<string>("default");

  const [toEmail, setToEmail] = useState<string>("");
  const [ccEmail, setCcEmail] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [customBody, setCustomBody] = useState<string>("");
  const [attachPdf, setAttachPdf] = useState<boolean>(true);

  const [isLoadingMeta, setIsLoadingMeta] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);

  const handleToChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setToEmail(e.target.value);
    },
    []
  );

  const handleCcChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setCcEmail(e.target.value);
    },
    []
  );

  const handleSubjectChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSubject(e.target.value);
    },
    []
  );

  const handleBodyChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCustomBody(e.target.value);
    },
    []
  );

  const handleAttachPdfToggle = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setAttachPdf(e.target.checked);
    },
    []
  );

  useEffect(() => {
    if (!(isOpen && quote)) {
      return;
    }

    setToEmail(quote.customerEmail ?? "");
    setCcEmail("");
    setSubject(`Fiyat Teklifi #${quote.quoteNumber} - ${quote.customerName}`);
    setCustomBody(buildDefaultBody(quote));
    setAttachPdf(true);
    setSelectedTemplateId("default");

    let isMounted = true;
    setIsLoadingMeta(true);

    Promise.all([
      ApiClient.getEmailAccounts(tenantSlug),
      ApiClient.getQuoteTemplates(tenantSlug),
    ])
      .then(([accRes, tplRes]) => {
        if (!isMounted) {
          return;
        }
        if (accRes.success && accRes.data) {
          const activeAccs = accRes.data.filter((a) => a.isActive);
          setAccounts(activeAccs);
          if (activeAccs.length > 0) {
            const [firstAcc] = activeAccs;
            if (firstAcc) {
              setSelectedAccountId(firstAcc.id);
            }
          }
        }
        if (tplRes.success && tplRes.data) {
          setTemplates(tplRes.data);
        }
      })
      .catch((err) => {
        console.error("Meta data loading error:", err);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingMeta(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, quote, tenantSlug]);

  const handleDownloadPdf = useCallback(async () => {
    if (!quote) {
      return;
    }
    setIsDownloadingPdf(true);
    try {
      const blob = await ApiClient.downloadQuotePdf(quote.id, tenantSlug);
      if (blob) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Teklif-${quote.quoteNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        toast.success("PDF başarıyla oluşturuldu ve indirildi.");
      } else {
        toast.error("PDF oluşturulamadı. Lütfen tekrar deneyin.");
      }
    } catch {
      toast.error("PDF indirilirken hata oluştu.");
    } finally {
      setIsDownloadingPdf(false);
    }
  }, [quote, tenantSlug]);

  const handleSend = useCallback(async () => {
    if (!quote) {
      return;
    }

    const validationError = validateEmailSend(toEmail, accounts.length);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsSending(true);
    try {
      const payload = {
        accountId: selectedAccountId || undefined,
        attachPdf,
        body: customBody.trim() || undefined,
        cc: ccEmail.trim() ? [ccEmail.trim()] : undefined,
        subject: subject.trim() || undefined,
        templateId:
          selectedTemplateId === "default" ? undefined : selectedTemplateId,
        to: [toEmail.trim()],
      };
      const res = await ApiClient.sendQuoteEmail(quote.id, payload, tenantSlug);

      if (res.success) {
        toast.success(`Teklif e-posta ile başarıyla gönderildi: ${toEmail}`);
        onSuccess?.();
        onClose();
      } else {
        toast.error(res.message || "E-posta gönderilemedi.");
      }
    } catch {
      toast.error("E-posta gönderimi sırasında bir hata meydana geldi.");
    } finally {
      setIsSending(false);
    }
  }, [
    quote,
    toEmail,
    accounts,
    selectedAccountId,
    attachPdf,
    customBody,
    ccEmail,
    subject,
    selectedTemplateId,
    tenantSlug,
    onSuccess,
    onClose,
  ]);

  if (!(isOpen && quote)) {
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
        className="w-full gap-0 overflow-hidden p-0 sm:max-w-2xl"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-border border-b bg-zinc-50/75 px-5 py-4 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="font-semibold text-base text-zinc-900 dark:text-zinc-100">
                Teklifi E-posta ile Gönder
              </DialogTitle>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                #{quote.quoteNumber} — {quote.customerName}
              </p>
            </div>
          </div>
          <DialogClose asChild>
            <button
              aria-label="Kapat"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </DialogClose>
        </div>

        {/* Content */}
        <div className="custom-scrollbar max-h-[72vh] space-y-4 overflow-y-auto p-5">
          {isLoadingMeta ? (
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Hesaplar ve şablonlar yükleniyor...
            </div>
          ) : null}

          {/* Account Selection */}
          <div className="space-y-1.5">
            <Label className="font-medium text-xs">
              Gönderici E-posta Hesabı
            </Label>
            {accounts.length > 0 ? (
              <Select
                onValueChange={setSelectedAccountId}
                value={selectedAccountId}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Gönderici hesabı seçin" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.email} ({acc.provider})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-amber-800 text-xs dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                Kayıtlı aktif e-posta hesabı bulunamadı. Lütfen önce{" "}
                <strong>E-posta</strong> modülünden bir SMTP veya IMAP hesabı
                bağlayın.
              </div>
            )}
          </div>

          {/* Recipient & CC */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="font-medium text-xs">
                Alıcı E-posta <span className="text-rose-500">*</span>
              </Label>
              <Input
                className="h-9 text-xs"
                onChange={handleToChange}
                placeholder="musteri@firma.com"
                type="email"
                value={toEmail}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-medium text-xs">Bilgi (CC)</Label>
              <Input
                className="h-9 text-xs"
                onChange={handleCcChange}
                placeholder="yonetim@firma.com"
                type="email"
                value={ccEmail}
              />
            </div>
          </div>

          {/* Template Selection */}
          <div className="space-y-1.5">
            <Label className="font-medium text-xs">E-posta Şablonu</Label>
            <Select
              onValueChange={setSelectedTemplateId}
              value={selectedTemplateId}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Varsayılan Şablon" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">
                  Varsayılan Sistem Şablonu
                </SelectItem>
                {templates.map((tpl) => (
                  <SelectItem key={tpl.id} value={tpl.id}>
                    {tpl.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <Label className="font-medium text-xs">Konu</Label>
            <Input
              className="h-9 text-xs"
              onChange={handleSubjectChange}
              placeholder="Teklif e-posta konusu"
              value={subject}
            />
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <Label className="font-medium text-xs">
              E-posta İçeriği / Açıklama
            </Label>
            <textarea
              className="custom-scrollbar min-h-[100px] w-full rounded-lg border border-border bg-transparent p-3 text-xs text-zinc-900 outline-none transition focus:border-blue-500 dark:text-zinc-100 dark:focus:border-blue-500"
              onChange={handleBodyChange}
              placeholder="Müşteriye iletilecek mesaj..."
              rows={4}
              value={customBody}
            />
          </div>

          {/* PDF Attachment Banner */}
          <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/50 p-3 dark:border-blue-950/60 dark:bg-blue-950/20">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                    Teklif-{quote.quoteNumber}.pdf
                  </span>
                  <span className="rounded bg-blue-100 px-1.5 py-0.5 font-medium text-[10px] text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                    Otomatik QuestPDF
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Kurumsal A4 teklif formu e-postaya PDF eki olarak eklenecek
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 font-medium text-xs text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
                disabled={isDownloadingPdf}
                onClick={handleDownloadPdf}
                type="button"
              >
                {isDownloadingPdf ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                <span>Önizle / İndir</span>
              </button>

              <label className="flex cursor-pointer items-center gap-1.5 font-medium text-xs text-zinc-700 dark:text-zinc-300">
                <input
                  checked={attachPdf}
                  className="rounded border-border text-blue-600 focus:ring-blue-500"
                  onChange={handleAttachPdfToggle}
                  type="checkbox"
                />
                <Paperclip className="h-3.5 w-3.5" />
              </label>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 border-border border-t bg-zinc-50/75 px-5 py-3.5 dark:bg-zinc-900/50">
          <button
            className="rounded-xl border border-border bg-card px-4 py-2 font-medium text-xs text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
            disabled={isSending}
            onClick={onClose}
            type="button"
          >
            İptal
          </button>
          <button
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 font-medium text-white text-xs shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
            disabled={isSending || accounts.length === 0}
            onClick={handleSend}
            type="button"
          >
            {isSending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Gönderiliyor...</span>
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>E-postayı Gönder</span>
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
