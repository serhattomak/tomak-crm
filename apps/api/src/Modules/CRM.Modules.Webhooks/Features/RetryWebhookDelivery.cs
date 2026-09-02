using System.Text.Json;
using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Webhooks.Data;
using CRM.Modules.Webhooks.Dtos;
using CRM.Modules.Webhooks.Entities;
using CRM.Modules.Webhooks.Services;
using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Webhooks.Features;

/// <summary>
/// Retries a failed or retrying webhook delivery with exponential backoff.
/// </summary>
public record RetryWebhookDeliveryCommand(
    Guid DeliveryId
) : ICommand<WebhookDeliveryDto>;

public class RetryWebhookDeliveryHandler(
    WebhooksDbContext dbContext,
    IWebhookDispatcher dispatcher,
    ICurrentTenant currentTenant) : ICommandHandler<RetryWebhookDeliveryCommand, WebhookDeliveryDto>
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

    public async Task<Result<WebhookDeliveryDto>> Handle(RetryWebhookDeliveryCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue)
        {
            return Result.Failure<WebhookDeliveryDto>(Error.Unauthorized);
        }

        WebhookDelivery? delivery = await dbContext.WebhookDeliveries
            .FirstOrDefaultAsync(d => d.Id == request.DeliveryId, cancellationToken);

        if (delivery is null)
        {
            return Result.Failure<WebhookDeliveryDto>(Error.NotFound);
        }

        if (delivery.AttemptCount >= MaxAttempts)
        {
            return Result.Failure<WebhookDeliveryDto>(new Error("Webhook.MaxAttempts", "Maximum retry attempts (5) reached for this delivery."));
        }

        if (!string.Equals(delivery.Status, "Failed", StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(delivery.Status, "Retrying", StringComparison.OrdinalIgnoreCase))
        {
            return Result.Failure<WebhookDeliveryDto>(new Error("Webhook.InvalidStatus", "Only deliveries with status Failed or Retrying can be retried."));
        }

        WebhookEndpoint? endpoint = await dbContext.WebhookEndpoints
            .FirstOrDefaultAsync(e => e.Id == delivery.EndpointId, cancellationToken);

        if (endpoint is null)
        {
            return Result.Failure<WebhookDeliveryDto>(Error.NotFound);
        }

        // Reconstruct payload object from stored json for dispatcher
        object payloadObject;
        try
        {
            // Try deserialize as dictionary to preserve structure for HMAC payload = timestamp + "." + jsonBody (camelCase)
            Dictionary<string, object?>? dict = JsonSerializer.Deserialize<Dictionary<string, object?>>(delivery.PayloadJson, WebhookJsonDefaults.Options);
            payloadObject = dict ?? (object)delivery.PayloadJson;
        }
        catch
        {
            payloadObject = delivery.PayloadJson;
        }

        // Dispatch single attempt via dispatcher with isSimulation:false
        // Dispatcher will create a new delivery log; we will merge result into existing delivery to keep same ID and update attempt count
        WebhookDelivery dispatched = await dispatcher.DispatchAsync(
            endpoint.Id,
            delivery.EventType,
            payloadObject,
            isSimulation: false,
            cancellationToken: cancellationToken);

        // The dispatcher already persisted a new delivery row for this attempt. To avoid duplicate row and keep
        // retried delivery's identity, copy key fields back to the original delivery and remove the transient dispatched row.
        // This keeps history in the original record's attempt count, while still leveraging dispatcher HMAC/retry logic.
        try
        {
            // Remove the newly created delivery to avoid duplication; original will be updated
            dbContext.WebhookDeliveries.Remove(dispatched);
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            // If removal fails, continue — we'll still update original
        }

        // Update original delivery with new attempt results
        delivery.AttemptCount += 1;
        delivery.DurationMs = dispatched.DurationMs;
        delivery.ResponseCode = dispatched.ResponseCode;
        delivery.ResponseBody = dispatched.ResponseBody;
        delivery.HmacSignature = dispatched.HmacSignature;
        delivery.HeadersJson = dispatched.HeadersJson;

        if (string.Equals(dispatched.Status, "Success", StringComparison.OrdinalIgnoreCase))
        {
            delivery.Status = "Success";
            delivery.NextRetryAt = null;
        }
        else
        {
            // Apply exponential backoff for next retry
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

        await dbContext.SaveChangesAsync(cancellationToken);

        WebhookDeliveryDto dto = new()
        {
            Id = delivery.Id,
            EndpointId = delivery.EndpointId,
            TenantId = delivery.TenantId,
            EventType = delivery.EventType,
            PayloadJson = delivery.PayloadJson,
            Headers = delivery.HeadersJson ?? new Dictionary<string, string>(),
            Status = delivery.Status,
            AttemptCount = delivery.AttemptCount,
            NextRetryAt = delivery.NextRetryAt,
            ResponseCode = delivery.ResponseCode,
            ResponseBody = delivery.ResponseBody,
            DurationMs = delivery.DurationMs,
            HmacSignature = delivery.HmacSignature,
            CreatedAt = delivery.CreatedAt
        };

        return Result.Success(dto);
    }
}

public class RetryWebhookDeliveryEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/webhooks/deliveries/{deliveryId:guid}/retry", async (
            Guid deliveryId,
            ISender sender,
            CancellationToken ct) =>
        {
            RetryWebhookDeliveryCommand command = new(deliveryId);
            Result<WebhookDeliveryDto> result = await sender.Send(command, ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<WebhookDeliveryDto>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<WebhookDeliveryDto>.Fail(result.Error.Code, result.Error.Description));
        })
        .WithName("RetryWebhookDelivery")
        .WithTags("Webhooks")
        .RequirePermission("Webhooks.Execute");
    }
}
