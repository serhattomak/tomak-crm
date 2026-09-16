# Spec: Vardiya Planlama ve PDKS / Devam Takip Sistemi (Shifts & Attendance Management)

Status: ready-for-agent

## Problem Statement

İşletmelerde çalışanların vardiya planlaması, günlük giriş-çıkış saatleri, mola kullanımları, geç kalma / erken çıkma durumları, fazla mesai saatleri ve anlık kimlerin iş yerinde olduğunun takibi dağınık veya manuel yürütülmektedir. Ayrıca PDKS (Personel Devam Kontrol Sistemi) cihazları (RFID kart, parmak izi, yüz tanıma), web/mobil üzerinden giriş-çıkış ve kiosk modunun tek bir merkezi CRM yapısında toplanamaması; vardiya planlarının departman ve takımlara hiyerarşik atanamaması; ve ay sonunda fiili çalışma verilerinin Bordro/Puantaj modülüne otomatik aktarılamaması operasyonel iş yüküne ve bordro hatalarına yol açmaktadır.

## Solution

Sisteme çok kiracılı (multi-tenant) mimaride çalışan, uçtan uca modern bir `CRM.Modules.Attendance` backend modülü ve Next.js tabanlı kapsamlı bir Vardiya & PDKS Yönetim Paneli ile Çalışan Zaman Takip Arayüzü kazandırılacaktır.

Bu çözüm;
1. **Esnek & Dinamik Vardiya Planlama (Shifts & Scheduling):**
   - Sabit, dönüşümlü (gündüz, gece, 3 vardiya) ve serbest/esnek çalışma saatleri şablonları.
   - Departmanlara, pozisyonlara, takımlara ve bireysel çalışanlara haftalık/aylık takvim üzerinden toplu veya tekil vardiya ataması.
   - Vardiya takası ve çalışan açık vardiya alma talepleri ile yönetici onay akışı.
2. **Çok Kanallı PDKS & Giriş-Çıkış Doğrulama (Punch & Clock In/Out):**
   - Web/Panel üzerinden tek tıkla `Giriş Yap (Clock In)`, `Mola Başlat/Bitir (Break)` ve `Çıkış Yap (Clock Out)`.
   - PDKS Donanım Entegrasyonu (RFID Kart, Parmak İzi, Yüz Tanıma cihazlarından API / Webhook ve CSV log içe aktarımı).
   - Ortak tabletler için QR Kod & Kiosk Modu.
   - Konum & Geofence doğrulaması (mobil/web girişlerde şirket sınırları içinde olma teyidi).
3. **Mola, Tolerans ve Otomatik Fazla Mesai (Overtime) Motoru:**
   - Mola türleri (öğle yemeği, çay/kahve, serbest süre) ve aşım takibi.
   - Giriş-çıkış tolerans kuralları (örn: 15 dk esneklik, tolerans üstü geç kalma/erken çıkma tespiti).
   - Planlanan vardiya ile fiili süre farkından %50 (hafta içi) ve %100 (hafta sonu / bayram) otomatik fazla mesai hesaplama.
   - Giriş yapıp çıkışı unutanlar ve habersiz devamsızlıklar için otomatik anomali tespiti.
4. **Canlı PDKS Monitörü (Live Attendance Dashboard):**
   - Anlık "Kim İçeride?", "Kim Molada?", "Kim Geç Kaldı?", "Kim Gelmedi?" canlı izleme paneli.
5. **Yönetici Manuel Düzeltme & Talep Akışı:**
   - Kartını unutan veya girişini geç okutan çalışanlar için düzeltme talep formu ve yönetici onay mekanizması.
6. **Bordro & Puantaj Doğrudan Entegrasyonu:**
   - Ay sonunda toplanan fiili çalışma günleri, eksik günler, hafta tatili mesaileri ve fazla mesai saatlerinin doğrudan `CRM.Modules.Payroll` puantaj cetveline tek tıkla aktarımı.

---

## User Stories

