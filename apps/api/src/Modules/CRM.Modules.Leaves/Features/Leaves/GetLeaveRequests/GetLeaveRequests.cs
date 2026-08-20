using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Leaves.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Leaves.Features.Leaves.GetLeaveRequests;

public record LeaveRequestDto(
    Guid Id,
    Guid TenantId,
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
    string? Reason,
    string? EmergencyContact,
    string Status,
    Guid? ApprovedByUserId,
    string? ApprovedByUserName,
    DateTime? ApprovedAt,
    string? RejectionReason,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record PagedLeaveRequestsResponse(
    List<LeaveRequestDto> Items,
    int TotalCount,
    int Page,
    int PageSize);

public record GetLeaveRequestsQuery(
    string? Status = null,
    string? LeaveType = null,
    Guid? EmployeeId = null,
    Guid? DepartmentId = null,
    string? Search = null,
    int Page = 1,
    int PageSize = 25) : IQuery<PagedLeaveRequestsResponse>;

public class GetLeaveRequestsHandler(
    LeavesDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetLeaveRequestsQuery, PagedLeaveRequestsResponse>
{
    public async Task<Result<PagedLeaveRequestsResponse>> Handle(GetLeaveRequestsQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var query = dbContext.LeaveRequests
            .AsNoTracking()
            .Where(x => x.TenantId == currentTenant.Id.Value);

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            query = query.Where(x => x.Status == request.Status);
        }

        if (!string.IsNullOrWhiteSpace(request.LeaveType))
        {
            query = query.Where(x => x.LeaveType == request.LeaveType);
        }

        if (request.EmployeeId.HasValue && request.EmployeeId.Value != Guid.Empty)
        {
            query = query.Where(x => x.EmployeeId == request.EmployeeId.Value);
        }

        if (request.DepartmentId.HasValue && request.DepartmentId.Value != Guid.Empty)
        {
            query = query.Where(x => x.DepartmentId == request.DepartmentId.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var s = request.Search.Trim().ToLower();
            query = query.Where(x =>
                x.EmployeeName.ToLower().Contains(s) ||
                (x.DepartmentName != null && x.DepartmentName.ToLower().Contains(s)) ||
                (x.Reason != null && x.Reason.ToLower().Contains(s)));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var page = request.Page > 0 ? request.Page : 1;
        var pageSize = request.PageSize > 0 ? request.PageSize : 25;

        var items = await query
            .OrderByDescending(x => x.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new LeaveRequestDto(
                x.Id,
                x.TenantId,
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
                x.Reason,
                x.EmergencyContact,
                x.Status,
                x.ApprovedByUserId,
                x.ApprovedByUserName,
                x.ApprovedAt,
                x.RejectionReason,
                x.CreatedAt,
                x.UpdatedAt))
            .ToListAsync(cancellationToken);

        return Result.Success(new PagedLeaveRequestsResponse(items, totalCount, page, pageSize));
    }
}

public class GetLeaveRequestsEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/leaves", async (
            [AsParameters] GetLeaveRequestsQuery query,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(query, ct);
            return Results.Ok(ApiResponse<PagedLeaveRequestsResponse>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Leaves.View")
        .WithName("GetLeaveRequests")
        .WithTags("Leaves");
    }
}
