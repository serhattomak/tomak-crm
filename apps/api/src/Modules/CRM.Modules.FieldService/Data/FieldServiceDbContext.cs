using CRM.Modules.FieldService.Entities;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.FieldService.Data;

public class FieldServiceDbContext : DbContext
{
    public FieldServiceDbContext(DbContextOptions<FieldServiceDbContext> options)
        : base(options)
    {
    }

    public DbSet<FieldJob> FieldJobs => Set<FieldJob>();
    public DbSet<FieldJobTask> FieldJobTasks => Set<FieldJobTask>();
    public DbSet<FieldJobPart> FieldJobParts => Set<FieldJobPart>();
    public DbSet<FieldJobCheckin> FieldJobCheckins => Set<FieldJobCheckin>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<FieldJob>(entity =>
        {
            entity.ToTable("field_jobs");
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id");
            entity.Property(e => e.JobNumber).HasColumnName("job_number").HasMaxLength(50);
            entity.Property(e => e.Title).HasColumnName("title").HasMaxLength(255);
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.ServiceType).HasColumnName("service_type").HasMaxLength(50);
            entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(50);
            entity.Property(e => e.Priority).HasColumnName("priority").HasMaxLength(50);

            entity.Property(e => e.CustomerId).HasColumnName("customer_id");
            entity.Property(e => e.CustomerName).HasColumnName("customer_name").HasMaxLength(255);
            entity.Property(e => e.ContactPerson).HasColumnName("contact_person").HasMaxLength(255);
            entity.Property(e => e.ContactPhone).HasColumnName("contact_phone").HasMaxLength(50);
            entity.Property(e => e.ServiceAddress).HasColumnName("service_address");
            entity.Property(e => e.City).HasColumnName("city").HasMaxLength(100);
            entity.Property(e => e.District).HasColumnName("district").HasMaxLength(100);
            entity.Property(e => e.Latitude).HasColumnName("latitude");
            entity.Property(e => e.Longitude).HasColumnName("longitude");

            entity.Property(e => e.AssignedTechnicianId).HasColumnName("assigned_technician_id");
            entity.Property(e => e.AssignedTechnicianName).HasColumnName("assigned_technician_name").HasMaxLength(255);
            entity.Property(e => e.ScheduledDate).HasColumnName("scheduled_date");
            entity.Property(e => e.ScheduledStartTime).HasColumnName("scheduled_start_time");
            entity.Property(e => e.ScheduledEndTime).HasColumnName("scheduled_end_time");
            entity.Property(e => e.ActualStartTime).HasColumnName("actual_start_time");
            entity.Property(e => e.ActualEndTime).HasColumnName("actual_end_time");

            entity.Property(e => e.ResolutionNotes).HasColumnName("resolution_notes");
            entity.Property(e => e.CustomerSignatureData).HasColumnName("customer_signature_data");
            entity.Property(e => e.CustomerSignedName).HasColumnName("customer_signed_name").HasMaxLength(255);
            entity.Property(e => e.SignedAt).HasColumnName("signed_at");
            entity.Property(e => e.TotalCost).HasColumnName("total_cost").HasPrecision(18, 2);

            entity.Property(e => e.CreatedById).HasColumnName("created_by_id");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasMany(e => e.Tasks)
                .WithOne(t => t.Job)
                .HasForeignKey(t => t.JobId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.Parts)
                .WithOne(p => p.Job)
                .HasForeignKey(p => p.JobId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.Checkins)
                .WithOne(c => c.Job)
                .HasForeignKey(c => c.JobId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<FieldJobTask>(entity =>
        {
            entity.ToTable("field_job_tasks");
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id");
            entity.Property(e => e.JobId).HasColumnName("job_id");
            entity.Property(e => e.Title).HasColumnName("title").HasMaxLength(255);
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.IsCompleted).HasColumnName("is_completed");
            entity.Property(e => e.CompletedAt).HasColumnName("completed_at");
            entity.Property(e => e.CompletedById).HasColumnName("completed_by_id");
            entity.Property(e => e.DisplayOrder).HasColumnName("display_order");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        });

        modelBuilder.Entity<FieldJobPart>(entity =>
        {
            entity.ToTable("field_job_parts");
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id");
            entity.Property(e => e.JobId).HasColumnName("job_id");
            entity.Property(e => e.ProductId).HasColumnName("product_id");
            entity.Property(e => e.ProductName).HasColumnName("product_name").HasMaxLength(255);
            entity.Property(e => e.UnitPrice).HasColumnName("unit_price").HasPrecision(18, 2);
            entity.Property(e => e.Quantity).HasColumnName("quantity").HasPrecision(18, 2);
            entity.Property(e => e.TotalPrice).HasColumnName("total_price").HasPrecision(18, 2);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        });

        modelBuilder.Entity<FieldJobCheckin>(entity =>
        {
            entity.ToTable("field_job_checkins");
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id");
            entity.Property(e => e.JobId).HasColumnName("job_id");
            entity.Property(e => e.TechnicianId).HasColumnName("technician_id");
            entity.Property(e => e.CheckinType).HasColumnName("checkin_type").HasMaxLength(20);
            entity.Property(e => e.Latitude).HasColumnName("latitude");
            entity.Property(e => e.Longitude).HasColumnName("longitude");
            entity.Property(e => e.DeviceInfo).HasColumnName("device_info").HasMaxLength(255);
            entity.Property(e => e.Timestamp).HasColumnName("timestamp");
        });
    }
}
