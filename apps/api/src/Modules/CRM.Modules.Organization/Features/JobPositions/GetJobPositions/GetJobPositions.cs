using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Organization.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Organization.Features.JobPositions.GetJobPositions;

public record JobPositionDto(
    Guid Id,
    Guid TenantId,
    Guid? DepartmentId,
    string? DepartmentName,
    string Title,
    string Level,
    string? JobDescription,
    decimal? MinSalary,
    decimal? MaxSalary,
    int EmployeeCount,
    DateTime CreatedAt);

public record GetJobPositionsQuery(Guid? DepartmentId = null) : IQuery<IReadOnlyList<JobPositionDto>>;

public class GetJobPositionsHandler(
    OrganizationDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetJobPositionsQuery, IReadOnlyList<JobPositionDto>>
{
    public async Task<Result<IReadOnlyList<JobPositionDto>>> Handle(GetJobPositionsQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        var query = dbContext.JobPositions
            .Where(p => p.TenantId == tenantId)
            .Include(p => p.Department)
            .Include(p => p.Employees)
            .AsQueryable();

        if (request.DepartmentId.HasValue)
        {
            query = query.Where(p => p.DepartmentId == request.DepartmentId.Value);
        }

        var positions = await query
            .OrderBy(p => p.Title)
            .Select(p => new JobPositionDto(
                p.Id,
                p.TenantId,
                p.DepartmentId,
                p.Department != null ? p.Department.Name : null,
                p.Title,
                p.Level,
                p.JobDescription,
                p.MinSalary,
                p.MaxSalary,
                p.Employees.Count,
                p.CreatedAt))
            .ToListAsync(cancellationToken);

        return Result.Success<IReadOnlyList<JobPositionDto>>(positions);
    }
}

public class GetJobPositionsEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/organization/positions", async (Guid? departmentId, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new GetJobPositionsQuery(departmentId), ct);
            return Results.Ok(ApiResponse<IReadOnlyList<JobPositionDto>>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Departments.View")
        .WithName("GetJobPositions")
        .WithTags("Organization");
    }
}
