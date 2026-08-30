using CRM.BuildingBlocks.Tenancy;

namespace CRM.Modules.Promotions.Entities;

public class CampaignTarget : ITenantScopedEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid CampaignId { get; set; }
    public string TargetType { get; set; } = "Product"; // Product, Category, Brand, Customer, CustomerGroup
    public string TargetId { get; set; } = string.Empty; // Product ID, Category ID, Customer ID or Brand name
    public string? TargetName { get; set; }
    public string RuleCondition { get; set; } = "Include"; // Include, Exclude
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Campaign? Campaign { get; set; }
}
