using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Leaves.Entities;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Leaves.Data;

public class LeavesDbContext(
    DbContextOptions<LeavesDbContext> options,
    ICurrentTenant currentTenant) : DbContext(options)
{
    public DbSet<LeaveBalance> LeaveBalances => Set<LeaveBalance>();
    public DbSet<LeaveRequest> LeaveRequests => Set<LeaveRequest>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // 1. LeaveBalance
        modelBuilder.Entity<LeaveBalance>(entity =>
        {
            entity.ToTable("leave_balances");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.EmployeeId).HasColumnName("employee_id").IsRequired();
            entity.Property(e => e.Year).HasColumnName("year").IsRequired();
            entity.Property(e => e.TotalDays).HasColumnName("total_days").HasPrecision(5, 2);
            entity.Property(e => e.UsedDays).HasColumnName("used_days").HasPrecision(5, 2);
            entity.Property(e => e.PendingDays).HasColumnName("pending_days").HasPrecision(5, 2);
            entity.Property(e => e.RemainingDays).HasColumnName("remaining_days").HasPrecision(5, 2);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        // 2. LeaveRequest
        modelBuilder.Entity<LeaveRequest>(entity =>
        {
            entity.ToTable("leave_requests");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.EmployeeId).HasColumnName("employee_id").IsRequired();
            entity.Property(e => e.EmployeeName).HasColumnName("employee_name").HasMaxLength(255).IsRequired();
            entity.Property(e => e.DepartmentId).HasColumnName("department_id");
            entity.Property(e => e.DepartmentName).HasColumnName("department_name").HasMaxLength(255);
            entity.Property(e => e.LeaveType).HasColumnName("leave_type").HasMaxLength(50).IsRequired();
            entity.Property(e => e.StartDate).HasColumnName("start_date").IsRequired();
            entity.Property(e => e.EndDate).HasColumnName("end_date").IsRequired();
            entity.Property(e => e.TotalDays).HasColumnName("total_days").HasPrecision(5, 2);
            entity.Property(e => e.IsHalfDay).HasColumnName("is_half_day");
            entity.Property(e => e.HalfDayPeriod).HasColumnName("half_day_period").HasMaxLength(20);
            entity.Property(e => e.Reason).HasColumnName("reason");
            entity.Property(e => e.EmergencyContact).HasColumnName("emergency_contact").HasMaxLength(255);
            entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(50).IsRequired();
            entity.Property(e => e.ApprovedByUserId).HasColumnName("approved_by_user_id");
            entity.Property(e => e.ApprovedByUserName).HasColumnName("approved_by_user_name").HasMaxLength(255);
            entity.Property(e => e.ApprovedAt).HasColumnName("approved_at");
            entity.Property(e => e.RejectionReason).HasColumnName("rejection_reason");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        if (currentTenant.Id.HasValue && currentTenant.Id.Value != Guid.Empty)
        {
            foreach (var entry in ChangeTracker.Entries<ITenantScopedEntity>())
            {
                if (entry.State == EntityState.Added && entry.Entity.TenantId == Guid.Empty)
                {
                    entry.Entity.TenantId = currentTenant.Id.Value;
                }
            }
        }

        return base.SaveChangesAsync(cancellationToken);
    }
}
