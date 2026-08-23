using System.Text.Json;
using CRM.BuildingBlocks.Tenancy;

namespace CRM.Modules.Compliance.Entities;

public class ComplianceRule : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }

    public string Code { get; set; } = string.Empty;
    public string LawReference { get; set; } = string.Empty;
    public string Category { get; set; } = "WorkingHours"; // WorkingHours, Leaves, HealthSafety, Payroll, Contracts
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string PenaltyRiskLevel { get; set; } = "Medium"; // Low, Medium, High, Critical
    public string? PenaltyDescription { get; set; }
    public string EnforcementLevel { get; set; } = "SoftWarning"; // HardBlock, SoftWarning, Disabled
    public string ThresholdConfigJson { get; set; } = "{}";
    public bool IsSystemRule { get; set; } = true;
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public virtual ICollection<ComplianceViolation> Violations { get; set; } = new List<ComplianceViolation>();

    public TConfig GetThresholdConfig<TConfig>() where TConfig : new()
    {
        if (string.IsNullOrWhiteSpace(ThresholdConfigJson)) return new TConfig();
        try
        {
            return JsonSerializer.Deserialize<TConfig>(ThresholdConfigJson, JsonDefaults.Options) ?? new TConfig();
        }
        catch
        {
            return new TConfig();
        }
    }
}

public class ComplianceViolation : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }

    public Guid? RuleId { get; set; }
    public virtual ComplianceRule? Rule { get; set; }

    public string RuleCode { get; set; } = string.Empty;
    public string LawReference { get; set; } = string.Empty;
    public Guid? EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public string ModuleSource { get; set; } = "Attendance"; // Attendance, Leaves, Payroll, Organization
    public string? EntityId { get; set; }
    public string Severity { get; set; } = "Warning"; // Warning, Violation, CriticalRisk
    public string Details { get; set; } = string.Empty;
    public string ViolationDataJson { get; set; } = "{}";
    public bool IsOverridden { get; set; } = false;
    public Guid? OverriddenByUserId { get; set; }
    public string? OverrideReason { get; set; }
    public DateTimeOffset? OverriddenAt { get; set; }
    public string Status { get; set; } = "Active"; // Active, Resolved, Overridden
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class WorkingHoursThresholdConfig
{
    public double MaxDailyHours { get; set; } = 11.0;
    public double MaxWeeklyHours { get; set; } = 45.0;
    public double MaxNightShiftHours { get; set; } = 7.5;
    public double MinRestBetweenShiftsHours { get; set; } = 11.0;
    public double MinWeeklyRestHours { get; set; } = 24.0;
    public double MaxOvertimeYearlyHours { get; set; } = 270.0;
    public double MinBreakShortShiftMinutes { get; set; } = 15.0; // <= 4 hours
    public double MinBreakMediumShiftMinutes { get; set; } = 30.0; // 4 to 7.5 hours
    public double MinBreakLongShiftMinutes { get; set; } = 60.0; // > 7.5 hours
}

public class LeaveThresholdConfig
{
    public int MinLeaveDays1To5Years { get; set; } = 14;
    public int MinLeaveDays5To15Years { get; set; } = 20;
    public int MinLeaveDays15PlusYears { get; set; } = 26;
    public int MinLeaveDaysUnder18OrOver50 { get; set; } = 20;
    public int MarriageLeaveDays { get; set; } = 3;
    public int BereavementLeaveDays { get; set; } = 3;
    public int PaternityLeaveDays { get; set; } = 5;
    public int DisabledChildTreatmentLeaveDays { get; set; } = 10;
    public int MaternityLeaveWeeks { get; set; } = 16;
    public double DailyLactationLeaveHours { get; set; } = 1.5;
}

public class ISGThresholdConfig
{
    public int VeryHazardousHealthExamMonths { get; set; } = 12; // 1 year
    public int HazardousHealthExamMonths { get; set; } = 36; // 3 years
    public int LessHazardousHealthExamMonths { get; set; } = 60; // 5 years
    public bool PregnantNightShiftAllowed { get; set; } = false;
    public double PregnantMaxDailyHours { get; set; } = 7.5;
    public int MandatoryAnnualTrainingHoursVeryHazardous { get; set; } = 16;
    public int MandatoryAnnualTrainingHoursHazardous { get; set; } = 12;
    public int MandatoryAnnualTrainingHoursLessHazardous { get; set; } = 8;
}

public class PayrollThresholdConfig
{
    public decimal SeveranceCeilingAmount { get; set; } = 46948.50m; // 2026 H1 estimated
    public double OvertimePayMultiplier { get; set; } = 1.50; // %50 zamlı
    public double PublicHolidayPayMultiplier { get; set; } = 2.00; // %100 zamlı (1 yevmiye ilave)
}

public class ComplianceValidationResult
{
    public bool IsCompliant { get; set; } = true;
    public bool HasHardBlock { get; set; } = false;
    public List<ComplianceViolationDetail> Violations { get; set; } = new();
}

public class ComplianceViolationDetail
{
    public string RuleCode { get; set; } = string.Empty;
    public string LawReference { get; set; } = string.Empty;
    public string RuleName { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Severity { get; set; } = "Warning";
    public string EnforcementLevel { get; set; } = "SoftWarning"; // HardBlock or SoftWarning
    public string Details { get; set; } = string.Empty;
    public string? PenaltyRisk { get; set; }
    public Dictionary<string, object?> ContextData { get; set; } = new();
}

internal static class JsonDefaults
{
    public static readonly JsonSerializerOptions Options = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };
}
