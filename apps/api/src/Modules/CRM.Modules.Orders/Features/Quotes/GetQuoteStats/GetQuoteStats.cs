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

namespace CRM.Modules.Orders.Features.Quotes.GetQuoteStats;

public record GetQuoteStatsQuery() : IQuery<QuoteStatsDto>;

public class GetQuoteStatsHandler(
    OrdersDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetQuoteStatsQuery, QuoteStatsDto>
{
    public async Task<Result<QuoteStatsDto>> Handle(GetQuoteStatsQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        var quotes = await dbContext.Quotes
            .Where(q => q.TenantId == tenantId && q.IsActive)
            .ToListAsync(cancellationToken);

        var totalQuotes = quotes.Count;
        var activeQuotes = quotes.Where(q => q.Status is "Draft" or "PendingApproval" or "Approved" or "Sent" or "Viewed").ToList();
        var activeVolume = activeQuotes.Sum(q => q.TotalAmount);
        var pendingApprovalCount = quotes.Count(q => q.Status == "PendingApproval");
        var sentCount = quotes.Count(q => q.Status is "Sent" or "Viewed");
        var acceptedCount = quotes.Count(q => q.Status == "Accepted");
        var rejectedCount = quotes.Count(q => q.Status == "Rejected");
        
        // Check expired quotes
        var now = DateTime.UtcNow;
        var expiredCount = quotes.Count(q => q.ValidUntil.HasValue && q.ValidUntil.Value < now && q.Status is "Draft" or "Sent" or "Viewed");

        var closedTotal = acceptedCount + rejectedCount;
        var conversionRate = closedTotal > 0 ? ((decimal)acceptedCount / closedTotal) * 100m : 0m;

        var dto = new QuoteStatsDto(
            totalQuotes,
            activeVolume,
            pendingApprovalCount,
            sentCount,
            acceptedCount,
            rejectedCount,
            expiredCount,
            Math.Round(conversionRate, 1)
        );

        return Result.Success(dto);
    }
}

public class GetQuoteStatsEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/quotes/stats", async (
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new GetQuoteStatsQuery(), ct);
            return Results.Ok(ApiResponse<QuoteStatsDto>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Quotes.View")
        .WithName("GetQuoteStats")
        .WithTags("Quotes");
    }
}
