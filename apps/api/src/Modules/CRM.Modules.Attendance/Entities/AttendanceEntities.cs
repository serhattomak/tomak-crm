using System.ComponentModel.DataAnnotations.Schema;
using CRM.BuildingBlocks.Tenancy;

namespace CRM.Modules.Attendance.Entities;

[Table("shift_templates", Schema = "public")]
public class ShiftTemplate : ITenantScopedEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string ColorHex { get; set; } = "#3B82F6";
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
    public int BreakDurationMinutes { get; set; } = 60;
    public int GracePeriodMinutes { get; set; } = 15; // Arrival grace tolerance
    public bool IsNightShift { get; set; } = false;
    public bool IsFlexible { get; set; } = false;
    public int MinWorkingHours { get; set; } = 8;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<ShiftSchedule> Schedules { get; set; } = [];
}

[Table("shift_schedules", Schema = "public")]
public class ShiftSchedule : ITenantScopedEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid ShiftTemplateId { get; set; }
    public ShiftTemplate? ShiftTemplate { get; set; }
    public Guid EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public Guid? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    public DateOnly Date { get; set; }
    public TimeSpan? CustomStartTime { get; set; }
    public TimeSpan? CustomEndTime { get; set; }
    public string Status { get; set; } = "Scheduled"; // Scheduled, Completed, Swapped, Cancelled
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

[Table("attendance_records", Schema = "public")]
public class AttendanceRecord : ITenantScopedEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public Guid? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    public DateOnly Date { get; set; }
    public Guid? ShiftScheduleId { get; set; }
    public ShiftSchedule? ShiftSchedule { get; set; }

    public DateTimeOffset? FirstClockIn { get; set; }
    public DateTimeOffset? LastClockOut { get; set; }

    public int TotalWorkedMinutes { get; set; } = 0;
    public int TotalBreakMinutes { get; set; } = 0;
    public int ExpectedWorkedMinutes { get; set; } = 480; // 8 hours default

    public int OvertimeMinutes { get; set; } = 0; // 1.5x regular overtime
    public int HolidayOvertimeMinutes { get; set; } = 0; // 2.0x holiday overtime
    public int LateMinutes { get; set; } = 0;
    public int EarlyLeaveMinutes { get; set; } = 0;

    public string Status { get; set; } = "Present"; // Present, Late, EarlyDeparture, Absent, OnLeave, Anomaly
    public bool IsApproved { get; set; } = false;
    public Guid? ApprovedByUserId { get; set; }
    public string? ApprovedByUserName { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public string? AdminNotes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<AttendancePunch> Punches { get; set; } = [];
}

[Table("attendance_punches", Schema = "public")]
public class AttendancePunch : ITenantScopedEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid AttendanceRecordId { get; set; }
    public AttendanceRecord? AttendanceRecord { get; set; }
    public Guid EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;

    public DateTimeOffset PunchTime { get; set; } = DateTimeOffset.UtcNow;
    public string PunchType { get; set; } = "ClockIn"; // ClockIn, ClockOut, BreakStart, BreakEnd
    public string? BreakType { get; set; } // Lunch, Coffee, Personal, Official
    public string Source { get; set; } = "Web"; // Web, Mobile, DeviceBiometric, DeviceCard, KioskQR, ManualAdmin
    public Guid? DeviceId { get; set; }
    public string? IpAddress { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public bool IsWithinGeofence { get; set; } = true;
    public string? VerificationMethod { get; set; } = "WebSession"; // WebSession, Pin, Biometric, RFID, QR, AdminOverride
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

[Table("attendance_devices", Schema = "public")]
public class AttendanceDevice : ITenantScopedEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string DeviceCode { get; set; } = string.Empty;
    public string DeviceType { get; set; } = "RFIDCard"; // RFIDCard, Fingerprint, FaceRecognition, KioskTablet
    public string? IpAddress { get; set; }
    public int? Port { get; set; }
    public string ApiKey { get; set; } = Guid.NewGuid().ToString("N");
    public string? LocationName { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? LastPingAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

[Table("attendance_correction_requests", Schema = "public")]
public class AttendanceCorrectionRequest : ITenantScopedEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public DateTimeOffset? RequestedClockIn { get; set; }
    public DateTimeOffset? RequestedClockOut { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string Status { get; set; } = "Pending"; // Pending, Approved, Rejected
    public Guid? ReviewedByUserId { get; set; }
    public string? ReviewedByUserName { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? RejectionReason { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

[Table("shift_swap_requests", Schema = "public")]
public class ShiftSwapRequest : ITenantScopedEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid RequesterEmployeeId { get; set; }
    public string RequesterEmployeeName { get; set; } = string.Empty;
    public Guid RequesterShiftId { get; set; }
    public Guid TargetEmployeeId { get; set; }
    public string TargetEmployeeName { get; set; } = string.Empty;
    public Guid TargetShiftId { get; set; }
    public string Status { get; set; } = "PendingTargetAcceptance"; // PendingTargetAcceptance, PendingManagerApproval, Approved, Rejected, Cancelled
    public string? Reason { get; set; }
    public Guid? ManagerApprovedByUserId { get; set; }
    public string? ManagerApprovedByUserName { get; set; }
    public DateTime? ManagerApprovedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
