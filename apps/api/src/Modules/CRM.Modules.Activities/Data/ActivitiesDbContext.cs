using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Activities.Entities;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Activities.Data;

public class ActivitiesDbContext(
    DbContextOptions<ActivitiesDbContext> options,
    ICurrentTenant currentTenant) : DbContext(options)
{
    public DbSet<Activity> Activities => Set<Activity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Activity>(entity =>
        {
            // Multi-tenant query filter
            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);

            // Performance indexes
            entity.HasIndex(e => new { e.TenantId, e.StartTime });
            entity.HasIndex(e => new { e.TenantId, e.CustomerId });
            entity.HasIndex(e => new { e.TenantId, e.AssignedUserId });
            entity.HasIndex(e => new { e.TenantId, e.Type, e.Status });
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
