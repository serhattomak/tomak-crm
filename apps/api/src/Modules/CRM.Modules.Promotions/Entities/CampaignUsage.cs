using CRM.BuildingBlocks.Tenancy;

namespace CRM.Modules.Promotions.Entities;

public class CampaignUsage : ITenantScopedEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid CampaignId { get; set; }
    public Guid? CouponId { get; set; }
    public Guid? OrderId { get; set; }
    public Guid? CustomerId { get; set; }
    public decimal DiscountAmount { get; set; } = 0.00m;
    public decimal OrderTotalBefore { get; set; } = 0.00m;
    public decimal OrderTotalAfter { get; set; } = 0.00m;
    public DateTime UsedAt { get; set; } = DateTime.UtcNow;

    public Campaign? Campaign { get; set; }
    public Coupon? Coupon { get; set; }
}
