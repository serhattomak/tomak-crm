using System.ComponentModel.DataAnnotations.Schema;
using CRM.BuildingBlocks.Tenancy;

namespace CRM.Modules.Recruitment.Entities;

/// <summary>VARCHAR constants for job_requisitions.status — no CREATE TYPE, VARCHAR only.</summary>
public static class RequisitionStatus
{
    public const string Draft = "Draft";
    public const string Open = "Open";
    public const string Closed = "Closed";
    public const string Cancelled = "Cancelled";
}

/// <summary>VARCHAR constants for job_requisitions.employment_type.</summary>
public static class EmploymentType
{
    public const string FullTime = "FullTime";
    public const string PartTime = "PartTime";
    public const string Contract = "Contract";
    public const string Intern = "Intern";
}

/// <summary>VARCHAR constants for job_requisitions.work_model.</summary>
public static class WorkModel
{
    public const string OnSite = "OnSite";
    public const string Remote = "Remote";
    public const string Hybrid = "Hybrid";
}

/// <summary>VARCHAR constants for job_requisitions.priority.</summary>
public static class RequisitionPriority
{
    public const string Low = "Low";
    public const string Medium = "Medium";
    public const string High = "High";
    public const string Urgent = "Urgent";
}

/// <summary>VARCHAR constants for candidates.source.</summary>
public static class CandidateSource
{
    public const string Manual = "Manual";
    public const string CsvImport = "CsvImport";
    public const string PublicForm = "PublicForm";
    public const string Referral = "Referral";
}

/// <summary>VARCHAR constants for recruitment_stages.stage_type (lowercase to match seed).</summary>
public static class StageType
{
    public const string Active = "active";
    public const string Hired = "hired";
    public const string Rejected = "rejected";
    public const string Withdrawn = "withdrawn";
}

/// <summary>VARCHAR constants for applications.status.</summary>
public static class ApplicationStatus
{
    public const string Active = "Active";
    public const string Hired = "Hired";
    public const string Rejected = "Rejected";
    public const string Withdrawn = "Withdrawn";
    public const string Archived = "Archived";
}

[Table("job_requisitions", Schema = "public")]
public class JobRequisition : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }

    public string Title { get; set; } = string.Empty;
    public Guid? DepartmentId { get; set; }
    public Guid? JobPositionId { get; set; }
    public int Headcount { get; set; } = 1;
    public string? EmploymentType { get; set; }
    public string? WorkModel { get; set; }
    public string? Location { get; set; }
    public decimal? MinSalary { get; set; }
    public decimal? MaxSalary { get; set; }
    public string Currency { get; set; } = "TRY";
    public string? Description { get; set; }
    public string? Requirements { get; set; }
    public string Status { get; set; } = RequisitionStatus.Draft;
    public bool IsPublished { get; set; }
    public DateTime? PublishedAt { get; set; }
    public DateOnly? ClosingDate { get; set; }
    public Guid? HiringManagerId { get; set; }
    public string Priority { get; set; } = RequisitionPriority.Medium;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation — optional FKs to organization entities (cross-module, SET NULL on delete)
    public ICollection<Application> Applications { get; set; } = [];
}

[Table("recruitment_stages", Schema = "public")]
public class RecruitmentStage : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }

    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public string ColorHex { get; set; } = "#3B82F6";
    public bool IsDefault { get; set; }
    public string StageType { get; set; } = "active";
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Application> Applications { get; set; } = [];
}

[Table("candidates", Schema = "public")]
public class Candidate : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }

    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public DateOnly? BirthDate { get; set; }
    public string? Address { get; set; }
    public string Source { get; set; } = CandidateSource.Manual;
    public string[]? Tags { get; set; }
    public string? CvFileUrl { get; set; }
    public string? CvFileName { get; set; }
    public bool ConsentGiven { get; set; }
    public DateTime? ConsentGivenAt { get; set; }
    public string? Notes { get; set; }
    public DateTime? DeletedAt { get; set; }
    public Guid? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public string FullName => $"{FirstName} {LastName}".Trim();

    public ICollection<Application> Applications { get; set; } = [];
}

[Table("applications", Schema = "public")]
public class Application : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }

    public Guid CandidateId { get; set; }
    public Guid RequisitionId { get; set; }
    public Guid? StageId { get; set; }
    public string Status { get; set; } = ApplicationStatus.Active;
    public decimal? Score { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Candidate? Candidate { get; set; }
    public JobRequisition? Requisition { get; set; }
    public RecruitmentStage? Stage { get; set; }
}
