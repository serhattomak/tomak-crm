"use client";

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
import React, { useState } from "react";
import { toast } from "sonner";
import { DatePicker } from "@workspace/ui/components/date-picker";
import { NumberInput } from "@workspace/ui/components/number-input";
import {
  ApiClient,
  type CampaignListItemDto,
  type GenerateCouponsPayload,
} from "@/lib/api-client";

interface BulkCouponModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaigns: CampaignListItemDto[];
  tenantId?: string;
  onSuccess: () => void;
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

  if (!isOpen) return null;

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
        quantity: mode === "single" ? 1 : quantity,
        prefix: mode === "bulk" && prefix.trim() ? prefix.trim().toUpperCase() : undefined,
        codeLength,
        maxUses,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        customCode: mode === "single" ? customCode.trim().toUpperCase() : undefined,
      };

      const res = await ApiClient.generateCoupons(payload, tenantId);
      if (res.success && res.data) {
        setGeneratedResult({
          batchId: res.data.batchId,
          generatedCount: res.data.generatedCount,
          codes: res.data.codes,
        });
        toast.success(`${res.data.generatedCount} adet kupon kodu başarıyla üretildi.`);
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
    if (!generatedResult || generatedResult.codes.length === 0) return;
    const csvContent = "data:text/csv;charset=utf-8," + ["Kupon Kodu", ...generatedResult.codes].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `kuponlar_${generatedResult.batchId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyCodes = () => {
    if (!generatedResult) return;
    navigator.clipboard.writeText(generatedResult.codes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Kupon Kodu Üretici
              </h2>
              <p className="text-xs text-zinc-500">
                Tekil veya binlerce benzersiz tek kullanımlık kupon oluşturun
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
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
                  {generatedResult.generatedCount} adet kupon başarıyla üretildi!
                </span>
              </div>
              <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
                Batch ID: <code className="font-mono">{generatedResult.batchId}</code>
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>Örnek Kodlar (İlk {Math.min(50, generatedResult.codes.length)} adet):</span>
                <button
                  type="button"
                  onClick={handleCopyCodes}
                  className="flex items-center gap-1 font-medium text-violet-600 hover:underline dark:text-violet-400"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Kopyalandı" : "Tümünü Kopyala"}
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50 p-3 font-mono text-xs text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
                <div className="grid grid-cols-2 gap-2">
                  {generatedResult.codes.slice(0, 50).map((code) => (
                    <div key={code} className="rounded border border-zinc-200/80 bg-white px-2 py-1 dark:border-zinc-800 dark:bg-zinc-900">
                      {code}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleDownloadCsv}
                className="flex items-center gap-2 rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <Download className="h-4 w-4" />
                CSV İndir
              </button>
              <button
                type="button"
                onClick={() => {
                  setGeneratedResult(null);
                  onClose();
                }}
                className="rounded-xl bg-violet-600 px-5 py-2 text-sm font-medium text-white shadow-xs hover:bg-violet-700"
              >
                Tamamla
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {/* Mode Switcher */}
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
              <button
                type="button"
                onClick={() => setMode("bulk")}
                className={`rounded-lg py-1.5 text-xs font-medium transition-all ${
                  mode === "bulk"
                    ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                Toplu Üretim (Bulk Batch)
              </button>
              <button
                type="button"
                onClick={() => setMode("single")}
                className={`rounded-lg py-1.5 text-xs font-medium transition-all ${
                  mode === "single"
                    ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                Özel / Tekil Kod (Custom)
              </button>
            </div>

            {/* Campaign Select */}
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Bağlı Kampanya *
              </label>
              <select
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
                required
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 focus:border-violet-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
              >
                <option value="" disabled>Kampanya seçiniz...</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.type} - {c.discountValue}{c.type === "Percentage" ? "%" : "₺"})
                  </option>
                ))}
              </select>
            </div>

            {mode === "single" ? (
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Özel Kupon Kodu *
                </label>
                <div className="relative">
                  <Ticket className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                  <input
                    type="text"
                    value={customCode}
                    onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                    placeholder="Örn: BAHAR2026, VIPMUSTERI"
                    className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm uppercase tracking-wider text-zinc-800 focus:border-violet-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 font-mono"
                    required
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      Üretilecek Adet
                    </label>
                    <NumberInput
                      value={quantity}
                      onChange={(val) => setQuantity(val)}
                      min={1}
                      max={5000}
                      step={50}
                      suffix="adet"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      Kod Ön Ek (Prefix)
                    </label>
                    <input
                      type="text"
                      value={prefix}
                      onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                      placeholder="Örn: CRM, YAZ"
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm uppercase font-mono text-zinc-800 focus:border-violet-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      Rastgele Karakter Sayısı
                    </label>
                    <NumberInput
                      value={codeLength}
                      onChange={(val) => setCodeLength(val)}
                      min={4}
                      max={16}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      Kod Başına Maks Kullanım
                    </label>
                    <NumberInput
                      value={maxUses}
                      onChange={(val) => setMaxUses(val)}
                      min={1}
                      suffix="kullanım"
                      className="w-full"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Son Kullanma Tarihi (Opsiyonel)
              </label>
              <DatePicker
                value={expiresAt}
                onChange={(val) => setExpiresAt(val)}
                placeholder="Son kullanma tarihi seçiniz (Süresiz için boş)"
                className="w-full"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2 text-sm font-medium text-white shadow-xs hover:bg-violet-700 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {mode === "single" ? "Kuponu Kaydet" : `${quantity} Adet Kupon Üret`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
