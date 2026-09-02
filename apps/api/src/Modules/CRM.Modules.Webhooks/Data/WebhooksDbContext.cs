using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Webhooks.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using System.Text.Json;

namespace CRM.Modules.Webhooks.Data;

public class WebhooksDbContext(
    DbContextOptions<WebhooksDbContext> options,
    ICurrentTenant currentTenant) : DbContext(options)
{
    public DbSet<WebhookEndpoint> WebhookEndpoints => Set<WebhookEndpoint>();
    public DbSet<WebhookDelivery> WebhookDeliveries => Set<WebhookDelivery>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Value converters for jsonb array/dictionary handling
        // WebhookEndpoint.Events is string[] stored as jsonb text
        ValueConverter<string[], string> eventsConverter = new(
            v => JsonSerializer.Serialize(v ?? [], WebhookJsonDefaults.Options),
            v => JsonSerializer.Deserialize<string[]>(v, WebhookJsonDefaults.Options) ?? []);

        ValueConverter<Dictionary<string, string>, string> headersConverter = new(
            v => JsonSerializer.Serialize(v ?? new Dictionary<string, string>(), WebhookJsonDefaults.Options),
            v => JsonSerializer.Deserialize<Dictionary<string, string>>(v, WebhookJsonDefaults.Options) ?? new Dictionary<string, string>());

        // 1. WebhookEndpoint
        modelBuilder.Entity<WebhookEndpoint>(entity =>
        {
            entity.ToTable("webhook_endpoints", "public");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(255).IsRequired();
            entity.Property(e => e.Url).HasColumnName("url").IsRequired();
            entity.Property(e => e.SecretEncrypted).HasColumnName("secret_encrypted");
            entity.Property(e => e.Events)
                .HasColumnName("events")
                .HasColumnType("jsonb")
                .HasConversion(eventsConverter)
                .IsRequired();
            entity.Property(e => e.IsActive).HasColumnName("is_active").IsRequired();
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasMany(e => e.Deliveries)
                .WithOne(d => d.Endpoint)
                .HasForeignKey(d => d.EndpointId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        // 2. WebhookDelivery
        modelBuilder.Entity<WebhookDelivery>(entity =>
        {
            entity.ToTable("webhook_deliveries", "public");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.EndpointId).HasColumnName("endpoint_id").IsRequired();
            entity.Property(e => e.EventType).HasColumnName("event_type").HasMaxLength(100).IsRequired();
            entity.Property(e => e.PayloadJson).HasColumnName("payload").HasColumnType("jsonb").IsRequired();
            entity.Property(e => e.HeadersJson)
                .HasColumnName("headers")
                .HasColumnType("jsonb")
                .HasConversion(headersConverter)
                .IsRequired();
            entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(50).IsRequired();
            entity.Property(e => e.AttemptCount).HasColumnName("attempt_count");
            entity.Property(e => e.NextRetryAt).HasColumnName("next_retry_at");
            entity.Property(e => e.ResponseCode).HasColumnName("response_code");
            entity.Property(e => e.ResponseBody).HasColumnName("response_body");
            entity.Property(e => e.DurationMs).HasColumnName("duration_ms");
            entity.Property(e => e.HmacSignature).HasColumnName("hmac_signature");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        // Auto-assign TenantId on added ITenantScopedEntity, and maintain UpdatedAt for endpoints
        if (currentTenant.Id.HasValue && currentTenant.Id.Value != Guid.Empty)
        {
            Guid tenantId = currentTenant.Id.Value;
            foreach (Microsoft.EntityFrameworkCore.ChangeTracking.EntityEntry<ITenantScopedEntity> entry in ChangeTracker.Entries<ITenantScopedEntity>())
            {
                if (entry.State == EntityState.Added && entry.Entity.TenantId == Guid.Empty)
                {
                    entry.Entity.TenantId = tenantId;
                }
            }
        }

        // Touch UpdatedAt for modified endpoints
        foreach (Microsoft.EntityFrameworkCore.ChangeTracking.EntityEntry<WebhookEndpoint> entry in ChangeTracker.Entries<WebhookEndpoint>())
        {
            if (entry.State == EntityState.Modified)
            {
                entry.Entity.UpdatedAt = DateTime.UtcNow;
            }
        }

        return base.SaveChangesAsync(cancellationToken);
    }
}
