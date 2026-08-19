"use client";

import { Clock, DollarSign, FileText, PhoneCall, UserPlus } from "lucide-react";
import type { ActivityItem } from "./dashboard-types";

export function ActivityTimelineWidget() {
  const activities: ActivityItem[] = [
    {
      id: "act-1",
      user: { name: "Ahmet Yılmaz", initials: "AY" },
      action: "yeni bir teklif oluşturdu",
      target: "Acme Holding (₺125.000)",
      timestamp: "12 dk önce",
      type: "deal",
    },
    {
      id: "act-2",
      user: { name: "Selin Kaya", initials: "SK" },
      action: "telefon görüşmesi kaydetti",
      target: "TechNova CTO'su ile 24 dk",
      timestamp: "45 dk önce",
      type: "call",
    },
    {
      id: "act-3",
      user: { name: "Mehmet Demir", initials: "MD" },
      action: "anlaşmayı başarıyla kapattı",
      target: "Vortex Lojistik (₺94.500)",
      timestamp: "2 saat önce",
      type: "deal",
    },
    {
      id: "act-4",
      user: { name: "Sistem Botu", initials: "SB" },
      action: "web sitesinden yeni lead yakaladı",
      target: "Argeus Enerji A.Ş.",
      timestamp: "3 saat önce",
      type: "lead",
    },
    {
      id: "act-5",
      user: { name: "Canan Öz", initials: "CÖ" },
      action: "önemli bir toplantı notu ekledi",
      target: "MegaFinans Çözüm Analizi",
      timestamp: "5 saat önce",
      type: "task",
    },
  ];

  const getActionIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "deal":
        return <DollarSign className="h-3 w-3 text-emerald-600" />;
      case "call":
        return <PhoneCall className="h-3 w-3 text-blue-600" />;
      case "lead":
        return <UserPlus className="h-3 w-3 text-violet-600" />;
      case "task":
        return <FileText className="h-3 w-3 text-amber-600" />;
      default:
        return <Clock className="h-3 w-3 text-slate-600" />;
    }
  };

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs transition-all hover:border-slate-300">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm">Canlı Aktivite Akışı</span>
              <div className="text-[11px] text-slate-500">Ekip içi son işlemler ve loglar</div>
            </div>
          </div>

          <span className="flex h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
        </div>

        {/* Timeline List */}
        <div className="relative space-y-4 before:absolute before:top-2 before:bottom-2 before:left-3.5 before:w-0.5 before:bg-slate-100">
          {activities.map((act) => (
            <div className="relative flex items-start gap-3 text-xs" key={act.id}>
              {/* User / Action Avatar */}
              <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white bg-slate-900 font-bold text-[10px] text-white shadow-2xs">
                {act.user.initials}
              </div>

              <div className="flex-1 rounded-xl bg-slate-50/60 p-2.5 transition-colors hover:bg-slate-100/70">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    {getActionIcon(act.type)}
                    <span>{act.user.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">{act.timestamp}</span>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-600">
                  {act.action}: <strong className="text-slate-800">{act.target}</strong>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 border-slate-100 border-t pt-3 text-center">
        <button
          className="font-semibold text-amber-600 text-xs hover:text-amber-700"
          type="button"
        >
          Tüm Denetim Loglarını İncele →
        </button>
      </div>
    </div>
  );
}
