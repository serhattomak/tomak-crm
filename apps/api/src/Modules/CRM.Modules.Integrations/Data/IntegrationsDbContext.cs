using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Integrations.Entities;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Integrations.Data;

public class IntegrationsDbContext(
    DbContextOptions<IntegrationsDbContext> options,
    ICurrentTenant currentTenant) : DbContext(options)
{
    public DbSet<Cart> Carts => Set<Cart>();
    public DbSet<CartItem> CartItems => Set<CartItem>();
    public DbSet<PaymentGateway> PaymentGateways => Set<PaymentGateway>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Cart>(entity =>
        {
            entity.ToTable("carts", "public");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.CustomerId).HasColumnName("customer_id");
            entity.Property(e => e.GuestToken).HasColumnName("guest_token").HasMaxLength(100);
            entity.Property(e => e.GuestTokenUuid).HasColumnName("guest_token_uuid");
            entity.Property(e => e.ExpiresAt).HasColumnName("expires_at");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            entity.HasMany(e => e.Items).WithOne(i => i.Cart).HasForeignKey(i => i.CartId).OnDelete(DeleteBehavior.Cascade);
            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        modelBuilder.Entity<CartItem>(entity =>
        {
            entity.ToTable("cart_items", "public");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.CartId).HasColumnName("cart_id").IsRequired();
            entity.Property(e => e.ProductId).HasColumnName("product_id").IsRequired();
            entity.Property(e => e.VariantId).HasColumnName("variant_id");
            entity.Property(e => e.Quantity).HasColumnName("quantity").IsRequired();
            entity.Property(e => e.PriceSnapshot).HasColumnName("price_snapshot").HasPrecision(18, 2);
            entity.Property(e => e.SnapshotPrice).HasColumnName("snapshot_price").HasPrecision(18, 2);
            entity.Property(e => e.SnapshotName).HasColumnName("snapshot_name").HasMaxLength(255);
            entity.Property(e => e.Currency).HasColumnName("currency").HasMaxLength(10).IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        modelBuilder.Entity<PaymentGateway>(entity =>
        {
            entity.ToTable("payment_gateways", "public");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.Provider).HasColumnName("provider").HasMaxLength(50).IsRequired();
            entity.Property(e => e.ApiKey).HasColumnName("api_key").HasMaxLength(255);
            entity.Property(e => e.Secret).HasColumnName("secret").HasMaxLength(255);
            entity.Property(e => e.ApiKeyEncrypted).HasColumnName("api_key_encrypted");
            entity.Property(e => e.SecretEncrypted).HasColumnName("secret_encrypted");
            entity.Property(e => e.Config).HasColumnName("config").HasColumnType("jsonb");
            entity.Property(e => e.TestMode).HasColumnName("test_mode");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
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
