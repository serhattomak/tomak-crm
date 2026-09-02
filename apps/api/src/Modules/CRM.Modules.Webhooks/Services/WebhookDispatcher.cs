using System.Diagnostics;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Webhooks.Data;
using CRM.Modules.Webhooks.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CRM.Modules.Webhooks.Services;

/// <summary>
/// Default webhook dispatcher — HMAC-SHA256, 10s timeout, headers X-Webhook-Signature / X-Webhook-Timestamp / X-Tenant-Id / User-Agent.
/// Handles persistence to webhook_deliveries, exponential backoff, and isSimulation dry-run.
/// </summary>
public sealed class WebhookDispatcher(
    WebhooksDbContext dbContext,
    ICurrentTenant currentTenant,
    IHttpClientFactory httpClientFactory,
    ILogger<WebhookDispatcher> logger) : IWebhookDispatcher
{
    private static readonly TimeSpan[] BackoffDelays =
    [
        TimeSpan.FromSeconds(1),
        TimeSpan.FromSeconds(5),
        TimeSpan.FromSeconds(25),
        TimeSpan.FromSeconds(125),
        TimeSpan.FromSeconds(625)
    ];

    private const int MaxAttempts = 5;

    public string ComputeSignature(string payload, string secret, string timestamp)
    {
        // HMAC: payload = timestamp + "." + jsonBody, key = Encoding.UTF8.GetBytes(secret) or Convert.FromBase64String, signature = "sha256=" + hex(HMACSHA256(payload))
        string contentToSign = $"{timestamp}.{payload}";
        byte[] keyBytes;
        try
        {
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

    public async Task<WebhookDelivery> DispatchAsync(
        Guid endpointId,
        string eventType,
        object payload,
        bool isSimulation = false,
        CancellationToken cancellationToken = default)
    {
        string payloadJson = JsonSerializer.Serialize(payload, WebhookJsonDefaults.Options);
        return await DispatchAsync(endpointId, eventType, payloadJson, isSimulation, cancellationToken);
    }

    public async Task<WebhookDelivery> DispatchAsync(
        Guid endpointId,
        string eventType,
        string payloadJson,
        bool isSimulation = false,
        CancellationToken cancellationToken = default)
    {
        WebhookEndpoint? endpoint = await dbContext.WebhookEndpoints
            .FirstOrDefaultAsync(e => e.Id == endpointId, cancellationToken);

        if (endpoint is null)
        {
            logger.LogWarning("Webhook dispatch failed: endpoint {EndpointId} not found for event {EventType}", endpointId, eventType);
            // Return transient failed delivery (not persisted) to avoid throwing for single delivery failure
            return new WebhookDelivery
            {
                Id = Guid.NewGuid(),
                TenantId = currentTenant.Id ?? Guid.Empty,
                EndpointId = endpointId,
                EventType = eventType,
                PayloadJson = string.IsNullOrWhiteSpace(payloadJson) ? "{}" : payloadJson,
                HeadersJson = new Dictionary<string, string>(),
                Status = "Failed",
                AttemptCount = 1,
                NextRetryAt = null,
                ResponseCode = null,
                ResponseBody = $"Endpoint {endpointId} not found.",
                DurationMs = 0,
                HmacSignature = null,
                CreatedAt = DateTime.UtcNow
            };
        }

        string normalizedPayload = string.IsNullOrWhiteSpace(payloadJson) ? "{}" : payloadJson;
        string timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
        string secretPlain = string.Empty;

        if (!string.IsNullOrEmpty(endpoint.SecretEncrypted))
        {
            secretPlain = WebhookEndpoint.DecryptSecret(endpoint.SecretEncrypted);
        }

        string signature = string.IsNullOrEmpty(secretPlain)
            ? string.Empty
            : ComputeSignature(normalizedPayload, secretPlain, timestamp);

        string tenantIdHeader = currentTenant.Id?.ToString() ?? endpoint.TenantId.ToString();

        Dictionary<string, string> headers = new()
        {
            ["X-Webhook-Timestamp"] = timestamp,
            ["X-Tenant-Id"] = tenantIdHeader,
            ["Content-Type"] = "application/json",
            ["User-Agent"] = "CRM-Webhook/1.0"
        };

        if (!string.IsNullOrEmpty(signature))
        {
            headers["X-Webhook-Signature"] = signature;
        }

        if (isSimulation)
        {
            logger.LogInformation(
                "Webhook dispatch simulation for endpoint {EndpointId} event {EventType} signature {Signature}",
                endpointId, eventType, signature);

            // isSimulation=true skips HttpClient.SendAsync and does not persist Failed delivery
            return new WebhookDelivery
            {
                Id = Guid.NewGuid(),
                TenantId = currentTenant.Id ?? endpoint.TenantId,
                EndpointId = endpointId,
                EventType = eventType,
                PayloadJson = normalizedPayload,
                HeadersJson = headers,
                Status = "Success",
                AttemptCount = 1,
                NextRetryAt = null,
                ResponseCode = 200,
                ResponseBody = "{\"simulated\":true}",
                DurationMs = 0,
                HmacSignature = signature,
                CreatedAt = DateTime.UtcNow
            };
        }

        // Real dispatch: create delivery record and attempt HTTP
        WebhookDelivery delivery = new()
        {
            TenantId = currentTenant.Id ?? endpoint.TenantId,
            EndpointId = endpointId,
            EventType = eventType,
            PayloadJson = normalizedPayload,
            HeadersJson = headers,
            Status = "Success",
            AttemptCount = 1,
            NextRetryAt = null,
            HmacSignature = signature,
            CreatedAt = DateTime.UtcNow
        };

        Stopwatch sw = Stopwatch.StartNew();

        try
        {
            HttpClient client = httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(10);

            using HttpRequestMessage request = new(HttpMethod.Post, endpoint.Url);
            request.Content = new StringContent(normalizedPayload, Encoding.UTF8, "application/json");
            request.Content.Headers.ContentType = new MediaTypeHeaderValue("application/json");
            request.Headers.Add("X-Webhook-Timestamp", timestamp);
            request.Headers.Add("X-Tenant-Id", tenantIdHeader);
            if (!string.IsNullOrEmpty(signature))
            {
                request.Headers.Add("X-Webhook-Signature", signature);
            }

            request.Headers.UserAgent.ParseAdd("CRM-Webhook/1.0");

            HttpResponseMessage response = await client.SendAsync(request, cancellationToken);
            sw.Stop();

            string responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
            bool success = response.IsSuccessStatusCode;

            delivery.DurationMs = (int)sw.ElapsedMilliseconds;
            delivery.ResponseCode = (int)response.StatusCode;
            delivery.ResponseBody = responseBody.Length > 4000 ? responseBody[..4000] : responseBody;
            delivery.HmacSignature = signature;
            delivery.HeadersJson = headers;

            if (success)
            {
                delivery.Status = "Success";
                delivery.NextRetryAt = null;
            }
            else
            {
                logger.LogWarning(
                    "Webhook dispatch non-2xx for endpoint {EndpointId} event {EventType} status {StatusCode}",
                    endpointId, eventType, response.StatusCode);

                // Retry/backoff: on non-2xx, status Retrying until max then Failed
                if (delivery.AttemptCount >= MaxAttempts)
                {
                    delivery.Status = "Failed";
                    delivery.NextRetryAt = null;
                }
                else
                {
                    delivery.Status = "Retrying";
                    TimeSpan delay = BackoffDelays[delivery.AttemptCount - 1];
                    delivery.NextRetryAt = DateTime.UtcNow.Add(delay);
                }
            }
        }
        catch (TaskCanceledException ex) when (!cancellationToken.IsCancellationRequested)
        {
            sw.Stop();
            logger.LogWarning(ex, "Webhook dispatch timeout for endpoint {EndpointId} event {EventType}", endpointId, eventType);

            delivery.DurationMs = (int)sw.ElapsedMilliseconds;
            delivery.ResponseBody = "Timeout after 10s";
            delivery.ResponseCode = null;
            delivery.HmacSignature = signature;
            delivery.HeadersJson = headers;

            if (delivery.AttemptCount >= MaxAttempts)
            {
                delivery.Status = "Failed";
                delivery.NextRetryAt = null;
            }
            else
            {
                delivery.Status = "Retrying";
                TimeSpan delay = BackoffDelays[delivery.AttemptCount - 1];
                delivery.NextRetryAt = DateTime.UtcNow.Add(delay);
            }
        }
        catch (Exception ex)
        {
            sw.Stop();
            logger.LogWarning(ex, "Webhook dispatch failed for endpoint {EndpointId} event {EventType}", endpointId, eventType);

            delivery.DurationMs = (int)sw.ElapsedMilliseconds;
            string errorBody = ex.Message.Length > 4000 ? ex.Message[..4000] : ex.Message;
            delivery.ResponseBody = errorBody;
            delivery.ResponseCode = null;
            delivery.HmacSignature = signature;
            delivery.HeadersJson = headers;

            if (delivery.AttemptCount >= MaxAttempts)
            {
                delivery.Status = "Failed";
                delivery.NextRetryAt = null;
            }
            else
            {
                delivery.Status = "Retrying";
                TimeSpan delay = BackoffDelays[delivery.AttemptCount - 1];
                delivery.NextRetryAt = DateTime.UtcNow.Add(delay);
            }
        }

        // Persist delivery log with status/duration/response
        dbContext.WebhookDeliveries.Add(delivery);
        await dbContext.SaveChangesAsync(cancellationToken);

        return delivery;
    }

    public async Task<IReadOnlyList<WebhookDelivery>> DispatchToEndpointsAsync(
        string eventType,
        object payload,
        CancellationToken cancellationToken = default)
    {
        if (!currentTenant.Id.HasValue)
        {
            logger.LogWarning("DispatchToEndpointsAsync aborted: no tenant context for event {EventType}", eventType);
            return Array.Empty<WebhookDelivery>();
        }

        string payloadJson = JsonSerializer.Serialize(payload, WebhookJsonDefaults.Options);

        // Load active endpoints and filter in-memory for jsonb array containment
        List<WebhookEndpoint> activeEndpoints = await dbContext.WebhookEndpoints
            .AsNoTracking()
            .Where(e => e.IsActive)
            .ToListAsync(cancellationToken);

        List<WebhookEndpoint> matched = activeEndpoints
            .Where(e => e.Events != null && e.Events.Contains(eventType, StringComparer.OrdinalIgnoreCase))
            .ToList();

        if (matched.Count == 0)
        {
            logger.LogInformation("No active webhook endpoints subscribed to event {EventType}", eventType);
            return Array.Empty<WebhookDelivery>();
        }

        List<WebhookDelivery> results = new();

        foreach (WebhookEndpoint endpoint in matched)
        {
            try
            {
                WebhookDelivery delivery = await DispatchAsync(endpoint.Id, eventType, payloadJson, isSimulation: false, cancellationToken);
                results.Add(delivery);
            }
            catch (Exception ex)
            {
                // Don't throw for single delivery failure
                logger.LogWarning(ex, "Failed to dispatch webhook to endpoint {EndpointId} for event {EventType}", endpoint.Id, eventType);
            }
        }

        return results;
    }
}
