using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Chat.Entities;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Chat.Data;

public class ChatDbContext(
    DbContextOptions<ChatDbContext> options,
    ICurrentTenant currentTenant) : DbContext(options)
{
    public DbSet<ChatChannel> Channels => Set<ChatChannel>();
    public DbSet<ChatParticipant> Participants => Set<ChatParticipant>();
    public DbSet<ChatMessage> Messages => Set<ChatMessage>();
    public DbSet<ChatAttachment> Attachments => Set<ChatAttachment>();
    public DbSet<ChatEntityEmbed> EntityEmbeds => Set<ChatEntityEmbed>();
    public DbSet<CannedResponse> CannedResponses => Set<CannedResponse>();
    public DbSet<CustomerSupportSession> SupportSessions => Set<CustomerSupportSession>();
    public DbSet<HelpdeskTicket> Tickets => Set<HelpdeskTicket>();
    public DbSet<HelpdeskTicketActivity> TicketActivities => Set<HelpdeskTicketActivity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // 1. ChatChannel
        modelBuilder.Entity<ChatChannel>(entity =>
        {
            entity.ToTable("chat_channels");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.Type).HasColumnName("type").HasMaxLength(50).IsRequired();
            entity.Property(e => e.Title).HasColumnName("title").HasMaxLength(200).IsRequired();
            entity.Property(e => e.Description).HasColumnName("description").HasMaxLength(500);
            entity.Property(e => e.DepartmentId).HasColumnName("department_id");
            entity.Property(e => e.DepartmentName).HasColumnName("department_name").HasMaxLength(200);
            entity.Property(e => e.CustomerId).HasColumnName("customer_id");
            entity.Property(e => e.CustomerName).HasColumnName("customer_name").HasMaxLength(255);
            entity.Property(e => e.IsPrivate).HasColumnName("is_private");
            entity.Property(e => e.CreatedByUserId).HasColumnName("created_by_user_id");
            entity.Property(e => e.LastMessageAt).HasColumnName("last_message_at");
            entity.Property(e => e.LastMessagePreview).HasColumnName("last_message_preview").HasMaxLength(500);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasMany(e => e.Participants)
                .WithOne(p => p.Channel)
                .HasForeignKey(p => p.ChannelId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.Messages)
                .WithOne(m => m.Channel)
                .HasForeignKey(m => m.ChannelId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.SupportSession)
                .WithOne(s => s.Channel)
                .HasForeignKey<CustomerSupportSession>(s => s.ChannelId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.Tickets)
                .WithOne(t => t.Channel)
                .HasForeignKey(t => t.ChannelId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        // 2. ChatParticipant
        modelBuilder.Entity<ChatParticipant>(entity =>
        {
            entity.ToTable("chat_participants");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.ChannelId).HasColumnName("channel_id").IsRequired();
            entity.Property(e => e.UserId).HasColumnName("user_id").IsRequired();
            entity.Property(e => e.UserName).HasColumnName("user_name").HasMaxLength(255).IsRequired();
            entity.Property(e => e.UserEmail).HasColumnName("user_email").HasMaxLength(255);
            entity.Property(e => e.UserAvatarUrl).HasColumnName("user_avatar_url").HasMaxLength(500);
            entity.Property(e => e.Role).HasColumnName("role").HasMaxLength(50);
            entity.Property(e => e.JoinedAt).HasColumnName("joined_at");
            entity.Property(e => e.LastReadAt).HasColumnName("last_read_at");
            entity.Property(e => e.IsMuted).HasColumnName("is_muted");

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        // 3. ChatMessage
        modelBuilder.Entity<ChatMessage>(entity =>
        {
            entity.ToTable("chat_messages");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.ChannelId).HasColumnName("channel_id").IsRequired();
            entity.Property(e => e.SenderUserId).HasColumnName("sender_user_id");
            entity.Property(e => e.SenderName).HasColumnName("sender_name").HasMaxLength(255).IsRequired();
            entity.Property(e => e.SenderAvatarUrl).HasColumnName("sender_avatar_url").HasMaxLength(500);
            entity.Property(e => e.SenderType).HasColumnName("sender_type").HasMaxLength(50).IsRequired();
            entity.Property(e => e.Content).HasColumnName("content").IsRequired();
            entity.Property(e => e.MessageType).HasColumnName("message_type").HasMaxLength(50).IsRequired();
            entity.Property(e => e.ReplyToMessageId).HasColumnName("reply_to_message_id");
            entity.Property(e => e.IsEdited).HasColumnName("is_edited");
            entity.Property(e => e.IsDeleted).HasColumnName("is_deleted");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasMany(e => e.Attachments)
                .WithOne(a => a.Message)
                .HasForeignKey(a => a.MessageId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.EntityEmbeds)
                .WithOne(ee => ee.Message)
                .HasForeignKey(ee => ee.MessageId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        // 4. ChatAttachment
        modelBuilder.Entity<ChatAttachment>(entity =>
        {
            entity.ToTable("chat_attachments");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.MessageId).HasColumnName("message_id").IsRequired();
            entity.Property(e => e.FileName).HasColumnName("file_name").HasMaxLength(255).IsRequired();
            entity.Property(e => e.FileUrl).HasColumnName("file_url").HasMaxLength(1000).IsRequired();
            entity.Property(e => e.FileType).HasColumnName("file_type").HasMaxLength(100);
            entity.Property(e => e.FileSizeBytes).HasColumnName("file_size_bytes");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        // 5. ChatEntityEmbed
        modelBuilder.Entity<ChatEntityEmbed>(entity =>
        {
            entity.ToTable("chat_entity_embeds");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.MessageId).HasColumnName("message_id").IsRequired();
            entity.Property(e => e.EntityType).HasColumnName("entity_type").HasMaxLength(50).IsRequired();
            entity.Property(e => e.EntityId).HasColumnName("entity_id").IsRequired();
            entity.Property(e => e.EntityTitle).HasColumnName("entity_title").HasMaxLength(255).IsRequired();
            entity.Property(e => e.EntitySubtitle).HasColumnName("entity_subtitle").HasMaxLength(255);
            entity.Property(e => e.EntityStatus).HasColumnName("entity_status").HasMaxLength(50);
            entity.Property(e => e.MetadataJson).HasColumnName("metadata_json");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        // 6. CannedResponse
        modelBuilder.Entity<CannedResponse>(entity =>
        {
            entity.ToTable("canned_responses");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.Shortcut).HasColumnName("shortcut").HasMaxLength(50).IsRequired();
            entity.Property(e => e.Title).HasColumnName("title").HasMaxLength(150).IsRequired();
            entity.Property(e => e.Category).HasColumnName("category").HasMaxLength(100);
            entity.Property(e => e.Content).HasColumnName("content").IsRequired();
            entity.Property(e => e.CreatedByUserId).HasColumnName("created_by_user_id");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        // 7. CustomerSupportSession
        modelBuilder.Entity<CustomerSupportSession>(entity =>
        {
            entity.ToTable("customer_support_sessions");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.ChannelId).HasColumnName("channel_id").IsRequired();
            entity.Property(e => e.CustomerId).HasColumnName("customer_id").IsRequired();
            entity.Property(e => e.CustomerName).HasColumnName("customer_name").HasMaxLength(255).IsRequired();
            entity.Property(e => e.CustomerEmail).HasColumnName("customer_email").HasMaxLength(255);
            entity.Property(e => e.CustomerPhone).HasColumnName("customer_phone").HasMaxLength(50);
            entity.Property(e => e.AssignedUserId).HasColumnName("assigned_user_id");
            entity.Property(e => e.AssignedUserName).HasColumnName("assigned_user_name").HasMaxLength(255);
            entity.Property(e => e.DepartmentId).HasColumnName("department_id");
            entity.Property(e => e.DepartmentName).HasColumnName("department_name").HasMaxLength(200);
            entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(50).IsRequired();
            entity.Property(e => e.Priority).HasColumnName("priority").HasMaxLength(50).IsRequired();
            entity.Property(e => e.Subject).HasColumnName("subject").HasMaxLength(255);
            entity.Property(e => e.ResolutionNotes).HasColumnName("resolution_notes");
            entity.Property(e => e.ClosedAt).HasColumnName("closed_at");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        // 8. HelpdeskTicket
        modelBuilder.Entity<HelpdeskTicket>(entity =>
        {
            entity.ToTable("helpdesk_tickets");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.TicketNumber).HasColumnName("ticket_number").HasMaxLength(50).IsRequired();
            entity.Property(e => e.ChannelId).HasColumnName("channel_id");
            entity.Property(e => e.CustomerId).HasColumnName("customer_id").IsRequired();
            entity.Property(e => e.CustomerName).HasColumnName("customer_name").HasMaxLength(255).IsRequired();
            entity.Property(e => e.CustomerEmail).HasColumnName("customer_email").HasMaxLength(255);
            entity.Property(e => e.CustomerPhone).HasColumnName("customer_phone").HasMaxLength(50);
            entity.Property(e => e.Subject).HasColumnName("subject").HasMaxLength(255).IsRequired();
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.Category).HasColumnName("category").HasMaxLength(100).IsRequired();
            entity.Property(e => e.Source).HasColumnName("source").HasMaxLength(50).IsRequired();
            entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(50).IsRequired();
            entity.Property(e => e.Priority).HasColumnName("priority").HasMaxLength(50).IsRequired();
            entity.Property(e => e.DepartmentId).HasColumnName("department_id");
            entity.Property(e => e.DepartmentName).HasColumnName("department_name").HasMaxLength(200);
            entity.Property(e => e.AssignedUserId).HasColumnName("assigned_user_id");
            entity.Property(e => e.AssignedUserName).HasColumnName("assigned_user_name").HasMaxLength(255);
            entity.Property(e => e.CreatedByUserId).HasColumnName("created_by_user_id");
            entity.Property(e => e.SlaFirstResponseDueAt).HasColumnName("sla_first_response_due_at");
            entity.Property(e => e.SlaResolutionDueAt).HasColumnName("sla_resolution_due_at");
            entity.Property(e => e.FirstResponseAt).HasColumnName("first_response_at");
            entity.Property(e => e.ResolvedAt).HasColumnName("resolved_at");
            entity.Property(e => e.ClosedAt).HasColumnName("closed_at");
            entity.Property(e => e.ResolutionNotes).HasColumnName("resolution_notes");
            entity.Property(e => e.LinkedEntityType).HasColumnName("linked_entity_type").HasMaxLength(50);
            entity.Property(e => e.LinkedEntityId).HasColumnName("linked_entity_id");
            entity.Property(e => e.LinkedEntityTitle).HasColumnName("linked_entity_title").HasMaxLength(255);
            entity.Property(e => e.SatisfactionRating).HasColumnName("satisfaction_rating");
            entity.Property(e => e.SatisfactionFeedback).HasColumnName("satisfaction_feedback");
            entity.Property(e => e.Tags).HasColumnName("tags");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasMany(e => e.Activities)
                .WithOne(a => a.Ticket)
                .HasForeignKey(a => a.TicketId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        // 9. HelpdeskTicketActivity
        modelBuilder.Entity<HelpdeskTicketActivity>(entity =>
        {
            entity.ToTable("helpdesk_ticket_activities");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.TicketId).HasColumnName("ticket_id").IsRequired();
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.UserName).HasColumnName("user_name").HasMaxLength(255).IsRequired();
            entity.Property(e => e.ActionType).HasColumnName("action_type").HasMaxLength(100).IsRequired();
            entity.Property(e => e.Description).HasColumnName("description").IsRequired();
            entity.Property(e => e.OldValue).HasColumnName("old_value").HasMaxLength(255);
            entity.Property(e => e.NewValue).HasColumnName("new_value").HasMaxLength(255);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });
    }
}
