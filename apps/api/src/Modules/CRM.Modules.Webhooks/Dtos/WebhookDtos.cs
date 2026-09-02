namespace CRM.Modules.Webhooks.Dtos;

/// <summary>
/// DTO for webhook endpoint — list view and base for detail.
/// Secret is only populated on creation (show-once); SecretMasked shows last 4 chars for other views.
/// </summary>
public class WebhookEndpointDto
{
    public Guid Id { get; set; }

    public Guid TenantId { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Url { get; set; } = string.Empty;

    public string[] Events { get; set; } = [];

    public bool IsActive { get; set; }

    public string? Description { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    /// <summary>
    /// Plaintext secret — only populated on creation (show-once). Null otherwise.
    /// </summary>
    public string? Secret { get; set; }

    /// <summary>
    /// Masked secret preview — e.g., ****abcd (last 4 chars of plaintext secret).
    /// </summary>
    public string? SecretMasked { get; set; }
}

/// <summary>
/// Detail DTO extends base with deliveries count for GET /api/webhooks/{id}.
/// </summary>
public class WebhookEndpointDetailDto : WebhookEndpointDto
{
    public int DeliveriesCount { get; set; }
}
