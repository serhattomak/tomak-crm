"use client";

import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { DatePicker } from "@workspace/ui/components/date-picker";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { PageContainer } from "@workspace/ui/components/page-container";
import { TimePicker } from "@workspace/ui/components/time-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  CalendarDays,
  Calendar as CalendarIcon,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Download,
  Edit2,
  ExternalLink,
  Filter,
  Link as LinkIcon,
  MapPin,
  MoreVertical,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  User,
  Users,
  Video,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type ActivityDto,
  ApiClient,
  type CreateActivityPayload,
  type CustomerListDto,
  type EmployeeDto,
  type UpdateActivityPayload,
} from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";

type CalendarViewMode = "month" | "week" | "agenda";

interface ActivityTypeConfig {
  bg: string;
  border: string;
  icon: any;
  label: string;
  text: string;
}

const ACTIVITY_TYPE_CONFIG: Record<string, ActivityTypeConfig> = {
  Call: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-200 dark:border-emerald-800",
    icon: PhoneCall,
    label: "Arama / Çağrı",
    text: "text-emerald-700 dark:text-emerald-300",
  },
  Meeting: {
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "border-blue-200 dark:border-blue-800",
    icon: Video,
    label: "Randevu / Toplantı",
    text: "text-blue-700 dark:text-blue-300",
  },
  Task: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-200 dark:border-amber-800",
    icon: CheckCircle2,
    label: "Görev / Takip",
    text: "text-amber-700 dark:text-amber-300",
  },
  Visit: {
    bg: "bg-purple-50 dark:bg-purple-950/40",
    border: "border-purple-200 dark:border-purple-800",
    icon: MapPin,
    label: "Saha Ziyareti",
    text: "text-purple-700 dark:text-purple-300",
  },
};

const DEFAULT_CONFIG: ActivityTypeConfig = {
  bg: "bg-blue-50 dark:bg-blue-950/40",
  border: "border-blue-200 dark:border-blue-800",
  icon: Video,
  label: "Randevu / Toplantı",
  text: "text-blue-700 dark:text-blue-300",
};

const getActivityConfig = (type?: string): ActivityTypeConfig => {
  if (type && ACTIVITY_TYPE_CONFIG[type]) {
    return ACTIVITY_TYPE_CONFIG[type];
  }
  return DEFAULT_CONFIG;
};

const CALL_OUTCOMES = [
  { id: "Interested", label: "İlgileniyor / Süreç Devam Ediyor" },
  { id: "ProposalRequested", label: "Teklif İstendi" },
  { id: "LeftMessage", label: "Not Bırakıldı" },
  { id: "NoAnswer", label: "Açmadı / Cevapsız" },
  { id: "Busy", label: "Meşgul / Sonra Arayacak" },
  { id: "WrongNumber", label: "Yanlış / Ulaşılamayan Numara" },
  { id: "FollowUpNeeded", label: "Tekrar Aranacak" },
  { id: "Other", label: "Diğer Sonuç" },
];

