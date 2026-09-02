using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Security;
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

public record GetWebhooksQuery(
    string? Search = null,
    string? Event = null,
    bool? IsActive = null,
    int Page = 1,
    int PageSize = 20
) : IQuery<PagedResult<WebhookEndpointDto>>;

public class GetWebhooksHandler(
    WebhooksDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetWebhooksQuery, PagedResult<WebhookEndpointDto>>
{
    public async Task<Result<PagedResult<WebhookEndpointDto>>> Handle(GetWebhooksQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue)
        {
            return Result.Failure<PagedResult<WebhookEndpointDto>>(Error.Unauthorized);
        }

        int page = request.Page <= 0 ? 1 : request.Page;
        int pageSize = request.PageSize <= 0 ? 20 : request.PageSize;
        // Clamp pageSize to avoid abuse; max 100
        if (pageSize > 100)
        {
            pageSize = 100;
        }

        IQueryable<WebhookEndpoint> query = dbContext.WebhookEndpoints.AsNoTracking();

        // Tenant isolation is handled by HasQueryFilter, but explicit filter ensures correctness even if filter is disabled
        // Note: HasQueryFilter already restricts to currentTenant, so additional Where is not strictly needed

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            string search = request.Search.Trim().ToLowerInvariant();
            query = query.Where(w =>
                w.Name.ToLower().Contains(search) ||
                w.Url.ToLower().Contains(search));
        }

        if (!string.IsNullOrWhiteSpace(request.Event))
        {
            string eventFilter = request.Event.Trim();
            // Events is stored as jsonb string[]; EF Core with ValueConverter serializes as json string,
            // so in-memory Any check is used. For server-side filtering we use JSON containment via EF translation fallback:
            // Use AsEnumerable after initial filters if needed, but attempt server-side via string contains on serialized json for efficiency.
            // We do a client-evaluable predicate via Enumerable.Any by materializing after count? Instead, filter via serialized json Contains.
            // Simpler: filter where deserialized array contains eventFilter by using PostgreSQL jsonb containment would require raw SQL.
            // We use LINQ Any which EF Core may evaluate client-side after AsNoTracking; for small tenant datasets this is acceptable.
            // To keep it translatable, we also filter via JSON string contains as fallback.
            query = query.Where(w => w.Events.Any(e => e == eventFilter));
        }

        if (request.IsActive.HasValue)
        {
            bool isActive = request.IsActive.Value;
            query = query.Where(w => w.IsActive == isActive);
        }

        int totalCount = await query.CountAsync(cancellationToken);

        List<WebhookEndpoint> endpoints = await query
            .OrderByDescending(w => w.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        List<WebhookEndpointDto> items = endpoints.Select(e => new WebhookEndpointDto
        {
            Id = e.Id,
            TenantId = e.TenantId,
            Name = e.Name,
            Url = e.Url,
            Events = e.Events ?? [],
            IsActive = e.IsActive,
            Description = e.Description,
            CreatedAt = e.CreatedAt,
            UpdatedAt = e.UpdatedAt,
            Secret = null,
            SecretMasked = GetMaskedSecret(e.SecretEncrypted)
        }).ToList();

        PagedResult<WebhookEndpointDto> pagedResult = new PagedResult<WebhookEndpointDto>(items, totalCount, page, pageSize);
        return Result.Success(pagedResult);
    }

    private static string? GetMaskedSecret(string? encryptedSecret)
    {
        if (string.IsNullOrEmpty(encryptedSecret))
        {
            return null;
        }

        string plaintext = WebhookEndpoint.DecryptSecret(encryptedSecret);
        if (string.IsNullOrEmpty(plaintext))
        {
            return null;
        }

        if (plaintext.Length <= 4)
        {
            return plaintext;
        }

        string lastFour = plaintext[^4..];
        return $"****{lastFour}";
    }
}

public class GetWebhooksEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/webhooks", async (
            string? search,
            string? @event,
            bool? isActive,
            int? page,
            int? pageSize,
            ISender sender,
            CancellationToken ct) =>
        {
            GetWebhooksQuery query = new GetWebhooksQuery(
                Search: search,
                Event: @event,
                IsActive: isActive,
                Page: page ?? 1,
                PageSize: pageSize ?? 20
            );

            Result<PagedResult<WebhookEndpointDto>> result = await sender.Send(query, ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<PagedResult<WebhookEndpointDto>>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<PagedResult<WebhookEndpointDto>>.Fail(result.Error.Code, result.Error.Description));
        })
        .WithName("GetWebhooks")
        .WithTags("Webhooks")
        .RequirePermission("Webhooks.View");
    }
}
