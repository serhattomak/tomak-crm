using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using CRM.BuildingBlocks.Tenancy;

namespace CRM.Modules.Chat.Entities;

[Table("chat_channels", Schema = "public")]
public class ChatChannel : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }

    [MaxLength(50)]
    public string Type { get; set; } = "Group"; // Direct, Group, CustomerSupport

    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }

    public Guid? DepartmentId { get; set; }
    [MaxLength(200)]
    public string? DepartmentName { get; set; }

    public Guid? CustomerId { get; set; }
    [MaxLength(255)]
    public string? CustomerName { get; set; }

    public bool IsPrivate { get; set; } = false;

    public Guid? CreatedByUserId { get; set; }
    public DateTime? LastMessageAt { get; set; }

    [MaxLength(500)]
    public string? LastMessagePreview { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<ChatParticipant> Participants { get; set; } = new List<ChatParticipant>();
    public ICollection<ChatMessage> Messages { get; set; } = new List<ChatMessage>();
    public CustomerSupportSession? SupportSession { get; set; }
    public ICollection<HelpdeskTicket> Tickets { get; set; } = new List<HelpdeskTicket>();
}

[Table("chat_participants", Schema = "public")]
public class ChatParticipant : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }

    public Guid ChannelId { get; set; }
    public ChatChannel Channel { get; set; } = null!;

    public Guid UserId { get; set; }

    [MaxLength(255)]
    public string UserName { get; set; } = string.Empty;

    [MaxLength(255)]
    public string? UserEmail { get; set; }

    [MaxLength(500)]
    public string? UserAvatarUrl { get; set; }

    [MaxLength(50)]
    public string Role { get; set; } = "Member"; // Owner, Admin, Member, Agent, Customer

    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastReadAt { get; set; }
    public bool IsMuted { get; set; } = false;
}

[Table("chat_messages", Schema = "public")]
public class ChatMessage : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }

    public Guid ChannelId { get; set; }
    public ChatChannel Channel { get; set; } = null!;

    public Guid? SenderUserId { get; set; }

    [MaxLength(255)]
    public string SenderName { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? SenderAvatarUrl { get; set; }

    [MaxLength(50)]
    public string SenderType { get; set; } = "User"; // User, Customer, System

    public string Content { get; set; } = string.Empty;

    [MaxLength(50)]
    public string MessageType { get; set; } = "Text"; // Text, InternalNote, SystemEvent, EntityEmbed

    public Guid? ReplyToMessageId { get; set; }

    public bool IsEdited { get; set; } = false;
    public bool IsDeleted { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<ChatAttachment> Attachments { get; set; } = new List<ChatAttachment>();
    public ICollection<ChatEntityEmbed> EntityEmbeds { get; set; } = new List<ChatEntityEmbed>();
}

[Table("chat_attachments", Schema = "public")]
public class ChatAttachment : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }

    public Guid MessageId { get; set; }
    public ChatMessage Message { get; set; } = null!;

    [MaxLength(255)]
    public string FileName { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string FileUrl { get; set; } = string.Empty;

    [MaxLength(100)]
    public string FileType { get; set; } = "document"; // image, pdf, document, audio, other

    public long FileSizeBytes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

[Table("chat_entity_embeds", Schema = "public")]
public class ChatEntityEmbed : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }

    public Guid MessageId { get; set; }
    public ChatMessage Message { get; set; } = null!;

    [MaxLength(50)]
    public string EntityType { get; set; } = "Customer"; // Customer, Order, Product, LeaveRequest, ShiftSchedule, AttendanceRecord, Quote

    public Guid EntityId { get; set; }

    [MaxLength(255)]
    public string EntityTitle { get; set; } = string.Empty;

    [MaxLength(255)]
    public string? EntitySubtitle { get; set; }

    [MaxLength(50)]
    public string? EntityStatus { get; set; }

    public string? MetadataJson { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

[Table("canned_responses", Schema = "public")]
public class CannedResponse : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }

    [MaxLength(50)]
    public string Shortcut { get; set; } = string.Empty; // e.g. "selam", "kargo", "iade"

    [MaxLength(150)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Category { get; set; } = "Genel"; // Genel, Satış, Destek, Faturalandırma

    public string Content { get; set; } = string.Empty;

    public Guid? CreatedByUserId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

[Table("customer_support_sessions", Schema = "public")]
public class CustomerSupportSession : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }

    public Guid ChannelId { get; set; }
    public ChatChannel Channel { get; set; } = null!;

    public Guid CustomerId { get; set; }

    [MaxLength(255)]
    public string CustomerName { get; set; } = string.Empty;

    [MaxLength(255)]
    public string? CustomerEmail { get; set; }

    [MaxLength(50)]
    public string? CustomerPhone { get; set; }

    public Guid? AssignedUserId { get; set; }

    [MaxLength(255)]
    public string? AssignedUserName { get; set; }

    public Guid? DepartmentId { get; set; }

    [MaxLength(200)]
    public string? DepartmentName { get; set; }

    [MaxLength(50)]
    public string Status { get; set; } = "Open"; // Open, Pending, Resolved, Closed

    [MaxLength(50)]
    public string Priority { get; set; } = "Medium"; // Low, Medium, High, Urgent

    [MaxLength(255)]
    public string? Subject { get; set; }

    public string? ResolutionNotes { get; set; }

    public DateTime? ClosedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

