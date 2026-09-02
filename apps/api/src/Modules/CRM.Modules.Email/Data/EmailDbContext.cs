using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Email.Entities;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Email.Data;

public class EmailDbContext(
    DbContextOptions<EmailDbContext> options,
    ICurrentTenant currentTenant) : DbContext(options)
{
    public DbSet<EmailAccount> Accounts => Set<EmailAccount>();
    public DbSet<EmailMessage> Messages => Set<EmailMessage>();
    public DbSet<EmailAttachment> Attachments => Set<EmailAttachment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // 1. EmailAccount
        modelBuilder.Entity<EmailAccount>(entity =>
        {
            entity.ToTable("email_accounts", "public");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.Email).HasColumnName("email").HasMaxLength(255).IsRequired();
            entity.Property(e => e.Provider).HasColumnName("provider").HasMaxLength(50).IsRequired();
            entity.Property(e => e.ImapHost).HasColumnName("imap_host");
            entity.Property(e => e.ImapPort).HasColumnName("imap_port").IsRequired();
            entity.Property(e => e.SmtpHost).HasColumnName("smtp_host");
            entity.Property(e => e.SmtpPort).HasColumnName("smtp_port").IsRequired();
            entity.Property(e => e.EncryptedPassword).HasColumnName("encrypted_password");
            entity.Property(e => e.IsActive).HasColumnName("is_active").IsRequired();
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasMany(e => e.Messages)
                .WithOne(m => m.Account)
                .HasForeignKey(m => m.AccountId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        // 2. EmailMessage
        modelBuilder.Entity<EmailMessage>(entity =>
        {
            entity.ToTable("email_messages", "public");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.AccountId).HasColumnName("account_id").IsRequired();
            entity.Property(e => e.ThreadId).HasColumnName("thread_id");
            entity.Property(e => e.Direction).HasColumnName("direction").HasMaxLength(20).IsRequired();
            entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(20).IsRequired();
            entity.Property(e => e.FromAddress).HasColumnName("from_address").IsRequired();
            entity.Property(e => e.ToAddresses)
                .HasColumnName("to_addresses")
                .HasColumnType("text[]")
                .IsRequired();
            entity.Property(e => e.CcAddresses)
                .HasColumnName("cc_addresses")
                .HasColumnType("text[]");
            entity.Property(e => e.Subject).HasColumnName("subject");
            entity.Property(e => e.HtmlBody).HasColumnName("html_body");
            entity.Property(e => e.TextBody).HasColumnName("text_body");
            entity.Property(e => e.ExternalId).HasColumnName("external_id");
            entity.Property(e => e.CustomerId).HasColumnName("customer_id");
            entity.Property(e => e.QuoteId).HasColumnName("quote_id");
            entity.Property(e => e.TicketId).HasColumnName("ticket_id");
            entity.Property(e => e.IsRead).HasColumnName("is_read").IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");

            entity.HasMany(e => e.Attachments)
                .WithOne(a => a.Message)
                .HasForeignKey(a => a.MessageId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        // 3. EmailAttachment
        modelBuilder.Entity<EmailAttachment>(entity =>
        {
            entity.ToTable("email_attachments", "public");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.MessageId).HasColumnName("message_id").IsRequired();
            entity.Property(e => e.Filename).HasColumnName("filename").IsRequired();
            entity.Property(e => e.MimeType).HasColumnName("mime_type");
            entity.Property(e => e.SizeBytes).HasColumnName("size_bytes");
            entity.Property(e => e.StoragePath).HasColumnName("storage_path").IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
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

        foreach (Microsoft.EntityFrameworkCore.ChangeTracking.EntityEntry<EmailAccount> entry in ChangeTracker.Entries<EmailAccount>())
        {
            if (entry.State == EntityState.Modified)
            {
                entry.Entity.UpdatedAt = DateTime.UtcNow;
            }
        }

        return base.SaveChangesAsync(cancellationToken);
    }
}
