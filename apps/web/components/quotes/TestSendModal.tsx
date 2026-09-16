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
import { Eye, Mail, Send, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ApiClient, type QuoteSummaryDto } from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";

const EMAIL_REGEX: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type TestSendModalProps = {
  initialQuoteId?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSent?: () => void;
  quoteOptions: QuoteSummaryDto[];
  templateId: string | null;
  templateName?: string;
};

export function TestSendModal({
  initialQuoteId = null,
  isOpen,
  onClose,
  onSent,
  quoteOptions,
  templateId,
  templateName,
}: TestSendModalProps): React.ReactElement | null {
  const { activeTenant } = usePermissions();
  const [toEmail, setToEmail] = useState<string>("");
  const [toEmailError, setToEmailError] = useState<string | undefined>(
    undefined
  );
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(
    initialQuoteId
  );
  const [isSending, setIsSending] = useState<boolean>(false);
  const [resultHtml, setResultHtml] = useState<string | null>(null);
  const [resultSubject, setResultSubject] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedQuoteId(initialQuoteId);
      setResultHtml(null);
      setResultSubject(null);
      setToEmailError(undefined);
    }
  }, [isOpen, initialQuoteId]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const validateEmail = useCallback((value: string): boolean => {
    if (!value.trim()) {
      setToEmailError("E-posta zorunlu");
      return false;
    }
    if (!EMAIL_REGEX.test(value.trim())) {
      setToEmailError("Geçerli bir e-posta girin");
      return false;
    }
    setToEmailError(undefined);
    return true;
  }, []);

  const handleSend = useCallback(async (): Promise<void> => {
    if (!templateId) {
      toast.error("Önce şablonu kaydedin");
      return;
    }
    if (!activeTenant?.id) {
      toast.error("Tenant bulunamadı");
      return;
    }
    if (!validateEmail(toEmail)) {
      return;
    }
    setIsSending(true);
    try {
      const res = await ApiClient.testSendQuoteTemplate(
        templateId,
        {
          quoteId: selectedQuoteId ?? undefined,
          toEmail: toEmail.trim(),
        },
        activeTenant.id
      );
      if (!(res.success && res.data)) {
        toast.error(res.message || "Test gönderimi başarısız");
        return;
      }
      const previewHtml: string = res.data.previewHtml;
      // Api response may include subject via extended type; keep for display
      const subjectFromRes: string | undefined = (
        res.data as { subject?: string }
      ).subject;
      setResultHtml(previewHtml);
      setResultSubject(subjectFromRes ?? null);
      toast.success(
        `Test e-postası gönderildi (önizleme) — ${toEmail.trim()} için hazırlandı (preview)`
      );
      if (onSent) {
        onSent();
      }
    } catch {
      toast.error("Test gönderimi sırasında hata oluştu");
    } finally {
      setIsSending(false);
    }
  }, [
    activeTenant?.id,
    onSent,
    selectedQuoteId,
    templateId,
    toEmail,
    validateEmail,
  ]);

  if (!isOpen) {
    return null;
  }

  const isDisabled: boolean = !templateId || isSending;

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
        className="flex max-h-[92vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-border border-b bg-zinc-50 px-4 py-3 dark:bg-zinc-800/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Mail className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                Test Gönder
              </DialogTitle>
              <p className="text-2xs text-zinc-500 dark:text-zinc-400">
                {templateName ? `${templateName} — ` : ""}önizleme modunda
                e-posta hazırla
              </p>
            </div>
          </div>
          <DialogClose asChild>
            <button
              aria-label="Kapat"
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </DialogClose>
        </div>

        {/* Body */}
        <div className="custom-scrollbar space-y-4 overflow-y-auto p-4 sm:p-5">
          {templateId ? null : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800 text-xs dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
              Test göndermek için önce şablonu kaydedin. Kaydedilmemiş şablonlar
              için önizleme yalnızca yerel fallback ile gösterilir.
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs" required>
              Alıcı E-posta
            </Label>
            <Input
              error={toEmailError}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setToEmail(e.target.value);
                if (toEmailError) {
                  setToEmailError(undefined);
                }
              }}
              placeholder="ornek@sirket.com"
              required
              type="email"
              value={toEmail}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Teklif Seç (gerçek veri için)</Label>
            <Select
              onValueChange={(val) =>
                setSelectedQuoteId(val === "mock" ? null : val)
              }
              value={selectedQuoteId ?? "mock"}
            >
              <SelectTrigger>
                <SelectValue placeholder="Mock veri (varsayılan)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mock">Mock Veri (örnek veri)</SelectItem>
                {quoteOptions.map((q) => (
                  <SelectItem key={q.id} value={q.id}>
                    {q.quoteNumber} — {q.customerName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-2xs text-zinc-500 dark:text-zinc-400">
              {selectedQuoteId
                ? `Gerçek Veri: ${quoteOptions.find((q) => q.id === selectedQuoteId)?.quoteNumber ?? selectedQuoteId} ile render edilecek`
                : "Mock Veri ile render edilecek — test e-postası gerçek veriye ihtiyaç duymaz"}
            </p>
          </div>

          {/* Current preview summary */}
          {templateId ? (
            <div className="rounded-xl border border-border bg-zinc-50 p-3 dark:bg-zinc-800/30">
              <p className="flex items-center gap-1.5 font-semibold text-2xs text-zinc-600 dark:text-zinc-400">
                <Eye className="h-3.5 w-3.5" />
                Önizleme özeti
              </p>
              <p className="mt-1 text-2xs text-zinc-500 dark:text-zinc-400">
                Gönderim sonrası dönen{" "}
                <span className="font-mono">previewHtml</span> aşağıda iframe
                içinde gösterilir. SMTP bu fazda yalnızca log + bildirim —
                gerçek e-posta iletimi yok.
              </p>
            </div>
          ) : null}

          {/* Result preview */}
          {resultHtml ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-zinc-700 dark:text-zinc-300">
                  Dönen Önizleme
                </span>
                {resultSubject ? (
                  <span className="truncate rounded bg-zinc-100 px-2 py-0.5 font-medium text-2xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    Konu: {resultSubject}
                  </span>
                ) : null}
              </div>
              <details
                className="rounded-xl border border-border bg-card open:shadow-2xs"
                open
              >
                <summary className="cursor-pointer list-none px-3 py-2 font-semibold text-2xs text-zinc-700 dark:text-zinc-300">
                  HTML önizlemeyi aç/kapat
                </summary>
                <div className="border-border border-t p-2">
                  <iframe
                    className="h-[400px] w-full rounded-lg border bg-card"
                    sandbox="allow-same-origin"
                    srcDoc={resultHtml}
                    title="Test E-posta Önizleme"
                  />
                </div>
              </details>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-2 border-border border-t bg-zinc-50 px-4 py-3 dark:bg-zinc-800/50">
          <button
            className="rounded-xl border border-border bg-card px-4 py-2 font-semibold text-xs text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
            onClick={onClose}
            type="button"
          >
            Kapat
          </button>
          <button
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 font-semibold text-white text-xs shadow-xs transition hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50"
            disabled={isDisabled}
            onClick={() => {
              void handleSend();
            }}
            type="button"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{isSending ? "Gönderiliyor..." : "Gönder (önizleme)"}</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
