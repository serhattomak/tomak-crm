using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Organization.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Organization.Features.Employees.DeleteEmployee;

public record DeleteEmployeeCommand(Guid Id) : ICommand<bool>;

public class DeleteEmployeeHandler(
    OrganizationDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<DeleteEmployeeCommand, bool>
{
    public async Task<Result<bool>> Handle(DeleteEmployeeCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        var employee = await dbContext.Employees
            .Include(e => e.DirectReports)
            .FirstOrDefaultAsync(e => e.Id == request.Id && e.TenantId == tenantId, cancellationToken);

        if (employee == null)
        {
            throw new NotFoundException($"Employee with ID '{request.Id}' was not found.");
        }

        // Re-assign direct reports to employee's manager
        foreach (var report in employee.DirectReports)
        {
            report.ManagerId = employee.ManagerId;
        }

        // Remove from department lead if applicable
        var ledDepartments = await dbContext.Departments
            .Where(d => d.LeadId == request.Id && d.TenantId == tenantId)
            .ToListAsync(cancellationToken);

        foreach (var dept in ledDepartments)
        {
            dept.LeadId = null;
        }

        dbContext.Employees.Remove(employee);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(true);
    }
}

public class DeleteEmployeeEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapDelete("/api/organization/employees/{id:guid}", async (Guid id, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new DeleteEmployeeCommand(id), ct);
            return Results.Ok(ApiResponse<bool>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Employees.Delete")
        .WithName("DeleteEmployee")
        .WithTags("Organization");
    }
}
