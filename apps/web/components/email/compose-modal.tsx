"use client";

import { Eye, FileText, Loader2, Paperclip, Save, Send, X } from "lucide-react";
import { useTheme } from "next-themes";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PermissionGate } from "@/components/permission-gate";
import { VariableChips } from "@/components/quotes/VariableChips";
import {
  ApiClient,
  type EmailAccountDto,
  type QuoteTemplateDto,
} from "@/lib/api-client";
import { renderEmailPreviewHtml } from "@/lib/email-preview";

interface ComposeModalProps {
  accounts: EmailAccountDto[];
  isOpen: boolean;
  onClose: () => void;
  onSent: () => void;
  prefill?: {
    accountId?: string;
    cc?: string[];
    draftId?: string;
    htmlBody?: string;
    subject?: string;
    to?: string[];
  };
  tenantId: string;
}

interface LocalAttachment {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
}

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10MB limit
const EMAIL_SPLIT_REGEX = /[,;\s]+/;

function parseEmails(input: string): string[] {
  return input
    .split(EMAIL_SPLIT_REGEX)
    .map((e) => e.trim())
    .filter((e) => e.length > 0);
}

interface AttachmentItemProps {
  att: LocalAttachment;
  index: number;
  onRemove: (index: number) => void;
}

function AttachmentItem({ att, index, onRemove }: AttachmentItemProps) {
  const handleRemove = useCallback(() => {
    onRemove(index);
  }, [onRemove, index]);

  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
      <FileText className="h-3.5 w-3.5 text-zinc-400" />
      <span className="max-w-[140px] truncate">{att.filename}</span>
      <button
        aria-label="Eki kaldır"
        className="text-zinc-400 hover:text-rose-600"
        onClick={handleRemove}
        type="button"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

interface AttachmentListProps {
  attachments: LocalAttachment[];
  onRemove: (index: number) => void;
}

function AttachmentList({ attachments, onRemove }: AttachmentListProps) {
  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {attachments.map((att, i) => (
        <AttachmentItem
          att={att}
          index={i}
          key={`${att.filename}-${att.sizeBytes}`}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}

export function ComposeModal({
  accounts,
  isOpen,
  onClose,
  onSent,
  prefill,
  tenantId,
}: ComposeModalProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [toInput, setToInput] = useState<string>("");
  const [ccInput, setCcInput] = useState<string>("");
  const [showCc, setShowCc] = useState<boolean>(false);
  const [subject, setSubject] = useState<string>("");
  const [htmlBody, setHtmlBody] = useState<string>("");

  const [templates, setTemplates] = useState<QuoteTemplateDto[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [isLoadingTemplates, setIsLoadingTemplates] = useState<boolean>(false);

  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);

  const [activeView, setActiveView] = useState<"edit" | "preview">("edit");
  const [isSending, setIsSending] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  useEffect(() => {
    if (isOpen) {
      if (prefill?.accountId) {
        setSelectedAccountId(prefill.accountId);
      } else {
        const [firstAccount] = accounts;
        if (firstAccount) {
          setSelectedAccountId(firstAccount.id);
        }
      }

      setToInput(prefill?.to?.join(", ") || "");
      setCcInput(prefill?.cc?.join(", ") || "");
      setShowCc(Boolean(prefill?.cc && prefill.cc.length > 0));
      setSubject(prefill?.subject || "");
      setHtmlBody(prefill?.htmlBody || "");
      setAttachments([]);
      setActiveView("edit");
      setSelectedTemplateId("");

      const fetchTemplates = async () => {
        setIsLoadingTemplates(true);
        try {
          const res = await ApiClient.getQuoteTemplates(tenantId);
          if (res.success && res.data) {
            setTemplates(res.data);
          }
        } catch {
          // non-blocking
        } finally {
          setIsLoadingTemplates(false);
        }
      };

      fetchTemplates();
    }
  }, [isOpen, prefill, accounts, tenantId]);

  const handleAccountIdChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedAccountId(e.target.value);
    },
    []
  );

  const handleToChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setToInput(e.target.value);
    },
    []
  );

  const handleCcChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setCcInput(e.target.value);
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

  const handleToggleCc = useCallback(() => {
    setShowCc(true);
  }, []);

  const handleSetEditView = useCallback(() => {
    setActiveView("edit");
  }, []);

  const handleSetPreviewView = useCallback(() => {
    setActiveView("preview");
  }, []);

  const handleInsertVariable = useCallback((variableName: string) => {
    const placeholder = `{{${variableName}}}`;
    const textarea = document.getElementById(
      "compose-body-textarea"
    ) as HTMLTextAreaElement | null;

    if (!textarea) {
      setHtmlBody((prev) => `${prev} ${placeholder}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.slice(0, start);
    const after = text.slice(end);

    const nextText = `${before}${placeholder}${after}`;
    setHtmlBody(nextText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + placeholder.length,
        start + placeholder.length
      );
    }, 0);
  }, []);

  const handleTemplateChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const templateId = e.target.value;
      setSelectedTemplateId(templateId);
      if (!templateId) {
        return;
      }

      const tpl = templates.find((t) => t.id === templateId);
      if (tpl) {
        if (tpl.subject) {
          setSubject(tpl.subject);
        }
        if (tpl.htmlBody) {
          setHtmlBody(tpl.htmlBody);
        }
        toast.info(`'${tpl.name}' şablonu yüklendi.`);
      }
    },
    [templates]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { files } = e.target;
      if (!files || files.length === 0) {
        return;
      }

      const newAttachments: LocalAttachment[] = [];
      for (const file of Array.from(files)) {
        if (file.size > MAX_ATTACHMENT_BYTES) {
          toast.error(`'${file.name}' 10MB sınırını aşıyor.`);
          continue;
        }

        const storagePath = `email-attachments/${tenantId}/${file.name}`;
        newAttachments.push({
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          storagePath,
        });
      }

      setAttachments((prev) => [...prev, ...newAttachments]);
      e.target.value = "";
    },
    [tenantId]
  );

  const handleRemoveAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleOpenFileDialog = useCallback(() => {
    const input = document.getElementById(
      "compose-file-input"
    ) as HTMLInputElement | null;
    input?.click();
  }, []);

  const handleSend = useCallback(async () => {
    const toAddresses = parseEmails(toInput);
    if (toAddresses.length === 0) {
      toast.error("Lütfen en az bir geçerli alıcı e-postası girin.");
      return;
    }

    if (!selectedAccountId) {
      toast.error("Lütfen gönderici hesabı seçin.");
      return;
    }

    if (!subject.trim()) {
      toast.error("Lütfen bir e-posta konusu girin.");
      return;
    }

    if (!htmlBody.trim()) {
      toast.error("Lütfen e-posta içeriği yazın.");
      return;
    }

    const ccAddresses = parseEmails(ccInput);

    setIsSending(true);
    try {
      const res = await ApiClient.sendEmailMessage(
        {
          accountId: selectedAccountId,
          attachments: attachments.map((a) => ({
            filename: a.filename,
            mimeType: a.mimeType,
            sizeBytes: a.sizeBytes,
            storagePath: a.storagePath,
          })),
          cc: ccAddresses.length > 0 ? ccAddresses : undefined,
          htmlBody,
          subject: subject.trim(),
          templateId: selectedTemplateId || undefined,
          to: toAddresses,
        },
        tenantId
      );

      if (res.success) {
        toast.success("E-posta başarıyla gönderildi.");
        onSent();
        onClose();
      } else {
        toast.error(res.message || "E-posta gönderilirken hata oluştu.");
      }
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Beklenmeyen bir hata oluştu."
      );
    } finally {
      setIsSending(false);
    }
  }, [
    toInput,
    selectedAccountId,
    subject,
    htmlBody,
    ccInput,
    selectedTemplateId,
    attachments,
    tenantId,
    onSent,
    onClose,
  ]);

  const handleSaveDraft = useCallback(async () => {
    if (!selectedAccountId) {
      toast.error("Lütfen bir hesap seçin.");
      return;
    }

    setIsSavingDraft(true);
    try {
      const toAddresses = parseEmails(toInput);
      const ccAddresses = parseEmails(ccInput);

      const res = await ApiClient.saveEmailDraft(
        {
          accountId: selectedAccountId,
          attachments: attachments.map((a) => ({
            filename: a.filename,
            mimeType: a.mimeType,
            sizeBytes: a.sizeBytes,
            storagePath: a.storagePath,
          })),
          cc: ccAddresses.length > 0 ? ccAddresses : undefined,
          htmlBody: htmlBody || undefined,
          id: prefill?.draftId,
          subject: subject.trim() || undefined,
          to: toAddresses.length > 0 ? toAddresses : undefined,
        },
        tenantId
      );

      if (res.success) {
        toast.success("Taslak kaydedildi.");
        onSent();
        onClose();
      } else {
        toast.error(res.message || "Taslak kaydedilemedi.");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Hata oluştu.");
    } finally {
      setIsSavingDraft(false);
    }
  }, [
    selectedAccountId,
    toInput,
    ccInput,
    prefill?.draftId,
    subject,
    htmlBody,
    attachments,
    tenantId,
    onSent,
    onClose,
  ]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Kapat"
        className="fixed inset-0 h-full w-full cursor-default border-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        type="button"
      />

      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
        {/* Header */}
        <div className="flex items-center justify-between border-zinc-100 border-b pb-3 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
              <Send className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
            </div>
            <div>
              <h2 className="font-semibold text-base text-zinc-900 dark:text-zinc-100">
                Yeni E-posta İletisi
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Bağlı posta kutunuz üzerinden kurumsal e-posta gönderin veya
                taslak saklayın.
              </p>
            </div>
          </div>
          <button
            aria-label="Kapat"
            className="rounded-lg p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Form Area */}
        <div className="flex-1 space-y-3 overflow-y-auto py-3">
          {/* Account Selector + Template Picker */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                className="mb-1 block font-medium text-[11px] text-zinc-600 dark:text-zinc-400"
                htmlFor="compose-sender-account"
              >
                Gönderici Hesap *
              </label>
              <select
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-900 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                id="compose-sender-account"
                onChange={handleAccountIdChange}
                value={selectedAccountId}
              >
                {accounts.length === 0 ? (
                  <option value="">Bağlı hesap bulunamadı</option>
                ) : null}
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.email} ({acc.provider})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                className="mb-1 block font-medium text-[11px] text-zinc-600 dark:text-zinc-400"
                htmlFor="compose-template-select"
              >
                Şablon Seç (İsteğe Bağlı)
              </label>
              <select
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-900 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                disabled={isLoadingTemplates}
                id="compose-template-select"
                onChange={handleTemplateChange}
                value={selectedTemplateId}
              >
                <option value="">Şablon seçilmedi (Manuel yazım)</option>
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Recipients (To & Cc) */}
          <div className="space-y-2">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label
                  className="font-medium text-[11px] text-zinc-600 dark:text-zinc-400"
                  htmlFor="compose-to"
                >
                  Alıcı (Kime) *
                </label>
                {showCc ? null : (
                  <button
                    className="text-[11px] text-sky-600 hover:underline dark:text-sky-400"
                    onClick={handleToggleCc}
                    type="button"
                  >
                    + Bilgi (Cc) Ekle
                  </button>
                )}
              </div>
              <input
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-1.5 font-mono text-xs text-zinc-900 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                id="compose-to"
                onChange={handleToChange}
                placeholder="ornek@musteri.com, diger@sirket.com (virgülle ayırın)"
                type="text"
                value={toInput}
              />
            </div>

            {showCc ? (
              <div>
                <label
                  className="mb-1 block font-medium text-[11px] text-zinc-600 dark:text-zinc-400"
                  htmlFor="compose-cc"
                >
                  Bilgi (Cc)
                </label>
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-1.5 font-mono text-xs text-zinc-900 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                  id="compose-cc"
                  onChange={handleCcChange}
                  placeholder="bilgi@sirket.com"
                  type="text"
                  value={ccInput}
                />
              </div>
            ) : null}

            <div>
              <label
                className="mb-1 block font-medium text-[11px] text-zinc-600 dark:text-zinc-400"
                htmlFor="compose-subject"
              >
                Konu *
              </label>
              <input
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-1.5 font-medium text-xs text-zinc-900 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                id="compose-subject"
                onChange={handleSubjectChange}
                placeholder="E-posta konusu..."
                type="text"
                value={subject}
              />
            </div>
          </div>

          {/* Variable Chips */}
          <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-2.5 dark:border-zinc-800/80 dark:bg-zinc-900/40">
            <VariableChips onInsert={handleInsertVariable} />
          </div>

          {/* Edit / Preview Tabs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-0.5 text-xs dark:border-zinc-800 dark:bg-zinc-900">
                <button
                  className={`rounded-md px-3 py-1 font-medium transition ${
                    activeView === "edit"
                      ? "bg-white text-zinc-900 shadow-2xs dark:bg-zinc-800 dark:text-zinc-100"
                      : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  }`}
                  onClick={handleSetEditView}
                  type="button"
                >
                  HTML / Metin Düzenleyici
                </button>
                <button
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition ${
                    activeView === "preview"
                      ? "bg-white text-zinc-900 shadow-2xs dark:bg-zinc-800 dark:text-zinc-100"
                      : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  }`}
                  onClick={handleSetPreviewView}
                  type="button"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Önizleme
                </button>
              </div>

              <span className="font-mono text-[11px] text-zinc-400">
                {htmlBody.length} karakter
              </span>
            </div>

            {activeView === "edit" ? (
              <div>
                <label className="sr-only" htmlFor="compose-body-textarea">
                  E-posta İçeriği
                </label>
                <textarea
                  className="w-full resize-y rounded-xl border border-zinc-200 bg-white p-3 font-mono text-xs text-zinc-900 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                  id="compose-body-textarea"
                  onChange={handleHtmlBodyChange}
                  placeholder="E-posta içeriğinizi yazın veya HTML formatında girin..."
                  rows={9}
                  value={htmlBody}
                />
              </div>
            ) : (
              <div
                className={`min-h-[220px] rounded-xl border p-2 transition-colors ${
                  isDark
                    ? "border-zinc-800 bg-zinc-950 text-zinc-100"
                    : "border-zinc-200 bg-white text-zinc-900"
                }`}
              >
                <iframe
                  className="min-h-[200px] w-full border-0"
                  sandbox="allow-same-origin allow-popups"
                  srcDoc={renderEmailPreviewHtml(htmlBody, isDark)}
                  title="E-posta Önizleme"
                />
              </div>
            )}
          </div>

          {/* Attachments Area */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-xs text-zinc-700 dark:text-zinc-300">
                Ekler ({attachments.length})
              </span>
              <button
                className="inline-flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                onClick={handleOpenFileDialog}
                type="button"
              >
                <Paperclip className="h-3.5 w-3.5" />
                <span>Dosya Ekle (Maks 10MB)</span>
              </button>
              <input
                aria-label="Dosya yükle"
                className="hidden"
                id="compose-file-input"
                multiple
                onChange={handleFileSelect}
                type="file"
              />
            </div>

            <AttachmentList
              attachments={attachments}
              onRemove={handleRemoveAttachment}
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-zinc-100 border-t pt-3 dark:border-zinc-800">
          <button
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 font-medium text-xs text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
            disabled={isSavingDraft || isSending}
            onClick={handleSaveDraft}
            type="button"
          >
            {isSavingDraft ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Taslak Olarak Kaydet
          </button>

          <div className="flex items-center gap-2">
            <button
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 font-medium text-xs text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
              disabled={isSending}
              onClick={onClose}
              type="button"
            >
              Vazgeç
            </button>

            <PermissionGate permission="Emails.Send">
              <button
                className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-5 py-2 font-medium text-white text-xs shadow-sm hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                disabled={isSending}
                onClick={handleSend}
                type="button"
              >
                {isSending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                Gönder
              </button>
            </PermissionGate>
          </div>
        </div>
      </div>
    </div>
  );
}