1. As an HR Manager, I want to define reusable shift templates (e.g. 08:30-17:30, 16:00-24:00, Flexible 45h/week), so that I can establish organizational working schedules.
2. As a Shift Supervisor, I want to assign shifts in bulk to entire departments, teams, or specific roles across a weekly or monthly schedule grid, so that team planning takes minimal effort.
3. As a Department Lead, I want to assign customized shifts to individual employees with specific date ranges and repeat rules (e.g. rotating 2-shift or 3-shift schedules), so that complex shift patterns are automated.
4. As an Employee, I want to log into my CRM panel and see my upcoming shift schedule and assigned working hours, so that I can plan my work week accordingly.
5. As an Employee, I want to clock in with a single click ("Giriş Yap") on the web panel, so that my attendance start time is accurately logged with timestamp and IP/location.
6. As an Employee, I want to start and end my breaks ("Mola Başlat" / "Mola Bitir") with selectable break types (Lunch, Coffee Break, Personal), so that my break duration is transparently tracked.
7. As an Employee, I want to clock out at the end of my workday ("Çıkış Yap"), so that the system records my total shift duration and computes actual hours worked.
8. As a System Admin, I want to register physical PDKS biometric/card devices and ingest punch logs via secure REST API endpoints / webhooks, so that turnstile and terminal logs synchronize in real time.
9. As an HR Specialist, I want to upload CSV/Excel device punch logs manually, so that offline or batch-export PDKS devices can easily sync with the system.
10. As an HR Manager, I want to enable a QR Code Kiosk mode on a shared company tablet at the reception, so that employees can scan personal QR codes or badges to punch in/out rapidly.
11. As a Facility Manager, I want to set up geofencing with GPS coordinates and radius limits for branches/offices, so that mobile clock-ins outside approved company locations are flagged or restricted.
12. As an HR Specialist, I want to configure tolerance limits (e.g. 15-minute grace period for arrival/departure), so that minor deviations do not unnecessarily penalize employees.
13. As an HR Specialist, I want the system to automatically tag attendance records as "On-Time", "Late", "Early Departure", "Overtime", "Absent", or "Missing Clock-Out", so that daily compliance is clearly categorized.
14. As an Operations Manager, I want to view a Live PDKS Dashboard showing real-time statistics of who is currently working, who is on break, who is late, and who is absent today.
15. As a Shift Manager, I want to review and approve shift swap requests submitted between two employees, so that peer schedule adjustments remain under manager oversight.
16. As an Employee who forgot to clock in/out, I want to submit an Attendance Correction Request with reason and requested timestamps, so that my supervisor can review and rectify my records.
17. As an HR Manager, I want to review, approve, or reject attendance correction requests, so that company records maintain auditable integrity.
18. As a Payroll Specialist, I want the attendance engine to compute net regular hours, overtime hours (1.5x regular overtime, 2.0x weekend/holiday overtime), and late deductions for any given date range.
19. As an HR & Payroll Manager, I want to sync aggregated monthly attendance timesheets directly into the `Payroll` module's monthly Puantaj with one click, eliminating manual data entry.
20. As a Business Executive, I want to export departmental attendance reports, punctuality scores, and overtime summaries to Excel and PDF formats for management review.
21. As an Employee, I want to view my historical monthly attendance timeline with daily worked hours, break durations, and overtime records.

---

## Implementation Decisions

### 1. Architectural Placement & Modularity
- A new standalone backend module `CRM.Modules.Attendance` will be created in `apps/api/src/Modules/CRM.Modules.Attendance` following CQRS, EF Core, and FastEndpoints/IEndpoint architecture.
- Full multi-tenant isolation with `ITenantScopedEntity` on all attendance entities.
- Seamless integration with `CRM.Modules.Organization` (Departments, Teams, Employees), `CRM.Modules.Leaves` (approved leaves auto-reflecting on attendance schedule), and `CRM.Modules.Payroll` (direct timesheet push to Puantaj).

### 2. Domain Entities & Database Schema

