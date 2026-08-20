using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Leaves.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Leaves.Features.Leaves.GetLeaveCalendar;

public record LeaveCalendarEventDto(
    Guid Id,
    Guid EmployeeId,
    string EmployeeName,
    Guid? DepartmentId,
    string? DepartmentName,
    string LeaveType,
    DateOnly StartDate,
    DateOnly EndDate,
    decimal TotalDays,
    bool IsHalfDay,
    string? HalfDayPeriod,
    string Status,
    string? Reason);

public record GetLeaveCalendarQuery(
    int? Year = null,
    int? Month = null,
    DateOnly? StartDate = null,
    DateOnly? EndDate = null,
    Guid? DepartmentId = null,
    string? Status = null) : IQuery<List<LeaveCalendarEventDto>>;

public class GetLeaveCalendarHandler(
    LeavesDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetLeaveCalendarQuery, List<LeaveCalendarEventDto>>
{
    public async Task<Result<List<LeaveCalendarEventDto>>> Handle(GetLeaveCalendarQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var year = request.Year ?? DateTime.UtcNow.Year;
        var month = request.Month ?? DateTime.UtcNow.Month;

        var start = request.StartDate ?? new DateOnly(year, month, 1);
        var end = request.EndDate ?? start.AddMonths(1).AddDays(-1);

        var query = dbContext.LeaveRequests
            .AsNoTracking()
            .Where(x => x.TenantId == currentTenant.Id.Value &&
                        x.Status != "Cancelled" && x.Status != "Rejected" &&
                        x.StartDate <= end && x.EndDate >= start);

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            query = query.Where(x => x.Status == request.Status);
        }

        if (request.DepartmentId.HasValue && request.DepartmentId.Value != Guid.Empty)
        {
            query = query.Where(x => x.DepartmentId == request.DepartmentId.Value);
        }

        var events = await query
            .OrderBy(x => x.StartDate)
            .Select(x => new LeaveCalendarEventDto(
                x.Id,
                x.EmployeeId,
                x.EmployeeName,
                x.DepartmentId,
                x.DepartmentName,
                x.LeaveType,
                x.StartDate,
                x.EndDate,
                x.TotalDays,
                x.IsHalfDay,
                x.HalfDayPeriod,
                x.Status,
                x.Reason))
            .ToListAsync(cancellationToken);

        return Result.Success(events);
    }
}

public class GetLeaveCalendarEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/leaves/calendar", async (
            [AsParameters] GetLeaveCalendarQuery query,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(query, ct);
            return Results.Ok(ApiResponse<List<LeaveCalendarEventDto>>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Leaves.View")
        .WithName("GetLeaveCalendar")
        .WithTags("Leaves");
    }
}
