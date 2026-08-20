"use client";

import { Calendar, ExternalLink, MapPin, Phone, Video } from "lucide-react";
import type { MeetingItem } from "./dashboard-types";

export function UpcomingMeetingsWidget() {
  const meetings: MeetingItem[] = [
    {
      attendees: ["Ahmet Y.", "Selin K.", "Ali B."],
      customer: "Acme Holding - Satın Alma Direktörü",
      date: "Bugün",
      id: "m-1",
      link: "https://meet.google.com/abc-xyz",
      time: "14:00 - 15:00",
      title: "Yıllık Sözleşme & Fiyatlandırma Revizyonu",
      type: "video",
    },
    {
      attendees: ["Serhat Dev", "Mehmet D."],
      customer: "TechNova Yazılım - Baş Mühendis",
      date: "Bugün",
      id: "m-2",
      link: "https://zoom.us/j/12345",
      time: "16:30 - 17:15",
      title: "CRM Entegrasyonu Teknik Demo",
      type: "video",
    },
    {
      attendees: ["Canan Ö.", "Ahmet Y."],
      customer: "Vortex Lojistik - Maslak Ofis",
      date: "Yarın",
      id: "m-3",
      time: "11:00 - 12:30",
      title: "Yüz Yüze Strateji Toplantısı",
      type: "in-person",
    },
  ];

  const getTypeIcon = (type: MeetingItem["type"]) => {
    switch (type) {
      case "video":
        return <Video className="h-3.5 w-3.5 text-blue-600" />;
      case "phone":
        return <Phone className="h-3.5 w-3.5 text-emerald-600" />;
      case "in-person":
        return <MapPin className="h-3.5 w-3.5 text-amber-600" />;
    }
  };

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs transition-all hover:border-slate-300">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm">
                Yaklaşan Görüşmeler
              </span>
              <div className="text-[11px] text-slate-500">
                Bugün ve bu hafta planlanan toplantılar
              </div>
            </div>
          </div>

          <span className="rounded-xl bg-blue-50 px-2.5 py-1 font-semibold text-[11px] text-blue-700">
            {meetings.length} Toplantı
          </span>
        </div>

        {/* Meetings List */}
        <div className="space-y-3">
          {meetings.map((meeting) => (
            <div
              className="group rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 transition-all hover:border-slate-300 hover:bg-white hover:shadow-2xs"
              key={meeting.id}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 rounded border border-slate-200/60 bg-white px-1.5 py-0.5 font-bold text-[10px] text-slate-700 shadow-2xs">
                      {getTypeIcon(meeting.type)}
                      {meeting.date} {meeting.time}
                    </span>
                  </div>
                  <h4 className="font-semibold text-slate-900 text-xs transition-colors group-hover:text-blue-600">
                    {meeting.title}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {meeting.customer}
                  </p>
                </div>

                {meeting.link && (
                  <a
                    className="flex shrink-0 items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 font-semibold text-[11px] text-white shadow-2xs transition-colors hover:bg-blue-700"
                    href={meeting.link}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <span>Katıl</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              {/* Attendees avatars */}
              <div className="mt-3 flex items-center justify-between border-slate-200/40 border-t pt-2">
                <div className="flex items-center -space-x-1.5">
                  {meeting.attendees.map((name, i) => (
                    <div
                      className="flex h-5 w-5 items-center justify-center rounded-full border border-white bg-slate-800 font-semibold text-[9px] text-white"
                      key={i}
                      title={name}
                    >
                      {name.charAt(0)}
                    </div>
                  ))}
                  <span className="pl-3 text-[10px] text-slate-400">
                    {meeting.attendees.length} katılımcı
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 border-slate-100 border-t pt-3 text-center">
        <button
          className="font-semibold text-blue-600 text-xs hover:text-blue-700"
          type="button"
        >
          Takvim Görünümünü Aç →
        </button>
      </div>
    </div>
  );
}
