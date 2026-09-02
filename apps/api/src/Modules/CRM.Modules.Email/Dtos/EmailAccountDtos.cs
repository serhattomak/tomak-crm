namespace CRM.Modules.Email.Dtos;

public class EmailAccountDto
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Provider { get; set; } = "generic_imap";
    public string? ImapHost { get; set; }
    public int ImapPort { get; set; } = 993;
    public string? SmtpHost { get; set; }
    public int SmtpPort { get; set; } = 587;
    public bool IsActive { get; set; } = true;
    public string? Description { get; set; }
    public string? SecretMasked { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class EmailAccountDetailDto : EmailAccountDto
{
    public int TotalMessagesCount { get; set; }
    public int UnreadMessagesCount { get; set; }
}

public class TestEmailAccountConnectionResultDto
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public bool ImapSuccess { get; set; }
    public string? ImapMessage { get; set; }
    public bool SmtpSuccess { get; set; }
    public string? SmtpMessage { get; set; }
}
