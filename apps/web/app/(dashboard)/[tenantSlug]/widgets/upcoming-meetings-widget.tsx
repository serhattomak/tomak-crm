"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { EmptyState } from "@workspace/ui/components/empty-state";
import { Input } from "@workspace/ui/components/input";
import { Skeleton } from "@workspace/ui/components/skeleton";
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
  const [newDate, setNewDate] = useState("Bugün");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`crm_meetings_${tenantSlug}`);
      if (saved) {
        setMeetings(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
    setIsLoaded(true);
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
        return <Video className="h-3 w-3 text-blue-500" />;
      case "phone":
        return <Phone className="h-3 w-3 text-emerald-500" />;
      case "in-person":
        return <MapPin className="h-3 w-3 text-amber-500" />;
    }
  };

  return (
    <Card className="flex h-full flex-col justify-between">
      <div>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="font-semibold text-sm tracking-tight">
                Görüşmeler & Randevular
              </CardTitle>
              <p className="text-2xs text-muted-foreground">
                Planlanan veya geçmiş müşteri görüşmeleri
              </p>
            </div>
          </div>

          <Button
            className="h-7 gap-1 px-2.5 text-2xs"
            onClick={() => setShowAddForm(!showAddForm)}
            size="sm"
            variant="outline"
          >
            <Plus className="h-3 w-3" />
            <span>Görüşme Ekle</span>
          </Button>
        </CardHeader>

        <CardContent>
          {/* Quick Add Meeting Form */}
          {showAddForm && (
            <form
              className="mb-3 space-y-2 rounded-lg border border-border/80 bg-muted/40 p-3"
              onSubmit={handleAddMeeting}
            >
              <Input
                className="h-8 bg-background text-xs"
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Görüşme konusu (Örn: Fiyat Teklifi Görüşmesi)..."
                required
                value={newTitle}
              />

              {/* Date selection pills */}
              <div className="flex items-center gap-1.5">
                {["Bugün", "Dün", "Yarın", "Geçen Hafta"].map((d) => (
                  <Button
                    className="h-6 px-2 text-3xs"
                    key={d}
                    onClick={() => setNewDate(d)}
                    type="button"
                    variant={newDate === d ? "default" : "outline"}
                  >
                    {d}
                  </Button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Input
                  className="h-8 bg-background text-xs"
                  onChange={(e) => setNewCustomer(e.target.value)}
                  placeholder="Müşteri / Kurum..."
                  value={newCustomer}
                />
                <Input
                  className="h-8 bg-background text-xs"
                  onChange={(e) => setNewTime(e.target.value)}
                  placeholder="Saat (Örn: 14:30)..."
                  value={newTime}
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  className="h-7 text-xs"
                  onClick={() => setShowAddForm(false)}
                  type="button"
                  variant="ghost"
                >
                  İptal
                </Button>
                <Button className="h-7 text-xs" size="sm" type="submit">
                  Kaydet
                </Button>
              </div>
            </form>
          )}

          {/* Meetings List */}
          {isLoaded ? (
            meetings.length === 0 ? (
              <EmptyState
                action={
                  <Button
                    onClick={() => setShowAddForm(true)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    İlk Görüşmeyi Kaydet
                  </Button>
                }
                description="Müşterilerinizle yapacağınız görüşmeleri buradan takip edebilirsiniz."
                icon={Calendar}
                title="Henüz kayıtlı görüşme yok"
              />
            ) : (
              <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
                {meetings.map((meeting) => (
                  <div
                    className="group rounded-lg border border-border/70 bg-card p-3 transition-all hover:border-border hover:bg-muted/40"
                    key={meeting.id}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Badge
                            className="gap-1 px-1.5 py-0 font-medium text-3xs"
                            variant="neutral"
                          >
                            {getTypeIcon(meeting.type)}
                            {meeting.date} {meeting.time}
                          </Badge>
                        </div>
                        <h4 className="font-semibold text-foreground text-xs transition-colors group-hover:text-primary">
                          {meeting.title}
                        </h4>
                        <p className="text-2xs text-muted-foreground">
                          {meeting.customer}
                        </p>
                      </div>

                      {meeting.link && (
                        <Button
                          asChild
                          className="h-6 shrink-0 gap-1 px-2 text-3xs"
                          size="sm"
                        >
                          <a
                            href={meeting.link}
                            rel="noreferrer"
                            target="_blank"
                          >
                            <span>Katıl</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="space-y-2 py-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          )}
        </CardContent>
      </div>

      {meetings.length > 0 && (
        <CardFooter className="justify-center border-border/80 border-t pt-2 pb-3">
          <span className="cursor-pointer font-semibold text-primary text-xs hover:underline">
            {meetings.length} Görüşme Kayıtlı
          </span>
        </CardFooter>
      )}
    </Card>
  );
}
