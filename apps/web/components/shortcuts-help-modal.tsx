"use client";

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
        { keys: ["/"], label: "Arama Çubuğuna Odaklan" },
        { keys: ["?"], label: "Klavye Kısayolları Kılavuzu" },
        { keys: ["Esc"], label: "Açık Modalı / Menüyü Kapat" },
      ],
      title: "Genel Kısayollar",
    },
    {
      items: [
        { keys: ["G", "D"], label: "Dashboard / Ana Sayfa" },
        { keys: ["G", "M"], label: "Müşteriler" },
        { keys: ["G", "S"], label: "Siparişler" },
        { keys: ["G", "U"], label: "Ürün & Hizmetler" },
        { keys: ["G", "I"], label: "İzinler & Takvim" },
        { keys: ["G", "V"], label: "Vardiya & PDKS" },
        { keys: ["G", "B"], label: "Bordro & Maaşlar" },
        { keys: ["G", "O"], label: "Organizasyon" },
        { keys: ["G", "A"], label: "Ayarlar" },
      ],
      title: "Hızlı Sayfa Geçişleri (Sırasıyla)",
    },
    {
      items: [
        { keys: ["N", "M"], label: "Yeni Müşteri Ekle" },
        { keys: ["N", "S"], label: "Yeni Sipariş Oluştur" },
        { keys: ["N", "I"], label: "Yeni İzin Talebi" },
        { keys: ["N", "U"], label: "Yeni Ürün / Hizmet Ekle" },
      ],
      title: "Hızlı Eylemler (Sırasıyla)",
    },
  ];

  return (
    <div className="fade-in fixed inset-0 z-50 flex animate-in items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-xl flex-col rounded-3xl border border-slate-200/80 bg-white p-6 text-xs shadow-2xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between border-slate-100 border-b pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Keyboard className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Klavye Kısayolları Kılavuzu
              </h3>
              <p className="text-slate-500 text-xs">
                CRM içinde hızlı ve etkili gezinme için klavye komutları
              </p>
            </div>
          </div>
          <button
            className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-5 overflow-y-auto pr-1">
          {shortcutSections.map((section) => (
            <div className="space-y-2" key={section.title}>
              <div className="font-bold text-[10px] text-slate-400 uppercase tracking-wider">
                {section.title}
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {section.items.map((item, idx) => (
                  <div
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2"
                    key={idx}
                  >
                    <span className="font-medium text-slate-700 text-xs">
                      {item.label}
                    </span>
                    <div className="ml-2 flex shrink-0 items-center gap-1">
                      {item.keys.map((k, kIdx) => (
                        <kbd
                          className="flex h-5 min-w-[20px] items-center justify-center rounded-md border border-slate-200 bg-white px-1.5 font-bold font-mono text-[10px] text-slate-700 shadow-2xs"
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
        <div className="mt-4 flex items-center justify-between border-slate-100 border-t pt-4 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <HelpCircle className="h-3.5 w-3.5 text-blue-600" />
            <span>
              Herhangi bir ekranda <strong>?</strong> tuşuna basarak bu
              pencereyi açabilirsiniz.
            </span>
          </div>
          <button
            className="rounded-xl border border-slate-200 bg-white px-4 py-1.5 font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
