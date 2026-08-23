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
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCustomer, setNewCustomer] = useState("");
  const [newTime, setNewTime] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`crm_meetings_${tenantSlug}`);
      if (saved) {
        setMeetings(JSON.parse(saved));
      }
    } catch {
      // ignore
    } finally {
      setIsLoaded(true);
    }
  }, [tenantSlug]);

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
      date: "Bugün",
      id: `m-${Date.now()}`,
      time: newTime.trim() || "14:00 - 15:00",
      title: newTitle.trim(),
      type: "video",
    };

    saveMeetings([item, ...meetings]);
    setNewTitle("");
    setNewCustomer("");
    setNewTime("");
    setShowAddForm(false);
  };

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
    <div className="flex h-full flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs transition-all hover:border-slate-300">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-2xs">
              <Calendar className="h-4.5 w-4.5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm">
                Yaklaşan Görüşmeler
              </span>
              <div className="font-medium text-[11px] text-slate-500">
                Planlanan randevu ve müşteri toplantıları
              </div>
            </div>
          </div>

          <button
            className="flex items-center gap-1 rounded-2xl bg-blue-50 px-2.5 py-1 font-bold text-[11px] text-blue-700 transition hover:bg-blue-100"
            onClick={() => setShowAddForm(!showAddForm)}
            type="button"
          >
            <Plus className="h-3 w-3" />
            <span>Toplantı Ekle</span>
          </button>
        </div>

        {/* Quick Add Meeting Form */}
        {showAddForm && (
          <form
            className="mb-4 space-y-2 rounded-2xl border border-blue-100 bg-blue-50/40 p-3"
            onSubmit={handleAddMeeting}
          >
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Toplantı konusu (Örn: Demo Toplantısı)..."
              required
              value={newTitle}
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
                onChange={(e) => setNewCustomer(e.target.value)}
                placeholder="Müşteri / Kurum..."
                value={newCustomer}
              />
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
                onChange={(e) => setNewTime(e.target.value)}
                placeholder="Saat (Örn: 15:00)..."
                value={newTime}
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                className="rounded-xl px-3 py-1 font-semibold text-slate-500 text-xs hover:bg-white"
                onClick={() => setShowAddForm(false)}
                type="button"
              >
                İptal
              </button>
              <button
                className="rounded-xl bg-blue-600 px-3 py-1 font-bold text-white text-xs shadow-xs hover:bg-blue-700"
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
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-2.5 flex h-12 w-12 items-center justify-center rounded-3xl bg-slate-100 text-slate-400 shadow-2xs">
                <Calendar className="h-6 w-6" />
              </div>
              <h4 className="font-bold text-slate-800 text-xs">
                Henüz planlanan görüşme yok
              </h4>
              <p className="mt-0.5 max-w-xs text-[11px] text-slate-400">
                Müşterilerinizle yapacağınız video, telefon veya yüz yüze
                randevuları buradan takip edebilirsiniz.
              </p>
              <button
                className="mt-3 inline-flex items-center gap-1.5 rounded-2xl bg-blue-600 px-3.5 py-1.5 font-bold text-white text-xs shadow-xs transition hover:bg-blue-700"
                onClick={() => setShowAddForm(true)}
                type="button"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>İlk Toplantıyı Planla</span>
              </button>
            </div>
          ) : (
            <div className="max-h-64 space-y-2.5 overflow-y-auto pr-1">
              {meetings.map((meeting) => (
                <div
                  className="group rounded-2xl border border-slate-100 bg-slate-50/50 p-3.5 transition-all hover:border-slate-300 hover:bg-white hover:shadow-2xs"
                  key={meeting.id}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 rounded-md border border-slate-200/60 bg-white px-2 py-0.5 font-bold text-[10px] text-slate-700 shadow-2xs">
                          {getTypeIcon(meeting.type)}
                          {meeting.date} {meeting.time}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-xs transition-colors group-hover:text-blue-600">
                        {meeting.title}
                      </h4>
                      <p className="font-medium text-[11px] text-slate-500">
                        {meeting.customer}
                      </p>
                    </div>

                    {meeting.link && (
                      <a
                        className="flex shrink-0 items-center gap-1 rounded-xl bg-blue-600 px-2.5 py-1.5 font-bold text-[11px] text-white shadow-2xs transition-colors hover:bg-blue-700"
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
                className="h-12 w-full animate-pulse rounded-2xl bg-slate-50"
                key={i}
              />
            ))}
          </div>
        )}
      </div>

      {meetings.length > 0 && (
        <div className="mt-4 border-slate-100 border-t pt-3 text-center">
          <span className="cursor-pointer font-bold text-blue-600 text-xs transition hover:text-blue-700">
            {meetings.length} Toplantı Kayıtlı
          </span>
        </div>
      )}
    </div>
  );
}
