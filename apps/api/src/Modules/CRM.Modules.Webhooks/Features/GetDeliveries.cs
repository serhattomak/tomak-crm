using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Webhooks.Data;
using CRM.Modules.Webhooks.Dtos;
using CRM.Modules.Webhooks.Entities;
using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Webhooks.Features;

/// <summary>
/// Query for paginated webhook deliveries with optional filters.
/// </summary>
public record GetDeliveriesQuery(
    Guid? EndpointId = null,
    string? Status = null,
    string? EventType = null,
    int Page = 1,
    int PageSize = 20
) : IQuery<PagedResult<WebhookDeliveryDto>>;

/// <summary>
/// Alias query name used in spec: GetWebhookDeliveriesQuery.
/// Delegates to GetDeliveriesQuery handler.
/// </summary>
public record GetWebhookDeliveriesQuery(
    Guid? EndpointId = null,
    string? EventType = null,
    string? Status = null,
    int Page = 1,
    int PageSize = 20
) : IQuery<PagedResult<WebhookDeliveryDto>>;

public class GetDeliveriesHandler(
    WebhooksDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetDeliveriesQuery, PagedResult<WebhookDeliveryDto>>
{
    public async Task<Result<PagedResult<WebhookDeliveryDto>>> Handle(GetDeliveriesQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue)
        {
            return Result.Failure<PagedResult<WebhookDeliveryDto>>(Error.Unauthorized);
        }

        int page = request.Page <= 0 ? 1 : request.Page;
        int pageSize = request.PageSize <= 0 ? 20 : request.PageSize;
        pageSize = Math.Min(pageSize, 100);

        IQueryable<WebhookDelivery> query = dbContext.WebhookDeliveries.AsNoTracking();

        if (request.EndpointId.HasValue)
        {
            query = query.Where(d => d.EndpointId == request.EndpointId.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Status) && !string.Equals(request.Status, "all", StringComparison.OrdinalIgnoreCase))
        {
            string statusFilter = request.Status.Trim();
            query = query.Where(d => d.Status.ToLower() == statusFilter.ToLower());
        }

        if (!string.IsNullOrWhiteSpace(request.EventType) && !string.Equals(request.EventType, "all", StringComparison.OrdinalIgnoreCase))
        {
            string eventFilter = request.EventType.Trim();
            query = query.Where(d => d.EventType.ToLower() == eventFilter.ToLower());
        }

        int totalCount = await query.CountAsync(cancellationToken);

        List<WebhookDelivery> deliveries = await query
            .OrderByDescending(d => d.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        IReadOnlyList<WebhookDeliveryDto> items = deliveries.Select(MapToDto).ToList();

        return Result.Success(new PagedResult<WebhookDeliveryDto>(items, totalCount, page, pageSize));
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

public class GetWebhookDeliveriesHandler(
    WebhooksDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetWebhookDeliveriesQuery, PagedResult<WebhookDeliveryDto>>
{
    private readonly GetDeliveriesHandler _inner = new(dbContext, currentTenant);

    public async Task<Result<PagedResult<WebhookDeliveryDto>>> Handle(GetWebhookDeliveriesQuery request, CancellationToken cancellationToken)
    {
        GetDeliveriesQuery innerQuery = new(
            EndpointId: request.EndpointId,
            Status: request.Status,
            EventType: request.EventType,
            Page: request.Page,
            PageSize: request.PageSize);

        return await _inner.Handle(innerQuery, cancellationToken);
    }
}

public class GetDeliveriesEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        // Global deliveries list
        app.MapGet("/api/webhooks/deliveries", async (
            Guid? endpointId,
            string? status,
            string? eventType,
            int? page,
            int? pageSize,
            ISender sender,
            CancellationToken ct) =>
        {
            GetDeliveriesQuery query = new(
                EndpointId: endpointId,
                Status: status,
                EventType: eventType,
                Page: page ?? 1,
                PageSize: pageSize ?? 20);

            Result<PagedResult<WebhookDeliveryDto>> result = await sender.Send(query, ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<PagedResult<WebhookDeliveryDto>>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<PagedResult<WebhookDeliveryDto>>.Fail(result.Error.Code, result.Error.Description));
        })
        .WithName("GetWebhookDeliveries")
        .WithTags("Webhooks")
        .RequirePermission("Webhooks.View");

        // Deliveries by endpoint id
        app.MapGet("/api/webhooks/{id:guid}/deliveries", async (
            Guid id,
            string? status,
            string? eventType,
            int? page,
            int? pageSize,
            ISender sender,
            CancellationToken ct) =>
        {
            GetDeliveriesQuery query = new(
                EndpointId: id,
                Status: status,
                EventType: eventType,
                Page: page ?? 1,
                PageSize: pageSize ?? 20);

            Result<PagedResult<WebhookDeliveryDto>> result = await sender.Send(query, ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<PagedResult<WebhookDeliveryDto>>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<PagedResult<WebhookDeliveryDto>>.Fail(result.Error.Code, result.Error.Description));
        })
        .WithName("GetWebhookDeliveriesByEndpoint")
        .WithTags("Webhooks")
        .RequirePermission("Webhooks.View");
    }
}
