namespace CRM.Modules.Webhooks.Dtos;

/// <summary>
/// DTO for webhook delivery log entries.
/// </summary>
public sealed class WebhookDeliveryDto
{
    public Guid Id { get; set; }

    public Guid EndpointId { get; set; }

    public Guid TenantId { get; set; }

    public string EventType { get; set; } = string.Empty;

    public string PayloadJson { get; set; } = "{}";

    public Dictionary<string, string> Headers { get; set; } = new();

    public string Status { get; set; } = "Success";

    public int AttemptCount { get; set; }

    public DateTime? NextRetryAt { get; set; }

    public int? ResponseCode { get; set; }

    public string? ResponseBody { get; set; }

    public int DurationMs { get; set; }

    public string? HmacSignature { get; set; }

    public DateTime CreatedAt { get; set; }
}
