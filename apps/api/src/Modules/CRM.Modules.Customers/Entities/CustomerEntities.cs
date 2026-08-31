using System.ComponentModel.DataAnnotations.Schema;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Organization.Entities;

namespace CRM.Modules.Customers.Entities;

[Table("customers", Schema = "public")]
public class Customer : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public string Type { get; set; } = "Company"; // "Company" | "Individual"
    public string Name { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Website { get; set; }
    public string Status { get; set; } = "Lead"; // "Lead" | "Active" | "Passive" | "Churned"
    public string Tier { get; set; } = "Standard"; // "VIP" | "Enterprise" | "SME" | "Standard"
    public string? Industry { get; set; }
    public string[]? Tags { get; set; }
    public string? TaxOffice { get; set; }
    public string? TaxNumber { get; set; }
    public string? AddressLine { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? PostalCode { get; set; }
    public string? Country { get; set; } = "Türkiye";
    public Guid? AssignedEmployeeId { get; set; }
    public Guid? AssignedUserId { get; set; }
    public Guid? AuthUserId { get; set; }
    public decimal TotalRevenue { get; set; } = 0.00m;
    public string Currency { get; set; } = "TRY";
    public int DealsCount { get; set; } = 0;
    public int NotesCount { get; set; } = 0;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<CustomerContact> Contacts { get; set; } = [];
    public ICollection<CustomerActivity> Activities { get; set; } = [];
    public ICollection<CustomerNote> Notes { get; set; } = [];
}

[Table("customer_contacts", Schema = "public")]
public class CustomerContact : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Guid CustomerId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? Title { get; set; }
    public string? Department { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Mobile { get; set; }
    public bool IsPrimary { get; set; } = false;
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public string FullName => $"{FirstName} {LastName}".Trim();

    public Customer? Customer { get; set; }
}

[Table("customer_activities", Schema = "public")]
public class CustomerActivity : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Guid CustomerId { get; set; }
    public Guid? UserId { get; set; }
    public string ActivityType { get; set; } = "Note"; // "Call", "Meeting", "Email", "Note", "StatusChange", "DealCreated"
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime PerformedAt { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Customer? Customer { get; set; }
}

[Table("customer_notes", Schema = "public")]
public class CustomerNote : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Guid CustomerId { get; set; }
    public Guid? UserId { get; set; }
    public string Content { get; set; } = string.Empty;
    public bool IsPinned { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Customer? Customer { get; set; }
}