- **`ShiftTemplate`**:
  - `Id`, `TenantId`, `Name` (e.g., "Gündüz Vardiyası 08:30 - 17:30"), `Code`, `ColorHex`
  - `StartTime` (TimeSpan), `EndTime` (TimeSpan)
  - `BreakDurationMinutes` (int, e.g. 60 min), `PaidBreakMinutes` (int, e.g. 15 min)
  - `GracePeriodMinutes` (int, e.g. 15 min arrival tolerance)
  - `IsNightShift` (bool), `IsFlexible` (bool, min required hours per day)
  - `IsActive`, `CreatedAt`

- **`ShiftSchedule` / `EmployeeShift`**:
  - `Id`, `TenantId`, `ShiftTemplateId`, `EmployeeId`, `DepartmentId`, `TeamId`
  - `Date` (DateOnly)
  - `CustomStartTime`, `CustomEndTime` (overrides if applicable)
  - `Status`: `Scheduled`, `Completed`, `Swapped`, `Cancelled`
  - `Notes`

- **`AttendanceRecord` (Daily Master Record)**:
  - `Id`, `TenantId`, `EmployeeId`, `Date` (DateOnly), `ShiftScheduleId` (nullable)
  - `FirstClockIn`, `LastClockOut` (DateTimeOffset)
  - `TotalWorkedMinutes`, `TotalBreakMinutes`, `ExpectedWorkedMinutes`
  - `OvertimeMinutes` (1.5x regular overtime), `HolidayOvertimeMinutes` (2.0x holiday overtime)
  - `LateMinutes`, `EarlyLeaveMinutes`
  - `Status`: `Present`, `Late`, `EarlyDeparture`, `Absent`, `OnLeave`, `Holiday`, `Anomaly`
  - `IsApproved` (bool), `ApprovedByUserId`, `ApprovedAt`

- **`AttendancePunch` (Raw Punch Log)**:
  - `Id`, `TenantId`, `AttendanceRecordId`, `EmployeeId`
  - `PunchTime` (DateTimeOffset)
  - `PunchType`: `ClockIn`, `ClockOut`, `BreakStart`, `BreakEnd`
  - `BreakType`: `Lunch`, `Coffee`, `Personal`, `Official` (nullable)
  - `Source`: `Web`, `Mobile`, `DeviceBiometric`, `DeviceCard`, `KioskQR`, `ManualAdmin`
  - `DeviceId` (nullable), `IpAddress`, `Latitude`, `Longitude`, `IsWithinGeofence`
  - `VerificationMethod`: `Pin`, `Password`, `Biometric`, `RFID`, `QR`, `AdminOverride`

- **`AttendanceDevice`**:
  - `Id`, `TenantId`, `Name` (e.g., "Ana Giriş Turnike 1", "Yemekhane Kart Okuyucu")
  - `DeviceType`: `Fingerprint`, `FaceRecognition`, `RFIDCard`, `KioskTablet`
  - `IpAddress`, `Port`, `ApiKey` / `WebhookSecret`, `LocationName`, `IsActive`

- **`AttendanceCorrectionRequest`**:
  - `Id`, `TenantId`, `EmployeeId`, `Date` (DateOnly)
  - `RequestedClockIn`, `RequestedClockOut`
  - `Reason`, `Status`: `Pending`, `Approved`, `Rejected`
  - `ReviewedByUserId`, `ReviewedAt`, `RejectionReason`

- **`ShiftSwapRequest`**:
  - `Id`, `TenantId`, `RequesterEmployeeId`, `RequesterShiftId`
  - `TargetEmployeeId`, `TargetShiftId`
  - `Status`: `PendingTargetAcceptance`, `PendingManagerApproval`, `Approved`, `Rejected`, `Cancelled`
  - `ManagerApprovedByUserId`, `ManagerApprovedAt`

### 3. API Endpoints (FastEndpoints)
- **Shifts & Templates**:
  - `POST /api/attendance/shifts/templates` - Create shift template
  - `GET /api/attendance/shifts/templates` - List templates
  - `POST /api/attendance/shifts/assign` - Bulk or single shift assignment
  - `GET /api/attendance/shifts/calendar` - Get shift calendar by date range & department/team filter
  - `POST /api/attendance/shifts/swap` - Request shift swap
  - `POST /api/attendance/shifts/swap/{id}/review` - Approve/reject shift swap
