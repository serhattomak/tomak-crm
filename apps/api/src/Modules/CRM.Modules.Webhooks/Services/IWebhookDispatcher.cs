using CRM.Modules.Webhooks.Entities;

namespace CRM.Modules.Webhooks.Services;

/// <summary>
/// Dispatches webhook payloads with HMAC-SHA256 signing and retry semantics.
/// </summary>
public interface IWebhookDispatcher
{
    /// <summary>
    /// Dispatches payload to a single endpoint with HMAC signature and persistence.
    /// </summary>
    Task<WebhookDelivery> DispatchAsync(
        Guid endpointId,
        string eventType,
        object payload,
        bool isSimulation = false,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// String payload overload for callers that already have serialized JSON.
    /// </summary>
    Task<WebhookDelivery> DispatchAsync(
        Guid endpointId,
        string eventType,
        string payloadJson,
        bool isSimulation = false,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Fans out payload to all active endpoints subscribed to the event type.
    /// </summary>
    Task<IReadOnlyList<WebhookDelivery>> DispatchToEndpointsAsync(
        string eventType,
        object payload,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Computes X-Webhook-Signature header value (sha256=&lt;hex&gt;).
    /// </summary>
    string ComputeSignature(string payload, string secret, string timestamp);
}

/// <summary>
/// Lightweight result for non-persisted dispatch attempts (kept for backward compatibility).
/// </summary>
public sealed class WebhookDispatchResult
{
    public bool Success { get; init; }

    public int StatusCode { get; init; }

    public string? ResponseBody { get; init; }

    public int DurationMs { get; init; }

    public string? HmacSignature { get; init; }

    public string Status { get; init; } = "Success";

    public string? ErrorMessage { get; init; }
}
