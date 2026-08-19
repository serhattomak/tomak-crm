using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Organization.Entities;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Organization.Data;

public class OrganizationDbContext(
    DbContextOptions<OrganizationDbContext> options,
    ICurrentTenant currentTenant) : DbContext(options)
{
    public DbSet<Department> Departments => Set<Department>();
    public DbSet<JobPosition> JobPositions => Set<JobPosition>();
    public DbSet<Employee> Employees => Set<Employee>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // 1. Department
        modelBuilder.Entity<Department>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.ParentId).HasColumnName("parent_id");
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(150).IsRequired();
            entity.Property(e => e.Code).HasColumnName("code").HasMaxLength(50);
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.LeadId).HasColumnName("lead_id");
            entity.Property(e => e.CostCenter).HasColumnName("cost_center").HasMaxLength(100);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(e => e.Parent)
                  .WithMany(d => d.SubDepartments)
                  .HasForeignKey(e => e.ParentId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.Lead)
                  .WithMany()
                  .HasForeignKey(e => e.LeadId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        // 2. JobPosition
        modelBuilder.Entity<JobPosition>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.DepartmentId).HasColumnName("department_id");
            entity.Property(e => e.Title).HasColumnName("title").HasMaxLength(150).IsRequired();
            entity.Property(e => e.Level).HasColumnName("level").HasMaxLength(50).IsRequired();
            entity.Property(e => e.JobDescription).HasColumnName("job_description");
            entity.Property(e => e.MinSalary).HasColumnName("min_salary").HasPrecision(18, 2);
            entity.Property(e => e.MaxSalary).HasColumnName("max_salary").HasPrecision(18, 2);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(e => e.Department)
                  .WithMany(d => d.JobPositions)
                  .HasForeignKey(e => e.DepartmentId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        // 3. Employee
        modelBuilder.Entity<Employee>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.DepartmentId).HasColumnName("department_id");
            entity.Property(e => e.JobPositionId).HasColumnName("job_position_id");
            entity.Property(e => e.ManagerId).HasColumnName("manager_id");
            entity.Property(e => e.FirstName).HasColumnName("first_name").HasMaxLength(100).IsRequired();
            entity.Property(e => e.LastName).HasColumnName("last_name").HasMaxLength(100).IsRequired();
            entity.Property(e => e.Email).HasColumnName("email").HasMaxLength(255).IsRequired();
            entity.Property(e => e.Phone).HasColumnName("phone").HasMaxLength(50);
            entity.Property(e => e.EmployeeNumber).HasColumnName("employee_number").HasMaxLength(50);
            entity.Property(e => e.Title).HasColumnName("title").HasMaxLength(150);
            entity.Property(e => e.EmploymentType).HasColumnName("employment_type").HasMaxLength(50).IsRequired();
            entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(50).IsRequired();
            entity.Property(e => e.HireDate).HasColumnName("hire_date");
            entity.Property(e => e.AvatarUrl).HasColumnName("avatar_url");
            entity.Property(e => e.Salary).HasColumnName("salary").HasPrecision(18, 2);
            entity.Property(e => e.Currency).HasColumnName("currency").HasMaxLength(10).IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(e => e.Department)
                  .WithMany(d => d.Employees)
                  .HasForeignKey(e => e.DepartmentId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.JobPosition)
                  .WithMany(p => p.Employees)
                  .HasForeignKey(e => e.JobPositionId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.Manager)
                  .WithMany(m => m.DirectReports)
                  .HasForeignKey(e => e.ManagerId)
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