export default function CalendarHubPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tenantSlug = (params?.tenantSlug as string) || "";
  const { activeTenant } = usePermissions();

  // State
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [activities, setActivities] = useState<ActivityDto[]>([]);
  const [customers, setCustomers] = useState<CustomerListDto[]>([]);
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals & Panels
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isCallLoggerOpen, setIsCallLoggerOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ActivityDto | null>(
    null
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Check URL query params for "?new=meeting" or "?new=call"
  useEffect(() => {
    const newParam = searchParams.get("new");
    if (newParam === "meeting") {
      setIsNewModalOpen(true);
    } else if (newParam === "call") {
      setIsCallLoggerOpen(true);
    }
  }, [searchParams]);

  // Form states for New / Edit Activity
  const [activityForm, setActivityForm] = useState<{
    id?: string;
    title: string;
    description: string;
    type: string;
    status: string;
    priority: string;
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    isAllDay: boolean;
    location: string;
    meetingLink: string;
    customerId: string;
    customerName: string;
    assignedUserId: string;
    assignedUserName: string;
    reminderMinutesBefore: number;
  }>({
    assignedUserId: "",
    assignedUserName: "",
    customerId: "",
    customerName: "",
    description: "",
    endDate: new Date().toISOString().split("T")[0] || "",
    endTime: "11:00",
    isAllDay: false,
    location: "",
    meetingLink: "",
    priority: "Medium",
    reminderMinutesBefore: 15,
    startDate: new Date().toISOString().split("T")[0] || "",
    startTime: "10:00",
    status: "Scheduled",
    title: "",
    type: "Meeting",
  });

  // Form states for Quick Call Logger
  const [callForm, setCallForm] = useState<{
    customerId: string;
    customerName: string;
    direction: "Outgoing" | "Incoming";
    outcome: string;
    durationMinutes: number;
    notes: string;
    scheduleFollowUp: boolean;
    followUpDate: string;
    followUpTime: string;
    followUpTitle: string;
  }>({
    customerId: "",
    customerName: "",
    direction: "Outgoing",
    durationMinutes: 5,
    followUpDate:
      new Date(Date.now() + 86_400_000).toISOString().split("T")[0] || "",
    followUpTime: "14:00",
    followUpTitle: "Takip Telefon Görüşmesi",
    notes: "",
    outcome: "Interested",
    scheduleFollowUp: false,
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch Activities
  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ApiClient.getActivities(
        {
          assignedUserId:
            selectedUserFilter === "all" ? undefined : selectedUserFilter,
          status: statusFilter,
          type: typeFilter,
        },
        activeTenant?.slug || tenantSlug
      );
      if (res.success && res.data) {
        setActivities(res.data);
      } else {
        setActivities([]);
      }
    } catch {
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [
    activeTenant?.slug,
    tenantSlug,
    selectedUserFilter,
    statusFilter,
    typeFilter,
  ]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Load auxiliary data
  useEffect(() => {
    const loadAuxData = async () => {
      const tId = activeTenant?.id || tenantSlug;
      if (!tId) {
        return;
      }
      try {
        const [cRes, eRes] = await Promise.all([
          ApiClient.getCustomers(tId, { pageSize: 100 }),
          ApiClient.getEmployees({ pageSize: 100 }, tId),
        ]);
        if (cRes.success && cRes.data?.items) {
          setCustomers(cRes.data.items);
        }
        if (eRes.success && eRes.data?.items) {
          setEmployees(eRes.data.items);
        }
      } catch {
        // silent fallback
      }
    };
    loadAuxData();
  }, [activeTenant?.id, tenantSlug]);

  // Date Navigations
  const handlePrev = () => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (viewMode === "month") {
        next.setMonth(next.getMonth() - 1);
      } else if (viewMode === "week") {
        next.setDate(next.getDate() - 7);
      } else {
        next.setDate(next.getDate() - 1);
      }
      return next;
    });
  };

  const handleNext = () => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (viewMode === "month") {
        next.setMonth(next.getMonth() + 1);
      } else if (viewMode === "week") {
        next.setDate(next.getDate() + 7);
      } else {
        next.setDate(next.getDate() + 1);
      }
      return next;
    });
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Month grid calculation
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysCount = lastDay.getDate();

    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) {
      startDayOfWeek = 6;
    }

    const days: Array<{
      date: Date;
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      const iso = d.toISOString().split("T")[0] || "";
      days.push({
        date: d,
        dateStr: iso,
        dayNumber: prevMonthLastDay - i,
        isCurrentMonth: false,
        isToday: false,
      });
    }

    const todayIso = new Date().toISOString().split("T")[0] || "";
    for (let d = 1; d <= daysCount; d++) {
      const dateObj = new Date(year, month, d);
      const mStr = month + 1 < 10 ? `0${month + 1}` : `${month + 1}`;
      const dStr = d < 10 ? `0${d}` : `${d}`;
      const iso = `${year}-${mStr}-${dStr}`;
      days.push({
        date: dateObj,
        dateStr: iso,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: iso === todayIso,
      });
    }

    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        const nextD = new Date(year, month + 1, d);
        const iso = nextD.toISOString().split("T")[0] || "";
        days.push({
          date: nextD,
          dateStr: iso,
          dayNumber: d,
          isCurrentMonth: false,
          isToday: false,
        });
      }
    }

    return days;
  }, [currentDate]);

  // Week days calculation
  const weekDays = useMemo(() => {
    const curr = new Date(currentDate);
    const day = curr.getDay();
    const diff = curr.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(curr.setDate(diff));

    const todayIso = new Date().toISOString().split("T")[0] || "";
    const days: Array<{
      date: Date;
      dateStr: string;
      dayNumber: number;
      dayName: string;
      isToday: boolean;
    }> = [];

    const dayNames = [
      "Pazartesi",
      "Salı",
      "Çarşamba",
      "Perşembe",
      "Cuma",
      "Cumartesi",
      "Pazar",
    ];

    for (let i = 0; i < 7; i++) {
      const nextDate = new Date(monday);
      nextDate.setDate(monday.getDate() + i);
      const iso = nextDate.toISOString().split("T")[0] || "";
      days.push({
        date: nextDate,
        dateStr: iso,
        dayName: dayNames[i] || "",
        dayNumber: nextDate.getDate(),
        isToday: iso === todayIso,
      });
    }
    return days;
  }, [currentDate]);

  // Filter activities
  const filteredActivities = useMemo(
    () =>
      activities.filter((act) => {
        if (typeFilter !== "All" && act.type !== typeFilter) {
          return false;
        }
        if (statusFilter !== "All" && act.status !== statusFilter) {
          return false;
        }
        if (
          selectedUserFilter !== "all" &&
          act.assignedUserId !== selectedUserFilter
        ) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matches =
            act.title.toLowerCase().includes(q) ||
            (act.customerName && act.customerName.toLowerCase().includes(q)) ||
            (act.description && act.description.toLowerCase().includes(q));
          if (!matches) {
            return false;
          }
        }
        return true;
      }),
    [activities, typeFilter, statusFilter, selectedUserFilter, searchQuery]
  );

  // Actions
  const handleCompleteActivity = async (act: ActivityDto) => {
    try {
      const res = await ApiClient.completeActivity(
        act.id,
        {
          callOutcome: act.callOutcome,
          outcomeNotes: "Takvim üzerinden tamamlandı olarak işaretlendi.",
        },
        activeTenant?.slug || tenantSlug
      );
      if (res.success) {
        showToast("Aktivite tamamlandı olarak işaretlendi!");
        fetchActivities();
        if (selectedActivity?.id === act.id) {
          setSelectedActivity({
            ...selectedActivity,
            completedAt: new Date().toISOString(),
            status: "Completed",
          });
        }
      }
    } catch {
      showToast("İşlem gerçekleştirilemedi.");
    }
  };

  const handleDeleteActivity = async (id: string) => {
    if (
      !confirm("Bu randevu veya aktiviteyi silmek istediğinize emin misiniz?")
    ) {
      return;
    }
    try {
      const res = await ApiClient.deleteActivity(
        id,
        activeTenant?.slug || tenantSlug
      );
      if (res.success) {
        showToast("Aktivite başarıyla silindi.");
        setSelectedActivity(null);
        fetchActivities();
      }
    } catch {
      showToast("Silme işlemi başarısız.");
    }
  };

  // Submit New / Edit Activity
  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityForm.title.trim()) {
      alert("Lütfen randevu başlığı giriniz.");
      return;
    }

    const startDateTime = activityForm.isAllDay
      ? `${activityForm.startDate}T00:00:00.000Z`
      : `${activityForm.startDate}T${activityForm.startTime}:00.000Z`;

    const endDateTime = activityForm.isAllDay
      ? `${activityForm.endDate || activityForm.startDate}T23:59:59.000Z`
      : `${activityForm.endDate || activityForm.startDate}T${
          activityForm.endTime
        }:00.000Z`;

    const payload: CreateActivityPayload = {
      assignedUserId: activityForm.assignedUserId || undefined,
      assignedUserName: activityForm.assignedUserName || undefined,
      customerId: activityForm.customerId || undefined,
      customerName: activityForm.customerName || undefined,
      description: activityForm.description || undefined,
      endTime: endDateTime,
      isAllDay: activityForm.isAllDay,
      location: activityForm.location || undefined,
      meetingLink: activityForm.meetingLink || undefined,
      priority: activityForm.priority,
      reminderMinutesBefore: activityForm.reminderMinutesBefore,
      startTime: startDateTime,
      status: activityForm.status,
      title: activityForm.title,
      type: activityForm.type,
    };

    try {
      if (activityForm.id) {
        const res = await ApiClient.updateActivity(
          activityForm.id,
          payload as UpdateActivityPayload,
          activeTenant?.slug || tenantSlug
        );
        if (res.success) {
          showToast("Randevu başarıyla güncellendi!");
          setIsNewModalOpen(false);
          fetchActivities();
        }
      } else {
        const res = await ApiClient.createActivity(
          payload,
          activeTenant?.slug || tenantSlug
        );
        if (res.success) {
          showToast("Yeni randevu başarıyla takvime eklendi!");
          setIsNewModalOpen(false);
          fetchActivities();
        }
      }
    } catch {
      showToast("Kayıt sırasında bir hata oluştu.");
    }
  };

  // Submit Call Log
  const handleSaveCallLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(callForm.customerId || callForm.customerName.trim())) {
      alert("Lütfen bir müşteri seçiniz veya müşteri adı giriniz.");
      return;
    }

    const nowIso = new Date().toISOString();
    const payload: CreateActivityPayload = {
      callDirection: callForm.direction,
      callDurationMinutes: callForm.durationMinutes,
      callOutcome: callForm.outcome,
      customerId: callForm.customerId || undefined,
      customerName: callForm.customerName,
      description: callForm.notes,
      outcomeNotes: callForm.notes,
      priority: "Medium",
      startTime: nowIso,
      status: "Completed",
      title: `${
        callForm.direction === "Outgoing" ? "Giden Arama" : "Gelen Arama"
      }: ${callForm.customerName}`,
      type: "Call",
    };

    try {
      const res = await ApiClient.createActivity(
        payload,
        activeTenant?.slug || tenantSlug
      );
      if (res.success) {
        if (callForm.scheduleFollowUp && callForm.followUpDate) {
          const followUpIso = `${callForm.followUpDate}T${callForm.followUpTime}:00.000Z`;
          await ApiClient.createActivity(
            {
              customerId: callForm.customerId || undefined,
              customerName: callForm.customerName,
              description: `Önceki arama notu: ${callForm.notes}`,
              priority: "High",
              startTime: followUpIso,
              status: "Scheduled",
              title: callForm.followUpTitle,
              type: "Call",
            },
            activeTenant?.slug || tenantSlug
          );
        }

        showToast("Çağrı ve görüşme notu başarıyla kaydedildi!");
        setIsCallLoggerOpen(false);
        fetchActivities();
      }
    } catch {
      showToast("Kayıt sırasında bir hata oluştu.");
    }
  };

  // External calendar links
  const getGoogleCalendarUrl = (act: ActivityDto) => {
    const title = encodeURIComponent(act.title);
    const details = encodeURIComponent(
      `${act.description || ""}\n\nMüşteri: ${act.customerName || "-"}\nLink: ${
        act.meetingLink || "-"
      }`
    );
    const location = encodeURIComponent(act.location || act.meetingLink || "");

    const startDate = act.startTime ? new Date(act.startTime) : new Date();
    const endDate = act.endTime
      ? new Date(act.endTime)
      : new Date(startDate.getTime() + 3_600_000);

    const startStr = startDate.toISOString().replace(/-|:|\.\d\d\d/g, "");
    const endStr = endDate.toISOString().replace(/-|:|\.\d\d\d/g, "");

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&details=${details}&location=${location}`;
  };

  const getOutlookCalendarUrl = (act: ActivityDto) => {
    const title = encodeURIComponent(act.title);
    const details = encodeURIComponent(
      `${act.description || ""}\n\nMüşteri: ${act.customerName || "-"}\nLink: ${
        act.meetingLink || "-"
      }`
    );
    const location = encodeURIComponent(act.location || act.meetingLink || "");
    const startDate = act.startTime ? new Date(act.startTime) : new Date();
    const endDate = act.endTime
      ? new Date(act.endTime)
      : new Date(startDate.getTime() + 3_600_000);

    return `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&body=${details}&startdt=${startDate.toISOString()}&enddt=${endDate.toISOString()}&location=${location}`;
  };

  const downloadIcsFile = (act: ActivityDto) => {
    const start = act.startTime ? new Date(act.startTime) : new Date();
    const end = act.endTime
      ? new Date(act.endTime)
      : new Date(start.getTime() + 3_600_000);

    const formatIcsDate = (d: Date) =>
      d.toISOString().replace(/-|:|\.\d\d\d/g, "");

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Antigravity CRM//Activities//TR",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${act.id}@crm`,
      `DTSTAMP:${formatIcsDate(new Date())}`,
      `DTSTART:${formatIcsDate(start)}`,
      `DTEND:${formatIcsDate(end)}`,
      `SUMMARY:${act.title}`,
      `DESCRIPTION:${act.description || ""}`,
      `LOCATION:${act.location || ""}`,
      act.meetingLink ? `URL:${act.meetingLink}` : "",
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR",
    ]
      .filter(Boolean)
      .join("\r\n");

    const blob = new Blob([icsContent], {
      type: "text/calendar;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${act.title.replace(/\s+/g, "_")}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(".ics takvim dosyası indirildi!");
  };

  const monthTitle = useMemo(
    () =>
      currentDate.toLocaleDateString("tr-TR", {
        month: "long",
        year: "numeric",
      }),
    [currentDate]
  );

  return (
    <PageContainer
      bleed
      className="flex min-h-[calc(100vh-4rem)] flex-col gap-6 bg-zinc-50/50 p-4 md:p-6 dark:bg-zinc-950/50"
    >
      {/* Toast */}
      {toastMessage && (
        <div className="fade-in slide-in-from-bottom-5 fixed right-6 bottom-6 z-50 flex animate-in items-center gap-2 rounded-xl bg-zinc-900 px-4 py-3 text-white shadow-2xl dark:bg-white dark:text-zinc-900">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 dark:text-emerald-600" />
          <span className="font-medium text-sm">{toastMessage}</span>
        </div>
      )}

      {/* Header Toolbar */}
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm md:p-5 xl:flex-row xl:items-center dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-violet-200 bg-violet-50 text-violet-600 shadow-sm dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-400">
            <CalendarDays className="h-6 w-6" />
          </div>
          <div>
            <h1 className="flex items-center gap-2 font-bold text-xl text-zinc-900 tracking-tight md:text-2xl dark:text-zinc-100">
              Takvim & Görüşmeler
              <span className="rounded-full bg-violet-100 px-2 py-0.5 font-semibold text-violet-700 text-xs dark:bg-violet-900/60 dark:text-violet-300">
                {activities.length} Aktivite
              </span>
            </h1>
            <p className="text-xs text-zinc-500 md:text-sm dark:text-zinc-400">
              Müşteri randevuları, satış aramaları, Google/Outlook
              senkronizasyonu
            </p>
          </div>
        </div>

        {/* Date Navigator Controls */}
        <div className="flex w-full flex-wrap items-center justify-between gap-2 xl:w-auto xl:justify-end">
          <div className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-700 dark:bg-zinc-800/80">
            <Button
              className="h-8 rounded-lg px-2.5 font-semibold text-xs"
              onClick={handleToday}
              size="sm"
              variant="ghost"
            >
              Bugün
            </Button>
            <div className="h-4 w-[1px] bg-zinc-300 dark:bg-zinc-700" />
            <Button
              className="h-8 w-8 rounded-lg p-0"
              onClick={handlePrev}
              size="sm"
              variant="ghost"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[130px] text-center font-bold text-sm text-zinc-800 capitalize dark:text-zinc-200">
              {monthTitle}
            </span>
            <Button
              className="h-8 w-8 rounded-lg p-0"
              onClick={handleNext}
              size="sm"
              variant="ghost"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center rounded-xl border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-700 dark:bg-zinc-800/80">
            <button
              className={`rounded-lg px-3 py-1 font-semibold text-xs transition-colors ${
                viewMode === "month"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
              onClick={() => setViewMode("month")}
              type="button"
            >
              Ay
            </button>
            <button
              className={`rounded-lg px-3 py-1 font-semibold text-xs transition-colors ${
                viewMode === "week"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
              onClick={() => setViewMode("week")}
              type="button"
            >
              Hafta
            </button>
            <button
              className={`rounded-lg px-3 py-1 font-semibold text-xs transition-colors ${
                viewMode === "agenda"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
              onClick={() => setViewMode("agenda")}
              type="button"
            >
              Ajanda
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              className="h-9 gap-1.5 border-zinc-300 font-medium text-xs dark:border-zinc-700"
              onClick={() => setIsSyncModalOpen(true)}
              size="sm"
              variant="outline"
            >
              <LinkIcon className="h-3.5 w-3.5 text-violet-600" />
              Senkronizasyon
            </Button>
            <Button
              className="h-9 gap-1.5 bg-emerald-600 font-medium text-white text-xs hover:bg-emerald-700"
              onClick={() => {
                setCallForm({
                  customerId: "",
                  customerName: "",
                  direction: "Outgoing",
                  durationMinutes: 5,
                  followUpDate:
                    new Date(Date.now() + 86_400_000)
                      .toISOString()
                      .split("T")[0] || "",
                  followUpTime: "14:00",
                  followUpTitle: "Takip Telefon Görüşmesi",
                  notes: "",
                  outcome: "Interested",
                  scheduleFollowUp: false,
                });
                setIsCallLoggerOpen(true);
              }}
              size="sm"
            >
              <PhoneCall className="h-3.5 w-3.5" />
              Çağrı Kaydet
            </Button>
            <Button
              className="h-9 gap-1.5 bg-zinc-900 font-medium text-white text-xs hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
              onClick={() => {
                setActivityForm({
                  assignedUserId: "",
                  assignedUserName: "",
                  customerId: "",
                  customerName: "",
                  description: "",
                  endDate: new Date().toISOString().split("T")[0] || "",
                  endTime: "11:00",
                  isAllDay: false,
                  location: "",
                  meetingLink: "",
                  priority: "Medium",
                  reminderMinutesBefore: 15,
                  startDate: new Date().toISOString().split("T")[0] || "",
                  startTime: "10:00",
                  status: "Scheduled",
                  title: "",
                  type: "Meeting",
                });
                setIsNewModalOpen(true);
              }}
              size="sm"
            >
              <Plus className="h-4 w-4" />
              Yeni Randevu
            </Button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-3 px-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-2 flex items-center gap-1.5 font-medium text-xs text-zinc-500">
            <Filter className="h-3.5 w-3.5" />
            Filtreler:
          </div>
          {["All", "Meeting", "Call", "Task", "Visit"].map((t) => (
            <button
              className={`rounded-lg px-2.5 py-1 font-medium text-xs transition-all ${
                typeFilter === t
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
              }`}
              key={t}
              onClick={() => setTypeFilter(t)}
              type="button"
            >
              {t === "All" ? "Tümü" : getActivityConfig(t).label}
            </button>
          ))}

          <div className="mx-1 h-4 w-[1px] bg-zinc-200 dark:bg-zinc-800" />

          {/* User selector */}
          <Select
            onValueChange={setSelectedUserFilter}
            value={selectedUserFilter}
          >
            <SelectTrigger className="h-8 w-[160px] border-zinc-200 text-xs dark:border-zinc-800">
              <SelectValue placeholder="Temsilci Filtresi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Ekip Takvimi</SelectItem>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.fullName || `${emp.firstName} ${emp.lastName}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-[220px]">
          <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
          <Input
            className="h-8 rounded-lg border-zinc-200 pl-8 text-xs dark:border-zinc-800"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Aktivite veya müşteri ara..."
            value={searchQuery}
          />
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center rounded-2xl border border-zinc-200 bg-white p-12 dark:border-zinc-800 dark:bg-zinc-900">
          <RefreshCw className="h-6 w-6 animate-spin text-violet-600" />
          <span className="ml-2 text-sm text-zinc-500">
            Takvim etkinlikleri yükleniyor...
          </span>
        </div>
      )}

      {/* VIEW 1: MONTH GRID VIEW */}
      {!loading && viewMode === "month" && (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="grid grid-cols-7 border-zinc-200 border-b bg-zinc-50/70 py-2.5 text-center font-bold text-xs text-zinc-600 uppercase tracking-wider dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-400">
            <span>Pzt</span>
            <span>Sal</span>
            <span>Çar</span>
            <span>Per</span>
            <span>Cum</span>
            <span className="text-zinc-400 dark:text-zinc-500">Cmt</span>
            <span className="text-zinc-400 dark:text-zinc-500">Paz</span>
          </div>

          <div className="grid auto-rows-[115px] grid-cols-7 divide-x divide-y divide-zinc-100 sm:auto-rows-[135px] dark:divide-zinc-800/80">
            {calendarDays.map((cell, idx) => {
              const dayActivities = filteredActivities.filter((a) => {
                const dateIso = (a.startTime || a.dueDate || a.createdAt).split(
                  "T"
                )[0];
                return dateIso === cell.dateStr;
              });

              return (
                <div
                  className={`group relative flex flex-col overflow-hidden p-1.5 transition-colors sm:p-2 ${
                    cell.isCurrentMonth
                      ? "bg-white hover:bg-zinc-50/80 dark:bg-zinc-900 dark:hover:bg-zinc-800/40"
                      : "bg-zinc-50/40 text-zinc-400 dark:bg-zinc-950/40"
                  }`}
                  key={cell.dateStr || idx}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full font-bold text-xs transition-colors ${
                        cell.isToday
                          ? "bg-violet-600 font-black text-white shadow-md"
                          : cell.isCurrentMonth
                            ? "text-zinc-800 dark:text-zinc-200"
                            : "text-zinc-400 dark:text-zinc-600"
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    <button
                      className="rounded p-0.5 text-zinc-500 opacity-0 transition-opacity hover:bg-zinc-200 hover:text-zinc-900 group-hover:opacity-100 dark:hover:bg-zinc-800 dark:hover:text-white"
                      onClick={() => {
                        setActivityForm({
                          assignedUserId: "",
                          assignedUserName: "",
                          customerId: "",
                          customerName: "",
                          description: "",
                          endDate: cell.dateStr,
                          endTime: "11:00",
                          isAllDay: false,
                          location: "",
                          meetingLink: "",
                          priority: "Medium",
                          reminderMinutesBefore: 15,
                          startDate: cell.dateStr,
                          startTime: "10:00",
                          status: "Scheduled",
                          title: "",
                          type: "Meeting",
                        });
                        setIsNewModalOpen(true);
                      }}
                      title="Bu güne yeni randevu ekle"
                      type="button"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="no-scrollbar flex max-h-[85px] flex-col gap-1 overflow-y-auto">
                    {dayActivities.slice(0, 3).map((act) => {
                      const cfg = getActivityConfig(act.type);
                      const Icon = cfg.icon;
                      const isDone = act.status === "Completed";

                      return (
                        <div
                          className={`flex cursor-pointer items-center gap-1 truncate rounded-md border px-1.5 py-0.5 text-[11px] transition-transform active:scale-95 ${
                            cfg.bg
                          } ${cfg.border} ${cfg.text} ${
                            isDone ? "line-through opacity-60" : ""
                          }`}
                          key={act.id}
                          onClick={() => setSelectedActivity(act)}
                          title={`${act.title} (${act.customerName || "-"})`}
                        >
                          <Icon className="h-3 w-3 shrink-0" />
                          <span className="truncate font-semibold">
                            {act.title}
                          </span>
                        </div>
                      );
                    })}

                    {dayActivities.length > 3 && (
                      <span className="pl-1 font-bold text-[10px] text-zinc-500 dark:text-zinc-400">
                        +{dayActivities.length - 3} daha fazla
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: WEEK VIEW */}
      {!loading && viewMode === "week" && (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="grid grid-cols-7 border-zinc-200 border-b bg-zinc-50/70 py-3 text-center dark:border-zinc-800 dark:bg-zinc-900/70">
            {weekDays.map((w) => (
              <div className="flex flex-col items-center" key={w.dateStr}>
                <span className="font-semibold text-xs text-zinc-500 uppercase tracking-wider">
                  {w.dayName}
                </span>
                <span
                  className={`mt-1 flex h-7 w-7 items-center justify-center rounded-full font-bold text-sm ${
                    w.isToday
                      ? "bg-violet-600 font-black text-white shadow-md"
                      : "text-zinc-800 dark:text-zinc-200"
                  }`}
                >
                  {w.dayNumber}
                </span>
              </div>
            ))}
          </div>

          <div className="grid min-h-[500px] grid-cols-7 divide-x divide-zinc-200 p-2 dark:divide-zinc-800">
            {weekDays.map((w) => {
              const dayActivities = filteredActivities.filter((a) => {
                const dateIso = (a.startTime || a.dueDate || a.createdAt).split(
                  "T"
                )[0];
                return dateIso === w.dateStr;
              });

              return (
                <div
                  className="flex min-h-[400px] flex-col gap-2 p-1.5"
                  key={w.dateStr}
                >
                  {dayActivities.map((act) => {
                    const cfg = getActivityConfig(act.type);
                    const Icon = cfg.icon;
                    const timeStr = act.startTime
                      ? new Date(act.startTime).toLocaleTimeString("tr-TR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Tüm Gün";

                    return (
                      <div
                        className={`flex cursor-pointer flex-col gap-1.5 rounded-xl border p-2.5 shadow-xs transition-all hover:shadow-md ${cfg.bg} ${cfg.border}`}
                        key={act.id}
                        onClick={() => setSelectedActivity(act)}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span
                            className={`flex items-center gap-1 font-semibold ${cfg.text}`}
                          >
                            <Icon className="h-3 w-3" />
                            {timeStr}
                          </span>
                          {act.status === "Completed" && (
                            <span className="rounded bg-emerald-100 px-1.5 py-0.2 font-bold text-[10px] text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                              Tamam
                            </span>
                          )}
                        </div>
                        <h4 className="line-clamp-2 font-bold text-xs text-zinc-900 dark:text-zinc-100">
                          {act.title}
                        </h4>
                        {act.customerName && (
                          <span className="flex items-center gap-1 truncate text-[11px] text-zinc-600 dark:text-zinc-400">
                            <User className="h-3 w-3 shrink-0" />
                            {act.customerName}
                          </span>
                        )}
                        {act.meetingLink && (
                          <span className="mt-0.5 flex items-center gap-1 font-semibold text-[10px] text-violet-600 dark:text-violet-400">
                            <Video className="h-3 w-3" />
                            Video Linki
                          </span>
                        )}
                      </div>
                    );
                  })}

                  {dayActivities.length === 0 && (
                    <div className="flex h-48 flex-col items-center justify-center text-zinc-300 dark:text-zinc-700">
                      <span className="text-xs">Kayıt yok</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 3: AGENDA LIST VIEW */}
      {!loading && viewMode === "agenda" && (
        <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm md:p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-zinc-200 border-b pb-3 dark:border-zinc-800">
            <h3 className="flex items-center gap-2 font-bold text-base text-zinc-900 dark:text-zinc-100">
              <Clock className="h-4 w-4 text-violet-600" />
              Aktivite ve Görüşme Ajandası
            </h3>
            <span className="text-xs text-zinc-500">
              Toplam {filteredActivities.length} kayıt listeleniyor
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {filteredActivities.map((act) => {
              const cfg = getActivityConfig(act.type);
              const Icon = cfg.icon;
              const dateFormatted = act.startTime
                ? new Date(act.startTime).toLocaleString("tr-TR", {
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    month: "long",
                  })
                : "Belirtilmedi";

              const isDone = act.status === "Completed";

              return (
                <div
                  className={`flex flex-col items-start justify-between gap-3 rounded-xl border p-3.5 transition-colors sm:flex-row sm:items-center ${
                    isDone
                      ? "border-zinc-200 bg-zinc-50/80 opacity-70 dark:border-zinc-800 dark:bg-zinc-900/40"
                      : "border-zinc-200 bg-white hover:border-violet-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-violet-700"
                  }`}
                  key={act.id}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${cfg.bg} ${cfg.border} ${cfg.text}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <h4
                          className={`font-bold text-sm ${
                            isDone
                              ? "text-zinc-500 line-through"
                              : "text-zinc-900 dark:text-zinc-100"
                          }`}
                        >
                          {act.title}
                        </h4>
                        <span
                          className={`rounded-full px-2 py-0.5 font-bold text-[10px] uppercase tracking-wider ${cfg.bg} ${cfg.text}`}
                        >
                          {cfg.label}
                        </span>
                        {act.priority === "Urgent" && (
                          <span className="rounded bg-red-100 px-1.5 py-0.5 font-bold text-[10px] text-red-700 dark:bg-red-950 dark:text-red-300">
                            Acil
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-zinc-400" />
                          {dateFormatted}
                        </span>
                        {act.customerName && (
                          <span className="flex items-center gap-1 font-medium text-zinc-700 dark:text-zinc-300">
                            <User className="h-3.5 w-3.5 text-zinc-400" />
                            {act.customerName}
                          </span>
                        )}
                        {act.assignedUserName && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5 text-zinc-400" />
                            {act.assignedUserName}
                          </span>
                        )}
                        {act.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                            {act.location}
                          </span>
                        )}
                      </div>

                      {act.outcomeNotes && (
                        <p className="mt-1.5 rounded-lg border border-zinc-100 bg-zinc-50 p-1.5 text-xs text-zinc-600 italic dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
                          Not: {act.outcomeNotes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex w-full items-center justify-end gap-1.5 border-zinc-100 border-t pt-2 sm:w-auto sm:border-t-0 sm:pt-0 dark:border-zinc-800">
                    {act.meetingLink && (
                      <a
                        className="flex h-8 items-center gap-1 rounded-lg bg-violet-50 px-2.5 font-semibold text-violet-700 text-xs hover:bg-violet-100 dark:bg-violet-950/60 dark:text-violet-300"
                        href={act.meetingLink}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <Video className="h-3.5 w-3.5" />
                        Toplantıya Katıl
                      </a>
                    )}

                    {!isDone && (
                      <Button
                        className="h-8 gap-1 px-2.5 text-emerald-700 text-xs hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                        onClick={() => handleCompleteActivity(act)}
                        size="sm"
                        variant="ghost"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Tamamla
                      </Button>
                    )}

                    <Button
                      className="h-8 w-8 rounded-lg p-0 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                      onClick={() => setSelectedActivity(act)}
                      size="sm"
                      variant="ghost"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {filteredActivities.length === 0 && (
              <div className="py-12 text-center text-zinc-400">
                <CalendarIcon className="mx-auto mb-2 h-10 w-10 opacity-40" />
                <p className="font-semibold text-sm">
                  Bu filtreye uygun aktivite bulunamadı.
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Yeni bir randevu veya çağrı kaydı eklemek için yukarıdaki
                  butonları kullanabilirsiniz.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: NEW / EDIT ACTIVITY */}
      {isNewModalOpen && (
        <Dialog
          onOpenChange={(open) => {
            if (!open) {
              setIsNewModalOpen(false);
            }
          }}
          open
        >
          <DialogContent
            aria-describedby={undefined}
            className="max-h-[90vh] w-full overflow-y-auto gap-0 p-5 md:p-6 sm:max-w-lg"
            showCloseButton={false}
          >
            <div className="mb-4 flex items-center justify-between border-zinc-200 border-b pb-3 dark:border-zinc-800">
              <DialogTitle className="flex items-center gap-2 font-bold text-lg text-zinc-900 dark:text-zinc-100">
                <CalendarDays className="h-5 w-5 text-violet-600" />
                {activityForm.id
                  ? "Randevuyu Düzenle"
                  : "Yeni Randevu & Toplantı"}
              </DialogTitle>
              <DialogClose asChild>
                <button
                  className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  type="button"
                >
                  <X className="h-5 w-5" />
                </button>
              </DialogClose>
            </div>

            <form className="flex flex-col gap-4" onSubmit={handleSaveActivity}>
              <div>
                <Label className="mb-1.5 block font-semibold text-xs">
                  Aktivite Türü
                </Label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: "Meeting", label: "Toplantı" },
                    { id: "Call", label: "Çağrı" },
                    { id: "Task", label: "Görev" },
                    { id: "Visit", label: "Ziyaret" },
                  ].map((t) => (
                    <button
                      className={`rounded-xl border px-2 py-2 text-center font-bold text-xs transition-all ${
                        activityForm.type === t.id
                          ? "border-violet-500 bg-violet-50 text-violet-700 dark:border-violet-500 dark:bg-violet-950/60 dark:text-violet-300"
                          : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800"
                      }`}
                      key={t.id}
                      onClick={() =>
                        setActivityForm({ ...activityForm, type: t.id })
                      }
                      type="button"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="mb-1.5 block font-semibold text-xs">
                  Başlık *
                </Label>
                <Input
                  onChange={(e) =>
                    setActivityForm({ ...activityForm, title: e.target.value })
                  }
                  placeholder="Örn: Müşteri Sunumu & Fiyat Teklifi Görüşmesi"
                  required
                  value={activityForm.title}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label className="mb-1.5 block font-semibold text-xs">
                    İlgili Müşteri
                  </Label>
                  <Select
                    onValueChange={(val) => {
                      const found = customers.find((c) => c.id === val);
                      setActivityForm({
                        ...activityForm,
                        customerId: val,
                        customerName: found ? found.name : "",
                      });
                    }}
                    value={activityForm.customerId}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Müşteri seçiniz" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="mb-1.5 block font-semibold text-xs">
                    Atanan Temsilci
                  </Label>
                  <Select
                    onValueChange={(val) => {
                      const found = employees.find((e) => e.id === val);
                      setActivityForm({
                        ...activityForm,
                        assignedUserId: val,
                        assignedUserName: found
                          ? found.fullName ||
                            `${found.firstName} ${found.lastName}`
                          : "",
                      });
                    }}
                    value={activityForm.assignedUserId}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Temsilci seçiniz" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.fullName || `${emp.firstName} ${emp.lastName}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Timing */}
              <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/50">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-zinc-700 dark:text-zinc-300">
                    Zaman Planı
                  </span>
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                    <Checkbox
                      checked={activityForm.isAllDay}
                      onCheckedChange={(c) =>
                        setActivityForm({
                          ...activityForm,
                          isAllDay: Boolean(c),
                        })
                      }
                    />
                    Tüm Gün
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="mb-1 block text-[11px] text-zinc-500">
                      Başlangıç Tarihi
                    </Label>
                    <DatePicker
                      className="text-xs"
                      onChange={(val) =>
                        setActivityForm({
                          ...activityForm,
                          startDate: val,
                        })
                      }
                      value={activityForm.startDate}
                    />
                  </div>
                  {!activityForm.isAllDay && (
                    <div>
                      <Label className="mb-1 block text-[11px] text-zinc-500">
                        Başlangıç Saati
                      </Label>
                      <TimePicker
                        className="text-xs"
                        onChange={(val) =>
                          setActivityForm({
                            ...activityForm,
                            startTime: val,
                          })
                        }
                        value={activityForm.startTime}
                      />
                    </div>
                  )}
                </div>

                {!activityForm.isAllDay && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="mb-1 block text-[11px] text-zinc-500">
                        Bitiş Tarihi
                      </Label>
                      <DatePicker
                        className="text-xs"
                        onChange={(val) =>
                          setActivityForm({
                            ...activityForm,
                            endDate: val,
                          })
                        }
                        value={activityForm.endDate}
                      />
                    </div>
                    <div>
                      <Label className="mb-1 block text-[11px] text-zinc-500">
                        Bitiş Saati
                      </Label>
                      <TimePicker
                        className="text-xs"
                        onChange={(val) =>
                          setActivityForm({
                            ...activityForm,
                            endTime: val,
                          })
                        }
                        value={activityForm.endTime}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Links */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label className="mb-1.5 block font-semibold text-xs">
                    Online Toplantı Linki (Google Meet / Zoom)
                  </Label>
                  <Input
                    className="text-xs"
                    onChange={(e) =>
                      setActivityForm({
                        ...activityForm,
                        meetingLink: e.target.value,
                      })
                    }
                    placeholder="https://meet.google.com/..."
                    value={activityForm.meetingLink}
                  />
                </div>

                <div>
                  <Label className="mb-1.5 block font-semibold text-xs">
                    Fiziksel Lokasyon / Oda
                  </Label>
                  <Input
                    className="text-xs"
                    onChange={(e) =>
                      setActivityForm({
                        ...activityForm,
                        location: e.target.value,
                      })
                    }
                    placeholder="Merkez Ofis Toplantı Odası 2"
                    value={activityForm.location}
                  />
                </div>
              </div>

              <div>
                <Label className="mb-1.5 block font-semibold text-xs">
                  Açıklama & Notlar
                </Label>
                <Textarea
                  className="resize-none text-xs"
                  onChange={(e) =>
                    setActivityForm({
                      ...activityForm,
                      description: e.target.value,
                    })
                  }
                  placeholder="Görüşülecek maddeler, katılımcı ajandası..."
                  rows={3}
                  value={activityForm.description}
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-zinc-200 border-t pt-3 dark:border-zinc-800">
                <Button
                  onClick={() => setIsNewModalOpen(false)}
                  type="button"
                  variant="outline"
                >
                  İptal
                </Button>
                <Button
                  className="bg-violet-600 text-white hover:bg-violet-700"
                  type="submit"
                >
                  {activityForm.id ? "Güncelle" : "Randevuyu Kaydet"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL 2: CALL LOGGER */}
      {isCallLoggerOpen && (
        <Dialog
          onOpenChange={(open) => {
            if (!open) {
              setIsCallLoggerOpen(false);
            }
          }}
          open
        >
          <DialogContent
            aria-describedby={undefined}
            className="max-h-[90vh] w-full overflow-y-auto gap-0 p-5 md:p-6 sm:max-w-lg"
            showCloseButton={false}
          >
            <div className="mb-4 flex items-center justify-between border-zinc-200 border-b pb-3 dark:border-zinc-800">
              <DialogTitle className="flex items-center gap-2 font-bold text-lg text-zinc-900 dark:text-zinc-100">
                <PhoneCall className="h-5 w-5 text-emerald-600" />
                Hızlı Satış Çağrı / Görüşme Kaydedici
              </DialogTitle>
              <DialogClose asChild>
                <button
                  className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  type="button"
                >
                  <X className="h-5 w-5" />
                </button>
              </DialogClose>
            </div>

            <form className="flex flex-col gap-4" onSubmit={handleSaveCallLog}>
              <div>
                <Label className="mb-1.5 block font-semibold text-xs">
                  Arama Yönü
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 font-bold text-xs transition-all ${
                      callForm.direction === "Outgoing"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-xs dark:border-emerald-500 dark:bg-emerald-950/60 dark:text-emerald-300"
                        : "border-zinc-200 text-zinc-600 dark:border-zinc-800 dark:text-zinc-400"
                    }`}
                    onClick={() =>
                      setCallForm({ ...callForm, direction: "Outgoing" })
                    }
                    type="button"
                  >
                    <PhoneOutgoing className="h-4 w-4 text-emerald-600" />
                    Giden Arama (Biz Aradık)
                  </button>
                  <button
                    className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 font-bold text-xs transition-all ${
                      callForm.direction === "Incoming"
                        ? "border-blue-500 bg-blue-50 text-blue-700 shadow-xs dark:border-blue-500 dark:bg-blue-950/60 dark:text-blue-300"
                        : "border-zinc-200 text-zinc-600 dark:border-zinc-800 dark:text-zinc-400"
                    }`}
                    onClick={() =>
                      setCallForm({ ...callForm, direction: "Incoming" })
                    }
                    type="button"
                  >
                    <PhoneIncoming className="h-4 w-4 text-blue-600" />
                    Gelen Arama (Müşteri Aradı)
                  </button>
                </div>
              </div>

              <div>
                <Label className="mb-1.5 block font-semibold text-xs">
                  Müşteri *
                </Label>
                <Select
                  onValueChange={(val) => {
                    const found = customers.find((c) => c.id === val);
                    setCallForm({
                      ...callForm,
                      customerId: val,
                      customerName: found ? found.name : "",
                    });
                  }}
                  value={callForm.customerId}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Görüşülen müşteriyi seçiniz" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label className="mb-1.5 block font-semibold text-xs">
                    Görüşme Sonucu
                  </Label>
                  <Select
                    onValueChange={(val) =>
                      setCallForm({ ...callForm, outcome: val })
                    }
                    value={callForm.outcome}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CALL_OUTCOMES.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="mb-1.5 block font-semibold text-xs">
                    Görüşme Süresi (Dakika)
                  </Label>
                  <Input
                    className="text-xs"
                    min={1}
                    onChange={(e) =>
                      setCallForm({
                        ...callForm,
                        durationMinutes: Number.parseInt(e.target.value) || 1,
                      })
                    }
                    type="number"
                    value={callForm.durationMinutes}
                  />
                </div>
              </div>

              <div>
                <Label className="mb-1.5 block font-semibold text-xs">
                  Görüşme Özeti & Satış Notları
                </Label>
                <Textarea
                  className="resize-none text-xs"
                  onChange={(e) =>
                    setCallForm({ ...callForm, notes: e.target.value })
                  }
                  placeholder="Müşteri ne talep etti? Hangi ürünlerle ilgileniyor? Karar verici kim?"
                  rows={3}
                  value={callForm.notes}
                />
              </div>

              <div className="flex flex-col gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-800/80 dark:bg-emerald-950/30">
                <label className="flex cursor-pointer items-center gap-2 font-bold text-emerald-900 text-xs dark:text-emerald-300">
                  <Checkbox
                    checked={callForm.scheduleFollowUp}
                    onCheckedChange={(c) =>
                      setCallForm({
                        ...callForm,
                        scheduleFollowUp: Boolean(c),
                      })
                    }
                  />
                  <span>Tek tıkla takip randevusu / hatırlatıcı oluştur</span>
                </label>

                {callForm.scheduleFollowUp && (
                  <div className="grid grid-cols-2 gap-2 border-emerald-200 border-t pt-2 dark:border-emerald-800">
                    <div>
                      <Label className="mb-1 block text-[11px] text-emerald-800 dark:text-emerald-400">
                        Takip Tarihi
                      </Label>
                      <DatePicker
                        className="bg-white text-xs dark:bg-zinc-900"
                        onChange={(val) =>
                          setCallForm({
                            ...callForm,
                            followUpDate: val,
                          })
                        }
                        value={callForm.followUpDate}
                      />
                    </div>
                    <div>
                      <Label className="mb-1 block text-[11px] text-emerald-800 dark:text-emerald-400">
                        Saat
                      </Label>
                      <TimePicker
                        className="bg-white text-xs dark:bg-zinc-900"
                        onChange={(val) =>
                          setCallForm({
                            ...callForm,
                            followUpTime: val,
                          })
                        }
                        value={callForm.followUpTime}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 border-zinc-200 border-t pt-3 dark:border-zinc-800">
                <Button
                  onClick={() => setIsCallLoggerOpen(false)}
                  type="button"
                  variant="outline"
                >
                  Vazgeç
                </Button>
                <Button
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                  type="submit"
                >
                  Çağrı Kaydını Tamamla
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* DRAWER / MODAL 3: ACTIVITY DETAILS */}
      {selectedActivity && (
        <Dialog
          onOpenChange={(open) => {
            if (!open) {
              setSelectedActivity(null);
            }
          }}
          open
        >
          <DialogContent
            aria-describedby={undefined}
            className="max-h-[90vh] w-full overflow-y-auto gap-0 p-5 md:p-6 sm:max-w-lg"
            showCloseButton={false}
          >
            <div className="mb-4 flex items-center justify-between border-zinc-200 border-b pb-3 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                {(() => {
                  const cfg = getActivityConfig(selectedActivity.type);
                  const Icon = cfg.icon;
                  return (
                    <span
                      className={`rounded-xl p-2 ${cfg.bg} ${cfg.border} ${cfg.text} border`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                  );
                })()}
                <div>
                  <DialogTitle className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                    {selectedActivity.title}
                  </DialogTitle>
                  <span className="text-xs text-zinc-500">
                    {selectedActivity.type} • {selectedActivity.status}
                  </span>
                </div>
              </div>
              <DialogClose asChild>
                <button
                  className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  type="button"
                >
                  <X className="h-5 w-5" />
                </button>
              </DialogClose>
            </div>

            <div className="flex flex-col gap-4 text-xs">
              <div className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/50">
                <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                  <Clock className="h-4 w-4 text-violet-600" />
                  <span className="font-semibold">
                    {selectedActivity.startTime
                      ? new Date(selectedActivity.startTime).toLocaleString(
                          "tr-TR",
                          {
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            month: "long",
                          }
                        )
                      : "Zaman belirtilmedi"}
                  </span>
                </div>
                {selectedActivity.status === "Completed" ? (
                  <span className="rounded bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Tamamlandı
                  </span>
                ) : (
                  <Button
                    className="h-7 bg-emerald-600 text-white text-xs hover:bg-emerald-700"
                    onClick={() => handleCompleteActivity(selectedActivity)}
                    size="sm"
                  >
                    Tamamla
                  </Button>
                )}
              </div>

              {selectedActivity.customerName && (
                <div className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50 p-2.5 dark:border-zinc-800 dark:bg-zinc-800/40">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-zinc-400" />
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">
                      {selectedActivity.customerName}
                    </span>
                  </div>
                  {selectedActivity.customerId && (
                    <Link
                      className="flex items-center gap-1 font-semibold text-violet-600 hover:underline dark:text-violet-400"
                      href={`/${tenantSlug}/customers/${selectedActivity.customerId}`}
                    >
                      Müşteriye Git
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              )}

              {selectedActivity.meetingLink && (
                <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/60 p-2.5 dark:border-blue-900 dark:bg-blue-950/40">
                  <div className="flex items-center gap-2 truncate font-semibold text-blue-900 dark:text-blue-300">
                    <Video className="h-4 w-4 shrink-0" />
                    <span className="truncate">
                      {selectedActivity.meetingLink}
                    </span>
                  </div>
                  <a
                    className="shrink-0 rounded-lg bg-blue-600 px-2.5 py-1 font-bold text-white text-xs hover:bg-blue-700"
                    href={selectedActivity.meetingLink}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Katıl
                  </a>
                </div>
              )}

              {selectedActivity.location && (
                <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                  <MapPin className="h-4 w-4 text-zinc-400" />
                  <span>{selectedActivity.location}</span>
                </div>
              )}

              {selectedActivity.description && (
                <div>
                  <span className="mb-1 block font-bold text-zinc-700 dark:text-zinc-300">
                    Açıklama:
                  </span>
                  <p className="whitespace-pre-wrap rounded-xl border border-zinc-100 bg-zinc-50 p-2.5 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-400">
                    {selectedActivity.description}
                  </p>
                </div>
              )}

              {/* External Sync Section */}
              <div className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700/80 dark:bg-zinc-800/60">
                <span className="flex items-center gap-1.5 font-bold text-zinc-800 dark:text-zinc-200">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  Dış Takvim Entegrasyonu
                </span>
                <p className="text-[11px] text-zinc-500">
                  Bu randevuyu tek tıkla kendi takviminize ekleyin veya indirin:
                </p>

                <div className="mt-1 grid grid-cols-3 gap-2">
                  <a
                    className="flex items-center justify-center gap-1 rounded-lg border border-zinc-200 bg-white p-2 text-center font-bold text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    href={getGoogleCalendarUrl(selectedActivity)}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Google
                  </a>
                  <a
                    className="flex items-center justify-center gap-1 rounded-lg border border-zinc-200 bg-white p-2 text-center font-bold text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    href={getOutlookCalendarUrl(selectedActivity)}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Outlook
                  </a>
                  <button
                    className="flex items-center justify-center gap-1 rounded-lg border border-zinc-200 bg-white p-2 text-center font-bold text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    onClick={() => downloadIcsFile(selectedActivity)}
                    type="button"
                  >
                    <Download className="h-3 w-3" />
                    .ICS İndir
                  </button>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="mt-2 flex items-center justify-between border-zinc-200 border-t pt-3 dark:border-zinc-800">
                <Button
                  className="text-red-600 text-xs hover:bg-red-50 dark:hover:bg-red-950/40"
                  onClick={() => handleDeleteActivity(selectedActivity.id)}
                  size="sm"
                  variant="ghost"
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  Sil
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    className="text-xs"
                    onClick={() => {
                      const act = selectedActivity;
                      const startIso = act.startTime || "";
                      const endIso = act.endTime || "";
                      setActivityForm({
                        assignedUserId: act.assignedUserId || "",
                        assignedUserName: act.assignedUserName || "",
                        customerId: act.customerId || "",
                        customerName: act.customerName || "",
                        description: act.description || "",
                        endDate: endIso.split("T")[0] || "",
                        endTime:
                          endIso.split("T")[1]?.substring(0, 5) || "11:00",
                        id: act.id,
                        isAllDay: act.isAllDay,
                        location: act.location || "",
                        meetingLink: act.meetingLink || "",
                        priority: act.priority,
                        reminderMinutesBefore: act.reminderMinutesBefore || 15,
                        startDate: startIso.split("T")[0] || "",
                        startTime:
                          startIso.split("T")[1]?.substring(0, 5) || "10:00",
                        status: act.status,
                        title: act.title,
                        type: act.type,
                      });
                      setSelectedActivity(null);
                      setIsNewModalOpen(true);
                    }}
                    size="sm"
                    variant="outline"
                  >
                    <Edit2 className="mr-1 h-3.5 w-3.5" />
                    Düzenle
                  </Button>
                  <Button
                    onClick={() => setSelectedActivity(null)}
                    size="sm"
                    variant="default"
                  >
                    Kapat
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL 4: CALENDAR SYNC HUB */}
      {isSyncModalOpen && (
        <Dialog
          onOpenChange={(open) => {
            if (!open) {
              setIsSyncModalOpen(false);
            }
          }}
          open
        >
          <DialogContent
            aria-describedby={undefined}
            className="max-h-[90vh] w-full overflow-y-auto gap-0 p-5 md:p-6 sm:max-w-md"
            showCloseButton={false}
          >
            <div className="mb-4 flex items-center justify-between border-zinc-200 border-b pb-3 dark:border-zinc-800">
              <DialogTitle className="flex items-center gap-2 font-bold text-base text-zinc-900 dark:text-zinc-100">
                <LinkIcon className="h-5 w-5 text-violet-600" />
                Dış Takvim Canlı Senkronizasyonu
              </DialogTitle>
              <DialogClose asChild>
                <button
                  className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  type="button"
                >
                  <X className="h-5 w-5" />
                </button>
              </DialogClose>
            </div>

            <div className="flex flex-col gap-4 text-xs">
              <p className="text-zinc-600 dark:text-zinc-400">
                CRM randevularınızı ve satış toplantılarınızı telefonunuzdaki
                veya bilgisayarınızdaki Google Calendar, Microsoft Outlook ya da
                Apple Takvim ile canlı olarak eşitleyin.
              </p>

              <div>
                <Label className="mb-1 block font-semibold text-xs">
                  Canlı iCal / Webcal Takvim Bağlantısı
                </Label>
                <div className="flex items-center gap-1.5">
                  <Input
                    className="select-all bg-zinc-50 font-mono text-xs dark:bg-zinc-800"
                    readOnly
                    value={`${
                      typeof window === "undefined"
                        ? ""
                        : window.location.origin
                    }/api/activities/calendar/feed.ics`}
                  />
                  <Button
                    className="shrink-0"
                    onClick={() => {
                      const url = `${window.location.origin}/api/activities/calendar/feed.ics`;
                      navigator.clipboard.writeText(url);
                      showToast("Takvim URL'si panoya kopyalandı!");
                    }}
                    size="sm"
                    variant="outline"
                  >
                    <Copy className="mr-1 h-3.5 w-3.5" />
                    Kopyala
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
                <span className="font-bold text-zinc-800 dark:text-zinc-200">
                  Nasıl Abone Olunur?
                </span>
                <ul className="list-disc space-y-1 pl-4 text-[11px] text-zinc-600 dark:text-zinc-400">
                  <li>
                    <strong>Google Calendar:</strong> Sol menüdeki "Diğer
                    takvimler +" düğmesine tıklayın, "URL'den ekle"yi seçip
                    yukarıdaki bağlantıyı yapıştırın.
                  </li>
                  <li>
                    <strong>Microsoft Outlook:</strong> "Takvim Ekle" &gt;
                    "Web'den abone ol" seçeneğine tıklayın.
                  </li>
                  <li>
                    <strong>Apple Mac / iPhone:</strong> Dosya &gt; Yeni Takvim
                    Aboneliği adımlarını takip edin.
                  </li>
                </ul>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => setIsSyncModalOpen(false)}
                  size="sm"
                  variant="default"
                >
                  Anladım, Tamam
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </PageContainer>
  );
}
