"use client";

import { PageContainer } from "@workspace/ui/components/page-container";
import { Button } from "@workspace/ui/components/button";
import { ConfirmDialog } from "@workspace/ui/components/confirm-dialog";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  DatePicker,
  DateRangePicker,
} from "@workspace/ui/components/date-picker";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { NumberInput } from "@workspace/ui/components/number-input";
import { SelectField } from "@workspace/ui/components/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { toast } from "@workspace/ui/components/sonner";
import { Textarea } from "@workspace/ui/components/textarea";
import { TimePicker } from "@workspace/ui/components/time-picker";
import {
  AlertCircle,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  Download,
  Filter,
  Layers,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Smartphone,
  Sun,
  Timer,
  UserCheck,
  Users,
  UserX,
  Wifi,
  X,
} from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ComplianceInlineCard } from "@/components/compliance-inline-card";
import { PermissionGate } from "@/components/permission-gate";
import {
  ApiClient,
  type AttendanceCorrectionRequestDto,
  type AttendanceRecordDto,
  type DepartmentDto,
  type EmployeeDto,
  type LiveMonitorResponse,
  type ShiftScheduleDto,
  type ShiftTemplateDto,
  type TodayStatusDto,
} from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";

const clampCount = (val: number, min: number, max: number): number => {
  if (Number.isNaN(val)) {
    return min;
  }
  return Math.min(max, Math.max(min, Math.round(val)));
};

