"use client";

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
import { Mail, Send, X, Eye } from "lucide-react";
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
      if (!res.success || !res.data) {
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
      toast.success(`Test e-postası gönderildi (önizleme) — ${toEmail.trim()} için hazırlandı (preview)`);
      if (onSent) {
        onSent();
      }
    } catch {
      toast.error("Test gönderimi sırasında hata oluştu");
    } finally {
      setIsSending(false);
    }
  }, [activeTenant?.id, onSent, selectedQuoteId, templateId, toEmail, validateEmail]);

  if (!isOpen) {
    return null;
  }

  const isDisabled: boolean = !templateId || isSending;

  return (
    <div className="fade-in fixed inset-0 z-[60] flex animate-in items-center justify-center overflow-y-auto p-4">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 my-auto flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-zinc-200 border-b bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-800/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Mail className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                Test Gönder
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {templateName ? `${templateName} — ` : ""}önizleme modunda e-posta hazırla
              </p>
            </div>
          </div>
          <button
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="custom-scrollbar space-y-4 overflow-y-auto p-4 sm:p-5">
          {!templateId ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
              Test göndermek için önce şablonu kaydedin. Kaydedilmemiş şablonlar
              için önizleme yalnızca yerel fallback ile gösterilir.
            </div>
          ) : null}

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
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              {selectedQuoteId
                ? `Gerçek Veri: ${quoteOptions.find((q) => q.id === selectedQuoteId)?.quoteNumber ?? selectedQuoteId} ile render edilecek`
                : "Mock Veri ile render edilecek — test e-postası gerçek veriye ihtiyaç duymaz"}
            </p>
          </div>

          {/* Current preview summary */}
          {templateId ? (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/30">
              <p className="flex items-center gap-1.5 font-semibold text-[11px] text-zinc-600 dark:text-zinc-400">
                <Eye className="h-3.5 w-3.5" />
                Önizleme özeti
              </p>
              <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                Gönderim sonrası dönen <span className="font-mono">previewHtml</span>{" "}
                aşağıda iframe içinde gösterilir. SMTP bu fazda yalnızca log + bildirim
                — gerçek e-posta iletimi yok.
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
                  <span className="truncate rounded bg-zinc-100 px-2 py-0.5 font-medium text-[11px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    Konu: {resultSubject}
                  </span>
                ) : null}
              </div>
              <details
                className="rounded-xl border border-zinc-200 bg-white open:shadow-2xs dark:border-zinc-800 dark:bg-zinc-900"
                open
              >
                <summary className="cursor-pointer list-none px-3 py-2 font-semibold text-[11px] text-zinc-700 dark:text-zinc-300">
                  HTML önizlemeyi aç/kapat
                </summary>
                <div className="border-zinc-200 border-t p-2 dark:border-zinc-800">
                  <iframe
                    className="w-full h-[400px] rounded-lg border bg-white"
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
        <div className="flex shrink-0 items-center justify-end gap-2 border-zinc-200 border-t bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-800/50">
          <button
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2 font-semibold text-xs text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
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
      </div>
    </div>
  );
}
