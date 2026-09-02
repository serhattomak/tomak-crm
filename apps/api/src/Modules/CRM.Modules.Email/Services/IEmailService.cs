using CRM.Modules.Email.Entities;

namespace CRM.Modules.Email.Services;

/// <summary>
/// Email sending and inbound fetch abstraction (generic IMAP/SMTP + Resend fallback).
/// </summary>
public interface IEmailService
{
    /// <summary>
    /// Sends email via bound account provider (SMTP for generic_imap, HttpClient for resend).
    /// isSimulation skips real send and returns sent:true.
    /// </summary>
    Task<(bool Sent, string? ErrorMessage)> SendAsync(
        Guid accountId,
        string[] to,
        string[]? cc,
        string subject,
        string htmlBody,
        IReadOnlyList<(string Filename, string? MimeType, byte[] Content)>? attachments,
        bool isSimulation = false,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Fetches unseen inbound messages for account via IMAP (MailKit 993 SSL).
    /// </summary>
    Task<IReadOnlyList<EmailMessage>> FetchInboundAsync(
        Guid accountId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Overload accepting loaded entity — used by EmailSyncJob to avoid extra fetch.
    /// </summary>
    Task<IReadOnlyList<EmailMessage>> FetchInboundAsync(
        EmailAccount account,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Computes deterministic thread id from normalized subject + account scope.
    /// </summary>
    Guid ComputeThreadId(string subject, Guid accountId);
}

