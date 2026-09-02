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
/// Command to test-send a webhook payload to an endpoint (dry-run or real).
/// IsSimulation=true does not persist Failed delivery and returns signature preview.
/// </summary>
public record TestWebhookSendCommand(
    Guid EndpointId,
    object? Payload = null,
    bool IsSimulation = true,
    string? MockEventType = null,
    Dictionary<string, object?>? MockPayload = null
) : ICommand<WebhookDeliveryDto>;

public class TestWebhookSendHandler(
    WebhooksDbContext dbContext,
    IWebhookDispatcher dispatcher,
    ICurrentTenant currentTenant) : ICommandHandler<TestWebhookSendCommand, WebhookDeliveryDto>
{
    public async Task<Result<WebhookDeliveryDto>> Handle(TestWebhookSendCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue)
        {
            return Result.Failure<WebhookDeliveryDto>(Error.Unauthorized);
        }

        WebhookEndpoint? endpoint = await dbContext.WebhookEndpoints
            .FirstOrDefaultAsync(e => e.Id == request.EndpointId, cancellationToken);

        if (endpoint is null)
        {
            return Result.Failure<WebhookDeliveryDto>(Error.NotFound);
        }

        string eventType = request.MockEventType
            ?? (endpoint.Events.Length > 0 ? endpoint.Events[0] : WebhookEventTypes.WebhookInbound);

        // Build payload: prefer MockPayload, then Payload, then generated mock
        object payloadObject;
        if (request.MockPayload != null)
        {
            // Ensure eventType is present in mock payload
            Dictionary<string, object?> withEvent = new(request.MockPayload, StringComparer.OrdinalIgnoreCase);
            if (!withEvent.ContainsKey("eventType") && !withEvent.ContainsKey("event_type"))
            {
                withEvent["eventType"] = eventType;
            }

            payloadObject = withEvent;
        }
        else if (request.Payload != null)
        {
            payloadObject = request.Payload;
        }
        else
        {
            payloadObject = GenerateMockPayload(eventType, endpoint.Id);
        }

        // Dispatcher handles HMAC-SHA256, headers, HttpClient 10s, isSimulation dry-run
        WebhookDelivery delivery = await dispatcher.DispatchAsync(
            endpoint.Id,
            eventType,
            payloadObject,
            isSimulation: request.IsSimulation,
            cancellationToken: cancellationToken);

        WebhookDeliveryDto dto = MapToDto(delivery);
        return Result.Success(dto);
    }

    private static Dictionary<string, object?> GenerateMockPayload(string eventType, Guid endpointId)
    {
        return new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase)
        {
            ["eventType"] = eventType,
            ["endpointId"] = endpointId.ToString(),
            ["timestamp"] = DateTimeOffset.UtcNow.ToString("O"),
            ["test"] = true,
            ["data"] = new Dictionary<string, object?>
            {
                ["id"] = Guid.NewGuid().ToString(),
                ["sample"] = "This is a test webhook payload generated via TestWebhookSend",
                ["event"] = eventType
            }
        };
    }

    private static WebhookDeliveryDto MapToDto(WebhookDelivery d)
    {
        return new WebhookDeliveryDto
        {
            Id = d.Id,
            EndpointId = d.EndpointId,
            TenantId = d.TenantId,
            EventType = d.EventType,
            PayloadJson = d.PayloadJson,
            Headers = d.HeadersJson ?? new Dictionary<string, string>(),
            Status = d.Status,
            AttemptCount = d.AttemptCount,
            NextRetryAt = d.NextRetryAt,
            ResponseCode = d.ResponseCode,
            ResponseBody = d.ResponseBody,
            DurationMs = d.DurationMs,
            HmacSignature = d.HmacSignature,
            CreatedAt = d.CreatedAt
        };
    }
}

public class TestWebhookSendEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/webhooks/{id:guid}/test", async (
            Guid id,
            TestWebhookSendCommand command,
            ISender sender,
            CancellationToken ct) =>
        {
            if (id != command.EndpointId)
            {
                command = command with { EndpointId = id };
            }

            Result<WebhookDeliveryDto> result = await sender.Send(command, ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<WebhookDeliveryDto>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<WebhookDeliveryDto>.Fail(result.Error.Code, result.Error.Description));
        })
        .WithName("TestWebhookSend")
        .WithTags("Webhooks")
        .RequirePermission("Webhooks.Execute");

        // Alias route per task spec: /test-send
        app.MapPost("/api/webhooks/{id:guid}/test-send", async (
            Guid id,
            TestWebhookSendCommand command,
            ISender sender,
            CancellationToken ct) =>
        {
            if (id != command.EndpointId)
            {
                command = command with { EndpointId = id };
            }

            Result<WebhookDeliveryDto> result = await sender.Send(command, ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<WebhookDeliveryDto>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<WebhookDeliveryDto>.Fail(result.Error.Code, result.Error.Description));
        })
        .WithName("TestWebhookSendAlias")
        .WithTags("Webhooks")
        .RequirePermission("Webhooks.Execute");
    }
}
