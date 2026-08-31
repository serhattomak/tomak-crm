using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Orders.Data;
using CRM.Modules.Orders.Features.Quotes.DTOs;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Orders.Features.Quotes.GetQuotes;

public record GetQuotesQuery(
    string? Search = null,
    string? Status = null,
    Guid? CustomerId = null,
    Guid? DealId = null,
    Guid? AssignedUserId = null,
    DateTime? FromDate = null,
    DateTime? ToDate = null,
    int Page = 1,
    int PageSize = 50
) : IQuery<PagedQuotesResponse>;

public record PagedQuotesResponse(
    List<QuoteSummaryDto> Items,
    int TotalCount,
    int Page,
    int PageSize
);

public class GetQuotesHandler(
    OrdersDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetQuotesQuery, PagedQuotesResponse>
{
    public async Task<Result<PagedQuotesResponse>> Handle(GetQuotesQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;
        var query = dbContext.Quotes
            .Include(q => q.Items)
            .Where(q => q.TenantId == tenantId && q.IsActive);

        // 1. Search filter
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var s = request.Search.Trim().ToLower();
            query = query.Where(q =>
                q.QuoteNumber.ToLower().Contains(s) ||
                q.Title.ToLower().Contains(s) ||
                q.CustomerName.ToLower().Contains(s) ||
                (q.Notes != null && q.Notes.ToLower().Contains(s)));
        }

        // 2. Status filter
        if (!string.IsNullOrWhiteSpace(request.Status) && request.Status != "All")
        {
            query = query.Where(q => q.Status == request.Status);
        }

        // 3. Customer filter
        if (request.CustomerId.HasValue)
        {
            query = query.Where(q => q.CustomerId == request.CustomerId.Value);
        }

        // 4. Deal filter
        if (request.DealId.HasValue)
        {
            query = query.Where(q => q.DealId == request.DealId.Value);
        }

        // 5. Assigned user filter
        if (request.AssignedUserId.HasValue)
        {
            query = query.Where(q => q.AssignedUserId == request.AssignedUserId.Value);
        }

        // 6. Date range
        if (request.FromDate.HasValue)
        {
            query = query.Where(q => q.CreatedAt >= request.FromDate.Value);
        }
        if (request.ToDate.HasValue)
        {
            query = query.Where(q => q.CreatedAt <= request.ToDate.Value);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var quotes = await query
            .OrderByDescending(q => q.CreatedAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(q => new QuoteSummaryDto(
                q.Id,
                q.TenantId,
                q.QuoteNumber,
                q.RevisionNumber,
                q.ParentQuoteId,
                q.Title,
                q.CustomerId,
                q.CustomerName,
                q.DealId,
                q.AssignedUserId,
                q.AssignedUserName,
                q.Status,
                q.Currency,
                q.ExchangeRate,
                q.Subtotal,
                q.DiscountType,
                q.DiscountRate,
                q.DiscountAmount,
                q.TaxAmount,
                q.TotalAmount,
                q.ValidUntil,
                q.SentAt,
                q.AcceptedAt,
                q.RejectedAt,
                q.ConvertedOrderId,
                q.PublicViewToken,
                q.PaymentMethod,
                q.PaymentDueDays,
                q.PaymentDueDate,
                q.Items.Count,
                q.CreatedAt,
                q.UpdatedAt
            ))
            .ToListAsync(cancellationToken);

        return Result.Success(new PagedQuotesResponse(quotes, totalCount, request.Page, request.PageSize));
    }
}

public class GetQuotesEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/quotes", async (
            string? search,
            string? status,
            Guid? customerId,
            Guid? dealId,
            Guid? assignedUserId,
            DateTime? fromDate,
            DateTime? toDate,
            int? page,
            int? pageSize,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var query = new GetQuotesQuery(
                search,
                status,
                customerId,
                dealId,
                assignedUserId,
                fromDate,
                toDate,
                page ?? 1,
                pageSize ?? 50
            );

            var result = await sender.Send(query, ct);
            return Results.Ok(ApiResponse<PagedQuotesResponse>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Quotes.View")
        .WithName("GetQuotes")
        .WithTags("Quotes");
    }
}
