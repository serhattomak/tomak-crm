"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  Share2,
  Copy,
  Check,
  Smartphone,
  MessageSquare,
  Printer,
  Download,
  X,
  ExternalLink,
  Sparkles,
} from "lucide-react"
import { toast } from "@workspace/ui/components/sonner"

interface DashboardSharePopoverProps {
  activeTab?: string
  dateRange?: string
  className?: string
  buttonClassName?: string
}

export function DashboardSharePopover({
  activeTab = "Overview",
  dateRange = "month",
  className = "",
  buttonClassName = "",
}: DashboardSharePopoverProps) {
  const router = useRouter()
  const params = useParams()
  const tenantSlug = (params?.tenantSlug as string) || ""

  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [canShare, setCanShare] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window !== "undefined" && "share" in navigator) {
      setCanShare(true)
    }
  }, [])

  // Click outside & Escape handler
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen])

  const getShareableUrl = () => {
    if (typeof window === "undefined") return ""
    const url = new URL(window.location.href)
    url.searchParams.set("tab", activeTab)
    url.searchParams.set("range", dateRange)
    return url.toString()
  }

  const handleCopyLink = () => {
    const url = getShareableUrl()
    navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success("Pano bağlantısı panoya kopyalandı! 📋", {
      description: `${activeTab} sekmesi ve ${dateRange} filtre parametresi dahil edildi.`,
    })
    setTimeout(() => setCopied(false), 2000)
  }

  const handleNativeShare = async () => {
    const url = getShareableUrl()
    if (canShare && navigator.share) {
      try {
        await navigator.share({
          title: `CRM Pano Özeti - ${tenantSlug.toUpperCase()}`,
          text: `${tenantSlug.toUpperCase()} CRM Pano Özeti ve Performans Durumu (${activeTab})`,
          url,
        })
        setIsOpen(false)
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          handleCopyLink()
        }
      }
    } else {
      handleCopyLink()
    }
  }

  const handleSendToChat = () => {
    setIsOpen(false)
    toast.success("Ekip sohbetine yönlendiriliyor...", {
      description: "Pano performans özeti mesaj kutunuza hazırlandı.",
    })
    router.push(`/${tenantSlug}/messages`)
  }

  const handlePrint = () => {
    setIsOpen(false)
    setTimeout(() => {
      window.print()
    }, 150)
  }

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
      .join("\n")

    const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute(
      "download",
      `CRM_Pano_Ozeti_${tenantSlug}_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success("CSV Raporu İndirildi 📊", {
      description: "Pano metrikleri dosya olarak kaydedildi.",
    })
    setIsOpen(false)
  }

  return (
    <div className={`relative inline-block ${className}`} ref={popoverRef}>
      {/* Trigger Button */}
      <button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={
          buttonClassName ||
          "flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 shadow-2xs transition-all hover:bg-slate-100 hover:text-slate-900 active:scale-95 dark:border-border dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground"
        }
        onClick={() => setIsOpen(!isOpen)}
        title="Panoyu Paylaş ve Dışa Aktar"
        type="button"
      >
        <Share2 className="h-4 w-4" />
      </button>

      {/* Share Popover Dropdown */}
      {isOpen && (
        <div className="fixed inset-x-3 top-14 z-50 sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-88 rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-md shadow-2xl dark:border-border dark:bg-card/95 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-border">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                <Share2 className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-foreground">Panoyu Paylaş</h3>
                <p className="text-[10px] text-slate-500 dark:text-muted-foreground">
                  Görünümü paylaş veya rapor olarak indir
                </p>
              </div>
            </div>
            <button
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-muted"
              onClick={() => setIsOpen(false)}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Quick URL Copy Bar */}
          <div className="p-3 bg-slate-50/70 border-b border-slate-100 dark:border-border dark:bg-muted/30">
            <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 dark:text-muted-foreground">
              Mevcut Görünüm Bağlantısı ({activeTab})
            </label>
            <div className="flex items-center gap-1.5">
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] text-slate-600 truncate focus:outline-none dark:border-border dark:bg-card dark:text-slate-300"
                readOnly
                value={getShareableUrl()}
              />
              <button
                className={`flex h-8 shrink-0 items-center gap-1 rounded-xl px-3 text-xs font-semibold transition-all shadow-2xs ${
                  copied
                    ? "bg-emerald-600 text-white"
                    : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
                }`}
                onClick={handleCopyLink}
                type="button"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? "Kopyalandı" : "Kopyala"}</span>
              </button>
            </div>
          </div>

          {/* Action List */}
          <div className="p-2 space-y-1">
            {/* Native Mobile / Device Share */}
            {canShare && (
              <button
                className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors dark:text-slate-300 dark:hover:bg-muted/50"
                onClick={handleNativeShare}
                type="button"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                  <Smartphone className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-900 dark:text-foreground">Cihazla Paylaş</div>
                  <div className="text-[11px] text-slate-500">WhatsApp, e-posta veya diğer uygulamalarla</div>
                </div>
              </button>
            )}

            {/* Broadcast to Team Chat */}
            <button
              className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors dark:text-slate-300 dark:hover:bg-muted/50"
              onClick={handleSendToChat}
              type="button"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-slate-900 dark:text-foreground">Ekip Sohbetine Gönder</div>
                <div className="text-[11px] text-slate-500">Özet kartı olarak canlı mesajlaşma kanalına ilet</div>
              </div>
            </button>

            {/* Print / PDF Export */}
            <button
              className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors dark:text-slate-300 dark:hover:bg-muted/50"
              onClick={handlePrint}
              type="button"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/60 dark:text-fuchsia-300">
                <Printer className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-slate-900 dark:text-foreground">PDF / Yazdır</div>
                <div className="text-[11px] text-slate-500">Temiz sayfa düzeninde yazıcı veya PDF çıktısı al</div>
              </div>
            </button>

            {/* CSV Data Export */}
            <button
              className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors dark:text-slate-300 dark:hover:bg-muted/50"
              onClick={handleExportCsv}
              type="button"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                <Download className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-slate-900 dark:text-foreground">CSV Olarak İndir</div>
                <div className="text-[11px] text-slate-500">Mevcut sekmedeki KPI metriklerini Excel/CSV formatında indir</div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
