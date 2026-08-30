using System.Text.Json;
using CRM.BuildingBlocks.Tenancy;

namespace CRM.Modules.Promotions.Entities;

public class Campaign : ITenantScopedEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string? Description { get; set; }
    public string Type { get; set; } = "Percentage"; // Percentage, FixedAmount, CartThreshold, BuyXGetY, FreeShipping
    public string TriggerType { get; set; } = "Automatic"; // Automatic, CouponCode
    public decimal DiscountValue { get; set; } = 0.00m;

    // Conditions and Thresholds
    public decimal MinOrderAmount { get; set; } = 0.00m;
    public decimal? MaxDiscountAmount { get; set; }
    public decimal MinQuantity { get; set; } = 1.00m;
    public int BuyQuantity { get; set; } = 0;
    public int GetQuantity { get; set; } = 0;
    public decimal GetDiscountRate { get; set; } = 100.00m;

    // Dates
    public DateTime StartDate { get; set; } = DateTime.UtcNow;
    public DateTime? EndDate { get; set; }
    public bool IsActive { get; set; } = true;

    // Priority & Stacking
    public int Priority { get; set; } = 0;
    public bool IsStackable { get; set; } = false;

    // Usages
    public int? TotalUsageLimit { get; set; }
    public int? PerCustomerUsageLimit { get; set; } = 1;
    public int CurrentUsageCount { get; set; } = 0;

    public string Metadata { get; set; } = "{}";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ICollection<CampaignTarget> Targets { get; set; } = new List<CampaignTarget>();
    public ICollection<Coupon> Coupons { get; set; } = new List<Coupon>();
    public ICollection<CampaignUsage> Usages { get; set; } = new List<CampaignUsage>();
}