export default function AttendancePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tenantSlug = (params?.tenantSlug as string) || "";
  const { activeTenant } = usePermissions();

  const [activeTab, setActiveTab] = useState<
    "monitor" | "shifts" | "records" | "corrections" | "devices"
  >("monitor");
  const [loading, setLoading] = useState(true);

  // Live Monitor Data
  const [liveData, setLiveData] = useState<LiveMonitorResponse | null>(null);
  const [todayStatus, setTodayStatus] = useState<TodayStatusDto | null>(null);

  // Shifts Data
  const [templates, setTemplates] = useState<ShiftTemplateDto[]>([]);
  const [schedules, setSchedules] = useState<ShiftScheduleDto[]>([]);
  const [scheduleWeekStart, setScheduleWeekStart] = useState<Date>(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  // Records & Corrections
  const [records, setRecords] = useState<AttendanceRecordDto[]>([]);
  const [corrections, setCorrections] = useState<
    AttendanceCorrectionRequestDto[]
  >([]);
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);

  // Filters
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [recordDateFrom, setRecordDateFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0] || "";
  });
  const [recordDateTo, setRecordDateTo] = useState<string>(
    () => new Date().toISOString().split("T")[0] || ""
  );

  // Modals
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form States - Shift Template
  const [templateForm, setTemplateForm] = useState<{
    breakDurationMinutes: number;
    breaks: { label: string; startTime: string; endTime: string }[];
    code: string;
    colorHex: string;
    endTime: string;
    gracePeriodMinutes: number;
    isFlexible: boolean;
    isNightShift: boolean;
    minWorkingHours: number;
    name: string;
    startTime: string;
  }>({
    breakDurationMinutes: 60,
    breaks: [],
    code: "",
    colorHex: "#3B82F6",
    endTime: "18:00:00",
    gracePeriodMinutes: 15,
    isFlexible: false,
    isNightShift: false,
    minWorkingHours: 8,
    name: "",
    startTime: "09:00:00",
  });

  // Form States - Shift Assign
  const [assignForm, setAssignForm] = useState({
    departmentId: "",
    employeeIds: [] as string[],
    endDate:
      new Date(Date.now() + 6 * 86_400_000).toISOString().split("T")[0] || "",
    notes: "",
    repeatOnDays: [1, 2, 3, 4, 5], // Mon-Fri
    shiftTemplateId: "",
    startDate: new Date().toISOString().split("T")[0] || "",
  });

  // Form States - Correction Request
  const [correctionForm, setCorrectionForm] = useState({
    date: new Date().toISOString().split("T")[0] || "",
    employeeId: "",
    reason: "",
    requestedClockInTime: "09:00",
    requestedClockOutTime: "18:00",
  });

  // Compliance Override States for Modals
  const [templateOverride, setTemplateOverride] = useState({
    allowed: false,
    reason: "",
  });
  const [assignOverride, setAssignOverride] = useState({
    allowed: false,
    reason: "",
  });
  const [correctionOverride, setCorrectionOverride] = useState({
    allowed: false,
    reason: "",
  });

  // Real-time Shift Template Compliance — derived from breaks array (multi-break)
  const templateCompliance = useMemo(() => {
    const toMinutes = (t: string): number => {
      const parts = (t || "00:00:00").split(":").map(Number);
      const h = parts[0] || 0;
      const m = parts[1] || 0;
      return h * 60 + m;
    };

    const startParts = (templateForm.startTime || "09:00:00")
      .split(":")
      .map(Number);
    const endParts = (templateForm.endTime || "18:00:00")
      .split(":")
      .map(Number);
    const startMins = (startParts[0] || 0) * 60 + (startParts[1] || 0);
    const endMins = (endParts[0] || 0) * 60 + (endParts[1] || 0);
    const startTsMins = startMins;
    const endTsMins = endMins;
    const isOvernight = endTsMins < startTsMins;

    let totalDurationMins = 0;
    if (endMins >= startMins) {
      totalDurationMins = endMins - startMins;
    } else {
      totalDurationMins = 24 * 60 - startMins + endMins;
    }

    const totalHours = totalDurationMins / 60;

    // Total break minutes: sum of break durations when breaks defined, else fallback to deprecated field
    let totalBreakMinutes = 0;
    if (templateForm.breaks.length > 0) {
      for (const b of templateForm.breaks) {
        const s = toMinutes(b.startTime);
        const e = toMinutes(b.endTime);
        let dur = 0;
        if (e > s) {
          dur = e - s;
        } else if (e < s) {
          dur = 24 * 60 - s + e;
        } else {
          dur = 0;
        }
        totalBreakMinutes += dur;
      }
    } else {
      totalBreakMinutes = Number(templateForm.breakDurationMinutes) || 0;
    }

    const breakMins = totalBreakMinutes;
    const netWorkHours = Math.max(0, (totalDurationMins - breakMins) / 60);
    const requiredBreak = totalHours <= 4 ? 15 : totalHours <= 7.5 ? 30 : 60;

    const startH = startParts[0] || 0;
    const endH = endParts[0] || 0;
    const isNightPeriod =
      templateForm.isNightShift ||
      startH >= 20 ||
      startH < 6 ||
      endH > 20 ||
      endH <= 6;

    const violations: any[] = [];
    let hasHardBlock = false;

    // 1. Md. 68 Mola — total
    if (breakMins < requiredBreak) {
      violations.push({
        details: `${totalHours.toFixed(1)} saatlik vardiya için yasal asgari mola süresi en az ${requiredBreak} dakikadır (Mevcut: ${breakMins} dk).`,
        enforcementLevel: "SoftWarning",
        lawReference: "4857 SK. Md. 68",
        penaltyRisk:
          "Dinlenme haklarının ihlali ve fazla çalışma ücreti riski.",
        ruleName: "Yasal Asgari Ara Dinlenme (Mola)",
      });
    }

    // 1b. Per-row end > start validation (SoftWarning)
    if (templateForm.breaks.length > 0) {
      for (const [idx, b] of templateForm.breaks.entries()) {
        const s = toMinutes(b.startTime);
        const e = toMinutes(b.endTime);
        // Break spanning midnight is not allowed for per-row check — require end > start
        if (e <= s) {
          const labelFallback = b.label || `Mola ${idx + 1}`;
          violations.push({
            details:
              `"` +
              labelFallback +
              `" için bitiş saati başlangıç saatinden sonra olmalıdır (` +
              (b.startTime || "--:--") +
              " → " +
              (b.endTime || "--:--") +
              ").",
            enforcementLevel: "SoftWarning",
            lawReference: "4857 SK. Md. 68 / Vardiya Yönetmeliği",
            penaltyRisk: "Geçersiz mola aralığı çalışma süresi hesabını bozar.",
            ruleName: `Mola #${idx + 1} Geçersiz Saat Aralığı`,
          });
        }
      }

      // Normalize breaks for overlap/range (mirrors backend NormalizeBreaks)
      const shiftStartMins = startTsMins;
      const shiftEndMins = isOvernight ? endTsMins + 1440 : endTsMins;
      type Norm = { start: number; end: number; idx: number };
      const normalized: Norm[] = templateForm.breaks.map((b, idx) => {
        const rawStart = toMinutes(b.startTime);
        let rawEnd = toMinutes(b.endTime);
        if (rawEnd <= rawStart) {
          rawEnd += 1440;
        }
        let normStart = rawStart;
        let normEnd = rawEnd;
        if (isOvernight && rawStart < shiftStartMins) {
          normStart += 1440;
          normEnd += 1440;
        }
        return { end: normEnd, idx, start: normStart };
      });

      // Overlap detection (sorted by start)
      const sorted = [...normalized].sort((a, b) => a.start - b.start);
      let hasOverlap = false;
      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const cur = sorted[i];
        if (prev && cur && cur.start < prev.end) {
          hasOverlap = true;
          break;
        }
      }
      if (hasOverlap) {
        violations.push({
          details:
            "Tanımlı mola periyotları birbiriyle çakışıyor; molalar çakışmamalı ve sıralı olmalıdır.",
          enforcementLevel: "SoftWarning",
          lawReference: "4857 SK. Md. 68 / Vardiya Yönetmeliği",
          penaltyRisk:
            "Çakışan mola planlaması fiili dinlenme süresini azaltabilir ve denetimde uygunsuzluk sayılabilir.",
          ruleName: "Mola Periyotları Çakışması",
        });
      }

      // Out-of-range: break outside shift window
      const outOfRange = normalized.filter(
        (n) => n.start < shiftStartMins || n.end > shiftEndMins
      );
      if (outOfRange.length > 0) {
        violations.push({
          details: `Molalar vardiya aralığı [${templateForm.startTime.slice(0, 5)} - ${templateForm.endTime.slice(0, 5)}] dışında olamaz (${outOfRange.length} mola aralık dışında).`,
          enforcementLevel: "SoftWarning",
          lawReference: "4857 SK. Md. 68 / Vardiya Yönetmeliği",
          penaltyRisk:
            "Vardiya dışına taşan mola planlaması çalışma süresi hesabını bozar.",
          ruleName: "Mola Vardiya Aralığı Dışında",
        });
      }
    }

    // 2. Md. 63 Günlük 11 Saat Sınırı
    if (netWorkHours > 11) {
      hasHardBlock = true;
      violations.push({
        details: `Günlük net çalışma süresi (${netWorkHours.toFixed(1)} saat), kanuni azami sınır olan 11 saati aşamaz.`,
        enforcementLevel: "HardBlock",
        lawReference: "4857 SK. Md. 63",
        penaltyRisk: "4857 SK. Md. 104 uyarınca 15.200 TL idari para cezası.",
        ruleName: "Günlük Azami Çalışma Süresi (11 Saat)",
      });
    }

    // 3. Md. 69 Gece 7.5 Saat Sınırı
    if (isNightPeriod && netWorkHours > 7.5) {
      hasHardBlock = true;
      violations.push({
        details: `Gece dönemine (20:00 - 06:00) rastlayan çalışmalarda net süre (${netWorkHours.toFixed(1)} saat) azami 7.5 saati aşamaz.`,
        enforcementLevel: "HardBlock",
        lawReference: "4857 SK. Md. 69",
        penaltyRisk: "4857 SK. Md. 104 uyarınca 18.500 TL idari para cezası.",
        ruleName: "Gece Çalışması Azami Süresi (7.5 Saat)",
      });
    }

    return {
      metrics: {
        netWorkHours,
        nightWorkHours: isNightPeriod ? netWorkHours : 0,
        providedBreakMinutes: breakMins,
        requiredBreakMinutes: requiredBreak,
        totalDurationHours: totalHours,
      },
      validationResult: {
        hasHardBlock,
        isCompliant: violations.length === 0,
        violations,
      },
    };
  }, [templateForm]);

  // Real-time Shift Assignment Compliance
  const assignCompliance = useMemo(() => {
    const selectedTemplate = templates.find(
      (t) => t.id === assignForm.shiftTemplateId
    );
    if (!selectedTemplate) {
      return null;
    }

    const startParts = selectedTemplate.startTime.split(":").map(Number);
    const endParts = selectedTemplate.endTime.split(":").map(Number);
    const startMins = (startParts[0] || 0) * 60 + (startParts[1] || 0);
    const endMins = (endParts[0] || 0) * 60 + (endParts[1] || 0);

    const durationMins =
      endMins >= startMins
        ? endMins - startMins
        : 24 * 60 - startMins + endMins;
    const netShiftHours = Math.max(
      0,
      (durationMins - (selectedTemplate.breakDurationMinutes || 0)) / 60
    );

    let dayCount = 5;
    if (assignForm.startDate && assignForm.endDate) {
      const s = new Date(assignForm.startDate);
      const e = new Date(assignForm.endDate);
      const diffTime = Math.abs(e.getTime() - s.getTime());
      dayCount = Math.max(
        1,
        Math.min(7, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1)
      );
    }

    const projectedWeeklyHours =
      netShiftHours * Math.min(dayCount, assignForm.repeatOnDays?.length || 5);
    const violations: any[] = [];
    const hasHardBlock = false;

    if (projectedWeeklyHours > 45) {
      violations.push({
        details: `Planlanan haftalık toplam süre (${projectedWeeklyHours.toFixed(1)} saat), yasal 45 saatlik haftalık tavanı aşıyor (${(projectedWeeklyHours - 45).toFixed(1)} saat fazla mesai).`,
        enforcementLevel: "SoftWarning",
        lawReference: "4857 SK. Md. 63",
        penaltyRisk:
          "Ödenmeyen fazla çalışma ücretlerinde idari para cezası ve faiz riski.",
        ruleName: "Haftalık Yasal Çalışma Süresi (45 Saat)",
      });
    }

    return {
      metrics: {
        netWorkHours: netShiftHours,
        projectedWeeklyHours,
      },
      validationResult: {
        hasHardBlock,
        isCompliant: violations.length === 0,
        violations,
      },
    };
  }, [assignForm, templates]);

  // Real-time Correction Request Compliance
  const correctionCompliance = useMemo(() => {
    if (
      !(
        correctionForm.requestedClockInTime &&
        correctionForm.requestedClockOutTime
      )
    ) {
      return null;
    }

    const startParts = correctionForm.requestedClockInTime
      .split(":")
      .map(Number);
    const endParts = correctionForm.requestedClockOutTime
      .split(":")
      .map(Number);
    const startMins = (startParts[0] || 0) * 60 + (startParts[1] || 0);
    const endMins = (endParts[0] || 0) * 60 + (endParts[1] || 0);

    const durationMins =
      endMins >= startMins
        ? endMins - startMins
        : 24 * 60 - startMins + endMins;
    const netHours = durationMins / 60;

    const violations: any[] = [];
    let hasHardBlock = false;

    if (netHours > 11) {
      hasHardBlock = true;
      violations.push({
        details: `Talep edilen düzeltme süresi (${netHours.toFixed(1)} saat), kanuni azami 11 saatlik günlük sınırı aşmaktadır.`,
        enforcementLevel: "HardBlock",
        lawReference: "4857 SK. Md. 63",
        penaltyRisk: "4857 SK. Md. 104 idari para cezası riski.",
        ruleName: "Günlük Azami Çalışma Süresi (11 Saat)",
      });
    }

    return {
      metrics: {
        netWorkHours: netHours,
      },
      validationResult: {
        hasHardBlock,
        isCompliant: violations.length === 0,
        violations,
      },
    };
  }, [correctionForm]);

  // Clock Widget Live Timer
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-open modals via searchParams
  useEffect(() => {
    const create = searchParams.get("create");
    if (create === "template") {
      setIsTemplateModalOpen(true);
    }
    if (create === "assign") {
      setIsAssignModalOpen(true);
    }
    if (create === "correction") {
      setIsCorrectionModalOpen(true);
    }
  }, [searchParams]);

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "destructive" | "warning" | "default";
    onConfirm: () => void | Promise<void>;
  }>({
    description: "",
    onConfirm: () => {},
    open: false,
    title: "",
  });

  // Load Base Data
  const loadData = useCallback(async () => {
    if (!activeTenant) {
      return;
    }
    setLoading(true);
    try {
      const weekEnd = new Date(scheduleWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const startDateStr = scheduleWeekStart.toISOString().split("T")[0] || "";
      const endDateStr = weekEnd.toISOString().split("T")[0] || "";

      const [liveRes, tplRes, calRes, recRes, empRes, deptRes] =
        await Promise.all([
          ApiClient.getLiveMonitor(activeTenant.id),
          ApiClient.getShiftTemplates(activeTenant.id),
          ApiClient.getShiftCalendar(
            { endDate: endDateStr, startDate: startDateStr },
            activeTenant.id
          ),
          ApiClient.getAttendanceRecords(
            {
              endDate: recordDateTo || undefined,
              startDate: recordDateFrom || undefined,
            },
            activeTenant.id
          ),
          ApiClient.getEmployees({ pageSize: 100 }, activeTenant.id),
          ApiClient.getDepartments(activeTenant.id),
        ]);

      if (liveRes.success && liveRes.data) {
        setLiveData(liveRes.data);
      }
      if (tplRes.success && tplRes.data) {
        setTemplates(tplRes.data);
      }
      if (calRes.success && calRes.data) {
        setSchedules(calRes.data);
      }
      if (recRes.success && recRes.data) {
        setRecords(recRes.data);
      }
      if (empRes.success && empRes.data?.items) {
        setEmployees(empRes.data.items);
        if (empRes.data.items.length > 0 && !todayStatus) {
          const firstEmp = empRes.data.items[0];
          if (firstEmp) {
            const statusRes = await ApiClient.getTodayStatus(
              firstEmp.id,
              activeTenant.id
            );
            if (statusRes.success && statusRes.data) {
              setTodayStatus(statusRes.data);
            }
          }
        }
      }
      if (deptRes.success && deptRes.data) {
        setDepartments(deptRes.data);
      }
    } catch {
      toast.error("Veriler yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, [
    activeTenant,
    scheduleWeekStart,
    recordDateFrom,
    recordDateTo,
    todayStatus,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Quick Clock Punch
  const handlePunch = async (
    punchType: "ClockIn" | "ClockOut" | "BreakStart" | "BreakEnd",
    breakType?: string
  ) => {
    if (!activeTenant || employees.length === 0) {
      return;
    }
    const currentEmp = employees[0];
    if (!currentEmp) {
      return;
    }

    setActionLoading(true);
    try {
      const res = await ApiClient.punchAttendance(
        {
          breakType,
          employeeId: currentEmp.id,
          employeeName: `${currentEmp.firstName} ${currentEmp.lastName}`.trim(),
          punchType,
          source: "Web",
        },
        activeTenant.id
      );
      if (res.success && res.data) {
        setTodayStatus(res.data);
        const messages: Record<string, string> = {
          BreakEnd: "Mola tamamlandı, çalışma devam ediyor.",
          BreakStart: "Mola başlatıldı.",
          ClockIn: "Giriş kaydı başarıyla alındı. İyi çalışmalar!",
          ClockOut: "Çıkış kaydı alındı. İyi dinlenmeler!",
        };
        toast.success(messages[punchType] || "İşlem kaydedildi.");
        loadData();
      } else {
        toast.error(res.message || "İşlem başarısız.");
      }
    } catch {
      toast.error("Okutma sırasında bir hata oluştu.");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Create Template — maps breaks[] to API (sort_order = index)
  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !(activeTenant && templateForm.name.trim() && templateForm.code.trim())
    ) {
      toast.error("Lütfen zorunlu alanları doldurunuz.");
      return;
    }
    // Per-row validation: end > start
    const invalidBreak = templateForm.breaks.find((b) => {
      const toMin = (t: string) => {
        const p = (t || "").split(":").map(Number);
        return (p[0] || 0) * 60 + (p[1] || 0);
      };
      return toMin(b.endTime) <= toMin(b.startTime);
    });
    if (invalidBreak) {
      toast.error(
        `"${invalidBreak.label || "Mola"}" için bitiş saati başlangıçtan sonra olmalıdır.`
      );
      return;
    }
    setActionLoading(true);
    try {
      const payload = {
        ...templateForm,
        // Keep breakDurationMinutes as deprecated fallback for backward compat
        breakDurationMinutes: templateForm.breakDurationMinutes,
        breaks: templateForm.breaks.map((b, idx) => ({
          endTime: b.endTime.length === 5 ? `${b.endTime}:00` : b.endTime,
          label: b.label.trim() || `Mola ${idx + 1}`,
          sortOrder: idx,
          startTime:
            b.startTime.length === 5 ? `${b.startTime}:00` : b.startTime,
        })),
      };
      const res = await ApiClient.createShiftTemplate(
        payload as unknown as Parameters<
          typeof ApiClient.createShiftTemplate
        >[0],
        activeTenant.id
      );
      if (res.success && res.data) {
        toast.success("Vardiya şablonu oluşturuldu.");
        setIsTemplateModalOpen(false);
        setTemplateForm({
          breakDurationMinutes: 60,
          breaks: [],
          code: "",
          colorHex: "#3B82F6",
          endTime: "18:00:00",
          gracePeriodMinutes: 15,
          isFlexible: false,
          isNightShift: false,
          minWorkingHours: 8,
          name: "",
          startTime: "09:00:00",
        });
        loadData();
      } else {
        toast.error(res.message || "Şablon oluşturulamadı.");
      }
    } catch {
      toast.error("Şablon oluşturulurken bir hata meydana geldi.");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Assign Shifts
  const handleAssignShifts = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !(activeTenant && assignForm.shiftTemplateId) ||
      (assignForm.employeeIds.length === 0 && !assignForm.departmentId)
    ) {
      toast.error(
        "Lütfen şablon ve en az bir çalışan ya da departman seçiniz."
      );
      return;
    }
    setActionLoading(true);
    try {
      const selectedEmps = assignForm.departmentId
        ? employees.filter(
            (emp) => emp.departmentId === assignForm.departmentId
          )
        : employees.filter((emp) => assignForm.employeeIds.includes(emp.id));

      const res = await ApiClient.assignShifts(
        {
          departmentId: assignForm.departmentId || undefined,
          departmentName: departments.find(
            (d) => d.id === assignForm.departmentId
          )?.name,
          employeeIds: selectedEmps.map((e) => e.id),
          employeeNames: selectedEmps.map((e) =>
            `${e.firstName} ${e.lastName}`.trim()
          ),
          endDate: assignForm.endDate,
          notes: assignForm.notes,
          repeatOnDays: assignForm.repeatOnDays,
          shiftTemplateId: assignForm.shiftTemplateId,
          startDate: assignForm.startDate,
        },
        activeTenant.id
      );
      if (res.success) {
        toast.success(
          `${res.data ?? selectedEmps.length} adet vardiya ataması kaydedildi.`
        );
        setIsAssignModalOpen(false);
        loadData();
      } else {
        toast.error(res.message || "Vardiya atanamadı.");
      }
    } catch {
      toast.error("Vardiya ataması sırasında hata meydana geldi.");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Submit Correction
  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !(
        activeTenant &&
        correctionForm.employeeId &&
        correctionForm.reason.trim()
      )
    ) {
      toast.error("Lütfen çalışan ve mazeret alanlarını doldurunuz.");
      return;
    }
    setActionLoading(true);
    try {
      const emp = employees.find((e) => e.id === correctionForm.employeeId);
      const clockIn = correctionForm.requestedClockInTime
        ? `${correctionForm.date}T${correctionForm.requestedClockInTime}:00Z`
        : undefined;
      const clockOut = correctionForm.requestedClockOutTime
        ? `${correctionForm.date}T${correctionForm.requestedClockOutTime}:00Z`
        : undefined;

      const res = await ApiClient.submitAttendanceCorrection(
        {
          date: correctionForm.date,
          employeeId: correctionForm.employeeId,
          employeeName: emp
            ? `${emp.firstName} ${emp.lastName}`.trim()
            : "Personel",
          reason: correctionForm.reason,
          requestedClockIn: clockIn,
          requestedClockOut: clockOut,
        },
        activeTenant.id
      );
      if (res.success && res.data) {
        toast.success("Düzeltme talebi yönetici onayına gönderildi.");
        setCorrections((prev) => [res.data!, ...prev]);
        setIsCorrectionModalOpen(false);
        setCorrectionForm({
          date: new Date().toISOString().split("T")[0] || "",
          employeeId: "",
          reason: "",
          requestedClockInTime: "09:00",
          requestedClockOutTime: "18:00",
        });
      } else {
        toast.error(res.message || "Talep gönderilemedi.");
      }
    } catch {
      toast.error("Talep iletilirken bir hata meydana geldi.");
    } finally {
      setActionLoading(false);
    }
  };

  // Format Helpers
  const formatMinutes = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h} sa ${m} dk`;
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) {
      return "--:--";
    }
    const d = new Date(dateStr);
    return d.toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Filtered Live Employees
  const filteredLiveEmployees = useMemo(() => {
    if (!liveData?.employees) {
      return [];
    }
    return liveData.employees.filter((emp) => {
      const matchesSearch =
        !search ||
        emp.employeeName.toLowerCase().includes(search.toLowerCase());
      const matchesDept =
        !departmentFilter ||
        departmentFilter === "all" ||
        emp.departmentName === departmentFilter;
      const matchesStatus =
        !statusFilter ||
        statusFilter === "all" ||
        (statusFilter === "Working" && emp.currentState === "Working") ||
        (statusFilter === "OnBreak" && emp.currentState === "OnBreak") ||
        (statusFilter === "Late" && emp.currentState === "Late") ||
        (statusFilter === "Absent" && emp.currentState === "Absent");
      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [liveData, search, departmentFilter, statusFilter]);

  // Weekdays for schedule
  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(scheduleWeekStart);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }, [scheduleWeekStart]);

  return (
    <PageContainer className="flex flex-col gap-6">
      {/* 1. Header & Live Clock Quick Bar */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-card p-6 shadow-xs lg:flex-row lg:items-center lg:justify-between dark:bg-card">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shadow-xs dark:bg-blue-950/60 dark:text-blue-400">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-bold text-2xl text-foreground tracking-tight">
              Vardiya & PDKS Takibi
            </h1>
            <p className="text-muted-foreground text-sm">
              Canlı personel devam takibi, vardiya çizelgeleri, mola ve fazla
              mesai yönetimi.
            </p>
          </div>
        </div>

        {/* Live Clock & Quick Action Widget */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-muted/40 p-3">
          <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-card px-3 py-1.5 font-semibold text-sm shadow-xs dark:bg-card">
            <Timer className="h-4 w-4 animate-pulse text-blue-600" />
            <span>
              {currentTime?.toLocaleTimeString("tr-TR") ?? "--:--:--"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {todayStatus?.isClockedIn ? (
              todayStatus.isOnBreak ? (
                <Button
                  className="bg-emerald-600 font-semibold text-white shadow-xs hover:bg-emerald-700"
                  disabled={actionLoading}
                  onClick={() => handlePunch("BreakEnd")}
                >
                  <Sun className="mr-2 h-4 w-4" />
                  Molayı Bitir
                </Button>
              ) : (
                <>
                  <Button
                    className="font-medium"
                    disabled={actionLoading}
                    onClick={() => handlePunch("BreakStart", "Lunch")}
                    variant="outline"
                  >
                    <Coffee className="mr-2 h-4 w-4 text-amber-500" />
                    Mola Ver
                  </Button>
                  <Button
                    className="bg-rose-600 font-semibold text-white shadow-xs hover:bg-rose-700"
                    disabled={actionLoading}
                    onClick={() => handlePunch("ClockOut")}
                  >
                    <UserX className="mr-2 h-4 w-4" />
                    Çıkış Yap
                  </Button>
                </>
              )
            ) : (
              <Button
                className="bg-blue-600 font-semibold text-white shadow-xs hover:bg-blue-700"
                disabled={actionLoading}
                onClick={() => handlePunch("ClockIn")}
              >
                <UserCheck className="mr-2 h-4 w-4" />
                Giriş Yap
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Main Tabbed Content */}
      <div className="w-full">
        <div className="flex flex-col gap-4 border-border border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1 rounded-xl bg-muted/60 p-1">
            <button
              className={`flex items-center rounded-lg px-3 py-1.5 font-semibold text-xs transition-colors ${ activeTab === "monitor" ? "bg-card text-foreground shadow-xs dark:bg-card" : "text-muted-foreground hover:text-foreground" }`}
              onClick={() => setActiveTab("monitor")}
            >
              <Users className="mr-1.5 h-3.5 w-3.5" />
              Canlı PDKS Monitörü
            </button>
            <button
              className={`flex items-center rounded-lg px-3 py-1.5 font-semibold text-xs transition-colors ${ activeTab === "shifts" ? "bg-card text-foreground shadow-xs dark:bg-card" : "text-muted-foreground hover:text-foreground" }`}
              onClick={() => setActiveTab("shifts")}
            >
              <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
              Vardiya Planlama
            </button>
            <button
              className={`flex items-center rounded-lg px-3 py-1.5 font-semibold text-xs transition-colors ${ activeTab === "records" ? "bg-card text-foreground shadow-xs dark:bg-card" : "text-muted-foreground hover:text-foreground" }`}
              onClick={() => setActiveTab("records")}
            >
              <Layers className="mr-1.5 h-3.5 w-3.5" />
              Devam & Giriş-Çıkış Kütüğü
            </button>
            <button
              className={`flex items-center rounded-lg px-3 py-1.5 font-semibold text-xs transition-colors ${ activeTab === "corrections" ? "bg-card text-foreground shadow-xs dark:bg-card" : "text-muted-foreground hover:text-foreground" }`}
              onClick={() => setActiveTab("corrections")}
            >
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
              Düzeltme Talepleri
            </button>
            <button
              className={`flex items-center rounded-lg px-3 py-1.5 font-semibold text-xs transition-colors ${ activeTab === "devices" ? "bg-card text-foreground shadow-xs dark:bg-card" : "text-muted-foreground hover:text-foreground" }`}
              onClick={() => setActiveTab("devices")}
            >
              <Settings className="mr-1.5 h-3.5 w-3.5" />
              PDKS Cihazları
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              disabled={loading}
              onClick={loadData}
              size="sm"
              variant="outline"
            >
              <RefreshCw
                className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Yenile
            </Button>
            {activeTab === "shifts" && (
              <PermissionGate permission="Attendance.Manage">
                <Button
                  className="bg-blue-600 font-semibold text-white shadow-xs hover:bg-blue-700"
                  onClick={() => setIsAssignModalOpen(true)}
                  size="sm"
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Vardiya Ata
                </Button>
              </PermissionGate>
            )}
            {activeTab === "records" && (
              <Button
                onClick={() => {
                  toast.success("Devam kütüğü CSV formatında indirildi.");
                }}
                size="sm"
                variant="outline"
              >
                <Download className="mr-1.5 h-4 w-4" />
                Dışa Aktar
              </Button>
            )}
          </div>
        </div>

        {/* TAB 1: Canlı PDKS Monitörü */}
        {activeTab === "monitor" && (
          <div className="mt-6 flex flex-col gap-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs dark:bg-card">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-muted-foreground text-xs">
                    Şu Anda Çalışan
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-950/50">
                    <UserCheck className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 font-bold text-2xl text-foreground">
                  {liveData?.currentlyWorking ?? 0}
                </div>
                <p className="mt-1 text-muted-foreground text-xs">
                  İş yerinde veya sahada aktif
                </p>
              </div>

              <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs dark:bg-card">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-muted-foreground text-xs">
                    Molada Olanlar
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:text-amber-400 dark:bg-amber-950/50">
                    <Coffee className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 font-bold text-2xl text-foreground">
                  {liveData?.currentlyOnBreak ?? 0}
                </div>
                <p className="mt-1 text-muted-foreground text-xs">
                  Yemek veya ara molasında
                </p>
              </div>

              <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs dark:bg-card">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-muted-foreground text-xs">
                    Geç Kalanlar
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:text-rose-400 dark:bg-rose-950/50">
                    <AlertCircle className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 font-bold text-2xl text-rose-600">
                  {liveData?.lateArrivals ?? 0}
                </div>
                <p className="mt-1 text-muted-foreground text-xs">
                  Tolerans süresini aşanlar
                </p>
              </div>

              <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs dark:bg-card">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-muted-foreground text-xs">
                    Beklenen / Gelmeyen
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:text-zinc-400 dark:bg-zinc-800">
                    <UserX className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 font-bold text-2xl text-foreground">
                  {liveData?.absentCount ?? 0}
                </div>
                <p className="mt-1 text-muted-foreground text-xs">
                  Vardiyası olup henüz basmayan
                </p>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs sm:flex-row dark:bg-card">
              <div className="w-full flex-1">
                <Input
                  leftIcon={<Search className="h-4 w-4" />}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSearch(e.target.value)
                  }
                  placeholder="Personel adı ile ara..."
                  type="text"
                  value={search}
                />
              </div>
              <div className="w-full sm:w-[200px]">
                <SelectField
                  onChange={setDepartmentFilter}
                  options={[
                    { label: "Tüm Departmanlar", value: "all" },
                    ...departments.map((d) => ({
                      label: d.name,
                      value: d.name,
                    })),
                  ]}
                  placeholder="Tüm Departmanlar"
                  value={departmentFilter}
                />
              </div>
              <div className="w-full sm:w-[180px]">
                <SelectField
                  onChange={setStatusFilter}
                  options={[
                    { label: "Tüm Durumlar", value: "all" },
                    { label: "Çalışıyor", value: "Working" },
                    { label: "Molada", value: "OnBreak" },
                    { label: "Geç Kaldı", value: "Late" },
                    { label: "Gelmeyen", value: "Absent" },
                  ]}
                  placeholder="Tüm Durumlar"
                  value={statusFilter}
                />
              </div>
            </div>

            {/* Live Table */}
            <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs dark:bg-card">
              <Table className="text-sm">
                <TableHeader className="border-border bg-muted/40 text-muted-foreground">
                  <TableRow>
                    <TableHead className="p-4 h-auto">Personel</TableHead>
                    <TableHead className="p-4 h-auto">Departman</TableHead>
                    <TableHead className="p-4 h-auto">Vardiya</TableHead>
                    <TableHead className="p-4 h-auto">İlk Giriş</TableHead>
                    <TableHead className="p-4 h-auto">Net Çalışma</TableHead>
                    <TableHead className="p-4 h-auto">Mola Süresi</TableHead>
                    <TableHead className="p-4 h-auto">Canlı Durum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border">
                  {filteredLiveEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell
                        className="py-12 text-center text-muted-foreground"
                        colSpan={7}
                      >
                        Kayıt bulunamadı.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLiveEmployees.map((emp) => (
                      <TableRow
                        className="transition-colors hover:bg-muted/30"
                        key={emp.employeeId}
                      >
                        <TableCell className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700 text-sm dark:bg-blue-900/40 dark:text-blue-300">
                              {emp.employeeName.charAt(0)}
                            </div>
                            <div>
                              <div className="font-semibold text-foreground">
                                {emp.employeeName}
                              </div>
                              <div className="text-muted-foreground text-xs">
                                ID: {emp.employeeId.slice(0, 8)}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="p-4 text-foreground text-sm">
                          {emp.departmentName || "Genel"}
                        </TableCell>
                        <TableCell className="p-4">
                          <span className="inline-flex rounded-full border border-border bg-muted px-2.5 py-0.5 font-medium text-xs">
                            {emp.shiftName || "Normal Vardiya"}
                          </span>
                        </TableCell>
                        <TableCell className="p-4 font-medium text-foreground text-sm">
                          {formatTime(emp.clockInTime)}
                        </TableCell>
                        <TableCell className="p-4 font-medium text-foreground text-sm">
                          {formatMinutes(emp.workedMinutesSoFar)}
                        </TableCell>
                        <TableCell className="p-4 text-muted-foreground text-sm">
                          {formatMinutes(emp.breakMinutesSoFar)}
                        </TableCell>
                        <TableCell className="p-4">
                          {emp.currentState === "Working" && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 text-xs dark:bg-emerald-950/60 dark:text-emerald-300">
                              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                              Çalışıyor
                            </span>
                          )}
                          {emp.currentState === "OnBreak" && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-700 text-xs dark:bg-amber-950/60 dark:text-amber-300">
                              <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                              Molada
                            </span>
                          )}
                          {emp.currentState === "Late" && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 font-semibold text-rose-700 text-xs dark:bg-rose-950/60 dark:text-rose-300">
                              <AlertCircle className="h-3.5 w-3.5" />
                              Geç Kaldı
                            </span>
                          )}
                          {emp.currentState === "Absent" && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 font-semibold text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                              <UserX className="h-3.5 w-3.5" />
                              Henüz Gelmedi
                            </span>
                          )}
                          {emp.currentState === "Completed" && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-blue-700 text-xs dark:bg-blue-950/60 dark:text-blue-300">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Tamamlandı
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* TAB 2: Vardiya Takvimi & Planlama */}
        {activeTab === "shifts" && (
          <div className="mt-6 flex flex-col gap-6">
            {/* Top Bar: Template Pills & Date Controls */}
            <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-xs md:flex-row md:items-center md:justify-between dark:bg-card">
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 font-semibold text-muted-foreground text-xs uppercase">
                  Şablonlar:
                </span>
                {templates.map((tpl) => (
                  <div
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1 font-medium text-xs"
                    key={tpl.id}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: tpl.colorHex }}
                    />
                    <span>{tpl.name}</span>
                    <span className="text-muted-foreground">
                      ({tpl.startTime.slice(0, 5)} - {tpl.endTime.slice(0, 5)})
                    </span>
                  </div>
                ))}
                <Button
                  className="h-7 font-medium text-xs"
                  onClick={() => setIsTemplateModalOpen(true)}
                  size="sm"
                  variant="outline"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Yeni Şablon
                </Button>
              </div>

              {/* Week Navigator */}
              <div className="flex items-center gap-2">
                <Button
                  className="h-8 w-8"
                  onClick={() => {
                    const d = new Date(scheduleWeekStart);
                    d.setDate(d.getDate() - 7);
                    setScheduleWeekStart(d);
                  }}
                  size="icon"
                  variant="outline"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="px-2 font-semibold text-sm">
                  {scheduleWeekStart.toLocaleDateString("tr-TR", {
                    day: "numeric",
                    month: "short",
                  })}{" "}
                  -{" "}
                  {new Date(
                    scheduleWeekStart.getTime() + 6 * 86_400_000
                  ).toLocaleDateString("tr-TR", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
                <Button
                  className="h-8 w-8"
                  onClick={() => {
                    const d = new Date(scheduleWeekStart);
                    d.setDate(d.getDate() + 7);
                    setScheduleWeekStart(d);
                  }}
                  size="icon"
                  variant="outline"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Weekly Interactive Grid */}
            <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs dark:bg-card">
              <div className="overflow-x-auto">
                <Table className="min-w-[800px] border-collapse text-sm">
                  <TableHeader>
                    <TableRow className="border-border bg-muted/40">
                      <TableHead className="w-48 border-border border-r p-3 text-left font-semibold h-auto">
                        Personel
                      </TableHead>
                      {weekDays.map((wd) => {
                        const isToday =
                          wd.toDateString() === new Date().toDateString();
                        return (
                          <TableHead
                            className={`border-border border-r p-3 text-center font-semibold ${ isToday ? "bg-blue-50/60 text-blue-600 dark:text-blue-400 dark:bg-blue-950/30" : "" }`}
                            key={wd.toISOString()}
                          >
                            <div>
                              {wd.toLocaleDateString("tr-TR", {
                                weekday: "short",
                              })}
                            </div>
                            <div className="font-normal text-muted-foreground text-xs">
                              {wd.getDate()}
                            </div>
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((emp) => (
                      <TableRow
                        className="border-border hover:bg-muted/20"
                        key={emp.id}
                      >
                        <TableCell className="border-border border-r p-3 font-medium text-foreground">
                          <div>
                            {emp.firstName} {emp.lastName}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {emp.departmentName || "Genel"}
                          </div>
                        </TableCell>
                        {weekDays.map((wd) => {
                          const dateStr = wd.toISOString().split("T")[0];
                          const sch = schedules.find(
                            (s) => s.employeeId === emp.id && s.date === dateStr
                          );
                          return (
                            <TableCell
                              className="border-border border-r p-2 text-center align-middle"
                              key={dateStr}
                            >
                              {sch ? (
                                <div
                                  className="rounded-lg p-1.5 font-semibold text-white text-xs shadow-xs"
                                  style={{
                                    backgroundColor:
                                      sch.shiftColorHex || "#3B82F6",
                                  }}
                                >
                                  <div>{sch.shiftName}</div>
                                  <div className="text-3xs opacity-90">
                                    {sch.startTime.slice(0, 5)} -{" "}
                                    {sch.endTime.slice(0, 5)}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground/50 text-xs">
                                  -
                                </span>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Devam & Giriş-Çıkış Kütüğü */}
        {activeTab === "records" && (
          <div className="mt-6 flex flex-col gap-6">
            {/* Filter Bar — kayıt aralığı tek DateRangePicker ile seçilir */}
            <div className="grid grid-cols-1 gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs sm:grid-cols-2 md:grid-cols-3 dark:bg-card">
              <div>
                <label className="mb-1 block font-semibold text-muted-foreground text-xs">
                  Tarih Aralığı
                </label>
                <DateRangePicker
                  endDate={recordDateTo}
                  onChange={(range) => {
                    setRecordDateFrom(range.startDate);
                    setRecordDateTo(range.endDate);
                  }}
                  startDate={recordDateFrom}
                />
              </div>
              <div>
                <label className="mb-1 block font-semibold text-muted-foreground text-xs">
                  Departman
                </label>
                <SelectField
                  onChange={setDepartmentFilter}
                  options={[
                    { label: "Tümü", value: "all" },
                    ...departments.map((d) => ({
                      label: d.name,
                      value: d.id,
                    })),
                  ]}
                  placeholder="Tümü"
                  value={departmentFilter}
                />
              </div>
              <div className="flex items-end">
                <Button
                  className="w-full bg-blue-600 font-semibold text-white hover:bg-blue-700"
                  onClick={loadData}
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Filtrele
                </Button>
              </div>
            </div>

            {/* Records Table */}
            <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs dark:bg-card">
              <Table className="text-sm">
                <TableHeader className="border-border bg-muted/40 text-muted-foreground">
                  <TableRow>
                    <TableHead className="p-4 h-auto">Tarih</TableHead>
                    <TableHead className="p-4 h-auto">Personel</TableHead>
                    <TableHead className="p-4 h-auto">Departman</TableHead>
                    <TableHead className="p-4 h-auto">İlk Giriş</TableHead>
                    <TableHead className="p-4 h-auto">Son Çıkış</TableHead>
                    <TableHead className="p-4 h-auto">Net Çalışma</TableHead>
                    <TableHead className="p-4 h-auto">Mola</TableHead>
                    <TableHead className="p-4 h-auto">Fazla Mesai</TableHead>
                    <TableHead className="p-4 h-auto">Durum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border">
                  {records.length === 0 ? (
                    <TableRow>
                      <TableCell
                        className="py-12 text-center text-muted-foreground"
                        colSpan={9}
                      >
                        Kayıt bulunamadı.
                      </TableCell>
                    </TableRow>
                  ) : (
                    records.map((r) => (
                      <TableRow className="hover:bg-muted/30" key={r.id}>
                        <TableCell className="p-4 font-medium text-foreground text-sm">
                          {r.date}
                        </TableCell>
                        <TableCell className="p-4 font-semibold text-foreground text-sm">
                          {r.employeeName}
                        </TableCell>
                        <TableCell className="p-4 text-muted-foreground text-sm">
                          {r.departmentName || "Genel"}
                        </TableCell>
                        <TableCell className="p-4 text-foreground text-sm">
                          {formatTime(r.firstClockIn)}
                        </TableCell>
                        <TableCell className="p-4 text-foreground text-sm">
                          {formatTime(r.lastClockOut)}
                        </TableCell>
                        <TableCell className="p-4 font-medium text-foreground text-sm">
                          {formatMinutes(r.totalWorkedMinutes)}
                        </TableCell>
                        <TableCell className="p-4 text-muted-foreground text-sm">
                          {formatMinutes(r.totalBreakMinutes)}
                        </TableCell>
                        <TableCell className="p-4">
                          {r.overtimeMinutes > 0 ? (
                            <span className="inline-flex rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 font-semibold text-blue-600 dark:text-blue-400 text-xs">
                              +{formatMinutes(r.overtimeMinutes)} (1.5x)
                            </span>
                          ) : r.holidayOvertimeMinutes > 0 ? (
                            <span className="inline-flex rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 font-semibold text-blue-600 dark:text-blue-400 text-xs">
                              +{formatMinutes(r.holidayOvertimeMinutes)} (2.0x)
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              -
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="p-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 font-semibold text-xs ${
                              r.status === "Present"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : r.status === "Late"
                                  ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                                  : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {r.status === "Present"
                              ? "Normal"
                              : r.status === "Late"
                                ? `Geç (${r.lateMinutes} dk)`
                                : r.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* TAB 4: Düzeltme Talepleri */}
        {activeTab === "corrections" && (
          <div className="mt-6 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-foreground text-lg">
                  PDKS Düzeltme & Unutma Talepleri
                </h3>
                <p className="text-muted-foreground text-sm">
                  Kartını unutan veya hatalı okutma yapan personellerin saat
                  onay akışı.
                </p>
              </div>
              <Button
                className="bg-blue-600 font-semibold text-white shadow-xs hover:bg-blue-700"
                onClick={() => setIsCorrectionModalOpen(true)}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Düzeltme Talep Et
              </Button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs dark:bg-card">
              <Table className="text-sm">
                <TableHeader className="border-border bg-muted/40 text-muted-foreground">
                  <TableRow>
                    <TableHead className="p-4 h-auto">Tarih</TableHead>
                    <TableHead className="p-4 h-auto">Personel</TableHead>
                    <TableHead className="p-4 h-auto">İstenen Giriş / Çıkış</TableHead>
                    <TableHead className="p-4 h-auto">Mazeret / Gerekçe</TableHead>
                    <TableHead className="p-4 h-auto">Durum</TableHead>
                    <TableHead className="p-4 text-right h-auto">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border">
                  {corrections.length === 0 ? (
                    <TableRow>
                      <TableCell
                        className="py-12 text-center text-muted-foreground"
                        colSpan={6}
                      >
                        Bekleyen düzeltme talebi bulunmuyor.
                      </TableCell>
                    </TableRow>
                  ) : (
                    corrections.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="p-4 font-medium text-foreground text-sm">
                          {c.date}
                        </TableCell>
                        <TableCell className="p-4 font-semibold text-foreground text-sm">
                          {c.employeeName}
                        </TableCell>
                        <TableCell className="p-4 text-foreground text-sm">
                          {formatTime(c.requestedClockIn)} -{" "}
                          {formatTime(c.requestedClockOut)}
                        </TableCell>
                        <TableCell className="max-w-xs truncate p-4 text-muted-foreground text-sm">
                          {c.reason}
                        </TableCell>
                        <TableCell className="p-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 font-semibold text-xs ${
                              c.status === "Approved"
                                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                                : c.status === "Rejected"
                                  ? "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300"
                                  : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300"
                            }`}
                          >
                            {c.status === "Approved"
                              ? "Onaylandı"
                              : c.status === "Rejected"
                                ? "Reddedildi"
                                : "Bekliyor"}
                          </span>
                        </TableCell>
                        <TableCell className="p-4 text-right">
                          {c.status === "Pending" && (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                className="border-emerald-300 dark:border-emerald-700 text-emerald-600 hover:bg-emerald-50"
                                onClick={async () => {
                                  if (!activeTenant) {
                                    return;
                                  }
                                  const res =
                                    await ApiClient.reviewAttendanceCorrection(
                                      c.id,
                                      { approve: true },
                                      activeTenant.id
                                    );
                                  if (res.success) {
                                    toast.success("Düzeltme talebi onaylandı.");
                                    loadData();
                                  }
                                }}
                                size="sm"
                                variant="outline"
                              >
                                Onayla
                              </Button>
                              <Button
                                className="border-rose-300 dark:border-rose-700 text-rose-600 hover:bg-rose-50"
                                onClick={async () => {
                                  if (!activeTenant) {
                                    return;
                                  }
                                  const res =
                                    await ApiClient.reviewAttendanceCorrection(
                                      c.id,
                                      {
                                        approve: false,
                                        rejectionReason:
                                          "Mazeret uygun görülmedi",
                                      },
                                      activeTenant.id
                                    );
                                  if (res.success) {
                                    toast.success("Talep reddedildi.");
                                    loadData();
                                  }
                                }}
                                size="sm"
                                variant="outline"
                              >
                                Reddet
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* TAB 5: PDKS Cihazları & Ayarlar */}
        {activeTab === "devices" && (
          <div className="mt-6 flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {/* Terminal Card 1 */}
              <div className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-card p-6 shadow-xs dark:bg-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                      <Wifi className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-bold text-base text-foreground">
                        Ana Turnike (RFID / Biyometrik)
                      </div>
                      <div className="text-muted-foreground text-xs">
                        ZKTeco BioStation 3 • IP: 192.168.1.120
                      </div>
                    </div>
                  </div>
                  <span className="inline-flex rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 font-semibold text-emerald-700 dark:text-emerald-300 text-xs">
                    Aktif / Bağlı
                  </span>
                </div>
                <div className="flex flex-col gap-2 border-border border-t pt-3 text-muted-foreground text-xs">
                  <div className="flex justify-between">
                    <span>Son Veri Akışı:</span>
                    <span className="font-semibold text-foreground">
                      Az önce
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Protokol:</span>
                    <span className="font-semibold text-foreground">
                      REST Webhook / Push
                    </span>
                  </div>
                </div>
              </div>

              {/* Terminal Card 2 */}
              <div className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-card p-6 shadow-xs dark:bg-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                      <Smartphone className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-bold text-base text-foreground">
                        Tablet Kiosk (Yüz Tanıma / QR)
                      </div>
                      <div className="text-muted-foreground text-xs">
                        Giriş Danışma Kiosk #1
                      </div>
                    </div>
                  </div>
                  <span className="inline-flex rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 font-semibold text-emerald-700 dark:text-emerald-300 text-xs">
                    Aktif / Bağlı
                  </span>
                </div>
                <div className="flex flex-col gap-2 border-border border-t pt-3 text-muted-foreground text-xs">
                  <div className="flex justify-between">
                    <span>Dinamik QR Yenileme:</span>
                    <span className="font-semibold text-foreground">
                      15 Saniyede Bir
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Konum:</span>
                    <span className="font-semibold text-foreground">
                      Merkez Ofis Resepsiyon
                    </span>
                  </div>
                </div>
              </div>

              {/* Geofencing Card */}
              <div className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-card p-6 shadow-xs dark:bg-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-bold text-base text-foreground">
                        Mobil GPS Geofencing
                      </div>
                      <div className="text-muted-foreground text-xs">
                        Mobil Giriş-Çıkış Sınırları
                      </div>
                    </div>
                  </div>
                  <span className="inline-flex rounded-full bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 font-semibold text-blue-700 dark:text-blue-300 text-xs">
                    50 Metre Yarıçap
                  </span>
                </div>
                <div className="flex flex-col gap-2 border-border border-t pt-3 text-muted-foreground text-xs">
                  <div className="flex justify-between">
                    <span>GPS Doğrulama:</span>
                    <span className="font-semibold text-emerald-600">
                      Zorunlu
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sahte GPS Tespiti:</span>
                    <span className="font-semibold text-foreground">Açık</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: Vardiya Şablonu Oluştur */}
      {isTemplateModalOpen && (
        <Dialog
          onOpenChange={(open) => {
            if (!open) {
              setIsTemplateModalOpen(false);
            }
          }}
          open
        >
          <DialogContent
            aria-describedby={undefined}
            className="flex max-h-[90vh] w-full flex-col gap-0 p-6 sm:max-w-lg"
            showCloseButton={false}
          >
            <div className="mb-4 flex items-center justify-between border-border border-b pb-4">
              <div>
                <DialogTitle className="font-bold text-foreground text-lg">
                  Yeni Vardiya Şablonu
                </DialogTitle>
                <p className="text-muted-foreground text-xs">
                  Vardiya saatlerini ve kurallarını belirleyin.
                </p>
              </div>
              <DialogClose asChild>
                <button
                  aria-label="Kapat"
                  className="rounded-full p-1 text-muted-foreground hover:bg-muted"
                  type="button"
                >
                  <X className="h-5 w-5" />
                </button>
              </DialogClose>
            </div>

            <form
              className="space-y-4 overflow-y-auto pr-1"
              onSubmit={handleCreateTemplate}
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-semibold text-foreground text-xs">
                    Vardiya Adı *
                  </label>
                  <Input
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setTemplateForm({ ...templateForm, name: e.target.value })
                    }
                    placeholder="Gündüz Vardiyası"
                    required
                    type="text"
                    value={templateForm.name}
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-foreground text-xs">
                    Vardiya Kodu *
                  </label>
                  <Input
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setTemplateForm({ ...templateForm, code: e.target.value })
                    }
                    placeholder="GUN-01"
                    required
                    type="text"
                    value={templateForm.code}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-semibold text-foreground text-xs">
                    Başlangıç Saati *
                  </label>
                  <TimePicker
                    onChange={(val) =>
                      setTemplateForm({
                        ...templateForm,
                        startTime: `${val}:00`,
                      })
                    }
                    value={templateForm.startTime.slice(0, 5)}
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-foreground text-xs">
                    Bitiş Saati *
                  </label>
                  <TimePicker
                    onChange={(val) =>
                      setTemplateForm({
                        ...templateForm,
                        endTime: `${val}:00`,
                      })
                    }
                    value={templateForm.endTime.slice(0, 5)}
                  />
                </div>
              </div>

              {/* Multi-break editor — replaces single breakDurationMinutes for new breaks; deprecated field kept readonly */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold text-foreground text-xs">
                    Molalar
                  </label>
                  <span className="text-3xs text-muted-foreground">
                    Toplam: {templateCompliance.metrics.providedBreakMinutes} dk
                    (Asgari: {templateCompliance.metrics.requiredBreakMinutes}{" "}
                    dk)
                  </span>
                </div>
                {templateForm.breaks.length === 0 ? (
                  <p className="rounded-xl border border-border border-dashed bg-muted/20 px-3 py-2 text-center text-muted-foreground text-xs">
                    Henüz mola eklenmedi. &quot;Mola Ekle&quot; ile birden fazla
                    mola tanımlayın (her mola başlangıç–bitiş saatleri ile).
                  </p>
                ) : (
                  <div className="space-y-2">
                    {templateForm.breaks.map((brk, idx) => (
                      <div
                        className="flex items-center gap-2 rounded-xl border border-border bg-muted/20 p-2"
                        key={idx}
                      >
                        <div className="flex-1">
                          <label
                            className="sr-only"
                            htmlFor={`break-label-${idx}`}
                          >
                            Mola {idx + 1} etiketi
                          </label>
                          <Input
                            id={`break-label-${idx}`}
                            onChange={(
                              e: React.ChangeEvent<HTMLInputElement>
                            ) => {
                              const next = [...templateForm.breaks];
                              const cur = next[idx];
                              if (!cur) {
                                return;
                              }
                              next[idx] = { ...cur, label: e.target.value };
                              setTemplateForm({
                                ...templateForm,
                                breaks: next,
                              });
                            }}
                            placeholder={`Mola ${idx + 1}`}
                            value={brk.label}
                          />
                        </div>
                        <div>
                          <label
                            className="sr-only"
                            htmlFor={`break-start-${idx}`}
                          >
                            Mola {idx + 1} başlangıç
                          </label>
                          <input
                            aria-label={`Mola ${idx + 1} başlangıç saati`}
                            className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                            id={`break-start-${idx}`}
                            onChange={(
                              e: React.ChangeEvent<HTMLInputElement>
                            ) => {
                              const next = [...templateForm.breaks];
                              const cur = next[idx];
                              if (!cur) {
                                return;
                              }
                              next[idx] = { ...cur, startTime: e.target.value };
                              setTemplateForm({
                                ...templateForm,
                                breaks: next,
                              });
                            }}
                            type="time"
                            value={brk.startTime.slice(0, 5)}
                          />
                        </div>
                        <div>
                          <label
                            className="sr-only"
                            htmlFor={`break-end-${idx}`}
                          >
                            Mola {idx + 1} bitiş
                          </label>
                          <input
                            aria-label={`Mola ${idx + 1} bitiş saati`}
                            className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                            id={`break-end-${idx}`}
                            onChange={(
                              e: React.ChangeEvent<HTMLInputElement>
                            ) => {
                              const next = [...templateForm.breaks];
                              const cur = next[idx];
                              if (!cur) {
                                return;
                              }
                              next[idx] = { ...cur, endTime: e.target.value };
                              setTemplateForm({
                                ...templateForm,
                                breaks: next,
                              });
                            }}
                            type="time"
                            value={brk.endTime.slice(0, 5)}
                          />
                        </div>
                        <button
                          aria-label={`Mola ${idx + 1} kaldır`}
                          className="rounded-full p-1.5 text-muted-foreground hover:bg-rose-50 hover:text-rose-600 focus:outline-hidden focus:ring-2 focus:ring-rose-400"
                          onClick={() => {
                            const next = templateForm.breaks.filter(
                              (_, i) => i !== idx
                            );
                            setTemplateForm({ ...templateForm, breaks: next });
                          }}
                          onKeyDown={(
                            e: React.KeyboardEvent<HTMLButtonElement>
                          ) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              const next = templateForm.breaks.filter(
                                (_, i) => i !== idx
                              );
                              setTemplateForm({
                                ...templateForm,
                                breaks: next,
                              });
                            }
                          }}
                          type="button"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <Button
                  className="w-full font-medium"
                  onClick={() => {
                    setTemplateForm({
                      ...templateForm,
                      breaks: [
                        ...templateForm.breaks,
                        {
                          endTime: "13:00",
                          label: `Mola ${templateForm.breaks.length + 1}`,
                          startTime: "12:00",
                        },
                      ],
                    });
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Mola Ekle
                </Button>
                {/* Deprecated fallback + grace period */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-semibold text-foreground text-xs opacity-60">
                      Mola Süresi (dk) — deprecated
                    </label>
                    <NumberInput
                      aria-label="Mola süresi deprecated fallback"
                      disabled
                      precision={0}
                      value={templateForm.breakDurationMinutes}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold text-foreground text-xs">
                      Giriş Toleransı (dk)
                    </label>
                    <NumberInput
                      max={60}
                      min={0}
                      onChange={(val) =>
                        setTemplateForm({
                          ...templateForm,
                          gracePeriodMinutes: clampCount(val, 0, 60),
                        })
                      }
                      precision={0}
                      showStepper
                      step={1}
                      value={templateForm.gracePeriodMinutes}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 p-3">
                <div>
                  <div className="font-semibold text-foreground text-sm">
                    Gece Vardiyası
                  </div>
                  <div className="text-muted-foreground text-xs">
                    Gece 00:00 sonrasına sarkan saatler
                  </div>
                </div>
                <input
                  checked={templateForm.isNightShift}
                  className="h-4 w-4 rounded border-border text-blue-600 focus:ring-blue-500"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setTemplateForm({
                      ...templateForm,
                      isNightShift: e.target.checked,
                    })
                  }
                  type="checkbox"
                />
              </div>

              {/* Real-time Labor Law Compliance Alert */}
              <ComplianceInlineCard
                allowOverride={true}
                isOverridden={templateOverride.allowed}
                metrics={templateCompliance.metrics}
                onOverrideChange={(allowed, reason) =>
                  setTemplateOverride({ allowed, reason })
                }
                overrideReason={templateOverride.reason}
                validationResult={templateCompliance.validationResult}
              />

              <div className="flex items-center justify-end gap-2 border-border border-t pt-4">
                <Button
                  onClick={() => setIsTemplateModalOpen(false)}
                  type="button"
                  variant="outline"
                >
                  İptal
                </Button>
                <Button
                  className="bg-blue-600 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  disabled={
                    actionLoading ||
                    templateCompliance.validationResult.hasHardBlock ||
                    !(
                      templateCompliance.validationResult.isCompliant ||
                      templateOverride.allowed
                    )
                  }
                  type="submit"
                >
                  {templateCompliance.validationResult.hasHardBlock
                    ? "Yasal Engel (Kaydedilemez)"
                    : "Şablonu Kaydet"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL 2: Vardiya Ata */}
      {isAssignModalOpen && (
        <Dialog
          onOpenChange={(open) => {
            if (!open) {
              setIsAssignModalOpen(false);
            }
          }}
          open
        >
          <DialogContent
            aria-describedby={undefined}
            className="flex max-h-[90vh] w-full flex-col gap-0 p-6 sm:max-w-lg"
            showCloseButton={false}
          >
            <div className="mb-4 flex items-center justify-between border-border border-b pb-4">
              <div>
                <DialogTitle className="font-bold text-foreground text-lg">
                  Vardiya Çizelgesi Ata
                </DialogTitle>
                <p className="text-muted-foreground text-xs">
                  Personellere veya departmana toplu vardiya planlaması yapın.
                </p>
              </div>
              <DialogClose asChild>
                <button
                  aria-label="Kapat"
                  className="rounded-full p-1 text-muted-foreground hover:bg-muted"
                  type="button"
                >
                  <X className="h-5 w-5" />
                </button>
              </DialogClose>
            </div>

            <form
              className="space-y-4 overflow-y-auto pr-1"
              onSubmit={handleAssignShifts}
            >
              <div className="space-y-1.5">
                <Label required>Vardiya Şablonu</Label>
                <SelectField
                  onChange={(val) =>
                    setAssignForm({ ...assignForm, shiftTemplateId: val })
                  }
                  options={templates.map((t) => ({
                    label: `${t.name} (${t.startTime.slice(0, 5)} - ${t.endTime.slice(0, 5)})`,
                    value: t.id,
                  }))}
                  placeholder="Vardiya Şablonu Seçin"
                  value={assignForm.shiftTemplateId}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label required>Başlangıç Tarihi</Label>
                  <DatePicker
                    className="w-full"
                    onChange={(val) =>
                      setAssignForm({
                        ...assignForm,
                        startDate: val,
                      })
                    }
                    placeholder="Başlangıç tarihi"
                    value={assignForm.startDate}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label required>Bitiş Tarihi</Label>
                  <DatePicker
                    className="w-full"
                    minDate={assignForm.startDate}
                    onChange={(val) =>
                      setAssignForm({ ...assignForm, endDate: val })
                    }
                    placeholder="Bitiş tarihi"
                    value={assignForm.endDate}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Departman ile Toplu Ata (Opsiyonel)</Label>
                <SelectField
                  onChange={(val) =>
                    setAssignForm({
                      ...assignForm,
                      departmentId: val === "all" ? "" : val,
                      employeeIds: [],
                    })
                  }
                  options={[
                    { label: "Bireysel Seçim Yap", value: "all" },
                    ...departments.map((d) => ({
                      label: `${d.name} Departmanı`,
                      value: d.id,
                    })),
                  ]}
                  placeholder="Tüm departman personeline uygula..."
                  value={assignForm.departmentId || "all"}
                />
              </div>

              {!assignForm.departmentId && (
                <div className="space-y-1.5">
                  <Label required>Personel Seçimi</Label>
                  <SelectField
                    onChange={(val) =>
                      setAssignForm({ ...assignForm, employeeIds: [val] })
                    }
                    options={employees.map((emp) => ({
                      label: `${emp.firstName} ${emp.lastName} (${emp.departmentName || "Genel"})`,
                      value: emp.id,
                    }))}
                    placeholder="Personel Seçin"
                    value={assignForm.employeeIds[0] || ""}
                  />
                </div>
              )}

              {/* Real-time Labor Law Compliance Alert */}
              {assignCompliance && (
                <ComplianceInlineCard
                  allowOverride={true}
                  isOverridden={assignOverride.allowed}
                  metrics={assignCompliance.metrics}
                  onOverrideChange={(allowed, reason) =>
                    setAssignOverride({ allowed, reason })
                  }
                  overrideReason={assignOverride.reason}
                  validationResult={assignCompliance.validationResult}
                />
              )}

              <div className="flex items-center justify-end gap-2 border-border border-t pt-4">
                <Button
                  onClick={() => setIsAssignModalOpen(false)}
                  type="button"
                  variant="outline"
                >
                  İptal
                </Button>
                <Button
                  className="bg-blue-600 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  disabled={
                    actionLoading ||
                    Boolean(assignCompliance?.validationResult.hasHardBlock) ||
                    Boolean(
                      assignCompliance &&
                        !assignCompliance.validationResult.isCompliant &&
                        !assignOverride.allowed
                    )
                  }
                  type="submit"
                >
                  {assignCompliance?.validationResult.hasHardBlock
                    ? "Yasal Engel (Atanamaz)"
                    : "Vardiyaları Ata"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL 3: Düzeltme Talebi */}
      {isCorrectionModalOpen && (
        <Dialog
          onOpenChange={(open) => {
            if (!open) {
              setIsCorrectionModalOpen(false);
            }
          }}
          open
        >
          <DialogContent
            aria-describedby={undefined}
            className="flex max-h-[90vh] w-full flex-col gap-0 p-6 sm:max-w-lg"
            showCloseButton={false}
          >
            <div className="mb-4 flex items-center justify-between border-border border-b pb-4">
              <div>
                <DialogTitle className="font-bold text-foreground text-lg">
                  PDKS Düzeltme Talebi
                </DialogTitle>
                <p className="text-muted-foreground text-xs">
                  Unutulan veya hatalı girişi mazeretiyle bildiriniz.
                </p>
              </div>
              <DialogClose asChild>
                <button
                  aria-label="Kapat"
                  className="rounded-full p-1 text-muted-foreground hover:bg-muted"
                  type="button"
                >
                  <X className="h-5 w-5" />
                </button>
              </DialogClose>
            </div>

            <form
              className="space-y-4 overflow-y-auto pr-1"
              onSubmit={handleSubmitCorrection}
            >
              <div className="space-y-1.5">
                <Label required>Personel</Label>
                <SelectField
                  onChange={(val) =>
                    setCorrectionForm({ ...correctionForm, employeeId: val })
                  }
                  options={employees.map((emp) => ({
                    label: `${emp.firstName} ${emp.lastName}`,
                    value: emp.id,
                  }))}
                  placeholder="Personel Seçin"
                  value={correctionForm.employeeId}
                />
              </div>

              <div className="space-y-1.5">
                <Label required>Tarih</Label>
                <DatePicker
                  className="w-full"
                  onChange={(val) =>
                    setCorrectionForm({
                      ...correctionForm,
                      date: val,
                    })
                  }
                  placeholder="Düzeltilecek tarih seçin"
                  value={correctionForm.date}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Giriş Saati</Label>
                  <TimePicker
                    onChange={(val) =>
                      setCorrectionForm({
                        ...correctionForm,
                        requestedClockInTime: val,
                      })
                    }
                    value={correctionForm.requestedClockInTime}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Çıkış Saati</Label>
                  <TimePicker
                    onChange={(val) =>
                      setCorrectionForm({
                        ...correctionForm,
                        requestedClockOutTime: val,
                      })
                    }
                    value={correctionForm.requestedClockOutTime}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label required>Mazeret / Açıklama</Label>
                <Textarea
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setCorrectionForm({
                      ...correctionForm,
                      reason: e.target.value,
                    })
                  }
                  placeholder="Kartımı evde unuttum / Müşteri ziyaretinde sahada kaldım..."
                  required
                  rows={3}
                  value={correctionForm.reason}
                />
              </div>

              {/* Real-time Labor Law Compliance Alert */}
              {correctionCompliance && (
                <ComplianceInlineCard
                  allowOverride={true}
                  isOverridden={correctionOverride.allowed}
                  metrics={correctionCompliance.metrics}
                  onOverrideChange={(allowed, reason) =>
                    setCorrectionOverride({ allowed, reason })
                  }
                  overrideReason={correctionOverride.reason}
                  validationResult={correctionCompliance.validationResult}
                />
              )}

              <div className="flex items-center justify-end gap-2 border-border border-t pt-4">
                <Button
                  onClick={() => setIsCorrectionModalOpen(false)}
                  type="button"
                  variant="outline"
                >
                  İptal
                </Button>
                <Button
                  className="bg-blue-600 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  disabled={
                    actionLoading ||
                    Boolean(
                      correctionCompliance?.validationResult.hasHardBlock
                    ) ||
                    Boolean(
                      correctionCompliance &&
                        !correctionCompliance.validationResult.isCompliant &&
                        !correctionOverride.allowed
                    )
                  }
                  type="submit"
                >
                  {correctionCompliance?.validationResult.hasHardBlock
                    ? "Yasal Engel"
                    : "Talep Gönder"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        cancelText={confirmDialog.cancelText}
        confirmText={confirmDialog.confirmText}
        description={confirmDialog.description}
        onConfirm={confirmDialog.onConfirm}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
        open={confirmDialog.open}
        title={confirmDialog.title}
        variant={confirmDialog.variant}
      />
    </PageContainer>
  );
}
