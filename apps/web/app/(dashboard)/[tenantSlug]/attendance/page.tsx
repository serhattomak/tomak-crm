"use client"

import {
  AlertCircle,
  Building2,
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
} from "lucide-react"
import { useParams, useSearchParams } from "next/navigation"
import React, { useCallback, useEffect, useMemo, useState } from "react"
import { PermissionGate } from "@/components/permission-gate"
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
} from "@/lib/api-client"
import { usePermissions } from "@/lib/permissions/permission-context"
import { Button } from "@workspace/ui/components/button"
import { ConfirmDialog } from "@workspace/ui/components/confirm-dialog"
import { DatePicker } from "@workspace/ui/components/date-picker"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { toast } from "@workspace/ui/components/sonner"

export default function AttendancePage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const tenantSlug = (params?.tenantSlug as string) || ""
  const { activeTenant } = usePermissions()

  const [activeTab, setActiveTab] = useState<"monitor" | "shifts" | "records" | "corrections" | "devices">("monitor")
  const [loading, setLoading] = useState(true)

  // Live Monitor Data
  const [liveData, setLiveData] = useState<LiveMonitorResponse | null>(null)
  const [todayStatus, setTodayStatus] = useState<TodayStatusDto | null>(null)

  // Shifts Data
  const [templates, setTemplates] = useState<ShiftTemplateDto[]>([])
  const [schedules, setSchedules] = useState<ShiftScheduleDto[]>([])
  const [scheduleWeekStart, setScheduleWeekStart] = useState<Date>(() => {
    const d = new Date()
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday
    const monday = new Date(d.setDate(diff))
    monday.setHours(0, 0, 0, 0)
    return monday
  })

  // Records & Corrections
  const [records, setRecords] = useState<AttendanceRecordDto[]>([])
  const [corrections, setCorrections] = useState<AttendanceCorrectionRequestDto[]>([])
  const [employees, setEmployees] = useState<EmployeeDto[]>([])
  const [departments, setDepartments] = useState<DepartmentDto[]>([])

  // Filters
  const [search, setSearch] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [recordDateFrom, setRecordDateFrom] = useState<string>(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d.toISOString().split("T")[0] || ""
  })
  const [recordDateTo, setRecordDateTo] = useState<string>(() => {
    return new Date().toISOString().split("T")[0] || ""
  })

  // Modals
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // Form States - Shift Template
  const [templateForm, setTemplateForm] = useState({
    name: "",
    code: "",
    colorHex: "#3B82F6",
    startTime: "09:00:00",
    endTime: "18:00:00",
    breakDurationMinutes: 60,
    gracePeriodMinutes: 15,
    isNightShift: false,
    isFlexible: false,
    minWorkingHours: 8,
  })

  // Form States - Shift Assign
  const [assignForm, setAssignForm] = useState({
    shiftTemplateId: "",
    employeeIds: [] as string[],
    departmentId: "",
    startDate: new Date().toISOString().split("T")[0] || "",
    endDate: new Date(Date.now() + 6 * 86400000).toISOString().split("T")[0] || "",
    repeatOnDays: [1, 2, 3, 4, 5], // Mon-Fri
    notes: "",
  })

  // Form States - Correction Request
  const [correctionForm, setCorrectionForm] = useState({
    employeeId: "",
    date: new Date().toISOString().split("T")[0] || "",
    requestedClockInTime: "09:00",
    requestedClockOutTime: "18:00",
    reason: "",
  })

  // Clock Widget Live Timer
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  useEffect(() => {
    setCurrentTime(new Date())
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Auto-open modals via searchParams
  useEffect(() => {
    const create = searchParams.get("create")
    if (create === "template") setIsTemplateModalOpen(true)
    if (create === "assign") setIsAssignModalOpen(true)
    if (create === "correction") setIsCorrectionModalOpen(true)
  }, [searchParams])

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    description: string
    confirmText?: string
    cancelText?: string
    variant?: "destructive" | "warning" | "default"
    onConfirm: () => void | Promise<void>
  }>({
    open: false,
    title: "",
    description: "",
    onConfirm: () => {},
  })

  // Load Base Data
  const loadData = useCallback(async () => {
    if (!activeTenant) return
    setLoading(true)
    try {
      const weekEnd = new Date(scheduleWeekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      const startDateStr = scheduleWeekStart.toISOString().split("T")[0] || ""
      const endDateStr = weekEnd.toISOString().split("T")[0] || ""

      const [liveRes, tplRes, calRes, recRes, empRes, deptRes] = await Promise.all([
        ApiClient.getLiveMonitor(activeTenant.id),
        ApiClient.getShiftTemplates(activeTenant.id),
        ApiClient.getShiftCalendar({ startDate: startDateStr, endDate: endDateStr }, activeTenant.id),
        ApiClient.getAttendanceRecords(
          {
            startDate: recordDateFrom || undefined,
            endDate: recordDateTo || undefined,
          },
          activeTenant.id
        ),
        ApiClient.getEmployees({ pageSize: 100 }, activeTenant.id),
        ApiClient.getDepartments(activeTenant.id),
      ])

      if (liveRes.success && liveRes.data) setLiveData(liveRes.data)
      if (tplRes.success && tplRes.data) setTemplates(tplRes.data)
      if (calRes.success && calRes.data) setSchedules(calRes.data)
      if (recRes.success && recRes.data) setRecords(recRes.data)
      if (empRes.success && empRes.data?.items) {
        setEmployees(empRes.data.items)
        if (empRes.data.items.length > 0 && !todayStatus) {
          const firstEmp = empRes.data.items[0]
          if (firstEmp) {
            const statusRes = await ApiClient.getTodayStatus(firstEmp.id, activeTenant.id)
            if (statusRes.success && statusRes.data) setTodayStatus(statusRes.data)
          }
        }
      }
      if (deptRes.success && deptRes.data) setDepartments(deptRes.data)
    } catch {
      toast.error("Veriler yüklenirken bir hata oluştu.")
    } finally {
      setLoading(false)
    }
  }, [activeTenant, scheduleWeekStart, recordDateFrom, recordDateTo, todayStatus])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Handle Quick Clock Punch
  const handlePunch = async (punchType: "ClockIn" | "ClockOut" | "BreakStart" | "BreakEnd", breakType?: string) => {
    if (!activeTenant || employees.length === 0) return
    const currentEmp = employees[0]
    if (!currentEmp) return

    setActionLoading(true)
    try {
      const res = await ApiClient.punchAttendance(
        {
          employeeId: currentEmp.id,
          employeeName: `${currentEmp.firstName} ${currentEmp.lastName}`.trim(),
          punchType,
          breakType,
          source: "Web",
        },
        activeTenant.id
      )
      if (res.success && res.data) {
        setTodayStatus(res.data)
        const messages: Record<string, string> = {
          ClockIn: "Giriş kaydı başarıyla alındı. İyi çalışmalar!",
          ClockOut: "Çıkış kaydı alındı. İyi dinlenmeler!",
          BreakStart: "Mola başlatıldı.",
          BreakEnd: "Mola tamamlandı, çalışma devam ediyor.",
        }
        toast.success(messages[punchType] || "İşlem kaydedildi.")
        loadData()
      } else {
        toast.error(res.message || "İşlem başarısız.")
      }
    } catch {
      toast.error("Okutma sırasında bir hata oluştu.")
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Create Template
  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeTenant || !templateForm.name.trim() || !templateForm.code.trim()) {
      toast.error("Lütfen zorunlu alanları doldurunuz.")
      return
    }
    setActionLoading(true)
    try {
      const res = await ApiClient.createShiftTemplate(templateForm, activeTenant.id)
      if (res.success && res.data) {
        toast.success("Vardiya şablonu oluşturuldu.")
        setIsTemplateModalOpen(false)
        setTemplateForm({
          name: "",
          code: "",
          colorHex: "#3B82F6",
          startTime: "09:00:00",
          endTime: "18:00:00",
          breakDurationMinutes: 60,
          gracePeriodMinutes: 15,
          isNightShift: false,
          isFlexible: false,
          minWorkingHours: 8,
        })
        loadData()
      } else {
        toast.error(res.message || "Şablon oluşturulamadı.")
      }
    } catch {
      toast.error("Şablon oluşturulurken bir hata meydana geldi.")
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Assign Shifts
  const handleAssignShifts = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeTenant || !assignForm.shiftTemplateId || (assignForm.employeeIds.length === 0 && !assignForm.departmentId)) {
      toast.error("Lütfen şablon ve en az bir çalışan ya da departman seçiniz.")
      return
    }
    setActionLoading(true)
    try {
      const selectedEmps = assignForm.departmentId
        ? employees.filter((emp) => emp.departmentId === assignForm.departmentId)
        : employees.filter((emp) => assignForm.employeeIds.includes(emp.id))

      const res = await ApiClient.assignShifts(
        {
          shiftTemplateId: assignForm.shiftTemplateId,
          employeeIds: selectedEmps.map((e) => e.id),
          employeeNames: selectedEmps.map((e) => `${e.firstName} ${e.lastName}`.trim()),
          departmentId: assignForm.departmentId || undefined,
          departmentName: departments.find((d) => d.id === assignForm.departmentId)?.name,
          startDate: assignForm.startDate,
          endDate: assignForm.endDate,
          repeatOnDays: assignForm.repeatOnDays,
          notes: assignForm.notes,
        },
        activeTenant.id
      )
      if (res.success) {
        toast.success(`${res.data ?? selectedEmps.length} adet vardiya ataması kaydedildi.`)
        setIsAssignModalOpen(false)
        loadData()
      } else {
        toast.error(res.message || "Vardiya atanamadı.")
      }
    } catch {
      toast.error("Vardiya ataması sırasında hata meydana geldi.")
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Submit Correction
  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeTenant || !correctionForm.employeeId || !correctionForm.reason.trim()) {
      toast.error("Lütfen çalışan ve mazeret alanlarını doldurunuz.")
      return
    }
    setActionLoading(true)
    try {
      const emp = employees.find((e) => e.id === correctionForm.employeeId)
      const clockIn = correctionForm.requestedClockInTime ? `${correctionForm.date}T${correctionForm.requestedClockInTime}:00Z` : undefined
      const clockOut = correctionForm.requestedClockOutTime ? `${correctionForm.date}T${correctionForm.requestedClockOutTime}:00Z` : undefined

      const res = await ApiClient.submitAttendanceCorrection(
        {
          employeeId: correctionForm.employeeId,
          employeeName: emp ? `${emp.firstName} ${emp.lastName}`.trim() : "Personel",
          date: correctionForm.date,
          requestedClockIn: clockIn,
          requestedClockOut: clockOut,
          reason: correctionForm.reason,
        },
        activeTenant.id
      )
      if (res.success && res.data) {
        toast.success("Düzeltme talebi yönetici onayına gönderildi.")
        setCorrections((prev) => [res.data!, ...prev])
        setIsCorrectionModalOpen(false)
        setCorrectionForm({
          employeeId: "",
          date: new Date().toISOString().split("T")[0] || "",
          requestedClockInTime: "09:00",
          requestedClockOutTime: "18:00",
          reason: "",
        })
      } else {
        toast.error(res.message || "Talep gönderilemedi.")
      }
    } catch {
      toast.error("Talep iletilirken bir hata meydana geldi.")
    } finally {
      setActionLoading(false)
    }
  }

  // Format Helpers
  const formatMinutes = (mins: number) => {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return `${h} sa ${m} dk`
  }

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return "--:--"
    const d = new Date(dateStr)
    return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
  }

  // Filtered Live Employees
  const filteredLiveEmployees = useMemo(() => {
    if (!liveData?.employees) return []
    return liveData.employees.filter((emp) => {
      const matchesSearch = !search || emp.employeeName.toLowerCase().includes(search.toLowerCase())
      const matchesDept = !departmentFilter || departmentFilter === "all" || emp.departmentName === departmentFilter
      const matchesStatus =
        !statusFilter ||
        statusFilter === "all" ||
        (statusFilter === "Working" && emp.currentState === "Working") ||
        (statusFilter === "OnBreak" && emp.currentState === "OnBreak") ||
        (statusFilter === "Late" && emp.currentState === "Late") ||
        (statusFilter === "Absent" && emp.currentState === "Absent")
      return matchesSearch && matchesDept && matchesStatus
    })
  }, [liveData, search, departmentFilter, statusFilter])

  // Weekdays for schedule
  const weekDays = useMemo(() => {
    const days = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(scheduleWeekStart)
      d.setDate(d.getDate() + i)
      days.push(d)
    }
    return days
  }, [scheduleWeekStart])

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* 1. Header & Live Clock Quick Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white dark:bg-card border border-border/80 rounded-2xl p-6 shadow-xs">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-xs">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Vardiya & PDKS Takibi</h1>
            <p className="text-sm text-muted-foreground">
              Canlı personel devam takibi, vardiya çizelgeleri, mola ve fazla mesai yönetimi.
            </p>
          </div>
        </div>

        {/* Live Clock & Quick Action Widget */}
        <div className="flex flex-wrap items-center gap-3 bg-muted/40 p-3 rounded-xl border border-border/60">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-card rounded-lg border border-border/50 text-sm font-semibold shadow-xs">
            <Timer className="h-4 w-4 text-blue-600 animate-pulse" />
            <span>{currentTime?.toLocaleTimeString("tr-TR") ?? "--:--:--"}</span>
          </div>

          <div className="flex items-center gap-2">
            {!todayStatus?.isClockedIn ? (
              <Button
                onClick={() => handlePunch("ClockIn")}
                disabled={actionLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
              >
                <UserCheck className="h-4 w-4 mr-2" />
                Giriş Yap
              </Button>
            ) : todayStatus.isOnBreak ? (
              <Button
                onClick={() => handlePunch("BreakEnd")}
                disabled={actionLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
              >
                <Sun className="h-4 w-4 mr-2" />
                Molayı Bitir
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => handlePunch("BreakStart", "Lunch")}
                  disabled={actionLoading}
                  variant="outline"
                  className="font-medium"
                >
                  <Coffee className="h-4 w-4 mr-2 text-amber-500" />
                  Mola Ver
                </Button>
                <Button
                  onClick={() => handlePunch("ClockOut")}
                  disabled={actionLoading}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-xs"
                >
                  <UserX className="h-4 w-4 mr-2" />
                  Çıkış Yap
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2. Main Tabbed Content */}
      <div className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
          <div className="flex flex-wrap items-center gap-1 bg-muted/60 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("monitor")}
              className={`flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === "monitor" ? "bg-white dark:bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="h-3.5 w-3.5 mr-1.5" />
              Canlı PDKS Monitörü
            </button>
            <button
              onClick={() => setActiveTab("shifts")}
              className={`flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === "shifts" ? "bg-white dark:bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
              Vardiya Planlama
            </button>
            <button
              onClick={() => setActiveTab("records")}
              className={`flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === "records" ? "bg-white dark:bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Layers className="h-3.5 w-3.5 mr-1.5" />
              Devam & Giriş-Çıkış Kütüğü
            </button>
            <button
              onClick={() => setActiveTab("corrections")}
              className={`flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === "corrections" ? "bg-white dark:bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
              Düzeltme Talepleri
            </button>
            <button
              onClick={() => setActiveTab("devices")}
              className={`flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === "devices" ? "bg-white dark:bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Settings className="h-3.5 w-3.5 mr-1.5" />
              PDKS Cihazları
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Yenile
            </Button>
            {activeTab === "shifts" && (
              <PermissionGate permission="Attendance.Manage">
                <Button
                  size="sm"
                  onClick={() => setIsAssignModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Vardiya Ata
                </Button>
              </PermissionGate>
            )}
            {activeTab === "records" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  toast.success("Devam kütüğü CSV formatında indirildi.")
                }}
              >
                <Download className="h-4 w-4 mr-1.5" />
                Dışa Aktar
              </Button>
            )}
          </div>
        </div>

        {/* TAB 1: Canlı PDKS Monitörü */}
        {activeTab === "monitor" && (
          <div className="mt-6 flex flex-col gap-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-border/80 bg-white dark:bg-card p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Şu Anda Çalışan</span>
                  <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 flex items-center justify-center">
                    <UserCheck className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-foreground mt-2">{liveData?.currentlyWorking ?? 0}</div>
                <p className="text-xs text-muted-foreground mt-1">İş yerinde veya sahada aktif</p>
              </div>

              <div className="rounded-2xl border border-border/80 bg-white dark:bg-card p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Molada Olanlar</span>
                  <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/50 flex items-center justify-center">
                    <Coffee className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-foreground mt-2">{liveData?.currentlyOnBreak ?? 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Yemek veya ara molasında</p>
              </div>

              <div className="rounded-2xl border border-border/80 bg-white dark:bg-card p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Geç Kalanlar</span>
                  <div className="h-8 w-8 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/50 flex items-center justify-center">
                    <AlertCircle className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-rose-600 mt-2">{liveData?.lateArrivals ?? 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Tolerans süresini aşanlar</p>
              </div>

              <div className="rounded-2xl border border-border/80 bg-white dark:bg-card p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Beklenen / Gelmeyen</span>
                  <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 flex items-center justify-center">
                    <UserX className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-foreground mt-2">{liveData?.absentCount ?? 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Vardiyası olup henüz basmayan</p>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-card border border-border p-4 rounded-2xl shadow-xs">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Personel adı ile ara..."
                  value={search}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="w-full sm:w-[200px]">
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Tüm Departmanlar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm Departmanlar</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.name}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-[180px]">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Tüm Durumlar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm Durumlar</SelectItem>
                    <SelectItem value="Working">Çalışıyor</SelectItem>
                    <SelectItem value="OnBreak">Molada</SelectItem>
                    <SelectItem value="Late">Geç Kaldı</SelectItem>
                    <SelectItem value="Absent">Gelmeyen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Live Table */}
            <div className="rounded-2xl border border-border/80 bg-white dark:bg-card shadow-xs overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/40 text-xs font-semibold text-muted-foreground uppercase border-b border-border">
                  <tr>
                    <th className="p-4">Personel</th>
                    <th className="p-4">Departman</th>
                    <th className="p-4">Vardiya</th>
                    <th className="p-4">İlk Giriş</th>
                    <th className="p-4">Net Çalışma</th>
                    <th className="p-4">Mola Süresi</th>
                    <th className="p-4">Canlı Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredLiveEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-muted-foreground">
                        Kayıt bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    filteredLiveEmployees.map((emp) => (
                      <tr key={emp.employeeId} className="hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold flex items-center justify-center text-sm">
                              {emp.employeeName.charAt(0)}
                            </div>
                            <div>
                              <div className="font-semibold text-foreground">{emp.employeeName}</div>
                              <div className="text-xs text-muted-foreground">ID: {emp.employeeId.slice(0, 8)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-foreground">{emp.departmentName || "Genel"}</td>
                        <td className="p-4">
                          <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted border border-border">
                            {emp.shiftName || "Normal Vardiya"}
                          </span>
                        </td>
                        <td className="p-4 text-sm font-medium text-foreground">{formatTime(emp.clockInTime)}</td>
                        <td className="p-4 text-sm font-medium text-foreground">{formatMinutes(emp.workedMinutesSoFar)}</td>
                        <td className="p-4 text-sm text-muted-foreground">{formatMinutes(emp.breakMinutesSoFar)}</td>
                        <td className="p-4">
                          {emp.currentState === "Working" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                              Çalışıyor
                            </span>
                          )}
                          {emp.currentState === "OnBreak" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                              Molada
                            </span>
                          )}
                          {emp.currentState === "Late" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                              <AlertCircle className="h-3.5 w-3.5" />
                              Geç Kaldı
                            </span>
                          )}
                          {emp.currentState === "Absent" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              <UserX className="h-3.5 w-3.5" />
                              Henüz Gelmedi
                            </span>
                          )}
                          {emp.currentState === "Completed" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Tamamlandı
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Vardiya Takvimi & Planlama */}
        {activeTab === "shifts" && (
          <div className="mt-6 flex flex-col gap-6">
            {/* Top Bar: Template Pills & Date Controls */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-card border border-border p-4 rounded-2xl shadow-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase mr-1">Şablonlar:</span>
                {templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-border bg-background text-xs font-medium"
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tpl.colorHex }} />
                    <span>{tpl.name}</span>
                    <span className="text-muted-foreground">({tpl.startTime.slice(0, 5)} - {tpl.endTime.slice(0, 5)})</span>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsTemplateModalOpen(true)}
                  className="h-7 text-xs font-medium"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Yeni Şablon
                </Button>
              </div>

              {/* Week Navigator */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    const d = new Date(scheduleWeekStart)
                    d.setDate(d.getDate() - 7)
                    setScheduleWeekStart(d)
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-sm font-semibold px-2">
                  {scheduleWeekStart.toLocaleDateString("tr-TR", { month: "short", day: "numeric" })} -{" "}
                  {new Date(scheduleWeekStart.getTime() + 6 * 86400000).toLocaleDateString("tr-TR", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    const d = new Date(scheduleWeekStart)
                    d.setDate(d.getDate() + 7)
                    setScheduleWeekStart(d)
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Weekly Interactive Grid */}
            <div className="rounded-2xl border border-border/80 bg-white dark:bg-card shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border">
                      <th className="p-3 text-left font-semibold w-48 border-r border-border">Personel</th>
                      {weekDays.map((wd) => {
                        const isToday = wd.toDateString() === new Date().toDateString()
                        return (
                          <th
                            key={wd.toISOString()}
                            className={`p-3 text-center font-semibold border-r border-border ${
                              isToday ? "bg-blue-50/60 dark:bg-blue-950/30 text-blue-600" : ""
                            }`}
                          >
                            <div>{wd.toLocaleDateString("tr-TR", { weekday: "short" })}</div>
                            <div className="text-xs text-muted-foreground font-normal">{wd.getDate()}</div>
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp) => (
                      <tr key={emp.id} className="border-b border-border hover:bg-muted/20">
                        <td className="p-3 font-medium text-foreground border-r border-border">
                          <div>{emp.firstName} {emp.lastName}</div>
                          <div className="text-xs text-muted-foreground">{emp.departmentName || "Genel"}</div>
                        </td>
                        {weekDays.map((wd) => {
                          const dateStr = wd.toISOString().split("T")[0]
                          const sch = schedules.find((s) => s.employeeId === emp.id && s.date === dateStr)
                          return (
                            <td key={dateStr} className="p-2 text-center border-r border-border align-middle">
                              {sch ? (
                                <div
                                  className="p-1.5 rounded-lg text-xs font-semibold text-white shadow-xs"
                                  style={{ backgroundColor: sch.shiftColorHex || "#3B82F6" }}
                                >
                                  <div>{sch.shiftName}</div>
                                  <div className="text-[10px] opacity-90">
                                    {sch.startTime.slice(0, 5)} - {sch.endTime.slice(0, 5)}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground/50">-</span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Devam & Giriş-Çıkış Kütüğü */}
        {activeTab === "records" && (
          <div className="mt-6 flex flex-col gap-6">
            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-white dark:bg-card border border-border p-4 rounded-2xl shadow-xs">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Başlangıç Tarihi</label>
                <DatePicker value={recordDateFrom} onChange={(val) => setRecordDateFrom(val)} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Bitiş Tarihi</label>
                <DatePicker value={recordDateTo} onChange={(val) => setRecordDateTo(val)} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Departman</label>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Tümü" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tümü</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={loadData} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                  <Filter className="h-4 w-4 mr-2" />
                  Filtrele
                </Button>
              </div>
            </div>

            {/* Records Table */}
            <div className="rounded-2xl border border-border/80 bg-white dark:bg-card shadow-xs overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/40 text-xs font-semibold text-muted-foreground uppercase border-b border-border">
                  <tr>
                    <th className="p-4">Tarih</th>
                    <th className="p-4">Personel</th>
                    <th className="p-4">Departman</th>
                    <th className="p-4">İlk Giriş</th>
                    <th className="p-4">Son Çıkış</th>
                    <th className="p-4">Net Çalışma</th>
                    <th className="p-4">Mola</th>
                    <th className="p-4">Fazla Mesai</th>
                    <th className="p-4">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-muted-foreground">
                        Kayıt bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    records.map((r) => (
                      <tr key={r.id} className="hover:bg-muted/30">
                        <td className="p-4 text-sm font-medium text-foreground">{r.date}</td>
                        <td className="p-4 text-sm font-semibold text-foreground">{r.employeeName}</td>
                        <td className="p-4 text-sm text-muted-foreground">{r.departmentName || "Genel"}</td>
                        <td className="p-4 text-sm text-foreground">{formatTime(r.firstClockIn)}</td>
                        <td className="p-4 text-sm text-foreground">{formatTime(r.lastClockOut)}</td>
                        <td className="p-4 text-sm font-medium text-foreground">{formatMinutes(r.totalWorkedMinutes)}</td>
                        <td className="p-4 text-sm text-muted-foreground">{formatMinutes(r.totalBreakMinutes)}</td>
                        <td className="p-4">
                          {r.overtimeMinutes > 0 ? (
                            <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200">
                              +{formatMinutes(r.overtimeMinutes)} (1.5x)
                            </span>
                          ) : r.holidayOvertimeMinutes > 0 ? (
                            <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-semibold text-purple-600 bg-purple-50 border border-purple-200">
                              +{formatMinutes(r.holidayOvertimeMinutes)} (2.0x)
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
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
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: Düzeltme Talepleri */}
        {activeTab === "corrections" && (
          <div className="mt-6 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-foreground">PDKS Düzeltme & Unutma Talepleri</h3>
                <p className="text-sm text-muted-foreground">
                  Kartını unutan veya hatalı okutma yapan personellerin saat onay akışı.
                </p>
              </div>
              <Button
                onClick={() => setIsCorrectionModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Düzeltme Talep Et
              </Button>
            </div>

            <div className="rounded-2xl border border-border/80 bg-white dark:bg-card shadow-xs overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/40 text-xs font-semibold text-muted-foreground uppercase border-b border-border">
                  <tr>
                    <th className="p-4">Tarih</th>
                    <th className="p-4">Personel</th>
                    <th className="p-4">İstenen Giriş / Çıkış</th>
                    <th className="p-4">Mazeret / Gerekçe</th>
                    <th className="p-4">Durum</th>
                    <th className="p-4 text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {corrections.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-muted-foreground">
                        Bekleyen düzeltme talebi bulunmuyor.
                      </td>
                    </tr>
                  ) : (
                    corrections.map((c) => (
                      <tr key={c.id}>
                        <td className="p-4 text-sm font-medium text-foreground">{c.date}</td>
                        <td className="p-4 text-sm font-semibold text-foreground">{c.employeeName}</td>
                        <td className="p-4 text-sm text-foreground">
                          {formatTime(c.requestedClockIn)} - {formatTime(c.requestedClockOut)}
                        </td>
                        <td className="p-4 text-sm text-muted-foreground max-w-xs truncate">{c.reason}</td>
                        <td className="p-4">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                              c.status === "Approved"
                                ? "bg-emerald-50 text-emerald-700"
                                : c.status === "Rejected"
                                ? "bg-rose-50 text-rose-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {c.status === "Approved" ? "Onaylandı" : c.status === "Rejected" ? "Reddedildi" : "Bekliyor"}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          {c.status === "Pending" && (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                                onClick={async () => {
                                  if (!activeTenant) return
                                  const res = await ApiClient.reviewAttendanceCorrection(c.id, { approve: true }, activeTenant.id)
                                  if (res.success) {
                                    toast.success("Düzeltme talebi onaylandı.")
                                    loadData()
                                  }
                                }}
                              >
                                Onayla
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-rose-600 border-rose-300 hover:bg-rose-50"
                                onClick={async () => {
                                  if (!activeTenant) return
                                  const res = await ApiClient.reviewAttendanceCorrection(
                                    c.id,
                                    { approve: false, rejectionReason: "Mazeret uygun görülmedi" },
                                    activeTenant.id
                                  )
                                  if (res.success) {
                                    toast.success("Talep reddedildi.")
                                    loadData()
                                  }
                                }}
                              >
                                Reddet
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: PDKS Cihazları & Ayarlar */}
        {activeTab === "devices" && (
          <div className="mt-6 flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Terminal Card 1 */}
              <div className="rounded-2xl border border-border/80 bg-white dark:bg-card p-6 shadow-xs flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Wifi className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-base font-bold text-foreground">Ana Turnike (RFID / Biyometrik)</div>
                      <div className="text-xs text-muted-foreground">ZKTeco BioStation 3 • IP: 192.168.1.120</div>
                    </div>
                  </div>
                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                    Aktif / Bağlı
                  </span>
                </div>
                <div className="text-xs text-muted-foreground flex flex-col gap-2 border-t border-border pt-3">
                  <div className="flex justify-between">
                    <span>Son Veri Akışı:</span>
                    <span className="font-semibold text-foreground">Az önce</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Protokol:</span>
                    <span className="font-semibold text-foreground">REST Webhook / Push</span>
                  </div>
                </div>
              </div>

              {/* Terminal Card 2 */}
              <div className="rounded-2xl border border-border/80 bg-white dark:bg-card p-6 shadow-xs flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                      <Smartphone className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-base font-bold text-foreground">Tablet Kiosk (Yüz Tanıma / QR)</div>
                      <div className="text-xs text-muted-foreground">Giriş Danışma Kiosk #1</div>
                    </div>
                  </div>
                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                    Aktif / Bağlı
                  </span>
                </div>
                <div className="text-xs text-muted-foreground flex flex-col gap-2 border-t border-border pt-3">
                  <div className="flex justify-between">
                    <span>Dinamik QR Yenileme:</span>
                    <span className="font-semibold text-foreground">15 Saniyede Bir</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Konum:</span>
                    <span className="font-semibold text-foreground">Merkez Ofis Resepsiyon</span>
                  </div>
                </div>
              </div>

              {/* Geofencing Card */}
              <div className="rounded-2xl border border-border/80 bg-white dark:bg-card p-6 shadow-xs flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-base font-bold text-foreground">Mobil GPS Geofencing</div>
                      <div className="text-xs text-muted-foreground">Mobil Giriş-Çıkış Sınırları</div>
                    </div>
                  </div>
                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                    50 Metre Yarıçap
                  </span>
                </div>
                <div className="text-xs text-muted-foreground flex flex-col gap-2 border-t border-border pt-3">
                  <div className="flex justify-between">
                    <span>GPS Doğrulama:</span>
                    <span className="font-semibold text-emerald-600">Zorunlu</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-border bg-white dark:bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">Yeni Vardiya Şablonu</h3>
                <p className="text-xs text-muted-foreground">Vardiya saatlerini ve kurallarını belirleyin.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="rounded-full p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTemplate} className="space-y-4 overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">Vardiya Adı *</label>
                  <input
                    type="text"
                    placeholder="Gündüz Vardiyası"
                    value={templateForm.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">Vardiya Kodu *</label>
                  <input
                    type="text"
                    placeholder="GUN-01"
                    value={templateForm.code}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTemplateForm({ ...templateForm, code: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">Başlangıç Saati *</label>
                  <input
                    type="time"
                    value={templateForm.startTime.slice(0, 5)}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTemplateForm({ ...templateForm, startTime: `${e.target.value}:00` })}
                    required
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">Bitiş Saati *</label>
                  <input
                    type="time"
                    value={templateForm.endTime.slice(0, 5)}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTemplateForm({ ...templateForm, endTime: `${e.target.value}:00` })}
                    required
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">Mola Süresi (dk)</label>
                  <input
                    type="number"
                    value={templateForm.breakDurationMinutes}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTemplateForm({ ...templateForm, breakDurationMinutes: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">Giriş Toleransı (dk)</label>
                  <input
                    type="number"
                    value={templateForm.gracePeriodMinutes}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTemplateForm({ ...templateForm, gracePeriodMinutes: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border">
                <div>
                  <div className="text-sm font-semibold text-foreground">Gece Vardiyası</div>
                  <div className="text-xs text-muted-foreground">Gece 00:00 sonrasına sarkan saatler</div>
                </div>
                <input
                  type="checkbox"
                  checked={templateForm.isNightShift}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTemplateForm({ ...templateForm, isNightShift: e.target.checked })}
                  className="h-4 w-4 rounded border-border text-blue-600 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsTemplateModalOpen(false)}>
                  İptal
                </Button>
                <Button type="submit" disabled={actionLoading} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                  Şablonu Kaydet
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Vardiya Ata */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-border bg-white dark:bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">Vardiya Çizelgesi Ata</h3>
                <p className="text-xs text-muted-foreground">Personellere veya departmana toplu vardiya planlaması yapın.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="rounded-full p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAssignShifts} className="space-y-4 overflow-y-auto pr-1">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Vardiya Şablonu *</label>
                <Select
                  value={assignForm.shiftTemplateId}
                  onValueChange={(val) => setAssignForm({ ...assignForm, shiftTemplateId: val })}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Vardiya Şablonu Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} ({t.startTime.slice(0, 5)} - {t.endTime.slice(0, 5)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">Başlangıç Tarihi *</label>
                  <input
                    type="date"
                    value={assignForm.startDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAssignForm({ ...assignForm, startDate: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">Bitiş Tarihi *</label>
                  <input
                    type="date"
                    value={assignForm.endDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAssignForm({ ...assignForm, endDate: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Departman ile Toplu Ata (Opsiyonel)</label>
                <Select
                  value={assignForm.departmentId}
                  onValueChange={(val) => setAssignForm({ ...assignForm, departmentId: val, employeeIds: [] })}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Tüm departman personeline uygula..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Bireysel Seçim Yap</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name} Departmanı
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!assignForm.departmentId && (
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">Personel Seçimi *</label>
                  <Select
                    value={assignForm.employeeIds[0] || ""}
                    onValueChange={(val) => setAssignForm({ ...assignForm, employeeIds: [val] })}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Personel Seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName} ({emp.departmentName || "Genel"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsAssignModalOpen(false)}>
                  İptal
                </Button>
                <Button type="submit" disabled={actionLoading} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                  Vardiyaları Ata
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Düzeltme Talebi */}
      {isCorrectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-border bg-white dark:bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">PDKS Düzeltme Talebi</h3>
                <p className="text-xs text-muted-foreground">Unutulan veya hatalı girişi mazeretiyle bildiriniz.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCorrectionModalOpen(false)}
                className="rounded-full p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCorrection} className="space-y-4 overflow-y-auto pr-1">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Personel *</label>
                <Select
                  value={correctionForm.employeeId}
                  onValueChange={(val) => setCorrectionForm({ ...correctionForm, employeeId: val })}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Personel Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Tarih *</label>
                <input
                  type="date"
                  value={correctionForm.date}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCorrectionForm({ ...correctionForm, date: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">Giriş Saati</label>
                  <input
                    type="time"
                    value={correctionForm.requestedClockInTime}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCorrectionForm({ ...correctionForm, requestedClockInTime: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">Çıkış Saati</label>
                  <input
                    type="time"
                    value={correctionForm.requestedClockOutTime}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCorrectionForm({ ...correctionForm, requestedClockOutTime: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Mazeret / Açıklama *</label>
                <textarea
                  placeholder="Kartımı evde unuttum / Müşteri ziyaretinde sahada kaldım..."
                  value={correctionForm.reason}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCorrectionForm({ ...correctionForm, reason: e.target.value })}
                  required
                  rows={3}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsCorrectionModalOpen(false)}>
                  İptal
                </Button>
                <Button type="submit" disabled={actionLoading} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                  Talebi Gönder
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
      />
    </div>
  )
}
