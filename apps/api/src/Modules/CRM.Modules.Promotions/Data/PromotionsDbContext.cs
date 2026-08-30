using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Promotions.Entities;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Promotions.Data;

public class PromotionsDbContext(
    DbContextOptions<PromotionsDbContext> options,
    ICurrentTenant currentTenant) : DbContext(options)
{
    public DbSet<Campaign> Campaigns => Set<Campaign>();
    public DbSet<CampaignTarget> CampaignTargets => Set<CampaignTarget>();
    public DbSet<Coupon> Coupons => Set<Coupon>();
    public DbSet<CampaignUsage> CampaignUsages => Set<CampaignUsage>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // 1. Campaign
        modelBuilder.Entity<Campaign>(entity =>
        {
            entity.ToTable("campaigns", "public");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(255).IsRequired();
            entity.Property(e => e.Code).HasColumnName("code").HasMaxLength(100);
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.Type).HasColumnName("type").HasMaxLength(50).IsRequired();
            entity.Property(e => e.TriggerType).HasColumnName("trigger_type").HasMaxLength(50).IsRequired();
            entity.Property(e => e.DiscountValue).HasColumnName("discount_value").HasPrecision(15, 2);
            entity.Property(e => e.MinOrderAmount).HasColumnName("min_order_amount").HasPrecision(15, 2);
            entity.Property(e => e.MaxDiscountAmount).HasColumnName("max_discount_amount").HasPrecision(15, 2);
            entity.Property(e => e.MinQuantity).HasColumnName("min_quantity").HasPrecision(10, 2);
            entity.Property(e => e.BuyQuantity).HasColumnName("buy_quantity");
            entity.Property(e => e.GetQuantity).HasColumnName("get_quantity");
            entity.Property(e => e.GetDiscountRate).HasColumnName("get_discount_rate").HasPrecision(5, 2);
            entity.Property(e => e.StartDate).HasColumnName("start_date");
            entity.Property(e => e.EndDate).HasColumnName("end_date");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.Priority).HasColumnName("priority");
            entity.Property(e => e.IsStackable).HasColumnName("is_stackable");
            entity.Property(e => e.TotalUsageLimit).HasColumnName("total_usage_limit");
            entity.Property(e => e.PerCustomerUsageLimit).HasColumnName("per_customer_usage_limit");
            entity.Property(e => e.CurrentUsageCount).HasColumnName("current_usage_count");
            entity.Property(e => e.Metadata).HasColumnName("metadata").HasColumnType("jsonb");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasMany(e => e.Targets)
                  .WithOne(t => t.Campaign)
                  .HasForeignKey(t => t.CampaignId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.Coupons)
                  .WithOne(c => c.Campaign)
                  .HasForeignKey(c => c.CampaignId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.Usages)
                  .WithOne(u => u.Campaign)
                  .HasForeignKey(u => u.CampaignId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        // 2. CampaignTarget
        modelBuilder.Entity<CampaignTarget>(entity =>
        {
            entity.ToTable("campaign_targets", "public");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.CampaignId).HasColumnName("campaign_id").IsRequired();
            entity.Property(e => e.TargetType).HasColumnName("target_type").HasMaxLength(50).IsRequired();
            entity.Property(e => e.TargetId).HasColumnName("target_id").HasMaxLength(100).IsRequired();
            entity.Property(e => e.TargetName).HasColumnName("target_name").HasMaxLength(255);
            entity.Property(e => e.RuleCondition).HasColumnName("rule_condition").HasMaxLength(20).IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        // 3. Coupon
        modelBuilder.Entity<Coupon>(entity =>
        {
            entity.ToTable("coupons", "public");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.CampaignId).HasColumnName("campaign_id").IsRequired();
            entity.Property(e => e.Code).HasColumnName("code").HasMaxLength(100).IsRequired();
            entity.Property(e => e.Type).HasColumnName("type").HasMaxLength(50).IsRequired();
            entity.Property(e => e.MaxUses).HasColumnName("max_uses");
            entity.Property(e => e.UsedCount).HasColumnName("used_count");
            entity.Property(e => e.AssignedCustomerId).HasColumnName("assigned_customer_id");
            entity.Property(e => e.AssignedCustomerName).HasColumnName("assigned_customer_name").HasMaxLength(255);
            entity.Property(e => e.ExpiresAt).HasColumnName("expires_at");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.BatchId).HasColumnName("batch_id").HasMaxLength(100);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasMany(e => e.Usages)
                  .WithOne(u => u.Coupon)
                  .HasForeignKey(u => u.CouponId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        // 4. CampaignUsage
        modelBuilder.Entity<CampaignUsage>(entity =>
        {
            entity.ToTable("campaign_usages", "public");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.CampaignId).HasColumnName("campaign_id").IsRequired();
            entity.Property(e => e.CouponId).HasColumnName("coupon_id");
            entity.Property(e => e.OrderId).HasColumnName("order_id");
            entity.Property(e => e.CustomerId).HasColumnName("customer_id");
            entity.Property(e => e.DiscountAmount).HasColumnName("discount_amount").HasPrecision(15, 2);
            entity.Property(e => e.OrderTotalBefore).HasColumnName("order_total_before").HasPrecision(15, 2);
            entity.Property(e => e.OrderTotalAfter).HasColumnName("order_total_after").HasPrecision(15, 2);
            entity.Property(e => e.UsedAt).HasColumnName("used_at");

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        if (currentTenant.Id.HasValue && currentTenant.Id.Value != Guid.Empty)
        {
            foreach (var entry in ChangeTracker.Entries<ITenantScopedEntity>())
            {
                if (entry.State == EntityState.Added && entry.Entity.TenantId == Guid.Empty)
                {
                    entry.Entity.TenantId = currentTenant.Id.Value;
                }
            }
        }

        return base.SaveChangesAsync(cancellationToken);
    }
}
