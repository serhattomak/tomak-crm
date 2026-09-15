"use client";

import { DatePicker } from "@workspace/ui/components/date-picker";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { NumberInput } from "@workspace/ui/components/number-input";
import {
  AlertCircle,
  Check,
  Copy,
  Download,
  KeyRound,
  Loader2,
  Sparkles,
  Ticket,
  X,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { toast } from "sonner";
import {
  ApiClient,
  type CampaignListItemDto,
  type GenerateCouponsPayload,
} from "@/lib/api-client";

interface BulkCouponModalProps {
  campaigns: CampaignListItemDto[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tenantId?: string;
}

export function BulkCouponModal({
  isOpen,
  onClose,
  campaigns,
  tenantId,
  onSuccess,
}: BulkCouponModalProps) {
  const [campaignId, setCampaignId] = useState<string>(campaigns[0]?.id || "");
  const [mode, setMode] = useState<"bulk" | "single">("bulk");
  const [quantity, setQuantity] = useState<number>(100);
  const [prefix, setPrefix] = useState<string>("CRM");
  const [codeLength, setCodeLength] = useState<number>(8);
  const [maxUses, setMaxUses] = useState<number>(1);
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [customCode, setCustomCode] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedResult, setGeneratedResult] = useState<{
    batchId: string;
    generatedCount: number;
    codes: string[];
  } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignId) {
      setError("Lütfen bir kampanya seçin.");
      return;
    }

    if (mode === "single" && !customCode.trim()) {
      setError("Lütfen özel kupon kodunu girin.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload: GenerateCouponsPayload = {
        campaignId,
        codeLength,
        customCode:
          mode === "single" ? customCode.trim().toUpperCase() : undefined,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        maxUses,
        prefix:
          mode === "bulk" && prefix.trim()
            ? prefix.trim().toUpperCase()
            : undefined,
        quantity: mode === "single" ? 1 : quantity,
      };

      const res = await ApiClient.generateCoupons(payload, tenantId);
      if (res.success && res.data) {
        setGeneratedResult({
          batchId: res.data.batchId,
          codes: res.data.codes,
          generatedCount: res.data.generatedCount,
        });
        toast.success(
          `${res.data.generatedCount} adet kupon kodu başarıyla üretildi.`
        );
        onSuccess();
      } else {
        const msg = res.message || "Kuponlar üretilirken bir hata oluştu.";
        setError(msg);
        toast.error(msg);
      }
    } catch {
      const msg = "Sunucu bağlantısı sırasında bir hata oluştu.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCsv = () => {
    if (!generatedResult || generatedResult.codes.length === 0) {
      return;
    }
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Kupon Kodu", ...generatedResult.codes].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `kuponlar_${generatedResult.batchId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyCodes = () => {
    if (!generatedResult) {
      return;
    }
    navigator.clipboard.writeText(generatedResult.codes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
        className="flex w-full flex-col gap-0 overflow-hidden p-6 sm:max-w-xl"
        // Outside-click is only allowed to discard what the user can retype.
        // Once coupons exist their codes are shown here and nowhere else, so a
        // stray click must not throw them away. Escape still closes.
        onInteractOutside={(event) => {
          if (generatedResult) {
            event.preventDefault();
          }
        }}
        showCloseButton={false}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-zinc-100 border-b pb-4 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">
                Kupon Kodu Üretici
              </DialogTitle>
              <p className="text-xs text-zinc-500">
                Tekil veya binlerce benzersiz tek kullanımlık kupon oluşturun
              </p>
            </div>
          </div>
          <DialogClose asChild>
            <button
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </DialogClose>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-red-700 text-xs dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {generatedResult ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                <Check className="h-5 w-5" />
                <span className="font-semibold">
                  {generatedResult.generatedCount} adet kupon başarıyla
                  üretildi!
                </span>
              </div>
              <p className="mt-1 text-emerald-700 text-xs dark:text-emerald-400">
                Batch ID:{" "}
                <code className="font-mono">{generatedResult.batchId}</code>
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>
                  Örnek Kodlar (İlk {Math.min(50, generatedResult.codes.length)}{" "}
                  adet):
                </span>
                <button
                  className="flex items-center gap-1 font-medium text-violet-600 hover:underline dark:text-violet-400"
                  onClick={handleCopyCodes}
                  type="button"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copied ? "Kopyalandı" : "Tümünü Kopyala"}
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50 p-3 font-mono text-xs text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
                <div className="grid grid-cols-2 gap-2">
                  {generatedResult.codes.slice(0, 50).map((code) => (
                    <div
                      className="rounded border border-zinc-200/80 bg-white px-2 py-1 dark:border-zinc-800 dark:bg-zinc-900"
                      key={code}
                    >
                      {code}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                className="flex items-center gap-2 rounded-xl border border-zinc-200 px-4 py-2 font-medium text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
                onClick={handleDownloadCsv}
                type="button"
              >
                <Download className="h-4 w-4" />
                CSV İndir
              </button>
              <button
                className="rounded-xl bg-violet-600 px-5 py-2 font-medium text-sm text-white shadow-xs hover:bg-violet-700"
                onClick={() => {
                  setGeneratedResult(null);
                  onClose();
                }}
                type="button"
              >
                Tamamla
              </button>
            </div>
          </div>
        ) : (
          <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
            {/* Mode Switcher */}
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
              <button
                className={`rounded-lg py-1.5 font-medium text-xs transition-all ${
                  mode === "bulk"
                    ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
                onClick={() => setMode("bulk")}
                type="button"
              >
                Toplu Üretim (Bulk Batch)
              </button>
              <button
                className={`rounded-lg py-1.5 font-medium text-xs transition-all ${
                  mode === "single"
                    ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
                onClick={() => setMode("single")}
                type="button"
              >
                Özel / Tekil Kod (Custom)
              </button>
            </div>

            {/* Campaign Select */}
            <div>
              <label className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300">
                Bağlı Kampanya *
              </label>
              <select
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 focus:border-violet-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                onChange={(e) => setCampaignId(e.target.value)}
                required
                value={campaignId}
              >
                <option disabled value="">
                  Kampanya seçiniz...
                </option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.type} - {c.discountValue}
                    {c.type === "Percentage" ? "%" : "₺"})
                  </option>
                ))}
              </select>
            </div>

            {mode === "single" ? (
              <div>
                <label className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300">
                  Özel Kupon Kodu *
                </label>
                <div className="relative">
                  <Ticket className="absolute top-2.5 left-3 h-4 w-4 text-zinc-400" />
                  <input
                    className="w-full rounded-xl border border-zinc-200 bg-white py-2 pr-3 pl-9 font-mono text-sm text-zinc-800 uppercase tracking-wider focus:border-violet-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                    onChange={(e) =>
                      setCustomCode(e.target.value.toUpperCase())
                    }
                    placeholder="Örn: BAHAR2026, VIPMUSTERI"
                    required
                    type="text"
                    value={customCode}
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300">
                      Üretilecek Adet
                    </label>
                    <NumberInput
                      className="w-full"
                      max={5000}
                      min={1}
                      onChange={(val) => setQuantity(val)}
                      step={50}
                      suffix="adet"
                      value={quantity}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300">
                      Kod Ön Ek (Prefix)
                    </label>
                    <input
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 font-mono text-sm text-zinc-800 uppercase focus:border-violet-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                      onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                      placeholder="Örn: CRM, YAZ"
                      type="text"
                      value={prefix}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300">
                      Rastgele Karakter Sayısı
                    </label>
                    <NumberInput
                      className="w-full"
                      max={16}
                      min={4}
                      onChange={(val) => setCodeLength(val)}
                      value={codeLength}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300">
                      Kod Başına Maks Kullanım
                    </label>
                    <NumberInput
                      className="w-full"
                      min={1}
                      onChange={(val) => setMaxUses(val)}
                      suffix="kullanım"
                      value={maxUses}
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300">
                Son Kullanma Tarihi (Opsiyonel)
              </label>
              <DatePicker
                className="w-full"
                onChange={(val) => setExpiresAt(val)}
                placeholder="Son kullanma tarihi seçiniz (Süresiz için boş)"
                value={expiresAt}
              />
            </div>

            <div className="flex items-center justify-end gap-3 border-zinc-100 border-t pt-4 dark:border-zinc-800">
              <button
                className="rounded-xl border border-zinc-200 px-4 py-2 font-medium text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
                onClick={onClose}
                type="button"
              >
                İptal
              </button>
              <button
                className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2 font-medium text-sm text-white shadow-xs hover:bg-violet-700 disabled:opacity-50"
                disabled={loading}
                type="submit"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {mode === "single"
                  ? "Kuponu Kaydet"
                  : `${quantity} Adet Kupon Üret`}
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
