using System.ComponentModel.DataAnnotations.Schema;
using System.Text;
using System.Text.RegularExpressions;
using CRM.BuildingBlocks.Tenancy;

namespace CRM.Modules.Email.Entities;

/// <summary>
/// Tenant-scoped bound mailbox (generic IMAP/SMTP or Resend).
/// Password is stored encrypted at rest; never returned except as masked secret.
/// </summary>
[Table("email_accounts", Schema = "public")]
public class EmailAccount : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid TenantId { get; set; }

    public string Email { get; set; } = string.Empty;

    /// <summary>Provider discriminator: generic_imap | resend</summary>
    public string Provider { get; set; } = "generic_imap";

    public string? ImapHost { get; set; }

    public int ImapPort { get; set; } = 993;

    public string? SmtpHost { get; set; }

    public int SmtpPort { get; set; } = 587;

    /// <summary>Base64 AES placeholder — encrypted at rest.</summary>
    public string? EncryptedPassword { get; set; }

    public bool IsActive { get; set; } = true;

    public string? Description { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<EmailMessage> Messages { get; set; } = new List<EmailMessage>();

    // -- Password helpers (phase1: base64 placeholder; replace with AES-256-GCM) --

    /// <summary>
    /// Returns decrypted password (base64 placeholder).
    /// Do not log return value.
    /// </summary>
    public string GetDecryptedPassword()
    {
        if (string.IsNullOrEmpty(EncryptedPassword))
        {
            return string.Empty;
        }

        try
        {
            byte[] bytes = Convert.FromBase64String(EncryptedPassword);
            return Encoding.UTF8.GetString(bytes);
        }
        catch
        {
            return string.Empty;
        }
    }

    /// <summary>
    /// Encrypts and stores password (base64 placeholder).
    /// </summary>
    public void SetEncryptedPassword(string password)
    {
        if (string.IsNullOrEmpty(password))
        {
            EncryptedPassword = null;
            return;
        }

        EncryptedPassword = Convert.ToBase64String(Encoding.UTF8.GetBytes(password));
    }

    /// <summary>
    /// Static helper — base64 encode plaintext (placeholder for AES encryption).
    /// </summary>
    public static string EncryptPassword(string plaintext)
    {
        if (string.IsNullOrEmpty(plaintext))
        {
            return string.Empty;
        }

        return Convert.ToBase64String(Encoding.UTF8.GetBytes(plaintext));
    }

    /// <summary>
    /// Static helper — base64 decode (placeholder for AES decryption).
    /// </summary>
    public static string DecryptPassword(string encrypted)
    {
        if (string.IsNullOrEmpty(encrypted))
        {
            return string.Empty;
        }

        try
        {
            byte[] bytes = Convert.FromBase64String(encrypted);
            return Encoding.UTF8.GetString(bytes);
        }
        catch
        {
            return string.Empty;
        }
    }

    /// <summary>
    /// Returns masked secret ****abcd (last 4 chars) for UI.
    /// Never returns full secret.
    /// </summary>
    public string GetSecretMasked()
    {
        string decrypted = GetDecryptedPassword();
        if (string.IsNullOrEmpty(decrypted) || decrypted.Length <= 4)
        {
            return "****";
        }

        return $"****{decrypted[^4..]}";
    }

    /// <summary>
    /// Strips Re:/Fwd:/FW: prefixes (case-insensitive) for thread grouping.
    /// Mirrors EmailEntities spec: Regex.Replace(subject.Trim(), @"^(Re:|Fwd:|FW:)\s*", "", RegexOptions.IgnoreCase).Trim()
    /// Handles repeated prefixes e.g., "Re: Fwd: Re: Subject" by looping.
    /// </summary>
    public static string NormalizeSubject(string subject)
    {
        if (string.IsNullOrWhiteSpace(subject))
        {
            return string.Empty;
        }

        string normalized = subject.Trim();

        // Loop to strip chained prefixes (Re: Fwd: FW: etc.) — spec requires at least one strip, loop covers multiples
        string previous;
        Regex prefixRegex = new(@"^(Re:|Fwd:|FW:)\s*", RegexOptions.IgnoreCase);
        do
        {
            previous = normalized;
            normalized = prefixRegex.Replace(normalized, string.Empty, 1).Trim();
        } while (normalized.Length != previous.Length && !string.IsNullOrEmpty(normalized));

        return normalized;
    }
}

/// <summary>
/// Persisted email row (inbound or outbound). Thread grouping via normalized subject + account.
/// </summary>
[Table("email_messages", Schema = "public")]
public class EmailMessage : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid TenantId { get; set; }

    public Guid AccountId { get; set; }

    /// <summary>Thread grouping — null for first message, set to parent thread id for replies.</summary>
    public Guid? ThreadId { get; set; }

    /// <summary>Direction: Inbound | Outbound</summary>
    public string Direction { get; set; } = "Inbound";

    /// <summary>Status: Received | Sent | Draft | Failed | Sending</summary>
    public string Status { get; set; } = "Received";

    public string FromAddress { get; set; } = string.Empty;

    public string[] ToAddresses { get; set; } = [];

    public string[]? CcAddresses { get; set; }

    public string? Subject { get; set; }

    public string? HtmlBody { get; set; }

    public string? TextBody { get; set; }

    /// <summary>IMAP UID or Resend message id</summary>
    public string? ExternalId { get; set; }

    public Guid? CustomerId { get; set; }

    public Guid? QuoteId { get; set; }

    public Guid? TicketId { get; set; }

    public bool IsRead { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public EmailAccount? Account { get; set; }

    public ICollection<EmailAttachment> Attachments { get; set; } = new List<EmailAttachment>();

    /// <summary>
    /// Thread helper — delegates to EmailAccount.NormalizeSubject for grouping.
    /// </summary>
    public static string NormalizeSubject(string subject) => EmailAccount.NormalizeSubject(subject);
}

/// <summary>
/// Attachment stored in Supabase Storage email-attachments/{tenantId}/{messageId}/{filename}
/// plus DB row for metadata.
/// </summary>
[Table("email_attachments", Schema = "public")]
public class EmailAttachment : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid TenantId { get; set; }

    public Guid MessageId { get; set; }

    public string Filename { get; set; } = string.Empty;

    public string? MimeType { get; set; }

    public int SizeBytes { get; set; } = 0;

    public string StoragePath { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public EmailMessage? Message { get; set; }
}
