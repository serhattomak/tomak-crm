using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Organization.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Organization.Features.Departments.GetDepartments;

public record DepartmentDto(
    Guid Id,
    Guid TenantId,
    Guid? ParentId,
    string? ParentName,
    string Name,
    string? Code,
    string? Description,
    Guid? LeadId,
    string? LeadName,
    string? LeadAvatarUrl,
    string? CostCenter,
    int EmployeeCount,
    int SubDepartmentCount,
    DateTime CreatedAt,
    IReadOnlyList<DepartmentDto>? SubDepartments = null);

public record GetDepartmentsQuery(bool AsTree = false) : IQuery<IReadOnlyList<DepartmentDto>>;

public class GetDepartmentsHandler(
    OrganizationDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetDepartmentsQuery, IReadOnlyList<DepartmentDto>>
{
    public async Task<Result<IReadOnlyList<DepartmentDto>>> Handle(GetDepartmentsQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        var departments = await dbContext.Departments
            .Where(d => d.TenantId == tenantId)
            .Include(d => d.Parent)
            .Include(d => d.Lead)
            .Include(d => d.Employees)
            .Include(d => d.SubDepartments)
            .OrderBy(d => d.Name)
            .ToListAsync(cancellationToken);

        if (!request.AsTree)
        {
            var flatList = departments.Select(d => new DepartmentDto(
                d.Id,
                d.TenantId,
                d.ParentId,
                d.Parent?.Name,
                d.Name,
                d.Code,
                d.Description,
                d.LeadId,
                d.Lead != null ? $"{d.Lead.FirstName} {d.Lead.LastName}".Trim() : null,
                d.Lead?.AvatarUrl,
                d.CostCenter,
                d.Employees.Count,
                d.SubDepartments.Count,
                d.CreatedAt)).ToList();

            return Result.Success<IReadOnlyList<DepartmentDto>>(flatList);
        }

        // Build hierarchical tree
        DepartmentDto BuildNode(Entities.Department dept)
        {
            var children = departments
                .Where(c => c.ParentId == dept.Id)
                .Select(BuildNode)
                .ToList();

            return new DepartmentDto(
                dept.Id,
                dept.TenantId,
                dept.ParentId,
                dept.Parent?.Name,
                dept.Name,
                dept.Code,
                dept.Description,
                dept.LeadId,
                dept.Lead != null ? $"{dept.Lead.FirstName} {dept.Lead.LastName}".Trim() : null,
                dept.Lead?.AvatarUrl,
                dept.CostCenter,
                dept.Employees.Count,
                children.Count,
                dept.CreatedAt,
                children);
        }

        var rootDepartments = departments
            .Where(d => d.ParentId == null)
            .Select(BuildNode)
            .ToList();

        return Result.Success<IReadOnlyList<DepartmentDto>>(rootDepartments);
    }
}

public class GetDepartmentsEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/organization/departments", async (bool? asTree, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new GetDepartmentsQuery(asTree ?? false), ct);
            return Results.Ok(ApiResponse<IReadOnlyList<DepartmentDto>>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Departments.View")
        .WithName("GetDepartments")
        .WithTags("Organization");
    }
}
