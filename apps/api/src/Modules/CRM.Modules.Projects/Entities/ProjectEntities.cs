using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Customers.Entities;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Projects.Entities;

[Table("projects", Schema = "public")]
public class Project : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }

    [MaxLength(255)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(20)]
    public string Key { get; set; } = string.Empty; // e.g. "CRM", "ERP"

    public string? Description { get; set; }

    [MaxLength(50)]
    public string Status { get; set; } = "Active"; // Active, Planning, OnHold, Completed, Archived

    public Guid? LeadUserId { get; set; }

    [MaxLength(255)]
    public string? LeadUserName { get; set; }

    public Guid? CustomerId { get; set; }
    public Customer? Customer { get; set; }

    [MaxLength(255)]
    public string? CustomerName { get; set; }

    [Precision(18, 2)]
    public decimal Budget { get; set; } = 0.00m;

    [MaxLength(10)]
    public string Currency { get; set; } = "TRY";

    public DateTime? StartDate { get; set; }
    public DateTime? TargetEndDate { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<ProjectEpic> Epics { get; set; } = [];
    public ICollection<ProjectSprint> Sprints { get; set; } = [];
    public ICollection<BacklogItem> Items { get; set; } = [];
}

[Table("project_epics", Schema = "public")]
public class ProjectEpic : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }

    public Guid ProjectId { get; set; }
    public Project? Project { get; set; }

    [MaxLength(255)]
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    [MaxLength(50)]
    public string Color { get; set; } = "purple"; // purple, blue, emerald, amber, rose, indigo

    [MaxLength(50)]
    public string Status { get; set; } = "Active"; // Planning, Active, Completed, Cancelled

    public DateTime? StartDate { get; set; }
    public DateTime? DueDate { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<BacklogItem> Items { get; set; } = [];
}

[Table("project_sprints", Schema = "public")]
public class ProjectSprint : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }

    public Guid ProjectId { get; set; }
    public Project? Project { get; set; }

    [MaxLength(255)]
    public string Name { get; set; } = string.Empty; // e.g. "Sprint 1"

    public string? Goal { get; set; }

    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }

    [MaxLength(50)]
    public string Status { get; set; } = "Planning"; // Planning, Active, Completed, Cancelled

    public int VelocityPoints { get; set; } = 0;
    public int CompletedPoints { get; set; } = 0;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<BacklogItem> Items { get; set; } = [];
}

[Table("backlog_items", Schema = "public")]
public class BacklogItem : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }

    public Guid ProjectId { get; set; }
    public Project? Project { get; set; }

    [MaxLength(50)]
    public string ItemKey { get; set; } = string.Empty; // e.g. "CRM-101"

    [MaxLength(50)]
    public string Type { get; set; } = "Task"; // Story, Task, Bug, Feature, Improvement

    [MaxLength(255)]
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }
    public string? AcceptanceCriteria { get; set; }

    [MaxLength(50)]
    public string Status { get; set; } = "Backlog"; // Backlog, Todo, InProgress, InReview, Done, Cancelled

    [MaxLength(50)]
    public string Priority { get; set; } = "Medium"; // Low, Medium, High, Urgent

    public int StoryPoints { get; set; } = 0;

    [Precision(10, 2)]
    public decimal EstimatedHours { get; set; } = 0.00m;

    [Precision(10, 2)]
    public decimal LoggedHours { get; set; } = 0.00m;

    public int OrderIndex { get; set; } = 0;

    public Guid? SprintId { get; set; }
    public ProjectSprint? Sprint { get; set; }

    public Guid? EpicId { get; set; }
    public ProjectEpic? Epic { get; set; }

    public Guid? AssignedUserId { get; set; }

    [MaxLength(255)]
    public string? AssignedUserName { get; set; }

    public string? AssignedUserAvatar { get; set; }

    public Guid? ReporterUserId { get; set; }

    [MaxLength(255)]
    public string? ReporterUserName { get; set; }

    // Linked CRM Entities
    public Guid? CustomerId { get; set; }

    [MaxLength(255)]
    public string? CustomerName { get; set; }

    public Guid? DealId { get; set; }
    public Guid? TicketId { get; set; }

    public DateTime? DueDate { get; set; }
    public DateTime? CompletedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<BacklogSubtask> Subtasks { get; set; } = [];
    public ICollection<BacklogComment> Comments { get; set; } = [];
}

[Table("backlog_subtasks", Schema = "public")]
public class BacklogSubtask : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }

    public Guid BacklogItemId { get; set; }
    public BacklogItem? BacklogItem { get; set; }

    [MaxLength(255)]
    public string Title { get; set; } = string.Empty;

    public bool IsCompleted { get; set; } = false;
    public int OrderIndex { get; set; } = 0;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

[Table("backlog_comments", Schema = "public")]
public class BacklogComment : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }

    public Guid BacklogItemId { get; set; }
    public BacklogItem? BacklogItem { get; set; }

    public Guid? UserId { get; set; }

    [MaxLength(255)]
    public string UserName { get; set; } = string.Empty;

    public string? UserAvatar { get; set; }

    public string Content { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
