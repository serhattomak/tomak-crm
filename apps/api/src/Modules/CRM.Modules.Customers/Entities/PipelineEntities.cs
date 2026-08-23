using System.ComponentModel.DataAnnotations.Schema;
using CRM.BuildingBlocks.Tenancy;

namespace CRM.Modules.Customers.Entities;

[Table("pipelines", Schema = "public")]
public class Pipeline : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Color { get; set; } = "#3B82F6";
    public string? Icon { get; set; } = "Kanban";
    public bool IsDefault { get; set; } = false;
    public bool IsActive { get; set; } = true;
    public string RoutingStrategy { get; set; } = "RoundRobin"; // "RoundRobin", "LeastLoaded", "OnlineOnly", "Manual"
    public Guid? TargetDepartmentId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<PipelineStage> Stages { get; set; } = [];
    public ICollection<Deal> Deals { get; set; } = [];
}

[Table("pipeline_stages", Schema = "public")]
public class PipelineStage : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Guid PipelineId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int OrderIndex { get; set; } = 0;
    public string? Color { get; set; } = "#6B7280";
    public int Probability { get; set; } = 50;
    public int? SlaHours { get; set; }
    public bool IsWonStage { get; set; } = false;
    public bool IsLostStage { get; set; } = false;
    public string? RoutingRuleOverride { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Pipeline? Pipeline { get; set; }
    public ICollection<Deal> Deals { get; set; } = [];
}

[Table("deals", Schema = "public")]
public class Deal : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Guid PipelineId { get; set; }
    public Guid StageId { get; set; }
    public Guid? CustomerId { get; set; }
    public string Title { get; set; } = string.Empty;
    public decimal Value { get; set; } = 0.00m;
    public string Currency { get; set; } = "TRY";
    public string Priority { get; set; } = "Medium"; // "Low", "Medium", "High", "Urgent"
    public string Status { get; set; } = "Open"; // "Open", "Won", "Lost", "Abandoned"
    public Guid? AssignedUserId { get; set; }
    public string? AssignedUserName { get; set; }
    public string Source { get; set; } = "Manual"; // "LiveChat", "WebForm", "Campaign", "InboundEmail", "Manual", "Api"
    public string? SourceReferenceId { get; set; } // e.g. CustomerSupportSession.Id
    public string? ContactName { get; set; }
    public string? ContactEmail { get; set; }
    public string? ContactPhone { get; set; }
    public DateTime StageEnteredAt { get; set; } = DateTime.UtcNow;
    public DateTime LastActivityAt { get; set; } = DateTime.UtcNow;
    public DateTime? SlaDueDate { get; set; }
    public string? LostReason { get; set; }
    public string? WonReason { get; set; }
    public string[]? Tags { get; set; }
    public string? MetadataJson { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Pipeline? Pipeline { get; set; }
    public PipelineStage? Stage { get; set; }
    public Customer? Customer { get; set; }
    public ICollection<DealActivity> Activities { get; set; } = [];
    public ICollection<DealNote> Notes { get; set; } = [];
}

[Table("deal_activities", Schema = "public")]
public class DealActivity : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Guid DealId { get; set; }
    public Guid? UserId { get; set; }
    public string? UserName { get; set; }
    public string ActivityType { get; set; } = "StageChange"; // StageChange, AssignmentChange, NoteAdded, ValueUpdated, StatusChange, ChatLinked
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Deal? Deal { get; set; }
}

[Table("deal_notes", Schema = "public")]
public class DealNote : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Guid DealId { get; set; }
    public Guid? UserId { get; set; }
    public string? UserName { get; set; }
    public string Content { get; set; } = string.Empty;
    public bool IsPinned { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Deal? Deal { get; set; }
}
