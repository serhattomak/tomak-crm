using CRM.Modules.Compliance.Entities;

namespace CRM.Modules.Compliance.Services;

public interface IComplianceEngine
{
    Task EnsureDefaultRulesSeededAsync(CancellationToken cancellationToken = default);

    Task<ComplianceValidationResult> ValidateShiftScheduleAsync(
        Guid employeeId,
        string employeeName,
        DateTime shiftStart,
        DateTime shiftEnd,
        double breakMinutes,
        double? currentWeekTotalHours = null,
        DateTime? previousShiftEnd = null,
        bool isPregnant = false,
        CancellationToken cancellationToken = default);

    Task<ComplianceValidationResult> ValidateLeaveRequestAsync(
        Guid employeeId,
        string employeeName,
        string leaveType,
        int requestedDays,
        int employeeSeniorityYears,
        int employeeAge,
        CancellationToken cancellationToken = default);

    Task<ComplianceValidationResult> ValidateHealthSafetyAsync(
        Guid employeeId,
        string employeeName,
        string hazardClass,
        DateTime? lastHealthExamDate,
        bool isPregnant = false,
        bool isNightShift = false,
        CancellationToken cancellationToken = default);

    Task<ComplianceScoreResult> CalculateComplianceScoreAsync(CancellationToken cancellationToken = default);

    Task<ComplianceViolation> LogViolationAsync(
        string ruleCode,
        Guid? employeeId,
        string employeeName,
        string moduleSource,
        string? entityId,
        string severity,
        string details,
        Dictionary<string, object?> contextData,
        CancellationToken cancellationToken = default);
}

public class ComplianceScoreResult
{
    public double HealthScore { get; set; } = 100.0;
    public int ActiveViolationsCount { get; set; }
    public int HardBlockedAttemptsCount { get; set; }
    public int OverriddenViolationsCount { get; set; }
    public int TotalRulesCount { get; set; }
    public decimal EstimatedPenaltyExposureTl { get; set; }
    public List<ComplianceCategorySummary> CategorySummaries { get; set; } = new();
}

public class ComplianceCategorySummary
{
    public string Category { get; set; } = string.Empty;
    public string CategoryTitle { get; set; } = string.Empty;
    public int RulesCount { get; set; }
    public int ActiveViolations { get; set; }
    public double Score { get; set; } = 100.0;
    public string Status { get; set; } = "Good";
}
