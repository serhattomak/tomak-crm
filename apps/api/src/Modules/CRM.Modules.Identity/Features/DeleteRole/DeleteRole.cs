using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Messaging;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Identity.Data;
using MassTransit;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Identity.Features.DeleteRole;

public record DeleteRoleCommand(Guid RoleId) : ICommand;

public class DeleteRoleHandler(
    IdentityDbContext dbContext,
    ICurrentTenant currentTenant,
    IPublishEndpoint publishEndpoint) : ICommandHandler<DeleteRoleCommand>
{
    public async Task<Result> Handle(DeleteRoleCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        var role = await dbContext.Roles
            .Include(r => r.UserRoles)
            .FirstOrDefaultAsync(r => r.Id == request.RoleId && r.TenantId == tenantId, cancellationToken);

        if (role is null)
        {
            throw new NotFoundException($"Role with ID '{request.RoleId}' was not found.");
        }

        if (role.IsDefault)
        {
            throw new AppException("Default system roles cannot be deleted.", "Role.CannotDeleteDefault");
        }

        if (role.UserRoles.Count != 0)
        {
            throw new AppException("Cannot delete role while members are assigned to it.", "Role.HasAssignedMembers");
        }

        dbContext.Roles.Remove(role);
        await dbContext.SaveChangesAsync(cancellationToken);

        await publishEndpoint.Publish(new RolePermissionsUpdatedIntegrationEvent(
            tenantId,
            role.Id,
            Guid.NewGuid(),
            DateTime.UtcNow), cancellationToken);

        return Result.Success();
    }
}

public class DeleteRoleEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapDelete("/api/identity/roles/{id:guid}", async (Guid id, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new DeleteRoleCommand(id), ct);
            return Results.Ok(ApiResponse<string>.Ok("Role deleted successfully."));
        })
        .RequireAuthorization()
        .RequirePermission("Roles.Delete")
        .WithName("DeleteRole")
        .WithTags("Identity");
    }
}
