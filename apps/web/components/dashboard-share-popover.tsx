"use client";

import { toast } from "@workspace/ui/components/sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  Check,
  Copy,
  Download,
  MessageSquare,
  Printer,
  Share2,
  Smartphone,
  X,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};
const checkCanShare = () =>
  typeof navigator !== "undefined" && "share" in navigator;
const getClientCanShare = () => checkCanShare();
const getServerCanShare = () => false;

interface DashboardSharePopoverProps {
  activeTab?: string;
  buttonClassName?: string;
  className?: string;
  dateRange?: string;
}

export function DashboardSharePopover({
  activeTab = "Overview",
  dateRange = "month",
  className = "",
  buttonClassName = "",
}: DashboardSharePopoverProps) {
  const router = useRouter();
  const params = useParams();
  const tenantSlug = (params?.tenantSlug as string) || "";

  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const canShare = useSyncExternalStore(
    noopSubscribe,
    getClientCanShare,
    getServerCanShare
  );
  const getShareableUrl = () => {
    if (typeof window === "undefined") {
      return "";
    }
    const url = new URL(window.location.href);
    url.searchParams.set("tab", activeTab);
    url.searchParams.set("range", dateRange);
    return url.toString();
  };

  const handleCopyLink = () => {
    const url = getShareableUrl();
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Pano bağlantısı panoya kopyalandı! 📋", {
      description: `${activeTab} sekmesi ve ${dateRange} filtre parametresi dahil edildi.`,
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    const url = getShareableUrl();
    if (canShare && navigator.share) {
      try {
        await navigator.share({
          text: `${tenantSlug.toUpperCase()} CRM Pano Özeti ve Performans Durumu (${activeTab})`,
          title: `CRM Pano Özeti - ${tenantSlug.toUpperCase()}`,
          url,
        });
        setIsOpen(false);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const handleSendToChat = () => {
    setIsOpen(false);
    toast.success("Ekip sohbetine yönlendiriliyor...", {
      description: "Pano performans özeti mesaj kutunuza hazırlandı.",
    });
    router.push(`/${tenantSlug}/messages`);
  };

  const handlePrint = () => {
    setIsOpen(false);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleExportCsv = () => {
    const csvContent = [
      ["CRM Pano Ozeti", tenantSlug.toUpperCase()],
      ["Gorunum Sekmesi", activeTab],
      ["Tarih Araligi", dateRange],
      ["Olusturma Tarihi", new Date().toLocaleString("tr-TR")],
      [],
      ["Metrik", "Deger", "Degisim", "Durum"],
      ["Toplam Ciro", "248.500 TL", "+12.4%", "Hedefin Uzerinde"],
      ["Kazanilan Firsatlar", "18 Adet", "+8.2%", "Iyi"],
      ["Teklif Donusum Orani", "%64.2", "+3.1%", "Yuksek"],
      ["Aktif Musteriler", "142 Kurumsal", "+15 Yeni", "Artis Trendinde"],
      ["Bekleyen Destek Talepleri", "3 Adet", "-45%", "Cozuluyor"],
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([`\uFEFF${csvContent}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `CRM_Pano_Ozeti_${tenantSlug}_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("CSV Raporu İndirildi 📊", {
      description: "Pano metrikleri dosya olarak kaydedildi.",
    });
    setIsOpen(false);
  };

  return (
    <div className={`inline-block ${className}`}>
      <Popover onOpenChange={setIsOpen} open={isOpen}>
        <PopoverTrigger asChild>
          <button
            className={
              buttonClassName ||
              "flex h-9 w-9 items-center justify-center rounded-full border border-border text-zinc-600 shadow-2xs transition-all hover:bg-zinc-100 hover:text-zinc-900 active:scale-95 dark:border-border dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground"
            }
            title="Panoyu Paylaş ve Dışa Aktar"
            type="button"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </PopoverTrigger>

        {/* Share Popover Dropdown */}
        <PopoverContent
          align="end"
          className="w-[calc(100vw-1.5rem)] gap-0 overflow-hidden p-0 sm:w-88"
          collisionPadding={12}
          side="bottom"
          sideOffset={10}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-border border-b px-4 py-3 dark:border-border">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                <Share2 className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-bold text-zinc-900 text-xs dark:text-foreground">
                  Panoyu Paylaş
                </h3>
                <p className="text-3xs text-zinc-500 dark:text-muted-foreground">
                  Görünümü paylaş veya rapor olarak indir
                </p>
              </div>
            </div>
            <button
              aria-label="Kapat"
              className="rounded-lg p-1 text-muted-foreground hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-muted"
              onClick={() => setIsOpen(false)}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Quick URL Copy Bar */}
          <div className="border-border border-b bg-zinc-50/70 p-3 dark:border-border dark:bg-muted/30">
            <label className="mb-1.5 block font-semibold text-3xs text-zinc-500 dark:text-muted-foreground">
              Mevcut Görünüm Bağlantısı ({activeTab})
            </label>
            <div className="flex items-center gap-1.5">
              <input
                className="w-full truncate rounded-xl border border-border bg-card px-2.5 py-1.5 text-2xs text-zinc-600 focus:outline-none dark:border-border dark:bg-card dark:text-zinc-300"
                readOnly
                value={getShareableUrl()}
              />
              <button
                className={`flex h-8 shrink-0 items-center gap-1 rounded-xl px-3 font-semibold text-xs shadow-2xs transition-all ${
                  copied
                    ? "bg-emerald-600 text-white"
                    : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
                }`}
                onClick={handleCopyLink}
                type="button"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                <span>{copied ? "Kopyalandı" : "Kopyala"}</span>
              </button>
            </div>
          </div>

          {/* Action List */}
          <div className="space-y-1 p-2">
            {/* Native Mobile / Device Share */}
            {canShare && (
              <button
                className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left font-medium text-zinc-700 text-xs transition-colors hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-muted/50"
                onClick={handleNativeShare}
                type="button"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                  <Smartphone className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-zinc-900 dark:text-foreground">
                    Cihazla Paylaş
                  </div>
                  <div className="text-2xs text-zinc-500">
                    WhatsApp, e-posta veya diğer uygulamalarla
                  </div>
                </div>
              </button>
            )}

            {/* Broadcast to Team Chat */}
            <button
              className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left font-medium text-zinc-700 text-xs transition-colors hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-muted/50"
              onClick={handleSendToChat}
              type="button"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-zinc-900 dark:text-foreground">
                  Ekip Sohbetine Gönder
                </div>
                <div className="text-2xs text-zinc-500">
                  Özet kartı olarak canlı mesajlaşma kanalına ilet
                </div>
              </div>
            </button>

            {/* Print / PDF Export */}
            <button
              className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left font-medium text-zinc-700 text-xs transition-colors hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-muted/50"
              onClick={handlePrint}
              type="button"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                <Printer className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-zinc-900 dark:text-foreground">
                  PDF / Yazdır
                </div>
                <div className="text-2xs text-zinc-500">
                  Temiz sayfa düzeninde yazıcı veya PDF çıktısı al
                </div>
              </div>
            </button>

            {/* CSV Data Export */}
            <button
              className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left font-medium text-zinc-700 text-xs transition-colors hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-muted/50"
              onClick={handleExportCsv}
              type="button"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                <Download className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-zinc-900 dark:text-foreground">
                  CSV Olarak İndir
                </div>
                <div className="text-2xs text-zinc-500">
                  Mevcut sekmedeki KPI metriklerini Excel/CSV formatında indir
                </div>
              </div>
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
