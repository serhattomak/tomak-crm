using CRM.BuildingBlocks.Tenancy;

namespace CRM.Modules.Promotions.Entities;

public class Coupon : ITenantScopedEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid CampaignId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Type { get; set; } = "Standard"; // Standard, SingleUse, Dynamic
    public int MaxUses { get; set; } = 1;
    public int UsedCount { get; set; } = 0;
    public Guid? AssignedCustomerId { get; set; }
    public string? AssignedCustomerName { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public bool IsActive { get; set; } = true;
    public string? BatchId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Campaign? Campaign { get; set; }
    public ICollection<CampaignUsage> Usages { get; set; } = new List<CampaignUsage>();
}
