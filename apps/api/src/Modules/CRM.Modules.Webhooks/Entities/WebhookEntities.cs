using System.ComponentModel.DataAnnotations.Schema;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using CRM.BuildingBlocks.Tenancy;

namespace CRM.Modules.Webhooks.Entities;

/// <summary>
/// Tenant-scoped webhook endpoint configuration.
/// Secret is stored encrypted at rest; never returned except on creation/show-once.
/// </summary>
[Table("webhook_endpoints", Schema = "public")]
public class WebhookEndpoint : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid TenantId { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Url { get; set; } = string.Empty;

    public string? SecretEncrypted { get; set; }

    public string[] Events { get; set; } = [];

    public bool IsActive { get; set; } = true;

    public string? Description { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<WebhookDelivery> Deliveries { get; set; } = new List<WebhookDelivery>();

    // Helpers for Events (jsonb) — keep array in sync with helpers for testability
    public string[] GetEvents()
    {
        return Events ?? [];
    }

    public void SetEvents(string[] events)
    {
        Events = events ?? [];
    }

    public string GetEventsJson()
    {
        return JsonSerializer.Serialize(Events ?? [], WebhookJsonDefaults.Options);
    }

    public void SetEventsFromJson(string json)
    {
        try
        {
            Events = JsonSerializer.Deserialize<string[]>(json, WebhookJsonDefaults.Options) ?? [];
        }
        catch
        {
            Events = [];
        }
    }

    // Secret helpers — GenerateSecret(32 bytes base64), Encrypt/Decrypt placeholder

    /// <summary>
    /// Generates a cryptographically strong random secret (base64).
    /// Default 32 bytes => 44 char base64 string.
    /// </summary>
    public static string GenerateSecret(int byteLength = 32)
    {
        byte[] bytes = RandomNumberGenerator.GetBytes(byteLength);
        return Convert.ToBase64String(bytes);
    }

    /// <summary>
    /// Placeholder encryption for secret at rest.
    /// Placeholder: Replace with AES-GCM using key from IConfiguration["Webhooks:EncryptionKey"] or DPAPI.
    /// Current implementation is base64 encoding to avoid plaintext storage during scaffolding.
    /// No plaintext is logged; caller must not log return value.
    /// </summary>
    public static string EncryptSecret(string plaintextSecret)
    {
        if (string.IsNullOrEmpty(plaintextSecret))
        {
            return string.Empty;
        }

        // Placeholder: base64 encode. Replace with AES encryption before production.
        byte[] plaintextBytes = Encoding.UTF8.GetBytes(plaintextSecret);
        return Convert.ToBase64String(plaintextBytes);
    }

    /// <summary>
    /// Placeholder decryption — reverses EncryptSecret.
    /// Replace with AES-GCM decryption when real encryption is implemented.
    /// </summary>
    public static string DecryptSecret(string encryptedSecret)
    {
        if (string.IsNullOrEmpty(encryptedSecret))
        {
            return string.Empty;
        }

        try
        {
            byte[] encryptedBytes = Convert.FromBase64String(encryptedSecret);
            return Encoding.UTF8.GetString(encryptedBytes);
        }
        catch
        {
            return string.Empty;
        }
    }

    /// <summary>
    /// Computes HMAC-SHA256 signature for payload verification.
    /// payload = timestamp + "." + jsonBody, header = sha256=&lt;hex&gt;
    /// Secret may be base64 or utf8; we try base64 decode first, fallback to utf8 bytes.
    /// </summary>
    public static string ComputeHmacSignature(string payload, string secret, string timestamp)
    {
        string contentToSign = $"{timestamp}.{payload}";
        byte[] keyBytes;

        try
        {
            // Try base64 decode (GenerateSecret output is base64)
            keyBytes = Convert.FromBase64String(secret);
        }
        catch
        {
            keyBytes = Encoding.UTF8.GetBytes(secret);
        }

        using HMACSHA256 hmac = new HMACSHA256(keyBytes);
        byte[] contentBytes = Encoding.UTF8.GetBytes(contentToSign);
        byte[] hash = hmac.ComputeHash(contentBytes);
        string hex = Convert.ToHexString(hash).ToLowerInvariant();
        return $"sha256={hex}";
    }
}

/// <summary>
/// Delivery log for each webhook dispatch attempt.
/// </summary>
[Table("webhook_deliveries", Schema = "public")]
public class WebhookDelivery : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid TenantId { get; set; }

    public Guid EndpointId { get; set; }

    public string EventType { get; set; } = string.Empty;

    /// <summary>
    /// JSON payload sent to endpoint — stored as jsonb.
    /// </summary>
    public string PayloadJson { get; set; } = "{}";

    /// <summary>
    /// Request headers sent — stored as jsonb (dictionary).
    /// </summary>
    public Dictionary<string, string> HeadersJson { get; set; } = new();

    public string Status { get; set; } = "Success"; // Success, Failed, Retrying

    public int AttemptCount { get; set; } = 0;

    public DateTime? NextRetryAt { get; set; }

    public int? ResponseCode { get; set; }

    public string? ResponseBody { get; set; }

    public int DurationMs { get; set; } = 0;

    public string? HmacSignature { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public WebhookEndpoint? Endpoint { get; set; }

    // Helpers for Payload
    public JsonDocument GetPayloadDocument()
    {
        try
        {
            return JsonDocument.Parse(PayloadJson);
        }
        catch
        {
            return JsonDocument.Parse("{}");
        }
    }

    public void SetPayloadJson(string json)
    {
        PayloadJson = string.IsNullOrWhiteSpace(json) ? "{}" : json;
    }

    public void SetPayloadObject(object payload)
    {
        PayloadJson = JsonSerializer.Serialize(payload, WebhookJsonDefaults.Options);
    }

    public Dictionary<string, string> GetHeaders()
    {
        return HeadersJson ?? new Dictionary<string, string>();
    }

    public void SetHeaders(Dictionary<string, string> headers)
    {
        HeadersJson = headers ?? new Dictionary<string, string>();
    }

    public string GetHeadersJson()
    {
        return JsonSerializer.Serialize(HeadersJson ?? new Dictionary<string, string>(), WebhookJsonDefaults.Options);
    }
}

/// <summary>
/// Allowed webhook event types. Keep in sync with Automation TriggerType values.
/// </summary>
public static class WebhookEventTypes
{
    public const string OrderCreated = "Order.Created";
    public const string OrderStatusChanged = "Order.StatusChanged";
    public const string QuoteAccepted = "Quote.Accepted";
    public const string QuoteSent = "Quote.Sent";
    public const string TicketCreated = "Ticket.Created";
    public const string TicketSlaBreached = "Ticket.SlaBreached";
    public const string DealStageChanged = "Deal.StageChanged";
    public const string CustomerCreated = "Customer.Created";
    public const string WebhookInbound = "Webhook.Inbound";

    public static readonly string[] All =
    [
        OrderCreated,
        OrderStatusChanged,
        QuoteAccepted,
        QuoteSent,
        TicketCreated,
        TicketSlaBreached,
        DealStageChanged,
        CustomerCreated,
        WebhookInbound
    ];
}

/// <summary>
/// JSON defaults for webhook serialization — camelCase, case-insensitive.
/// Mirrors AutomationEntities JsonDefaults.
/// </summary>
public static class WebhookJsonDefaults
{
    public static readonly JsonSerializerOptions Options = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };
}
