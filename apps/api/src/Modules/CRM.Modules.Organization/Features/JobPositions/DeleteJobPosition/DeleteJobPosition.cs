using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Organization.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Organization.Features.JobPositions.DeleteJobPosition;

public record DeleteJobPositionCommand(Guid Id) : ICommand<bool>;

public class DeleteJobPositionHandler(
    OrganizationDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<DeleteJobPositionCommand, bool>
{
    public async Task<Result<bool>> Handle(DeleteJobPositionCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        var position = await dbContext.JobPositions
            .Include(p => p.Employees)
            .FirstOrDefaultAsync(p => p.Id == request.Id && p.TenantId == tenantId, cancellationToken);

        if (position == null)
        {
            throw new NotFoundException($"Job position with ID '{request.Id}' was not found.");
        }

        foreach (var emp in position.Employees)
        {
            emp.JobPositionId = null;
        }

        dbContext.JobPositions.Remove(position);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(true);
    }
}

public class DeleteJobPositionEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapDelete("/api/organization/positions/{id:guid}", async (Guid id, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new DeleteJobPositionCommand(id), ct);
            return Results.Ok(ApiResponse<bool>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("JobPositions.Manage")
        .WithName("DeleteJobPosition")
        .WithTags("Organization");
    }
}
