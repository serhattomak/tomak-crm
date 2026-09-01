using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using CRM.BuildingBlocks.Tenancy;

namespace CRM.Modules.Customers.Entities;

[Table("crm_tasks", Schema = "public")]
public class CrmTask : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }

    [MaxLength(255)]
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public DateTime? DueDate { get; set; }

    [MaxLength(50)]
    public string Priority { get; set; } = "medium"; // low, medium, high, urgent

    [MaxLength(50)]
    public string Status { get; set; } = "Pending"; // Pending, InProgress, Completed, Cancelled

    public bool IsCompleted { get; set; } = false;

    public DateTime? CompletedAt { get; set; }

    [MaxLength(100)]
    public string Category { get; set; } = "Genel"; // Call, Meeting, FollowUp, Email, Review, Genel

    public Guid? AssignedUserId { get; set; }

    [MaxLength(255)]
    public string? AssignedUserName { get; set; }

    public Guid? CustomerId { get; set; }
    public Customer? Customer { get; set; }

    [MaxLength(255)]
    public string? CustomerName { get; set; }

    public Guid? DealId { get; set; }
    public Deal? Deal { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
