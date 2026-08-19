using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Orders.Entities;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Orders.Data;

public class OrdersDbContext(
    DbContextOptions<OrdersDbContext> options,
    ICurrentTenant currentTenant) : DbContext(options)
{
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<OrderPayment> OrderPayments => Set<OrderPayment>();
    public DbSet<OrderActivity> OrderActivities => Set<OrderActivity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Global query filters for multi-tenant isolation
        modelBuilder.Entity<Order>().HasQueryFilter(e => e.TenantId == currentTenant.Id);
        modelBuilder.Entity<OrderItem>().HasQueryFilter(e => e.TenantId == currentTenant.Id);
        modelBuilder.Entity<OrderPayment>().HasQueryFilter(e => e.TenantId == currentTenant.Id);
        modelBuilder.Entity<OrderActivity>().HasQueryFilter(e => e.TenantId == currentTenant.Id);

        modelBuilder.Entity<Order>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasMany(e => e.Items).WithOne(i => i.Order).HasForeignKey(i => i.OrderId).OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(e => e.Payments).WithOne(p => p.Order).HasForeignKey(p => p.OrderId).OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(e => e.Activities).WithOne(a => a.Order).HasForeignKey(a => a.OrderId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<OrderItem>(entity =>
        {
            entity.HasKey(e => e.Id);
        });

        modelBuilder.Entity<OrderPayment>(entity =>
        {
            entity.HasKey(e => e.Id);
        });

        modelBuilder.Entity<OrderActivity>(entity =>
        {
            entity.HasKey(e => e.Id);
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
