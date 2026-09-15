"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { HelpCircle, Keyboard, X } from "lucide-react";

interface ShortcutsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutsHelpModal({
  isOpen,
  onClose,
}: ShortcutsHelpModalProps) {
  if (!isOpen) {
    return null;
  }

  const shortcutSections = [
    {
      items: [
        { keys: ["⌘", "K"], label: "Komut Paleti / Hızlı Arama (veya Ctrl+K)" },
        { keys: ["/"], label: "Komut Paletini Aç" },
        { keys: ["?"], label: "Klavye Kısayolları Kılavuzu" },
        { keys: ["Esc"], label: "Açık Modalı / Menüyü Kapat" },
      ],
      title: "Genel Kısayollar",
    },
    {
      items: [
        { keys: ["G", "D"], label: "Dashboard / Ana Sayfa" },
        { keys: ["G", "P"], label: "Fırsatlar & Pipeline" },
        { keys: ["G", "Q"], label: "Teklifler" },
        { keys: ["G", "M"], label: "Müşteriler (veya G+C)" },
        { keys: ["G", "S"], label: "Siparişler (veya G+O)" },
        { keys: ["G", "U"], label: "Ürün & Hizmetler" },
        { keys: ["G", "I"], label: "İzinler & Takvim (veya G+L)" },
        { keys: ["G", "V"], label: "Vardiya & PDKS (veya G+T)" },
        { keys: ["G", "B"], label: "Bordro & Maaşlar" },
        { keys: ["G", "O"], label: "Organizasyon" },
        { keys: ["G", "A"], label: "Şirket Ayarları (veya G+S)" },
      ],
      title: "Hızlı Sayfa Geçişleri (Sırasıyla)",
    },
    {
      items: [
        { keys: ["N", "M"], label: "Yeni Müşteri Ekle (veya N+C)" },
        { keys: ["N", "D"], label: "Yeni Fırsat Başlat" },
        { keys: ["N", "Q"], label: "Yeni Teklif Hazırla" },
        { keys: ["N", "I"], label: "Yeni İzin Talebi (veya N+L)" },
        { keys: ["N", "U"], label: "Yeni Ürün / Hizmet Ekle" },
      ],
      title: "Hızlı Eylemler (Sırasıyla)",
    },
  ];

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
        className="flex max-h-[85vh] w-full flex-col gap-0 p-5 text-xs sm:max-w-xl"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between border-zinc-100 border-b pb-3.5 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400">
              <Keyboard className="h-4.5 w-4.5" />
            </div>
            <div>
              <DialogTitle className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                Klavye Kısayolları Kılavuzu
              </DialogTitle>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                CRM içinde hızlı ve etkili gezinme için klavye komutları
              </p>
            </div>
          </div>
          <DialogClose asChild>
            <button
              className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </DialogClose>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-4 overflow-y-auto pr-1">
          {shortcutSections.map((section) => (
            <div className="space-y-1.5" key={section.title}>
              <div className="font-bold text-[10px] text-zinc-400 uppercase tracking-wider dark:text-zinc-500">
                {section.title}
              </div>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {section.items.map((item, idx) => (
                  <div
                    className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50/70 px-3 py-2 dark:border-zinc-800/80 dark:bg-zinc-800/40"
                    key={idx}
                  >
                    <span className="font-medium text-xs text-zinc-700 dark:text-zinc-300">
                      {item.label}
                    </span>
                    <div className="ml-2 flex shrink-0 items-center gap-1">
                      {item.keys.map((k, kIdx) => (
                        <kbd
                          className="flex h-5 min-w-[20px] items-center justify-center rounded-md border border-zinc-200 bg-white px-1.5 font-bold font-mono text-[10px] text-zinc-700 shadow-2xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                          key={kIdx}
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between border-zinc-100 border-t pt-3 text-[11px] text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
          <div className="flex items-center gap-1.5">
            <HelpCircle className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
            <span>
              Herhangi bir ekranda <strong>?</strong> tuşuna basarak bu kılavuzu
              açabilirsiniz.
            </span>
          </div>
          <button
            className="rounded-xl border border-zinc-200 bg-white px-3.5 py-1.5 font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            onClick={onClose}
            type="button"
          >
            Kapat
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
