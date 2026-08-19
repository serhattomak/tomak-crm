using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Organization.Data;
using CRM.Modules.Organization.Entities;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Organization.Features.OrgChart.GetOrgChart;

public record OrgChartNodeDto(
    Guid Id,
    string FullName,
    string Email,
    string? Phone,
    string? EmployeeNumber,
    string? Title,
    string? Level,
    string? AvatarUrl,
    Guid? DepartmentId,
    string? DepartmentName,
    string? DepartmentCode,
    string Status,
    string EmploymentType,
    int DirectReportsCount,
    int TotalSubordinatesCount,
    IReadOnlyList<OrgChartNodeDto> DirectReports);

public record GetOrgChartQuery(Guid? RootEmployeeId = null, Guid? DepartmentId = null) : IQuery<IReadOnlyList<OrgChartNodeDto>>;

public class GetOrgChartHandler(
    OrganizationDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetOrgChartQuery, IReadOnlyList<OrgChartNodeDto>>
{
    public async Task<Result<IReadOnlyList<OrgChartNodeDto>>> Handle(GetOrgChartQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        var employees = await dbContext.Employees
            .Where(e => e.TenantId == tenantId)
            .Include(e => e.Department)
            .Include(e => e.JobPosition)
            .OrderBy(e => e.FirstName)
            .ThenBy(e => e.LastName)
            .ToListAsync(cancellationToken);

        if (employees.Count == 0)
        {
            return Result.Success<IReadOnlyList<OrgChartNodeDto>>([]);
        }

        // Group by manager
        var lookup = employees.ToLookup(e => e.ManagerId);

        int CountTotalSubordinates(Guid empId)
        {
            var children = lookup[empId];
            var count = 0;
            foreach (var child in children)
            {
                count += 1 + CountTotalSubordinates(child.Id);
            }
            return count;
        }

        OrgChartNodeDto BuildNode(Employee emp)
        {
            var children = lookup[emp.Id]
                .Select(BuildNode)
                .ToList();

            var totalCount = CountTotalSubordinates(emp.Id);

            return new OrgChartNodeDto(
                emp.Id,
                emp.FullName,
                emp.Email,
                emp.Phone,
                emp.EmployeeNumber,
                emp.Title ?? emp.JobPosition?.Title,
                emp.JobPosition?.Level ?? "Mid",
                emp.AvatarUrl,
                emp.DepartmentId,
                emp.Department?.Name,
                emp.Department?.Code,
                emp.Status,
                emp.EmploymentType,
                children.Count,
                totalCount,
                children);
        }

        List<OrgChartNodeDto> rootNodes;

        if (request.RootEmployeeId.HasValue)
        {
            var root = employees.FirstOrDefault(e => e.Id == request.RootEmployeeId.Value);
            rootNodes = root != null ? [BuildNode(root)] : [];
        }
        else
        {
            // Roots are employees who have ManagerId == null or whose Manager is not found in tenant
            var empIdSet = employees.Select(e => e.Id).ToHashSet();
            var roots = employees
                .Where(e => e.ManagerId == null || !empIdSet.Contains(e.ManagerId.Value))
                .ToList();

            // If cyclic or orphaned, fallback to highest positions or all top nodes
            if (roots.Count == 0 && employees.Count > 0)
            {
                roots = [employees.First()];
            }

            rootNodes = roots.Select(BuildNode).ToList();
        }

        return Result.Success<IReadOnlyList<OrgChartNodeDto>>(rootNodes);
    }
}

public class GetOrgChartEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/organization/chart", async (Guid? rootId, Guid? departmentId, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new GetOrgChartQuery(rootId, departmentId), ct);
            return Results.Ok(ApiResponse<IReadOnlyList<OrgChartNodeDto>>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Organization.ViewChart")
        .WithName("GetOrgChart")
        .WithTags("Organization");
    }
}
