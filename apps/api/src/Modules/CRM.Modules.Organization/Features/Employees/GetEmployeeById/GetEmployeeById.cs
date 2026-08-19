using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Organization.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Organization.Features.Employees.GetEmployeeById;

public record DirectReportSummaryDto(
    Guid Id,
    string FullName,
    string Email,
    string? Title,
    string? AvatarUrl,
    string Status);

public record EmployeeDetailDto(
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
    string? ManagerAvatarUrl,
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
    IReadOnlyList<DirectReportSummaryDto> DirectReports,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record GetEmployeeByIdQuery(Guid Id) : IQuery<EmployeeDetailDto>;

public class GetEmployeeByIdHandler(
    OrganizationDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetEmployeeByIdQuery, EmployeeDetailDto>
{
    public async Task<Result<EmployeeDetailDto>> Handle(GetEmployeeByIdQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        var employee = await dbContext.Employees
            .Where(e => e.Id == request.Id && e.TenantId == tenantId)
            .Include(e => e.Department)
            .Include(e => e.JobPosition)
            .Include(e => e.Manager)
            .Include(e => e.DirectReports)
            .FirstOrDefaultAsync(cancellationToken);

        if (employee == null)
        {
            throw new NotFoundException($"Employee with ID '{request.Id}' was not found.");
        }

        var directReports = employee.DirectReports
            .Select(d => new DirectReportSummaryDto(
                d.Id,
                $"{d.FirstName} {d.LastName}".Trim(),
                d.Email,
                d.Title,
                d.AvatarUrl,
                d.Status))
            .ToList();

        var detail = new EmployeeDetailDto(
            employee.Id,
            employee.TenantId,
            employee.UserId,
            employee.DepartmentId,
            employee.Department?.Name,
            employee.JobPositionId,
            employee.JobPosition?.Title,
            employee.JobPosition?.Level,
            employee.ManagerId,
            employee.Manager != null ? $"{employee.Manager.FirstName} {employee.Manager.LastName}".Trim() : null,
            employee.Manager?.AvatarUrl,
            employee.FirstName,
            employee.LastName,
            $"{employee.FirstName} {employee.LastName}".Trim(),
            employee.Email,
            employee.Phone,
            employee.EmployeeNumber,
            employee.Title ?? employee.JobPosition?.Title,
            employee.EmploymentType,
            employee.Status,
            employee.HireDate,
            employee.AvatarUrl,
            employee.Salary,
            employee.Currency,
            directReports,
            employee.CreatedAt,
            employee.UpdatedAt);

        return Result.Success(detail);
    }
}

public class GetEmployeeByIdEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/organization/employees/{id:guid}", async (Guid id, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new GetEmployeeByIdQuery(id), ct);
            return Results.Ok(ApiResponse<EmployeeDetailDto>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Employees.View")
        .WithName("GetEmployeeById")
        .WithTags("Organization");
    }
}
