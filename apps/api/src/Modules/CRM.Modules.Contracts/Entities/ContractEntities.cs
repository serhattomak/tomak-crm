using CRM.BuildingBlocks.Tenancy;

namespace CRM.Modules.Contracts.Entities;

public class ContractTemplate : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Category { get; set; } = "General";
    public string ContentHtml { get; set; } = string.Empty;
    public bool IsDefault { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class Contract : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public string ContractNumber { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public Guid CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public Guid? QuoteId { get; set; }
    public string Status { get; set; } = "Draft"; // Draft, Sent, Signed, Active, Expired, Cancelled

    public decimal TotalAmount { get; set; }
    public string Currency { get; set; } = "TRY";

    public string ContentHtml { get; set; } = string.Empty;
    public Guid? TemplateId { get; set; }

    // E-Signature & Audit Trail
    public DateTime? SignedAt { get; set; }
    public string? SignedByName { get; set; }
    public string? SignedByEmail { get; set; }
    public string? SignatureImageUrl { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public string? AuditHash { get; set; }

    public DateOnly? ValidFrom { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);
    public DateOnly? ValidUntil { get; set; }
    public bool AutoRenew { get; set; }

    public Guid? CreatedByUserId { get; set; }
    public string? CreatedByUserName { get; set; }

    public string? Notes { get; set; }
    public string? PublicToken { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class CustomerPortalAccess : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Guid CustomerId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string? MagicToken { get; set; }
    public DateTime? TokenExpiresAt { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? LastLoginAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
