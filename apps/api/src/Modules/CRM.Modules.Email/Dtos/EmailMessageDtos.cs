namespace CRM.Modules.Email.Dtos;

public class EmailAttachmentDto
{
    public Guid Id { get; set; }
    public Guid MessageId { get; set; }
    public string Filename { get; set; } = string.Empty;
    public string? MimeType { get; set; }
    public int SizeBytes { get; set; }
    public string StoragePath { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class EmailAttachmentInputDto
{
    public string Filename { get; set; } = string.Empty;
    public string? MimeType { get; set; }
    public int SizeBytes { get; set; }
    public string StoragePath { get; set; } = string.Empty;
}

public class EmailMessageDto
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid AccountId { get; set; }
    public Guid? ThreadId { get; set; }
    public string Direction { get; set; } = "Inbound";
    public string Status { get; set; } = "Received";
    public string FromAddress { get; set; } = string.Empty;
    public string[] ToAddresses { get; set; } = [];
    public string[]? CcAddresses { get; set; }
    public string? Subject { get; set; }
    public string? HtmlBody { get; set; }
    public string? TextBody { get; set; }
    public string? ExternalId { get; set; }
    public Guid? CustomerId { get; set; }
    public Guid? QuoteId { get; set; }
    public Guid? TicketId { get; set; }
    public bool IsRead { get; set; }
    public bool HasAttachments { get; set; }
    public List<EmailAttachmentDto> Attachments { get; set; } = [];
    public DateTime CreatedAt { get; set; }
}

public class EmailThreadDto
{
    public Guid ThreadId { get; set; }
    public string? Subject { get; set; }
    public IReadOnlyList<EmailMessageDto> Messages { get; set; } = [];
}

public class EmailStatsDto
{
    public int InboxTotal { get; set; }
    public int UnreadCount { get; set; }
    public int SentToday { get; set; }
}
