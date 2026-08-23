using System.ComponentModel.DataAnnotations.Schema;

namespace CRM.Modules.Tenants.Entities;

[Table("tenants", Schema = "public")]
public class Tenant
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? LogoUrl { get; set; }
    public string? Industry { get; set; }
    public Guid? IndustryTemplateId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public IndustryTemplate? IndustryTemplate { get; set; }
    public ICollection<TenantMember> Members { get; set; } = [];
    public ICollection<TenantModule> Modules { get; set; } = [];
    public ICollection<TenantLabelOverride> LabelOverrides { get; set; } = [];
}

[Table("tenant_members", Schema = "public")]
public class TenantMember
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Guid UserId { get; set; }
    public bool IsOwner { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Tenant? Tenant { get; set; }
}
