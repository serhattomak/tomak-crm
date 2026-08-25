using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Attendance.Entities;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Attendance.Data;

public class AttendanceDbContext(
    DbContextOptions<AttendanceDbContext> options,
    ICurrentTenant currentTenant) : DbContext(options)
{
    public DbSet<ShiftTemplate> ShiftTemplates => Set<ShiftTemplate>();
    public DbSet<ShiftSchedule> ShiftSchedules => Set<ShiftSchedule>();
    public DbSet<AttendanceRecord> AttendanceRecords => Set<AttendanceRecord>();
    public DbSet<AttendancePunch> AttendancePunches => Set<AttendancePunch>();
    public DbSet<AttendanceDevice> AttendanceDevices => Set<AttendanceDevice>();
    public DbSet<AttendanceCorrectionRequest> AttendanceCorrectionRequests => Set<AttendanceCorrectionRequest>();
    public DbSet<ShiftSwapRequest> ShiftSwapRequests => Set<ShiftSwapRequest>();
    public DbSet<ShiftTemplateBreak> ShiftTemplateBreaks => Set<ShiftTemplateBreak>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // 1. ShiftTemplate
        modelBuilder.Entity<ShiftTemplate>(entity =>
        {
            entity.ToTable("shift_templates");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(150).IsRequired();
            entity.Property(e => e.Code).HasColumnName("code").HasMaxLength(50).IsRequired();
            entity.Property(e => e.ColorHex).HasColumnName("color_hex").HasMaxLength(20);
            entity.Property(e => e.StartTime).HasColumnName("start_time").IsRequired();
            entity.Property(e => e.EndTime).HasColumnName("end_time").IsRequired();
            entity.Property(e => e.BreakDurationMinutes).HasColumnName("break_duration_minutes");
            entity.Property(e => e.GracePeriodMinutes).HasColumnName("grace_period_minutes");
            entity.Property(e => e.IsNightShift).HasColumnName("is_night_shift");
            entity.Property(e => e.IsFlexible).HasColumnName("is_flexible");
            entity.Property(e => e.MinWorkingHours).HasColumnName("min_working_hours");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        // 2. ShiftSchedule
        modelBuilder.Entity<ShiftSchedule>(entity =>
        {
            entity.ToTable("shift_schedules");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.ShiftTemplateId).HasColumnName("shift_template_id").IsRequired();
            entity.Property(e => e.EmployeeId).HasColumnName("employee_id").IsRequired();
            entity.Property(e => e.EmployeeName).HasColumnName("employee_name").HasMaxLength(255).IsRequired();
            entity.Property(e => e.DepartmentId).HasColumnName("department_id");
            entity.Property(e => e.DepartmentName).HasColumnName("department_name").HasMaxLength(255);
            entity.Property(e => e.Date).HasColumnName("date").IsRequired();
            entity.Property(e => e.CustomStartTime).HasColumnName("custom_start_time");
            entity.Property(e => e.CustomEndTime).HasColumnName("custom_end_time");
            entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(50).IsRequired();
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(e => e.ShiftTemplate)
                .WithMany(st => st.Schedules)
                .HasForeignKey(e => e.ShiftTemplateId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        // 3. AttendanceRecord
        modelBuilder.Entity<AttendanceRecord>(entity =>
        {
            entity.ToTable("attendance_records");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.EmployeeId).HasColumnName("employee_id").IsRequired();
            entity.Property(e => e.EmployeeName).HasColumnName("employee_name").HasMaxLength(255).IsRequired();
            entity.Property(e => e.DepartmentId).HasColumnName("department_id");
            entity.Property(e => e.DepartmentName).HasColumnName("department_name").HasMaxLength(255);
            entity.Property(e => e.Date).HasColumnName("date").IsRequired();
            entity.Property(e => e.ShiftScheduleId).HasColumnName("shift_schedule_id");

            entity.Property(e => e.FirstClockIn).HasColumnName("first_clock_in");
            entity.Property(e => e.LastClockOut).HasColumnName("last_clock_out");

            entity.Property(e => e.TotalWorkedMinutes).HasColumnName("total_worked_minutes");
            entity.Property(e => e.TotalBreakMinutes).HasColumnName("total_break_minutes");
            entity.Property(e => e.ExpectedWorkedMinutes).HasColumnName("expected_worked_minutes");

            entity.Property(e => e.OvertimeMinutes).HasColumnName("overtime_minutes");
            entity.Property(e => e.HolidayOvertimeMinutes).HasColumnName("holiday_overtime_minutes");
            entity.Property(e => e.LateMinutes).HasColumnName("late_minutes");
            entity.Property(e => e.EarlyLeaveMinutes).HasColumnName("early_leave_minutes");

            entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(50).IsRequired();
            entity.Property(e => e.IsApproved).HasColumnName("is_approved");
            entity.Property(e => e.ApprovedByUserId).HasColumnName("approved_by_user_id");
            entity.Property(e => e.ApprovedByUserName).HasColumnName("approved_by_user_name").HasMaxLength(255);
            entity.Property(e => e.ApprovedAt).HasColumnName("approved_at");
            entity.Property(e => e.AdminNotes).HasColumnName("admin_notes");

            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(e => e.ShiftSchedule)
                .WithMany()
                .HasForeignKey(e => e.ShiftScheduleId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        // 4. AttendancePunch
        modelBuilder.Entity<AttendancePunch>(entity =>
        {
            entity.ToTable("attendance_punches");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.AttendanceRecordId).HasColumnName("attendance_record_id").IsRequired();
            entity.Property(e => e.EmployeeId).HasColumnName("employee_id").IsRequired();
            entity.Property(e => e.EmployeeName).HasColumnName("employee_name").HasMaxLength(255).IsRequired();

            entity.Property(e => e.PunchTime).HasColumnName("punch_time").IsRequired();
            entity.Property(e => e.PunchType).HasColumnName("punch_type").HasMaxLength(50).IsRequired();
            entity.Property(e => e.BreakType).HasColumnName("break_type").HasMaxLength(50);
            entity.Property(e => e.Source).HasColumnName("source").HasMaxLength(50).IsRequired();
            entity.Property(e => e.DeviceId).HasColumnName("device_id");
            entity.Property(e => e.IpAddress).HasColumnName("ip_address").HasMaxLength(100);
            entity.Property(e => e.Latitude).HasColumnName("latitude");
            entity.Property(e => e.Longitude).HasColumnName("longitude");
            entity.Property(e => e.IsWithinGeofence).HasColumnName("is_within_geofence");
            entity.Property(e => e.VerificationMethod).HasColumnName("verification_method").HasMaxLength(50);
            entity.Property(e => e.Note).HasColumnName("note");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");

            entity.HasOne(e => e.AttendanceRecord)
                .WithMany(ar => ar.Punches)
                .HasForeignKey(e => e.AttendanceRecordId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        // 5. AttendanceDevice
        modelBuilder.Entity<AttendanceDevice>(entity =>
        {
            entity.ToTable("attendance_devices");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(150).IsRequired();
            entity.Property(e => e.DeviceCode).HasColumnName("device_code").HasMaxLength(50).IsRequired();
            entity.Property(e => e.DeviceType).HasColumnName("device_type").HasMaxLength(50).IsRequired();
            entity.Property(e => e.IpAddress).HasColumnName("ip_address").HasMaxLength(100);
            entity.Property(e => e.Port).HasColumnName("port");
            entity.Property(e => e.ApiKey).HasColumnName("api_key").HasMaxLength(100).IsRequired();
            entity.Property(e => e.LocationName).HasColumnName("location_name").HasMaxLength(150);
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.LastPingAt).HasColumnName("last_ping_at");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        // 6. AttendanceCorrectionRequest
        modelBuilder.Entity<AttendanceCorrectionRequest>(entity =>
        {
            entity.ToTable("attendance_correction_requests");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.EmployeeId).HasColumnName("employee_id").IsRequired();
            entity.Property(e => e.EmployeeName).HasColumnName("employee_name").HasMaxLength(255).IsRequired();
            entity.Property(e => e.Date).HasColumnName("date").IsRequired();
            entity.Property(e => e.RequestedClockIn).HasColumnName("requested_clock_in");
            entity.Property(e => e.RequestedClockOut).HasColumnName("requested_clock_out");
            entity.Property(e => e.Reason).HasColumnName("reason").IsRequired();
            entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(50).IsRequired();
            entity.Property(e => e.ReviewedByUserId).HasColumnName("reviewed_by_user_id");
            entity.Property(e => e.ReviewedByUserName).HasColumnName("reviewed_by_user_name").HasMaxLength(255);
            entity.Property(e => e.ReviewedAt).HasColumnName("reviewed_at");
            entity.Property(e => e.RejectionReason).HasColumnName("rejection_reason");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        // 7. ShiftSwapRequest
        modelBuilder.Entity<ShiftSwapRequest>(entity =>
        {
            entity.ToTable("shift_swap_requests");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.RequesterEmployeeId).HasColumnName("requester_employee_id").IsRequired();
            entity.Property(e => e.RequesterEmployeeName).HasColumnName("requester_employee_name").HasMaxLength(255).IsRequired();
            entity.Property(e => e.RequesterShiftId).HasColumnName("requester_shift_id").IsRequired();
            entity.Property(e => e.TargetEmployeeId).HasColumnName("target_employee_id").IsRequired();
            entity.Property(e => e.TargetEmployeeName).HasColumnName("target_employee_name").HasMaxLength(255).IsRequired();
            entity.Property(e => e.TargetShiftId).HasColumnName("target_shift_id").IsRequired();
            entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(50).IsRequired();
            entity.Property(e => e.Reason).HasColumnName("reason");
            entity.Property(e => e.ManagerApprovedByUserId).HasColumnName("manager_approved_by_user_id");
            entity.Property(e => e.ManagerApprovedByUserName).HasColumnName("manager_approved_by_user_name").HasMaxLength(255);
            entity.Property(e => e.ManagerApprovedAt).HasColumnName("manager_approved_at");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        // 8. ShiftTemplateBreak — multiple break periods per shift template
        modelBuilder.Entity<ShiftTemplateBreak>(entity =>
        {
            entity.ToTable("shift_template_breaks", t => t.HasCheckConstraint("chk_shift_template_breaks_time_range", "end_time > start_time"));
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.ShiftTemplateId).HasColumnName("shift_template_id").IsRequired();
            entity.Property(e => e.Label).HasColumnName("label").HasMaxLength(50).IsRequired();
            entity.Property(e => e.StartTime)
                .HasColumnName("start_time")
                .HasColumnType("time without time zone")
                .IsRequired();
            entity.Property(e => e.EndTime)
                .HasColumnName("end_time")
                .HasColumnType("time without time zone")
                .IsRequired();
            entity.Property(e => e.SortOrder).HasColumnName("sort_order");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(e => e.ShiftTemplate)
                .WithMany(st => st.Breaks)
                .HasForeignKey(e => e.ShiftTemplateId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => e.ShiftTemplateId).HasDatabaseName("idx_shift_template_breaks_template");
            entity.HasIndex(e => new { e.TenantId, e.ShiftTemplateId }).HasDatabaseName("idx_shift_template_breaks_tenant_template");

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });
    }
}
