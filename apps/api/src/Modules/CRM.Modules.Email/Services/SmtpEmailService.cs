using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using CRM.Modules.Email.Data;
using CRM.Modules.Email.Entities;
using MailKit;
using MailKit.Net.Imap;
using MailKit.Net.Smtp;
using MailKit.Search;
using MailKit.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using MimeKit;

namespace CRM.Modules.Email.Services;

/// <summary>
/// Production email service providing SMTP/IMAP integration via MailKit
/// and HTTP API fallback via Resend.
/// </summary>
public sealed class SmtpEmailService(
    EmailDbContext dbContext,
    IHttpClientFactory httpClientFactory,
    ILogger<SmtpEmailService> logger) : IEmailService
{
    private static readonly Regex ScriptTagRegex = new(
        @"<script[^>]*>.*?</script>",
        RegexOptions.Compiled | RegexOptions.IgnoreCase | RegexOptions.Singleline);

    public async Task<(bool Sent, string? ErrorMessage)> SendAsync(
        Guid accountId,
        string[] to,
        string[]? cc,
        string subject,
        string htmlBody,
        IReadOnlyList<(string Filename, string? MimeType, byte[] Content)>? attachments,
        bool isSimulation = false,
        CancellationToken cancellationToken = default)
    {
        if (to == null || to.Length == 0)
        {
            return (false, "En az bir alıcı adresi belirtilmelidir.");
        }

        EmailAccount? account = await dbContext.Accounts
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(a => a.Id == accountId, cancellationToken);

        if (account == null)
        {
            logger.LogWarning("EmailAccount {AccountId} not found", accountId);
            return (false, "E-posta hesabı bulunamadı.");
        }

        if (!account.IsActive)
        {
            logger.LogWarning("EmailAccount {AccountId} is inactive", accountId);
            return (false, "E-posta hesabı aktif değil.");
        }

        if (isSimulation)
        {
            logger.LogInformation("[Simulation] SendAsync for account {AccountId} to {To} with subject '{Subject}'",
                accountId, string.Join(",", to), subject);
            return (true, null);
        }

        string sanitizedHtml = ScriptTagRegex.Replace(htmlBody ?? string.Empty, string.Empty);

        if (string.Equals(account.Provider, "resend", StringComparison.OrdinalIgnoreCase))
        {
            return await SendViaResendAsync(account, to, cc, subject, sanitizedHtml, attachments, cancellationToken);
        }

        return await SendViaSmtpAsync(account, to, cc, subject, sanitizedHtml, attachments, cancellationToken);
    }

    private async Task<(bool Sent, string? ErrorMessage)> SendViaSmtpAsync(
        EmailAccount account,
        string[] to,
        string[]? cc,
        string subject,
        string sanitizedHtml,
        IReadOnlyList<(string Filename, string? MimeType, byte[] Content)>? attachments,
        CancellationToken cancellationToken)
    {
        try
        {
            MimeMessage message = new MimeMessage();
            message.From.Add(new MailboxAddress(account.Description ?? account.Email, account.Email));

            foreach (string toAddr in to)
            {
                if (!string.IsNullOrWhiteSpace(toAddr))
                {
                    message.To.Add(MailboxAddress.Parse(toAddr.Trim()));
                }
            }

            if (cc != null)
            {
                foreach (string ccAddr in cc)
                {
                    if (!string.IsNullOrWhiteSpace(ccAddr))
                    {
                        message.Cc.Add(MailboxAddress.Parse(ccAddr.Trim()));
                    }
                }
            }

            message.Subject = subject ?? string.Empty;

            BodyBuilder builder = new BodyBuilder
            {
                HtmlBody = sanitizedHtml,
                TextBody = Regex.Replace(sanitizedHtml, "<[^>]+>", " ").Trim()
            };

            if (attachments != null)
            {
                foreach (var att in attachments)
                {
                    if (att.Content != null && att.Content.Length > 0)
                    {
                        ContentType contentType = !string.IsNullOrEmpty(att.MimeType)
                            ? ContentType.Parse(att.MimeType)
                            : new ContentType("application", "octet-stream");

                        builder.Attachments.Add(att.Filename, att.Content, contentType);
                    }
                }
            }

            message.Body = builder.ToMessageBody();

            using SmtpClient client = new SmtpClient();
            client.Timeout = 15000; // 15 seconds

            SecureSocketOptions options = account.SmtpPort switch
            {
                465 => SecureSocketOptions.SslOnConnect,
                587 => SecureSocketOptions.StartTls,
                25 => SecureSocketOptions.StartTlsWhenAvailable,
                _ => SecureSocketOptions.Auto
            };

            string host = string.IsNullOrWhiteSpace(account.SmtpHost) ? "localhost" : account.SmtpHost.Trim();
            await client.ConnectAsync(host, account.SmtpPort, options, cancellationToken);

            string password = account.GetDecryptedPassword();
            if (!string.IsNullOrEmpty(password))
            {
                await client.AuthenticateAsync(account.Email, password, cancellationToken);
            }

            await client.SendAsync(message, cancellationToken);
            await client.DisconnectAsync(true, cancellationToken);

            logger.LogInformation("Email sent successfully via SMTP for account {AccountId} to {To}", account.Id, string.Join(",", to));
            return (true, null);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send email via SMTP for account {AccountId} ({Email})", account.Id, account.Email);
            return (false, ex.Message);
        }
    }

    private async Task<(bool Sent, string? ErrorMessage)> SendViaResendAsync(
        EmailAccount account,
        string[] to,
        string[]? cc,
        string subject,
        string sanitizedHtml,
        IReadOnlyList<(string Filename, string? MimeType, byte[] Content)>? attachments,
        CancellationToken cancellationToken)
    {
        try
        {
            string apiKey = account.GetDecryptedPassword();
            if (string.IsNullOrWhiteSpace(apiKey))
            {
                logger.LogWarning("Resend API key is missing for account {AccountId}", account.Id);
                return (false, "Resend API anahtarı yapılandırılmamış.");
            }

            HttpClient httpClient = httpClientFactory.CreateClient();
            httpClient.Timeout = TimeSpan.FromSeconds(15);

            var payload = new
            {
                from = string.IsNullOrWhiteSpace(account.Description) ? account.Email : $"{account.Description} <{account.Email}>",
                to = to.Select(t => t.Trim()).ToArray(),
                cc = cc?.Select(c => c.Trim()).ToArray(),
                subject = subject ?? string.Empty,
                html = sanitizedHtml
            };

            using HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Post, "https://api.resend.com/emails");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
            request.Content = JsonContent.Create(payload);

            HttpResponseMessage response = await httpClient.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                string errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                logger.LogError("Resend API error {StatusCode}: {ErrorBody}", response.StatusCode, errorBody);
                return (false, $"Resend API error: {response.StatusCode} - {errorBody}");
            }

            logger.LogInformation("Email sent successfully via Resend for account {AccountId}", account.Id);
            return (true, null);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send email via Resend for account {AccountId}", account.Id);
            return (false, ex.Message);
        }
    }

    public async Task<IReadOnlyList<EmailMessage>> FetchInboundAsync(Guid accountId, CancellationToken cancellationToken = default)
    {
        EmailAccount? account = await dbContext.Accounts
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(a => a.Id == accountId, cancellationToken);

        if (account == null)
        {
            logger.LogWarning("FetchInboundAsync: EmailAccount {AccountId} not found", accountId);
            return [];
        }

        return await FetchInboundAsync(account, cancellationToken);
    }

    public async Task<IReadOnlyList<EmailMessage>> FetchInboundAsync(EmailAccount account, CancellationToken cancellationToken = default)
    {
        if (!string.Equals(account.Provider, "generic_imap", StringComparison.OrdinalIgnoreCase) ||
            string.IsNullOrWhiteSpace(account.ImapHost))
        {
            return [];
        }

        List<EmailMessage> fetchedMessages = new List<EmailMessage>();

        try
        {
            using ImapClient client = new ImapClient();
            client.Timeout = 15000; // 15 seconds

            SecureSocketOptions options = account.ImapPort switch
            {
                993 => SecureSocketOptions.SslOnConnect,
                143 => SecureSocketOptions.StartTlsWhenAvailable,
                _ => SecureSocketOptions.Auto
            };

            await client.ConnectAsync(account.ImapHost.Trim(), account.ImapPort, options, cancellationToken);

            string password = account.GetDecryptedPassword();
            await client.AuthenticateAsync(account.Email, password, cancellationToken);

            IMailFolder inbox = client.Inbox;
            await inbox.OpenAsync(FolderAccess.ReadOnly, cancellationToken);

            IList<UniqueId> uids = await inbox.SearchAsync(SearchQuery.NotSeen, cancellationToken);
            logger.LogInformation("Found {Count} unseen messages for account {AccountId} ({Email})", uids.Count, account.Id, account.Email);

            // Fetch recent unseen messages (cap at 30 to avoid timeout)
            IEnumerable<UniqueId> targetUids = uids.TakeLast(30);

            foreach (UniqueId uid in targetUids)
            {
                if (cancellationToken.IsCancellationRequested)
                {
                    break;
                }

                MimeMessage mime = await inbox.GetMessageAsync(uid, cancellationToken);

                string subject = mime.Subject ?? "(Konusuz)";
                string fromAddress = mime.From.Mailboxes.FirstOrDefault()?.Address ?? mime.From.ToString();
                string[] toAddresses = mime.To.Mailboxes.Select(m => m.Address).ToArray();
                string[] ccAddresses = mime.Cc.Mailboxes.Select(m => m.Address).ToArray();

                Guid messageId = Guid.NewGuid();
                Guid threadId = ComputeThreadId(subject, account.Id);

                EmailMessage message = new EmailMessage
                {
                    Id = messageId,
                    TenantId = account.TenantId,
                    AccountId = account.Id,
                    ThreadId = threadId,
                    Direction = "Inbound",
                    Status = "Received",
                    FromAddress = fromAddress,
                    ToAddresses = toAddresses,
                    CcAddresses = ccAddresses.Length > 0 ? ccAddresses : null,
                    Subject = subject,
                    HtmlBody = mime.HtmlBody ?? mime.TextBody,
                    TextBody = mime.TextBody,
                    ExternalId = uid.ToString(),
                    IsRead = false,
                    CreatedAt = mime.Date != DateTimeOffset.MinValue ? mime.Date.UtcDateTime : DateTime.UtcNow
                };

                // Parse attachments
                if (mime.Attachments != null)
                {
                    foreach (MimeEntity part in mime.Attachments)
                    {
                        string filename = part.ContentDisposition?.FileName
                            ?? (part is MimePart mp ? mp.FileName : null)
                            ?? "attachment";

                        string mimeType = part.ContentType?.MimeType ?? "application/octet-stream";
                        int size = 0;

                        if (part is MimePart mimePart && mimePart.Content != null)
                        {
                            using MemoryStream ms = new MemoryStream();
                            mimePart.Content.DecodeTo(ms);
                            size = (int)ms.Length;
                        }

                        string storagePath = $"email-attachments/{account.TenantId}/{messageId}/{filename}";

                        message.Attachments.Add(new EmailAttachment
                        {
                            Id = Guid.NewGuid(),
                            TenantId = account.TenantId,
                            MessageId = messageId,
                            Filename = filename,
                            MimeType = mimeType,
                            SizeBytes = size,
                            StoragePath = storagePath,
                            CreatedAt = DateTime.UtcNow
                        });
                    }
                }

                fetchedMessages.Add(message);
            }

            await client.DisconnectAsync(true, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to fetch inbound emails for account {AccountId} ({Email})", account.Id, account.Email);
        }

        return fetchedMessages;
    }

    public Guid ComputeThreadId(string subject, Guid accountId)
    {
        string normalized = EmailAccount.NormalizeSubject(subject ?? string.Empty).ToLowerInvariant();
        string key = $"{accountId}:{normalized}";
        using MD5 md5 = MD5.Create();
        byte[] hash = md5.ComputeHash(Encoding.UTF8.GetBytes(key));
        return new Guid(hash);
    }
}
