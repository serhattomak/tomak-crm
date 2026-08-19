using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Organization.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Organization.Features.Departments.DeleteDepartment;

public record DeleteDepartmentCommand(Guid Id) : ICommand<bool>;

public class DeleteDepartmentHandler(
    OrganizationDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<DeleteDepartmentCommand, bool>
{
    public async Task<Result<bool>> Handle(DeleteDepartmentCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        var department = await dbContext.Departments
            .Include(d => d.SubDepartments)
            .Include(d => d.Employees)
            .FirstOrDefaultAsync(d => d.Id == request.Id && d.TenantId == tenantId, cancellationToken);

        if (department == null)
        {
            throw new NotFoundException($"Department with ID '{request.Id}' was not found.");
        }

        // Re-parent sub-departments to the deleted department's parent
        foreach (var sub in department.SubDepartments)
        {
            sub.ParentId = department.ParentId;
        }

        // Disassociate employees from this department
        foreach (var emp in department.Employees)
        {
            emp.DepartmentId = null;
        }

        dbContext.Departments.Remove(department);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(true);
    }
}

public class DeleteDepartmentEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapDelete("/api/organization/departments/{id:guid}", async (Guid id, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new DeleteDepartmentCommand(id), ct);
            return Results.Ok(ApiResponse<bool>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Departments.Delete")
        .WithName("DeleteDepartment")
        .WithTags("Organization");
    }
}
