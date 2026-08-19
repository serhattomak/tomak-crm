using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Customers.Entities;
using CRM.Modules.Organization.Entities;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Customers.Data;

public class CustomersDbContext(
    DbContextOptions<CustomersDbContext> options,
    ICurrentTenant currentTenant) : DbContext(options)
{
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<CustomerContact> CustomerContacts => Set<CustomerContact>();
    public DbSet<CustomerActivity> CustomerActivities => Set<CustomerActivity>();
    public DbSet<CustomerNote> CustomerNotes => Set<CustomerNote>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // 1. Customer
        modelBuilder.Entity<Customer>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.Type).HasColumnName("type").HasMaxLength(50).IsRequired();
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(255).IsRequired();
            entity.Property(e => e.Email).HasColumnName("email").HasMaxLength(255);
            entity.Property(e => e.Phone).HasColumnName("phone").HasMaxLength(50);
            entity.Property(e => e.Website).HasColumnName("website").HasMaxLength(255);
            entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(50).IsRequired();
            entity.Property(e => e.Tier).HasColumnName("tier").HasMaxLength(50).IsRequired();
            entity.Property(e => e.Industry).HasColumnName("industry").HasMaxLength(100);
            entity.Property(e => e.Tags).HasColumnName("tags");
            entity.Property(e => e.TaxOffice).HasColumnName("tax_office").HasMaxLength(150);
            entity.Property(e => e.TaxNumber).HasColumnName("tax_number").HasMaxLength(50);
            entity.Property(e => e.AddressLine).HasColumnName("address_line");
            entity.Property(e => e.City).HasColumnName("city").HasMaxLength(100);
            entity.Property(e => e.State).HasColumnName("state").HasMaxLength(100);
            entity.Property(e => e.PostalCode).HasColumnName("postal_code").HasMaxLength(20);
            entity.Property(e => e.Country).HasColumnName("country").HasMaxLength(100);
            entity.Property(e => e.AssignedEmployeeId).HasColumnName("assigned_employee_id");
            entity.Property(e => e.AssignedUserId).HasColumnName("assigned_user_id");
            entity.Property(e => e.TotalRevenue).HasColumnName("total_revenue").HasPrecision(18, 2);
            entity.Property(e => e.Currency).HasColumnName("currency").HasMaxLength(10).IsRequired();
            entity.Property(e => e.DealsCount).HasColumnName("deals_count");
            entity.Property(e => e.NotesCount).HasColumnName("notes_count");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasMany(e => e.Contacts)
                  .WithOne(c => c.Customer)
                  .HasForeignKey(c => c.CustomerId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.Activities)
                  .WithOne(a => a.Customer)
                  .HasForeignKey(a => a.CustomerId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.Notes)
                  .WithOne(n => n.Customer)
                  .HasForeignKey(n => n.CustomerId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        // 2. CustomerContact
        modelBuilder.Entity<CustomerContact>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.CustomerId).HasColumnName("customer_id").IsRequired();
            entity.Property(e => e.FirstName).HasColumnName("first_name").HasMaxLength(100).IsRequired();
            entity.Property(e => e.LastName).HasColumnName("last_name").HasMaxLength(100).IsRequired();
            entity.Property(e => e.Title).HasColumnName("title").HasMaxLength(150);
            entity.Property(e => e.Department).HasColumnName("department").HasMaxLength(100);
            entity.Property(e => e.Email).HasColumnName("email").HasMaxLength(255);
            entity.Property(e => e.Phone).HasColumnName("phone").HasMaxLength(50);
            entity.Property(e => e.Mobile).HasColumnName("mobile").HasMaxLength(50);
            entity.Property(e => e.IsPrimary).HasColumnName("is_primary");
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        // 3. CustomerActivity
        modelBuilder.Entity<CustomerActivity>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.CustomerId).HasColumnName("customer_id").IsRequired();
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.ActivityType).HasColumnName("activity_type").HasMaxLength(50).IsRequired();
            entity.Property(e => e.Title).HasColumnName("title").HasMaxLength(255).IsRequired();
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.PerformedAt).HasColumnName("performed_at");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        // 4. CustomerNote
        modelBuilder.Entity<CustomerNote>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.CustomerId).HasColumnName("customer_id").IsRequired();
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.Content).HasColumnName("content").IsRequired();
            entity.Property(e => e.IsPinned).HasColumnName("is_pinned");
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
