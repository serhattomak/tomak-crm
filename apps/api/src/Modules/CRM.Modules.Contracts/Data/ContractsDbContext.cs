using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Contracts.Entities;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Contracts.Data;

public class ContractsDbContext(
    DbContextOptions<ContractsDbContext> options,
    ICurrentTenant currentTenant) : DbContext(options)
{
    public DbSet<Contract> Contracts => Set<Contract>();
    public DbSet<ContractTemplate> ContractTemplates => Set<ContractTemplate>();
    public DbSet<CustomerPortalAccess> CustomerPortalAccesses => Set<CustomerPortalAccess>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<ContractTemplate>(entity =>
        {
            entity.ToTable("contract_templates", "public");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id");
            entity.Property(e => e.Name).HasColumnName("name").IsRequired().HasMaxLength(255);
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.Category).HasColumnName("category").HasMaxLength(100);
            entity.Property(e => e.ContentHtml).HasColumnName("content_html").IsRequired();
            entity.Property(e => e.IsDefault).HasColumnName("is_default");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        modelBuilder.Entity<Contract>(entity =>
        {
            entity.ToTable("contracts", "public");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id");
            entity.Property(e => e.ContractNumber).HasColumnName("contract_number").IsRequired().HasMaxLength(100);
            entity.Property(e => e.Title).HasColumnName("title").IsRequired().HasMaxLength(255);
            entity.Property(e => e.CustomerId).HasColumnName("customer_id").IsRequired();
            entity.Property(e => e.CustomerName).HasColumnName("customer_name").HasMaxLength(255);
            entity.Property(e => e.QuoteId).HasColumnName("quote_id");
            entity.Property(e => e.Status).HasColumnName("status").IsRequired().HasMaxLength(50);
            entity.Property(e => e.TotalAmount).HasColumnName("total_amount").HasPrecision(15, 2);
            entity.Property(e => e.Currency).HasColumnName("currency").HasMaxLength(10);
            entity.Property(e => e.ContentHtml).HasColumnName("content_html").IsRequired();
            entity.Property(e => e.TemplateId).HasColumnName("template_id");

            entity.Property(e => e.SignedAt).HasColumnName("signed_at");
            entity.Property(e => e.SignedByName).HasColumnName("signed_by_name").HasMaxLength(255);
            entity.Property(e => e.SignedByEmail).HasColumnName("signed_by_email").HasMaxLength(255);
            entity.Property(e => e.SignatureImageUrl).HasColumnName("signature_image_url");
            entity.Property(e => e.IpAddress).HasColumnName("ip_address").HasMaxLength(100);
            entity.Property(e => e.UserAgent).HasColumnName("user_agent");
            entity.Property(e => e.AuditHash).HasColumnName("audit_hash").HasMaxLength(128);

            entity.Property(e => e.ValidFrom).HasColumnName("valid_from");
            entity.Property(e => e.ValidUntil).HasColumnName("valid_until");
            entity.Property(e => e.AutoRenew).HasColumnName("auto_renew");
            entity.Property(e => e.CreatedByUserId).HasColumnName("created_by_user_id");
            entity.Property(e => e.CreatedByUserName).HasColumnName("created_by_user_name").HasMaxLength(255);
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.PublicToken).HasColumnName("public_token").HasMaxLength(128);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        modelBuilder.Entity<CustomerPortalAccess>(entity =>
        {
            entity.ToTable("customer_portal_access", "public");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id");
            entity.Property(e => e.CustomerId).HasColumnName("customer_id").IsRequired();
            entity.Property(e => e.Email).HasColumnName("email").IsRequired().HasMaxLength(255);
            entity.Property(e => e.MagicToken).HasColumnName("magic_token").HasMaxLength(128);
            entity.Property(e => e.TokenExpiresAt).HasColumnName("token_expires_at");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.LastLoginAt).HasColumnName("last_login_at");
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
