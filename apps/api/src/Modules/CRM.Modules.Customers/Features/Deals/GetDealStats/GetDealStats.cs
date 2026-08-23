using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Customers.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Customers.Features.Deals.GetDealStats;

public record SourceStatDto(string Source, int Count, decimal TotalValue);
public record PriorityStatDto(string Priority, int Count);

public record DealStatsResponse(
    int TotalDealsCount,
    int OpenDealsCount,
    int WonDealsCount,
    int LostDealsCount,
    decimal TotalOpenValue,
    decimal TotalWonValue,
    decimal TotalLostValue,
    decimal WinRatePercentage,
    int SlaBreachedCount,
    int UnassignedCount,
    string Currency,
    IReadOnlyList<SourceStatDto> BySource,
    IReadOnlyList<PriorityStatDto> ByPriority);

public record GetDealStatsQuery(Guid? PipelineId = null) : IQuery<DealStatsResponse>;

public class GetDealStatsHandler(
    CustomersDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetDealStatsQuery, DealStatsResponse>
{
    public async Task<Result<DealStatsResponse>> Handle(GetDealStatsQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;
        var now = DateTime.UtcNow;

        var query = dbContext.Deals
            .Where(d => d.TenantId == tenantId)
            .Include(d => d.Stage)
            .AsQueryable();

        if (request.PipelineId.HasValue && request.PipelineId.Value != Guid.Empty)
        {
            query = query.Where(d => d.PipelineId == request.PipelineId.Value);
        }

        var deals = await query.ToListAsync(cancellationToken);

        var totalCount = deals.Count;
        var openDeals = deals.Where(d => d.Status == "Open").ToList();
        var wonDeals = deals.Where(d => d.Status == "Won").ToList();
        var lostDeals = deals.Where(d => d.Status == "Lost").ToList();

        var totalOpenValue = openDeals.Sum(d => d.Value);
        var totalWonValue = wonDeals.Sum(d => d.Value);
        var totalLostValue = lostDeals.Sum(d => d.Value);

        var closedCount = wonDeals.Count + lostDeals.Count;
        var winRate = closedCount > 0 ? Math.Round((decimal)wonDeals.Count / closedCount * 100m, 1) : 0m;

        var slaBreachedCount = openDeals.Count(d =>
            (d.SlaDueDate.HasValue && d.SlaDueDate.Value < now) ||
            (d.Stage?.SlaHours.HasValue == true && d.StageEnteredAt.AddHours(d.Stage.SlaHours.Value) < now));

        var unassignedCount = openDeals.Count(d => !d.AssignedUserId.HasValue);

        var bySource = deals
            .GroupBy(d => d.Source)
            .Select(g => new SourceStatDto(g.Key, g.Count(), g.Sum(d => d.Value)))
            .OrderByDescending(s => s.Count)
            .ToList();

        var byPriority = deals
            .GroupBy(d => d.Priority)
            .Select(g => new PriorityStatDto(g.Key, g.Count()))
            .OrderByDescending(p => p.Count)
            .ToList();

        var response = new DealStatsResponse(
            totalCount,
            openDeals.Count,
            wonDeals.Count,
            lostDeals.Count,
            totalOpenValue,
            totalWonValue,
            totalLostValue,
            winRate,
            slaBreachedCount,
            unassignedCount,
            deals.FirstOrDefault()?.Currency ?? "TRY",
            bySource,
            byPriority);

        return Result.Success(response);
    }
}

public class GetDealStatsEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/deals/stats", async (
            Guid? pipelineId,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var query = new GetDealStatsQuery(pipelineId);
            var result = await sender.Send(query, ct);
            return Results.Ok(ApiResponse<DealStatsResponse>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Deals.View")
        .WithName("GetDealStats")
        .WithTags("Deals");
    }
}
