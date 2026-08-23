using System.ComponentModel.DataAnnotations.Schema;

namespace CRM.Modules.Tenants.Entities;

[Table("tenant_modules", Schema = "public")]
public class TenantModule
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public string ModuleKey { get; set; } = string.Empty;
    public bool IsEnabled { get; set; } = true;
    public string? DisplayName { get; set; }
    public string? ConfigJson { get; set; }
    public DateTime ActivatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Tenant? Tenant { get; set; }
}

[Table("industry_templates", Schema = "public")]
public class IndustryTemplate
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Key { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string LabelsJson { get; set; } = "{}";
    public string[] DefaultModules { get; set; } = [];
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

[Table("tenant_label_overrides", Schema = "public")]
public class TenantLabelOverride
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public string LabelKey { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Tenant? Tenant { get; set; }
}