- **Punches & Daily Tracking**:
  - `POST /api/attendance/punch` - Clock In / Clock Out / Break Punch (Web/Mobile)
  - `GET /api/attendance/today/status` - Current employee's active state (clocked in, on break, duration)
  - `POST /api/attendance/device/ingest` - Hardware webhook/API punch ingestion
  - `POST /api/attendance/kiosk/punch-qr` - Kiosk QR code punch
- **Live Monitor & Reports**:
  - `GET /api/attendance/live-monitor` - Real-time "Who's In / Who's on Break / Late / Absent" dashboard
  - `GET /api/attendance/records` - Filterable attendance records (by date, employee, department, status)
  - `POST /api/attendance/corrections` - Submit correction request
  - `POST /api/attendance/corrections/{id}/review` - Approve/reject correction
  - `POST /api/attendance/sync-to-payroll` - Aggregate and push monthly timesheet to `Payroll` puantaj

### 4. Frontend UI Architecture (`apps/web`)
- New top-level navigation item: `Vardiya & PDKS` (`/[tenantSlug]/attendance`).
- **Tab 1: 📊 Canlı PDKS Monitörü (Live Board)**:
  - Anlık aktif çalışan sayısı, moladakiler, geç kalanlar ve henüz gelmeyenlerin kartları.
  - Hızlı filtreli canlı personel listesi ve anlık çalışma süreleri.
- **Tab 2: 📅 Vardiya Takvimi & Planlama (Shift Scheduler)**:
  - İnteraktif haftalık/aylık grid görünümü. Departman/çalışan satırları, sürükle-bırak / tıkla-ata vardiya şablonları.
  - Vardiya şablon tanımlama modalı.
- **Tab 3: ⏱️ Devam & Giriş-Çıkış Kayıtları (Attendance Ledger)**:
  - Tarih, personel, departman, ilk giriş, son çıkış, toplam mola, normal süre, fazla mesai, gecikme ve durum etiketleri ile zengin veri tablosu.
  - Manuel düzeltme ve anomali filtreleri.
- **Tab 4: 📝 Talepler & Düzeltmeler (Correction & Swap Requests)**:
  - Bekleyen düzeltme talepleri ve vardiya takas onayları.
- **Tab 5: ⚙️ Cihazlar & PDKS Ayarları (Devices & Geofencing)**:
  - Kart/parmak izi cihaz tanımları, API anahtarları ve şube GPS geofence alanları.
- **Çalışan Hızlı Zaman Takip Widget'ı (Dashboard Header & Clock Bar)**:
  - Tek tıkla `Giriş Yap` / `Mola Başlat` / `Çıkış Yap` butonları ve anlık kronometre.

---

## Testing Decisions

- **Domain Logic & Calculations**:
  - Unit tests for shift tolerance calculation (e.g. 15 min grace period boundary conditions).
  - Unit tests for overtime accumulation (regular 1.5x vs holiday 2.0x).
  - Unit tests for overnight shifts (spanning across midnight 22:00 -> 06:00).
- **API & Integration Tests**:
  - Automated integration tests for clock-in/break/clock-out state transitions.
  - Device punch ingestion with duplicate punch prevention (debouncing rapid consecutive swipes).
  - Monthly attendance aggregation to Payroll puantaj payload verification.
- **UI Tests**:
  - Verification of responsive schedule calendar grid and one-click clock actions.

---

## Out of Scope

- Doğrudan donanım sürücüsü (C++ SDK) geliştirme (Donanımlar REST API / Webhook veya middleware köprüsü üzerinden veri gönderir).
- Fiziksel turnike kapı motoru röle tetikleme donanımı.

---

## Further Notes

Bu modül tamamlandığında CRM; Organizasyon & Çalışanlar -> Vardiya Planlama -> PDKS & Giriş-Çıkış -> İzin Yönetimi -> Bordro & Puantaj zincirini Türkiye standartlarında uçtan uca otomatik ve entegre bir şekilde birbirine bağlayacaktır.
