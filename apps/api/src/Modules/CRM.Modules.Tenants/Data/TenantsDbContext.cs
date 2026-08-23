using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Tenants.Entities;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Tenants.Data;

public class TenantsDbContext(DbContextOptions<TenantsDbContext> options) : DbContext(options)
{
    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<TenantMember> TenantMembers => Set<TenantMember>();
    public DbSet<TenantModule> TenantModules => Set<TenantModule>();
    public DbSet<IndustryTemplate> IndustryTemplates => Set<IndustryTemplate>();
    public DbSet<TenantLabelOverride> TenantLabelOverrides => Set<TenantLabelOverride>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Tenant>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(200).IsRequired();
            entity.Property(e => e.Slug).HasColumnName("slug").HasMaxLength(100).IsRequired();
            entity.Property(e => e.LogoUrl).HasColumnName("logo_url");
            entity.Property(e => e.Industry).HasColumnName("industry").HasMaxLength(100);
            entity.Property(e => e.IndustryTemplateId).HasColumnName("industry_template_id");
            entity.Property(e => e.IsActive).HasColumnName("is_active").IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasIndex(e => e.Slug).IsUnique();

            entity.HasOne(e => e.IndustryTemplate)
                  .WithMany()
                  .HasForeignKey(e => e.IndustryTemplateId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<TenantMember>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.UserId).HasColumnName("user_id").IsRequired();
            entity.Property(e => e.IsOwner).HasColumnName("is_owner").IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");

            entity.HasOne(e => e.Tenant)
                  .WithMany(t => t.Members)
                  .HasForeignKey(e => e.TenantId);

            entity.HasIndex(e => new { e.TenantId, e.UserId }).IsUnique();
        });

        modelBuilder.Entity<TenantModule>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.ModuleKey).HasColumnName("module_key").HasMaxLength(50).IsRequired();
            entity.Property(e => e.IsEnabled).HasColumnName("is_enabled").IsRequired();
            entity.Property(e => e.DisplayName).HasColumnName("display_name").HasMaxLength(200);
            entity.Property(e => e.ConfigJson).HasColumnName("config_json").HasColumnType("jsonb");
            entity.Property(e => e.ActivatedAt).HasColumnName("activated_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(e => e.Tenant)
                  .WithMany(t => t.Modules)
                  .HasForeignKey(e => e.TenantId);

            entity.HasIndex(e => new { e.TenantId, e.ModuleKey }).IsUnique();
        });

        modelBuilder.Entity<IndustryTemplate>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Key).HasColumnName("key").HasMaxLength(50).IsRequired();
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(200).IsRequired();
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.LabelsJson).HasColumnName("labels_json").HasColumnType("jsonb");
            entity.Property(e => e.DefaultModules).HasColumnName("default_modules").HasColumnType("text[]");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");

            entity.HasIndex(e => e.Key).IsUnique();
        });

        modelBuilder.Entity<TenantLabelOverride>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.LabelKey).HasColumnName("label_key").HasMaxLength(200).IsRequired();
            entity.Property(e => e.Value).HasColumnName("value").HasMaxLength(500).IsRequired();
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(e => e.Tenant)
                  .WithMany(t => t.LabelOverrides)
                  .HasForeignKey(e => e.TenantId);

            entity.HasIndex(e => new { e.TenantId, e.LabelKey }).IsUnique();
        });
    }
}
