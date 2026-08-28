/* Hallmark · component: upcoming-meetings · genre: modern-minimal · theme: Adaptive Zinc/Violet */
"use client";

import {
  Calendar,
  ExternalLink,
  MapPin,
  Phone,
  Plus,
  Video,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { MeetingItem } from "./dashboard-types";

export function UpcomingMeetingsWidget() {
  const params = useParams();
  const tenantSlug = (params?.tenantSlug as string) || "workspace";
  const [meetings, setMeetings] = useState<MeetingItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`crm_meetings_${tenantSlug}`);
        if (saved) return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return [];
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCustomer, setNewCustomer] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newDate, setNewDate] = useState("Bugün");

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const saveMeetings = (items: MeetingItem[]) => {
    setMeetings(items);
    try {
      localStorage.setItem(`crm_meetings_${tenantSlug}`, JSON.stringify(items));
    } catch {
      // ignore
    }
  };

  const handleAddMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      return;
    }

    const item: MeetingItem = {
      attendees: ["Ben"],
      customer: newCustomer.trim() || "Müşteri / Ekip",
      date: newDate || "Bugün",
      id: `m-${Date.now()}`,
      time: newTime.trim() || "14:00 - 15:00",
      title: newTitle.trim(),
      type: "video",
    };

    saveMeetings([item, ...meetings]);
    setNewTitle("");
    setNewCustomer("");
    setNewTime("");
    setNewDate("Bugün");
    setShowAddForm(false);
  };

  const getTypeIcon = (type: MeetingItem["type"]) => {
    switch (type) {
      case "video":
        return <Video className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />;
      case "phone":
        return <Phone className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />;
      case "in-person":
        return <MapPin className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />;
    }
  };

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-2xs transition-all hover:border-zinc-300 dark:border-zinc-800/90 dark:bg-zinc-900/90 dark:hover:border-zinc-700">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400 shadow-2xs dark:bg-violet-950/60 dark:text-violet-400">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-zinc-900 text-sm dark:text-zinc-100">
                Görüşmeler & Randevular
              </span>
              <div className="font-medium text-[11px] text-zinc-500 dark:text-zinc-400">
                Planlanan veya geçmiş müşteri görüşmeleri
              </div>
            </div>
          </div>

          <button
            className="flex items-center gap-1 rounded-xl bg-violet-50 px-2.5 py-1 font-bold text-[11px] text-violet-700 transition hover:bg-violet-100 dark:bg-violet-950/60 dark:text-violet-300 dark:hover:bg-violet-900"
            onClick={() => setShowAddForm(!showAddForm)}
            type="button"
          >
            <Plus className="h-3 w-3" />
            <span>Görüşme Ekle</span>
          </button>
        </div>

        {/* Quick Add Meeting Form */}
        {showAddForm && (
          <form
            className="mb-3 space-y-2 rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-3 dark:border-zinc-800 dark:bg-zinc-800/50"
            onSubmit={handleAddMeeting}
          >
            <input
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Görüşme konusu (Örn: Fiyat Teklifi Görüşmesi)..."
              required
              value={newTitle}
            />

            {/* Date selection pills */}
            <div className="flex items-center gap-1.5">
              {["Bugün", "Dün", "Yarın", "Geçen Hafta"].map((d) => (
                <button
                  className={`rounded-lg px-2 py-0.5 font-semibold text-[10px] transition-colors ${
                    newDate === d
                      ? "bg-violet-600 text-white"
                      : "bg-white text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
                  }`}
                  key={d}
                  onClick={() => setNewDate(d)}
                  type="button"
                >
                  {d}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                onChange={(e) => setNewCustomer(e.target.value)}
                placeholder="Müşteri / Kurum..."
                value={newCustomer}
              />
              <input
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                onChange={(e) => setNewTime(e.target.value)}
                placeholder="Saat (Örn: 14:30)..."
                value={newTime}
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                className="rounded-lg px-2.5 py-1 font-semibold text-zinc-500 text-xs hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-700"
                onClick={() => setShowAddForm(false)}
                type="button"
              >
                İptal
              </button>
              <button
                className="rounded-lg bg-violet-600 px-3 py-1 font-bold text-white text-xs shadow-xs hover:bg-violet-700"
                type="submit"
              >
                Kaydet
              </button>
            </div>
          </form>
        )}

        {/* Meetings List */}
        {isLoaded ? (
          meetings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-7 text-center">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 shadow-2xs dark:bg-zinc-800 dark:text-zinc-500">
                <Calendar className="h-5 w-5" />
              </div>
              <h4 className="font-bold text-zinc-800 text-xs dark:text-zinc-200">
                Henüz kayıtlı görüşme yok
              </h4>
              <p className="mt-0.5 max-w-xs text-[11px] text-zinc-400 dark:text-zinc-500">
                Müşterilerinizle yapacağınız veya dün/önceki gün yaptığınız
                görüşmeleri buradan takip edebilirsiniz.
              </p>
              <button
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 py-1.5 font-bold text-white text-xs shadow-xs transition hover:bg-violet-700 active:scale-95"
                onClick={() => setShowAddForm(true)}
                type="button"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>İlk Görüşmeyi Kaydet</span>
              </button>
            </div>
          ) : (
            <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
              {meetings.map((meeting) => (
                <div
                  className="group rounded-xl border border-zinc-100 bg-zinc-50/50 dark:bg-zinc-800/40 p-3 transition-all hover:border-zinc-300 hover:bg-white hover:shadow-2xs dark:border-zinc-800/80 dark:bg-zinc-800/40 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/80"
                  key={meeting.id}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="flex items-center gap-1 rounded-md border border-zinc-200/60 bg-white px-1.5 py-0.5 font-bold text-[10px] text-zinc-700 shadow-2xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          {getTypeIcon(meeting.type)}
                          {meeting.date} {meeting.time}
                        </span>
                      </div>
                      <h4 className="font-bold text-zinc-900 text-xs transition-colors group-hover:text-violet-600 dark:text-zinc-100 dark:group-hover:text-violet-400">
                        {meeting.title}
                      </h4>
                      <p className="font-medium text-[11px] text-zinc-500 dark:text-zinc-400">
                        {meeting.customer}
                      </p>
                    </div>

                    {meeting.link && (
                      <a
                        className="flex shrink-0 items-center gap-1 rounded-lg bg-violet-600 px-2.5 py-1 font-bold text-[11px] text-white shadow-2xs transition-colors hover:bg-violet-700"
                        href={meeting.link}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <span>Katıl</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="space-y-2 py-3">
            {[1, 2].map((i) => (
              <div
                className="h-10 w-full animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800"
                key={i}
              />
            ))}
          </div>
        )}
      </div>

      {meetings.length > 0 && (
        <div className="mt-3 border-t border-zinc-100 pt-2.5 text-center dark:border-zinc-800/80">
          <span className="cursor-pointer font-bold text-violet-600 text-xs transition hover:text-violet-700 dark:text-violet-400">
            {meetings.length} Görüşme Kayıtlı
          </span>
        </div>
      )}
    </div>
  );
}
