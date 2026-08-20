using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Leaves.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Leaves.Features.Leaves.GetLeaveStats;

public record LeaveStatsDto(
    int PendingRequestsCount,
    int TodayOnLeaveCount,
    decimal ThisMonthUsedDays,
    int TotalApprovedRequests);

public record GetLeaveStatsQuery : IQuery<LeaveStatsDto>;

public class GetLeaveStatsHandler(
    LeavesDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetLeaveStatsQuery, LeaveStatsDto>
{
    public async Task<Result<LeaveStatsDto>> Handle(GetLeaveStatsQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var firstDayOfMonth = new DateOnly(today.Year, today.Month, 1);
        var lastDayOfMonth = firstDayOfMonth.AddMonths(1).AddDays(-1);

        var pendingCount = await dbContext.LeaveRequests
            .AsNoTracking()
            .CountAsync(x => x.TenantId == tenantId && x.Status == "Pending", cancellationToken);

        var todayOnLeave = await dbContext.LeaveRequests
            .AsNoTracking()
            .CountAsync(x => x.TenantId == tenantId &&
                             x.Status == "Approved" &&
                             x.StartDate <= today &&
                             x.EndDate >= today, cancellationToken);

        var thisMonthApproved = await dbContext.LeaveRequests
            .AsNoTracking()
            .Where(x => x.TenantId == tenantId &&
                        x.Status == "Approved" &&
                        x.StartDate <= lastDayOfMonth &&
                        x.EndDate >= firstDayOfMonth)
            .ToListAsync(cancellationToken);

        var thisMonthDays = thisMonthApproved.Sum(x => x.TotalDays);

        var totalApproved = await dbContext.LeaveRequests
            .AsNoTracking()
            .CountAsync(x => x.TenantId == tenantId && x.Status == "Approved", cancellationToken);

        return Result.Success(new LeaveStatsDto(
            pendingCount,
            todayOnLeave,
            thisMonthDays,
            totalApproved));
    }
}

public class GetLeaveStatsEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/leaves/stats", async (
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new GetLeaveStatsQuery(), ct);
            return Results.Ok(ApiResponse<LeaveStatsDto>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Leaves.View")
        .WithName("GetLeaveStats")
        .WithTags("Leaves");
    }
}
