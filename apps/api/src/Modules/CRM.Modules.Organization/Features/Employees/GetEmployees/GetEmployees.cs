using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Organization.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Organization.Features.Employees.GetEmployees;

public record EmployeeDto(
    Guid Id,
    Guid TenantId,
    Guid? UserId,
    Guid? DepartmentId,
    string? DepartmentName,
    Guid? JobPositionId,
    string? JobPositionTitle,
    string? Level,
    Guid? ManagerId,
    string? ManagerName,
    string FirstName,
    string LastName,
    string FullName,
    string Email,
    string? Phone,
    string? EmployeeNumber,
    string? Title,
    string EmploymentType,
    string Status,
    DateTime? HireDate,
    string? AvatarUrl,
    decimal? Salary,
    string Currency,
    int DirectReportCount,
    DateTime CreatedAt);

public record PagedEmployeesResponse(
    IReadOnlyList<EmployeeDto> Items,
    int TotalCount,
    int Page,
    int PageSize);

public record GetEmployeesQuery(
    Guid? DepartmentId = null,
    Guid? JobPositionId = null,
    string? Status = null,
    string? EmploymentType = null,
    string? Search = null,
    int Page = 1,
    int PageSize = 50) : IQuery<PagedEmployeesResponse>;

public class GetEmployeesHandler(
    OrganizationDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetEmployeesQuery, PagedEmployeesResponse>
{
    public async Task<Result<PagedEmployeesResponse>> Handle(GetEmployeesQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        var query = dbContext.Employees
            .Where(e => e.TenantId == tenantId)
            .Include(e => e.Department)
            .Include(e => e.JobPosition)
            .Include(e => e.Manager)
            .Include(e => e.DirectReports)
            .AsQueryable();

        if (request.DepartmentId.HasValue)
        {
            query = query.Where(e => e.DepartmentId == request.DepartmentId.Value);
        }

        if (request.JobPositionId.HasValue)
        {
            query = query.Where(e => e.JobPositionId == request.JobPositionId.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            query = query.Where(e => e.Status == request.Status);
        }

        if (!string.IsNullOrWhiteSpace(request.EmploymentType))
        {
            query = query.Where(e => e.EmploymentType == request.EmploymentType);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim().ToLower();
            query = query.Where(e =>
                e.FirstName.ToLower().Contains(search) ||
                e.LastName.ToLower().Contains(search) ||
                e.Email.ToLower().Contains(search) ||
                (e.EmployeeNumber != null && e.EmployeeNumber.ToLower().Contains(search)) ||
                (e.Title != null && e.Title.ToLower().Contains(search)));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var page = request.Page > 0 ? request.Page : 1;
        var pageSize = request.PageSize is > 0 and <= 200 ? request.PageSize : 50;

        var items = await query
            .OrderBy(e => e.FirstName)
            .ThenBy(e => e.LastName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(e => new EmployeeDto(
                e.Id,
                e.TenantId,
                e.UserId,
                e.DepartmentId,
                e.Department != null ? e.Department.Name : null,
                e.JobPositionId,
                e.JobPosition != null ? e.JobPosition.Title : null,
                e.JobPosition != null ? e.JobPosition.Level : null,
                e.ManagerId,
                e.Manager != null ? $"{e.Manager.FirstName} {e.Manager.LastName}".Trim() : null,
                e.FirstName,
                e.LastName,
                $"{e.FirstName} {e.LastName}".Trim(),
                e.Email,
                e.Phone,
                e.EmployeeNumber,
                e.Title ?? (e.JobPosition != null ? e.JobPosition.Title : null),
                e.EmploymentType,
                e.Status,
                e.HireDate,
                e.AvatarUrl,
                e.Salary,
                e.Currency,
                e.DirectReports.Count,
                e.CreatedAt))
            .ToListAsync(cancellationToken);

        return Result.Success(new PagedEmployeesResponse(items, totalCount, page, pageSize));
    }
}

public class GetEmployeesEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/organization/employees", async (
            Guid? departmentId,
            Guid? jobPositionId,
            string? status,
            string? employmentType,
            string? search,
            int? page,
            int? pageSize,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var query = new GetEmployeesQuery(
                departmentId,
                jobPositionId,
                status,
                employmentType,
                search,
                page ?? 1,
                pageSize ?? 50);

            var result = await sender.Send(query, ct);
            return Results.Ok(ApiResponse<PagedEmployeesResponse>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Employees.View")
        .WithName("GetEmployees")
        .WithTags("Organization");
    }
}
