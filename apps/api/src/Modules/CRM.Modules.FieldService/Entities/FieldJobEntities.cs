using System.Text.Json.Serialization;
using CRM.BuildingBlocks.Tenancy;

namespace CRM.Modules.FieldService.Entities;

public class FieldJob : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public string JobNumber { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string ServiceType { get; set; } = "Installation"; // Installation, Maintenance, Repair, Survey, Inspection, Emergency
    public string Status { get; set; } = "Draft";              // Draft, Scheduled, Dispatched, InProgress, Completed, Cancelled
    public string Priority { get; set; } = "Normal";           // Low, Normal, High, Urgent

    // Customer & Location
    public Guid? CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public string? ContactPerson { get; set; }
    public string? ContactPhone { get; set; }
    public string ServiceAddress { get; set; } = string.Empty;
    public string? City { get; set; }
    public string? District { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }

    // Technician Assignment & Scheduling
    public Guid? AssignedTechnicianId { get; set; }
    public string? AssignedTechnicianName { get; set; }
    public DateOnly? ScheduledDate { get; set; }
    public DateTimeOffset? ScheduledStartTime { get; set; }
    public DateTimeOffset? ScheduledEndTime { get; set; }
    public DateTimeOffset? ActualStartTime { get; set; }
    public DateTimeOffset? ActualEndTime { get; set; }

    // On-Site Completion & E-Sign
    public string? ResolutionNotes { get; set; }
    public string? CustomerSignatureData { get; set; }
    public string? CustomerSignedName { get; set; }
    public DateTimeOffset? SignedAt { get; set; }
    public decimal TotalCost { get; set; } = 0;

    public Guid? CreatedById { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<FieldJobTask> Tasks { get; set; } = new List<FieldJobTask>();
    public ICollection<FieldJobPart> Parts { get; set; } = new List<FieldJobPart>();
    public ICollection<FieldJobCheckin> Checkins { get; set; } = new List<FieldJobCheckin>();
}

public class FieldJobTask : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Guid JobId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsCompleted { get; set; } = false;
    public DateTimeOffset? CompletedAt { get; set; }
    public Guid? CompletedById { get; set; }
    public int DisplayOrder { get; set; } = 0;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    [JsonIgnore]
    public FieldJob? Job { get; set; }
}

public class FieldJobPart : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Guid JobId { get; set; }
    public Guid? ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public decimal UnitPrice { get; set; } = 0;
    public decimal Quantity { get; set; } = 1;
    public decimal TotalPrice { get; set; } = 0;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    [JsonIgnore]
    public FieldJob? Job { get; set; }
}

public class FieldJobCheckin : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Guid JobId { get; set; }
    public Guid TechnicianId { get; set; }
    public string CheckinType { get; set; } = "Arrival"; // Arrival, Departure
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? DeviceInfo { get; set; }
    public DateTimeOffset Timestamp { get; set; } = DateTimeOffset.UtcNow;

    [JsonIgnore]
    public FieldJob? Job { get; set; }
}
