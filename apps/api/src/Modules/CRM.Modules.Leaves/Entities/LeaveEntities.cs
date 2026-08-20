using CRM.BuildingBlocks.Tenancy;

namespace CRM.Modules.Leaves.Entities;

public class LeaveBalance : ITenantScopedEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid EmployeeId { get; set; }
    public int Year { get; set; }
    public decimal TotalDays { get; set; } = 14.00m;
    public decimal UsedDays { get; set; } = 0.00m;
    public decimal PendingDays { get; set; } = 0.00m;
    public decimal RemainingDays { get; set; } = 14.00m;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class LeaveRequest : ITenantScopedEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public Guid? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    public string LeaveType { get; set; } = "Annual"; // Annual, Casual, Sick, Unpaid, Marriage, Maternity, Paternity, Bereavement, Other
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public decimal TotalDays { get; set; } = 1.00m;
    public bool IsHalfDay { get; set; } = false;
    public string? HalfDayPeriod { get; set; } // Morning, Afternoon
    public string? Reason { get; set; }
    public string? EmergencyContact { get; set; }
    public string Status { get; set; } = "Pending"; // Pending, Approved, Rejected, Cancelled
    public Guid? ApprovedByUserId { get; set; }
    public string? ApprovedByUserName { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public string? RejectionReason { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
