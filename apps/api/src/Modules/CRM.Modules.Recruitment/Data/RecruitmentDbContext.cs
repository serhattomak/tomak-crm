using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Recruitment.Entities;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Recruitment.Data;

public class RecruitmentDbContext(
    DbContextOptions<RecruitmentDbContext> options,
    ICurrentTenant currentTenant) : DbContext(options)
{
    public DbSet<JobRequisition> JobRequisitions => Set<JobRequisition>();
    public DbSet<RecruitmentStage> RecruitmentStages => Set<RecruitmentStage>();
    public DbSet<Candidate> Candidates => Set<Candidate>();
    public DbSet<Application> Applications => Set<Application>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // 1. JobRequisition — public.job_requisitions
        modelBuilder.Entity<JobRequisition>(entity =>
        {
            entity.ToTable("job_requisitions", t =>
            {
                t.HasCheckConstraint("chk_job_requisitions_headcount", "headcount >= 1");
                t.HasCheckConstraint("chk_job_requisitions_salary_range", "max_salary IS NULL OR min_salary IS NULL OR max_salary >= min_salary");
            });
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.Title).HasColumnName("title").HasMaxLength(255).IsRequired();
            entity.Property(e => e.DepartmentId).HasColumnName("department_id");
            entity.Property(e => e.JobPositionId).HasColumnName("job_position_id");
            entity.Property(e => e.Headcount).HasColumnName("headcount").IsRequired();
            entity.Property(e => e.EmploymentType).HasColumnName("employment_type").HasMaxLength(50);
            entity.Property(e => e.WorkModel).HasColumnName("work_model").HasMaxLength(50);
            entity.Property(e => e.Location).HasColumnName("location").HasMaxLength(255);
            entity.Property(e => e.MinSalary).HasColumnName("min_salary").HasPrecision(18, 2);
            entity.Property(e => e.MaxSalary).HasColumnName("max_salary").HasPrecision(18, 2);
            entity.Property(e => e.Currency).HasColumnName("currency").HasMaxLength(10).IsRequired();
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.Requirements).HasColumnName("requirements");
            entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(50).IsRequired();
            entity.Property(e => e.IsPublished).HasColumnName("is_published").IsRequired();
            entity.Property(e => e.PublishedAt).HasColumnName("published_at");
            entity.Property(e => e.ClosingDate).HasColumnName("closing_date");
            entity.Property(e => e.HiringManagerId).HasColumnName("hiring_manager_id");
            entity.Property(e => e.Priority).HasColumnName("priority").HasMaxLength(20).IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasIndex(e => e.TenantId).HasDatabaseName("idx_job_requisitions_tenant");
            entity.HasIndex(e => new { e.TenantId, e.Status }).HasDatabaseName("idx_job_requisitions_tenant_status");
            entity.HasIndex(e => new { e.TenantId, e.DepartmentId }).HasDatabaseName("idx_job_requisitions_tenant_dept");
            entity.HasIndex(e => new { e.TenantId, e.IsPublished }).HasDatabaseName("idx_job_requisitions_tenant_published");

            // Cross-module FKs (departments, job_positions, employees) are DB-enforced as SET NULL / CASCADE;
            // no principal navigation within this DbContext - shadow FK only.

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        // 2. RecruitmentStage — public.recruitment_stages
        modelBuilder.Entity<RecruitmentStage>(entity =>
        {
            entity.ToTable("recruitment_stages");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(100).IsRequired();
            entity.Property(e => e.Slug).HasColumnName("slug").HasMaxLength(100).IsRequired();
            entity.Property(e => e.SortOrder).HasColumnName("sort_order").IsRequired();
            entity.Property(e => e.ColorHex).HasColumnName("color_hex").HasMaxLength(20).IsRequired();
            entity.Property(e => e.IsDefault).HasColumnName("is_default").IsRequired();
            entity.Property(e => e.StageType).HasColumnName("stage_type").HasMaxLength(50).IsRequired();
            entity.Property(e => e.IsActive).HasColumnName("is_active").IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasIndex(e => new { e.TenantId, e.Slug }).IsUnique().HasDatabaseName("uq_recruitment_stages_tenant_slug");
            entity.HasIndex(e => e.TenantId).HasDatabaseName("idx_recruitment_stages_tenant");
            entity.HasIndex(e => new { e.TenantId, e.SortOrder }).HasDatabaseName("idx_recruitment_stages_tenant_sort");
            entity.HasIndex(e => new { e.TenantId, e.IsActive }).HasDatabaseName("idx_recruitment_stages_tenant_active");

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        // 3. Candidate — public.candidates (soft delete via DeletedAt)
        modelBuilder.Entity<Candidate>(entity =>
        {
            entity.ToTable("candidates");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.FirstName).HasColumnName("first_name").HasMaxLength(100).IsRequired();
            entity.Property(e => e.LastName).HasColumnName("last_name").HasMaxLength(100).IsRequired();
            entity.Property(e => e.Email).HasColumnName("email").HasMaxLength(255).IsRequired();
            entity.Property(e => e.Phone).HasColumnName("phone").HasMaxLength(50);
            entity.Property(e => e.BirthDate).HasColumnName("birth_date");
            entity.Property(e => e.Address).HasColumnName("address");
            entity.Property(e => e.Source).HasColumnName("source").HasMaxLength(50).IsRequired();
            entity.Property(e => e.Tags).HasColumnName("tags").HasColumnType("text[]");
            entity.Property(e => e.CvFileUrl).HasColumnName("cv_file_url");
            entity.Property(e => e.CvFileName).HasColumnName("cv_file_name").HasMaxLength(255);
            entity.Property(e => e.ConsentGiven).HasColumnName("consent_given").IsRequired();
            entity.Property(e => e.ConsentGivenAt).HasColumnName("consent_given_at");
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.DeletedAt).HasColumnName("deleted_at");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasIndex(e => e.TenantId).HasDatabaseName("idx_candidates_tenant");
            entity.HasIndex(e => new { e.TenantId, e.DeletedAt }).HasDatabaseName("idx_candidates_tenant_deleted");
            entity.HasIndex(e => new { e.TenantId, e.Source }).HasDatabaseName("idx_candidates_tenant_source");
            entity.HasIndex(e => new { e.TenantId, e.Email })
                .IsUnique()
                .HasFilter("deleted_at IS NULL")
                .HasDatabaseName("uq_candidates_tenant_email_active");

            // Tenancy + soft delete: exclude logically deleted rows
            entity.HasQueryFilter(e =>
                (!currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value)
                && !e.DeletedAt.HasValue);
        });

        // 4. Application — public.applications
        modelBuilder.Entity<Application>(entity =>
        {
            entity.ToTable("applications", t => t.HasCheckConstraint("chk_applications_score", "score IS NULL OR (score >= 0 AND score <= 100)"));
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.CandidateId).HasColumnName("candidate_id").IsRequired();
            entity.Property(e => e.RequisitionId).HasColumnName("requisition_id").IsRequired();
            entity.Property(e => e.StageId).HasColumnName("stage_id");
            entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(50).IsRequired();
            entity.Property(e => e.Score).HasColumnName("score").HasPrecision(5, 2);
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasIndex(e => new { e.CandidateId, e.RequisitionId }).IsUnique().HasDatabaseName("uq_applications_candidate_requisition");
            entity.HasIndex(e => e.TenantId).HasDatabaseName("idx_applications_tenant");
            entity.HasIndex(e => new { e.TenantId, e.CandidateId }).HasDatabaseName("idx_applications_tenant_candidate");
            entity.HasIndex(e => new { e.TenantId, e.RequisitionId }).HasDatabaseName("idx_applications_tenant_requisition");
            entity.HasIndex(e => new { e.TenantId, e.StageId }).HasDatabaseName("idx_applications_tenant_stage");
            entity.HasIndex(e => new { e.TenantId, e.Status }).HasDatabaseName("idx_applications_tenant_status");

            entity.HasOne(e => e.Candidate)
                .WithMany(c => c.Applications)
                .HasForeignKey(e => e.CandidateId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Requisition)
                .WithMany(r => r.Applications)
                .HasForeignKey(e => e.RequisitionId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Stage)
                .WithMany(s => s.Applications)
                .HasForeignKey(e => e.StageId)
                .OnDelete(DeleteBehavior.SetNull);

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
