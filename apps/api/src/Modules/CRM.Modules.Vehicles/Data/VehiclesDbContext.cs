using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Vehicles.Entities;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Vehicles.Data;

public class VehiclesDbContext(
    DbContextOptions<VehiclesDbContext> options,
    ICurrentTenant currentTenant) : DbContext(options)
{
    public DbSet<Vehicle> Vehicles => Set<Vehicle>();
    public DbSet<VehicleSystem> VehicleSystems => Set<VehicleSystem>();
    public DbSet<VehicleSubsystem> VehicleSubsystems => Set<VehicleSubsystem>();
    public DbSet<VehiclePart> VehicleParts => Set<VehiclePart>();
    public DbSet<VehicleDocument> VehicleDocuments => Set<VehicleDocument>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Multi-tenant query filters
        modelBuilder.Entity<Vehicle>().HasQueryFilter(e => e.TenantId == currentTenant.Id);
        modelBuilder.Entity<VehicleSystem>().HasQueryFilter(e => e.TenantId == currentTenant.Id);
        modelBuilder.Entity<VehicleSubsystem>().HasQueryFilter(e => e.TenantId == currentTenant.Id);
        modelBuilder.Entity<VehiclePart>().HasQueryFilter(e => e.TenantId == currentTenant.Id);
        modelBuilder.Entity<VehicleDocument>().HasQueryFilter(e => e.TenantId == currentTenant.Id);
    }
}
