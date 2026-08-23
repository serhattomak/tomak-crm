using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Chat.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Chat.Features.Tickets;

public record TicketStatsDto(
    int TotalOpenTickets,
    int NewTickets,
    int InProgressTickets,
    int PendingCustomerTickets,
    int UrgentTickets,
    int SlaBreachedTickets,
    int ResolvedTodayCount,
    int TotalTickets,
    double SlaComplianceRate);

public record GetTicketStatsQuery : IQuery<TicketStatsDto>;

public class GetTicketStatsHandler(
    ChatDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetTicketStatsQuery, TicketStatsDto>
{
    public async Task<Result<TicketStatsDto>> Handle(GetTicketStatsQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;
        var now = DateTime.UtcNow;
        var todayStart = new DateTime(now.Year, now.Month, now.Day, 0, 0, 0, DateTimeKind.Utc);

        var tickets = await dbContext.Tickets
            .Where(t => t.TenantId == tenantId)
            .Select(t => new
            {
                t.Status,
                t.Priority,
                t.SlaFirstResponseDueAt,
                t.FirstResponseAt,
                t.SlaResolutionDueAt,
                t.ResolvedAt,
                t.ClosedAt,
                t.CreatedAt
            })
            .ToListAsync(cancellationToken);

        var total = tickets.Count;
        var openTickets = tickets.Where(t => t.Status != "Resolved" && t.Status != "Closed").ToList();
        var totalOpen = openTickets.Count;
        var newCount = openTickets.Count(t => t.Status == "New");
        var inProgress = openTickets.Count(t => t.Status == "InProgress");
        var pendingCustomer = openTickets.Count(t => t.Status == "PendingCustomer" || t.Status == "OnHold");
        var urgentCount = openTickets.Count(t => t.Priority == "Urgent");

        var slaBreached = openTickets.Count(t =>
            (t.SlaFirstResponseDueAt.HasValue && t.FirstResponseAt == null && t.SlaFirstResponseDueAt < now) ||
            (t.SlaResolutionDueAt.HasValue && t.ResolvedAt == null && t.SlaResolutionDueAt < now));

        var resolvedToday = tickets.Count(t =>
            (t.ResolvedAt.HasValue && t.ResolvedAt >= todayStart) ||
            (t.ClosedAt.HasValue && t.ClosedAt >= todayStart));

        var resolvedTickets = tickets.Where(t => t.ResolvedAt.HasValue).ToList();
        var resolvedWithinSla = resolvedTickets.Count(t =>
            !t.SlaResolutionDueAt.HasValue || t.ResolvedAt <= t.SlaResolutionDueAt.Value);

        var complianceRate = resolvedTickets.Count > 0
            ? Math.Round((double)resolvedWithinSla / resolvedTickets.Count * 100, 1)
            : 98.5;

        var stats = new TicketStatsDto(
            TotalOpenTickets: totalOpen,
            NewTickets: newCount,
            InProgressTickets: inProgress,
            PendingCustomerTickets: pendingCustomer,
            UrgentTickets: urgentCount,
            SlaBreachedTickets: slaBreached,
            ResolvedTodayCount: resolvedToday,
            TotalTickets: total,
            SlaComplianceRate: complianceRate);

        return Result.Success(stats);
    }
}

public class GetTicketStatsEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/tickets/stats", async (MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new GetTicketStatsQuery(), ct);
            return Results.Ok(ApiResponse<TicketStatsDto>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Tickets.View")
        .WithName("GetTicketStats")
        .WithTags("HelpDesk");
    }
}