[Table("helpdesk_tickets", Schema = "public")]
public class HelpdeskTicket : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }

    [MaxLength(50)]
    public string TicketNumber { get; set; } = string.Empty; // TICK-1001

    public Guid? ChannelId { get; set; }
    public ChatChannel? Channel { get; set; }

    public Guid CustomerId { get; set; }

    [MaxLength(255)]
    public string CustomerName { get; set; } = string.Empty;

    [MaxLength(255)]
    public string? CustomerEmail { get; set; }

    [MaxLength(50)]
    public string? CustomerPhone { get; set; }

    [MaxLength(255)]
    public string Subject { get; set; } = string.Empty;

    public string? Description { get; set; }

    [MaxLength(100)]
    public string Category { get; set; } = "Genel"; // Teknik, Satış, Fatura, Kargo, İade, Genel

    [MaxLength(50)]
    public string Source { get; set; } = "Web"; // LiveChat, Email, Phone, Web, Internal

    [MaxLength(50)]
    public string Status { get; set; } = "New"; // New, InProgress, PendingCustomer, OnHold, Resolved, Closed

    [MaxLength(50)]
    public string Priority { get; set; } = "Medium"; // Low, Medium, High, Urgent

    public Guid? DepartmentId { get; set; }

    [MaxLength(200)]
    public string? DepartmentName { get; set; }

    public Guid? AssignedUserId { get; set; }

    [MaxLength(255)]
    public string? AssignedUserName { get; set; }

    public Guid? CreatedByUserId { get; set; }

    public DateTime? SlaFirstResponseDueAt { get; set; }
    public DateTime? SlaResolutionDueAt { get; set; }
    public DateTime? FirstResponseAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public DateTime? ClosedAt { get; set; }
    public string? ResolutionNotes { get; set; }

    [MaxLength(50)]
    public string? LinkedEntityType { get; set; } // Order, Quote, Product

    public Guid? LinkedEntityId { get; set; }

    [MaxLength(255)]
    public string? LinkedEntityTitle { get; set; }

    public int? SatisfactionRating { get; set; }
    public string? SatisfactionFeedback { get; set; }

    public List<string> Tags { get; set; } = new List<string>();

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<HelpdeskTicketActivity> Activities { get; set; } = new List<HelpdeskTicketActivity>();
}

[Table("helpdesk_ticket_activities", Schema = "public")]
public class HelpdeskTicketActivity : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }

    public Guid TicketId { get; set; }
    public HelpdeskTicket Ticket { get; set; } = null!;

    public Guid? UserId { get; set; }

    [MaxLength(255)]
    public string UserName { get; set; } = string.Empty;

    [MaxLength(100)]
    public string ActionType { get; set; } = "Created"; // Created, StatusChanged, PriorityChanged, Assigned, InternalNoteAdded, PublicReplyAdded, Resolved, Closed

    public string Description { get; set; } = string.Empty;

    [MaxLength(255)]
    public string? OldValue { get; set; }

    [MaxLength(255)]
    public string? NewValue { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

[Table("whatsapp_settings", Schema = "public")]
public class WhatsAppSettings : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }

    [MaxLength(100)]
    public string PhoneNumberId { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? WabaId { get; set; }

    public string AccessToken { get; set; } = string.Empty;

    [MaxLength(100)]
    public string WebhookVerifyToken { get; set; } = string.Empty;

    [MaxLength(50)]
    public string? BusinessPhoneNumber { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

[Table("whatsapp_messages", Schema = "public")]
public class WhatsAppMessage : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }

    public Guid? CustomerId { get; set; }
    [MaxLength(255)]
    public string? CustomerName { get; set; }

    [MaxLength(50)]
    public string PhoneNumber { get; set; } = string.Empty;

    [MaxLength(20)]
    public string Direction { get; set; } = "Inbound"; // Inbound, Outbound

    public string MessageText { get; set; } = string.Empty;
    public string? MediaUrl { get; set; }
    [MaxLength(50)]
    public string? MediaType { get; set; }

    [MaxLength(150)]
    public string? MetaMessageId { get; set; }

    [MaxLength(50)]
    public string Status { get; set; } = "Sent"; // Sent, Delivered, Read, Failed, Received

    public string? ErrorMessage { get; set; }

    public Guid? SenderUserId { get; set; }
    [MaxLength(255)]
    public string? SenderUserName { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
