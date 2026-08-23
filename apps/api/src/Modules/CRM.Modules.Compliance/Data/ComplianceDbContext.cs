using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Compliance.Entities;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Compliance.Data;

public class ComplianceDbContext : DbContext
{
    private readonly ICurrentTenant _currentTenant;

    public ComplianceDbContext(
        DbContextOptions<ComplianceDbContext> options,
        ICurrentTenant currentTenant) : base(options)
    {
        _currentTenant = currentTenant;
    }

    public DbSet<ComplianceRule> Rules => Set<ComplianceRule>();
    public DbSet<ComplianceViolation> Violations => Set<ComplianceViolation>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<ComplianceRule>(entity =>
        {
            entity.ToTable("compliance_rules");
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id");
            entity.Property(e => e.Code).HasColumnName("code").HasMaxLength(100).IsRequired();
            entity.Property(e => e.LawReference).HasColumnName("law_reference").HasMaxLength(255).IsRequired();
            entity.Property(e => e.Category).HasColumnName("category").HasMaxLength(50).IsRequired();
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(255).IsRequired();
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.PenaltyRiskLevel).HasColumnName("penalty_risk_level").HasMaxLength(20).IsRequired();
            entity.Property(e => e.PenaltyDescription).HasColumnName("penalty_description");
            entity.Property(e => e.EnforcementLevel).HasColumnName("enforcement_level").HasMaxLength(20).IsRequired();
            entity.Property(e => e.ThresholdConfigJson).HasColumnName("threshold_config").HasColumnType("jsonb");
            entity.Property(e => e.IsSystemRule).HasColumnName("is_system_rule").IsRequired();
            entity.Property(e => e.IsActive).HasColumnName("is_active").IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasQueryFilter(e => !_currentTenant.Id.HasValue || e.TenantId == _currentTenant.Id.Value);
        });

        modelBuilder.Entity<ComplianceViolation>(entity =>
        {
            entity.ToTable("compliance_violations");
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id");
            entity.Property(e => e.RuleId).HasColumnName("rule_id");
            entity.Property(e => e.RuleCode).HasColumnName("rule_code").HasMaxLength(100).IsRequired();
            entity.Property(e => e.LawReference).HasColumnName("law_reference").HasMaxLength(255).IsRequired();
            entity.Property(e => e.EmployeeId).HasColumnName("employee_id");
            entity.Property(e => e.EmployeeName).HasColumnName("employee_name").HasMaxLength(255).IsRequired();
            entity.Property(e => e.ModuleSource).HasColumnName("module_source").HasMaxLength(50).IsRequired();
            entity.Property(e => e.EntityId).HasColumnName("entity_id").HasMaxLength(100);
            entity.Property(e => e.Severity).HasColumnName("severity").HasMaxLength(20).IsRequired();
            entity.Property(e => e.Details).HasColumnName("details").IsRequired();
            entity.Property(e => e.ViolationDataJson).HasColumnName("violation_data").HasColumnType("jsonb");
            entity.Property(e => e.IsOverridden).HasColumnName("is_overridden").IsRequired();
            entity.Property(e => e.OverriddenByUserId).HasColumnName("overridden_by_user_id");
            entity.Property(e => e.OverrideReason).HasColumnName("override_reason");
            entity.Property(e => e.OverriddenAt).HasColumnName("overridden_at");
            entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(20).IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");

            entity.HasOne(e => e.Rule)
                  .WithMany(r => r.Violations)
                  .HasForeignKey(e => e.RuleId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasQueryFilter(e => !_currentTenant.Id.HasValue || e.TenantId == _currentTenant.Id.Value);
        });
    }
}
